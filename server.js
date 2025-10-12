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
    console.error("FATAL ERROR: JWT_SECRET is not defined in the environment variables. This is required for secure authentication.");
    process.exit(1);
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
const facultySchema = new mongoose.Schema({ id: String, name: String, department: String, specialization: [String], email: { type: String, required: false } });
const subjectSchema = new mongoose.Schema({ id: String, name: String, code: String, type: String, hoursPerWeek: Number, assignedFacultyId: String });
const roomSchema = new mongoose.Schema({ id: String, number: String, type: String, capacity: Number });
const studentSchema = new mongoose.Schema({ id: String, name: String, email: String, classId: String, roll: String });

const Class = mongoose.model('Class', classSchema);
const Faculty = mongoose.model('Faculty', facultySchema);
const Subject = mongoose.model('Subject', subjectSchema);
const Room = mongoose.model('Room', roomSchema);
const Student = mongoose.model('Student', studentSchema);

const collections = {
    class: Class,
    faculty: Faculty,
    subject: Subject,
    room: Room,
    student: Student
};

// --- MOCK DATA FOR DB SEEDING ---
const MOCK_CLASSES = [
    { id: 'c1', name: 'CSE-3-A', branch: 'CSE', year: 3, section: 'A', studentCount: 60 },
    { id: 'c2', name: 'CSE-3-B', branch: 'CSE', year: 3, section: 'B', studentCount: 60 },
];
const MOCK_FACULTY = [
    { id: 'f1', name: 'Dr. Rajesh Kumar', department: 'CSE', specialization: ['Data Structures', 'Algorithms'], email: 'teacher@university.edu' },
    { id: 'f2', name: 'Prof. Sunita Sharma', department: 'CSE', specialization: ['Database Systems', 'Operating Systems'] },
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
    { id: 'st2', name: 'Bob Singh', classId: 'c1', roll: '02' },
    { id: 'st3', name: 'Charlie Brown', classId: 'c2', roll: '01' },
    { id: 'st4', name: 'Diana Prince', classId: 'c2', roll: '02' },
];
const MOCK_DATA = {
    classes: MOCK_CLASSES,
    faculty: MOCK_FACULTY,
    subjects: MOCK_SUBJECTS,
    rooms: MOCK_ROOMS,
    students: MOCK_STUDENTS,
};

// --- DB SEEDING FUNCTION ---
async function seedDatabase(force = false) {
    try {
        if (!force) {
            const classCount = await Class.countDocuments();
            if (classCount > 0) {
                console.log('Database already contains data. Skipping seed.');
                return;
            }
            console.log('Database is empty. Seeding with mock data...');
        } else {
            console.log('Forcing database seed/reset...');
        }

        await Promise.all(Object.values(collections).map(model => model.deleteMany({})));

        await Class.insertMany(MOCK_DATA.classes);
        await Faculty.insertMany(MOCK_DATA.faculty);
        await Subject.insertMany(MOCK_DATA.subjects);
        await Room.insertMany(MOCK_DATA.rooms);
        await Student.insertMany(MOCK_DATA.students);
        
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

const credentials = {
    admin: { user: 'admin@university.edu', pass: 'admin123' },
    teacher: { user: 'teacher@university.edu', pass: 'teacher123' },
    student: { user: 'student@university.edu', pass: 'student123' },
};

app.post('/api/auth/login', (req, res) => {
    const { username, password, role } = req.body;
    if (credentials[role] && credentials[role].user === username && credentials[role].pass === password) {
        const userPayload = { username, role };
        const token = jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.json({ token, user: userPayload });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
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
                        return `- Faculty "${fac.name}" is unavailable on ${c.day} during the time slot ${c.timeSlot}.`;
                    }
                }
                return null;
            })
            .filter(Boolean)
            .join('\n    ');

        const concurrentClassesText = Object.entries(constraints.maxConcurrentClassesPerDept || {})
            .map(([dept, max]) => `- For the ${dept} department, a maximum of ${max} classes can be scheduled concurrently at any given time.`)
            .join('\n    ');

      return `
You are an expert AI scheduling assistant for a university. Your task is to generate a weekly timetable in JSON format according to the provided schema.

Here is the input data:
- Classes: ${JSON.stringify(classes, null, 2)}
- Faculty: ${JSON.stringify(faculty, null, 2)}
- Subjects: ${JSON.stringify(subjects, null, 2)}
- Rooms: ${JSON.stringify(rooms, null, 2)}

Constraints and Rules:
1. The timetable is for the following days: ${constraints.workingDays.join(', ')}.
2. Time slots are: 09:30-10:20, 10:20-11:10, 11:10-12:00, 12:00-12:50, 01:35-02:20, 02:20-03:05, 03:05-03:50, 03:50-04:35.
3. Lunch break is from ${constraints.lunchBreak}. No classes should be scheduled during this time.
4. A faculty member cannot teach more than ${constraints.maxConsecutiveClasses} consecutive classes.
5. A specific class (e.g., CSE-3-A) cannot have the same subject taught back-to-back unless it's a lab.
6. Lab subjects (type: 'lab') must be scheduled for two consecutive time slots. The provided hoursPerWeek for labs (e.g., 2) means one 2-hour session per week.
7. A faculty member can only teach one class at a time.
8. A room can only be used by one class at a time.
9. A class can only attend one subject at a time.
10. The capacity of a room must be greater than or equal to the number of students in the class.
11. Assign subjects to faculty based on their specialization and the 'assignedFacultyId' in the subjects list.
12. 'theory' subjects should be in 'classroom' type rooms. 'lab' subjects must be in 'lab' type rooms.
13. Fulfill the 'hoursPerWeek' requirement for each subject for each class.
${concurrentClassesText ? `\n14. Department Constraints:\n    ${concurrentClassesText}` : ''}
${specificConstraintsText ? `\n15. Specific Constraints:\n    ${specificConstraintsText}` : ''}

Based on all these rules, generate a complete, conflict-free timetable.
The output MUST be a valid JSON array matching the schema.
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