

import React, { useState, useEffect, useCallback } from 'react';
// Fix: Use wildcard import for react-router-dom to address potential module resolution issues.
import * as ReactRouterDOM from 'react-router-dom';
import { LoginPage } from './features/auth/LoginPage';
import { Dashboard } from './features/dashboard/Dashboard';
import { TimetableScheduler } from './features/scheduler/TimetableScheduler';
import { LoadingIcon } from './components/Icons';
import { ChatMessage, Class, Constraints, Faculty, Room, Subject, Student, Attendance, User, AttendanceStatus } from './types';

// NOTE: The base URL for the backend server.
const API_BASE_URL = '/api';

const getInitialConstraints = (): Constraints => {
    const initialDepts = ['CSE'];
    return {
        maxConsecutiveClasses: 3,
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        lunchBreak: "12:50-01:35",
        chatWindow: { start: '09:00', end: '17:00' },
        classSpecific: [],
        maxConcurrentClassesPerDept: Object.fromEntries(initialDepts.map(dept => [dept, 4])),
    };
};

interface FullScreenLoaderProps {
    message: string;
}

const FullScreenLoader = ({ message }: FullScreenLoaderProps) => (
    React.createElement("div", { className: "fixed inset-0 bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center z-50" },
        React.createElement(LoadingIcon, null),
        React.createElement("p", { className: "mt-4 text-lg text-gray-600 dark:text-gray-300" }, message)
    )
);

// Helper for authenticated API calls
const fetchWithAuth = async (url: string, options: RequestInit = {}, token: string | null) => {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
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

interface ProtectedRouteProps {
    user: User | null;
    allowedRoles: string[];
    children: React.ReactElement;
}

/**
 * A component to protect routes based on user authentication and role.
 * @param {object} props - Component props.
 * @param {object} props.user - The current user object.
 * @param {string[]} props.allowedRoles - An array of roles allowed to access the route.
 * @param {React.ReactNode} props.children - The component to render if authorized.
 * @returns {React.ReactElement} - The child component or a redirect.
 */
const ProtectedRoute = ({ user, allowedRoles, children }: ProtectedRouteProps) => {
    if (!user) {
        // If no user is logged in, redirect to the login page.
        return React.createElement(ReactRouterDOM.Navigate, { to: "/login" });
    }
    if (!allowedRoles.includes(user.role)) {
        // If the user's role is not in the allowed list, redirect to the main dashboard.
        return React.createElement(ReactRouterDOM.Navigate, { to: "/" });
    }
    // If authenticated and authorized, render the child component.
    return children;
};


export const App = () => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = sessionStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('token'));
  const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'dark');
  
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [users, setUsers] = useState<User[]>([]);
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
              setIsInitialLoad(false);
              return; // Don't fetch if not logged in
          }
          try {
              // Data fetching now happens in the background without a blocking loader
              const [dataResponse, usersResponse] = await Promise.all([
                  fetchWithAuth(`${API_BASE_URL}/data`, {}, token),
                  user?.role === 'admin' ? fetchWithAuth(`${API_BASE_URL}/users`, {}, token) : Promise.resolve(null)
              ]);

              if (!dataResponse.ok) {
                  throw new Error(`HTTP error! status: ${dataResponse.status}`);
              }
              const data = await dataResponse.json();
              setClasses(data.classes || []);
              setFaculty(data.faculty || []);
              setSubjects(data.subjects || []);
              setRooms(data.rooms || []);
              setStudents(data.students || []);

              if (usersResponse && usersResponse.ok) {
                  const usersData = await usersResponse.json();
                  setUsers(usersData);
              }

          } catch (error) {
              console.error("Failed to fetch initial data from server:", error);
          } finally {
              setIsInitialLoad(false);
          }
      };
      fetchData();
  }, [token, user?.role]);

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
  
  const handleLogin = (loggedInUser: User, authToken: string) => {
    const userToSave = { ...loggedInUser, profilePictureUrl: user?.profilePictureUrl || '' };
    setUser(userToSave);
    setToken(authToken);
    sessionStorage.setItem('user', JSON.stringify(userToSave));
    sessionStorage.setItem('token', authToken);
    setIsInitialLoad(false);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setUsers([]);
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

  const handleApiError = async (response: Response) => {
      let errorMsg = `Server responded with status: ${response.status}`;
      try {
          const errorData = await response.json();
          errorMsg = errorData.message || 'The server returned an unspecified error.';
      } catch { /* Could not parse JSON, use status message */ }
      throw new Error(errorMsg);
  };

  const handleSaveEntity = async (type: 'class' | 'faculty' | 'subject' | 'room' | 'student', data: any) => {
    if (user?.role !== 'admin') throw new Error("You don't have permission to perform this action.");
    
    const isAdding = !data.id;
    const url = isAdding ? `${API_BASE_URL}/${type}` : `${API_BASE_URL}/${type}/${data.id}`;
    const method = isAdding ? 'POST' : 'PUT';
    
    const response = await fetchWithAuth(url, {
        method: method,
        body: JSON.stringify(isAdding ? { ...data, id: `id_${Date.now()}` } : data),
    }, token);

    if (!response.ok) await handleApiError(response);
    
    const savedItem = await response.json();
    
    const setterMap = { class: setClasses, faculty: setFaculty, subject: setSubjects, room: setRooms, student: setStudents };
    const setter = setterMap[type] as React.Dispatch<React.SetStateAction<any[]>>;

    if (isAdding) {
        setter(prev => [...prev, savedItem]);
    } else {
        setter(prev => prev.map(item => item.id === savedItem.id ? savedItem : item));
    }
  };

  const handleDeleteEntity = async (type: 'class' | 'faculty' | 'subject' | 'room' | 'student', id: string) => {
     if (user?.role !== 'admin') throw new Error("You don't have permission to perform this action.");
     
     const response = await fetchWithAuth(`${API_BASE_URL}/${type}/${id}`, { method: 'DELETE' }, token);
     if (!response.ok) await handleApiError(response);
        
     const setterMap = { class: setClasses, faculty: setFaculty, subject: setSubjects, room: setRooms, student: setStudents };
     const setter = setterMap[type] as React.Dispatch<React.SetStateAction<any[]>>;
     setter(prev => prev.filter(item => item.id !== id));
  };

  const handleSaveUser = async (userData: any) => {
      if (user?.role !== 'admin') throw new Error("Permission denied.");
      const response = await fetchWithAuth(`${API_BASE_URL}/users`, {
          method: 'POST', body: JSON.stringify(userData)
      }, token);
      
      if (!response.ok) await handleApiError(response);

      const newUser = await response.json();
      setUsers(prev => [...prev, newUser]);
  };

  const handleDeleteUser = async (userId: string) => {
      if (user?.role !== 'admin') throw new Error("Permission denied.");
      const response = await fetchWithAuth(`${API_BASE_URL}/users/${userId}`, { method: 'DELETE' }, token);
      
      if (!response.ok) await handleApiError(response);
      
      setUsers(prev => prev.filter(u => u._id !== userId));
  };
  
  const handleUpdateAttendance = (classId: string, date: string, studentId: string, status: AttendanceStatus) => {
      setAttendance(prev => ({
          ...prev, [classId]: { ...(prev[classId] || {}), [date]: { ...((prev[classId] && prev[classId][date]) || {}), [studentId]: status } }
      }));
  };
  
  const handleUpdateProfilePicture = (dataUrl: string) => {
    if (!user) return;
    const updatedUser = { ...user, profilePictureUrl: dataUrl };
    setUser(updatedUser);
    sessionStorage.setItem('user', JSON.stringify(updatedUser));
  };


  const handleResetData = async () => {
    if (user?.role !== 'admin') throw new Error("You don't have permission to perform this action.");

    setIsInitialLoad(true);
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/reset-data`, { method: 'POST' }, token);
        if (!response.ok) await handleApiError(response);
        
        const dataResponse = await fetchWithAuth(`${API_BASE_URL}/data`, {}, token);
        if (!dataResponse.ok) await handleApiError(dataResponse);

        const data = await dataResponse.json();
        setClasses(data.classes || []);
        setFaculty(data.faculty || []);
        setSubjects(data.subjects || []);
        setRooms(data.rooms || []);
        setStudents(data.students || []);
        setConstraints(getInitialConstraints());
        setChatMessages([]);
        setAttendance({});
        
        if (user?.role === 'admin') {
            const usersResponse = await fetchWithAuth(`${API_BASE_URL}/users`, {}, token);
            if(usersResponse.ok) setUsers(await usersResponse.json());
        }

        localStorage.removeItem('smartCampusShared');
    } finally {
        setIsInitialLoad(false);
    }
  };

  if (isInitialLoad && token) {
    return React.createElement(FullScreenLoader, { message: "Loading Campus Data..." });
  }

  // If user is not logged in, render only the login-related routes.
  // This structure ensures TypeScript knows `user` is null.
  if (!user) {
    return React.createElement(ReactRouterDOM.HashRouter, null,
      React.createElement(ReactRouterDOM.Routes, null,
        React.createElement(ReactRouterDOM.Route, { path: "/login", element: React.createElement(LoginPage, { onLogin: handleLogin }) }),
        React.createElement(ReactRouterDOM.Route, { path: "*", element: React.createElement(ReactRouterDOM.Navigate, { to: "/login" }) })
      )
    );
  }
  
  // If user is logged in, `user` is of type `User`. Render the authenticated app routes.
  return React.createElement(ReactRouterDOM.HashRouter, null,
    React.createElement(ReactRouterDOM.Routes, null,
      React.createElement(ReactRouterDOM.Route, { path: "/login", element: React.createElement(ReactRouterDOM.Navigate, { to: "/" }) }),
      React.createElement(ReactRouterDOM.Route, { path: "/", element: React.createElement(Dashboard, {
          user: user,
          onLogout: handleLogout,
          theme: theme,
          toggleTheme: toggleTheme,
          classes: classes,
          faculty: faculty,
          subjects: subjects,
          students: students,
          users: users,
          constraints: constraints,
          updateConstraints: setConstraints,
          chatMessages: chatMessages,
          onSendMessage: handleSendMessage,
          attendance: attendance,
          onUpdateAttendance: handleUpdateAttendance,
          onSaveEntity: handleSaveEntity,
          onDeleteEntity: handleDeleteEntity,
          onSaveUser: handleSaveUser,
          onDeleteUser: handleDeleteUser,
          token: token,
          onUpdateProfilePicture: handleUpdateProfilePicture
      }) }),
      React.createElement(ReactRouterDOM.Route, {
        path: "/scheduler",
        element: React.createElement(ProtectedRoute, { user: user, allowedRoles: ['admin'], children: 
          React.createElement(TimetableScheduler, {
              onLogout: handleLogout, theme: theme, toggleTheme: toggleTheme,
              classes, faculty, subjects, rooms, students,
              constraints, setConstraints,
              onSaveEntity: handleSaveEntity, onDeleteEntity: handleDeleteEntity, onResetData: handleResetData,
              token: token || ''
            })
        })
      }),
      React.createElement(ReactRouterDOM.Route, { path: "*", element: React.createElement(ReactRouterDOM.Navigate, { to: "/" }) })
    )
  );
};