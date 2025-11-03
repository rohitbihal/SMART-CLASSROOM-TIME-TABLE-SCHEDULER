
import { Class, Faculty, Subject, Room, Constraints, TimetableEntry, GenerationResult } from '../types';

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
): Promise<GenerationResult> => {
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
        // Read the full response body as text first to avoid "body stream already read" errors.
        const responseText = await response.text();
        try {
            // Attempt to parse the text as JSON, which is the expected error format from our API.
            const errorData = JSON.parse(responseText);
            errorMsg = errorData.details || errorData.message || JSON.stringify(errorData);
        } catch (e) {
            // If parsing fails, the error response was not JSON (e.g., an HTML error page from a proxy).
            // Use the raw text as the error message. Truncate for readability.
            errorMsg = responseText.substring(0, 500) + (responseText.length > 500 ? '...' : '');
        }
        throw new Error(`The server encountered an issue: ${errorMsg}`);
    }

    const generationResult = await response.json();
    
    if (!generationResult || !Array.isArray(generationResult.timetable) || !Array.isArray(generationResult.unscheduledSessions)) {
      console.error("Backend returned invalid format for generation result:", generationResult);
      throw new Error("The server returned an invalid data format for the timetable generation result.");
    }
    
    return generationResult;
    
  } catch (error) {
    console.error("Error during timetable generation request:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Provide a comprehensive error message for the UI
    throw new Error(`An error occurred while generating the timetable. This could be due to a network issue, server configuration, or a problem with the AI model. Details: ${errorMessage}`);
  }
};