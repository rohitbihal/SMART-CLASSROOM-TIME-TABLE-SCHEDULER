import { Class, Faculty, Subject, Room, Constraints, TimetableEntry } from '../types';

// NOTE: The base URL for the backend server.
const API_BASE_URL = '/api';

/**
 * Sends timetable generation request to the backend server.
 * The server will securely handle the call to the Gemini API.
 */
export const generateTimetable = async (
  classes: Class[], 
  faculty: Faculty[], 
  subjects: Subject[], 
  rooms: Room[], 
  constraints: Constraints,
  token: string // Auth token is now required
): Promise<TimetableEntry[]> => {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    const response = await fetch(`${API_BASE_URL}/generate-timetable`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ classes, faculty, subjects, rooms, constraints }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Server responded with status: ${response.status}`);
    }

    const timetable = await response.json();
    
    if (!Array.isArray(timetable)) {
      console.error("Backend returned non-array for timetable:", timetable);
      throw new Error("The server returned an invalid data format for the timetable.");
    }
    
    return timetable;
    
  } catch (error) {
    console.error("Error fetching timetable from server:", error);
    throw new Error(`Failed to generate timetable. Please check your connection and constraints. Error: ${error.message}`);
  }
};