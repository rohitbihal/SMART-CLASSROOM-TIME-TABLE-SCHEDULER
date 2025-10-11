
import { Class, Faculty, Subject, Room, Constraints, TimetableEntry } from '../types';

const API_BASE_URL = 'http://localhost:3001';

export const generateTimetable = async (classes: Class[], faculty: Faculty[], subjects: Subject[], rooms: Room[], constraints: Constraints): Promise<TimetableEntry[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-timetable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ classes, faculty, subjects, rooms, constraints }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API Error: ${response.statusText}`);
    }

    const timetableData = await response.json();
    return timetableData;
  } catch (error) {
    console.error("Error calling backend to generate timetable:", error);
    throw new Error(`Failed to generate timetable. Please check the backend connection and API key. Error: ${error.message}`);
  }
};
