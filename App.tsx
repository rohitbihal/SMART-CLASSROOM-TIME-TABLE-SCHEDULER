

import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './features/auth/LoginPage';
import { Dashboard } from './features/dashboard/Dashboard';
import { TimetableScheduler } from './features/scheduler/TimetableScheduler';
import { LoadingIcon } from './components/Icons';
import { ChatMessage, Class, Constraints, Faculty, Room, Subject, Student, Attendance } from './types';

// --- MOCK DATA (Previously in server.js) ---
const MOCK_CLASSES: Class[] = [
    { id: 'c1', name: 'CSE-3-A', branch: 'CSE', year: 3, section: 'A', studentCount: 60 },
    { id: 'c2', name: 'CSE-3-B', branch: 'CSE', year: 3, section: 'B', studentCount: 60 },
];
const MOCK_FACULTY: Faculty[] = [
    { id: 'f1', name: 'Dr. Rajesh Kumar', department: 'CSE', specialization: ['Data Structures', 'Algorithms'] },
    { id: 'f2', name: 'Prof. Sunita Sharma', department: 'CSE', specialization: ['Database Systems', 'Operating Systems'] },
];
const MOCK_SUBJECTS: Subject[] = [
    { id: 's1', name: 'Data Structures', code: 'CS301', type: 'theory', hoursPerWeek: 4, assignedFacultyId: 'f1' },
    { id: 's2', name: 'Algorithms', code: 'CS302', type: 'theory', hoursPerWeek: 3, assignedFacultyId: 'f1' },
    { id: 's3', name: 'Database Systems', code: 'CS303', type: 'theory', hoursPerWeek: 3, assignedFacultyId: 'f2' },
    { id: 's4', name: 'Data Structures Lab', code: 'CS301L', type: 'lab', hoursPerWeek: 2, assignedFacultyId: 'f1' },
    { id: 's5', name: 'Database Systems Lab', code: 'CS303L', type: 'lab', hoursPerWeek: 2, assignedFacultyId: 'f2' },
];
const MOCK_ROOMS: Room[] = [
    { id: 'r1', number: 'CS-101', type: 'classroom', capacity: 65 },
    { id: 'r2', number: 'CS-102', type: 'classroom', capacity: 65 },
    { id: 'r3', number: 'CS-Lab-1', type: 'lab', capacity: 60 },
];
const MOCK_STUDENTS: Student[] = [
    { id: 'st1', name: 'Alice Sharma', classId: 'c1', roll: '01', email: 'student@university.edu' },
    { id: 'st2', name: 'Bob Singh', classId: 'c1', roll: '02' },
    { id: 'st3', name: 'Charlie Brown', classId: 'c2', roll: '01' },
    { id: 'st4', name: 'Diana Prince', classId: 'c2', roll: '02' },
];


const getInitialData = () => {
    const initialDepts = [...new Set(MOCK_FACULTY.map(f => f.department))];
    return {
        classes: [...MOCK_CLASSES],
        faculty: [...MOCK_FACULTY],
        subjects: [...MOCK_SUBJECTS],
        rooms: [...MOCK_ROOMS],
        students: [...MOCK_STUDENTS],
        constraints: {
            maxConsecutiveClasses: 3,
            workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            lunchBreak: "12:50-01:35",
            chatWindow: { start: '09:00', end: '17:00' },
            classSpecific: [],
            maxConcurrentClassesPerDept: Object.fromEntries(initialDepts.map(dept => [dept, 4])),
        },
        chatMessages: [],
        attendance: {},
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
  
  // App-wide state for data, initialized with mock data
  const [isLoading, setIsLoading] = useState(false); // No initial loading needed
  const [classes, setClasses] = useState<Class[]>(getInitialData().classes);
  const [faculty, setFaculty] = useState<Faculty[]>(getInitialData().faculty);
  const [subjects, setSubjects] = useState<Subject[]>(getInitialData().subjects);
  const [rooms, setRooms] = useState<Room[]>(getInitialData().rooms);
  const [students, setStudents] = useState<Student[]>(getInitialData().students);
  const [constraints, setConstraints] = useState<Constraints>(getInitialData().constraints);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(getInitialData().chatMessages);
  
  // Initialize attendance state from localStorage for persistence.
  const [attendance, setAttendance] = useState<Attendance>(() => {
    try {
        const saved = localStorage.getItem('smartCampusShared');
        return saved ? (JSON.parse(saved).attendance || {}) : {};
    } catch {
        return {};
    }
  });
  
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('app_theme', theme);
  }, [theme]);
  
  // FIX: Define toggleTheme function to handle theme switching.
  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };
  
  // Persist attendance data whenever it changes.
  useEffect(() => {
    try {
        const sharedData = JSON.parse(localStorage.getItem('smartCampusShared') || '{}');
        sharedData.attendance = attendance;
        localStorage.setItem('smartCampusShared', JSON.stringify(sharedData));
    } catch (error) {
        console.error("Failed to save attendance data to localStorage:", error);
    }
  }, [attendance]);

  useEffect(() => {
    if (user) {
      sessionStorage.setItem('user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('user');
    }
  }, [user]);

  const handleLogin = (username, role) => {
    const loggedInUser = { username, role };
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleSendMessage = (text: string, classId: string, channel: string) => {
    if (!user || !text.trim()) return;
    const newMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        author: user.username,
        role: user.role,
        text,
        timestamp: Date.now(),
        classId,
        channel,
    };
    setChatMessages(prev => [...prev, newMessage]);
  };

  const handleSaveEntity = (type: 'class' | 'faculty' | 'subject' | 'room' | 'student', data: any) => {
    const isAdding = !data.id;
    const setter = { class: setClasses, faculty: setFaculty, subject: setSubjects, room: setRooms, student: setStudents }[type];
    
    if (isAdding) {
        const newItem = { ...data, id: `id_${Date.now()}` };
        setter(prev => [...prev, newItem]);
    } else {
        setter(prev => prev.map(item => item.id === data.id ? data : item));
    }
  };

  const handleDeleteEntity = (type: 'class' | 'faculty' | 'subject' | 'room' | 'student', id: string) => {
     const setter = { class: setClasses, faculty: setFaculty, subject: setSubjects, room: setRooms, student: setStudents }[type];
     setter(prev => prev.filter(item => item.id !== id));
  };
  
  const handleUpdateAttendance = (classId, date, studentId, status) => {
      setAttendance(prev => ({
          ...prev,
          [classId]: {
              ...(prev[classId] || {}),
              [date]: {
                  ...((prev[classId] && prev[classId][date]) || {}),
                  [studentId]: status
              }
          }
      }));
  };

  const handleResetData = () => {
    const initialData = getInitialData();
    setClasses(initialData.classes);
    setFaculty(initialData.faculty);
    setSubjects(initialData.subjects);
    setRooms(initialData.rooms);
    setStudents(initialData.students);
    setConstraints(initialData.constraints);
    setChatMessages(initialData.chatMessages);
    setAttendance(initialData.attendance);
    localStorage.removeItem('smartCampusShared');
  };


  if (isLoading) {
    return React.createElement(FullScreenLoader, { message: "Loading..." });
  }

  const dashboardProps = {
    // FIX: Correctly pass handlers to props instead of using shorthand for non-existent variables.
    user, onLogout: handleLogout, theme, toggleTheme, classes, faculty, subjects, students,
    constraints, updateConstraints: setConstraints, chatMessages, onSendMessage: handleSendMessage,
    attendance, onUpdateAttendance: handleUpdateAttendance,
    onSaveEntity: handleSaveEntity, onDeleteEntity: handleDeleteEntity
  };

  return (
    React.createElement(HashRouter, null,
      React.createElement(Routes, null,
        React.createElement(Route, {
          path: "/login",
          element: user ? React.createElement(Navigate, { to: "/" }) : React.createElement(LoginPage, { onLogin: handleLogin })
        }),
        React.createElement(Route, {
          path: "/",
          element: user ? React.createElement(Dashboard, dashboardProps) : React.createElement(Navigate, { to: "/login" })
        }),
        React.createElement(Route, {
          path: "/scheduler",
          element: user && user.role === 'admin'
            ? React.createElement(TimetableScheduler, {
                onLogout: handleLogout,
                theme: theme,
                toggleTheme: toggleTheme,
                classes,
                faculty,
                subjects,
                rooms,
                students,
                constraints, setConstraints,
                onSaveEntity: handleSaveEntity,
                onDeleteEntity: handleDeleteEntity,
                onResetData: handleResetData,
              })
            : React.createElement(Navigate, { to: "/" })
        }),
        React.createElement(Route, { path: "*", element: React.createElement(Navigate, { to: user ? "/" : "/login" }) })
      )
    )
  );
};