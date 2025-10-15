

import React, { useState, useEffect, useCallback } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { LoginPage } from './features/auth/LoginPage';
import { Dashboard } from './features/dashboard/Dashboard';
import { ModuleSelectionPage } from './features/dashboard/ModuleSelectionPage';
import { SmartClassroom } from './features/classroom/SmartClassroom';
import { TimetableScheduler } from './features/scheduler/TimetableScheduler';
import { LoadingIcon } from './components/Icons';
import { ChatMessage, Class, Constraints, Faculty, Room, Subject, Student, Attendance, User, AttendanceStatus, TimetableEntry } from './types';

const API_BASE_URL = '/api';

const FullScreenLoader = ({ message }: { message: string }) => (
    React.createElement("div", { className: "fixed inset-0 bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center z-50" },
        React.createElement(LoadingIcon, null),
        React.createElement("p", { className: "mt-4 text-lg text-gray-600 dark:text-gray-300" }, message)
    )
);

const fetchWithAuth = async (url: string, options: RequestInit = {}, token: string | null) => {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
        sessionStorage.clear();
        window.location.hash = '/login';
        throw new Error('Session expired. Please log in again.');
    }
    return response;
};

const handleApiError = async (response: Response) => {
    let errorMsg = `Server responded with status: ${response.status}`;
    try {
        const errorData = await response.json();
        errorMsg = errorData.message || 'The server returned an unspecified error.';
    } catch {}
    throw new Error(errorMsg);
};

const ProtectedRoute = ({ user, allowedRoles, children }: { user: User | null; allowedRoles: string[]; children: React.ReactElement; }) => {
    if (!user) return React.createElement(ReactRouterDOM.Navigate, { to: "/login" });
    if (!allowedRoles.includes(user.role)) return React.createElement(ReactRouterDOM.Navigate, { to: "/" });
    return children;
};

export const App = () => {
    const [user, setUser] = useState<User | null>(() => { try { const u = sessionStorage.getItem('user'); return u ? JSON.parse(u) : null; } catch { return null; } });
    const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('token'));
    const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'dark');
    const [appState, setAppState] = useState<'loading' | 'ready' | 'error'>('loading');

    const [classes, setClasses] = useState<Class[]>([]);
    const [faculty, setFaculty] = useState<Faculty[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [constraints, setConstraints] = useState<Constraints | null>(null);
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    const [attendance, setAttendance] = useState<Attendance>({});
    
    useEffect(() => {
        const fetchData = async () => {
            if (!token) { setAppState('ready'); return; }
            try {
                const response = await fetchWithAuth(`${API_BASE_URL}/all-data`, {}, token);
                if (!response.ok) await handleApiError(response);
                const data = await response.json();
                setClasses(data.classes || []);
                setFaculty(data.faculty || []);
                setSubjects(data.subjects || []);
                setRooms(data.rooms || []);
                setStudents(data.students || []);
                setConstraints(data.constraints || null);
                setTimetable(data.timetable || []);
                setAttendance(data.attendance || {});
                if (data.users) setUsers(data.users);
            } catch (error) {
                console.error("Failed to fetch initial data:", error);
                // Optionally handle specific errors, e.g., redirect on auth failure
            } finally {
                setAppState('ready');
            }
        };
        fetchData();
    }, [token]);

    useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); localStorage.setItem('app_theme', theme); }, [theme]);
    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

    const handleLogin = (loggedInUser: User, authToken: string) => {
        setUser(loggedInUser);
        setToken(authToken);
        sessionStorage.setItem('user', JSON.stringify(loggedInUser));
        sessionStorage.setItem('token', authToken);
        setAppState('loading'); // Trigger data refetch
    };

    const handleLogout = () => {
        setUser(null); setToken(null); setUsers([]); sessionStorage.clear();
    };

    const handleSaveEntity = async (type: 'class' | 'faculty' | 'subject' | 'room' | 'student', data: any) => {
        const isAdding = !data.id;
        const url = isAdding ? `${API_BASE_URL}/${type}` : `${API_BASE_URL}/${type}/${data.id}`;
        const method = isAdding ? 'POST' : 'PUT';
        const response = await fetchWithAuth(url, { method, body: JSON.stringify(isAdding ? { ...data, id: `id_${Date.now()}` } : data) }, token);
        if (!response.ok) await handleApiError(response);
        const savedItem = await response.json();
        const setter = { class: setClasses, faculty: setFaculty, subject: setSubjects, room: setRooms, student: setStudents }[type] as React.Dispatch<React.SetStateAction<any[]>>;
        setter(prev => isAdding ? [...prev, savedItem] : prev.map(item => item.id === savedItem.id ? savedItem : item));
    };

    const handleDeleteEntity = async (type: 'class' | 'faculty' | 'subject' | 'room' | 'student', id: string) => {
        const response = await fetchWithAuth(`${API_BASE_URL}/${type}/${id}`, { method: 'DELETE' }, token);
        if (!response.ok) await handleApiError(response);
        const setter = { class: setClasses, faculty: setFaculty, subject: setSubjects, room: setRooms, student: setStudents }[type] as React.Dispatch<React.SetStateAction<any[]>>;
        setter(prev => prev.filter(item => item.id !== id));
    };
    
    const handleUpdateConstraints = async (newConstraints: Constraints) => {
        setConstraints(newConstraints); // Optimistic update
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/constraints`, { method: 'PUT', body: JSON.stringify(newConstraints) }, token);
            if (!response.ok) await handleApiError(response);
        } catch (error) {
            console.error("Failed to save constraints:", error); // Optionally revert state and show error
        }
    };
    
    const handleSaveTimetable = async (newTimetable: TimetableEntry[]) => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/timetable`, { method: 'POST', body: JSON.stringify(newTimetable) }, token);
            if (!response.ok) await handleApiError(response);
            setTimetable(newTimetable);
        } catch (error) {
            console.error("Failed to save timetable:", error);
            throw error; // Re-throw to be caught in the UI
        }
    };

    const handleUpdateAttendance = async (classId: string, date: string, studentId: string, status: AttendanceStatus) => {
        setAttendance(prev => ({ ...prev, [classId]: { ...(prev[classId] || {}), [date]: { ...((prev[classId] && prev[classId][date]) || {}), [studentId]: status } } }));
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/attendance`, { method: 'PUT', body: JSON.stringify({ classId, date, studentId, status }) }, token);
            if (!response.ok) await handleApiError(response); // Optionally revert on error
        } catch (error) { console.error("Failed to update attendance:", error); }
    };
    
    const handleUpdateProfilePicture = async (dataUrl: string) => {
        if (!user) return;
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/user/profile-picture`, { method: 'PUT', body: JSON.stringify({ dataUrl }) }, token);
            if (!response.ok) await handleApiError(response);
            const updatedUser = { ...user, profilePictureUrl: dataUrl };
            setUser(updatedUser);
            sessionStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (error) { console.error("Failed to update profile picture:", error); }
    };

    const handleResetData = async () => {
        setAppState('loading');
        try {
            await fetchWithAuth(`${API_BASE_URL}/reset-data`, { method: 'POST' }, token);
            // Re-fetch all data to ensure UI consistency
            const response = await fetchWithAuth(`${API_BASE_URL}/all-data`, {}, token);
            if (!response.ok) await handleApiError(response);
            const data = await response.json();
            setClasses(data.classes || []); setFaculty(data.faculty || []); setSubjects(data.subjects || []);
            setRooms(data.rooms || []); setStudents(data.students || []); setConstraints(data.constraints || null);
            setTimetable(data.timetable || []); setAttendance(data.attendance || {});
            if (data.users) setUsers(data.users);
        } finally {
            setAppState('ready');
        }
    };
    
    const handleSaveUser = async (userData: any) => {
      const response = await fetchWithAuth(`${API_BASE_URL}/users`, { method: 'POST', body: JSON.stringify(userData) }, token);
      if (!response.ok) await handleApiError(response);
      const newUser = await response.json();
      setUsers(prev => [...prev, newUser]);
    };
    const handleDeleteUser = async (userId: string) => {
      const response = await fetchWithAuth(`${API_BASE_URL}/users/${userId}`, { method: 'DELETE' }, token);
      if (!response.ok) await handleApiError(response);
      setUsers(prev => prev.filter(u => u._id !== userId));
    };

    if (appState === 'loading') {
        return React.createElement(FullScreenLoader, { message: "Loading Campus Data..." });
    }

    if (!user) {
        return React.createElement(ReactRouterDOM.HashRouter, null,
            React.createElement(ReactRouterDOM.Routes, null,
                React.createElement(ReactRouterDOM.Route, { path: "/login", element: React.createElement(LoginPage, { onLogin: handleLogin }) }),
                React.createElement(ReactRouterDOM.Route, { path: "*", element: React.createElement(ReactRouterDOM.Navigate, { to: "/login" }) })
            )
        );
    }

// Fix: Corrected onLogout and onUpdateProfilePicture to pass the handler functions instead of using incorrect shorthand properties.
    const commonDashboardProps = {
        user, onLogout: handleLogout, theme, toggleTheme, onUpdateProfilePicture: handleUpdateProfilePicture,
        classes, faculty, subjects, students, users,
        constraints, timetable, attendance, token
    };
    
    return React.createElement(ReactRouterDOM.HashRouter, null,
        React.createElement(ReactRouterDOM.Routes, null,
            React.createElement(ReactRouterDOM.Route, { path: "/login", element: React.createElement(ReactRouterDOM.Navigate, { to: "/" }) }),
            
            React.createElement(ReactRouterDOM.Route, { path: "/", element: 
                user.role === 'admin' ? 
                React.createElement(ModuleSelectionPage, { user: user, onLogout: handleLogout, theme: theme, toggleTheme: toggleTheme }) :
                React.createElement(Dashboard, { 
                    ...commonDashboardProps, 
                    onUpdateAttendance: handleUpdateAttendance 
                })
            }),

            React.createElement(ReactRouterDOM.Route, {
                path: "/scheduler",
                element: React.createElement(ProtectedRoute, { user: user, allowedRoles: ['admin'], children:
                    React.createElement(TimetableScheduler, {
                        onLogout: handleLogout, theme: theme, toggleTheme: toggleTheme,
                        classes, faculty, subjects, rooms, students,
                        constraints, setConstraints: handleUpdateConstraints,
                        onSaveEntity: handleSaveEntity, onDeleteEntity: handleDeleteEntity, onResetData: handleResetData,
                        token: token || '',
                        onSaveTimetable: handleSaveTimetable
                    })
                })
            }),
            React.createElement(ReactRouterDOM.Route, {
                path: "/smart-classroom",
                element: React.createElement(ProtectedRoute, { user: user, allowedRoles: ['admin'], children:
                    React.createElement(SmartClassroom, {
                        ...commonDashboardProps,
                        updateConstraints: handleUpdateConstraints,
                        onUpdateAttendance: handleUpdateAttendance,
                        onSaveEntity: handleSaveEntity, 
                        onDeleteEntity: handleDeleteEntity,
                        onSaveUser: handleSaveUser, 
                        onDeleteUser: handleDeleteUser,
                    })
                })
            }),

            React.createElement(ReactRouterDOM.Route, { path: "*", element: React.createElement(ReactRouterDOM.Navigate, { to: "/" }) })
        )
    );
};