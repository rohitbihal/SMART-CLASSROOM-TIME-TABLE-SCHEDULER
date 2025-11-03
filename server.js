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
const subjectSchema = new mongoose.Schema({ id: {type: String, unique: true}, name: {type: String, required: true}, code: {type: String, required: true, unique: true}, department: String, semester: Number, credits: Number, type: String, hoursPerWeek: Number, assignedFacultyId: String, forClass: String });
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

const fixedClassSchema = new mongoose.Schema({
    id: { type: String, required: true },
    classId: { type: String, required: true },
    subjectId: { type: String, required: true },
    day: { type: String, required: true },
    time: { type: String, required: true },
    roomId: String
}, { _id: false });

const customConstraintSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: String, description: String, appliedTo: String,
    priority: String, isActive: Boolean,
}, { _id: false });

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
    maxConcurrentClassesPerDept: mongoose.Schema.Types.Mixed,
    roomResourceConstraints: { type: mongoose.Schema.Types.Mixed, default: {} },
    studentSectionConstraints: { type: mongoose.Schema.Types.Mixed, default: {} },
    advancedConstraints: { type: mongoose.Schema.Types.Mixed, default: {} },
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
    adminResponse: String,
});

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

const syllabusProgressSchema = new mongoose.Schema({ id: { type: String, unique: true }, subjectId: String, facultyId: String, lectureNumber: Number, assignedTopic: String, taughtTopic: String, date: String, status: String, variance: Boolean }, { timestamps: true });
const calendarEventSchema = new mongoose.Schema({ id: { type: String, unique: true }, eventType: String, title: String, start: String, end: String, description: String, allDay: Boolean, color: String }, { timestamps: true });
const meetingSchema = new mongoose.Schema({ id: { type: String, unique: true }, title: String, description: String, meetingType: String, platform: String, meetingLink: String, room: String, start: String, end: String, organizerId: String, participants: [mongoose.Schema.Types.Mixed], attendance: [mongoose.Schema.Types.Mixed] }, { timestamps: true });

const appNotificationSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    title: String,
    message: String,
    recipients: {
        type: { 
            type: String,
            enum: ['Students', 'Teachers', 'Both', 'Specific']
        },
        ids: [String]
    },
    deliveryMethod: [String],
    notificationType: String,
    sentDate: String,
    status: String,
    scheduledFor: String
}, { timestamps: true });

const examSchema = new mongoose.Schema({ id: {type: String, unique: true}, subjectName: String, subjectCode: String, date: String, time: String, room: String });
const studentDashboardNotificationSchema = new mongoose.Schema({ id: {type: String, unique: true}, title: String, message: String, timestamp: String, read: Boolean });

// --- Mongoose Models ---
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
const SyllabusProgress = mongoose.model('SyllabusProgress', syllabusProgressSchema);
const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);
const Meeting = mongoose.model('Meeting', meetingSchema);
const AppNotification = mongoose.model('AppNotification', appNotificationSchema);
const Exam = mongoose.model('Exam', examSchema);
const StudentDashboardNotification = mongoose.model('StudentDashboardNotification', studentDashboardNotificationSchema);


// --- Middleware ---
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication token required' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// --- API Routes ---

// Auth
app.post('/api/auth/login', [
    body('username').trim().notEmpty().withMessage('Username is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
    body('role').isIn(['admin', 'teacher', 'student']).withMessage('Invalid role.'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { username, password, role } = req.body;
        const user = await User.findOne({ username, role });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials or role' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const payload = { userId: user.id, username: user.username, role: user.role, profileId: user.profileId };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

        res.json({ token, user: { username: user.username, role: user.role, _id: user._id, profileId: user.profileId } });
    } catch (error) {
        res.status(500).json({ message: 'Server error during login' });
    }
});


// Generic CRUD factory
const createCrudRoutes = (model, modelName) => {
    const router = express.Router();
    router.post('/', authMiddleware, async (req, res) => {
        try {
            const newItem = new model({ ...req.body, id: new mongoose.Types.ObjectId().toString() });
            await newItem.save();
            res.status(201).json(newItem);
        } catch (error) { res.status(400).json({ message: `Error creating ${modelName}`, error: error.message }); }
    });
    router.get('/', authMiddleware, async (req, res) => {
        try {
            const items = await model.find();
            res.json(items);
        } catch (error) { res.status(500).json({ message: `Error fetching ${modelName}s`, error: error.message }); }
    });
    router.put('/:id', authMiddleware, async (req, res) => {
        try {
            const updatedItem = await model.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
            if (!updatedItem) return res.status(404).json({ message: `${modelName} not found` });
            res.json(updatedItem);
        } catch (error) { res.status(400).json({ message: `Error updating ${modelName}`, error: error.message }); }
    });
    router.delete('/:id', authMiddleware, async (req, res) => {
        try {
            const deletedItem = await model.findOneAndDelete({ id: req.params.id });
            if (!deletedItem) return res.status(404).json({ message: `${modelName} not found` });
            res.status(204).send();
        } catch (error) { res.status(500).json({ message: `Error deleting ${modelName}`, error: error.message }); }
    });
    return router;
};

app.use('/api/class', createCrudRoutes(Class, 'class'));
app.use('/api/faculty', createCrudRoutes(Faculty, 'faculty'));
app.use('/api/subject', createCrudRoutes(Subject, 'subject'));
app.use('/api/room', createCrudRoutes(Room, 'room'));
app.use('/api/student', createCrudRoutes(Student, 'student'));
app.use('/api/institution', createCrudRoutes(Institution, 'institution'));
app.use('/api/meetings', createCrudRoutes(Meeting, 'meeting'));
app.use('/api/app-notifications', createCrudRoutes(AppNotification, 'app notification'));
app.use('/api/calendar-events', createCrudRoutes(CalendarEvent, 'calendar event'));
app.use('/api/syllabus-progress', createCrudRoutes(SyllabusProgress, 'syllabus progress'));


// Teacher Availability Route
app.put('/api/teacher/availability', authMiddleware, async (req, res) => {
    // Only teachers can update their own availability, or an admin can update any.
    if (req.user.role !== 'admin' && req.user.profileId !== req.body.facultyId) {
        return res.status(403).json({ message: 'Forbidden: You can only update your own availability.' });
    }

    try {
        const { facultyId, availability } = req.body;
        if (!facultyId || availability === undefined) {
            return res.status(400).json({ message: 'Faculty ID and availability data are required.' });
        }
        
        const updatedFaculty = await Faculty.findOneAndUpdate(
            { id: facultyId }, 
            { availability: availability }, 
            { new: true }
        );

        if (!updatedFaculty) {
            return res.status(404).json({ message: 'Faculty not found.' });
        }

        res.json(updatedFaculty);

    } catch (error) {
        console.error("Error updating faculty availability:", error);
        res.status(500).json({ message: 'Server error while updating availability.', error: error.message });
    }
});

// ... other routes from server.js
// Smart Tools Route
const MOCK_SMART_TOOLS = [
    { id: 'tool-1', title: 'Download Syllabus', description: 'Access and download the official syllabus for all your subjects.', icon: 'Syllabus', link: '#' },
    { id: 'tool-2', title: 'GPA Calculator', description: 'Calculate your current and projected Grade Point Average.', icon: 'Calculator', link: '#' },
    { id: 'tool-3', title: 'My Gradebook', description: 'View your grades, marks, and academic performance.', icon: 'Gradebook', link: '#' },
    { id: 'tool-4', title: 'Plagiarism Checker', description: 'Check your assignments for plagiarism before submission.', icon: 'Plagiarism', link: '#' },
    { id: 'tool-5', title: 'Submit Assignment', description: 'Upload and submit your course assignments directly.', icon: 'Submit', link: '#' },
    { id: 'tool-6', title: 'View Timetable', description: 'Access your personal weekly class schedule.', icon: 'Timetable', link: '#' }
];

app.get('/api/tools', authMiddleware, (req, res) => {
    res.json(MOCK_SMART_TOOLS);
});

// NEW: Endpoint for submitting teacher requests
app.post('/api/teacher/requests', authMiddleware, async (req, res) => {
    if (req.user.role !== 'teacher') {
        return res.status(403).json({ message: 'Only teachers can submit requests.' });
    }
    try {
        const newRequest = new TeacherRequest({
            ...req.body,
            id: new mongoose.Types.ObjectId().toString(),
            facultyId: req.user.profileId,
        });
        await newRequest.save();
        res.status(201).json(newRequest);
    } catch (error) {
        res.status(400).json({ message: 'Error submitting request', error: error.message });
    }
});

app.put('/api/teacher/queries/:id', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
    }
    try {
        const { status, adminResponse } = req.body;
        const updatedQuery = await TeacherRequest.findOneAndUpdate(
            { id: req.params.id },
            { status, adminResponse },
            { new: true }
        );
        if (!updatedQuery) return res.status(404).json({ message: 'Query not found' });
        res.json(updatedQuery);
    } catch (error) {
        res.status(500).json({ message: 'Error updating teacher query', error: error.message });
    }
});


// NEW: Endpoint for submitting student queries
app.post('/api/student/queries', authMiddleware, async (req, res) => {
    if (req.user.role !== 'student') {
        return res.status(403).json({ message: 'Only students can submit queries.' });
    }
    try {
        const newQuery = new StudentQuery({
            ...req.body,
            id: new mongoose.Types.ObjectId().toString(),
            studentId: req.user.profileId,
        });
        await newQuery.save();
        res.status(201).json(newQuery);
    } catch (error) {
        res.status(400).json({ message: 'Error submitting query', error: error.message });
    }
});

app.put('/api/student/queries/:id', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
    }
    try {
        const { status, adminResponse } = req.body;
        const updatedQuery = await StudentQuery.findOneAndUpdate(
            { id: req.params.id },
            { status, adminResponse },
            { new: true }
        );
        if (!updatedQuery) return res.status(404).json({ message: 'Query not found' });
        res.json(updatedQuery);
    } catch (error) {
        res.status(500).json({ message: 'Error updating student query', error: error.message });
    }
});


// NEW: Endpoint for saving attendance
app.put('/api/attendance/class', authMiddleware, async (req, res) => {
    try {
        const { classId, date, records } = req.body;
        if (!classId || !date || !records) {
            return res.status(400).json({ message: 'Class ID, date, and records are required.' });
        }
        
        // Security check: Allow admins or teachers assigned to that class
        if (req.user.role !== 'admin') {
            const teacherId = req.user.profileId;
            const classInfo = await Class.findOne({ id: classId });
            if (!classInfo) return res.status(404).json({ message: 'Class not found.' });

            const isAssigned = await Subject.findOne({ forClass: classInfo.name, assignedFacultyId: teacherId });
            if (!isAssigned) {
                return res.status(403).json({ message: 'Forbidden: You are not assigned to teach this class.' });
            }
        }
        
        const attendanceRecords = Object.entries(records).map(([studentId, status]) => ({ studentId, status }));

        await Attendance.updateOne(
            { classId, date },
            { $set: { records: attendanceRecords } },
            { upsert: true }
        );
        res.status(200).json({ message: 'Attendance updated successfully.' });
    } catch (error) {
        console.error("Error saving attendance:", error);
        res.status(500).json({ message: 'Server error while saving attendance.', error: error.message });
    }
});


// Constraints Route
app.get('/api/constraints', authMiddleware, async (req, res) => {
    try {
        let constraints = await Constraints.findOne({ identifier: 'global_constraints' });
        if (!constraints) {
            constraints = new Constraints();
            await constraints.save();
        }
        res.json(constraints);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching constraints', error: error.message });
    }
});
app.put('/api/constraints', authMiddleware, async (req, res) => {
    try {
        const updatedConstraints = await Constraints.findOneAndUpdate({ identifier: 'global_constraints' }, req.body, { new: true, upsert: true });
        res.json(updatedConstraints);
    } catch (error) {
        res.status(400).json({ message: 'Error updating constraints', error: error.message });
    }
});

// Timetable Route
app.get('/api/timetable', authMiddleware, async (req, res) => {
    try {
        const timetable = await TimetableEntry.find();
        res.json(timetable);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching timetable', error: error.message });
    }
});

app.post('/api/timetable', authMiddleware, async (req, res) => {
    try {
        await TimetableEntry.deleteMany({});
        const newTimetable = await TimetableEntry.insertMany(req.body);
        res.status(201).json(newTimetable);
    } catch (error) {
        res.status(400).json({ message: 'Error saving timetable', error: error.message });
    }
});

// --- Chat API ---

// Helper prompt generators for AI chats
const generateStudentQAPrompt = (question, student, studentClass, timetable, subjects) => {
    return `You are a helpful and friendly university campus AI assistant. Your name is Campus AI.
    You are answering a question from a student.
    
    Student Name: ${student.name}
    Student Class: ${studentClass.name}
    Student's question: "${question}"

    Use the following information to answer the student's question. Be concise and helpful. If you don't have enough information, say "I don't have that information, you may want to ask your teacher or an administrator."

    Student's Timetable: ${JSON.stringify(timetable)}
    Subjects for the student's department: ${JSON.stringify(subjects)}

    Answer the question now.
    `;
};

const generateTeacherQAPrompt = (question, teacher, subjects) => {
    return `You are a helpful AI assistant for university teachers. Your name is Campus AI.
    Your capabilities include finding educational resources from the web, helping draft lesson plans, explaining complex topics, and providing ideas for assignments.

    Teacher Name: ${teacher.name}
    Teacher Department: ${teacher.department}
    Teacher's question: "${question}"

    For context, here are the subjects this teacher is assigned: ${JSON.stringify(subjects.map(s => s.name))}

    Use Google Search to find relevant, up-to-date information and resources if the question is about external topics. Always provide the source URLs in your response.

    Answer the question now.
    `;
};

// NEW: Endpoint for real-time chat polling
app.get('/api/chat/updates', authMiddleware, async (req, res) => {
    try {
        const since = parseInt(req.query.since, 10) || 0;
        // Fetch messages newer than the timestamp
        const newMessages = await ChatMessage.find({ timestamp: { $gt: since } }).sort({ timestamp: 1 });
        res.json(newMessages);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching chat updates', error: error.message });
    }
});

// NEW: Endpoint for real-time meeting updates
app.get('/api/updates/meetings', authMiddleware, async (req, res) => {
    try {
        const since = req.query.since ? new Date(parseInt(req.query.since, 10)) : new Date(0);
        const newMeetings = await Meeting.find({ updatedAt: { $gt: since } }).sort({ updatedAt: 1 });
        res.json(newMeetings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching meeting updates', error: error.message });
    }
});

// NEW: Endpoint for real-time notification updates
app.get('/api/updates/notifications', authMiddleware, async (req, res) => {
    try {
        const since = req.query.since ? new Date(parseInt(req.query.since, 10)) : new Date(0);
        const newNotifications = await AppNotification.find({ createdAt: { $gt: since } }).sort({ createdAt: 1 });
        res.json(newNotifications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notification updates', error: error.message });
    }
});

// NEW: Endpoint for real-time calendar event updates
app.get('/api/updates/calendar-events', authMiddleware, async (req, res) => {
    try {
        const since = req.query.since ? new Date(parseInt(req.query.since, 10)) : new Date(0);
        const newEvents = await CalendarEvent.find({ updatedAt: { $gt: since } }).sort({ updatedAt: 1 });
        res.json(newEvents);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching calendar updates', error: error.message });
    }
});


// Endpoint for human-to-human chat messages (fixes the main bug)
app.post('/api/chat/message', authMiddleware, [
    body('channel').isString().notEmpty(),
    body('text').isString().notEmpty(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { channel, text } = req.body;
        const { username, profileId, role } = req.user;
        const classIdFromChannel = channel.startsWith('class-') ? channel.split('-')[1] : '';

        const newMessage = new ChatMessage({
            id: new mongoose.Types.ObjectId().toString(),
            author: username,
            authorId: profileId,
            role,
            text,
            timestamp: Date.now(),
            channel,
            classId: classIdFromChannel,
        });

        await newMessage.save();
        res.status(201).json(newMessage);
    } catch (error) {
        console.error("Error sending chat message:", error);
        res.status(500).json({ message: "Server error while sending message." });
    }
});

// Endpoint for admin announcements
app.post('/api/chat/send', authMiddleware, [
    body('classId').isString().notEmpty(),
    body('text').isString().notEmpty(),
], async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
    }
    try {
        const { classId, text } = req.body;
        const newMessage = new ChatMessage({
            id: new mongoose.Types.ObjectId().toString(),
            author: `Admin (${req.user.username})`,
            authorId: req.user.profileId,
            role: 'admin',
            text,
            timestamp: Date.now(),
            channel: `admin-chat-${classId}`,
            classId: classId,
        });
        await newMessage.save();
        res.status(201).json(newMessage);
    } catch (error) {
        res.status(500).json({ message: "Server error while sending message." });
    }
});

// Endpoint for student asking Campus AI
app.post('/api/chat/ask', authMiddleware, [
    body('messageText').isString().notEmpty(),
    body('classId').isString().notEmpty(),
    body('messageId').isString().notEmpty(),
], async (req, res) => {
    if (!process.env.API_KEY) { return res.status(500).json({ message: 'AI features are not configured.' }); }
    try {
        const { messageText, classId, messageId } = req.body;
        const student = await Student.findOne({ id: req.user.profileId });
        const studentClass = await Class.findOne({ id: classId });
        if (!student || !studentClass) return res.status(404).json({ message: 'Student or class profile not found.' });
        
        const studentTimetable = await TimetableEntry.find({ className: studentClass.name });
        const departmentSubjects = await Subject.find({ department: studentClass.branch });
        const prompt = generateStudentQAPrompt(messageText, student, studentClass, studentTimetable, departmentSubjects);

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });

        const aiMessage = new ChatMessage({
            id: `ai-msg-${messageId}`, author: 'Campus AI', role: 'admin', text: response.text,
            timestamp: Date.now(), classId: classId, channel: 'query'
        });
        await aiMessage.save();
        res.status(201).json(aiMessage);
    } catch(error) {
        res.status(500).json({ message: "The AI assistant is currently unavailable." });
    }
});

// Endpoint for admin testing AI as a student
app.post('/api/chat/admin-ask-as-student', authMiddleware, [
    body('studentId').isString().notEmpty(), body('messageText').isString().notEmpty(),
], async (req, res) => {
    if (req.user.role !== 'admin') { return res.status(403).json({ message: 'Forbidden' }); }
    if (!process.env.API_KEY) { return res.status(500).json({ message: 'AI features are not configured.' }); }
    
    try {
        const { studentId, messageText } = req.body;
        const student = await Student.findOne({ id: studentId });
        if (!student) return res.status(404).json({ message: 'Student profile not found.' });
        const studentClass = await Class.findOne({ id: student.classId });
        if (!studentClass) return res.status(404).json({ message: 'Class for student not found.' });

        const studentTimetable = await TimetableEntry.find({ className: studentClass.name });
        const departmentSubjects = await Subject.find({ department: studentClass.branch });
        const prompt = generateStudentQAPrompt(messageText, student, studentClass, studentTimetable, departmentSubjects);

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });

        const aiResponse = {
            id: `ai-test-${Date.now()}`, author: 'Campus AI (Test)', role: 'admin', text: response.text,
            timestamp: Date.now(), classId: '', channel: 'admin-test'
        };
        res.status(200).json(aiResponse);
    } catch(error) {
        res.status(500).json({ message: "The AI assistant is currently unavailable for testing." });
    }
});

// Endpoint for teacher asking Campus AI
app.post('/api/chat/ask/teacher', authMiddleware, [
    body('messageText').isString().notEmpty(), body('messageId').isString().notEmpty(),
], async (req, res) => {
    if (req.user.role !== 'teacher') { return res.status(403).json({ message: 'Forbidden' }); }
    if (!process.env.API_KEY) { return res.status(500).json({ message: 'AI features are not configured.' }); }

    try {
        const { messageText, messageId } = req.body;
        const teacher = await Faculty.findOne({ id: req.user.profileId });
        if (!teacher) { return res.status(404).json({ message: 'Teacher profile not found.' }); }

        const assignedSubjects = await Subject.find({ assignedFacultyId: teacher.id });
        const prompt = generateTeacherQAPrompt(messageText, teacher, assignedSubjects);

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', contents: prompt, config: { tools: [{googleSearch: {}}] }
        });

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const channelId = `teacher-ai-${req.user.profileId}`;
        const aiMessage = new ChatMessage({
            id: `ai-msg-${messageId}`, author: 'Campus AI', role: 'admin', text: response.text,
            timestamp: Date.now(), classId: channelId, channel: channelId, groundingChunks
        });
        await aiMessage.save();
        res.status(201).json(aiMessage);
    } catch(error) {
        console.error("AI chat error for teacher:", error);
        res.status(500).json({ message: "The AI assistant is currently unavailable." });
    }
});


// --- Timetable Generation ---
app.post('/api/generate-timetable', authMiddleware, async (req, res) => {
    if (!process.env.API_KEY) {
        return res.status(500).json({ message: 'AI features are not configured on the server.', details: 'API_KEY is missing.' });
    }

    try {
        const { classes, faculty, subjects, rooms, constraints } = req.body;

        // --- Helper functions for time slot calculation ---
        const timeToMinutes = (time) => {
            if (!time || !time.includes(':')) return 0;
            const [hours, minutes] = time.split(':').map(Number);
            return hours * 60 + minutes;
        };
        const minutesToTime = (minutes) => {
            const h = Math.floor(minutes / 60).toString().padStart(2, '0');
            const m = (minutes % 60).toString().padStart(2, '0');
            return `${h}:${m}`;
        };
        const calculateTimeSlots = (prefs) => {
            const slots = [];
            let currentTime = timeToMinutes(prefs.startTime);
            const endTime = timeToMinutes(prefs.endTime);
            const lunchStart = timeToMinutes(prefs.lunchStartTime);
            const lunchEnd = lunchStart + prefs.lunchDurationMinutes;
            while (currentTime < endTime) {
                const slotEnd = currentTime + prefs.slotDurationMinutes;
                if ((currentTime >= lunchStart && currentTime < lunchEnd) || (slotEnd > lunchStart && slotEnd <= lunchEnd) || (currentTime < lunchStart && slotEnd > lunchEnd)) {
                     if (currentTime < lunchStart) { currentTime = lunchEnd; continue; }
                     currentTime = lunchEnd;
                     continue;
                }
                if (slotEnd > endTime) break;
                slots.push(`${minutesToTime(currentTime)}-${minutesToTime(slotEnd)}`);
                currentTime = slotEnd;
            }
            return slots;
        };
        
        const dynamicTimeSlots = calculateTimeSlots(constraints.timePreferences);

        const generateTimetablePrompt = (classes, faculty, subjects, rooms, constraints, timeSlots) => {
            return `
            You are an expert university timetable scheduler. Your task is to generate a conflict-free weekly timetable based on the provided data and constraints.
            
            Output a JSON object with two keys: "timetable" (an array of scheduled classes) and "unscheduledSessions" (an array of classes that could not be scheduled with a reason).

            DATA:
            - Classes: ${JSON.stringify(classes.map(({ id, name, studentCount, block }) => ({ id, name, studentCount, block })))}
            - Faculty: ${JSON.stringify(faculty.map(({ id, name, maxWorkload, department, specialization }) => ({ id, name, maxWorkload, department, specialization })))}
            - Subjects: ${JSON.stringify(subjects.map(({ id, name, hoursPerWeek, type, assignedFacultyId, forClass, department }) => ({ id, name, hoursPerWeek, type, assignedFacultyId, forClass, department })))}
            - Rooms: ${JSON.stringify(rooms.map(({ id, number, capacity, type, block, equipment }) => ({ id, number, capacity, type, block, equipment })))}
            - Working Days: ${JSON.stringify(constraints.timePreferences.workingDays)}
            - Time Slots: ${JSON.stringify(timeSlots)}

            CONSTRAINTS:
            1.  Hard Constraints (Must be followed):
                - A faculty member cannot teach more than one class at the same time.
                - A class cannot have more than one subject scheduled at the same time.
                - A room cannot be occupied by more than one class at the same time.
                - The number of students in a class must not exceed the capacity of the room.
                - Schedule each subject for the total number of 'hoursPerWeek'. Each slot is one hour.
                - Faculty workload ('maxWorkload' in lectures per week) must not be exceeded.
                - Subject Type vs. Room Type: 'Lab' subjects must be in 'Laboratory' rooms. 'Theory' subjects in 'Classroom' or 'Seminar Hall'. 'Tutorial' in 'Tutorial Room' or 'Classroom'.
                - A class/section cannot have more than 8 lectures scheduled on any single day.
                - For every class/section on every working day, you MUST schedule at least 4 lectures. If this is impossible, list the reason in 'unscheduledSessions'.
                - Fixed Classes (must be scheduled at this exact time): ${JSON.stringify(constraints.fixedClasses || [])}
                - Faculty Unavailability: Do not schedule a faculty member if they are marked as unavailable. ${JSON.stringify(constraints.facultyPreferences?.flatMap(p => (p.unavailability || []).map(u => ({ faculty: p.facultyId, day: u.day, time: u.timeSlot }))) || [])}
                - Equipment: If a subject requires specific equipment, it must be scheduled in a room with that equipment.
                - Custom Hard Constraints: ${JSON.stringify((constraints.customConstraints || []).filter(c => c.type === 'Hard').map(c => c.description))}

            2.  Soft Constraints (Try to follow these as much as possible):
                - Try to schedule no more than ${constraints.maxConsecutiveClasses} consecutive classes for any section without a break.
                - Try to avoid scheduling more than one lecture for the same subject on the same day for a class, but it is allowed if necessary to complete the weekly hours.
                - Faculty Preferences (Preferred days, morning/afternoon preference): ${JSON.stringify(constraints.facultyPreferences || [])}
                - Prioritize keeping consecutive classes for the same section in the same room.
                - Assign a consistent "home room" for each section's theory classes where possible.
                - Travel Time: If a faculty member has back-to-back classes in different blocks, consider it a soft conflict. Travel time between blocks is approx ${(constraints.advancedConstraints?.travelTimeMinutes || 10)} minutes.
                - Custom Soft Constraints: ${JSON.stringify((constraints.customConstraints || []).filter(c => c.type === 'Soft').map(c => c.description))}

            If a class cannot be scheduled, add it to the 'unscheduledSessions' array with a clear reason (e.g., "No available room with capacity", "Faculty workload exceeded", "Conflict with fixed class").

            Generate the timetable now.
            `;
        };

        const prompt = generateTimetablePrompt(classes, faculty, subjects, rooms, constraints, dynamicTimeSlots);
        
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const generationResultSchema = {
            type: Type.OBJECT,
            properties: {
                timetable: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            className: { type: Type.STRING },
                            subject: { type: Type.STRING },
                            faculty: { type: Type.STRING },
                            room: { type: Type.STRING },
                            day: { type: Type.STRING },
                            time: { type: Type.STRING },
                            classType: { type: Type.STRING },
                            type: { type: Type.STRING }
                        },
                        required: ['className', 'subject', 'faculty', 'room', 'day', 'time', 'classType', 'type']
                    }
                },
                unscheduledSessions: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            className: { type: Type.STRING },
                            subject: { type: Type.STRING },
                            reason: { type: Type.STRING }
                        },
                        required: ['className', 'subject', 'reason']
                    }
                }
            },
            required: ['timetable', 'unscheduledSessions']
        };
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: generationResultSchema,
            },
        });
        
        const resultText = response.text.trim();
        let result;
        try {
            result = JSON.parse(resultText);
        } catch (parseError) {
             console.error("Failed to parse JSON response from AI:", parseError);
             console.error("Raw AI response:", resultText);
             throw new Error(`The AI model returned an invalid response that could not be parsed as JSON. This can happen with complex constraints. Raw response snippet: ${resultText.substring(0, 300)}...`);
        }

        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify(result));
        res.end();

    } catch (error) {
        console.error("Error during timetable generation:", error);
        let details = error instanceof Error ? error.message : String(error);
        if (error.response?.data) {
            details += ` | Details: ${JSON.stringify(error.response.data)}`;
        }
        res.status(500).json({ 
            message: 'An error occurred while generating the timetable. This could be due to a network issue, server configuration, or a problem with the AI model.', 
            details
        });
    }
});


// --- Reassignment Suggestion ---
app.post('/api/suggest-reassignment', authMiddleware, async (req, res) => {
    if (!process.env.API_KEY) {
        return res.status(500).json({ message: 'AI features are not configured.' });
    }
    try {
        const { classes, faculty, subjects } = req.body;

        const workloadSummary = faculty.map(f => {
            const assignedSubjects = subjects.filter(s => s.assignedFacultyId === f.id);
            const assignedHours = assignedSubjects.reduce((sum, s) => sum + s.hoursPerWeek, 0);
            return {
                id: f.id,
                name: f.name,
                department: f.department,
                specialization: f.specialization,
                maxWorkload: f.maxWorkload,
                assignedHours: assignedHours,
                utilization: f.maxWorkload > 0 ? (assignedHours / f.maxWorkload) * 100 : 0
            };
        });

        const overLoadedFaculty = workloadSummary.filter(f => f.utilization > 100);
        const underLoadedFaculty = workloadSummary.filter(f => f.utilization < 80);

        if (overLoadedFaculty.length === 0) {
            return res.json({ suggestions: [], unresolvableWorkloads: [] });
        }
        
        const prompt = `
        You are an academic advisor AI specializing in workload balancing.
        Given a list of faculty workloads, subjects, and available faculty, your task is to suggest re-assignments to balance the load.

        Over-allocated Faculty: ${JSON.stringify(overLoadedFaculty)}
        Under-allocated Faculty: ${JSON.stringify(underLoadedFaculty)}
        All Subjects: ${JSON.stringify(subjects)}

        Rules for re-assignment:
        1.  A subject can only be re-assigned to a faculty member from the SAME department.
        2.  Prioritize re-assigning to faculty who have the subject's specialization.
        3.  Do not suggest re-assigning to a faculty member if it would push their workload over 100%.
        4.  Try to offload from the most over-allocated faculty first.
        5.  Suggest moving the smallest subjects (lowest hoursPerWeek) first to make balancing easier.

        If a workload cannot be resolved (e.g., no other qualified faculty in the department has capacity), identify it in the 'unresolvableWorkloads' array with a reason and a recommendation (e.g., "Hire a visiting lecturer for the 'Data Structures' course.").

        Output a JSON object with two keys:
        - "suggestions": An array of objects, each with { subjectId, subjectName, fromFacultyId, fromFacultyName, toFacultyId, toFacultyName }.
        - "unresolvableWorkloads": An array of objects, each with { facultyName, department, reason, recommendation }.
        `;
        
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });

        res.json(JSON.parse(response.text.trim()));
    } catch (error) {
        res.status(500).json({ message: 'Error getting re-assignment suggestions.' });
    }
});


// --- Universal Import ---
app.post('/api/import/universal', authMiddleware, async (req, res) => {
    if (!process.env.API_KEY) {
        return res.status(500).json({ message: 'AI features are not configured.' });
    }
    try {
        const { fileData, mimeType } = req.body;
        const base64Data = fileData.split(',')[1];
        
        const prompt = `
            You are an expert data parsing AI. Analyze the content of this file and extract structured data for Classes, Faculty, Subjects, and Rooms.
            The file content is base64 encoded.
            
            Identify the columns or structure even if headers are missing.
            - For Faculty, look for names, emails, departments, specializations.
            - For Classes, look for names like 'CSE-3-A', branch, year, section.
            - For Subjects, look for codes, names, credits, type (Theory/Lab).
            - For Rooms, look for numbers, buildings, capacity, type (Classroom/Lab).
            
            Return a single JSON object with four keys: "classes", "faculty", "subjects", "rooms". Each key should hold an array of the extracted data objects.
            If a category of data is not present in the file, return an empty array for that key.
        `;

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const filePart = { inlineData: { mimeType, data: base64Data } };
        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [filePart, textPart] },
            config: {
                responseMimeType: 'application/json'
            }
        });

        const parsedData = JSON.parse(response.text.trim());

        // Now, save the data to the database
        if (parsedData.classes) {
            for (const item of parsedData.classes) {
                await Class.updateOne({ name: item.name }, { ...item, id: new mongoose.Types.ObjectId().toString() }, { upsert: true });
            }
        }
        if (parsedData.faculty) {
            for (const item of parsedData.faculty) {
                 await Faculty.updateOne({ email: item.email }, { ...item, id: new mongoose.Types.ObjectId().toString() }, { upsert: true });
            }
        }
        // ... similar logic for subjects and rooms

        res.json({ message: 'Data imported successfully.' });

    } catch (error) {
        console.error("Universal import error:", error);
        res.status(500).json({ message: 'Failed to process the file.' });
    }
});


// --- Data Reset Route ---
app.post('/api/reset-data', authMiddleware, async (req, res) => {
    try {
        await Promise.all([
            Class.deleteMany({}), Faculty.deleteMany({}), Subject.deleteMany({}),
            Room.deleteMany({}), Student.deleteMany({}), User.deleteMany({}),
            TimetableEntry.deleteMany({}), Constraints.deleteMany({}), Attendance.deleteMany({}),
            ChatMessage.deleteMany({}), Institution.deleteMany({}), TeacherRequest.deleteMany({}),
            StudentQuery.deleteMany({}), SyllabusProgress.deleteMany({}), CalendarEvent.deleteMany({}),
            Meeting.deleteMany({}), AppNotification.deleteMany({}), Exam.deleteMany({}), StudentDashboardNotification.deleteMany({})
        ]);
        
        const newInstitutions = [
            { id: 'inst1', name: 'Global University of Technology', academicYear: '2024-2025', semester: 'Odd', session: 'Regular', blocks: ['A-Block (CSE)', 'B-Block (ECE)', 'C-Block (ME)', 'D-Block (Labs & Admin)'] }
        ];
        
        const newFaculty = [
            { id: 'f1', name: 'Dr. Rajesh Kumar', employeeId: 'T001', designation: 'Professor', department: 'CSE', specialization: ['Algorithms', 'Data Structures', 'AI'], email: 'rajesh.kumar@university.edu', contactNumber: '9876543210', maxWorkload: 10 },
            { id: 'f2', name: 'Dr. Priya Sharma', employeeId: 'T002', designation: 'Associate Professor', department: 'CSE', specialization: ['Databases', 'Operating Systems'], email: 'priya.sharma@university.edu', contactNumber: '9876543211', maxWorkload: 12 },
            { id: 'f3', name: 'Dr. Amit Singh', employeeId: 'T003', designation: 'Assistant Professor', department: 'ECE', specialization: ['VLSI', 'Signal Processing'], email: 'amit.singh@university.edu', contactNumber: '9876543212', maxWorkload: 14 },
            { id: 'f4', name: 'Dr. Sneha Reddy', employeeId: 'T004', designation: 'Professor', department: 'ME', specialization: ['Thermodynamics', 'Fluid Mechanics'], email: 'sneha.reddy@university.edu', contactNumber: '9876543213', maxWorkload: 11 },
            { id: 'f5', name: 'Mr. Vikram Verma', employeeId: 'T005', designation: 'Lecturer', department: 'CSE', specialization: ['Web Development', 'Java'], email: 'vikram.verma@university.edu', contactNumber: '9876543214', maxWorkload: 16 },
            { id: 'f6', name: 'Dr. Anjali Gupta', employeeId: 'T006', designation: 'Associate Professor', department: 'ECE', specialization: ['Communication Systems', 'Microwaves'], email: 'anjali.gupta@university.edu', contactNumber: '9876543215', maxWorkload: 10 },
            { id: 'f7', name: 'Mr. Rohan Patel', employeeId: 'T007', designation: 'Assistant Professor', department: 'ME', specialization: ['Machine Design', 'Robotics'], email: 'rohan.patel@university.edu', contactNumber: '9876543216', maxWorkload: 13 },
            { id: 'f8', name: 'Dr. Meera Desai', employeeId: 'T008', designation: 'Professor', department: 'CSE', specialization: ['AI', 'Machine Learning'], email: 'meera.desai@university.edu', contactNumber: '9876543217', maxWorkload: 9 },
            { id: 'f9', name: 'Mr. Sanjay Rao', employeeId: 'T009', designation: 'Lecturer', department: 'ECE', specialization: ['Embedded Systems', 'IoT'], email: 'sanjay.rao@university.edu', contactNumber: '9876543218', maxWorkload: 15 },
            { id: 'f10', name: 'Ms. Kavita Joshi', employeeId: 'T010', designation: 'Assistant Professor', department: 'Humanities', specialization: ['Ethics', 'Professional Communication'], email: 'kavita.joshi@university.edu', contactNumber: '9876543219', maxWorkload: 12 },
        ];
        
        const newClasses = [
            { id: 'c1', name: 'CSE-3-A', branch: 'CSE', year: 3, section: 'A', studentCount: 60, block: 'A-Block (CSE)' },
            { id: 'c2', name: 'CSE-3-B', branch: 'CSE', year: 3, section: 'B', studentCount: 60, block: 'A-Block (CSE)' },
            { id: 'c3', name: 'ECE-3-A', branch: 'ECE', year: 3, section: 'A', studentCount: 55, block: 'B-Block (ECE)' },
            { id: 'c4', name: 'ME-2-A', branch: 'ME', year: 2, section: 'A', studentCount: 50, block: 'C-Block (ME)' },
            { id: 'c5', name: 'CSE-1-A', branch: 'CSE', year: 1, section: 'A', studentCount: 65, block: 'A-Block (CSE)' },
            { id: 'c6', name: 'CSE-2-A', branch: 'CSE', year: 2, section: 'A', studentCount: 62, block: 'A-Block (CSE)' },
        ];
        
        const newSubjects = [
            // CSE 3rd Year
            { id: 's1', name: 'Data Structures', code: 'CS301', department: 'CSE', semester: 5, credits: 4, type: 'Theory', hoursPerWeek: 3, assignedFacultyId: 'f1', forClass: 'CSE-3-A' },
            { id: 's2', name: 'Algorithms', code: 'CS302', department: 'CSE', semester: 5, credits: 4, type: 'Theory', hoursPerWeek: 3, assignedFacultyId: 'f1', forClass: 'CSE-3-A' },
            { id: 's3', name: 'Data Structures Lab', code: 'CS301L', department: 'CSE', semester: 5, credits: 2, type: 'Lab', hoursPerWeek: 2, assignedFacultyId: 'f1', forClass: 'CSE-3-A' },
            { id: 's4', name: 'Database Management', code: 'CS303', department: 'CSE', semester: 5, credits: 4, type: 'Theory', hoursPerWeek: 3, assignedFacultyId: 'f2', forClass: 'CSE-3-B' },
            { id: 's5', name: 'Operating Systems', code: 'CS304', department: 'CSE', semester: 5, credits: 4, type: 'Theory', hoursPerWeek: 3, assignedFacultyId: 'f2', forClass: 'CSE-3-A' },
            { id: 's11', name: 'Web Development', code: 'CS305', department: 'CSE', semester: 5, credits: 3, type: 'Theory', hoursPerWeek: 3, assignedFacultyId: 'f5', forClass: 'CSE-3-A' },
            { id: 's12', name: 'Web Development Lab', code: 'CS305L', department: 'CSE', semester: 5, credits: 2, type: 'Lab', hoursPerWeek: 2, assignedFacultyId: 'f5', forClass: 'CSE-3-A' },
            { id: 's18', name: 'Machine Learning', code: 'CS306', department: 'CSE', semester: 5, credits: 4, type: 'Theory', hoursPerWeek: 3, assignedFacultyId: 'f8', forClass: 'CSE-3-A' },
            // ECE 3rd Year
            { id: 's6', name: 'VLSI Design', code: 'EC301', department: 'ECE', semester: 5, credits: 4, type: 'Theory', hoursPerWeek: 4, assignedFacultyId: 'f3', forClass: 'ECE-3-A' },
            { id: 's13', name: 'Communication Systems', code: 'EC302', department: 'ECE', semester: 5, credits: 4, type: 'Theory', hoursPerWeek: 4, assignedFacultyId: 'f6', forClass: 'ECE-3-A' },
            { id: 's19', name: 'Embedded Systems', code: 'EC303', department: 'ECE', semester: 5, credits: 3, type: 'Theory', hoursPerWeek: 3, assignedFacultyId: 'f9', forClass: 'ECE-3-A' },
            // ME 2nd Year
            { id: 's7', name: 'Thermodynamics', code: 'ME201', department: 'ME', semester: 3, credits: 4, type: 'Theory', hoursPerWeek: 4, assignedFacultyId: 'f4', forClass: 'ME-2-A' },
            { id: 's14', name: 'Robotics', code: 'ME202', department: 'ME', semester: 3, credits: 4, type: 'Theory', hoursPerWeek: 3, assignedFacultyId: 'f7', forClass: 'ME-2-A' },
            // CSE 1st Year
            { id: 's15', name: 'Intro to Programming', code: 'CS101', department: 'CSE', semester: 1, credits: 4, type: 'Theory', hoursPerWeek: 4, assignedFacultyId: 'f5', forClass: 'CSE-1-A' },
            // CSE 2nd Year
            { id: 's16', name: 'Digital Logic Design', code: 'CS201', department: 'CSE', semester: 3, credits: 4, type: 'Theory', hoursPerWeek: 4, assignedFacultyId: 'f2', forClass: 'CSE-2-A' },
            // Common
            { id: 's17', name: 'Professional Ethics', code: 'HU301', department: 'Humanities', semester: 5, credits: 2, type: 'Theory', hoursPerWeek: 2, assignedFacultyId: 'f10', forClass: 'CSE-3-A' },
        ];
        
        const newRooms = [
            { id: 'r1', number: 'A-101', building: 'Academic Block A', type: 'Classroom', capacity: 70, block: 'A-Block (CSE)', equipment: { projector: true, smartBoard: false, ac: true, computerSystems: { available: false, count: 0 }, audioSystem: true, whiteboard: true } },
            { id: 'r2', number: 'A-102', building: 'Academic Block A', type: 'Classroom', capacity: 70, block: 'A-Block (CSE)', equipment: { projector: true, smartBoard: true, ac: true, computerSystems: { available: false, count: 0 }, audioSystem: true, whiteboard: true } },
            { id: 'r3', number: 'D-Lab-1 (CS)', building: 'Lab Block D', type: 'Laboratory', capacity: 60, block: 'D-Block (Labs & Admin)', equipment: { projector: true, smartBoard: false, ac: true, computerSystems: { available: true, count: 60 }, audioSystem: false, whiteboard: true } },
            { id: 'r4', number: 'B-201', building: 'Academic Block B', type: 'Classroom', capacity: 70, block: 'B-Block (ECE)', equipment: { projector: true, smartBoard: false, ac: false, computerSystems: { available: false, count: 0 }, audioSystem: false, whiteboard: true } },
            { id: 'r5', number: 'C-G01', building: 'Mechanical Block', type: 'Classroom', capacity: 70, block: 'C-Block (ME)', equipment: { projector: false, smartBoard: false, ac: false, computerSystems: { available: false, count: 0 }, audioSystem: false, whiteboard: true } },
            { id: 'r6', number: 'D-Sem-Hall', building: 'Lab Block D', type: 'Seminar Hall', capacity: 150, block: 'D-Block (Labs & Admin)', equipment: { projector: true, smartBoard: true, ac: true, computerSystems: { available: false, count: 0 }, audioSystem: true, whiteboard: true } },
            { id: 'r7', number: 'D-Lab-2 (ECE)', building: 'Lab Block D', type: 'Laboratory', capacity: 55, block: 'D-Block (Labs & Admin)', equipment: { projector: true, smartBoard: false, ac: true, computerSystems: { available: true, count: 55 }, audioSystem: false, whiteboard: true } },
        ];
        
        const newStudents = [];
        let studentCounter = 1;
        newClasses.forEach(cls => {
            for (let i = 1; i <= 20; i++) { // Generate 20 students per class
                newStudents.push({
                    id: `st${studentCounter}`,
                    name: `Student ${cls.name}-${i}`,
                    email: `student${studentCounter}@university.edu`,
                    classId: cls.id,
                    roll: `${i}`
                });
                studentCounter++;
            }
        });
        
        const adminPass = await bcrypt.hash('admin123', saltRounds);
        const teacherPass = await bcrypt.hash('teacher123', saltRounds);
        const studentPass = await bcrypt.hash('student123', saltRounds);

        const newUsers = [
             // Main demo users
            { username: 'admin@university.edu', password: adminPass, role: 'admin', profileId: 'f1' }, // Dr. Rajesh
            { username: 'teacher@university.edu', password: teacherPass, role: 'teacher', profileId: 'f2' }, // Dr. Priya
            { username: 'student@university.edu', password: studentPass, role: 'student', profileId: 'st1' }, // Student CSE-3-A-1
            // Additional users for lists
            { username: 'amit.singh@university.edu', password: await bcrypt.hash('teacher456', 10), role: 'teacher', profileId: 'f3' },
            { username: 'vikram.verma@university.edu', password: await bcrypt.hash('teacher789', 10), role: 'teacher', profileId: 'f5' },
            { username: 'student21@university.edu', password: await bcrypt.hash('student456', 10), role: 'student', profileId: 'st21' }, // Student CSE-3-B-1
        ];

        const newTimetable = [
            // Monday
            { day: 'monday', time: '09:30-10:20', subject: 'Data Structures', faculty: 'Dr. Rajesh Kumar', room: 'A-101', type: 'Theory', className: 'CSE-3-A', classType: 'regular' },
            { day: 'monday', time: '09:30-10:20', subject: 'Database Management', faculty: 'Dr. Priya Sharma', room: 'A-102', type: 'Theory', className: 'CSE-3-B', classType: 'regular' },
            { day: 'monday', time: '09:30-10:20', subject: 'VLSI Design', faculty: 'Dr. Amit Singh', room: 'B-201', type: 'Theory', className: 'ECE-3-A', classType: 'regular' },
            { day: 'monday', time: '10:20-11:10', subject: 'Algorithms', faculty: 'Dr. Rajesh Kumar', room: 'A-101', type: 'Theory', className: 'CSE-3-A', classType: 'regular' },
            { day: 'monday', time: '10:20-11:10', subject: 'Operating Systems', faculty: 'Dr. Priya Sharma', room: 'A-102', type: 'Theory', className: 'CSE-3-B', classType: 'regular' },
            { day: 'monday', time: '11:10-12:00', subject: 'Web Development', faculty: 'Mr. Vikram Verma', room: 'A-101', type: 'Theory', className: 'CSE-3-A', classType: 'regular' },
            { day: 'monday', time: '11:10-12:00', subject: 'Communication Systems', faculty: 'Dr. Anjali Gupta', room: 'B-201', type: 'Theory', className: 'ECE-3-A', classType: 'regular' },
            { day: 'monday', time: '12:00-12:50', subject: 'Professional Ethics', faculty: 'Ms. Kavita Joshi', room: 'A-101', type: 'Theory', className: 'CSE-3-A', classType: 'regular' },
            { day: 'monday', time: '01:35-02:25', subject: 'Data Structures Lab', faculty: 'Dr. Rajesh Kumar', room: 'D-Lab-1 (CS)', type: 'Lab', className: 'CSE-3-A', classType: 'fixed' },
            { day: 'monday', time: '02:25-03:15', subject: 'Data Structures Lab', faculty: 'Dr. Rajesh Kumar', room: 'D-Lab-1 (CS)', type: 'Lab', className: 'CSE-3-A', classType: 'fixed' },
            { day: 'monday', time: '01:35-02:25', subject: 'Thermodynamics', faculty: 'Dr. Sneha Reddy', room: 'C-G01', type: 'Theory', className: 'ME-2-A', classType: 'regular' },
            { day: 'monday', time: '02:25-03:15', subject: 'Digital Logic Design', faculty: 'Dr. Priya Sharma', room: 'A-102', type: 'Theory', className: 'CSE-2-A', classType: 'regular' },
            
            // Tuesday
            { day: 'tuesday', time: '09:30-10:20', subject: 'Operating Systems', faculty: 'Dr. Priya Sharma', room: 'A-102', type: 'Theory', className: 'CSE-3-A', classType: 'regular' },
            { day: 'tuesday', time: '09:30-10:20', subject: 'Intro to Programming', faculty: 'Mr. Vikram Verma', room: 'A-101', type: 'Theory', className: 'CSE-1-A', classType: 'regular' },
            { day: 'tuesday', time: '10:20-11:10', subject: 'Machine Learning', faculty: 'Dr. Meera Desai', room: 'A-101', type: 'Theory', className: 'CSE-3-A', classType: 'regular' },
            { day: 'tuesday', time: '09:30-10:20', subject: 'Communication Systems', faculty: 'Dr. Anjali Gupta', room: 'B-201', type: 'Theory', className: 'ECE-3-A', classType: 'regular' },
            { day: 'tuesday', time: '11:10-12:00', subject: 'Web Development Lab', faculty: 'Mr. Vikram Verma', room: 'D-Lab-1 (CS)', type: 'Lab', className: 'CSE-3-A', classType: 'fixed' },
            { day: 'tuesday', time: '12:00-12:50', subject: 'Web Development Lab', faculty: 'Mr. Vikram Verma', room: 'D-Lab-1 (CS)', type: 'Lab', className: 'CSE-3-A', classType: 'fixed' },
            { day: 'tuesday', time: '01:35-02:25', subject: 'Robotics', faculty: 'Mr. Rohan Patel', room: 'C-G01', type: 'Theory', className: 'ME-2-A', classType: 'regular' },
            { day: 'tuesday', time: '02:25-03:15', subject: 'Embedded Systems', faculty: 'Mr. Sanjay Rao', room: 'B-201', type: 'Theory', className: 'ECE-3-A', classType: 'regular' },
        ];

        const newAttendance = [
            { classId: 'c1', date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0], records: Array.from({length: 20}, (_, i) => i + 1).map(i => ({ studentId: `st${i}`, status: i % 5 === 0 ? 'absent_locked' : 'present_locked' }))},
            { classId: 'c2', date: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0], records: Array.from({length: 20}, (_, i) => i + 21).map(i => ({ studentId: `st${i}`, status: 'present_suggested' }))},
            { classId: 'c1', date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString().split('T')[0], records: Array.from({length: 20}, (_, i) => i + 1).map(i => ({ studentId: `st${i}`, status: 'present' }))}
        ];

        const newChatMessages = [
            { id: 'chat1', author: 'Admin (Dr. Rajesh Kumar)', authorId: 'f1', role: 'admin', text: 'Welcome to the new semester! Please check the updated timetable.', timestamp: Date.now() - 200000, classId: 'c1', channel: 'admin-chat-c1' },
            { id: 'chat2', author: 'Dr. Priya Sharma', authorId: 'f2', role: 'teacher', text: 'Hello CSE-3-B, your first assignment for Database Management is now uploaded to the portal.', timestamp: Date.now() - 100000, channel: 'class-c2' },
            { id: 'chat3', author: 'Student CSE-3-B-1', authorId: 'st21', role: 'student', text: 'Thank you, Ma\'am!', timestamp: Date.now() - 90000, channel: 'class-c2' },
            { id: 'chat4', author: 'Dr. Priya Sharma', authorId: 'f2', role: 'teacher', text: 'Student CSE-3-A-1, please see me after class about your project proposal.', timestamp: Date.now() - 80000, channel: 'dm-f2-st1' },
            { id: 'chat5', author: 'Student CSE-3-A-1', authorId: 'st1', role: 'student', text: 'Okay Ma\'am, I will be there.', timestamp: Date.now() - 70000, channel: 'dm-f2-st1' },
        ];

        const newTeacherRequests = [
            { id: 'tq1', facultyId: 'f7', queryType: 'Classroom Change', requestedChange: 'Request to move ME202 Robotics class from C-G01 to a room with a projector.', reason: 'The current room C-G01 does not have a projector, which is essential for demonstrating simulations.', status: 'Pending', priority: 'Urgent', submittedDate: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString() },
            { id: 'tq2', facultyId: 'f4', queryType: 'Workload Review', requestedChange: 'My assigned workload is 13 hours, but my max workload is 11. Please review.', reason: 'Overload of classes.', status: 'Approved', adminResponse: 'Adjusted. One section of Thermodynamics has been reassigned.', submittedDate: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString(), priority: 'Normal' },
            { id: 'tq3', facultyId: 'f9', queryType: 'Leave Request', requestedChange: 'Requesting leave on Friday for a family emergency.', reason: 'Urgent family matter.', status: 'Rejected', adminResponse: 'Leave not approved due to upcoming assessments. Please arrange for a substitute.', submittedDate: new Date().toISOString(), priority: 'Urgent' },
        ];

        const newStudentQueries = [
            { id: 'sq1', studentId: 'st21', queryType: 'Academic', subject: 'VLSI Design', details: 'I am unable to access the course materials for VLSI Design.', status: 'Resolved', adminResponse: 'Access has been granted. Please check now.', submittedDate: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString() },
            { id: 'sq2', studentId: 'st1', queryType: 'Administrative', details: 'There is a fee discrepancy in my student portal.', status: 'Pending', adminResponse: '', submittedDate: new Date().toISOString() }
        ];
        
        const newCalendarEvents = [
            { id: 'ce1', eventType: 'Event', title: 'Tech Fest "Innovate 2024"', start: new Date(new Date().setDate(new Date().getDate() + 10)).toISOString(), end: new Date(new Date().setDate(new Date().getDate() + 12)).toISOString(), description: 'Annual technology festival.', allDay: true, color: '#9333ea' },
            { id: 'ce2', eventType: 'Holiday', title: 'Mid-term Break', start: new Date(new Date().setDate(new Date().getDate() + 20)).toISOString(), end: new Date(new Date().setDate(new Date().getDate() + 20)).toISOString(), allDay: true, color: '#f59e0b' },
            { id: 'ce3', eventType: 'Deadline', title: 'Project Proposal Deadline', start: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(), end: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(), allDay: true, color: '#ef4444' },
            { id: 'ce4', eventType: 'Seminar', title: 'Seminar on Quantum Computing', start: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString(), end: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString(), description: 'By Dr. Albert Hanson in D-Sem-Hall', allDay: false, color: '#0ea5e9' },
        ];
        
        const newMeetings = [
            { id: 'm1', title: 'CSE Department Monthly Review', meetingType: 'Department', platform: 'Google Meet', meetingLink: 'https://meet.google.com/xyz-abc-pqr', start: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(), end: new Date(new Date().setHours(new Date().getHours() + 1)).toISOString(), organizerId: 'f1', participants: [{ type: 'faculty', id: 'f1'}, { type: 'faculty', id: 'f2'}, { type: 'faculty', id: 'f5'}] },
            { id: 'm2', title: 'Project Mentorship: Student CSE-3-A-1', meetingType: 'One-on-One', platform: 'Offline', room: 'Faculty Cabin 10', start: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(), end: new Date(new Date().setMinutes(new Date().getMinutes() + 30)).toISOString(), organizerId: 'f2', participants: [{ type: 'faculty', id: 'f2'}, { type: 'student', id: 'st1'}] },
            { id: 'm3', title: 'Class Meeting: CSE-3-A', meetingType: 'Class Meeting', platform: 'Offline', room: 'A-101', start: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString(), end: new Date(new Date().setHours(new Date().getHours() + 1)).toISOString(), organizerId: 'f1', participants: [{ type: 'faculty', id: 'f1'}, ...Array.from({length: 20}, (_, i) => ({type: 'student', id: `st${i+1}`}))] },
        ];
        
        const newAppNotifications = [
            { id: 'an1', title: 'Campus Maintenance Alert', message: 'The water supply will be interrupted tomorrow from 10 AM to 12 PM for maintenance.', recipients: { type: 'Both' }, deliveryMethod: ['In-App'], notificationType: 'General', sentDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), status: 'Sent' },
            { id: 'an2', title: 'Special Lecture for CSE 3rd Year', message: 'A special lecture on "Quantum Computing" will be held in D-Sem-Hall on Friday at 3 PM.', recipients: { type: 'Specific', ids: ['c1', 'c2'] }, deliveryMethod: ['In-App', 'Email'], notificationType: 'Event', sentDate: new Date().toISOString(), status: 'Sent' }
        ];
        
        const newSyllabusProgress = [
            { id: 'sp1', subjectId: 's1', facultyId: 'f1', lectureNumber: 1, assignedTopic: 'Introduction to Data Structures', taughtTopic: 'Introduction to Data Structures', date: new Date().toISOString(), status: 'Completed', variance: false },
            { id: 'sp2', subjectId: 's1', facultyId: 'f1', lectureNumber: 2, assignedTopic: 'Arrays and Pointers', taughtTopic: 'Arrays', date: new Date().toISOString(), status: 'Completed', variance: true },
            { id: 'sp3', subjectId: 's1', facultyId: 'f1', lectureNumber: 3, assignedTopic: 'Linked Lists', taughtTopic: 'Linked Lists', date: new Date().toISOString(), status: 'Pending', variance: false },
            { id: 'sp4', subjectId: 's4', facultyId: 'f2', lectureNumber: 1, assignedTopic: 'Intro to Databases', taughtTopic: 'Intro to Databases', date: new Date().toISOString(), status: 'Completed', variance: false },
            { id: 'sp5', subjectId: 's4', facultyId: 'f2', lectureNumber: 2, assignedTopic: 'SQL Basics', taughtTopic: 'SQL Basics', date: new Date().toISOString(), status: 'Completed', variance: false },
            { id: 'sp6', subjectId: 's6', facultyId: 'f3', lectureNumber: 1, assignedTopic: 'Intro to CMOS', taughtTopic: 'Intro to CMOS', date: new Date().toISOString(), status: 'Completed', variance: false },
        ];

        const newExams = [
            { id: 'ex1', subjectName: 'Data Structures', subjectCode: 'CS301', date: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString(), time: '10:00 AM - 01:00 PM', room: 'A-101' },
            { id: 'ex2', subjectName: 'Algorithms', subjectCode: 'CS302', date: new Date(new Date().setDate(new Date().getDate() + 18)).toISOString(), time: '10:00 AM - 01:00 PM', room: 'A-101' },
            { id: 'ex3', subjectName: 'Operating Systems', subjectCode: 'CS304', date: new Date(new Date().setDate(new Date().getDate() + 22)).toISOString(), time: '02:00 PM - 05:00 PM', room: 'A-102' },
        ];
        const newStudentDashboardNotifications = [
            { id: 'sn1', title: 'Fee Payment Reminder', message: 'Your semester fee payment is due next week. Please pay to avoid late charges.', timestamp: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), read: false },
            { id: 'sn2', title: 'Library Book Overdue', message: 'The book "Introduction to Algorithms" is overdue. Please return it to the library.', timestamp: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString(), read: true },
        ];


        await Promise.all([
            Institution.insertMany(newInstitutions),
            Faculty.insertMany(newFaculty),
            Class.insertMany(newClasses), 
            Subject.insertMany(newSubjects), 
            Room.insertMany(newRooms),
            Student.insertMany(newStudents), 
            User.insertMany(newUsers),
            TimetableEntry.insertMany(newTimetable),
            Attendance.insertMany(newAttendance),
            ChatMessage.insertMany(newChatMessages),
            TeacherRequest.insertMany(newTeacherRequests),
            StudentQuery.insertMany(newStudentQueries),
            CalendarEvent.insertMany(newCalendarEvents),
            Meeting.insertMany(newMeetings),
            AppNotification.insertMany(newAppNotifications),
            SyllabusProgress.insertMany(newSyllabusProgress),
            Exam.insertMany(newExams),
            StudentDashboardNotification.insertMany(newStudentDashboardNotifications),
        ]);
        
        const newConstraints = new Constraints();
        await newConstraints.save();

        res.json({ message: 'Data has been reset to defaults.' });
    } catch (error) {
        console.error("Error resetting data:", error);
        res.status(500).json({ message: 'Error resetting data.', error: error.message });
    }
});

app.get('/api/all-data', authMiddleware, async (req, res) => {
    try {
        const [
            classes, faculty, subjects, rooms, students, users, constraints,
            timetable, attendanceDocs, chatMessages, institutions, teacherRequests,
            studentQueries, syllabusProgress, meetings, calendarEvents, appNotifications,
            exams, studentDashboardNotifications
        ] = await Promise.all([
            Class.find({}), Faculty.find({}), Subject.find({}), Room.find({}), Student.find({}), User.find({}),
            Constraints.findOne({ identifier: 'global_constraints' }), TimetableEntry.find({}), Attendance.find({}),
            ChatMessage.find({}).sort({ timestamp: 1 }), Institution.find({}), TeacherRequest.find({}), StudentQuery.find({}),
            SyllabusProgress.find({}), Meeting.find({}), CalendarEvent.find({}), AppNotification.find({}),
            Exam.find({}), StudentDashboardNotification.find({})
        ]);

        const attendance = attendanceDocs.reduce((acc, doc) => {
            if (!doc.classId) return acc;
            if (!acc[doc.classId]) acc[doc.classId] = {};
            if(doc.records) {
              acc[doc.classId][doc.date] = doc.records.reduce((recAcc, record) => {
                  recAcc[record.studentId] = record.status;
                  return recAcc;
              }, {});
            }
            return acc;
        }, {});

        res.json({
            classes, faculty, subjects, rooms, students, users,
            constraints: constraints || new Constraints(), // Ensure constraints is never null
            timetable, attendance, chatMessages, institutions,
            teacherRequests, studentQueries, syllabusProgress,
            meetings, calendarEvents, appNotifications,
            exams,
            notifications: studentDashboardNotifications // Renamed to match frontend `AllData` type
        });
    } catch (error) {
        console.error("Error fetching all data:", error);
        res.status(500).json({ message: 'Failed to fetch initial data.', error: error.message });
    }
});



// --- Catch-all to serve the main index.html for any other route ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- Server Startup ---
const PORT = process.env.PORT || 3001;

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB Connected');
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1);
    });