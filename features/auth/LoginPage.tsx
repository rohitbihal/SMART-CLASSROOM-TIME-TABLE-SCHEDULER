
import React, { useState } from 'react';
import { AdminIcon, TeacherIcon, StudentIcon, LoginIcon } from '../../components/Icons';
import { User } from '../../types';

const API_BASE_URL = '/api';

interface LoginPageProps {
  onLogin: (user: User, token: string) => void;
}

interface UserTypeButtonProps {
    type: string;
    label: string;
    icon: React.ReactNode;
}

export const LoginPage = ({ onLogin }: LoginPageProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const demoCredentials: { [key: string]: { user: string; pass: string } } = {
    admin: { user: 'admin@university.edu', pass: 'admin123' },
    teacher: { user: 'teacher@university.edu', pass: 'teacher123' },
    student: { user: 'student@university.edu', pass: 'student123' },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role }),
        });
        
        if (!response.ok) {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Login failed');
            } else {
                throw new Error('Login failed: An unexpected server error occurred.');
            }
        }
        
        const { token, user } = await response.json();
        onLogin(user, token);

    } catch (err: unknown) {
        if (err instanceof TypeError && err.message === 'Failed to fetch') {
            setError('Could not connect to the server. Please check your network and ensure the backend is running.');
        } else {
            const serverMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            if (serverMessage.toLowerCase().includes('credential')) {
                 setError('Login failed. Please double-check your email, password, and selected role.');
            } else {
                 setError(`Login failed: ${serverMessage}`);
            }
        }
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleFillDemo = () => {
      setUsername(demoCredentials[role].user);
      setPassword(demoCredentials[role].pass);
  };

  const UserTypeButton = ({ type, label, icon }: UserTypeButtonProps) => (
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
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value),
              className: "mt-1 block w-full px-4 py-3 bg-white/50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition",
              required: true,
              disabled: isLoading
            })
          ),
          React.createElement("div", null,
            React.createElement("label", { htmlFor: "password", className: "block text-sm font-medium text-gray-600 dark:text-gray-300" }, "Password"),
            React.createElement("input", {
              type: "password",
              id: "password",
              value: password,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
              className: "mt-1 block w-full px-4 py-3 bg-white/50 dark:bg-slate-900/50 border border-gray-300 dark:border-slate-700 text-gray-800 dark:text-gray-100 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition",
              required: true,
              disabled: isLoading
            })
          ),
          React.createElement("div", { className: "flex flex-col gap-4" },
            React.createElement("button", {
              type: "submit",
              className: "w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-semibold transition-transform transform hover:scale-105 disabled:bg-indigo-400 disabled:cursor-not-allowed",
              disabled: isLoading
            }, isLoading ? 'Logging in...' : React.createElement(React.Fragment, null, React.createElement(LoginIcon, null), " Login")),
            React.createElement("button", {
                type: "button",
                onClick: handleFillDemo,
                className: "w-full py-3 px-4 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-semibold transition",
                disabled: isLoading
            }, "Fill Demo Credentials")
          )
        )
      )
    )
  );
};
