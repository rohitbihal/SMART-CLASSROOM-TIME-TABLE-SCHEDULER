import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './features/auth/LoginPage';
import { Dashboard } from './features/dashboard/Dashboard';
import { TimetableScheduler } from './features/scheduler/TimetableScheduler';
import { LoadingIcon } from './components/Icons';
import { ChatMessage, Class, Constraints, Faculty, Room, Subject, Student, Attendance } from './types';

// NOTE: The base URL for the backend server.
// For local development, this will be 'http://localhost:3001/api'.
// This URL must point to your live Render service and include the /api path.
const API_BASE_URL = 'https://smart-classroom-and-time-table-scheduler.onrender.com/api';

const getInitialConstraints = (): Constraints => {
    // Initial constraints can still be defined on the client-side.
    const initialDepts = ['CSE']; // Default or derive from faculty later
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

export const App = () => {
  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'dark');
  
  // App-wide state, now initialized as empty and fetched from the server.
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [constraints, setConstraints] = useState<Constraints>(getInitialConstraints());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]); // Chat remains client-side for now
  
  const [attendance, setAttendance] = useState<Attendance>(() => {
    try {
        const saved = localStorage.getItem('smartCampusShared');
        return saved ? (JSON.parse(saved).attendance || {}) : {};
    } catch { return {}; }
  });
  
  // Fetch initial data from the backend server
  useEffect(() => {
      const fetchData = async () => {
          try {
              setIsLoading(true);
              const response = await fetch(`${API_BASE_URL}/data`);
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
              // Optionally, set an error state to show in the UI
          } finally {
              setIsLoading(false);
          }
      };
      fetchData();
  }, []);

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

  useEffect(() => {
    if (user) sessionStorage.setItem('user', JSON.stringify(user));
    else sessionStorage.removeItem('user');
  }, [user]);

  const handleLogin = (username, role) => setUser({ username, role });
  const handleLogout = () => setUser(null);

  const handleSendMessage = (text: string, classId: string, channel: string) => {
    if (!user || !text.trim()) return;
    const newMessage: ChatMessage = {
        id: `msg_${Date.now()}`, author: user.username, role: user.role, text,
        timestamp: Date.now(), classId, channel,
    };
    setChatMessages(prev => [...prev, newMessage]);
  };

  const handleSaveEntity = async (type: 'class' | 'faculty' | 'subject' | 'room' | 'student', data: any) => {
    const isAdding = !data.id;
    const url = isAdding ? `${API_BASE_URL}/${type}` : `${API_BASE_URL}/${type}/${data.id}`;
    const method = isAdding ? 'POST' : 'PUT';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(isAdding ? { ...data, id: `id_${Date.now()}` } : data),
        });
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
    }
  };

  const handleDeleteEntity = async (type: 'class' | 'faculty' | 'subject' | 'room' | 'student', id: string) => {
     try {
        const response = await fetch(`${API_BASE_URL}/${type}/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(`Failed to delete ${type}`);
        
        const setter = { class: setClasses, faculty: setFaculty, subject: setSubjects, room: setRooms, student: setStudents }[type];
        setter(prev => prev.filter(item => item.id !== id));
     } catch (error) {
        console.error(`Error deleting ${type}:`, error);
     }
  };
  
  const handleUpdateAttendance = (classId, date, studentId, status) => {
      setAttendance(prev => ({
          ...prev, [classId]: { ...(prev[classId] || {}), [date]: { ...((prev[classId] && prev[classId][date]) || {}), [studentId]: status } }
      }));
  };

  const handleResetData = async () => {
    try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/reset-data`, { method: 'POST' });
        if (!response.ok) throw new Error('Failed to reset data on server');
        
        // Refetch all data after resetting
        const dataResponse = await fetch(`${API_BASE_URL}/data`);
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

  if (isLoading) {
    return React.createElement(FullScreenLoader, { message: "Loading Campus Data..." });
  }

  const dashboardProps = {
    user, onLogout: handleLogout, theme, toggleTheme, classes, faculty, subjects, students,
    constraints, updateConstraints: setConstraints, chatMessages, onSendMessage: handleSendMessage,
    attendance, onUpdateAttendance: handleUpdateAttendance,
    onSaveEntity: handleSaveEntity, onDeleteEntity: handleDeleteEntity
  };

  return (
    React.createElement(HashRouter, null,
      React.createElement(Routes, null,
        React.createElement(Route, { path: "/login", element: user ? React.createElement(Navigate, { to: "/" }) : React.createElement(LoginPage, { onLogin: handleLogin }) }),
        React.createElement(Route, { path: "/", element: user ? React.createElement(Dashboard, dashboardProps) : React.createElement(Navigate, { to: "/login" }) }),
        React.createElement(Route, {
          path: "/scheduler",
          element: user && user.role === 'admin'
            ? React.createElement(TimetableScheduler, {
                onLogout: handleLogout, theme: theme, toggleTheme: toggleTheme,
                classes, faculty, subjects, rooms, students,
                constraints, setConstraints,
                onSaveEntity: handleSaveEntity, onDeleteEntity: handleDeleteEntity, onResetData: handleResetData,
              })
            : React.createElement(Navigate, { to: "/" })
        }),
        React.createElement(Route, { path: "*", element: React.createElement(Navigate, { to: user ? "/" : "/login" }) })
      )
    )
  );
};