import { isApiError, ErrorResponse, User, PaginatedResponse, Student, Class, Faculty, Subject, Room, Constraints, TimetableEntry, Attendance, ChatMessage, AttendanceRecord, Institution, TeacherQuery, StudentAttendance, Exam, StudentDashboardNotification, SmartTool } from '../types';
import { logger } from './logger';

const API_BASE_URL = '/api';

const handleApiError = async (response: Response): Promise<ErrorResponse> => {
    try {
        const errorData = await response.json();
        const message = errorData.message || 'The server returned an unspecified error.';
        logger.error(new Error(message), { status: response.status, errorData });
        return { message, code: response.status.toString(), details: errorData.errors };
    } catch {
        const message = `Server responded with status: ${response.status}`;
        logger.error(new Error(message), { status: response.status });
        return { message, code: response.status.toString() };
    }
};

const fetchWithAuth = async (url: string, options: RequestInit = {}, retries = 1): Promise<Response> => {
    const token = sessionStorage.getItem('token');
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);

    try {
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401 || response.status === 403) {
            sessionStorage.clear();
            window.location.hash = '/login';
            throw new Error('Session expired. Please log in again.');
        }
        return response;
    } catch (error) {
        if (retries > 0 && (error instanceof TypeError && error.message === 'Failed to fetch')) {
            await new Promise(res => setTimeout(res, 1000)); // wait 1s before retrying
            return fetchWithAuth(url, options, retries - 1);
        }
        throw error;
    }
};


// --- AUTH ---
export const login = async (credentials: any): Promise<{ token: string, user: User }> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    });
    if (!response.ok) {
        throw await handleApiError(response);
    }
    return response.json();
}

// --- DATA FETCHING ---
type AllData = {
    classes: Class[]; faculty: Faculty[]; subjects: Subject[]; rooms: Room[];
    students: Student[]; users: User[]; constraints: Constraints | null;
    timetable: TimetableEntry[]; attendance: Attendance; chatMessages: ChatMessage[];
    institutions: Institution[]; teacherRequests: TeacherQuery[];
    studentAttendance: StudentAttendance[]; exams: Exam[]; notifications: StudentDashboardNotification[];
};
export const fetchAllData = async (): Promise<AllData> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/all-data`);
    if (!response.ok) throw await handleApiError(response);
    return response.json();
};

export const getPaginatedStudents = async (classId: string, page: number, limit: number, search: string): Promise<PaginatedResponse<Student>> => {
    const params = new URLSearchParams({ classId, page: String(page), limit: String(limit), search });
    const response = await fetchWithAuth(`${API_BASE_URL}/paginated/students?${params}`);
    if (!response.ok) throw await handleApiError(response);
    return response.json();
}

export const getPaginatedUsers = async (role: 'teacher' | 'student', page: number, limit: number, search: string): Promise<PaginatedResponse<User>> => {
    const params = new URLSearchParams({ role, page: String(page), limit: String(limit), search });
    const response = await fetchWithAuth(`${API_BASE_URL}/paginated/users?${params}`);
    if (!response.ok) throw await handleApiError(response);
    return response.json();
}

// --- DATA MUTATION ---
type EntityType = 'class' | 'faculty' | 'subject' | 'room' | 'student' | 'institution';
export const saveEntity = async <T>(type: EntityType, data: T & { id?: string }): Promise<T> => {
    const isAdding = !data.id;
    const url = isAdding ? `${API_BASE_URL}/${type}` : `${API_BASE_URL}/${type}/${data.id}`;
    const method = isAdding ? 'POST' : 'PUT';

    const response = await fetchWithAuth(url, { method, body: JSON.stringify(data) });
    if (!response.ok) throw await handleApiError(response);
    return response.json();
};

export const deleteEntity = async (type: EntityType, id: string): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/${type}/${id}`, { method: 'DELETE' });
    if (!response.ok && response.status !== 204) throw await handleApiError(response);
};

export const saveUser = async (userData: Partial<User>): Promise<User> => {
    const isAdding = !userData._id;
    const url = isAdding ? `${API_BASE_URL}/users` : `${API_BASE_URL}/users/${userData._id}`;
    const method = isAdding ? 'POST' : 'PUT';
    
    const response = await fetchWithAuth(url, { method, body: JSON.stringify(userData) });
    if (!response.ok) throw await handleApiError(response);
    return response.json();
};

export const deleteUser = async (userId: string): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/users/${userId}`, { method: 'DELETE' });
    if (!response.ok && response.status !== 204) throw await handleApiError(response);
};

export const updateConstraints = async (constraints: Constraints): Promise<Constraints> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/constraints`, { method: 'PUT', body: JSON.stringify(constraints) });
    if (!response.ok) throw await handleApiError(response);
    return response.json();
}

export const updateFacultyAvailability = async (facultyId: string, unavailability: { day: string, timeSlot: string }[]): Promise<Constraints> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/constraints/faculty-availability`, {
        method: 'PUT',
        body: JSON.stringify({ facultyId, unavailability })
    });
    if (!response.ok) throw await handleApiError(response);
    return response.json();
};

export const saveTimetable = async (timetable: TimetableEntry[]): Promise<TimetableEntry[]> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/timetable`, { method: 'POST', body: JSON.stringify(timetable) });
    if (!response.ok) throw await handleApiError(response);
    return response.json();
}

export const saveClassAttendance = async (classId: string, date: string, records: AttendanceRecord): Promise<void> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/attendance/class`, { method: 'PUT', body: JSON.stringify({ classId, date, records }) });
    if (!response.ok) throw await handleApiError(response);
}

export const resetAllData = async (): Promise<{ message: string }> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/reset-data`, { method: 'POST' });
    if (!response.ok) throw await handleApiError(response);
    return response.json();
}

// --- CHAT API ---
export const askCampusAI = async (payload: { messageText: string, classId: string, messageId: string }): Promise<ChatMessage> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/chat/ask`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw await handleApiError(response);
    return response.json();
};

export const askAiAsStudent = async (payload: { studentId: string, messageText: string }): Promise<ChatMessage> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/chat/admin-ask-as-student`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw await handleApiError(response);
    return response.json();
};

// Renamed for clarity: This sends admin/teacher broadcasts
export const sendAdminMessage = async (payload: { classId: string, text: string }): Promise<ChatMessage> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/chat/send`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw await handleApiError(response);
    return response.json();
};

// NEW: For student-teacher chatbox
export const sendHumanMessage = async (payload: { channel: string, text: string }): Promise<ChatMessage> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/chat/message`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw await handleApiError(response);
    return response.json();
};

export const updateTeacherAvailability = async (facultyId: string, availability: { [day: string]: string[] }): Promise<Faculty> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/teacher/availability`, {
        method: 'PUT',
        body: JSON.stringify({ facultyId, availability })
    });
    if (!response.ok) throw await handleApiError(response);
    return response.json();
};

export const submitTeacherRequest = async (requestData: Omit<TeacherQuery, 'id' | 'facultyId' | 'status' | 'submittedDate'>): Promise<TeacherQuery> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/teacher/requests`, {
        method: 'POST',
        body: JSON.stringify(requestData)
    });
    if (!response.ok) throw await handleApiError(response);
    return response.json();
};

export const askTeacherAI = async (payload: { messageText: string, messageId: string }): Promise<ChatMessage> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/chat/ask/teacher`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw await handleApiError(response);
    return response.json();
};

export const fetchTools = async (): Promise<SmartTool[]> => {
    const response = await fetchWithAuth(`${API_BASE_URL}/tools`);
    if (!response.ok) throw await handleApiError(response);
    return response.json();
}