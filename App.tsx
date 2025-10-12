import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './features/auth/LoginPage';
import { Dashboard } from './features/dashboard/Dashboard';
import { TimetableScheduler } from './features/scheduler/TimetableScheduler';
import { LoadingIcon } from './components/Icons';
import { ChatMessage, Class, Constraints, Faculty, Room, Subject, Student, Attendance } from './types';

// NOTE: The base URL for the backend server.
const API_BASE_URL = 'https://smart-classroom-and-time-table-scheduler.onrender.com/api';

const getInitialConstraints = (): Constraints => {
    const initialDepts = ['CSE'];
    return {
        maxConsecutiveClasses: 3,
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        lunchBreak: "12:50-01:35",
        chatWindow: { start: '09:00', end: '17:00' },
        classSpecific: [],
        maxConcurrentClassesPerDept: Object.fromEntries(initialDepts.map(dept => [dept, 4])),
    };
};

const FullScreenLoader = ({ message }) => (
    React.createElement("div", { className: "fixed inset-0 bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center z-50" },
        React.createElement(LoadingIcon, null),
        React.createElement("p", { className: "mt-4 text-lg text-gray-600 dark:text-gray-300" }, message)
    )
);

// Helper for authenticated API calls
// FIX: Add 'any' type to options to allow for properties like 'headers', resolving a TypeScript error.
const fetchWithAuth = async (url, options: any = {}, token) => {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401 || response.status === 403) {
        // Token is invalid or expired, force logout
        sessionStorage.clear();
        window.location.hash = '/login';
        throw new Error('Session expired. Please log in again.');
    }
    return response;
};

/**
 * A component to protect routes based on user authentication and role.
 * @param {object} props - Component props.
 * @param {object} props.user - The current user object.
 * @param {string[]} props.allowedRoles - An array of roles allowed to access the route.
 * @param {React.ReactNode} props.children - The component to render if authorized.
 * @returns {React.ReactElement} - The child component or a redirect.
 */
const ProtectedRoute = ({ user, allowedRoles, children }) => {
    if (!user) {
        // If no user is logged in, redirect to the login page.
        return React.createElement(Navigate, { to: "/login" });
    }
    if (!allowedRoles.includes(user.role)) {
        // If the user's role is not in the allowed list, redirect to the main dashboard.
        return React.createElement(Navigate, { to: "/" });
    }
    // If authenticated and authorized, render the child component.
    return children;
};


export const App = () => {
  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => sessionStorage.getItem('token'));
  const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'dark');
  
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [constraints, setConstraints] = useState<Constraints>(getInitialConstraints());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  const [attendance, setAttendance] = useState<Attendance>(() => {
    try {
        const saved = localStorage.getItem('smartCampusShared');
        return saved ? (JSON.parse(saved).attendance || {}) : {};
    } catch { return {}; }
  });
  
  useEffect(() => {
      const fetchData = async () => {
          if (!token) {
              setIsLoading(false);
              return; // Don't fetch if not logged in
          }
          try {
              setIsLoading(true);
              const response = await fetchWithAuth(`${API_BASE_URL}/data`, {}, token);
              if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
              }
              const data = await response.json();
              setClasses(data.classes || []);
              setFaculty(data.faculty || []);
              setSubjects(data.subjects || []);
              setRooms(data.rooms || []);
              setStudents(data.students || []);
          } catch (error) {
              console.error("Failed to fetch initial data from server:", error);
          } finally {
              setIsLoading(false);
          }
      };
      fetchData();
  }, [token]);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('app_theme', theme);
  }, [theme]);
  
  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  
  useEffect(() => {
    try {
        const sharedData = JSON.parse(localStorage.getItem('smartCampusShared') || '{}');
        sharedData.attendance = attendance;
        localStorage.setItem('smartCampusShared', JSON.stringify(sharedData));
    } catch (error) { console.error("Failed to save attendance data:", error); }
  }, [attendance]);
  
  const handleLogin = (loggedInUser, authToken) => {
    setUser(loggedInUser);
    setToken(authToken);
    sessionStorage.setItem('user', JSON.stringify(loggedInUser));
    sessionStorage.setItem('token', authToken);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
  };

  const handleSendMessage = (text: string, classId: string, channel: string) => {
    if (!user || !text.trim()) return;
    const newMessage: ChatMessage = {
        id: `msg_${Date.now()}`, author: user.username, role: user.role, text,
        timestamp: Date.now(), classId, channel,
    };
    setChatMessages(prev => [...prev, newMessage]);
  };

  const handleSaveEntity = async (type: 'class' | 'faculty' | 'subject' | 'room' | 'student', data: any) => {
    if (user?.role !== 'admin') {
      alert("You don't have permission to perform this action.");
      return;
    }
    const isAdding = !data.id;
    const url = isAdding ? `${API_BASE_URL}/${type}` : `${API_BASE_URL}/${type}/${data.id}`;
    const method = isAdding ? 'POST' : 'PUT';
    
    try {
        const response = await fetchWithAuth(url, {
            method: method,
            body: JSON.stringify(isAdding ? { ...data, id: `id_${Date.now()}` } : data),
        }, token);
        if (!response.ok) throw new Error(`Failed to save ${type}`);
        const savedItem = await response.json();
        
        const setter = { class: setClasses, faculty: setFaculty, subject: setSubjects, room: setRooms, student: setStudents }[type];
        if (isAdding) {
            setter(prev => [...prev, savedItem]);
        } else {
            setter(prev => prev.map(item => item.id === savedItem.id ? savedItem : item));
        }
    } catch (error) {
        console.error(`Error saving ${type}:`, error);
        alert(`Error saving ${type}: ${error.message}`);
    }
  };

  const handleDeleteEntity = async (type: 'class' | 'faculty' | 'subject' | 'room' | 'student', id: string) => {
     if (user?.role !== 'admin') {
      alert("You don't have permission to perform this action.");
      return;
    }
     try {
        const response = await fetchWithAuth(`${API_BASE_URL}/${type}/${id}`, { method: 'DELETE' }, token);
        if (!response.ok) throw new Error(`Failed to delete ${type}`);
        
        const setter = { class: setClasses, faculty: setFaculty, subject: setSubjects, room: setRooms, student: setStudents }[type];
        setter(prev => prev.filter(item => item.id !== id));
     } catch (error) {
        console.error(`Error deleting ${type}:`, error);
        alert(`Error deleting ${type}: ${error.message}`);
     }
  };
  
  const handleUpdateAttendance = (classId, date, studentId, status) => {
      setAttendance(prev => ({
          ...prev, [classId]: { ...(prev[classId] || {}), [date]: { ...((prev[classId] && prev[classId][date]) || {}), [studentId]: status } }
      }));
  };

  const handleResetData = async () => {
    if (user?.role !== 'admin') {
      alert("You don't have permission to perform this action.");
      return;
    }
    try {
        setIsLoading(true);
        const response = await fetchWithAuth(`${API_BASE_URL}/reset-data`, { method: 'POST' }, token);
        if (!response.ok) throw new Error('Failed to reset data on server');
        
        const dataResponse = await fetchWithAuth(`${API_BASE_URL}/data`, {}, token);
        const data = await dataResponse.json();
        setClasses(data.classes || []);
        setFaculty(data.faculty || []);
        setSubjects(data.subjects || []);
        setRooms(data.rooms || []);
        setStudents(data.students || []);
        setConstraints(getInitialConstraints());
        setChatMessages([]);
        setAttendance({});
        localStorage.removeItem('smartCampusShared');
        alert('Data has been reset successfully.');
    } catch (error) {
        console.error("Error resetting data:", error);
        alert(`Failed to reset data: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  if (isLoading && token) {
    return React.createElement(FullScreenLoader, { message: "Loading Campus Data..." });
  }

  const dashboardProps = {
    user, onLogout: handleLogout, theme, toggleTheme, classes, faculty, subjects, students,
    constraints, updateConstraints: setConstraints, chatMessages, onSendMessage: handleSendMessage,
    attendance, onUpdateAttendance: handleUpdateAttendance,
    onSaveEntity: handleSaveEntity, onDeleteEntity: handleDeleteEntity,
    token
  };

  return (
    React.createElement(HashRouter, null,
      React.createElement(Routes, null,
        // FIX: Removed 'apiBaseUrl' prop from LoginPage as it's not defined in the component's props.
        React.createElement(Route, { path: "/login", element: user ? React.createElement(Navigate, { to: "/" }) : React.createElement(LoginPage, { onLogin: handleLogin }) }),
        React.createElement(Route, { path: "/", element: user ? React.createElement(Dashboard, dashboardProps) : React.createElement(Navigate, { to: "/login" }) }),
        React.createElement(Route, {
          path: "/scheduler",
          // FIX: Pass children explicitly in props to satisfy TypeScript's type checking for the untyped `ProtectedRoute` component.
          element: React.createElement(ProtectedRoute, { user: user, allowedRoles: ['admin'], children: 
            React.createElement(TimetableScheduler, {
                onLogout: handleLogout, theme: theme, toggleTheme: toggleTheme,
                classes, faculty, subjects, rooms, students,
                constraints, setConstraints,
                onSaveEntity: handleSaveEntity, onDeleteEntity: handleDeleteEntity, onResetData: handleResetData,
                token
              })
          })
        }),
        React.createElement(Route, { path: "*", element: React.createElement(Navigate, { to: user ? "/" : "/login" }) })
      )
    )
  );
};
