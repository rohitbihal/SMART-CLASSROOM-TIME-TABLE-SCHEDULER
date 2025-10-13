// To run this server:
// 1. In your project directory, run 'npm init -y'
// 2. Run 'npm install express mongoose cors dotenv @google/genai jsonwebtoken'
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
const { GoogleGenAI, Type } = require("@google/genai");

dotenv.config();

// --- Environment Variable Check ---
// Check for critical environment variables on startup.
if (!process.env.MONGO_URI) {
    console.error("FATAL ERROR: MONGO_URI is not defined in the environment variables.");
    process.exit(1);
}
if (!process.env.JWT_SECRET) {
    // In a production environment, you MUST set a secure, private JWT_SECRET.
    // For development convenience, we are using a default, insecure secret.
    // DO NOT USE THIS IN PRODUCTION.
    process.env.JWT_SECRET = 'DEFAULT_INSECURE_JWT_SECRET_FOR_DEVELOPMENT_ONLY';
    console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.warn("!!! WARNING: JWT_SECRET is not defined in environment variables.");
    console.warn("!!! Using a default, insecure secret for development purposes.");
    console.warn("!!! For production, create a .env file and set a strong JWT_SECRET.");
    console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
}
if (!process.env.API_KEY) {
    console.warn("WARNING: API_KEY is not defined. The AI timetable generation feature will not work.");
}


const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- Serve Frontend Static Files ---
app.use(express.static(__dirname));

// --- Mongoose Schemas ---
const classSchema = new mongoose.Schema({ id: String, name: String, branch: String, year: Number, section: String, studentCount: Number });
const facultySchema = new mongoose.Schema({ id: String, name: String, department: String, specialization: [String], email: { type: String, required: true } });
const subjectSchema = new mongoose.Schema({ id: String, name: String, code: String, type: String, hoursPerWeek: Number, assignedFacultyId: String });
const roomSchema = new mongoose.Schema({ id: String, number: String, type: String, capacity: Number });
const studentSchema = new mongoose.Schema({ id: String, name: String, email: String, classId: String, roll: String });
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true }, // This will be the email
    password: { type: String, required: true }, // In a real app, this should be hashed.
    role: { type: String, required: true, enum: ['admin', 'teacher', 'student'] },
    profileId: { type: String, required: true } // Links to faculty or student ID, or a special ID for admin.
});

// Performance Optimization: Add a compound index for the login query.
userSchema.index({ username: 1, role: 1 });


const Class = mongoose.model('Class', classSchema);
const Faculty = mongoose.model('Faculty', facultySchema);
const Subject = mongoose.model('Subject', subjectSchema);
const Room = mongoose.model('Room', roomSchema);
const Student = mongoose.model('Student', studentSchema);
const User = mongoose.model('User', userSchema);

const collections = {
    class: Class,
    faculty: Faculty,
    subject: Subject,
    room: Room,
    student: Student,
    user: User,
};

// --- MOCK DATA FOR DB SEEDING ---
const MOCK_CLASSES = [
    { id: 'c1', name: 'CSE-3-A', branch: 'CSE', year: 3, section: 'A', studentCount: 60 },
    { id: 'c2', name: 'CSE-3-B', branch: 'CSE', year: 3, section: 'B', studentCount: 60 },
];
const MOCK_FACULTY = [
    { id: 'f1', name: 'Dr. Rajesh Kumar', department: 'CSE', specialization: ['Data Structures', 'Algorithms'], email: 'teacher@university.edu' },
    { id: 'f2', name: 'Prof. Sunita Sharma', department: 'CSE', specialization: ['Database Systems', 'Operating Systems'], email: 'prof.sunita@university.edu' },
];
const MOCK_SUBJECTS = [
    { id: 's1', name: 'Data Structures', code: 'CS301', type: 'theory', hoursPerWeek: 4, assignedFacultyId: 'f1' },
    { id: 's2', name: 'Algorithms', code: 'CS302', type: 'theory', hoursPerWeek: 3, assignedFacultyId: 'f1' },
    { id: 's3', name: 'Database Systems', code: 'CS303', type: 'theory', hoursPerWeek: 3, assignedFacultyId: 'f2' },
    { id: 's4', name: 'Data Structures Lab', code: 'CS301L', type: 'lab', hoursPerWeek: 2, assignedFacultyId: 'f1' },
    { id: 's5', name: 'Database Systems Lab', code: 'CS303L', type: 'lab', hoursPerWeek: 2, assignedFacultyId: 'f2' },
];
const MOCK_ROOMS = [
    { id: 'r1', number: 'CS-101', type: 'classroom', capacity: 65 },
    { id: 'r2', number: 'CS-102', type: 'classroom', capacity: 65 },
    { id: 'r3', number: 'CS-Lab-1', type: 'lab', capacity: 60 },
];
const MOCK_STUDENTS = [
    { id: 'st1', name: 'Alice Sharma', classId: 'c1', roll: '01', email: 'student@university.edu' },
    { id: 'st2', name: 'Bob Singh', classId: 'c1', roll: '02', email: 'bob.singh@university.edu' },
    { id: 'st3', name: 'Charlie Brown', classId: 'c2', roll: '01' },
    { id: 'st4', name: 'Diana Prince', classId: 'c2', roll: '02', email: 'diana.p@university.edu' },
];
const MOCK_USERS = [
    { username: 'admin@university.edu', password: 'admin123', role: 'admin', profileId: 'admin01' },
    { username: 'teacher@university.edu', password: 'teacher123', role: 'teacher', profileId: 'f1' },
    { username: 'student@university.edu', password: 'student123', role: 'student', profileId: 'st1' },
];

// --- DB SEEDING FUNCTION ---
async function seedDatabase(force = false) {
    try {
        const classCount = await Class.countDocuments();
        if (classCount > 0 && !force) {
            console.log('Database already contains data. Skipping seed.');
            return;
        }
        
        console.log(force ? 'Forcing database seed/reset...' : 'Database is empty. Seeding with mock data...');

        await Promise.all(Object.values(collections).map(model => model.deleteMany({})));

        await Class.insertMany(MOCK_CLASSES);
        await Faculty.insertMany(MOCK_FACULTY);
        await Subject.insertMany(MOCK_SUBJECTS);
        await Room.insertMany(MOCK_ROOMS);
        await Student.insertMany(MOCK_STUDENTS);
        await User.insertMany(MOCK_USERS);
        
        console.log('Database seeded successfully.');
    } catch (error) {
        console.error('Error seeding database:', error);
    }
}

// --- Mongoose Connection ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB connected successfully.');
        seedDatabase();
    })
    .catch(err => {
        console.error('Initial MongoDB connection error:', err);
        process.exit(1);
    });

// --- AUTHENTICATION ---
app.post('/api/auth/login', async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const user = await User.findOne({ username, role });
        // IMPORTANT: In a production app, never store passwords in plaintext. Use a library like bcrypt to hash and compare passwords.
        if (user && user.password === password) {
            const userPayload = { username, role };
            const token = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: '8h' });
            res.json({ token, user: userPayload });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "An error occurred during login." });
    }
});

// --- MIDDLEWARE ---

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization token required' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
};

// --- API Routes ---

// GET all data for initial app load (any authenticated user)
app.get('/api/data', authMiddleware, async (req, res) => {
    try {
        const [classes, faculty, subjects, rooms, students] = await Promise.all([
            Class.find(), Faculty.find(), Subject.find(), Room.find(), Student.find()
        ]);
        res.json({ classes, faculty, subjects, rooms, students });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching data', error });
    }
});

// User management routes (admin only)
app.get('/api/users', authMiddleware, adminOnly, async (req, res) => {
    try {
        const users = await User.find({ role: { $ne: 'admin' } }); // Don't return the admin account itself
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error });
    }
});

app.post('/api/users', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { username, password, role, profileId } = req.body;
        if (!username || !password || !role || !profileId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const existingUser = await User.findOne({ $or: [{ username }, { profileId }] });
        if (existingUser) {
            return res.status(409).json({ message: 'A user account for this email or profile already exists.' });
        }

        const newUser = new User({ username, password, role, profileId });
        await newUser.save();
        res.status(201).json(newUser);
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error });
    }
});

app.delete('/api/users/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.role === 'admin') {
            return res.status(403).json({ message: "Cannot delete admin user" });
        }
        await User.findByIdAndDelete(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user', error });
    }
});


// Generic CRUD operations (admin only)
const createRouterFor = (type) => {
    const router = express.Router();
    const Model = collections[type];

    // Create
    router.post('/', async (req, res) => {
        try {
            const newItem = new Model(req.body);
            await newItem.save();
            res.status(201).json(newItem);
        } catch (error) {
            res.status(400).json({ message: `Error creating ${type}`, error });
        }
    });

    // Update
    router.put('/:id', async (req, res) => {
        try {
            const updatedItem = await Model.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
            if (!updatedItem) return res.status(404).json({ message: `${type} not found` });
            res.json(updatedItem);
        } catch (error) {
            res.status(400).json({ message: `Error updating ${type}`, error });
        }
    });

    // Delete
    router.delete('/:id', async (req, res) => {
        try {
            const deletedItem = await Model.findOneAndDelete({ id: req.params.id });
            if (!deletedItem) return res.status(404).json({ message: `${type} not found` });
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: `Error deleting ${type}`, error });
        }
    });

    return router;
};

// Apply middleware to secure routes.
// All data modification routes now require a valid token AND an admin role.
app.use('/api/class', authMiddleware, adminOnly, createRouterFor('class'));
app.use('/api/faculty', authMiddleware, adminOnly, createRouterFor('faculty'));
app.use('/api/subject', authMiddleware, adminOnly, createRouterFor('subject'));
app.use('/api/room', authMiddleware, adminOnly, createRouterFor('room'));
app.use('/api/student', authMiddleware, adminOnly, createRouterFor('student'));

// POST to reset data to mock data (admin only)
app.post('/api/reset-data', authMiddleware, adminOnly, async (req, res) => {
    try {
        await seedDatabase(true);
        res.status(200).json({ message: 'Database reset to mock data successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error resetting data', error });
    }
});

// POST to generate timetable (admin only)
app.post('/api/generate-timetable', authMiddleware, adminOnly, async (req, res) => {
    const { classes, faculty, subjects, rooms, constraints } = req.body;
    
    if (!process.env.API_KEY) {
        return res.status(500).json({ message: "API_KEY is not configured on the server." });
    }

    const generateTimetablePrompt = (classes, faculty, subjects, rooms, constraints) => {
        const specificConstraintsText = (constraints.classSpecific || [])
            .map(c => {
                if (c.type === 'nonConsecutive') {
                    const className = classes.find(cl => cl.id === c.classId)?.name;
                    const sub1Name = subjects.find(s => s.id === c.subjectId1)?.name;
                    const sub2Name = subjects.find(s => s.id === c.subjectId2)?.name;
                    if (className && sub1Name && sub2Name) {
                        return `- For class "${className}", the subjects "${sub1Name}" and "${sub2Name}" should not be scheduled in consecutive time slots.`;
                    }
                } else if (c.type === 'preferredTime') {
                    const className = classes.find(cl => cl.id === c.classId)?.name;
                    if (className && c.details) {
                        return `- For class "${className}", adhere to the following scheduling preference: "${c.details}".`;
                    }
                } else if (c.type === 'facultyAvailability') {
                    const fac = faculty.find(f => f.id === c.facultyId);
                    if (fac) {
                        return `- Faculty "${fac.name}" is unavailable on ${c.day} during the time slot ${c.timeSlot}. This is a hard constraint and must be respected.`;
                    }
                }
                return null;
            })
            .filter(Boolean)
            .join('\n    ');

        const concurrentClassesText = Object.entries(constraints.maxConcurrentClassesPerDept || {})
            .map(([dept, max]) => `- For the ${dept} department, a maximum of ${max} classes can be scheduled concurrently at any given time.`)
            .join('\n    ');
        
        const timeSlots = "09:30-10:20, 10:20-11:10, 11:10-12:00, 12:00-12:50, 01:35-02:20, 02:20-03:05, 03:05-03:50, 03:50-04:35";

      return `
You are an expert AI scheduling assistant for a university. Your task is to generate a weekly timetable in JSON format according to the provided schema. Analyze the provided data and constraints carefully to create a complete, optimal, and conflict-free schedule.

**Input Data:**
- Classes: ${JSON.stringify(classes, null, 2)}
- Faculty: ${JSON.stringify(faculty, null, 2)}
- Subjects: ${JSON.stringify(subjects, null, 2)}
- Rooms: ${JSON.stringify(rooms, null, 2)}

**Scheduling Constraints & Rules:**

**Hard Constraints (MUST be followed without exception):**
1.  **Exclusivity Rules:**
    - A faculty member can only teach ONE class in a single time slot. There are no exceptions.
    - A class can only attend ONE subject in a single time slot.
    - A room can only be occupied by ONE class in a single time slot.
2.  **Working Hours & Breaks:**
    - The timetable must only include the specified working days: ${constraints.workingDays.join(', ')}.
    - Time slots are fixed: ${timeSlots}.
    - The lunch break from ${constraints.lunchBreak} is mandatory for all. No classes can be scheduled during this time.
3.  **Room Allocation:**
    - 'theory' subjects MUST be scheduled in 'classroom' type rooms.
    - 'lab' subjects MUST be in 'lab' type rooms.
    - The student count of a class ('studentCount') must NOT exceed the capacity of its assigned room ('capacity').
4.  **Subject & Faculty Assignment:**
    - The total number of hours scheduled for each subject per week MUST exactly match its 'hoursPerWeek' property.
    - The faculty member assigned to a subject is specified by 'assignedFacultyId'. The timetable MUST assign that specific faculty member to all sessions of that subject.
5.  **Lab Scheduling:**
    - 'lab' subjects MUST be scheduled for exactly two consecutive time slots. For example, a lab with 'hoursPerWeek: 2' should have one 2-hour session per week.

**Soft Constraints & Preferences (Follow these to create a high-quality schedule):**
1.  **Consecutive Classes:**
    - A faculty member should not teach more than ${constraints.maxConsecutiveClasses} consecutive classes to avoid fatigue.
    - Avoid scheduling the same subject back-to-back for a class on the same day, unless it is a lab session.
2.  **Schedule Compactness:**
    - For any given class, try to minimize gaps (free periods) between classes on the same day. A compact schedule is highly preferred.
3.  **Subject Distribution:**
    - Distribute the classes for a single subject evenly throughout the week, rather than clustering them all on one or two days.

${concurrentClassesText ? `**Departmental Constraints:**\n    ${concurrentClassesText}` : ''}
${specificConstraintsText ? `**User-Defined Specific Constraints:**\n    ${specificConstraintsText}` : ''}

Based on all these rules, generate a complete, conflict-free timetable.
The output MUST be a valid JSON array matching the specified schema. Do not include any explanatory text, just the JSON array.
      `;
    };

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = generateTimetablePrompt(classes, faculty, subjects, rooms, constraints);

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
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
                            type: { type: Type.STRING },
                        },
                        required: ["className", "subject", "faculty", "room", "day", "time", "type"],
                    },
                },
            },
        });

        const jsonText = response.text.trim();
        if (!jsonText) {
            throw new Error("API returned an empty response.");
        }
        
        res.status(200).json(JSON.parse(jsonText));
    } catch (error) {
        console.error("Error calling Gemini API from server:", error);
        res.status(500).json({ message: `Failed to generate timetable. Error: ${error.message}` });
    }
});

// --- Frontend Catch-all Route ---
app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Server Start ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});