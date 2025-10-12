import { Class, Faculty, Subject, Room, Constraints, TimetableEntry } from '../types';

// NOTE: The base URL for the backend server.
// This URL must point to your live Render service and include the /api path.
const API_BASE_URL = 'https://smart-classroom-and-time-table-scheduler.onrender.com/api';

/**
 * Sends timetable generation request to the backend server.
 * The server will securely handle the call to the Gemini API.
 */
export const generateTimetable = async (
  classes: Class[], 
  faculty: Faculty[], 
  subjects: Subject[], 
  rooms: Room[], 
  constraints: Constraints
): Promise<TimetableEntry[]> => {
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
        throw new Error(errorData.message || `Server responded with status: ${response.status}`);
    }

    const timetable = await response.json();
    
    // Basic validation to ensure we received an array
    if (!Array.isArray(timetable)) {
      console.error("Backend returned non-array for timetable:", timetable);
      throw new Error("The server returned an invalid data format for the timetable.");
    }
    
    return timetable;
    
  } catch (error) {
    console.error("Error fetching timetable from server:", error);
    // Re-throw the error so the UI component can catch it and display a message.
    throw new Error(`Failed to generate timetable. Please check your connection and constraints. Error: ${error.message}`);
  }
};