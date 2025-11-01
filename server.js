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
const facultySchema = new mongoose.Schema({ id: {type: String, unique: true}, name: {type: String, required: true}, department: String, specialization: [String], email: { type: String, required: true, unique: true }, adminId: { type: String, unique: true, sparse: true }, contactNumber: String, accessLevel: String, availability: mongoose.Schema.Types.Mixed });
const subjectSchema = new mongoose.Schema({ id: {type: String, unique: true}, name: {type: String, required: true}, code: {type: String, required: true, unique: true}, department: String, type: String, hoursPerWeek: Number, assignedFacultyId: String });
const roomSchema = new mongoose.Schema({ id: {type: String, unique: true}, number: {type: String, required: true, unique: true}, type: String, capacity: Number, block: String });
const studentSchema = new mongoose.Schema({ id: {type: String, unique: true}, name: {type: String, required: true}, email: {type: String, unique: true, sparse: true}, classId: String, roll: String, contactNumber: String });
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['admin', 'teacher', 'student'] },
    profileId: { type: String, required: true, unique: true },
});
userSchema.index({ username: 1, role: 1 }, { unique: true });

const timetableEntrySchema = new mongoose.Schema({ className: String, subject: String, faculty: String, room: String, day: String, time: String, type: String });

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
    fixedClasses: { type: [fixedClassSchema], default: [] }, // Added fixed classes
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
    requestType: String,
    subject: String,
    currentSchedule: String,
    requestedChange: String,
    reason: String,
    status: { type: String, default: 'Pending' },
    submittedDate: { type: String, default: () => new Date().toISOString() },
});

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
const Institution = mongoose.model('Institution', institutionSchema); // New Model
const TeacherRequest = mongoose.model('TeacherRequest', teacherRequestSchema);
const StudentAttendance = mongoose.model('StudentAttendance', studentAttendanceSchema);
const Exam = mongoose.model('Exam', examSchema);
const Notification = mongoose.model('Notification', notificationSchema);

const collections = { class: Class, faculty: Faculty, subject: Subject, room: Room, student: Student, user: User, timetable: TimetableEntry, constraints: Constraints, attendance: Attendance, chat: ChatMessage, institution: Institution, teacherRequest: TeacherRequest };

const MOCK_CLASSES = [ { id: 'c1', name: 'CSE-3-A', branch: 'CSE', year: 3, section: 'A', studentCount: 60, block: 'A-Block' }, { id: 'c2', name: 'CSE-3-B', branch: 'CSE', year: 3, section: 'B', studentCount: 60, block: 'B-Block' } ];
const MOCK_FACULTY = [ { id: 'f1', name: 'Dr. Rajesh Kumar', department: 'CSE', specialization: ['Data Structures', 'Algorithms'], email: 'teacher@university.edu', contactNumber: '9876543210' }, { id: 'f2', name: 'Prof. Sunita Sharma', department: 'CSE', specialization: ['Database Systems', 'Operating Systems'], email: 'prof.sunita@university.edu', contactNumber: '9876543211' } ];
const MOCK_SUBJECTS = [ { id: 's1', name: 'Data Structures', code: 'CS301', department: 'CSE', type: 'theory', hoursPerWeek: 4, assignedFacultyId: 'f1' }, { id: 's2', name: 'Algorithms', code: 'CS302', department: 'CSE', type: 'theory', hoursPerWeek: 3, assignedFacultyId: 'f1' }, { id: 's3', name: 'Database Systems', code: 'CS303', department: 'CSE', type: 'theory', hoursPerWeek: 3, assignedFacultyId: 'f2' }, { id: 's4', name: 'Data Structures Lab', code: 'CS301L', department: 'CSE', type: 'lab', hoursPerWeek: 2, assignedFacultyId: 'f1' }, { id: 's5', name: 'Database Systems Lab', code: 'CS303L', department: 'CSE', type: 'lab', hoursPerWeek: 2, assignedFacultyId: 'f2' } ];
const MOCK_ROOMS = [ { id: 'r1', number: 'CS-101', type: 'classroom', capacity: 65, block: 'A-Block' }, { id: 'r2', number: 'CS-102', type: 'classroom', capacity: 65, block: 'B-Block' }, { id: 'r3', number: 'CS-Lab-1', type: 'lab', capacity: 60, block: 'A-Block' } ];
const MOCK_STUDENTS = [ { id: 'st1', name: 'Alice Sharma', classId: 'c1', roll: '01', email: 'student@university.edu', contactNumber: '8765432109' }, { id: 'st2', name: 'Bob Singh', classId: 'c1', roll: '02', email: 'bob.singh@university.edu', contactNumber: '8765432108' }, { id: 'st3', name: 'Charlie Brown', classId: 'c2', roll: '01', contactNumber: '8765432107' }, { id: 'st4', name: 'Diana Prince', classId: 'c2', roll: '02', email: 'diana.p@university.edu', contactNumber: '8765432106' } ];
const MOCK_USERS = [ { username: 'admin@university.edu', password: 'admin123', role: 'admin', profileId: 'admin01' }, { username: 'teacher@university.edu', password: 'teacher123', role: 'teacher', profileId: 'f1' }, { username: 'student@university.edu', password: 'student123', role: 'student', profileId: 'st1' } ];
const MOCK_INSTITUTIONS = [
    {
        id: 'inst1',
        name: 'Central University of Technology',
        academicYear: '2024-2025',
        semester: 'Odd',
        session: 'Regular',
        blocks: ['A-Block', 'B-Block', 'Science Wing']
    },
    {
        id: 'inst2',
        name: 'City College of Engineering',
        academicYear: '2024-28',
        semester: 'Odd',
        session: 'Regular',
        blocks: ['Main Building', 'Tech Park']
    }
];
const MOCK_CONSTRAINTS = {
    maxConsecutiveClasses: 3,
    timePreferences: {
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        startTime: '09:30',
        endTime: '16:35',
        lunchStartTime: '12:50',
        lunchDurationMinutes: 45,
        slotDurationMinutes: 50,
    },
    chatWindow: { start: '09:00', end: '17:00' },
    isChatboxEnabled: true,
    classSpecific: [],
    fixedClasses: [],
    maxConcurrentClassesPerDept: { 'CSE': 4 },
};

// --- NEW MOCK DATA FOR STUDENT DASHBOARD ---
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
        let studentDataPromises = [Promise.resolve([]), Promise.resolve([]), Promise.resolve([])];
        if (req.user.role === 'student') {
            const student = await Student.findOne({ id: req.user.profileId }).lean();
            const studentClassId = student ? student.classId : null;
            studentDataPromises = [
                StudentAttendance.find({ studentId: req.user.profileId }).lean(),
                studentClassId ? Exam.find({ classId: studentClassId }).lean() : Promise.resolve([]),
                Notification.find({ studentId: req.user.profileId }).lean(),
            ];
        }

        const [
            classes, faculty, subjects, rooms, students, constraints, timetable, 
            attendance, users, chatMessages, institutions, teacherRequests,
            studentAttendance, exams, notifications
        ] = await Promise.all([
            Class.find().lean(), Faculty.find().lean(), Subject.find().lean(), Room.find().lean(), Student.find().lean(),
            Constraints.findOne({ identifier: 'global_constraints' }).lean(),
            TimetableEntry.find().lean(),
            Attendance.find().lean(),
            req.user.role === 'admin' ? User.find({ role: { $ne: 'admin' } }).lean() : Promise.resolve([]),
            findChatMessages(),
            Institution.find().lean(),
            req.user.role === 'teacher' ? TeacherRequest.find({ facultyId: req.user.profileId }).lean() : (req.user.role === 'admin' ? TeacherRequest.find().lean() : Promise.resolve([])),
            ...studentDataPromises
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
            studentAttendance, exams, notifications 
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

// FIX: Overhauled Campus AI endpoint to be a simple, keyword-based mock
app.post('/api/chat/ask', authMiddleware, async (req, res) => {
    const { messageText, classId, messageId } = req.body;
    const { user } = req;
    
    try {
        // Save the user's message to the database
        const userMessage = new ChatMessage({
            id: messageId, text: messageText, classId: classId, author: user.username, role: user.role, channel: 'query', timestamp: Date.now(),
        });
        await userMessage.save();

        let aiResponseText = "I'm sorry, I'm not sure how to help with that. Can you try asking about your schedule, subjects, attendance, or exams?";
        const lowerCaseMessage = messageText.toLowerCase();

        if (lowerCaseMessage.includes('hello') || lowerCaseMessage.includes('hi')) {
            aiResponseText = `Hello ${user.username}! How can I assist you today? You can ask me about your classes, exams, and more.`;
        } else if (lowerCaseMessage.includes('attendance')) {
            aiResponseText = "You can view your detailed attendance records in the 'Attendance' section of your dashboard.";
        } else if (lowerCaseMessage.includes('exam') || lowerCaseMessage.includes('test')) {
            aiResponseText = "Your exam schedule is available under the 'Exams' tab. Good luck with your preparation!";
        } else if (lowerCaseMessage.includes('subject')) {
            aiResponseText = "A list of your current subjects, along with faculty details, can be found in the 'Subjects' section.";
        } else if (lowerCaseMessage.includes('timetable') || lowerCaseMessage.includes('schedule') || lowerCaseMessage.includes('class')) {
            aiResponseText = "Your full weekly timetable is on the 'My Schedule' tab. For today's classes, check the 'Upcoming Classes' section!";
        } else if (lowerCaseMessage.includes('notification')) {
            aiResponseText = "You can find all recent announcements and alerts under the 'Notifications' tab.";
        } else if (lowerCaseMessage.includes('ims') || lowerCaseMessage.includes('tool')) {
            aiResponseText = "Helpful tools like the syllabus downloader and GPA calculator are available in the 'IMS & Smart Tools' section.";
        }

        const aiMessage = new ChatMessage({
            id: `ai-msg-${Date.now()}`, text: aiResponseText, classId: classId, author: 'Campus AI', role: 'admin', channel: 'query', timestamp: Date.now(), groundingChunks: []
        });
        await aiMessage.save();
        res.status(201).json(aiMessage);

    } catch (error) {
        handleApiError(res, error, 'Mock AI chat processing');
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
        
        const generateChatPrompt = (userProfile, userClass, timetable, subjects, faculty, history) => `You are a helpful AI Campus Assistant. Context: User: ${userProfile.name}, Class: ${userClass ? userClass.name : 'N/A'}. Timetable: ${JSON.stringify(timetable)}. Subjects: ${JSON.stringify(subjects)}. New Question:`;
        const prompt = generateChatPrompt(student, studentClass, timetable, subjects, faculty, []);
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
           model: "gemini-2.5-flash",
           contents: `${prompt}${messageText}`,
           config: { tools: [{googleSearch: {}}] }
        });

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
    } catch (error) { handleApiError(res, error, 'Privileged chat send'); }
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
    const { timePreferences } = constraints;
    const timeSlots = Array.from({ length: 8 }, (_, i) => `${9 + i}:30-${10 + i}:20`);
    return `Generate a JSON timetable for these inputs. Data: Classes: ${JSON.stringify(classes)}, Faculty: ${JSON.stringify(faculty)}, Subjects: ${JSON.stringify(subjects)}, Rooms: ${JSON.stringify(rooms)}. Constraints: ${JSON.stringify(constraints)}. Use time slots: ${JSON.stringify(timeSlots)}.`;
};
const responseSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { className: { type: Type.STRING }, subject: { type: Type.STRING }, faculty: { type: Type.STRING }, room: { type: Type.STRING }, day: { type: Type.STRING }, time: { type: Type.STRING }, type: { type: Type.STRING, enum: ['theory', 'lab'] } }, required: ['className', 'subject', 'faculty', 'room', 'day', 'time', 'type'] } };
app.post('/api/generate-timetable', authMiddleware, adminOnly, async (req, res) => {
    if (!process.env.API_KEY) { return res.status(500).json({ message: "API_KEY is not configured on the server." }); }
    try {
        const { classes, faculty, subjects, rooms, constraints } = req.body;
        if (!constraints || !constraints.timePreferences) { throw new Error("Time preferences are missing."); }
        const prompt = generateTimetablePrompt(classes, faculty, subjects, rooms, constraints);
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json", responseSchema: responseSchema, temperature: 0.2 }, });
        const parsedResponse = JSON.parse(response.text.trim());
        if (!Array.isArray(parsedResponse)) { throw new Error("AI returned non-array data."); }
        res.status(200).json(parsedResponse);
    } catch (error) {
        console.error("Error calling Gemini API from server:", error);
        res.status(500).json({ message: `Failed to generate timetable. ${error.message || "An unexpected error occurred."}` });
    }
});

app.get('/api/tools', authMiddleware, (req, res) => {
    const { role } = req.user;

    const studentTools = [
        { id: 'st1', title: 'Download Syllabus', description: 'Get the latest syllabus for all your subjects.', icon: 'Syllabus', link: '/tools/syllabus' },
        { id: 'st2', title: 'GPA Calculator', description: 'Calculate your current and projected GPA.', icon: 'Calculator', link: '/tools/gpa' },
        { id: 'st3', title: 'View Timetable', description: 'Access your full weekly class schedule.', icon: 'Timetable', link: '/schedule' },
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

app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));