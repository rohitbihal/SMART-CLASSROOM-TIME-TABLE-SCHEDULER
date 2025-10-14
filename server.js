// To run this server:
// 1. In your project directory, run 'npm init -y'
// 2. Run 'npm install express mongoose cors dotenv @google/genai jsonwebtoken bcrypt'
// 3. Create a '.env' file in the same directory.
// 4. Add your MongoDB connection string, Gemini API key, and a JWT Secret to the .env file:
//    MONGO_URI=mongodb+srv://rohitbihal333_db_user:zoEAsv3odCRv46XD@cluster0.zoruciu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
//    API_KEY=YOUR_GEMINI_API_KEY
//    JWT_SECRET=a_long_random_secret_string_for_signing_tokens
// 5. Run 'node server.js'

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { GoogleGenAI, Type } = require("@google/genai");

dotenv.config();

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

app.use(express.static(path.join(__dirname, 'dist')));

const saltRounds = 10;

// --- Mongoose Schemas ---
const classSchema = new mongoose.Schema({ id: {type: String, unique: true}, name: {type: String, required: true}, branch: String, year: Number, section: String, studentCount: Number });
const facultySchema = new mongoose.Schema({ id: {type: String, unique: true}, name: {type: String, required: true}, department: String, specialization: [String], email: { type: String, required: true, unique: true } });
const subjectSchema = new mongoose.Schema({ id: {type: String, unique: true}, name: {type: String, required: true}, code: {type: String, required: true, unique: true}, type: String, hoursPerWeek: Number, assignedFacultyId: String });
const roomSchema = new mongoose.Schema({ id: {type: String, unique: true}, number: {type: String, required: true, unique: true}, type: String, capacity: Number });
const studentSchema = new mongoose.Schema({ id: {type: String, unique: true}, name: {type: String, required: true}, email: {type: String, unique: true, sparse: true}, classId: String, roll: String });
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['admin', 'teacher', 'student'] },
    profileId: { type: String, required: true, unique: true }
});

userSchema.index({ username: 1, role: 1 });

const Class = mongoose.model('Class', classSchema);
const Faculty = mongoose.model('Faculty', facultySchema);
const Subject = mongoose.model('Subject', subjectSchema);
const Room = mongoose.model('Room', roomSchema);
const Student = mongoose.model('Student', studentSchema);
const User = mongoose.model('User', userSchema);

const collections = { class: Class, faculty: Faculty, subject: Subject, room: Room, student: Student, user: User };

const MOCK_CLASSES = [ { id: 'c1', name: 'CSE-3-A', branch: 'CSE', year: 3, section: 'A', studentCount: 60 }, { id: 'c2', name: 'CSE-3-B', branch: 'CSE', year: 3, section: 'B', studentCount: 60 } ];
const MOCK_FACULTY = [ { id: 'f1', name: 'Dr. Rajesh Kumar', department: 'CSE', specialization: ['Data Structures', 'Algorithms'], email: 'teacher@university.edu' }, { id: 'f2', name: 'Prof. Sunita Sharma', department: 'CSE', specialization: ['Database Systems', 'Operating Systems'], email: 'prof.sunita@university.edu' } ];
const MOCK_SUBJECTS = [ { id: 's1', name: 'Data Structures', code: 'CS301', type: 'theory', hoursPerWeek: 4, assignedFacultyId: 'f1' }, { id: 's2', name: 'Algorithms', code: 'CS302', type: 'theory', hoursPerWeek: 3, assignedFacultyId: 'f1' }, { id: 's3', name: 'Database Systems', code: 'CS303', type: 'theory', hoursPerWeek: 3, assignedFacultyId: 'f2' }, { id: 's4', name: 'Data Structures Lab', code: 'CS301L', type: 'lab', hoursPerWeek: 2, assignedFacultyId: 'f1' }, { id: 's5', name: 'Database Systems Lab', code: 'CS303L', type: 'lab', hoursPerWeek: 2, assignedFacultyId: 'f2' } ];
const MOCK_ROOMS = [ { id: 'r1', number: 'CS-101', type: 'classroom', capacity: 65 }, { id: 'r2', number: 'CS-102', type: 'classroom', capacity: 65 }, { id: 'r3', number: 'CS-Lab-1', type: 'lab', capacity: 60 } ];
const MOCK_STUDENTS = [ { id: 'st1', name: 'Alice Sharma', classId: 'c1', roll: '01', email: 'student@university.edu' }, { id: 'st2', name: 'Bob Singh', classId: 'c1', roll: '02', email: 'bob.singh@university.edu' }, { id: 'st3', name: 'Charlie Brown', classId: 'c2', roll: '01' }, { id: 'st4', name: 'Diana Prince', classId: 'c2', roll: '02', email: 'diana.p@university.edu' } ];
const MOCK_USERS = [ { username: 'admin@university.edu', password: 'admin123', role: 'admin', profileId: 'admin01' }, { username: 'teacher@university.edu', password: 'teacher123', role: 'teacher', profileId: 'f1' }, { username: 'student@university.edu', password: 'student123', role: 'student', profileId: 'st1' } ];
const TIME_SLOTS = [ '09:30-10:20', '10:20-11:10', '11:10-12:00', '12:00-12:50', '12:50-01:35', '01:35-02:20', '02:20-03:05', '03:05-03:50', '03:50-04:35' ];

async function seedDatabase(force = false) {
    try {
        const adminUser = await User.findOne({ username: 'admin@university.edu' });
        if (adminUser && !force) {
            console.log('Database already contains admin user. Skipping seed.');
            return;
        }
        
        console.log(force ? 'Forcing database seed/reset...' : 'Database is empty or incomplete. Seeding with mock data...');
        await Promise.all(Object.values(collections).map(model => model.deleteMany({})));

        // Hash passwords for mock users before inserting
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
        
        console.log('Database seeded successfully.');
    } catch (error) { console.error('Error seeding database:', error); }
}

mongoose.connect(process.env.MONGO_URI).then(() => { console.log('MongoDB connected successfully.'); seedDatabase(); }).catch(err => { console.error('Initial MongoDB connection error:', err); process.exit(1); });

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
        console.error("Login error:", error);
        res.status(500).json({ message: "An error occurred during login." });
    }
});

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization token required' });
    }
    const token = authHeader.split(' ')[1];
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};

const adminOnly = (req, res, next) => req.user && req.user.role === 'admin' ? next() : res.status(403).json({ message: 'Forbidden: Admin access required' });

app.get('/api/data', authMiddleware, async (req, res) => {
    try {
        const [classes, faculty, subjects, rooms, students] = await Promise.all([ Class.find(), Faculty.find(), Subject.find(), Room.find(), Student.find() ]);
        res.json({ classes, faculty, subjects, rooms, students });
    } catch (error) { res.status(500).json({ message: 'Error fetching data', error }); }
});

app.get('/api/users', authMiddleware, adminOnly, async (req, res) => {
    try {
        const users = await User.find({ role: { $ne: 'admin' } });
        res.json(users);
    } catch (error) { res.status(500).json({ message: 'Error fetching users', error }); }
});

const handleApiError = (res, error, context) => {
    console.error(`Error in ${context}:`, error);
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(e => e.message).join(', ');
        return res.status(400).json({ message: `Validation failed: ${messages}` });
    }
    if (error.code === 11000) { // Mongoose duplicate key error
        return res.status(409).json({ message: `A resource with the given details already exists.` });
    }
    res.status(500).json({ message: `An internal server error occurred.` });
};

app.post('/api/users', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { username, password, role, profileId } = req.body;
        if (!username || !password || !role || !profileId) {
            return res.status(400).json({ message: 'Missing required fields for user creation.' });
        }
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const newUser = new User({ username, password: hashedPassword, role, profileId });
        await newUser.save();
        res.status(201).json(newUser);
    } catch (error) {
        handleApiError(res, error, 'user creation');
    }
});

app.delete('/api/users/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });
        if (user.role === 'admin') return res.status(403).json({ message: "Cannot delete admin user" });
        await User.findByIdAndDelete(req.params.id);
        res.status(204).send();
    } catch (error) {
        handleApiError(res, error, 'user deletion');
    }
});

const createRouterFor = (type) => {
    const router = express.Router();
    const Model = collections[type];

    router.post('/', async (req, res) => {
        try {
            const newItem = new Model(req.body);
            await newItem.save();
            res.status(201).json(newItem);
        } catch (error) {
            handleApiError(res, error, `${type} creation`);
        }
    });

    router.put('/:id', async (req, res) => {
        try {
            const updatedItem = await Model.findOneAndUpdate({ id: req.params.id }, req.body, { new: true, runValidators: true });
            if (!updatedItem) return res.status(404).json({ message: `${type} not found` });
            res.json(updatedItem);
        } catch (error) {
            handleApiError(res, error, `${type} update`);
        }
    });

    router.delete('/:id', async (req, res) => {
        try {
            const deletedItem = await Model.findOneAndDelete({ id: req.params.id });
            if (!deletedItem) return res.status(404).json({ message: `${type} not found` });
            res.status(204).send();
        } catch (error) {
            handleApiError(res, error, `${type} deletion`);
        }
    });

    return router;
};

app.use('/api/class', authMiddleware, adminOnly, createRouterFor('class'));
app.use('/api/faculty', authMiddleware, adminOnly, createRouterFor('faculty'));
app.use('/api/subject', authMiddleware, adminOnly, createRouterFor('subject'));
app.use('/api/room', authMiddleware, adminOnly, createRouterFor('room'));
app.use('/api/student', authMiddleware, adminOnly, createRouterFor('student'));

app.post('/api/reset-data', authMiddleware, adminOnly, async (req, res) => {
    try {
        await seedDatabase(true);
        res.status(200).json({ message: 'Database reset to mock data successfully.' });
    } catch (error) {
        handleApiError(res, error, 'data reset');
    }
});

const timetableEntrySchema = {
    type: Type.OBJECT,
    properties: {
        className: { type: Type.STRING },
        subject: { type: Type.STRING },
        faculty: { type: Type.STRING },
        room: { type: Type.STRING },
        day: { type: Type.STRING },
        time: { type: Type.STRING },
        type: { type: Type.STRING, enum: ['theory', 'lab'] },
    },
    required: ['className', 'subject', 'faculty', 'room', 'day', 'time', 'type']
};

const responseSchema = {
    type: Type.ARRAY,
    items: timetableEntrySchema
};

const generateTimetablePrompt = (classes, faculty, subjects, rooms, constraints) => {
    const facultyMap = Object.fromEntries(faculty.map(f => [f.id, f.name]));
    const subjectsWithFacultyNames = subjects.map(s => ({
        ...s,
        assignedFacultyName: facultyMap[s.assignedFacultyId] || 'Unassigned'
    }));

    return `
You are an expert university timetable scheduler. Your task is to create a conflict-free weekly timetable in JSON format based on the provided data and constraints.

**Output Format:**
The output must be a valid JSON array of timetable entry objects. Each object must conform to the provided JSON schema. Do not include any explanations, introductory text, or markdown formatting. The output must be only the raw JSON array.

**Input Data:**
- Classes: ${JSON.stringify(classes, null, 2)}
- Faculty: ${JSON.stringify(faculty, null, 2)}
- Subjects: ${JSON.stringify(subjectsWithFacultyNames, null, 2)}
- Rooms: ${JSON.stringify(rooms, null, 2)}
- Available Time Slots (excluding lunch): ${JSON.stringify(TIME_SLOTS.filter(t => t !== constraints.lunchBreak))}

**Constraints to strictly follow:**
1.  **Working Days**: Schedule classes only on these days: ${constraints.workingDays.join(', ')}.
2.  **Lunch Break**: The time slot "${constraints.lunchBreak}" is a mandatory lunch break. No classes can be scheduled.
3.  **Faculty Workload**: A faculty member cannot teach more than ${constraints.maxConsecutiveClasses} consecutive classes without a break.
4.  **No Overlaps**:
    - A specific faculty member can only teach one class at any given time.
    - A specific class can only have one subject at any given time.
    - A specific room can only be occupied by one class at any given time.
5.  **Subject Hours**: The total number of 1-hour slots scheduled for each subject in a class for the entire week must exactly match its 'hoursPerWeek'.
6.  **Faculty Assignment**: Each subject must be taught by its assigned faculty member. Use the faculty name, not the ID.
7.  **Room Requirements**:
    - A subject of type 'lab' must be in a room of type 'lab'.
    - A subject of type 'theory' must be in a room of type 'classroom'.
    - The capacity of the assigned room must be greater than or equal to the 'studentCount' of the class.
8.  **Department Concurrency**: For each department, no more than ${JSON.stringify(constraints.maxConcurrentClassesPerDept)} classes can be happening simultaneously in any given time slot.
9.  **Specific Constraints**: Adhere to these specific rules: ${JSON.stringify(constraints.classSpecific, null, 2)}

**Final Instructions:**
Generate the complete, conflict-free timetable as a single JSON array.
    `;
};

app.post('/api/generate-timetable', authMiddleware, adminOnly, async (req, res) => {
    const { classes, faculty, subjects, rooms, constraints } = req.body;
    if (!process.env.API_KEY) {
        return res.status(500).json({ message: "API_KEY is not configured on the server." });
    }
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = generateTimetablePrompt(classes, faculty, subjects, rooms, constraints);

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.2, // Lower temperature for more predictable scheduling
                // NOTE: Disabled thinking to prioritize generation speed. This may reduce the quality or
                // success rate of the generated timetable, especially with complex constraints.
                // For higher quality results, this line can be removed.
                thinkingConfig: { thinkingBudget: 0 },
            },
        });

        const jsonText = response.text.trim();
        if (!jsonText) {
            throw new Error("The AI model returned an empty response. This might be due to overly restrictive constraints.");
        }
        
        // Basic validation that the response is an array
        const parsedResponse = JSON.parse(jsonText);
        if (!Array.isArray(parsedResponse)) {
            throw new Error("The AI model returned data that was not in the expected array format.");
        }
        
        res.status(200).json(parsedResponse);
    } catch (error) {
        console.error("Error calling Gemini API from server:", error);
        const errorMessage = error.message || "An unexpected error occurred during AI generation.";
        res.status(500).json({ message: `Failed to generate timetable. ${errorMessage}` });
    }
});

app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));