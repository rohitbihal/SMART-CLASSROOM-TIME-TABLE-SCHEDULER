
import { Class, Faculty, Subject, Room, Constraints, TimetableEntry } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

const generateTimetablePrompt = (classes: Class[], faculty: Faculty[], subjects: Subject[], rooms: Room[], constraints: Constraints): string => {
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

export const generateTimetable = async (classes: Class[], faculty: Faculty[], subjects: Subject[], rooms: Room[], constraints: Constraints): Promise<TimetableEntry[]> => {
  // Safely access the API key to prevent crashes in environments where `process` is not defined.
  const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;

  if (!apiKey) {
    throw new Error("API_KEY is not configured in this environment. Timetable generation is unavailable.");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
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
    
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error calling Gemini API to generate timetable:", error);
    throw new Error(`Failed to generate timetable. Please check your API key and constraints. Error: ${error.message}`);
  }
};
