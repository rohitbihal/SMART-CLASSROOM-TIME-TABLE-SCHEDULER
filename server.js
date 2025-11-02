// To run this server:
// 1. In your project directory, run 'npm init -y'
// 2. Run 'npm install express mongoose cors dotenv @google/genai jsonwebtoken bcrypt express-rate-limit express-validator'
// 3. Create a '.env' file in the same directory.
// 4. Add your MongoDB connection string, Gemini API key, and a JWT Secret to the .env file:
//    MONGO_URI=YOUR_MONGODB_CONNECTION_STRING
//    API_KEY=YOUR_GEMINI_API_KEY
//    JWT_SECRET=a_long_random_secret_string_for_signing_tokens
//    (Get your MONO_URI from your MongoDB hosting provider, e.g., MongoDB Atlas)
// 5. Run 'node server.js'

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { GoogleGenAI, Type } from "@google/genai";
import { rateLimit } from 'express-rate-limit';
import { body, validationResult } from 'express-validator';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Environment Variable Check ---
if (!process.env.MONGO_URI) {
    console.error("FATAL ERROR: MONGO_URI is not defined in the environment variables.");
    process.exit(1);
}

// Stricter checks for production environments like Render
const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET) {
    if (isProduction) {
        console.error("FATAL ERROR: JWT_SECRET is not defined. This is required for production.");
        process.exit(1);
    } else {
        process.env.JWT_SECRET = 'DEFAULT_INSECURE_JWT_SECRET_FOR_DEVELOPMENT_ONLY';
        console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.warn("!!! WARNING: JWT_SECRET is not defined. Using a default, insecure secret.");
        console.warn("!!! For production, set a strong JWT_SECRET in your .env file.");
        console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    }
}

if (!process.env.API_KEY) {
     if (isProduction) {
        console.error("FATAL ERROR: API_KEY for Gemini is not defined. This is required for production.");
        process.exit(1);
    } else {
        console.warn("WARNING: API_KEY is not defined. The AI timetable generation feature will not work.");
    }
}


const app = express();
// FIX: Trust proxy to allow rate limiter to work correctly behind a reverse proxy (like on Render).
app.set('trust proxy', 1); 
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- Security Middleware ---
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
	standardHeaders: 'draft-7',
	legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', apiLimiter);

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

const saltRounds = 10;

// --- Mongoose Schemas ---
const classSchema = new mongoose.Schema({ id: {type: String, unique: true}, name: {type: String, required: true}, branch: String, year: Number, section: String, studentCount: Number, block: String });
const facultySchema = new mongoose.Schema({ id: {type: String, unique: true}, name: {type: String, required: true}, employeeId: String, designation: String, department: String, specialization: [String], email: { type: String, required: true, unique: true }, adminId: { type: String, unique: true, sparse: true }, contactNumber: String, accessLevel: String, availability: mongoose.Schema.Types.Mixed, maxWorkload: Number });
const subjectSchema = new mongoose.Schema({ id: {type: String, unique: true}, name: {type: String, required: true}, code: {type: String, required: true, unique: true}, department: String, semester: Number, credits: Number, type: String, hoursPerWeek: Number, assignedFacultyId: String });
const roomSchema = new mongoose.Schema({ id: {type: String, unique: true}, number: {type: String, required: true, unique: true}, building: String, type: String, capacity: Number, block: String, equipment: mongoose.Schema.Types.Mixed });
const studentSchema = new mongoose.Schema({ id: {type: String, unique: true}, name: {type: String, required: true}, email: {type: String, unique: true, sparse: true}, classId: String, roll: String, contactNumber: String });
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['admin', 'teacher', 'student'] },
    profileId: { type: String, required: true, unique: true },
});
userSchema.index({ username: 1, role: 1 }, { unique: true });

const timetableEntrySchema = new mongoose.Schema({ className: String, subject: String, faculty: String, room: String, day: String, time: String, type: String, classType: String });

const timePreferencesSchema = new mongoose.Schema({
    workingDays: { type: [String], default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] },
    startTime: { type: String, default: '09:00' },
    endTime: { type: String, default: '17:00' },
    lunchStartTime: { type: String, default: '13:00' },
    lunchDurationMinutes: { type: Number, default: 60 },
    slotDurationMinutes: { type: Number, default: 60 },
}, { _id: false });

const facultyPreferenceSchema = new mongoose.Schema({
    facultyId: { type: String, required: true },
    unavailability: [{ day: String, timeSlot: String, _id: false }],
    preferredDays: [String],
    dailySchedulePreference: String,
    maxConsecutiveClasses: Number,
    gapPreference: String,
    coursePreferences: [{ subjectId: String, time: String, _id: false }],
}, { _id: false });

// NEW: Schema for defining fixed, pre-scheduled classes.
const fixedClassSchema = new mongoose.Schema({
    id: { type: String, required: true },
    classId: { type: String, required: true },
    subjectId: { type: String, required: true },
    day: { type: String, required: true },
    time: { type: String, required: true },
    roomId: String
}, { _id: false });

// NEW: Schema for custom, user-defined constraints.
const customConstraintSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: String, description: String, appliedTo: String,
    priority: String, isActive: Boolean,
}, { _id: false });

// NEW: Dedicated schema for managing multiple institution profiles.
const institutionSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    name: { type: String, required: true },
    academicYear: { type: String, default: '2024-2025' },
    semester: { type: String, default: 'Odd' },
    session: { type: String, default: 'Regular' },
    blocks: { type: [String], default: [] }
});


const constraintsSchema = new mongoose.Schema({
    identifier: { type: String, default: 'global_constraints', unique: true },
    maxConsecutiveClasses: { type: Number, default: 3 },
    timePreferences: { type: timePreferencesSchema, default: () => ({}) },
    facultyPreferences: { type: [facultyPreferenceSchema], default: [] },
    fixedClasses: { type: [fixedClassSchema], default: [] },
    customConstraints: { type: [customConstraintSchema], default: [] },
    chatWindow: { start: String, end: String },
    isChatboxEnabled: { type: Boolean, default: true },
    classSpecific: [Object],
    maxConcurrentClassesPerDept: mongoose.Schema.Types.Mixed
});

const attendanceSchema = new mongoose.Schema({
    classId: String,
    date: String,
    records: [{ studentId: String, status: String, _id: false }]
});
attendanceSchema.index({ classId: 1, date: 1 }, { unique: true });
const chatMessageSchema = new mongoose.Schema({
    id: { type: String, unique: true, required: true },
    author: String,
    authorId: String,
    role: String,
    text: String,
    timestamp: Number,
    classId: String,
    channel: String,
    groundingChunks: { type: mongoose.Schema.Types.Mixed, default: [] }
});

const teacherRequestSchema = new mongoose.Schema({
    id: { type: String, unique: true, required: true },
    facultyId: { type: String, required: true },
    queryType: String,
    subject: String,
    currentSchedule: String,
    requestedChange: String,
    reason: String,
    status: { type: String, default: 'Pending' },
    submittedDate: { type: String, default: () => new Date().toISOString() },
    priority: { type: String, default: 'Normal' },
});

// NEW: Student Query Schema
const studentQuerySchema = new mongoose.Schema({
    id: { type: String, unique: true, required: true },
    studentId: { type: String, required: true },
    queryType: String,
    subject: String,
    details: String,
    status: { type: String, default: 'Pending' },
    submittedDate: { type: String, default: () => new Date().toISOString() },
    adminResponse: String,
});


// --- NEW: Schemas for new modules ---
const syllabusProgressSchema = new mongoose.Schema({ id: { type: String, unique: true }, subjectId: String, facultyId: String, lectureNumber: Number, assignedTopic: String, taughtTopic: String, date: String, status: String, variance: Boolean });
const calendarEventSchema = new mongoose.Schema({ id: { type: String, unique: true }, eventType: String, title: String, start: String, end: String, description: String, allDay: Boolean, color: String });
const meetingSchema = new mongoose.Schema({ id: { type: String, unique: true }, title: String, description: String, meetingType: String, platform: String, meetingLink: String, room: String, start: String, end: String, organizerId: String, participants: [mongoose.Schema.Types.Mixed] });
const appNotificationSchema = new mongoose.Schema({ id: { type: String, unique: true }, title: String, message: String, recipients: mongoose.Schema.Types.Mixed, deliveryMethod: [String], notificationType: String, sentDate: String, status: String, scheduledFor: String });


// --- NEW: Student Dashboard Data Schemas ---
const studentAttendanceSchema = new mongoose.Schema({ studentId: String, subjectId: String, attended: Number, total: Number });
const examSchema = new mongoose.Schema({ id: {type: String, unique: true}, classId: String, subjectName: String, subjectCode: String, date: String, time: String, room: String });
const notificationSchema = new mongoose.Schema({ id: {type: String, unique: true}, studentId: String, title: String, message: String, timestamp: String, read: Boolean });

const Class = mongoose.model('Class', classSchema);
const Faculty = mongoose.model('Faculty', facultySchema);
const Subject = mongoose.model('Subject', subjectSchema);
const Room = mongoose.model('Room', roomSchema);
const Student = mongoose.model('Student', studentSchema);
const User = mongoose.model('User', userSchema);
const TimetableEntry = mongoose.model('TimetableEntry', timetableEntrySchema);
const Constraints = mongoose.model('Constraints', constraintsSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
const Institution = mongoose.model('Institution', institutionSchema);
const TeacherRequest = mongoose.model('TeacherRequest', teacherRequestSchema);
const StudentQuery = mongoose.model('StudentQuery', studentQuerySchema);
const StudentAttendance = mongoose.model('StudentAttendance', studentAttendanceSchema);
const Exam = mongoose.model('Exam', examSchema);
const Notification = mongoose.model('Notification', notificationSchema);
// NEW Models
const SyllabusProgress = mongoose.model('SyllabusProgress', syllabusProgressSchema);
const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);
const Meeting = mongoose.model('Meeting', meetingSchema);
const AppNotification = mongoose.model('AppNotification', appNotificationSchema);


const collections = { class: Class, faculty: Faculty, subject: Subject, room: Room, student: Student, user: User, timetable: TimetableEntry, constraints: Constraints, attendance: Attendance, chat: ChatMessage, institution: Institution, teacherRequest: TeacherRequest, studentQuery: StudentQuery };

const MOCK_CLASSES = [
    // CSE
    { id: 'c1', name: 'CSE-3-A', branch: 'CSE', year: 3, section: 'A', studentCount: 60, block: 'A-Block' },
    { id: 'c2', name: 'CSE-3-B', branch: 'CSE', year: 3, section: 'B', studentCount: 60, block: 'B-Block' },
    { id: 'c3', name: 'CSE-2-A', branch: 'CSE', year: 2, section: 'A', studentCount: 65, block: 'A-Block' },
    { id: 'c4', name: 'CSE-2-B', branch: 'CSE', year: 2, section: 'B', studentCount: 65, block: 'B-Block' },
    { id: 'c5', name: 'CSE-1-A', branch: 'CSE', year: 1, section: 'A', studentCount: 70, block: 'C-Block' },
    { id: 'c6', name: 'CSE-1-B', branch: 'CSE', year: 1, section: 'B', studentCount: 70, block: 'C-Block' },
    { id: 'c7', name: 'CSE-1-C', branch: 'CSE', year: 1, section: 'C', studentCount: 70, block: 'C-Block' },
    // CYS
    { id: 'c8', name: 'CYS-3-A', branch: 'CYS', year: 3, section: 'A', studentCount: 50, block: 'B-Block' },
    { id: 'c9', name: 'CYS-2-A', branch: 'CYS', year: 2, section: 'A', studentCount: 55, block: 'B-Block' },
    { id: 'c10', name: 'CYS-1-A', branch: 'CYS', year: 1, section: 'A', studentCount: 60, block: 'C-Block' },
    // BCA
    { id: 'c11', name: 'BCA-3-A', branch: 'BCA', year: 3, section: 'A', studentCount: 60, block: 'A-Block' },
    { id: 'c12', name: 'BCA-2-A', branch: 'BCA', year: 2, section: 'A', studentCount: 65, block: 'A-Block' },
    { id: 'c13', name: 'BCA-2-B', branch: 'BCA', year: 2, section: 'B', studentCount: 65, block: 'A-Block' },
    { id: 'c14', name: 'BCA-1-A', branch: 'BCA', year: 1, section: 'A', studentCount: 70, block: 'C-Block' },
    { id: 'c15', name: 'BCA-1-B', branch: 'BCA', year: 1, section: 'B', studentCount: 70, block: 'C-Block' },
];
const MOCK_FACULTY = [
    { id: 'f1', name: 'Dr. Rajesh Kumar', employeeId: 'T001', designation: 'Professor', department: 'CSE', specialization: ['Data Structures', 'Algorithms'], email: 'teacher@university.edu', contactNumber: '9876543210', maxWorkload: 18 },
    { id: 'f2', name: 'Prof. Sunita Sharma', employeeId: 'T002', designation: 'Associate Professor', department: 'CSE', specialization: ['Database Systems', 'Operating Systems'], email: 'prof.sunita@university.edu', contactNumber: '9876543211', maxWorkload: 20 },
    { id: 'f3', name: 'Dr. Anil Mehta', employeeId: 'T003', designation: 'Professor', department: 'CSE', specialization: ['AI', 'Machine Learning'], email: 'anil.mehta@university.edu', contactNumber: '9876543212', maxWorkload: 16 },
    { id: 'f4', name: 'Dr. Priya Singh', employeeId: 'T004', designation: 'Assistant Professor', department: 'CSE', specialization: ['Computer Networks'], email: 'priya.singh@university.edu', contactNumber: '9876543213', maxWorkload: 22 },
    { id: 'f5', name: 'Mr. Vikram Rathod', employeeId: 'T005', designation: 'Lecturer', department: 'CYS', specialization: ['Network Security', 'Cryptography'], email: 'vikram.rathod@university.edu', contactNumber: '9876543214', maxWorkload: 20 },
    { id: 'f6', name: 'Ms. Nisha Patel', employeeId: 'T006', designation: 'Associate Professor', department: 'CYS', specialization: ['Digital Forensics', 'Ethical Hacking'], email: 'nisha.patel@university.edu', contactNumber: '9876543215', maxWorkload: 18 },
    { id: 'f7', name: 'Dr. Mohan Kumar', employeeId: 'T007', designation: 'Professor', department: 'BCA', specialization: ['Software Engineering', 'Java'], email: 'mohan.kumar@university.edu', contactNumber: '9876543216', maxWorkload: 18 },
    { id: 'f8', name: 'Mrs. Geeta Desai', employeeId: 'T008', designation: 'Assistant Professor', department: 'BCA', specialization: ['Web Technologies', 'C Programming'], email: 'geeta.desai@university.edu', contactNumber: '9876543217', maxWorkload: 24 },
    { id: 'f9', name: 'Dr. Sandeep Verma', employeeId: 'T009', designation: 'Associate Professor', department: 'Applied Science', specialization: ['Mathematics', 'Physics'], email: 'sandeep.verma@university.edu', contactNumber: '9876543218', maxWorkload: 20 },
    { id: 'f10', name: 'Mr. Ravi Shankar', employeeId: 'T010', designation: 'Lecturer', department: 'BCA', specialization: ['DBMS'], email: 'ravi.shankar@university.edu', contactNumber: '9876543219', maxWorkload: 22 },
    { id: 'f11', name: 'Ms. Aarti Gupta', employeeId: 'T011', designation: 'Lecturer', department: 'CYS', specialization: ['Malware Analysis'], email: 'aarti.gupta@university.edu', contactNumber: '9876543220', maxWorkload: 22 },
];
const MOCK_SUBJECTS = [
    // Existing CSE 3rd Year
    { id: 's1', name: 'Data Structures', code: 'CS301', department: 'CSE', semester: 5, credits: 4, type: 'Theory', hoursPerWeek: 4, assignedFacultyId: 'f1' },
    { id: 's2', name: 'Algorithms', code: 'CS302', department: 'CSE', semester: 5, credits: 3, type: 'Theory', hoursPerWeek: 3, assignedFacultyId: 'f1' },
    { id: 's3', name: 'Database Systems', code: 'CS303', department: 'CSE', semester: 5, credits: 3, type: 'Theory', hoursPerWeek: 3, assignedFacultyId: 'f2' },
    { id: 's4', name: 'Data Structures Lab', code: 'CS301L', department: 'CSE', semester: 5, credits: 2, type: 'Lab', hoursPerWeek: 2, assignedFacultyId: 'f1' },
    { id: 's5', name: 'Database Systems Lab', code: 'CS303L', department: 'CSE', semester: 5, credits: 2, type: 'Lab', hoursPerWeek: 2, assignedFacultyId: 'f2' },
    // New CSE Subjects
    { id: 's6', name: 'Operating Systems', code: 'CS201', department: 'CSE', semester: 3, credits: 4, type: 'Theory', hoursPerWeek: 4, assignedFacultyId: 'f2' },
    { id: 's7', name: 'Computer Networks', code: 'CS304', department: 'CSE', semester: 5, credits: 3, type: 'Theory', hoursPerWeek: 3, assignedFacultyId: 'f4' },
    { id: 's8', name: 'Artificial Intelligence', code: 'CS305', department: 'CSE', semester: 5, credits: 3, type: 'Theory', hoursPerWeek: 3, assignedFacultyId: 'f3' },
    { id: 's9', name: 'C Programming', code: 'CS101', department: 'CSE', semester: 1, credits: 4, type: 'Theory', hoursPerWeek: 4, assignedFacultyId: 'f8' },
    { id: 's10', name: 'Engineering Maths-I', code: 'AS101', department: 'Applied Science', semester: 1, credits: 4, type: 'Theory', hoursPerWeek: 4, assignedFacultyId: 'f9' },
    // CYS Subjects
    { id: 's11', name: 'Network Security', code: 'CYS201', department: 'CYS', semester: 3, credits: 4, type: 'Theory', hoursPerWeek: 4, assignedFacultyId: 'f5' },
    { id: 's12', name: 'Cryptography', code: 'CYS202', department: 'CYS', semester: 3, credits: 3, type: 'Theory', hoursPerWeek: 3, assignedFacultyId: 'f5' },
    { id: 's13', name: 'Digital Forensics', code: 'CYS301', department: 'CYS', semester: 5, credits: 3, type: 'Theory', hoursPerWeek: 3, assignedFacultyId: 'f6' },
    { id: 's14', name: 'Ethical Hacking Lab', code: 'CYS301L', department: 'CYS', semester: 5, credits: 2, type: 'Lab', hoursPerWeek: 2, assignedFacultyId: 'f6' },
    { id: 's15', name: 'Malware Analysis', code: 'CYS302', department: 'CYS', semester: 5, credits: 3, type: 'Theory', hoursPerWeek: 3, assignedFacultyId: 'f11' },
    // BCA Subjects
    { id: 's16', name: 'Intro to Web Tech', code: 'BCA201', department: 'BCA', semester: 3, credits: 4, type: 'Theory', hoursPerWeek: 4, assignedFacultyId: 'f8' },
    { id: 's17', name: 'Java Programming', code: 'BCA301', department: 'BCA', semester: 5, credits: 4, type: 'Theory', hoursPerWeek: 4, assignedFacultyId: 'f7' },
    { id: 's18', name: 'Software Engineering', code: 'BCA302', department: 'BCA', semester: 5, credits: 3, type: 'Theory', hoursPerWeek: 3, assignedFacultyId: 'f7' },
    { id: 's19', name: 'BCA DBMS', code: 'BCA202', department: 'BCA', semester: 3, credits: 3, type: 'Theory', hoursPerWeek: 3, assignedFacultyId: 'f10' },
    { id: 's20', name: 'BCA C Programming', code: 'BCA101', department: 'BCA', semester: 1, credits: 4, type: 'Theory', hoursPerWeek: 4, assignedFacultyId: 'f8' },
];
const MOCK_ROOMS = [
    { id: 'r1', number: 'CS-101', building: 'Academic Block A', type: 'Classroom', capacity: 65, block: 'A-Block', equipment: { projector: true, smartBoard: true, ac: true, computerSystems: { available: false, count: 0 }, audioSystem: true, whiteboard: true } },
    { id: 'r2', number: 'CS-102', building: 'Academic Block B', type: 'Classroom', capacity: 65, block: 'B-Block', equipment: { projector: true, smartBoard: false, ac: true, computerSystems: { available: false, count: 0 }, audioSystem: false, whiteboard: true } },
    { id: 'r3', number: 'CS-Lab-1', building: 'Academic Block A', type: 'Laboratory', capacity: 60, block: 'A-Block', equipment: { projector: true, smartBoard: false, ac: true, computerSystems: { available: true, count: 30 }, audioSystem: false, whiteboard: true } },
    { id: 'r4', number: 'BCA-201', building: 'Academic Block A', type: 'Classroom', capacity: 70, block: 'A-Block', equipment: { projector: true, smartBoard: false, ac: true, computerSystems: { available: false, count: 0 }, audioSystem: false, whiteboard: true } },
    { id: 'r5', number: 'CYS-Lab', building: 'Academic Block B', type: 'Laboratory', capacity: 55, block: 'B-Block', equipment: { projector: true, smartBoard: true, ac: true, computerSystems: { available: true, count: 55 }, audioSystem: true, whiteboard: true } },
    { id: 'r6', number: 'LT-1', building: 'C-Block', type: 'Classroom', capacity: 75, block: 'C-Block', equipment: { projector: true, smartBoard: false, ac: false, computerSystems: { available: false, count: 0 }, audioSystem: true, whiteboard: true } },
    { id: 'r7', number: 'LT-2', building: 'C-Block', type: 'Classroom', capacity: 75, block: 'C-Block', equipment: { projector: true, smartBoard: false, ac: false, computerSystems: { available: false, count: 0 }, audioSystem: true, whiteboard: true } },
    { id: 'r8', number: 'BCA-Lab', building: 'Academic Block A', type: 'Laboratory', capacity: 65, block: 'A-Block', equipment: { projector: true, smartBoard: false, ac: true, computerSystems: { available: true, count: 65 }, audioSystem: false, whiteboard: true } },
];
const MOCK_STUDENTS = [ 
    { id: 'st1', name: 'Alice Sharma', classId: 'c1', roll: '01', email: 'student@university.edu', contactNumber: '8765432109' }, 
    { id: 'st2', name: 'Bob Singh', classId: 'c1', roll: '02', email: 'bob.singh@university.edu', contactNumber: '8765432108' }, 
    { id: 'st3', name: 'Charlie Brown', classId: 'c2', roll: '01', contactNumber: '8765432107' }, 
    { id: 'st4', name: 'Diana Prince', classId: 'c2', roll: '02', email: 'diana.p@university.edu', contactNumber: '8765432106' },
    // New students
    { id: 'st5', name: 'Ethan Hunt', classId: 'c3', roll: '01', email: 'ethan.h@university.edu' },
    { id: 'st6', name: 'Fiona Glenanne', classId: 'c8', roll: '01', email: 'fiona.g@university.edu' },
    { id: 'st7', name: 'George Costanza', classId: 'c11', roll: '01', email: 'george.c@university.edu' },
    { id: 'st8', name: 'Harry Potter', classId: 'c5', roll: '01', email: 'harry.p@university.edu' },
];
const MOCK_USERS = [ 
    { username: 'admin@university.edu', password: 'admin123', role: 'admin', profileId: 'admin01' }, 
    { username: 'teacher@university.edu', password: 'teacher123', role: 'teacher', profileId: 'f1' }, 
    { username: 'student@university.edu', password: 'student123', role: 'student', profileId: 'st1' },
    { username: 'nisha.patel@university.edu', password: 'teacher123', role: 'teacher', profileId: 'f6' },
    { username: 'geeta.desai@university.edu', password: 'teacher123', role: 'teacher', profileId: 'f8' },
    { username: 'ethan.h@university.edu', password: 'student123', role: 'student', profileId: 'st5' },
];
const MOCK_INSTITUTIONS = [
    {
        id: 'inst1',
        name: 'Central University of Technology',
        academicYear: '2024-2025',
        semester: 'Odd',
        session: 'Regular',
        blocks: ['A-Block', 'B-Block', 'C-Block']
    },
];
const MOCK_CONSTRAINTS = {
    maxConsecutiveClasses: 3,
    timePreferences: {
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        startTime: '09:30',
        endTime: '16:55',
        lunchStartTime: '12:50',
        lunchDurationMinutes: 45,
        slotDurationMinutes: 50,
    },
    chatWindow: { start: '09:00', end: '17:00' },
    isChatboxEnabled: true,
    classSpecific: [],
    fixedClasses: [
        { id: 'fc1', classId: 'c1', subjectId: 's4', day: 'wednesday', time: '10:20-11:10', roomId: 'r3' },
        { id: 'fc2', classId: 'c1', subjectId: 's4', day: 'wednesday', time: '11:10-12:00', roomId: 'r3' },
        { id: 'fc2-b', classId: 'c2', subjectId: 's4', day: 'friday', time: '10:20-11:10', roomId: 'r3' },
        { id: 'fc2-c', classId: 'c2', subjectId: 's4', day: 'friday', time: '11:10-12:00', roomId: 'r3' },
        { id: 'fc3', classId: 'c3', subjectId: 's5', day: 'thursday', time: '01:35-02:25', roomId: 'r3' },
        { id: 'fc4', classId: 'c8', subjectId: 's14', day: 'tuesday', time: '09:30-10:20', roomId: 'r5' },
    ],
    customConstraints: [],
    maxConcurrentClassesPerDept: { 'CSE': 4, 'CYS': 2, 'BCA': 3 },
};

// NEW MOCK DATA ---
const MOCK_STUDENT_QUERIES = [
    { id: 'sq1', studentId: 'st1', queryType: 'Academic', subject: 'Data Structures', details: 'I am having trouble understanding the concept of pointers in linked lists. Can I get some extra resources?', status: 'Pending', submittedDate: new Date().toISOString() }
];
const MOCK_SYLLABUS_PROGRESS = [
    { id: 'sp1', subjectId: 's1', facultyId: 'f1', lectureNumber: 1, assignedTopic: 'Introduction to Arrays', taughtTopic: 'Introduction to Arrays', date: '2024-08-05', status: 'Completed', variance: false },
    { id: 'sp2', subjectId: 's1', facultyId: 'f1', lectureNumber: 2, assignedTopic: 'Linked Lists', taughtTopic: 'Linked Lists', date: '2024-08-07', status: 'Completed', variance: false },
    { id: 'sp3', subjectId: 's1', facultyId: 'f1', lectureNumber: 3, assignedTopic: 'Stacks and Queues', taughtTopic: 'Stacks and Queues', date: '2024-08-12', status: 'Completed', variance: false },
    { id: 'sp4', subjectId: 's1', facultyId: 'f1', lectureNumber: 4, assignedTopic: 'Trees', taughtTopic: 'Intro to Trees & Binary Trees', date: '2024-08-14', status: 'Completed', variance: true },
    { id: 'sp5', subjectId: 's1', facultyId: 'f1', lectureNumber: 5, assignedTopic: 'Graphs', taughtTopic: 'Graphs', date: '2024-08-19', status: 'Pending', variance: false },
];
const MOCK_CALENDAR_EVENTS = [
    { id: 'ce1', eventType: 'Holiday', title: 'Independence Day', start: '2024-08-15', end: '2024-08-15', allDay: true, color: '#d946ef' },
    { id: 'ce2', eventType: 'Event', title: 'Tech Fest "Innovate 2024"', start: '2024-09-20T09:00:00', end: '2024-09-21T17:00:00', allDay: false, color: '#0ea5e9' },
    { id: 'ce3', eventType: 'Test', title: 'Mid-Term Exams Start', start: '2024-10-10', end: '2024-10-18', allDay: true, color: '#f97316' },
];
const MOCK_MEETINGS = [
    { id: 'm1', title: 'Department Meeting: CSE', meetingType: 'Department', platform: 'Offline', room: 'CS-101', start: '2024-08-02T15:00:00', end: '2024-08-02T16:00:00', organizerId: 'f1', participants: [{type: 'faculty', id: 'f1'}, {type: 'faculty', id: 'f2'}] },
    { id: 'm2', title: 'Project Review - CSE-3-A', meetingType: 'Class Meeting', platform: 'Google Meet', meetingLink: 'https://meet.google.com/xyz-abc-def', start: '2024-08-22T11:00:00', end: '2024-08-22T12:00:00', organizerId: 'f1', participants: [{type: 'student', id: 'st1'}, {type: 'student', id: 'st2'}]}
];
const MOCK_APP_NOTIFICATIONS = [
    { id: 'an1', title: 'Welcome to the new Semester!', message: 'All the best for the upcoming academic year.', recipients: {type: 'Both'}, deliveryMethod: ['In-App'], notificationType: 'General', sentDate: new Date().toISOString(), status: 'Sent' }
];

const MOCK_STUDENT_ATTENDANCE = [
    { studentId: 'st1', subjectId: 's1', attended: 18, total: 20 },
    { studentId: 'st1', subjectId: 's2', attended: 13, total: 15 },
    { studentId: 'st1', subjectId: 's3', attended: 14, total: 15 },
    { studentId: 'st1', subjectId: 's4', attended: 8, total: 10 },
    { studentId: 'st1', subjectId: 's5', attended: 7, total: 10 },
];
const MOCK_EXAMS = [
    { id: 'e1', classId: 'c1', subjectName: 'Data Structures', subjectCode: 'CS301', date: '2024-12-10', time: '09:30 AM - 12:30 PM', room: 'A-101' },
    { id: 'e2', classId: 'c1', subjectName: 'Algorithms', subjectCode: 'CS302', date: '2024-12-12', time: '09:30 AM - 12:30 PM', room: 'A-102' },
    { id: 'e3', classId: 'c1', subjectName: 'Database Systems', subjectCode: 'CS303', date: '2024-12-14', time: '09:30 AM - 12:30 PM', room: 'A-101' },
];
const MOCK_NOTIFICATIONS = [
    { studentId: 'st1', id: 'n1', title: 'Assignment 2 Deadline Extended', message: 'The deadline for the DBMS assignment has been extended to Dec 5th.', timestamp: '2 hours ago', read: false },
    { studentId: 'st1', id: 'n2', title: 'Guest Lecture on AI', message: 'A guest lecture on "The Future of AI" is scheduled for this Friday at 3 PM in the main auditorium.', timestamp: '1 day ago', read: false },
    { studentId: 'st1', id: 'n3', title: 'Fee Payment Reminder', message: 'Please pay your semester fees by the end of this week.', timestamp: '3 days ago', read: true },
];

async function seedDatabase() {
    try {
        console.log('Seeding database with initial data...');

        const usersWithHashedPasswords = await Promise.all(MOCK_USERS.map(async (user) => {
            const hashedPassword = await bcrypt.hash(user.password, saltRounds);
            return { ...user, password: hashedPassword };
        }));
        
        const modelDataMap = {
            Class: MOCK_CLASSES, Faculty: MOCK_FACULTY, Subject: MOCK_SUBJECTS,
            Room: MOCK_ROOMS, Student: MOCK_STUDENTS, Institution: MOCK_INSTITUTIONS,
            // NEW Mocks
            SyllabusProgress: MOCK_SYLLABUS_PROGRESS, CalendarEvent: MOCK_CALENDAR_EVENTS,
            Meeting: MOCK_MEETINGS, AppNotification: MOCK_APP_NOTIFICATIONS,
            StudentQuery: MOCK_STUDENT_QUERIES
        };

        for (const [modelName, data] of Object.entries(modelDataMap)) {
            const Model = mongoose.model(modelName);
            const operations = data.map(doc => ({
                updateOne: { filter: { id: doc.id }, update: { $setOnInsert: doc }, upsert: true }
            }));
            if (operations.length > 0) await Model.bulkWrite(operations);
        }

        const userOps = usersWithHashedPasswords.map(user => ({
            updateOne: { filter: { username: user.username, role: user.role }, update: { $setOnInsert: user }, upsert: true }
        }));
        if (userOps.length > 0) await User.bulkWrite(userOps);

        await Constraints.updateOne({ identifier: 'global_constraints' }, { $setOnInsert: MOCK_CONSTRAINTS }, { upsert: true });

        // Seed new student data if collections are empty
        if (await StudentAttendance.countDocuments() === 0) await StudentAttendance.insertMany(MOCK_STUDENT_ATTENDANCE);
        const examOps = MOCK_EXAMS.map(doc => ({ updateOne: { filter: { id: doc.id }, update: { $setOnInsert: doc }, upsert: true } }));
        if (examOps.length > 0) await Exam.bulkWrite(examOps);
        const notificationOps = MOCK_NOTIFICATIONS.map(doc => ({ updateOne: { filter: { id: doc.id }, update: { $setOnInsert: doc }, upsert: true } }));
        if (notificationOps.length > 0) await Notification.bulkWrite(notificationOps);

        console.log('Database seed/update complete.');
    } catch (error) { console.error('Error seeding database:', error); }
}

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('MongoDB connected successfully.');
    console.log("Ensuring database has initial seed data...");
    await seedDatabase();
}).catch(err => {
    console.error('Initial MongoDB connection error:', err);
    process.exit(1);
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const user = await User.findOne({ username, role });
        if (user) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                const userPayload = { username, role, _id: user._id, profileId: user.profileId };
                const token = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: '8h' });
                res.json({ token, user: userPayload });
            } else {
                res.status(401).json({ message: 'Invalid credentials. Please check your email, password, and role.' });
            }
        } else {
            res.status(401).json({ message: 'Invalid credentials. Please check your email, password, and role.' });
        }
    } catch (error) {
        console.error(`[AUTH] Server error during login for user: '${username}' with role: '${role}'. Details:`, error);
        res.status(500).json({ message: "An error occurred during login." });
    }
});

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) { return res.status(401).json({ message: 'Authorization token required' }); }
    const token = authHeader.split(' ')[1];
    try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); } catch (err) { return res.status(403).json({ message: 'Invalid or expired token' }); }
};

const adminOnly = (req, res, next) => req.user && req.user.role === 'admin' ? next() : res.status(403).json({ message: 'Forbidden: Admin access required' });
const adminOrTeacher = (req, res, next) => req.user && (req.user.role === 'admin' || req.user.role === 'teacher') ? next() : res.status(403).json({ message: 'Forbidden: Admin or Teacher access required' });

const handleApiError = (res, error, context) => {
    console.error(`Error in ${context}:`, error);
    if (error.name === 'ValidationError') { return res.status(400).json({ message: `Validation failed: ${Object.values(error.errors).map(e => e.message).join(', ')}` }); }
    if (error.code === 11000) { return res.status(409).json({ message: `A resource with the given details already exists.` }); }
    res.status(500).json({ message: `An internal server error occurred.` });
};

// --- Main Data Endpoints ---
app.get('/api/all-data', authMiddleware, async (req, res) => {
    try {
        const findChatMessages = () => {
          if (req.user.role === 'admin') {
              return ChatMessage.find({ channel: { $regex: /^admin-chat-/ } }).sort({ timestamp: 1 }).lean();
          }
          return ChatMessage.find({ channel: { $not: { $regex: /^admin-chat-/ } } }).sort({ timestamp: 1 }).lean();
        };

        // FIX: Safely fetch student-specific data
        let studentDataPromises = [Promise.resolve([]), Promise.resolve([]), Promise.resolve([]), Promise.resolve([])];
        if (req.user.role === 'student') {
            const student = await Student.findOne({ id: req.user.profileId }).lean();
            const studentClassId = student ? student.classId : null;
            studentDataPromises = [
                StudentAttendance.find({ studentId: req.user.profileId }).lean(),
                studentClassId ? Exam.find({ classId: studentClassId }).lean() : Promise.resolve([]),
                Notification.find({ studentId: req.user.profileId }).lean(),
                StudentQuery.find({ studentId: req.user.profileId }).lean(),
            ];
        } else if (req.user.role === 'admin') {
            studentDataPromises[3] = StudentQuery.find().lean();
        }

        const [
            classes, faculty, subjects, rooms, students, constraints, timetable, 
            attendance, users, chatMessages, institutions, teacherRequests,
            studentAttendance, exams, notifications, studentQueries,
            // NEW
            syllabusProgress, meetings, calendarEvents, appNotifications
        ] = await Promise.all([
            Class.find().lean(), Faculty.find().lean(), Subject.find().lean(), Room.find().lean(), Student.find().lean(),
            Constraints.findOne({ identifier: 'global_constraints' }).lean(),
            TimetableEntry.find().lean(),
            Attendance.find().lean(),
            req.user.role === 'admin' ? User.find({ role: { $ne: 'admin' } }).lean() : Promise.resolve([]),
            findChatMessages(),
            Institution.find().lean(),
            req.user.role === 'teacher' ? TeacherRequest.find({ facultyId: req.user.profileId }).lean() : (req.user.role === 'admin' ? TeacherRequest.find().lean() : Promise.resolve([])),
            ...studentDataPromises,
            // NEW
            SyllabusProgress.find().lean(), Meeting.find().lean(), CalendarEvent.find().lean(), AppNotification.find().lean(),
        ]);

        const attendanceMap = attendance.reduce((acc, curr) => {
            if (!acc[curr.classId]) acc[curr.classId] = {};
            const recordsMap = curr.records.reduce((recAcc, rec) => {
                recAcc[rec.studentId] = rec.status;
                return recAcc;
            }, {});
            acc[curr.classId][curr.date] = recordsMap;
            return acc;
        }, {});
        
        res.json({ 
            classes, faculty, subjects, rooms, students, users, constraints, timetable, 
            attendance: attendanceMap, chatMessages, institutions, teacherRequests,
            studentAttendance, exams, notifications, studentQueries,
            // NEW
            syllabusProgress, meetings, calendarEvents, appNotifications
        });
    } catch (error) { handleApiError(res, error, 'fetching all data'); }
});

// --- Validation Middleware ---
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }
    const extractedErrors = [];
    errors.array().map(err => extractedErrors.push({ [err.path]: err.msg }));

    return res.status(422).json({
        message: 'Validation failed',
        errors: extractedErrors,
    });
};

const userValidationRules = [
    body('username').isEmail().normalizeEmail().withMessage('Please enter a valid email address.'),
    body('password').if(body('password').exists({checkFalsy: true})).isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
      .matches(/\d/).withMessage('Password must contain a number.')
      .matches(/[a-z]/).withMessage('Password must contain a lowercase letter.')
      .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter.'),
    body('role').isIn(['teacher', 'student']).withMessage('Invalid role specified.'),
    body('profileId').notEmpty().withMessage('A profile must be linked.')
];
const studentValidationRules = [
    body('name').trim().escape().notEmpty().withMessage('Student name is required.'),
    body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail().withMessage('Please enter a valid email.'),
    body('classId').notEmpty().withMessage('Class ID is required.'),
];
const institutionValidationRules = [
    body('name').trim().escape().notEmpty().withMessage('Institution name is required.'),
    body('academicYear').trim().escape().notEmpty().withMessage('Academic Year is required.'),
];

// --- Entity CRUD ---
const createRouterFor = (type, validationRules = []) => {
    const router = express.Router();
    const Model = collections[type];
    router.post('/', ...validationRules, validate, async (req, res) => {
        try {
            const doc = { ...req.body };
            if (!doc.id) {
                doc.id = new mongoose.Types.ObjectId().toString();
            }
            const newItem = new Model(doc);
            await newItem.save();
            res.status(201).json(newItem);
        } catch (e) {
            handleApiError(res, e, `${type} creation`);
        }
    });
    router.put('/:id', ...validationRules, validate, async (req, res) => { try { const updated = await Model.findOneAndUpdate({ id: req.params.id }, req.body, { new: true, runValidators: true }); if (!updated) return res.status(404).json({ message: 'Not found' }); res.json(updated); } catch (e) { handleApiError(res, e, `${type} update`); } });
    router.delete('/:id', async (req, res) => { try { const deleted = await Model.findOneAndDelete({ id: req.params.id }); if (!deleted) return res.status(404).json({ message: 'Not found' }); res.status(204).send(); } catch (e) { handleApiError(res, e, `${type} deletion`); } });
    return router;
};
app.use('/api/class', authMiddleware, adminOnly, createRouterFor('class'));
app.use('/api/faculty', authMiddleware, adminOnly, createRouterFor('faculty'));
app.use('/api/subject', authMiddleware, adminOnly, createRouterFor('subject'));
app.use('/api/room', authMiddleware, adminOnly, createRouterFor('room'));
app.use('/api/student', authMiddleware, adminOnly, createRouterFor('student', studentValidationRules));
app.use('/api/institution', authMiddleware, adminOnly, createRouterFor('institution', institutionValidationRules));

// --- PAGINATED ENDPOINTS ---
app.get('/api/paginated/students', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { classId, page = 1, limit = 10, search = '' } = req.query;
        const query = { classId };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { roll: { $regex: search, $options: 'i' } },
            ];
        }

        const options = {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            lean: true,
            sort: { name: 1 }
        };
        const skip = (options.page - 1) * options.limit;
        const totalDocs = await Student.countDocuments(query);
        const docs = await Student.find(query).sort(options.sort).skip(skip).limit(options.limit).lean();
        
        const totalPages = Math.ceil(totalDocs / options.limit);
        res.json({ docs, totalDocs, limit: options.limit, totalPages, page: options.page, hasNextPage: options.page < totalPages, hasPrevPage: options.page > 1 });
    } catch (e) {
        handleApiError(res, e, 'paginated student fetch');
    }
});

app.get('/api/paginated/users', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { role, page = 1, limit = 10, search = '' } = req.query;
        const query = { role };
        if (search) {
            const profileModel = role === 'teacher' ? Faculty : Student;
            const matchingProfiles = await profileModel.find({ name: { $regex: search, $options: 'i' } }).select('id').lean();
            const profileIds = matchingProfiles.map(p => p.id);
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { profileId: { $in: profileIds } }
            ];
        }
        const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const totalDocs = await User.countDocuments(query);
        const docs = await User.find(query).sort({ username: 1 }).skip(skip).limit(parseInt(limit, 10)).lean();
        const totalPages = Math.ceil(totalDocs / parseInt(limit, 10));
        res.json({ docs, totalDocs, limit: parseInt(limit, 10), totalPages, page: parseInt(page, 10), hasNextPage: parseInt(page, 10) < totalPages, hasPrevPage: parseInt(page, 10) > 1 });
    } catch (e) {
        handleApiError(res, e, 'paginated user fetch');
    }
});

// --- User Management ---
app.post('/api/users', authMiddleware, adminOnly, userValidationRules, validate, async (req, res) => { try { const { username, password, role, profileId } = req.body; const hashedPassword = await bcrypt.hash(password, saltRounds); const newUser = new User({ username, password: hashedPassword, role, profileId }); await newUser.save(); res.status(201).json(newUser); } catch (e) { handleApiError(res, e, 'user creation'); } });
app.put('/api/users/:id', authMiddleware, adminOnly, userValidationRules, validate, async (req, res) => {
    try {
        const { username, password, role, profileId } = req.body;
        const userToUpdate = await User.findById(req.params.id);
        if (!userToUpdate) return res.status(404).json({ message: 'User not found' });
        if (userToUpdate.role === 'admin') return res.status(403).json({ message: "Cannot modify admin user" });

        const updateData = { username, role, profileId };
        if (password && password.length > 0) {
            updateData.password = await bcrypt.hash(password, saltRounds);
        }
        const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
        res.json(updatedUser);
    } catch (e) {
        handleApiError(res, e, 'user update');
    }
});
app.delete('/api/users/:id', authMiddleware, adminOnly, async (req, res) => { try { const user = await User.findById(req.params.id); if (!user) return res.status(404).json({ message: "User not found" }); if (user.role === 'admin') return res.status(403).json({ message: "Cannot delete admin user" }); await User.findByIdAndDelete(req.params.id); res.status(204).send(); } catch (e) { handleApiError(res, e, 'user deletion'); } });

// --- Timetable, Constraints, Attendance, Chat ---
app.put('/api/constraints', authMiddleware, adminOnly, async (req, res) => {
    try {
        const updatedConstraints = await Constraints.findOneAndUpdate(
            { identifier: 'global_constraints' },
            { $set: req.body }, 
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        res.json(updatedConstraints);
    } catch (e) {
        handleApiError(res, e, 'constraints update');
    }
});

app.put('/api/constraints/faculty-availability', authMiddleware, adminOrTeacher, async (req, res) => {
    const { facultyId, unavailability } = req.body;
    if (req.user.role === 'teacher' && req.user.profileId !== facultyId) {
        return res.status(403).json({ message: "Forbidden: You can only update your own availability." });
    }
    try {
        const constraints = await Constraints.findOne({ identifier: 'global_constraints' });
        if (!constraints) return res.status(404).json({ message: 'Constraints document not found.' });
        const prefIndex = (constraints.facultyPreferences || []).findIndex(p => p.facultyId === facultyId);
        if (prefIndex > -1) {
            constraints.facultyPreferences[prefIndex].unavailability = unavailability;
        } else {
            if (!constraints.facultyPreferences) constraints.facultyPreferences = [];
            constraints.facultyPreferences.push({ facultyId, unavailability });
        }
        constraints.markModified('facultyPreferences');
        await constraints.save();
        res.json(constraints);
    } catch (e) {
        handleApiError(res, e, 'faculty availability update');
    }
});

app.post('/api/timetable', authMiddleware, adminOnly, async (req, res) => { try { await TimetableEntry.deleteMany({}); await TimetableEntry.insertMany(req.body); res.status(201).json(req.body); } catch (e) { handleApiError(res, e, 'timetable save'); } });
app.put('/api/attendance', authMiddleware, adminOrTeacher, async (req, res) => {
    const { classId, date, studentId, status } = req.body;
    try {
        const updateResult = await Attendance.updateOne(
            { classId, date, "records.studentId": studentId },
            { $set: { "records.$.status": status } }
        );
        if (updateResult.matchedCount === 0) {
            await Attendance.updateOne(
                { classId, date },
                { $push: { records: { studentId, status } } },
                { upsert: true }
            );
        }
        res.status(200).json({ success: true });
    } catch (e) { handleApiError(res, e, 'attendance update'); }
});

app.put('/api/attendance/class', authMiddleware, adminOrTeacher, async (req, res) => {
    const { classId, date, records } = req.body;
    if (!classId || !date || !records) {
        return res.status(400).json({ message: "Missing classId, date, or records." });
    }
    try {
        const recordsArray = Object.entries(records).map(([studentId, status]) => ({ studentId, status }));
        await Attendance.updateOne(
            { classId, date },
            { $set: { classId, date, records: recordsArray } },
            { upsert: true }
        );
        res.status(200).json({ success: true, message: 'Attendance saved.' });
    } catch (e) { handleApiError(res, e, 'bulk attendance update'); }
});

// --- Chat Endpoints ---

// FIX: Added the missing 'generateChatPrompt' function that was causing a ReferenceError.
// UPDATED: Modified prompt to be less restrictive and allow use of general knowledge/search.
const generateChatPrompt = (userProfile, userClass, timetable, subjects, faculty, history) => {
    const relevantTimetable = timetable.map(t => `${t.day} at ${t.time}: ${t.subject} with ${t.faculty} in ${t.room}`).join('; ');
    const subjectList = subjects.map(s => `${s.name} (${s.code})`).join(', ');

    let context = `CONTEXT: You are a helpful AI Campus Assistant for a university. Your primary goal is to answer student questions based on the context provided about their schedule, subjects, and class. If the information isn't in the context, you can use your general knowledge or the provided search results to answer. You are answering a question from student:
- Name: ${userProfile.name}
- Class: ${userClass ? userClass.name : 'Not currently enrolled.'}
- Timetable: ${relevantTimetable || 'Not available.'}
- Subjects in their department: ${subjectList || 'Not available.'}`;

    if (history && history.length > 0) {
        context += '\n\nPREVIOUS CONVERSATION:\n' + history.map(h => `${h.author}: ${h.text}`).join('\n');
    }

    return `${context}\n\nSTUDENT'S QUESTION: `;
};

// FIX: Replaced keyword-based mock with a full Gemini implementation for the student chatbot.
app.post('/api/chat/ask', authMiddleware, async (req, res) => {
    if (!process.env.API_KEY) {
        return res.status(500).json({ message: "AI features are not configured on the server." });
    }
    
    const { messageText, classId, messageId } = req.body;
    const { user } = req;
    
    try {
        // Save the user's message to the database
        const userMessage = new ChatMessage({
            id: messageId,
            text: messageText,
            classId: classId,
            author: user.username,
            authorId: user.profileId,
            role: user.role,
            channel: 'query',
            timestamp: Date.now(),
        });
        await userMessage.save();

        // Fetch context for the prompt
        const studentProfile = await Student.findOne({ id: user.profileId }).lean();
        if (!studentProfile) {
             const aiMessage = new ChatMessage({
                id: `ai-msg-${Date.now()}`, text: "I'm sorry, I couldn't find your student profile to provide personalized information.", classId: classId, author: 'Campus AI', role: 'admin', channel: 'query', timestamp: Date.now(),
            });
            await aiMessage.save();
            return res.status(201).json(aiMessage);
        }
        
        const studentClass = studentProfile.classId ? await Class.findOne({ id: studentProfile.classId }).lean() : null;

        const [timetable, subjects, faculty, history] = await Promise.all([
            studentClass ? TimetableEntry.find({ className: studentClass.name }).lean() : Promise.resolve([]),
            studentClass ? Subject.find({ department: studentClass.branch }).lean() : Promise.resolve([]),
            Faculty.find().lean(),
            ChatMessage.find({ channel: 'query', authorId: user.profileId }).sort({ timestamp: -1 }).limit(10).lean()
        ]);
        
        // Construct the prompt
        const prompt = generateChatPrompt(studentProfile, studentClass, timetable, subjects, faculty, history.reverse());
        
        // Call Gemini API
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
           model: "gemini-2.5-flash",
           contents: `${prompt}${messageText}`,
           config: { tools: [{googleSearch: {}}] } // Adding grounding for better responses
        });

        // Save AI response and send to client
        const aiMessage = new ChatMessage({
            id: `ai-msg-${Date.now()}`,
            text: response.text,
            classId: classId,
            author: 'Campus AI',
            role: 'admin',
            channel: 'query',
            timestamp: Date.now(),
            groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
        });
        await aiMessage.save();

        res.status(201).json(aiMessage);

    } catch (error) {
        handleApiError(res, error, 'AI chat processing');
    }
});

const adminAskAsStudentValidation = [
    body('studentId').notEmpty().withMessage('Student ID is required.'),
    body('messageText').notEmpty().withMessage('Message text is required.'),
];

app.post('/api/chat/admin-ask-as-student', authMiddleware, adminOnly, ...adminAskAsStudentValidation, validate, async (req, res) => {
    if (!process.env.API_KEY) { return res.status(500).json({ message: "AI features are not configured on the server." }); }
    
    const { studentId, messageText } = req.body;

    try {
        const student = await Student.findOne({ id: studentId }).lean();
        if (!student) return res.status(404).json({ message: "Student profile not found." });
        const studentClass = student.classId ? await Class.findOne({ id: student.classId }).lean() : null;
        const [timetable, subjects, faculty] = await Promise.all([
            studentClass ? TimetableEntry.find({ className: studentClass.name }).lean() : Promise.resolve([]),
            Subject.find().lean(),
            Faculty.find().lean()
        ]);
        
        const prompt = generateChatPrompt(student, studentClass, timetable, subjects, faculty, []);
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: `${prompt}${messageText}`, config: { tools: [{googleSearch: {}}] } });

        const aiMessage = {
            id: `ai-test-msg-${Date.now()}`, text: response.text, classId: student.classId || '', author: 'Campus AI', role: 'admin', channel: 'admin-test', timestamp: Date.now(), 
            groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
        };
        res.status(200).json(aiMessage);
    } catch (error) {
        handleApiError(res, error, 'Admin AI chat simulation');
    }
});

app.post('/api/chat/send', authMiddleware, adminOrTeacher, async (req, res) => {
    const { text, classId } = req.body;
    const { user } = req;
    if (!text || !classId) { return res.status(400).json({ message: 'Message text and classId are required.' }); }
    try {
        const facultyProfile = await Faculty.findOne({ id: user.profileId }).lean();
        const authorName = user.role === 'admin' ? 'Admin' : facultyProfile?.name || user.username;
        const message = new ChatMessage({ id: `msg-${Date.now()}`, text, classId, author: authorName, authorId: user.profileId, role: user.role, channel: `admin-chat-${classId}`, timestamp: Date.now(), });
        await message.save();
        res.status(201).json(message);
    } catch (error) { handleApiError(res, e, 'Privileged chat send'); }
});

app.post('/api/chat/message', authMiddleware, async (req, res) => {
    const { text, channel } = req.body;
    const { user } = req;
    if (!text || !channel) { return res.status(400).json({ message: 'Message text and channel are required.' }); }
    if (user.role === 'admin') { return res.status(403).json({ message: 'Admins cannot participate in student-teacher chats.' }); }
    try {
        const profile = user.role === 'teacher' ? await Faculty.findOne({ id: user.profileId }).lean() : await Student.findOne({ id: user.profileId }).lean();
        const authorName = profile?.name || user.username;
        const message = new ChatMessage({ id: `msg-${new mongoose.Types.ObjectId()}`, text, channel, author: authorName, authorId: user.profileId, role: user.role, timestamp: Date.now(), classId: channel.startsWith('class-') ? channel.replace('class-', '') : '' });
        await message.save();
        res.status(201).json(message);
    } catch (error) { handleApiError(res, error, 'chat message send'); }
});

app.post('/api/student/queries', authMiddleware, async (req, res) => {
    if (req.user.role !== 'student') {
        return res.status(403).json({ message: 'Forbidden: Only students can submit queries.' });
    }
    try {
        const queryData = { 
            ...req.body, 
            id: `sq-${new mongoose.Types.ObjectId()}`, 
            studentId: req.user.profileId, 
            status: 'Pending', 
            submittedDate: new Date().toISOString() 
        };
        const newQuery = new StudentQuery(queryData);
        await newQuery.save();
        res.status(201).json(newQuery);
    } catch(e) { handleApiError(res, e, 'student query submission'); }
});


app.put('/api/teacher/availability', authMiddleware, adminOrTeacher, async (req, res) => {
    const { facultyId, availability } = req.body;
    if (req.user.role === 'teacher' && req.user.profileId !== facultyId) { return res.status(403).json({ message: "Forbidden: You can only update your own availability." }); }
    try {
        const updatedFaculty = await Faculty.findOneAndUpdate({ id: facultyId }, { availability }, { new: true });
        if (!updatedFaculty) return res.status(404).json({ message: 'Faculty not found.' });
        res.json(updatedFaculty);
    } catch(e) { handleApiError(res, e, 'teacher availability update'); }
});

app.post('/api/teacher/requests', authMiddleware, adminOrTeacher, async (req, res) => {
    try {
        const requestData = { ...req.body, id: `req-${new mongoose.Types.ObjectId()}`, facultyId: req.user.profileId, status: 'Pending', submittedDate: new Date().toISOString() };
        const newRequest = new TeacherRequest(requestData);
        await newRequest.save();
        res.status(201).json(newRequest);
    } catch(e) { handleApiError(res, e, 'teacher request submission'); }
});

app.post('/api/chat/ask/teacher', authMiddleware, adminOrTeacher, async (req, res) => {
    if (!process.env.API_KEY) { return res.status(500).json({ message: "AI features are not configured on the server." }); }
    const { messageText, messageId } = req.body;
    const { user } = req;
    const channelId = `teacher-ai-${user.profileId}`;
    try {
        const userMessage = new ChatMessage({ id: messageId, text: messageText, author: user.username, role: 'teacher', channel: channelId, classId: channelId, timestamp: Date.now(), });
        await userMessage.save();
        const teacher = await Faculty.findOne({ id: user.profileId }).lean();
        if (!teacher) return res.status(404).json({ message: "Teacher profile not found." });
        const history = await ChatMessage.find({ channel: channelId }).sort({ timestamp: -1 }).limit(5).lean();
        const generateTeacherChatPrompt = (teacherProfile, history) => `You are an AI assistant for ${teacherProfile.name}. Context: Department: ${teacherProfile.department}. History: ${history.map(h => `${h.author}: ${h.text}`).join('\n')}. New Question:`;
        const prompt = generateTeacherChatPrompt(teacher, history.reverse());
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: `${prompt}${messageText}`, config: { tools: [{googleSearch: {}}] } });
        const aiMessage = new ChatMessage({ id: `ai-msg-${Date.now()}`, text: response.text, author: 'Campus AI', role: 'admin', channel: channelId, classId: channelId, timestamp: Date.now(), groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] });
        await aiMessage.save();
        res.status(201).json(aiMessage);
    } catch (error) { handleApiError(res, error, 'Teacher AI chat processing'); }
});

app.post('/api/reset-data', authMiddleware, adminOnly, async (req, res) => {
    try {
        console.log('Forcing database reset...');
        await Promise.all(Object.values(mongoose.connection.collections).map(collection => collection.deleteMany({})));
        await seedDatabase();
        res.status(200).json({ message: 'Database reset successfully.' });
    } catch (e) {
        handleApiError(res, e, 'data reset');
    }
});

const generateTimetablePrompt = (classes, faculty, subjects, rooms, constraints) => {
    const simplifiedClasses = classes.map(({id, name, studentCount, branch, year, block}) => ({id, name, studentCount, branch, year, block}));
    const simplifiedFaculty = faculty.map(({id, name, maxWorkload, department}) => ({id, name, maxWorkload, department}));
    const simplifiedSubjects = subjects.map(({id, name, code, hoursPerWeek, type, assignedFacultyId, department, semester}) => ({id, name, code, hoursPerWeek, type, assignedFacultyId, department, semester}));
    const simplifiedRooms = rooms.map(({id, number, capacity, type, block}) => ({id, number, capacity, type, block}));
    
    return `
      You are an expert university timetable scheduler. Your task is to generate a conflict-free weekly timetable in JSON format based on the provided data and a strict set of rules.

      **INPUT DATA:**
      - Classes: ${JSON.stringify(simplifiedClasses)}
      - Faculty: ${JSON.stringify(simplifiedFaculty)}
      - Subjects: ${JSON.stringify(simplifiedSubjects)}
      - Rooms: ${JSON.stringify(simplifiedRooms)}
      - Constraints: ${JSON.stringify(constraints)}

      **HARD RULES (MUST be followed without exception):**
      1.  **Subject-Class Matching:** A subject must be scheduled for a class ONLY IF the subject's 'department' matches the class's 'branch' AND the subject's 'semester' corresponds to the class's 'year' (Semesters 1-2 for Year 1, 3-4 for Year 2, 5-6 for Year 3, etc.).
      2.  **No Conflicts:** A faculty member, a class, or a room cannot be in two places at once.
      3.  **Room Capacity:** The number of students in a class must not exceed the capacity of its assigned room.
      4.  **Room Type:** 'Lab' subjects must be in 'Laboratory' rooms. 'Tutorial' subjects in 'Tutorial Room'. 'Theory' subjects in 'Classroom' or 'Seminar Hall'.
      5.  **Workload Limit:** The total number of lectures for any faculty member MUST NOT exceed their specified \`maxWorkload\`.
      6.  **Fixed Classes:** Adhere strictly to all 'fixedClasses' defined in constraints. These are non-negotiable pre-scheduled slots and must be placed first. Their 'classType' must be 'fixed'. All other generated classes are 'regular'.
      7.  **Faculty Assignment:** A faculty member can ONLY teach a subject if their ID is listed as the 'assignedFacultyId' for that subject. Do not assign any other faculty.
      8.  **Weekly Hours:** The total number of scheduled slots for each subject for EACH CLASS it is taught to must exactly match its 'hoursPerWeek' requirement.
      9.  **Working Hours:** Do not schedule any classes outside the working days (${constraints.timePreferences.workingDays.join(', ')}) and time slots defined by the start time (${constraints.timePreferences.startTime}), end time (${constraints.timePreferences.endTime}), and slot duration (${constraints.timePreferences.slotDurationMinutes} mins).
      10. **Lunch Break:** Do not schedule any classes during the lunch break, which starts at ${constraints.timePreferences.lunchStartTime} and lasts for ${constraints.timePreferences.lunchDurationMinutes} minutes.

      **OPTIMIZATION GOALS (Apply after all hard rules are met):**
      1.  **Maximize Slot Utilization:** Fill every available time slot for every class. There should be no empty periods except for lunch, unless required by hard constraints.
      2.  **Co-location Preference:** If a class has a 'block' specified (e.g., 'A-Block'), strongly prefer scheduling its sessions in rooms that are also in the same 'block'. This minimizes student and faculty travel time.
      3.  **Balanced Faculty Load:** If \`enableFacultyLoadBalancing\` is true, distribute the teaching load as evenly as possible among qualified faculty members across the week.
      4.  **Balanced Student Schedule:** Spread lectures for each class throughout the week to avoid cramming subjects on one or two days. Minimize large gaps between classes for students.
      5.  **Satisfy Soft Constraints:** Try to satisfy soft constraints like faculty preferences (e.g., preferred days, max consecutive classes) and custom rules defined in the constraints object.

      **OUTPUT FORMAT:**
      Your output MUST be a valid JSON object with two keys: "timetable" and "unscheduledSessions".
      - "timetable": A JSON array of successfully scheduled timetable entry objects. Each object must have keys: "className", "subject", "faculty", "room", "day", "time", "type" ('Theory', 'Lab', or 'Tutorial'), and "classType" ('regular' or 'fixed').
      - "unscheduledSessions": A JSON array for any sessions that could not be scheduled. Each object must have "className", "subject", and a "reason" string explaining the failure (e.g., "Faculty f1 unavailable at all possible times", "No available rooms with required capacity"). If all sessions are scheduled, this array MUST be empty.
    `;
};

const timetableEntrySchemaDef = { type: Type.OBJECT, properties: { className: { type: Type.STRING }, subject: { type: Type.STRING }, faculty: { type: Type.STRING }, room: { type: Type.STRING }, day: { type: Type.STRING }, time: { type: Type.STRING }, type: { type: Type.STRING, enum: ['Theory', 'Lab', 'Tutorial'] }, classType: { type: Type.STRING, enum: ['regular', 'fixed'] } }, required: ['className', 'subject', 'faculty', 'room', 'day', 'time', 'type', 'classType'] };
const unscheduledSessionSchemaDef = { type: Type.OBJECT, properties: { className: { type: Type.STRING }, subject: { type: Type.STRING }, reason: { type: Type.STRING } }, required: ['className', 'subject', 'reason'] };
const responseSchema = {
    type: Type.OBJECT,
    properties: {
        timetable: { type: Type.ARRAY, items: timetableEntrySchemaDef },
        unscheduledSessions: { type: Type.ARRAY, items: unscheduledSessionSchemaDef }
    },
    required: ['timetable', 'unscheduledSessions']
};

app.post('/api/generate-timetable', authMiddleware, adminOnly, async (req, res) => {
    if (!process.env.API_KEY) { return res.status(500).json({ message: "API_KEY is not configured on the server." }); }
    try {
        const { classes, faculty, subjects, rooms, constraints } = req.body;
        if (!constraints || !constraints.timePreferences) { throw new Error("Time preferences are missing."); }
        const prompt = generateTimetablePrompt(classes, faculty, subjects, rooms, constraints);
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: responseSchema, temperature: 0.1 },
        });
        const parsedResponse = JSON.parse(response.text.trim());
        if (!parsedResponse || !Array.isArray(parsedResponse.timetable) || !Array.isArray(parsedResponse.unscheduledSessions)) {
             throw new Error("AI returned data in an unexpected format.");
        }
        res.status(200).json(parsedResponse);
    } catch (error) {
        console.error("Error calling Gemini API from server:", error);
        res.status(500).json({ message: `Failed to generate timetable. ${error.message || "An unexpected error occurred."}` });
    }
});

// NEW: Universal AI Import endpoint
app.post('/api/import/universal', authMiddleware, adminOnly, async (req, res) => {
    if (!process.env.API_KEY) {
        return res.status(500).json({ message: "AI features are not configured on the server." });
    }
    
    const { fileData, mimeType } = req.body;
    if (!fileData || !mimeType) {
        return res.status(400).json({ message: 'File data and MIME type are required.' });
    }

    try {
        const base64Data = fileData.split(',')[1];
        if (!base64Data) {
            return res.status(400).json({ message: 'Invalid file data format.' });
        }

        const filePart = { inlineData: { data: base64Data, mimeType } };
        
        const prompt = `
            Analyze the provided document. The document can be a CSV, Excel, or PDF file containing information about a university's resources.
            Your task is to identify and extract data for the following entities: classes, faculty, subjects, and rooms.
            
            - For **classes**, look for names (e.g., 'CSE-3-A'), branch, year, section, and student count.
            - For **faculty**, look for names, employee IDs, email, department, specializations, and max workload.
            - For **subjects**, look for names, codes (e.g., 'CS301'), department, semester, credits, type ('Theory' or 'Lab'), and hours per week.
            - For **rooms**, look for room numbers (e.g., 'CS-101'), building, type ('Classroom' or 'Laboratory'), and capacity.
            - Pay close attention to headers and data structure to correctly map the information.
            
            Return the extracted data as a single JSON object with four keys: "classes", "faculty", "subjects", and "rooms". Each key should hold an array of objects corresponding to the entities found. If no data for an entity type is found, return an empty array for that key.
        `;

        // Define schemas for Gemini's structured response
        const classSchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, branch: { type: Type.STRING }, year: { type: Type.INTEGER }, section: { type: Type.STRING }, studentCount: { type: Type.INTEGER }, block: { type: Type.STRING, nullable: true } }, required: ['name', 'branch', 'year', 'section', 'studentCount'] };
        const facultySchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, employeeId: { type: Type.STRING }, email: { type: Type.STRING }, department: { type: Type.STRING }, specialization: { type: Type.ARRAY, items: { type: Type.STRING } }, maxWorkload: { type: Type.INTEGER }, designation: { type: Type.STRING, nullable: true }, contactNumber: { type: Type.STRING, nullable: true } }, required: ['name', 'employeeId', 'email', 'department'] };
        const subjectSchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, code: { type: Type.STRING }, department: { type: Type.STRING }, semester: { type: Type.INTEGER }, credits: { type: Type.INTEGER }, type: { type: Type.STRING }, hoursPerWeek: { type: Type.INTEGER } }, required: ['name', 'code', 'department', 'semester', 'type', 'hoursPerWeek'] };
        const roomSchema = { type: Type.OBJECT, properties: { number: { type: Type.STRING }, building: { type: Type.STRING }, type: { type: Type.STRING }, capacity: { type: Type.INTEGER }, block: { type: Type.STRING, nullable: true } }, required: ['number', 'type', 'capacity'] };

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                classes: { type: Type.ARRAY, items: classSchema },
                faculty: { type: Type.ARRAY, items: facultySchema },
                subjects: { type: Type.ARRAY, items: subjectSchema },
                rooms: { type: Type.ARRAY, items: roomSchema }
            }
        };

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: { parts: [filePart, { text: prompt }] },
            config: { responseMimeType: "application/json", responseSchema: responseSchema }
        });
        
        const parsedData = JSON.parse(response.text);

        const upsertData = async (Model, data, uniqueKey) => {
            if (!data || data.length === 0) return;
            const operations = data.map(item => {
                if (!item.id) item.id = new mongoose.Types.ObjectId().toString();
                return {
                    updateOne: {
                        filter: { [uniqueKey]: item[uniqueKey] },
                        update: { $set: item },
                        upsert: true
                    }
                };
            });
            if (operations.length > 0) {
                await Model.bulkWrite(operations);
            }
        };
        
        await Promise.all([
            upsertData(Class, parsedData.classes, 'name'),
            upsertData(Faculty, parsedData.faculty, 'employeeId'),
            upsertData(Subject, parsedData.subjects, 'code'),
            upsertData(Room, parsedData.rooms, 'number')
        ]);

        res.status(200).json({ message: 'Import successful.' });

    } catch (error) {
        handleApiError(res, error, 'universal import');
    }
});

// NEW: Endpoint for suggesting workload re-assignments
const generateReassignmentPrompt = (classes, faculty, subjects) => {
    const simplifiedFaculty = faculty.map(f => ({ id: f.id, name: f.name, department: f.department, maxWorkload: f.maxWorkload, specialization: f.specialization }));
    const simplifiedSubjects = subjects.map(s => ({ id: s.id, name: s.name, department: s.department, hoursPerWeek: s.hoursPerWeek, assignedFacultyId: s.assignedFacultyId, semester: s.semester }));
    const simplifiedClasses = classes.map(c => ({ id: c.id, name: c.name, branch: c.branch, year: c.year }));

    return `
    You are an expert academic advisor tasked with balancing teaching workloads.
    Your task is to analyze the provided data and provide two sets of recommendations in a single JSON object:
    1.  'suggestions': Concrete re-assignments for subjects from over-allocated faculty to under-utilized ones.
    2.  'unresolvableWorkloads': A report on faculty whose workloads cannot be balanced with the current staff, along with a recommendation to hire new staff.

    **Step 1: Calculate Workload**
    Calculate the current workload for each faculty member. A faculty member's workload is the sum of 'hoursPerWeek' for each subject they are assigned, multiplied by the number of classes they teach that subject to. A subject is taught to all classes whose 'branch' matches the subject's 'department' and whose 'year' corresponds to the subject's semester group (Semesters 1-2 for Year 1, 3-4 for Year 2, etc.).

    **Step 2: Identify Over-allocated Faculty**
    Identify all faculty members whose calculated workload exceeds their 'maxWorkload'.

    **Step 3: Generate Re-assignment Suggestions**
    For each over-allocated faculty member, try to re-assign their subjects to other qualified and under-utilized faculty members.
    - A **qualified** faculty member is one who belongs to the same department as the subject. Give strong preference to faculty whose 'specialization' list includes topics related to the subject name.
    - An **under-utilized** faculty member is one whose current workload is significantly below their 'maxWorkload'.
    - A re-assignment is only valid if it does not make the receiving faculty member over-allocated.
    - Create a suggestion object for each valid re-assignment you find. Populate the 'suggestions' array with these objects.

    **Step 4: Identify Unresolvable Workloads**
    After attempting re-assignments, if an over-allocated faculty member still has subjects that could not be re-assigned (because no other qualified and under-utilized faculty are available), identify them.
    - For each such case, create an object explaining the situation.
    - The 'reason' should state why re-assignment is not possible (e.g., "All other CSE faculty are at full capacity," or "No other faculty with 'AI' specialization is available.").
    - The 'recommendation' should suggest a course of action, such as hiring a new faculty member with specific qualifications.
    - Populate the 'unresolvableWorkloads' array with these objects.

    **INPUT DATA:**
    - Classes: ${JSON.stringify(simplifiedClasses)}
    - Faculty: ${JSON.stringify(simplifiedFaculty)}
    - Subjects: ${JSON.stringify(simplifiedSubjects)}

    **OUTPUT FORMAT:**
    Your output MUST be a single valid JSON object with two keys: "suggestions" and "unresolvableWorkloads".
    - "suggestions": A JSON array of suggestion objects. Each object must have the keys: "subjectId", "subjectName", "fromFacultyId", "fromFacultyName", "toFacultyId", "toFacultyName".
    - "unresolvableWorkloads": A JSON array of report objects. Each object must have keys: "facultyName", "department", "reason", "recommendation".
    If no re-assignments are necessary and no workloads are unresolvable, both arrays MUST be empty.
    `;
};

const reassignmentResponseSchema = {
    type: Type.OBJECT,
    properties: {
        suggestions: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    subjectId: { type: Type.STRING },
                    subjectName: { type: Type.STRING },
                    fromFacultyId: { type: Type.STRING },
                    fromFacultyName: { type: Type.STRING },
                    toFacultyId: { type: Type.STRING },
                    toFacultyName: { type: Type.STRING }
                },
                required: ['subjectId', 'subjectName', 'fromFacultyId', 'fromFacultyName', 'toFacultyId', 'toFacultyName']
            }
        },
        unresolvableWorkloads: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    facultyName: { type: Type.STRING },
                    department: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    recommendation: { type: Type.STRING }
                },
                required: ['facultyName', 'department', 'reason', 'recommendation']
            }
        }
    },
    required: ['suggestions', 'unresolvableWorkloads']
};

app.post('/api/suggest-reassignment', authMiddleware, adminOnly, async (req, res) => {
    if (!process.env.API_KEY) { return res.status(500).json({ message: "AI features are not configured on the server." }); }
    try {
        const { classes, faculty, subjects } = req.body;
        const prompt = generateReassignmentPrompt(classes, faculty, subjects);

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: reassignmentResponseSchema, temperature: 0.2 },
        });

        const suggestions = JSON.parse(response.text.trim());
        res.status(200).json(suggestions);
    } catch (error) {
        handleApiError(res, error, 'workload re-assignment suggestion');
    }
});



app.get('/api/tools', authMiddleware, (req, res) => {
    const { role } = req.user;

    const studentTools = [
        { id: 'st1', title: 'Download Syllabus', description: 'Get the latest syllabus for all your subjects.', icon: 'Syllabus', link: '/tools/syllabus' },
        { id: 'st2', title: 'GPA Calculator', description: 'Calculate your current and projected GPA.', icon: 'Calculator', link: '/tools/gpa' },
        { id: 'st3', title: 'View Timetable', description: 'Access your full weekly class schedule.', icon: '/schedule' },
        { id: 'st4', title: 'Submit Assignment', description: 'Upload and submit your completed assignments.', icon: 'Submit', link: '/assignments/submit' },
    ];

    const teacherTools = [
        { id: 'tt1', title: 'Grade Calculator', description: 'A tool to calculate final grades for your courses.', icon: 'Gradebook', link: '/tools/grade-calculator' },
        { id: 'tt2', title: 'Plagiarism Checker', description: 'Upload a document for a plagiarism check.', icon: 'Plagiarism', link: '/tools/plagiarism' },
        { id: 'tt3', title: 'Upload Assignment', description: 'Create and upload new assignments for students.', icon: 'Upload', link: '/assignments/new' },
        { id: 'tt4', title: 'Manage Attendance', description: 'View and manage attendance for your classes.', icon: 'Timetable', link: '/attendance' },
    ];

    if (role === 'student') {
        return res.json(studentTools);
    }
    if (role === 'teacher') {
        return res.json(teacherTools);
    }
    return res.status(403).json({ message: 'No tools available for this role.' });
});

// NEW endpoints for new modules (mocked for now)
app.post('/api/meetings', authMiddleware, adminOnly, async (req, res) => {
    const newMeeting = { ...req.body, id: `meet-${Date.now()}`};
    // In a real app, you'd save this to the DB
    console.log("New meeting created (mock):", newMeeting);
    res.status(201).json(newMeeting);
});
app.post('/api/calendar-events', authMiddleware, adminOnly, async (req, res) => {
    const newEvent = { ...req.body, id: `cal-event-${Date.now()}`};
    console.log("New calendar event created (mock):", newEvent);
    res.status(201).json(newEvent);
});
app.post('/api/notifications', authMiddleware, adminOnly, async (req, res) => {
    const newNotification = { ...req.body, id: `app-notif-${Date.now()}`};
    console.log("New notification created (mock):", newNotification);
    res.status(201).json(newNotification);
});


app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));