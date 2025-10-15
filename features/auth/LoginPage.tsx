import React, { useState } from 'react';
import { AdminIcon, TeacherIcon, StudentIcon, LoginIcon } from '../../components/Icons.tsx';
import { User } from '../../types.ts';

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
  const [view, setView] = useState<'login' | 'forgotPassword'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [forgotPasswordState, setForgotPasswordState] = useState({
    mobile: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
    step: 'mobile' as 'mobile' | 'otp'
  });

  const demoCredentials: { [key: string]: { user: string; pass: string } } = {
    admin: { user: 'admin@university.edu', pass: 'admin123' },
    teacher: { user: 'teacher@university.edu', pass: 'teacher123' },
    student: { user: 'student@university.edu', pass: 'student123' },
  };
    
  const capitalRole = role.charAt(0).toUpperCase() + role.slice(1);
  const clearMessages = () => { setError(''); setMessage(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
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
      clearMessages();
      setUsername(demoCredentials[role].user);
      setPassword(demoCredentials[role].pass);
  };
  
  const handleForgotPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForgotPasswordState(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordState.mobile || !/^\d{10}$/.test(forgotPasswordState.mobile)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    clearMessages();
    setIsLoading(true);
    // Mock OTP sending
    setTimeout(() => {
      setIsLoading(false);
      setMessage('A mock OTP has been sent to your mobile number.');
      setForgotPasswordState(prev => ({ ...prev, step: 'otp' }));
    }, 1500);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const { otp, newPassword, confirmPassword } = forgotPasswordState;
    if (!otp || otp.length < 4) { setError('Please enter a valid OTP.'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters long.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }

    clearMessages();
    setIsLoading(true);
    // Mock password reset
    setTimeout(() => {
      setIsLoading(false);
      setMessage('Your password has been reset successfully. Please log in with your new password.');
      setView('login');
      setForgotPasswordState({ mobile: '', otp: '', newPassword: '', confirmPassword: '', step: 'mobile' });
    }, 1500);
  };

  const UserTypeButton = ({ type, label, icon }: UserTypeButtonProps) => (
    React.createElement("button", {
      type: "button",
      onClick: () => { setRole(type); clearMessages(); },
      className: `flex-1 p-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm md:text-base ${
        role === type ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600'
      }`
    }, icon, label)
  );

  const renderLoginForm = () => (
    React.createElement("div", null,
      React.createElement("div", { className: "text-center mb-8" },
        React.createElement("h1", { className: "text-3xl font-bold text-gray-800 dark:text-gray-100" }, "Smart Timetable Scheduler"),
        React.createElement("p", { className: "text-gray-500 dark:text-gray-400 mt-2" }, `${capitalRole} Login`)
      ),
      React.createElement("div", { className: "bg-gray-100 dark:bg-slate-900 rounded-lg p-1 flex gap-1 mb-6" },
        React.createElement(UserTypeButton, { type: "admin", label: "Admin", icon: React.createElement(AdminIcon, null) }),
        React.createElement(UserTypeButton, { type: "teacher", label: "Teacher", icon: React.createElement(TeacherIcon, null) }),
        React.createElement(UserTypeButton, { type: "student", label: "Student", icon: React.createElement(StudentIcon, null) })
      ),
      React.createElement("form", { onSubmit: handleSubmit, className: "space-y-6" },
        React.createElement("div", null,
          React.createElement("label", { htmlFor: "username", className: "block text-sm font-medium text-gray-600 dark:text-gray-300" }, "Username/Email"),
          React.createElement("input", { type: "text", id: "username", placeholder: "Enter your username or email", value: username, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value), className: "mt-1 block w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-800 dark:text-gray-100 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500", required: true, disabled: isLoading })
        ),
        React.createElement("div", null,
          React.createElement("label", { htmlFor: "password", className: "block text-sm font-medium text-gray-600 dark:text-gray-300" }, "Password"),
          React.createElement("input", { type: "password", id: "password", placeholder: "Enter your password", value: password, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value), className: "mt-1 block w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-800 dark:text-gray-100 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500", required: true, disabled: isLoading })
        ),
        React.createElement("div", { className: "text-right" },
          React.createElement("button", { type: "button", onClick: () => { setView('forgotPassword'); clearMessages(); }, className: "text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium", disabled: isLoading }, "Forgot Password?")
        ),
        React.createElement("div", { className: "flex flex-col gap-4" },
          React.createElement("button", { type: "submit", className: "w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed", disabled: isLoading }, React.createElement(LoginIcon, null), isLoading ? 'Logging in...' : 'Login'),
           React.createElement("div", { className: "text-center" },
              React.createElement("button", { type: "button", onClick: handleFillDemo, className: "text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition disabled:opacity-50", disabled: isLoading }, "ⓘ Demo Credentials")
          )
        )
      )
    )
  );
  
  const renderForgotPasswordForm = () => (
    React.createElement("div", null,
        React.createElement("div", { className: "text-center mb-8" },
          React.createElement("h2", { className: "text-3xl font-bold text-gray-800 dark:text-gray-100 mt-4" }, "Reset Password"),
          React.createElement("p", { className: "text-gray-500 dark:text-gray-400 mt-2" }, forgotPasswordState.step === 'mobile' ? 'Enter your mobile number to receive an OTP.' : 'Enter the OTP and your new password.')
        ),
        forgotPasswordState.step === 'mobile' ?
            React.createElement("form", { onSubmit: handleSendOtp, className: "space-y-6" },
                React.createElement("div", null,
                  React.createElement("label", { htmlFor: "mobile", className: "block text-sm font-medium text-gray-600 dark:text-gray-300" }, "Mobile Number"),
                  React.createElement("input", { type: "tel", id: "mobile", name: "mobile", placeholder: "10-digit mobile number", value: forgotPasswordState.mobile, onChange: handleForgotPasswordChange, className: "mt-1 block w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-800 dark:text-gray-100 rounded-lg", required: true, disabled: isLoading })
                ),
                React.createElement("button", { type: "submit", className: "w-full flex justify-center py-3 px-4 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 font-semibold disabled:opacity-50", disabled: isLoading }, isLoading ? 'Sending OTP...' : 'Send OTP')
            )
        :
            React.createElement("form", { onSubmit: handleResetPassword, className: "space-y-4" },
                React.createElement("input", { type: "text", name: "otp", placeholder: "Enter OTP", value: forgotPasswordState.otp, onChange: handleForgotPasswordChange, className: "block w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg", required: true, disabled: isLoading }),
                React.createElement("input", { type: "password", name: "newPassword", placeholder: "New Password", value: forgotPasswordState.newPassword, onChange: handleForgotPasswordChange, className: "block w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg", required: true, disabled: isLoading }),
                React.createElement("input", { type: "password", name: "confirmPassword", placeholder: "Confirm New Password", value: forgotPasswordState.confirmPassword, onChange: handleForgotPasswordChange, className: "block w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg", required: true, disabled: isLoading }),
                React.createElement("button", { type: "submit", className: "w-full flex justify-center py-3 px-4 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 font-semibold disabled:opacity-50", disabled: isLoading }, isLoading ? 'Resetting...' : 'Reset Password')
            ),
        React.createElement("div", { className: "text-center mt-6" },
            React.createElement("button", { type: "button", onClick: () => { setView('login'); clearMessages(); }, className: "text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium", disabled: isLoading }, "Back to Login")
        )
    )
  );

  return (
    React.createElement("div", { className: "min-h-screen flex items-center justify-center bg-transparent p-4" },
      React.createElement("div", { className: "w-full max-w-md bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-slate-700" },
        error && React.createElement("div", { className: "bg-red-500/10 dark:bg-red-900/50 border border-red-500/50 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative mb-4", role: "alert" }, error),
        message && React.createElement("div", { className: "bg-green-500/10 dark:bg-green-900/50 border border-green-500/50 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg relative mb-4", role: "alert" }, message),
        view === 'login' ? renderLoginForm() : renderForgotPasswordForm()
      )
    )
  );
};