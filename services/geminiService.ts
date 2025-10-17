
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
        let errorMsg = `Server responded with status: ${response.status}`;
        try {
            // Try to parse a structured error message from the server
            const errorData = await response.json();
            errorMsg = errorData.message || JSON.stringify(errorData);
        } catch (e) {
            // If response is not JSON, it might be an HTML error page. Use the raw text.
            errorMsg = await response.text();
        }
        throw new Error(`The server encountered an issue: ${errorMsg}`);
    }

    const timetable = await response.json();
    
    if (!Array.isArray(timetable)) {
      console.error("Backend returned non-array for timetable:", timetable);
      throw new Error("The server returned an invalid data format for the timetable.");
    }
    
    return timetable;
    
  } catch (error) {
    console.error("Error during timetable generation request:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Provide a comprehensive error message for the UI
    throw new Error(`An error occurred while generating the timetable. This could be due to a network issue, server configuration, or a problem with the AI model. Details: ${errorMessage}`);
  }
};