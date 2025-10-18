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
  const [view, setView] = useState<'login' | 'forgotPassword'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [forgotPasswordState, setForgotPasswordState] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
    step: 'email' as 'email' | 'otp'
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

  const handleSendResetRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordState.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotPasswordState.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    clearMessages();
    setIsLoading(true);
    // Mock OTP sending
    setTimeout(() => {
      setIsLoading(false);
      setMessage('A password reset OTP has been sent to your email address.');
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
      setForgotPasswordState({ email: '', otp: '', newPassword: '', confirmPassword: '', step: 'email' });
    }, 1500);
  };

  const UserTypeButton = ({ type, label, icon }: UserTypeButtonProps) => (
    <button
      type="button"
      onClick={() => { setRole(type); clearMessages(); }}
      className={`flex-1 p-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm md:text-base font-semibold ${
        role === type ? 'bg-accent-primary text-accent-text' : 'bg-bg-tertiary text-text-primary hover:bg-border-primary'
      }`}
    >
        {icon}
        {label}
    </button>
  );

  const renderLoginForm = () => (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Smart Campus Portal</h1>
        <p className="text-text-secondary mt-2">Sign in as {capitalRole}</p>
      </div>
      <div className="bg-bg-primary rounded-xl p-1 flex gap-1 mb-6">
        <UserTypeButton type="admin" label="Admin" icon={<AdminIcon />} />
        <UserTypeButton type="teacher" label="Teacher" icon={<TeacherIcon />} />
        <UserTypeButton type="student" label="Student" icon={<StudentIcon />} />
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-text-secondary mb-1.5">Username/Email</label>
          <input type="text" id="username" name="username" placeholder="Enter your username or email" value={username} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)} className="input-base" required disabled={isLoading} />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1.5">Password</label>
          <input type="password" id="password" name="password" placeholder="Enter your password" value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} className="input-base" required disabled={isLoading} />
        </div>
        <div className="text-right">
          <button type="button" onClick={() => { setView('forgotPassword'); clearMessages(); }} className="text-sm text-accent-primary hover:underline font-medium" disabled={isLoading}>Forgot Password?</button>
        </div>
        <div className="flex flex-col gap-4 pt-2">
          <button type="submit" className="btn-primary w-full flex justify-center items-center gap-2 py-3" disabled={isLoading}>
            <LoginIcon />
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
           <div className="text-center">
              <button type="button" onClick={handleFillDemo} className="text-sm text-text-secondary hover:text-accent-primary font-medium transition disabled:opacity-50" disabled={isLoading}>Use Demo Credentials</button>
          </div>
        </div>
      </form>
    </div>
  );
  
  const renderForgotPasswordForm = () => (
    <div>
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mt-4">Reset Password</h2>
          <p className="text-text-secondary mt-2">{forgotPasswordState.step === 'email' ? 'Enter your email to receive an OTP.' : 'Enter the OTP and your new password.'}</p>
        </div>
        {forgotPasswordState.step === 'email' ?
            <form onSubmit={handleSendResetRequest} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-text-secondary">Email Address</label>
                  <input type="email" id="email" name="email" placeholder="Enter your registered email" value={forgotPasswordState.email} onChange={handleForgotPasswordChange} className="input-base mt-1" required disabled={isLoading} />
                </div>
                <button type="submit" className="btn-primary w-full py-3" disabled={isLoading}>{isLoading ? 'Sending OTP...' : 'Send OTP'}</button>
            </form>
        :
            <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                    <label htmlFor="otp" className="block text-sm font-medium text-text-secondary">OTP Code</label>
                    <input id="otp" type="text" name="otp" placeholder="Enter OTP from email" value={forgotPasswordState.otp} onChange={handleForgotPasswordChange} className="input-base mt-1" required disabled={isLoading} />
                </div>
                 <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-text-secondary">New Password</label>
                    <input id="newPassword" type="password" name="newPassword" placeholder="New Password" value={forgotPasswordState.newPassword} onChange={handleForgotPasswordChange} className="input-base mt-1" required disabled={isLoading} />
                </div>
                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary">Confirm New Password</label>
                    <input id="confirmPassword" type="password" name="confirmPassword" placeholder="Confirm New Password" value={forgotPasswordState.confirmPassword} onChange={handleForgotPasswordChange} className="input-base mt-1" required disabled={isLoading} />
                </div>
                <button type="submit" className="btn-primary w-full py-3" disabled={isLoading}>{isLoading ? 'Resetting...' : 'Reset Password'}</button>
            </form>
        }
        <div className="text-center mt-6">
            <button type="button" onClick={() => { setView('login'); clearMessages(); }} className="text-sm text-accent-primary hover:underline font-medium" disabled={isLoading}>Back to Login</button>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-bg-secondary rounded-xl shadow-lg p-8 border border-border-primary">
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-600 px-4 py-3 rounded-lg relative mb-4" role="alert">{error}</div>}
        {message && <div className="bg-green-500/10 border border-green-500/30 text-green-600 px-4 py-3 rounded-lg relative mb-4" role="alert">{message}</div>}
        {view === 'login' ? renderLoginForm() : renderForgotPasswordForm()}
      </div>
    </div>
  );
};