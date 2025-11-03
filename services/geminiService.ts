

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
        const responseText = await response.text(); // Read body once to prevent stream errors.
        let errorDetails: string;
        try {
            // Try to parse as JSON for structured API errors.
            const errorJson = JSON.parse(responseText);
            errorDetails = errorJson.details || errorJson.message || responseText;
        } catch (e) {
            // Fallback to raw text if it's not JSON (e.g., an HTML error page from a gateway).
            errorDetails = responseText;
        }
        throw new Error(`The server encountered an issue: ${errorDetails}`);
    }
    
    try {
        const generationResult = await response.json();
        
        if (!generationResult || !Array.isArray(generationResult.timetable) || !Array.isArray(generationResult.unscheduledSessions)) {
          console.error("Backend returned invalid format for generation result:", generationResult);
          throw new Error("The server returned an invalid data format for the timetable generation result.");
        }
        
        return generationResult;
    } catch (parseError) {
        console.error("Failed to parse JSON response from server:", parseError);
        // Note: Can't read response.text() after response.json() fails, so can't log raw text here.
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        throw new Error(`The server's response could not be parsed as JSON. This may be due to a server-side error. Details: ${errorMessage}`);
    }
    
  } catch (error) {
    console.error("Error during timetable generation request:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Provide a comprehensive error message for the UI
    throw new Error(`An error occurred while generating the timetable. This could be due to a network issue, server configuration, or a problem with the AI model. Details: ${errorMessage}`);
  }
};