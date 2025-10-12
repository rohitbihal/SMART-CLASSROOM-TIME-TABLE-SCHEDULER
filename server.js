// A simple backend for the Smart Campus Timetable Scheduler
// To run:
// 1. Make sure you have Node.js installed.
// 2. In your terminal, run: npm install express cors @google/genai dotenv
// 3. Create a .env file in this directory and add your API_KEY, e.g., API_KEY=your_gemini_api_key
// 4. Run: node server.js
// The server will start on http://localhost:3001

import 'dotenv/config'; // Loads .env file contents into process.env
import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const port = 3001;

// Use a more explicit CORS configuration to allow all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

// --- In-Memory Database ---
// Initialized with some sample data.
let db = {};

const MOCK_CLASSES = [
    { id: 'c1', name: 'CSE-3-A', branch: 'CSE', year: 3, section: 'A', studentCount: 60 },
    { id: 'c2', name: 'CSE-3-B', branch: 'CSE', year: 3, section: 'B', studentCount: 60 },
];
const MOCK_FACULTY = [
    { id: 'f1', name: 'Dr. Rajesh Kumar', department: 'CSE', specialization: ['Data Structures', 'Algorithms'] },
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

const initializeDatabase = () => {
    const initialDepts = [...new Set(MOCK_FACULTY.map(f => f.department))];
    db = {
        classes: [...MOCK_CLASSES],
        faculty: [...MOCK_FACULTY],
        subjects: [...MOCK_SUBJECTS],
        rooms: [...MOCK_ROOMS],
        constraints: {
            maxConsecutiveClasses: 3,
            workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            lunchBreak: "12:50-01:35",
            chatWindow: { start: '09:00', end: '17:00' },
            classSpecific: [],
            maxConcurrentClassesPerDept: Object.fromEntries(initialDepts.map(dept => [dept, 4])),
        },
        chatMessages: [],
    };
};
initializeDatabase(); // Initialize on server start


// --- API Routes ---

// Get all data
app.get('/data', (req, res) => {
    res.json(db);
});

// Reset data to initial state
app.post('/reset', (req, res) => {
    initializeDatabase();
    res.json({ message: 'Data reset successfully', data: db });
});

// Generic CRUD endpoints
const createCrudEndpoints = (entityName) => {
    // Get all
    app.get(`/${entityName}`, (req, res) => {
        res.json(db[entityName]);
    });

    // Add one
    app.post(`/${entityName}`, (req, res) => {
        const newItem = { ...req.body, id: `id_${Date.now()}` };
        db[entityName].push(newItem);
        res.status(201).json(newItem);
    });

    // Update one
    app.put(`/${entityName}/:id`, (req, res) => {
        const { id } = req.params;
        const index = db[entityName].findIndex(item => item.id === id);
        if (index === -1) {
            return res.status(404).json({ message: 'Item not found' });
        }
        const updatedItem = { ...db[entityName][index], ...req.body };
        db[entityName][index] = updatedItem;
        res.json(updatedItem);
    });

    // Delete one
    app.delete(`/${entityName}/:id`, (req, res) => {
        const { id } = req.params;
        const initialLength = db[entityName].length;
        db[entityName] = db[entityName].filter(item => item.id !== id);
        if (db[entityName].length === initialLength) {
             return res.status(404).json({ message: 'Item not found' });
        }
        res.status(204).send(); // No content
    });
};

createCrudEndpoints('classes');
createCrudEndpoints('faculty');
createCrudEndpoints('subjects');
createCrudEndpoints('rooms');

// Update constraints
app.put('/constraints', (req, res) => {
    db.constraints = { ...db.constraints, ...req.body };
    res.json(db.constraints);
});

// --- Chat Endpoints ---
app.get('/chat', (req, res) => {
    res.json(db.chatMessages);
});

app.post('/chat', (req, res) => {
    const { author, role, text } = req.body;
    if (!author || !role || !text) {
        return res.status(400).json({ message: 'Missing fields for chat message.' });
    }
    const newMessage = {
        id: `msg_${Date.now()}`,
        author,
        role,
        text,
        timestamp: Date.now(),
    };
    db.chatMessages.push(newMessage);
    res.status(201).json(newMessage);
});


// --- Gemini API Timetable Generation ---

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

app.post('/generate-timetable', async (req, res) => {
    const { classes, faculty, subjects, rooms, constraints } = req.body;

    if (!classes || !faculty || !subjects || !rooms || !constraints) {
        return res.status(400).json({ message: "Missing required data for timetable generation." });
    }
    
    try {
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
            throw new Error("API returned an empty response. The model may have been unable to generate a timetable with the given constraints.");
        }

        const timetableData = JSON.parse(jsonText);
        res.json(timetableData);

    } catch (error) {
        console.error("Error generating timetable with Gemini API:", error);
        res.status(500).json({ message: "Failed to generate timetable.", error: error.message });
    }
});


app.listen(port, () => {
    console.log(`Smart Campus server listening at http://localhost:${port}`);
});