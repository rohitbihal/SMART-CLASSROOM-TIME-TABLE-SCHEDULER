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
const meetingSchema = new mongoose.Schema({ id: { type: String, unique: true }, title: String, description: String, meetingType: String, platform: String, meetingLink: String, room: String, start: String, end: String, organizerId: String, participants: [mongoose.Schema.Types.Mixed] }, { timestamps: true });

// FIX: Corrected the schema for recipients. It is an object containing a 'type' string and an 'ids' array, not a string itself.
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
            timestamp: Date.now(), classId: channelId, channel: channelId, groundingChunks: groundingChunks
        });
        await aiMessage.save();
        res.status(201).json(aiMessage);
    } catch(error) {
        res.status(500).json({ message: "The AI assistant is currently unavailable." });
    }
});

// Gemini Timetable Generation
const generateTimetablePrompt = (classes, faculty, subjects, rooms, constraints) => {
    // This prompt is structured to guide the AI towards a valid timetable. The JSON format is enforced by the API config.
    const facultyMap = new Map(faculty.map(f => [f.id, f.name])); // Create a map for easy lookup.

    return `
      You are an expert university timetable scheduler. Your primary goal is to generate a complete, conflict-free timetable based on the provided data and constraints, satisfying all HARD RULES.

      Your output must be a JSON object containing a "timetable" array and an "unscheduledSessions" array.
      - "timetable": An array of scheduled sessions.
      - "unscheduledSessions": An array of sessions you could not schedule, including a very specific "reason". For example: "Could not schedule 2 out of 4 hours for [Subject] for class [Class] due to resource conflicts or unavailability."

      **AVAILABLE TIME SLOTS:**
      ${JSON.stringify(constraints.timePreferences.slotDurationMinutes ? "You must determine slots based on start time, end time, and slot duration" : ["09:30-10:20", "10:20-11:10", "11:10-12:00", "12:00-12:50", "12:50-01:35", "01:35-02:25", "02:25-03:15", "03:15-04:05", "04:05-04:55"])}

      **AVAILABLE DAYS:**
      ${JSON.stringify(constraints.timePreferences.workingDays)}

      ---

      **INPUT DATA:**

      1. CLASSES: ${JSON.stringify(classes.map(({id, ...c}) => c))}
      2. FACULTY: ${JSON.stringify(faculty.map(f => ({name: f.name, department: f.department, maxWorkload: f.maxWorkload})))}
      3. SUBJECTS: ${JSON.stringify(subjects.map(s => ({
          name: s.name, 
          code: s.code, 
          hoursPerWeek: s.hoursPerWeek, 
          // Use faculty name instead of ID
          assignedFaculty: facultyMap.get(s.assignedFacultyId) || 'Unassigned', 
          type: s.type, 
          department: s.department, 
          forClass: s.forClass 
      })))}
      4. ROOMS: ${JSON.stringify(rooms.map(({id, ...r}) => r))}

      ---

      **HARD RULES (MUST be followed):**

      - A faculty member can only teach one class at a time.
      - A class/section can only have one session at a time.
      - A room can only be used for one session at a time.
      - The room capacity must be >= the class studentCount.
      - **Subject Relevance Rule:** Each subject has a "forClass" property. You MUST schedule a subject ONLY for the class name specified in its "forClass" property.
      - Schedule exactly 'hoursPerWeek' sessions for each subject.
      - Lab subjects MUST be assigned to 'Laboratory' type rooms. Theory subjects to 'Classroom'.
      - Fixed/Pinned Classes: These are pre-scheduled and MUST be placed exactly as specified: ${JSON.stringify(constraints.fixedClasses || [])}.
      - Faculty Unavailability: This faculty is unavailable at these specific times: ${JSON.stringify(constraints.facultyPreferences?.flatMap(p => (p.unavailability || []).map(u => ({ faculty: faculty.find(f=>f.id===p.facultyId)?.name, day: u.day, time: u.timeSlot }))))}
      - Max Concurrent Classes per Department: Do not schedule more than the specified number of classes simultaneously for any given department: ${JSON.stringify(constraints.maxConcurrentClassesPerDept || {})}

      **OPTIMIZATION GOALS (Secondary priority after HARD RULES):**

      - Fulfilling all hard constraints is your most important task. If a perfect schedule satisfying all soft goals is not possible, create a valid schedule that meets all hard rules, even if it's not ideal.
      - Distribute subjects for a class throughout the week. A 4-hour subject should ideally be on 3-4 different days, not just 1 or 2.
      - Prioritize compact schedules: Fill morning slots first and minimize gaps in a section's schedule, especially at the start or end of the day.
      - Max Consecutive Classes (Global): Try not to schedule more than ${constraints.maxConsecutiveClasses} classes in a row for any section.
      - Faculty Preferences:
        - Preferred Days: Try to schedule faculty on these days: ${JSON.stringify(constraints.facultyPreferences?.map(p => ({ faculty: faculty.find(f=>f.id===p.facultyId)?.name, days: p.preferredDays })))}
        - Daily Preference: ${JSON.stringify(constraints.facultyPreferences?.map(p => ({ faculty: faculty.find(f=>f.id===p.facultyId)?.name, preference: p.dailySchedulePreference })))}
        - Max Consecutive for Faculty: ${JSON.stringify(constraints.facultyPreferences?.map(p => ({ faculty: faculty.find(f=>f.id===p.facultyId)?.name, max: p.maxConsecutiveClasses })))}
        - Gap Preference: ${JSON.stringify(constraints.facultyPreferences?.map(p => ({ faculty: faculty.find(f=>f.id===p.facultyId)?.name, preference: p.gapPreference })))}
        - Course Time Preference: Try to schedule these specific courses in the morning or afternoon as requested: ${JSON.stringify(constraints.facultyPreferences?.flatMap(p => (p.coursePreferences || []).map(cp => ({ faculty: faculty.find(f=>f.id===p.facultyId)?.name, subject: subjects.find(s=>s.id===cp.subjectId)?.name, time: cp.time }))))}
      - Room/Resource Rules:
        - Prioritize Same Room: ${constraints.roomResourceConstraints?.prioritizeSameRoomForConsecutive ? "If a section has back-to-back classes, try to keep them in the same room." : "Not a priority."}
        - Assign 'Home Room': ${constraints.roomResourceConstraints?.assignHomeRoomForSections ? "Try to assign a single, consistent 'home room' for all theory classes of a specific section (e.g., all theory for CSE A in CSE-A-CR)." : "Not a priority."}
      - Student Section Rules:
        - Max Consecutive for Students: Try not to schedule more than ${constraints.studentSectionConstraints?.maxConsecutiveClasses} classes in a row for any student section.
        - Avoid Consecutive Core Subjects: ${constraints.studentSectionConstraints?.avoidConsecutiveCore ? "Try to avoid scheduling two core subjects back-to-back." : "Not a priority."}
      - Advanced Rules:
        - Faculty Load Balancing: ${constraints.advancedConstraints?.enableFacultyLoadBalancing ? "Distribute a faculty member's classes evenly across their available days." : "Not a priority."}
        - Travel Time: If a faculty has classes in different blocks, ensure there's a gap of at least ${constraints.advancedConstraints?.travelTimeMinutes || 0} minutes between them.

      Now, generate the timetable.
    `;
};


app.post('/api/generate-timetable', authMiddleware, async (req, res) => {
    if (!process.env.API_KEY) {
        return res.status(500).json({ message: 'API key is not configured on the server.' });
    }
    const { classes, faculty, subjects, rooms, constraints } = req.body;
    
    if (!classes || !faculty || !subjects || !rooms || !constraints) {
        return res.status(400).json({ message: 'Missing required data for timetable generation.' });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = generateTimetablePrompt(classes, faculty, subjects, rooms, constraints);
        
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        res.setHeader('Content-Type', 'application/json');

        for await (const chunk of responseStream) {
            if (chunk.text) {
                res.write(chunk.text);
            }
        }
        res.end();

    } catch (error) {
        console.error("Error generating timetable with Gemini:", error);
        res.status(500).json({ message: "Failed to generate timetable due to an AI model or server error.", details: error.message });
    }
});

// NEW: Endpoint for AI workload re-assignment suggestions
app.post('/api/suggest-reassignment', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
    }
    if (!process.env.API_KEY) {
        return res.status(500).json({ message: 'AI features are not configured.' });
    }

    try {
        const { faculty, subjects } = req.body;

        const prompt = `
            You are an expert university administrator specializing in workload balancing. Your task is to analyze faculty workloads and suggest re-assignments for subjects to balance the teaching load.

            Your output MUST be a JSON object with two properties: "suggestions" and "unresolvableWorkloads".
            - "suggestions" is an array of objects, where each object represents a single subject re-assignment with the following keys: "subjectId", "subjectName", "fromFacultyId", "fromFacultyName", "toFacultyId", "toFacultyName".
            - "unresolvableWorkloads" is an array of objects for faculty whose workload is too high but no suitable replacement could be found, with keys: "facultyName", "department", "reason", "recommendation".

            RULES:
            1. A subject can only be reassigned to a faculty member from the same department who has a matching specialization.
            2. Only suggest re-assignments from OVERLOADED faculty (assigned hours > max workload) to UNDERLOADED faculty (assigned hours < max workload).
            3. The goal is to bring the overloaded faculty's workload below their maximum. Prioritize suggestions that make the biggest impact.
            4. If an overloaded faculty has a unique specialization for a subject and no other qualified faculty is available, do not suggest a re-assignment. Instead, add them to the "unresolvableWorkloads" array with a clear reason and a recommendation (e.g., "Hire a new faculty with X specialization").

            INPUT DATA:
            - ALL FACULTY: ${JSON.stringify(faculty)}
            - ALL SUBJECTS: ${JSON.stringify(subjects)}

            Analyze the data and provide your suggestions in the specified JSON format.
        `;
        
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', 
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        const suggestions = JSON.parse(response.text);
        res.json(suggestions);
        
    } catch (error) {
        console.error("Error getting AI re-assignment suggestions:", error);
        res.status(500).json({ message: 'Failed to get AI suggestions.', details: error.message });
    }
});

// NEW: Endpoint for Universal AI Import
app.post('/api/import/universal', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
    }
    if (!process.env.API_KEY) {
        return res.status(500).json({ message: 'AI features are not configured.' });
    }

    try {
        const { fileData, mimeType } = req.body;
        if (!fileData || !mimeType) {
            return res.status(400).json({ message: 'File data and MIME type are required.' });
        }

        // Assuming the content is text-based (like CSV).
        // Decoding from data URL: `data:[<mediatype>][;base64],<data>`
        const base64Data = fileData.split(',')[1];
        const fileContent = Buffer.from(base64Data, 'base64').toString('utf8');

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const prompt = `
            You are an intelligent data extraction tool for a university scheduling system.
            Your task is to analyze the content of a file and extract structured data for classes, faculty, subjects, and rooms.
            The file content is likely a CSV or similarly structured text.

            File Content:
            ---
            ${fileContent}
            ---

            Your output MUST be a single JSON object with four keys: "classes", "faculty", "subjects", and "rooms".
            Each key must contain an array of objects. Infer missing fields with reasonable defaults.
            - classes: [{ name, branch, year, section, studentCount, block }]
            - faculty: [{ name, employeeId, designation, department, specialization: [], email, contactNumber, maxWorkload }]
            - subjects: [{ name, code, department, semester, credits, type, hoursPerWeek, forClass, assignedFacultyName }] (Use faculty name, not ID)
            - rooms: [{ number, building, type, capacity, block }]

            Extract as much information as possible. Be robust. If a section of the file is empty or unparseable, return an empty array for that key.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });

        const extractedData = JSON.parse(response.text);

        // --- Data Insertion Logic ---
        // We will upsert to avoid duplicates.
        if (extractedData.faculty && extractedData.faculty.length > 0) {
            const facultyOps = extractedData.faculty.map(f => ({
                updateOne: {
                    filter: { email: f.email },
                    update: { $set: f, $setOnInsert: { id: new mongoose.Types.ObjectId().toString() } },
                    upsert: true
                }
            }));
            await Faculty.bulkWrite(facultyOps);
        }

        // Fetch all faculty to create a name -> ID map
        const allFaculty = await Faculty.find({});
        const facultyNameMap = new Map(allFaculty.map(f => [f.name, f.id]));
        
        if (extractedData.rooms && extractedData.rooms.length > 0) {
            const roomOps = extractedData.rooms.map(r => ({
                updateOne: { filter: { number: r.number }, update: { $set: r, $setOnInsert: { id: new mongoose.Types.ObjectId().toString() } }, upsert: true }
            }));
            await Room.bulkWrite(roomOps);
        }

        if (extractedData.classes && extractedData.classes.length > 0) {
            const classOps = extractedData.classes.map(c => ({
                updateOne: { filter: { name: c.name }, update: { $set: c, $setOnInsert: { id: new mongoose.Types.ObjectId().toString() } }, upsert: true }
            }));
            await Class.bulkWrite(classOps);
        }

        if (extractedData.subjects && extractedData.subjects.length > 0) {
            const subjectOps = extractedData.subjects.map(s => {
                const facultyId = facultyNameMap.get(s.assignedFacultyName);
                const subjectData = { ...s, assignedFacultyId: facultyId };
                delete subjectData.assignedFacultyName;
                return {
                    updateOne: { filter: { code: s.code }, update: { $set: subjectData, $setOnInsert: { id: new mongoose.Types.ObjectId().toString() } }, upsert: true }
                };
            });
            await Subject.bulkWrite(subjectOps);
        }

        res.json({ message: 'Data imported successfully!' });

    } catch (error) {
        console.error("Error during universal import:", error);
        res.status(500).json({ message: 'Failed to import data.', details: error.message });
    }
});


// All data route
app.get('/api/all-data', authMiddleware, async (req, res) => {
    try {
        const [
            classes, faculty, subjects, rooms, students, users,
            constraints, timetable, attendance, chatMessages, institutions,
            teacherRequests, studentQueries, syllabusProgress, meetings, calendarEvents, appNotifications
        ] = await Promise.all([
            Class.find(), Faculty.find(), Subject.find(), Room.find(), Student.find(), User.find(),
            Constraints.findOne({ identifier: 'global_constraints' }),
            TimetableEntry.find(), Attendance.find(), ChatMessage.find().sort({ timestamp: -1 }).limit(200),
            Institution.find(), TeacherRequest.find(), StudentQuery.find(),
            SyllabusProgress.find(), Meeting.find(), CalendarEvent.find(), AppNotification.find()
        ]);

        const attendanceObject = attendance.reduce((acc, curr) => {
            if (!acc[curr.classId]) acc[curr.classId] = {};
            acc[curr.classId][curr.date] = curr.records.reduce((recAcc, rec) => {
                recAcc[rec.studentId] = rec.status;
                return recAcc;
            }, {});
            return acc;
        }, {});

        res.json({
            classes, faculty, subjects, rooms, students, users,
            constraints, timetable, attendance: attendanceObject, chatMessages: chatMessages.reverse(),
            institutions, teacherRequests, studentQueries, syllabusProgress, meetings, calendarEvents, appNotifications
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching all data', error: error.message });
    }
});

// NEW: Reset Data Endpoint
app.post('/api/reset-data', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
    }
    try {
        // 1. Clear existing data
        await Promise.all([
            Class.deleteMany({}), Faculty.deleteMany({}), Subject.deleteMany({}),
            Room.deleteMany({}), Student.deleteMany({}), User.deleteMany({}),
            TimetableEntry.deleteMany({}), Constraints.deleteMany({}), Attendance.deleteMany({}),
            ChatMessage.deleteMany({}), Institution.deleteMany({}), TeacherRequest.deleteMany({}),
            StudentQuery.deleteMany({})
        ]);

        // 2. Define new seed data
        const newId = () => new mongoose.Types.ObjectId().toString();

        const newClassesData = [
            { id: newId(), name: 'CYS A', branch: 'CYS', year: 1, section: 'A', studentCount: 60, block: 'A-Block' },
            { id: newId(), name: 'CYS B', branch: 'CYS', year: 1, section: 'B', studentCount: 60, block: 'A-Block' },
            { id: newId(), name: 'BCA A', branch: 'BCA', year: 1, section: 'A', studentCount: 60, block: 'B-Block' },
            { id: newId(), name: 'BCA B', branch: 'BCA', year: 1, section: 'B', studentCount: 60, block: 'B-Block' },
            { id: newId(), name: 'CSE A', branch: 'CSE', year: 1, section: 'A', studentCount: 60, block: 'C-Block' },
            { id: newId(), name: 'CSE B', branch: 'CSE', year: 1, section: 'B', studentCount: 60, block: 'C-Block' },
            { id: newId(), name: 'CSE C', branch: 'CSE', year: 1, section: 'C', studentCount: 60, block: 'C-Block' },
            { id: newId(), name: 'CSE D', branch: 'CSE', year: 1, section: 'D', studentCount: 60, block: 'C-Block' },
        ];

        const newRoomsData = [
            { id: newId(), number: 'CYS-A-CR', building: 'Block A', type: 'Classroom', capacity: 65, block: 'A-Block', equipment: { projector: true, whiteboard: true } },
            { id: newId(), number: 'CYS-B-CR', building: 'Block A', type: 'Classroom', capacity: 65, block: 'A-Block', equipment: { projector: true, whiteboard: true } },
            { id: newId(), number: 'BCA-A-CR', building: 'Block B', type: 'Classroom', capacity: 65, block: 'B-Block', equipment: { projector: true, whiteboard: true } },
            { id: newId(), number: 'BCA-B-CR', building: 'Block B', type: 'Classroom', capacity: 65, block: 'B-Block', equipment: { projector: true, whiteboard: true } },
            { id: newId(), number: 'CSE-A-CR', building: 'Block C', type: 'Classroom', capacity: 65, block: 'C-Block', equipment: { projector: true, smartBoard: true } },
            { id: newId(), number: 'CSE-B-CR', building: 'Block C', type: 'Classroom', capacity: 65, block: 'C-Block', equipment: { projector: true, smartBoard: true } },
            { id: newId(), number: 'CSE-C-CR', building: 'Block C', type: 'Classroom', capacity: 65, block: 'C-Block', equipment: { projector: true, smartBoard: true } },
            { id: newId(), number: 'CSE-D-CR', building: 'Block C', type: 'Classroom', capacity: 65, block: 'C-Block', equipment: { projector: true, smartBoard: true } },
            { id: newId(), number: 'CS-LAB-1', building: 'Block C', type: 'Laboratory', capacity: 60, block: 'C-Block', equipment: { computerSystems: { available: true, count: 60 }, ac: true } },
            { id: newId(), number: 'CS-LAB-2', building: 'Block C', type: 'Laboratory', capacity: 60, block: 'C-Block', equipment: { computerSystems: { available: true, count: 60 }, ac: true } },
            { id: newId(), number: 'CYBER-LAB', building: 'Block A', type: 'Laboratory', capacity: 60, block: 'A-Block', equipment: { computerSystems: { available: true, count: 60 }, smartBoard: true } },
            { id: newId(), number: 'SEMINAR-HALL', building: 'Admin', type: 'Seminar Hall', capacity: 150, block: 'A-Block', equipment: { projector: true, audioSystem: true, ac: true } },
        ];

        const facultyPool = {
            humanities: [
                { id: newId(), name: 'Dr. Eleanor Vance', employeeId: 'F001', designation: 'Professor', department: 'Applied Science', specialization: ['Communication', 'Ethics'], email: 'eleanor.vance@university.edu', maxWorkload: 18 },
                { id: newId(), name: 'Prof. Marcus Holloway', employeeId: 'F002', designation: 'Assistant Professor', department: 'Applied Science', specialization: ['Sociology', 'Humanities'], email: 'marcus.holloway@university.edu', maxWorkload: 18 }
            ],
            de: [
                { id: newId(), name: 'Dr. Ben Carter', employeeId: 'F003', designation: 'Associate Professor', department: 'CSE', specialization: ['Digital Electronics', 'Embedded Systems'], email: 'ben.carter@university.edu', maxWorkload: 18 },
                { id: newId(), name: 'Prof. Aisha Khan', employeeId: 'F004', designation: 'Assistant Professor', department: 'CSE', specialization: ['Circuit Design', 'VLSI'], email: 'aisha.khan@university.edu', maxWorkload: 18 }
            ],
            dsa: [
                { id: newId(), name: 'Dr. Kenji Tanaka', employeeId: 'F005', designation: 'Professor', department: 'CSE', specialization: ['Data Structures', 'Algorithms'], email: 'kenji.tanaka@university.edu', maxWorkload: 18 },
                { id: newId(), name: 'Prof. Chloe Price', employeeId: 'F006', designation: 'Associate Professor', department: 'CSE', specialization: ['Competitive Programming', 'DSA'], email: 'chloe.price@university.edu', maxWorkload: 18 }
            ],
            math: [
                { id: newId(), name: 'Dr. Samuel Green', employeeId: 'F007', designation: 'Professor', department: 'Applied Science', specialization: ['Applied Mathematics', 'Calculus'], email: 'samuel.green@university.edu', maxWorkload: 18 },
                { id: newId(), name: 'Prof. Sofia Reyes', employeeId: 'F008', designation: 'Associate Professor', department: 'Applied Science', specialization: ['Linear Algebra', 'Statistics'], email: 'sofia.reyes@university.edu', maxWorkload: 18 }
            ],
            oops: [
                { id: newId(), name: 'Dr. David Chen', employeeId: 'F009', designation: 'Professor', department: 'CSE', specialization: ['OOPS', 'Software Design'], email: 'david.chen@university.edu', maxWorkload: 18 },
                { id: newId(), name: 'Prof. Maya Sharma', employeeId: 'F010', designation: 'Assistant Professor', department: 'CSE', specialization: ['Java', 'C++', 'OOPS'], email: 'maya.sharma@university.edu', maxWorkload: 18 }
            ]
        };
        let newFacultyData = Object.values(facultyPool).flat();
        
        const newSubjectsData = [];
        const subjectTemplates = [
            { name: 'Humanities', codePrefix: 'HU', type: 'humanities' },
            { name: 'Mathematics-I', codePrefix: 'MA', type: 'math' },
            { name: 'Digital Electronics', codePrefix: 'DE', type: 'de' },
            { name: 'Data Structures & Algorithms', codePrefix: 'DS', type: 'dsa' },
            { name: 'Object Oriented Programming', codePrefix: 'CS', type: 'oops' },
        ];
        
        // Use random assignment per user request.
        const getRandomFacultyId = (type) => {
            const specialists = facultyPool[type];
            if (!specialists || specialists.length === 0) return null;
            const randomIndex = Math.floor(Math.random() * specialists.length);
            return specialists[randomIndex].id;
        };

        newClassesData.forEach(cls => {
            subjectTemplates.forEach(template => {
                newSubjectsData.push({
                    id: newId(),
                    name: template.name,
                    code: `${cls.name.replace(' ', '')}-${template.codePrefix}`, // Unique code like CYSA-HU
                    department: cls.branch,
                    forClass: cls.name, // Explicitly link subject to a class
                    semester: 1,
                    credits: 3,
                    type: 'Theory',
                    hoursPerWeek: 4,
                    assignedFacultyId: getRandomFacultyId(template.type)
                });
            });
        });

        // 3. Create default users and profiles
        const adminProfile = { id: newId(), name: 'Admin User', employeeId: 'ADMIN01', designation: 'Professor', department: 'Administration', specialization: ['System Management'], email: 'admin@university.edu', maxWorkload: 40 };
        const teacherProfileForUser = facultyPool.dsa[0]; // Dr. Kenji Tanaka
        const studentClass = newClassesData.find(c => c.name === 'CSE A');
        const studentProfile = { id: newId(), name: 'Demo Student', classId: studentClass.id, roll: '01', email: 'student@university.edu' };
        
        newFacultyData.push(adminProfile);
        const newStudentsData = [studentProfile];

        const usersToCreate = [
            { username: 'admin@university.edu', password: 'admin123', role: 'admin', profileId: adminProfile.id },
            { username: teacherProfileForUser.email, password: 'teacher123', role: 'teacher', profileId: teacherProfileForUser.id },
            { username: 'student@university.edu', password: 'student123', role: 'student', profileId: studentProfile.id },
        ];
        
        const hashedUsers = await Promise.all(usersToCreate.map(async (user) => {
            const hashedPassword = await bcrypt.hash(user.password, saltRounds);
            return { ...user, password: hashedPassword };
        }));

        // 4. Insert new data
        await Institution.create({ id: newId(), name: 'Smart University', academicYear: '2024-2025', semester: 'Odd', blocks: ['A-Block', 'B-Block', 'C-Block'] });
        await Constraints.create({});
        await Class.insertMany(newClassesData);
        await Room.insertMany(newRoomsData);
        await Faculty.insertMany(newFacultyData);
        await Subject.insertMany(newSubjectsData);
        await Student.insertMany(newStudentsData);
        await User.insertMany(hashedUsers);

        res.json({ message: 'Data has been reset successfully.' });

    } catch (error) {
        console.error("Error resetting data:", error);
        res.status(500).json({ message: 'Failed to reset data.', error: error.message });
    }
});


// FIX: Added a catch-all route to serve the SPA's index.html.
// This is crucial for handling client-side routing on page refresh or direct navigation.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});


const PORT = process.env.PORT || 3001;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });