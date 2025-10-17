// To run this server:
// 1. In your project directory, run 'npm init -y'
// 2. Run 'npm install express mongoose cors dotenv @google/genai jsonwebtoken bcrypt'
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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Environment Variable Check ---
if (!process.env.MONGO_URI) {
    console.error("FATAL ERROR: MONGO_URI is not defined in the environment variables.");
    process.exit(1);
}
if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'DEFAULT_INSECURE_JWT_SECRET_FOR_DEVELOPMENT_ONLY';
    console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.warn("!!! WARNING: JWT_SECRET is not defined. Using a default, insecure secret.");
    console.warn("!!! For production, set a strong JWT_SECRET in your .env file.");
    console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
}
if (!process.env.API_KEY) {
    console.warn("WARNING: API_KEY is not defined. The AI timetable generation feature will not work.");
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

const saltRounds = 10;

// --- Mongoose Schemas ---
const classSchema = new mongoose.Schema({ id: {type: String, unique: true}, name: {type: String, required: true}, branch: String, year: Number, section: String, studentCount: Number });
const facultySchema = new mongoose.Schema({ id: {type: String, unique: true}, name: {type: String, required: true}, department: String, specialization: [String], email: { type: String, required: true, unique: true } });
const subjectSchema = new mongoose.Schema({ id: {type: String, unique: true}, name: {type: String, required: true}, code: {type: String, required: true, unique: true}, department: String, type: String, hoursPerWeek: Number, assignedFacultyId: String });
const roomSchema = new mongoose.Schema({ id: {type: String, unique: true}, number: {type: String, required: true, unique: true}, type: String, capacity: Number });
const studentSchema = new mongoose.Schema({ id: {type: String, unique: true}, name: {type: String, required: true}, email: {type: String, unique: true, sparse: true}, classId: String, roll: String });
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

const institutionDetailsSchema = new mongoose.Schema({
    name: { type: String, default: 'Central University of Technology' },
    academicYear: { type: String, default: '2024-2025' },
    semester: { type: String, default: 'Odd' },
    session: { type: String, default: 'Regular' },
}, { _id: false });

const constraintsSchema = new mongoose.Schema({
    identifier: { type: String, default: 'global_constraints', unique: true },
    maxConsecutiveClasses: { type: Number, default: 3 },
    timePreferences: { type: timePreferencesSchema, default: () => ({}) },
    institutionDetails: { type: institutionDetailsSchema, default: () => ({}) },
    chatWindow: { start: String, end: String },
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
    author: String, role: String, text: String,
    timestamp: Number, classId: String
});


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

const collections = { class: Class, faculty: Faculty, subject: Subject, room: Room, student: Student, user: User, timetable: TimetableEntry, constraints: Constraints, attendance: Attendance, chat: ChatMessage };

const MOCK_CLASSES = [ { id: 'c1', name: 'CSE-3-A', branch: 'CSE', year: 3, section: 'A', studentCount: 60 }, { id: 'c2', name: 'CSE-3-B', branch: 'CSE', year: 3, section: 'B', studentCount: 60 } ];
const MOCK_FACULTY = [ { id: 'f1', name: 'Dr. Rajesh Kumar', department: 'CSE', specialization: ['Data Structures', 'Algorithms'], email: 'teacher@university.edu' }, { id: 'f2', name: 'Prof. Sunita Sharma', department: 'CSE', specialization: ['Database Systems', 'Operating Systems'], email: 'prof.sunita@university.edu' } ];
const MOCK_SUBJECTS = [ { id: 's1', name: 'Data Structures', code: 'CS301', department: 'CSE', type: 'theory', hoursPerWeek: 4, assignedFacultyId: 'f1' }, { id: 's2', name: 'Algorithms', code: 'CS302', department: 'CSE', type: 'theory', hoursPerWeek: 3, assignedFacultyId: 'f1' }, { id: 's3', name: 'Database Systems', code: 'CS303', department: 'CSE', type: 'theory', hoursPerWeek: 3, assignedFacultyId: 'f2' }, { id: 's4', name: 'Data Structures Lab', code: 'CS301L', department: 'CSE', type: 'lab', hoursPerWeek: 2, assignedFacultyId: 'f1' }, { id: 's5', name: 'Database Systems Lab', code: 'CS303L', department: 'CSE', type: 'lab', hoursPerWeek: 2, assignedFacultyId: 'f2' } ];
const MOCK_ROOMS = [ { id: 'r1', number: 'CS-101', type: 'classroom', capacity: 65 }, { id: 'r2', number: 'CS-102', type: 'classroom', capacity: 65 }, { id: 'r3', number: 'CS-Lab-1', type: 'lab', capacity: 60 } ];
const MOCK_STUDENTS = [ { id: 'st1', name: 'Alice Sharma', classId: 'c1', roll: '01', email: 'student@university.edu' }, { id: 'st2', name: 'Bob Singh', classId: 'c1', roll: '02', email: 'bob.singh@university.edu' }, { id: 'st3', name: 'Charlie Brown', classId: 'c2', roll: '01' }, { id: 'st4', name: 'Diana Prince', classId: 'c2', roll: '02', email: 'diana.p@university.edu' } ];
const MOCK_USERS = [ { username: 'admin@university.edu', password: 'admin123', role: 'admin', profileId: 'admin01' }, { username: 'teacher@university.edu', password: 'teacher123', role: 'teacher', profileId: 'f1' }, { username: 'student@university.edu', password: 'student123', role: 'student', profileId: 'st1' } ];
const MOCK_CONSTRAINTS = {
    maxConsecutiveClasses: 3,
    timePreferences: {
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        startTime: '09:00',
        endTime: '17:00',
        lunchStartTime: '13:00',
        lunchDurationMinutes: 60,
        slotDurationMinutes: 60,
    },
    institutionDetails: {
        name: 'Central University of Technology',
        academicYear: '2024-2025',
        semester: 'Odd',
        session: 'Regular'
    },
    chatWindow: { start: '09:00', end: '17:00' },
    classSpecific: [],
    maxConcurrentClassesPerDept: { 'CSE': 4 },
};

async function seedDatabase(force = false) {
    try {
        const demoUserCount = await User.countDocuments({ username: { $in: ['admin@university.edu', 'teacher@university.edu', 'student@university.edu'] } });
        if (demoUserCount === 3 && !force) {
            console.log('All demo users found. Skipping database seed.');
            return;
        }
        
        console.log(force ? 'Forcing database seed/reset...' : 'Seeding database...');
        await Promise.all(Object.values(collections).map(model => model.deleteMany({})));

        const usersWithHashedPasswords = await Promise.all(MOCK_USERS.map(async (user) => {
            const hashedPassword = await bcrypt.hash(user.password, saltRounds);
            return { ...user, password: hashedPassword };
        }));

        await Class.insertMany(MOCK_CLASSES);
        await Faculty.insertMany(MOCK_FACULTY);
        await Subject.insertMany(MOCK_SUBJECTS);
        await Room.insertMany(MOCK_ROOMS);
        await Student.insertMany(MOCK_STUDENTS);
        await User.insertMany(usersWithHashedPasswords);
        await Constraints.updateOne({ identifier: 'global_constraints' }, MOCK_CONSTRAINTS, { upsert: true });
        
        console.log('Database seeded successfully.');
    } catch (error) { console.error('Error seeding database:', error); }
}

mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log('MongoDB connected successfully.');
    seedDatabase();
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
        const findChatMessages = async () => {
          if (req.user.role === 'student') {
            const student = await Student.findOne({ id: req.user.profileId }).lean();
            if (student) {
              return ChatMessage.find({ classId: student.classId }).sort({ timestamp: 1 }).lean();
            }
          }
          return [];
        };
        const [classes, faculty, subjects, rooms, students, constraints, timetable, attendance, users, chatMessages] = await Promise.all([
            Class.find().lean(), Faculty.find().lean(), Subject.find().lean(), Room.find().lean(), Student.find().lean(),
            Constraints.findOne({ identifier: 'global_constraints' }).lean(),
            TimetableEntry.find().lean(),
            Attendance.find().lean(),
            req.user.role === 'admin' ? User.find({ role: { $ne: 'admin' } }).lean() : Promise.resolve([]),
            findChatMessages()
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
        
        res.json({ classes, faculty, subjects, rooms, students, users, constraints, timetable, attendance: attendanceMap, chatMessages });
    } catch (error) { handleApiError(res, error, 'fetching all data'); }
});

// --- Entity CRUD ---
const createRouterFor = (type) => {
    const router = express.Router();
    const Model = collections[type];
    router.post('/', async (req, res) => { try { const newItem = new Model(req.body); await newItem.save(); res.status(201).json(newItem); } catch (e) { handleApiError(res, e, `${type} creation`); } });
    router.put('/:id', async (req, res) => { try { const updated = await Model.findOneAndUpdate({ id: req.params.id }, req.body, { new: true, runValidators: true }); if (!updated) return res.status(404).json({ message: 'Not found' }); res.json(updated); } catch (e) { handleApiError(res, e, `${type} update`); } });
    router.delete('/:id', async (req, res) => { try { const deleted = await Model.findOneAndDelete({ id: req.params.id }); if (!deleted) return res.status(404).json({ message: 'Not found' }); res.status(204).send(); } catch (e) { handleApiError(res, e, `${type} deletion`); } });
    return router;
};
app.use('/api/class', authMiddleware, adminOnly, createRouterFor('class'));
app.use('/api/faculty', authMiddleware, adminOnly, createRouterFor('faculty'));
app.use('/api/subject', authMiddleware, adminOnly, createRouterFor('subject'));
app.use('/api/room', authMiddleware, adminOnly, createRouterFor('room'));
app.use('/api/student', authMiddleware, adminOnly, createRouterFor('student'));

// --- User Management ---
app.get('/api/users', authMiddleware, adminOnly, async (req, res) => { try { res.json(await User.find({ role: { $ne: 'admin' } })); } catch (e) { handleApiError(res, e, 'fetching users'); } });
app.post('/api/users', authMiddleware, adminOnly, async (req, res) => { try { const { username, password, role, profileId } = req.body; const hashedPassword = await bcrypt.hash(password, saltRounds); const newUser = new User({ username, password: hashedPassword, role, profileId }); await newUser.save(); res.status(201).json(newUser); } catch (e) { handleApiError(res, e, 'user creation'); } });
app.put('/api/users/:id', authMiddleware, adminOnly, async (req, res) => {
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
            { $set: req.body }, // Use $set to merge fields instead of overwriting
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        res.json(updatedConstraints);
    } catch (e) {
        handleApiError(res, e, 'constraints update');
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

app.get('/api/chat/:classId', authMiddleware, async (req, res) => { try { const messages = await ChatMessage.find({ classId: req.params.classId }).sort({ timestamp: 1 }); res.json(messages); } catch (e) { handleApiError(res, e, 'fetching chat'); } });

// New AI Chat Endpoint
const generateChatPrompt = (student, studentClass, timetable, subjects, faculty, history) => {
    const today = new Date().toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
    
    return `You are a friendly and helpful AI Campus Assistant for a student named ${student.name}. Your goal is to answer questions based ONLY on the provided context data. If the answer is not in the context, politely say that you don't have that information. Keep your answers concise and clear. Today is ${today}.

**Context Data:**

1.  **Student Details:**
    *   Name: ${student.name}
    *   Class: ${studentClass.name}

2.  **Student's Weekly Timetable:**
    ${JSON.stringify(timetable, null, 2)}

3.  **Available Subjects:**
    ${JSON.stringify(subjects.map(s => ({ name: s.name, code: s.code, type: s.type })), null, 2)}

4.  **Faculty List:**
    ${JSON.stringify(faculty.map(f => ({ name: f.name, department: f.department })), null, 2)}

**Conversation History (Last 5 messages):**
${history.map(h => `${h.author}: ${h.text}`).join('\n')}

**New Question from ${student.name}:**
`;
};

app.post('/api/chat/ask', authMiddleware, async (req, res) => {
    if (!process.env.API_KEY) { return res.status(500).json({ message: "AI features are not configured on the server." }); }
    
    const { messageText, classId } = req.body;
    const { user } = req;

    try {
        // 1. Save user's message
        const userMessage = new ChatMessage({
            text: messageText,
            classId: classId,
            author: user.username,
            role: user.role,
            timestamp: Date.now(),
        });
        await userMessage.save();

        // 2. Gather context for the AI
        const student = await Student.findOne({ id: user.profileId }).lean();
        const studentClass = await Class.findOne({ id: classId }).lean();
        if (!student || !studentClass) return res.status(404).json({ message: "Student profile not found." });

        const [timetable, subjects, faculty, history] = await Promise.all([
            TimetableEntry.find({ className: studentClass.name }).lean(),
            Subject.find().lean(),
            Faculty.find().lean(),
            ChatMessage.find({ classId }).sort({ timestamp: -1 }).limit(5).lean()
        ]);
        
        // 3. Generate prompt and call Gemini
        const prompt = generateChatPrompt(student, studentClass, timetable, subjects, faculty, history.reverse());
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
           model: "gemini-2.5-flash",
           contents: `${prompt}${messageText}`,
           config: {
             systemInstruction: "You are a helpful and friendly AI Campus Assistant for a student. Your goal is to answer questions based *only* on the provided context data. If the answer is not in the context, say that you don't have that information. Keep your answers concise and clear.",
             temperature: 0.3
           }
        });

        const aiResponseText = response.text;
        
        // 4. Save AI's response
        const aiMessage = new ChatMessage({
            text: aiResponseText,
            classId: classId,
            author: 'Campus AI',
            role: 'admin', // Representing the system
            timestamp: Date.now(),
        });
        await aiMessage.save();

        // 5. Send AI response back to client
        res.status(201).json(aiMessage);

    } catch (error) {
        handleApiError(res, error, 'AI chat processing');
    }
});

app.post('/api/chat', authMiddleware, async (req, res) => { try { const newMessage = new ChatMessage(req.body); await newMessage.save(); res.status(201).json(newMessage); } catch (e) { handleApiError(res, e, 'posting chat message'); } });

// --- Reset and Generation ---
app.post('/api/reset-data', authMiddleware, adminOnly, async (req, res) => { try { await seedDatabase(true); res.status(200).json({ message: 'Database reset successfully.' }); } catch (e) { handleApiError(res, e, 'data reset'); } });

// --- Prompt Generation Helpers ---
const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};
const minutesToTime = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const minutes = (totalMinutes % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};
const generateTimeSlotsForPrompt = (prefs) => {
    const slots = [];
    const startMins = timeToMinutes(prefs.startTime);
    const endMins = timeToMinutes(prefs.endTime);
    const lunchStartMins = timeToMinutes(prefs.lunchStartTime);
    const lunchEndMins = lunchStartMins + prefs.lunchDurationMinutes;
    const slotDuration = prefs.slotDurationMinutes;
    let currentMins = startMins;
    while (currentMins < endMins) {
        const slotEndMins = currentMins + slotDuration;
        const overlapsWithLunch = (currentMins < lunchEndMins && slotEndMins > lunchStartMins);
        if (!overlapsWithLunch && slotEndMins <= endMins) {
            slots.push(`${minutesToTime(currentMins)}-${minutesToTime(slotEndMins)}`);
        }
        currentMins += slotDuration;
    }
    return slots;
};
const formatLunchSlotForPrompt = (prefs) => {
    const lunchStartMins = timeToMinutes(prefs.lunchStartTime);
    const lunchEndMins = lunchStartMins + prefs.lunchDurationMinutes;
    return `${minutesToTime(lunchStartMins)}-${minutesToTime(lunchEndMins)}`;
};

const generateTimetablePrompt = (classes, faculty, subjects, rooms, constraints) => {
    const facultyMap = Object.fromEntries(faculty.map(f => [f.id, f.name]));
    const subjectsWithFacultyNames = subjects.map(s => ({ ...s, assignedFaculty: facultyMap[s.assignedFacultyId] || 'Unassigned' }));
    const { timePreferences } = constraints;
    const timeSlots = generateTimeSlotsForPrompt(timePreferences);
    const lunchSlot = formatLunchSlotForPrompt(timePreferences);

    return `
You are an expert AI timetable scheduler for a college. Your task is to generate a conflict-free, optimized weekly timetable based on the provided data and constraints.

**Objective:**
Create a timetable for all specified classes, assigning subjects, faculty, and rooms to available time slots from Monday to Saturday, while strictly adhering to all given constraints.

**Input Data:**

1.  **Time Slots:** ${JSON.stringify(timeSlots)}
2.  **Working Days:** ${JSON.stringify(timePreferences.workingDays)}
3.  **Classes:** ${JSON.stringify(classes, null, 2)}
4.  **Faculty:** ${JSON.stringify(faculty, null, 2)}
5.  **Subjects (with assigned faculty):** ${JSON.stringify(subjectsWithFacultyNames, null, 2)}
6.  **Rooms:** ${JSON.stringify(rooms, null, 2)}

**Constraints to Follow Strictly:**

1.  **Global Constraints:**
    *   A class cannot have more than ${constraints.maxConsecutiveClasses} consecutive lectures without a break.
    *   The lunch break is fixed at ${lunchSlot} every day. No classes should be scheduled during this slot.
    *   A faculty member cannot teach more than one class at the same time.
    *   A classroom cannot be assigned to more than one class at the same time.
    *   A class cannot attend more than one subject at the same time.

2.  **Resource Constraints:**
    *   Lab subjects (type: 'lab') must be assigned to Lab rooms (type: 'lab'). Theory subjects (type: 'theory') must be assigned to Classroom rooms (type: 'classroom').
    *   The number of students in a class must not exceed the capacity of the assigned room.

3.  **Workload Constraint:**
    *   Each subject must be scheduled for exactly its specified 'hoursPerWeek'. Each time slot is one hour.

4.  **Class-Specific Constraints:** ${constraints.classSpecific.length > 0 ? JSON.stringify(constraints.classSpecific, null, 2) : "None"}

**Output Format:**
Your output must be a valid JSON array of timetable entry objects. Do not include any explanations, introductory text, or markdown formatting. The output must be only the JSON array.

Each object in the array must have the following structure:
{
  "className": "string",  // e.g., "CSE-3-A"
  "subject": "string",    // e.g., "Data Structures"
  "faculty": "string",    // e.g., "Dr. Rajesh Kumar"
  "room": "string",       // e.g., "CS-101"
  "day": "string",        // e.g., "monday" (must be lowercase)
  "time": "string",       // e.g., "09:30-10:20"
  "type": "string"        // e.g., "theory" or "lab"
}

Now, generate the timetable.
`;
};
const responseSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { className: { type: Type.STRING }, subject: { type: Type.STRING }, faculty: { type: Type.STRING }, room: { type: Type.STRING }, day: { type: Type.STRING }, time: { type: Type.STRING }, type: { type: Type.STRING, enum: ['theory', 'lab'] } }, required: ['className', 'subject', 'faculty', 'room', 'day', 'time', 'type'] } };
app.post('/api/generate-timetable', authMiddleware, adminOnly, async (req, res) => {
    if (!process.env.API_KEY) { return res.status(500).json({ message: "API_KEY is not configured on the server." }); }
    try {
        const { classes, faculty, subjects, rooms, constraints } = req.body;
        if (!constraints || !constraints.timePreferences) {
            throw new Error("Cannot generate timetable because time preferences are missing from the constraints configuration.");
        }
        const prompt = generateTimetablePrompt(classes, faculty, subjects, rooms, constraints);
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: responseSchema, temperature: 0.2, thinkingConfig: { thinkingBudget: 0 } },
        });
        const parsedResponse = JSON.parse(response.text.trim());
        if (!Array.isArray(parsedResponse)) { throw new Error("AI returned data that was not in the expected array format."); }
        res.status(200).json(parsedResponse);
    } catch (error) {
        console.error("Error calling Gemini API from server:", error);
        res.status(500).json({ message: `Failed to generate timetable. ${error.message || "An unexpected error occurred."}` });
    }
});

// Fallback route for client-side routing
app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));