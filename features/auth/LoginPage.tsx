import React, { useState } from 'react';
import { AdminIcon, TeacherIcon, StudentIcon, LoginIcon } from '../../components/Icons';

// === From features/auth/LoginPage.tsx ===
export const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [error, setError] = useState('');

  const credentials = {
    admin: { user: 'admin@university.edu', pass: 'admin123' },
    teacher: { user: 'teacher@university.edu', pass: 'teacher123' },
    student: { user: 'student@university.edu', pass: 'student123' },
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === credentials[role].user && password === credentials[role].pass) {
      setError('');
      onLogin(username, role);
    } else {
      setError('Invalid credentials. Please try again.');
    }
  };
  
  const handleFillDemo = () => {
      setUsername(credentials[role].user);
      setPassword(credentials[role].pass);
  };

  const UserTypeButton = ({ type, label, icon }) => (
    React.createElement("button", {
      type: "button",
      onClick: () => setRole(type),
      className: `flex-1 p-3 rounded-lg transition-all duration-300 ease-in-out flex items-center justify-center gap-2 text-sm md:text-base ${
        role === type ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-slate-700/50'
      }`
    }, icon, label)
  );

  return (
    React.createElement("div", { className: "min-h-screen flex items-center justify-center bg-transparent p-4" },
      React.createElement("div", { className: "w-full max-w-md bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl shadow-indigo-500/20 dark:shadow-indigo-900/50 p-8 border border-gray-200 dark:border-slate-700" },
        React.createElement("div", { className: "text-center mb-8" },
          React.createElement("h1", { className: "text-3xl font-bold text-gray-800 dark:text-gray-100" }, "Smart Campus Scheduler"),
          React.createElement("p", { className: "text-gray-500 dark:text-gray-400 mt-2" }, "AI-Powered Timetable Management")
        ),
        React.createElement("div", { className: "bg-gray-200/50 dark:bg-slate-900/50 rounded-xl p-1.5 flex gap-1.5 mb-6" },
          React.createElement(UserTypeButton, { type: "admin", label: "Admin", icon: React.createElement(AdminIcon, null) }),
          React.createElement(UserTypeButton, { type: "teacher", label: "Teacher", icon: React.createElement(TeacherIcon, null) }),
          React.createElement(UserTypeButton, { type: "student", label: "Student", icon: React.createElement(StudentIcon, null) })
        ),
        error && React.createElement("div", { className: "bg-red-500/10 dark:bg-red-900/50 border border-red-500/50 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mb-4", role: "alert" }, error),
        React.createElement("form", { onSubmit: handleSubmit, className: "space-y-6" },
          React.createElement("div", null,
            React.createElement("label", { htmlFor: "username", className: "block text-sm font-medium text-gray-600 dark:text-gray-300" }, "Username / Email"),
            React.createElement("input", {
              type: "text",
              id: "username",
              value: username,
              onChange: (e) => setUsername(e.target.value),
              className: "mt-1 block w-full px-4 py-3 bg-white/50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition",
              required: true
            })
          ),
          React.createElement("div", null,
            React.createElement("label", { htmlFor: "password", className: "block text-sm font-medium text-gray-600 dark:text-gray-300" }, "Password"),
            React.createElement("input", {
              type: "password",
              id: "password",
              value: password,
              onChange: (e) => setPassword(e.target.value),
              className: "mt-1 block w-full px-4 py-3 bg-white/50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition",
              required: true
            })
          ),
          React.createElement("div", { className: "flex flex-col gap-4" },
            React.createElement("button", {
              type: "submit",
              className: "w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-semibold transition-transform transform hover:scale-105"
            }, React.createElement(LoginIcon, null), " Login"),
            React.createElement("button", {
                type: "button",
                onClick: handleFillDemo,
                className: "w-full py-3 px-4 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-semibold transition"
            }, "Fill Demo Credentials")
          )
        )
      )
    )
  );
};
