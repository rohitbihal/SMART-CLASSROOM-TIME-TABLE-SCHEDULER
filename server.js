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

const syllabusProgressSchema = new mongoose.Schema({ id: { type: String, unique: true }, subjectId: String, facultyId: String, lectureNumber: Number, assignedTopic: String, taughtTopic: String, date: String, status: String, variance: Boolean });
const calendarEventSchema = new mongoose.Schema({ id: { type: String, unique: true }, eventType: String, title: String, start: String, end: String, description: String, allDay: Boolean, color: String });
const meetingSchema = new mongoose.Schema({ id: { type: String, unique: true }, title: String, description: String, meetingType: String, platform: String, meetingLink: String, room: String, start: String, end: String, organizerId: String, participants: [mongoose.Schema.Types.Mixed] });

// FIX: Completed the appNotificationSchema which was causing a syntax error.
const appNotificationSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    title: String,
    message: String,
    recipients: {
        type: String,
        ids: [String]
    },
    deliveryMethod: [String],
    notificationType: String,
    sentDate: String,
    status: String,
    scheduledFor: String
});

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

// Gemini Timetable Generation
const generateTimetablePrompt = (classes, faculty, subjects, rooms, constraints) => {
    // This prompt is highly structured to guide the AI towards a valid JSON output.
    return `
      You are an expert university timetable scheduler. Your primary goal is to generate a complete, conflict-free timetable based on the provided data and constraints, satisfying all HARD RULES.

      **OUTPUT FORMAT:**
      You MUST respond with ONLY a valid JSON object. Do not include any text, markdown, or explanations before or after the JSON.
      The JSON object must have two keys: "timetable" and "unscheduledSessions".
      - "timetable": An array of session objects.
      - "unscheduledSessions": An array of objects for sessions you could not schedule, including a very specific "reason".

      **SESSION OBJECT STRUCTURE:**
      {
        "className": "string",  // e.g., "CSE A"
        "subject": "string",    // e.g., "Data Structures & Algorithms"
        "faculty": "string",    // e.g., "Dr. Kenji Tanaka"
        "room": "string",       // e.g., "CSE-A-CR"
        "day": "string" (lowercase), // e.g., "monday"
        "time": "string",       // e.g., "09:30-10:20"
        "type": "string",       // "Theory", "Lab", or "Tutorial"
        "classType": "string"   // "regular" for normal theory classes, "fixed" for labs/tutorials that often occur in blocks
      }

      **UNSCHEDULED SESSION OBJECT STRUCTURE:**
      {
        "className": "string",
        "subject": "string",
        "reason": "string" // BE VERY SPECIFIC. e.g., "Could not schedule 2 out of 4 hours for [Subject] for class [Class] due to resource conflicts or unavailability."
      }

      **AVAILABLE TIME SLOTS:**
      ${JSON.stringify(constraints.timePreferences.slotDurationMinutes ? "You must determine slots based on start time, end time, and slot duration" : TIME_SLOTS)}

      **AVAILABLE DAYS:**
      ${JSON.stringify(constraints.timePreferences.workingDays)}

      ---

      **INPUT DATA:**

      1. CLASSES: ${JSON.stringify(classes.map(({id, ...c}) => c))}
      2. FACULTY: ${JSON.stringify(faculty.map(f => ({name: f.name, department: f.department, maxWorkload: f.maxWorkload})))}
      3. SUBJECTS: ${JSON.stringify(subjects.map(s => ({name: s.name, code: s.code, hoursPerWeek: s.hoursPerWeek, assignedFacultyId: s.assignedFacultyId, type: s.type, department: s.department, forClass: s.forClass })))}
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

      Now, generate the JSON output based on all the above.
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
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });

        const text = response.text.trim().replace(/```json/g, '').replace(/```/g, '');
        const timetableData = JSON.parse(text);

        res.json(timetableData);

    } catch (error) {
        console.error("Error generating timetable with Gemini:", error);
        res.status(500).json({ message: "Failed to generate timetable due to an AI model or server error.", details: error.message });
    }
});


// All data route
app.get('/api/all-data', authMiddleware, async (req, res) => {
    try {
        const [
            classes, faculty, subjects, rooms, students, users,
            constraints, timetable, attendance, chatMessages, institutions,
            teacherRequests, studentQueries
        ] = await Promise.all([
            Class.find(), Faculty.find(), Subject.find(), Room.find(), Student.find(), User.find(),
            Constraints.findOne({ identifier: 'global_constraints' }),
            TimetableEntry.find(), Attendance.find(), ChatMessage.find().sort({ timestamp: -1 }).limit(200),
            Institution.find(), TeacherRequest.find(), StudentQuery.find()
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
            institutions, teacherRequests, studentQueries
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