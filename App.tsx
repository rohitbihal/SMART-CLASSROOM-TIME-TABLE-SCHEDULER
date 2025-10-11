
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './features/auth/LoginPage';
import { Dashboard } from './features/dashboard/Dashboard';
import { TimetableScheduler } from './features/scheduler/TimetableScheduler';
import { LoadingIcon } from './components/Icons';

const API_BASE_URL = 'http://localhost:3001';

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
  
  // App-wide state for data
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [classes, setClasses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [constraints, setConstraints] = useState({
      maxConsecutiveClasses: 3,
      workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      lunchBreak: "12:50-01:35",
      classSpecific: [],
      maxConcurrentClassesPerDept: {},
  });

  // Fetch initial data from the backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`${API_BASE_URL}/data`);
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        const data = await response.json();
        setClasses(data.classes || []);
        setFaculty(data.faculty || []);
        setSubjects(data.subjects || []);
        setRooms(data.rooms || []);
        setConstraints(data.constraints || {});
      } catch (e) {
        setError(`Could not connect to the backend server. Please ensure it's running on ${API_BASE_URL}. Error: ${e.message}`);
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);
  
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

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

  if (isLoading) {
    return React.createElement(FullScreenLoader, { message: "Loading scheduler data..." });
  }

  if (error) {
    return React.createElement("div", { className: "fixed inset-0 bg-red-50 dark:bg-red-900/50 flex items-center justify-center p-8" },
        React.createElement("div", { className: "text-center" },
            React.createElement("h1", { className: "text-2xl font-bold text-red-800 dark:text-red-200" }, "Connection Error"),
            React.createElement("p", { className: "mt-2 text-red-600 dark:text-red-300" }, error)
        )
    );
  }

  return (
    React.createElement(HashRouter, null,
      React.createElement(Routes, null,
        React.createElement(Route, {
          path: "/login",
          element: user ? React.createElement(Navigate, { to: "/" }) : React.createElement(LoginPage, { onLogin: handleLogin })
        }),
        React.createElement(Route, {
          path: "/",
          element: user ? React.createElement(Dashboard, { user: user, onLogout: handleLogout, theme: theme, toggleTheme: toggleTheme, classes: classes, faculty: faculty, subjects: subjects }) : React.createElement(Navigate, { to: "/login" })
        }),
        React.createElement(Route, {
          path: "/scheduler",
          element: user && user.role === 'admin'
            ? React.createElement(TimetableScheduler, {
                onLogout: handleLogout,
                theme: theme,
                toggleTheme: toggleTheme,
                classes, setClasses,
                faculty, setFaculty,
                subjects, setSubjects,
                rooms, setRooms,
                constraints, setConstraints,
                apiBaseUrl: API_BASE_URL
              })
            : React.createElement(Navigate, { to: "/" })
        }),
        React.createElement(Route, { path: "*", element: React.createElement(Navigate, { to: user ? "/" : "/login" }) })
      )
    )
  );
};
