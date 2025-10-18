import React, { createContext, useState, useEffect, useCallback, useContext, useMemo } from 'react';
// FIX: Added AttendanceRecord to imports to fix type error.
import { User, Class, Faculty, Subject, Room, Student, Constraints, TimetableEntry, Attendance, ChatMessage, AttendanceRecord } from '../types';
import * as api from '../services/api';
import { logger } from '../services/logger';

type AppState = 'loading' | 'ready' | 'error';

interface AppContextType {
    user: User | null;
    token: string | null;
    appState: AppState;
    theme: string;
    login: (user: User, token: string) => void;
    logout: () => void;
    toggleTheme: () => void;
    
    // Global Data
    classes: Class[];
    faculty: Faculty[];
    subjects: Subject[];
    rooms: Room[];
    students: Student[];
    users: User[];
    constraints: Constraints | null;
    timetable: TimetableEntry[];
    attendance: Attendance;
    chatMessages: ChatMessage[];
    
    // Data Handlers
    handleSaveEntity: (type: 'class' | 'faculty' | 'subject' | 'room' | 'student', data: any) => Promise<any>;
    handleDeleteEntity: (type: 'class' | 'faculty' | 'subject' | 'room' | 'student', id: string) => Promise<void>;
    handleUpdateConstraints: (newConstraints: Constraints) => Promise<void>;
    handleSaveTimetable: (newTimetable: TimetableEntry[]) => Promise<void>;
    // FIX: Changed records type to AttendanceRecord to match the actual data structure and fix type error.
    handleSaveClassAttendance: (classId: string, date: string, records: AttendanceRecord) => Promise<void>;
    handleSendMessage: (messageText: string, messageId: string, classId: string) => Promise<void>;
    handleResetData: () => Promise<void>;
    handleSaveUser: (userData: any) => Promise<any>;
    handleDeleteUser: (userId: string) => Promise<void>;
    getFacultyProfile: (profileId: string) => Faculty | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(() => { try { const u = sessionStorage.getItem('user'); return u ? JSON.parse(u) : null; } catch { return null; } });
    const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('token'));
    const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'dark');
    const [appState, setAppState] = useState<AppState>('loading');

    const [classes, setClasses] = useState<Class[]>([]);
    const [faculty, setFaculty] = useState<Faculty[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [constraints, setConstraints] = useState<Constraints | null>(null);
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    const [attendance, setAttendance] = useState<Attendance>({});
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    
    const fetchData = useCallback(async () => {
        if (!token) { setAppState('ready'); return; }
        setAppState('loading');
        try {
            const data = await api.fetchAllData();
            setClasses(data.classes || []);
            setFaculty(data.faculty || []);
            setSubjects(data.subjects || []);
            setRooms(data.rooms || []);
            setStudents(data.students || []);
            setConstraints(data.constraints || null);
            setTimetable(data.timetable || []);
            setAttendance(data.attendance || {});
            setChatMessages(data.chatMessages || []);
            setUsers(data.users || []);
        } catch (error) {
            logger.error(error as Error, { context: 'fetchAllData' });
            setAppState('error');
        } finally {
            setAppState('ready');
        }
    }, [token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const login = (loggedInUser: User, authToken: string) => {
        sessionStorage.setItem('user', JSON.stringify(loggedInUser));
        sessionStorage.setItem('token', authToken);
        setUser(loggedInUser);
        setToken(authToken);
        // Data will be fetched by the useEffect hook watching `token`
    };

    const logout = () => {
        sessionStorage.clear();
        setUser(null); setToken(null); setUsers([]);
    };
    
    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

    const handleSaveEntity = useCallback(async (type: 'class' | 'faculty' | 'subject' | 'room' | 'student', data: any) => {
        const savedItem = await api.saveEntity(type, data);
        const setter = { class: setClasses, faculty: setFaculty, subject: setSubjects, room: setRooms, student: setStudents }[type];
        setter(prev => !data.id ? [...prev, savedItem] : prev.map(item => item.id === savedItem.id ? savedItem : item));
        return savedItem;
    }, []);

    const handleDeleteEntity = useCallback(async (type: 'class' | 'faculty' | 'subject' | 'room' | 'student', id: string) => {
        await api.deleteEntity(type, id);
        const setter = { class: setClasses, faculty: setFaculty, subject: setSubjects, room: setRooms, student: setStudents }[type];
        setter(prev => prev.filter(item => item.id !== id));
    }, []);

    const handleUpdateConstraints = useCallback(async (newConstraints: Constraints) => {
        const updatedConstraints = await api.updateConstraints(newConstraints);
        setConstraints(updatedConstraints);
    }, []);

    const handleSaveTimetable = useCallback(async (newTimetable: TimetableEntry[]) => {
        await api.saveTimetable(newTimetable);
        setTimetable(newTimetable);
    }, []);
    
    const handleSaveClassAttendance = useCallback(async (classId: string, date: string, records: AttendanceRecord) => {
        await api.saveClassAttendance(classId, date, records);
        setAttendance(prev => {
            const newAttendance = { ...prev };
            if (!newAttendance[classId]) newAttendance[classId] = {};
            newAttendance[classId][date] = records;
            return newAttendance;
        });
    }, []);
    
    // Note: Chat handling can be complex. This is a simplified version.
    const handleSendMessage = useCallback(async (messageText: string, messageId: string, classId: string) => {
        if (!user) return;
        const userMessage: ChatMessage = { id: messageId, channel: 'query', author: user.username, role: user.role, text: messageText, timestamp: Date.now(), classId };
        setChatMessages(prev => [...prev, userMessage]);
        // AI response handling should be done in the component to show loading state
    }, [user]);

    const handleResetData = useCallback(async () => {
        await api.resetAllData();
        await fetchData(); // Refetch all data after reset
    }, [fetchData]);
    
    const handleSaveUser = useCallback(async (userData: any) => {
        const savedUser = await api.saveUser(userData);
        setUsers(prev => !userData._id ? [...prev, savedUser] : prev.map(u => u._id === savedUser._id ? savedUser : u));
        return savedUser;
    }, []);

    const handleDeleteUser = useCallback(async (userId: string) => {
        await api.deleteUser(userId);
        setUsers(prev => prev.filter(u => u._id !== userId));
    }, []);

    const getFacultyProfile = useCallback((profileId: string) => {
        return faculty.find(f => f.id === profileId);
    }, [faculty]);

    const value = useMemo(() => ({
        user, token, appState, theme, login, logout, toggleTheme,
        classes, faculty, subjects, rooms, students, users, constraints, timetable, attendance, chatMessages,
        handleSaveEntity, handleDeleteEntity, handleUpdateConstraints, handleSaveTimetable, handleSaveClassAttendance,
        handleSendMessage, handleResetData, handleSaveUser, handleDeleteUser, getFacultyProfile
    }), [
        user, token, appState, theme, classes, faculty, subjects, rooms, students, users, constraints, timetable, attendance, chatMessages,
        handleSaveEntity, handleDeleteEntity, handleUpdateConstraints, handleSaveTimetable, handleSaveClassAttendance,
        handleSendMessage, handleResetData, handleSaveUser, handleDeleteUser, getFacultyProfile
    ]);

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};