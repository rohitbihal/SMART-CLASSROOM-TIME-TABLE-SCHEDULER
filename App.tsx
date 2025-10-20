import React, { useState, useEffect, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { LoginPage } from './features/auth/LoginPage';
import { LoadingIcon, LogoutIcon, MoonIcon, SunIcon, ProfileIcon, SchedulerIcon, StudentIcon, HomeIcon, AttendanceIcon, IMSIcon, SmartToolsIcon, AvailabilityIcon, RequestsIcon, NotificationsIcon, ChatIcon } from './components/Icons';
import { User } from './types';
import { AppProvider, useAppContext } from './context/AppContext';

// --- START: LAZY LOADED COMPONENTS FOR PERFORMANCE ---
const Dashboard = lazy(() => import('./features/dashboard/Dashboard').then(module => ({ default: module.Dashboard })));
const TimetableScheduler = lazy(() => import('./features/scheduler/TimetableScheduler').then(module => ({ default: module.TimetableScheduler })));
const SmartClassroom = lazy(() => import('./features/classroom/SmartClassroom').then(module => ({ default: module.SmartClassroom })));
const ModuleSelectionPage = lazy(() => import('./features/dashboard/ModuleSelectionPage').then(module => ({ default: module.ModuleSelectionPage })));
const TeacherDashboardLayout = lazy(() => import('./features/teacher/TeacherDashboardLayout').then(module => ({ default: module.TeacherDashboardLayout })));
const TeacherAttendancePage = lazy(() => import('./features/teacher/TeacherAttendancePage').then(module => ({ default: module.TeacherAttendancePage })));
const IMSPage = lazy(() => import('./features/teacher/IMSPage').then(module => ({ default: module.IMSPage })));
const SmartToolsPage = lazy(() => import('./features/teacher/SmartToolsPage').then(module => ({ default: module.SmartToolsPage })));
const AvailabilityPage = lazy(() => import('./features/teacher/AvailabilityPage').then(module => ({ default: module.AvailabilityPage })));
const RequestsPage = lazy(() => import('./features/teacher/RequestsPage').then(module => ({ default: module.RequestsPage })));
const NotificationsPage = lazy(() => import('./features/teacher/NotificationsPage').then(module => ({ default: module.NotificationsPage })));
const TeacherChatPage = lazy(() => import('./features/teacher/TeacherChatPage').then(module => ({ default: module.TeacherChatPage })));
const TimetableGrid = lazy(() => import('./features/dashboard/TimetableGrid').then(module => ({ default: module.TimetableGrid })));

// FIX: Added and exported shared UI components that were missing, causing import errors.
// --- START: SHARED UI COMPONENTS ---
export const SectionCard = ({ title, actions, children, className }: { title: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) => (
    <div className={`bg-bg-secondary border border-border-primary rounded-xl shadow-sm ${className}`}>
        <div className="flex items-center justify-between p-4 border-b border-border-primary">
            <h2 className="text-lg font-bold">{title}</h2>
            {actions && <div>{actions}</div>}
        </div>
        <div className="p-4">{children}</div>
    </div>
);

export const Modal = ({ isOpen, onClose, title, children, size = '2xl', error }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl'; error?: string | null }) => {
    if (!isOpen) return null;
    const sizeClasses: {[key: string]: string} = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-lg', xl: 'sm:max-w-xl', '2xl': 'sm:max-w-2xl', '3xl': 'sm:max-w-3xl', '4xl': 'sm:max-w-4xl', '5xl': 'sm:max-w-5xl', '6xl': 'sm:max-w-6xl', '7xl': 'sm:max-w-7xl' };
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className={`inline-block align-bottom bg-bg-secondary rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full ${sizeClasses[size]}`}>
                    <div className="bg-bg-secondary px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-text-primary" id="modal-title">{title}</h3>
                                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-3" role="alert">{error}</div>}
                                <div className="mt-4">
                                    {children}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const FormField = ({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) => (
    <div>
        <label htmlFor={htmlFor} className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
        {children}
    </div>
);

export const TextInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className={`input-base ${props.className || ''}`} />
);

export const SelectInput = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select {...props} className={`input-base ${props.className || ''}`}>
        {props.children}
    </select>
);

export const SearchInput = ({ value, onChange, placeholder, label, id }: { value: string; onChange: (value: string) => void; placeholder?: string; label: string; id: string }) => (
    <div className="relative">
        <label htmlFor={id} className="sr-only">{label}</label>
        <input
            id={id}
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "Search..."}
            className="w-full pl-10 pr-4 py-2 border border-border-primary rounded-md bg-bg-primary focus:ring-accent-primary focus:border-accent-primary"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
        </div>
    </div>
);

export const ErrorDisplay = ({ message }: { message: string | null }) => {
    if (!message) return null;
    return (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{message}</span>
        </div>
    );
};

export const FeedbackBanner = ({ feedback, onDismiss }: { feedback: { type: 'success' | 'error', message: string } | null, onDismiss: () => void }) => {
    if (!feedback) return null;
    const isSuccess = feedback.type === 'success';
    const baseClasses = 'fixed top-5 right-5 z-50 p-4 rounded-lg shadow-lg flex items-center gap-3';
    const colorClasses = isSuccess
        ? 'bg-green-100 dark:bg-green-900/50 border border-green-400 dark:border-green-600 text-green-800 dark:text-green-200'
        : 'bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-600 text-red-800 dark:text-red-200';

    return (
        <div className={`${baseClasses} ${colorClasses}`}>
            <span>{feedback.message}</span>
            <button onClick={onDismiss} className="text-xl font-bold">&times;</button>
        </div>
    );
};
// --- END: SHARED UI COMPONENTS ---

const FullScreenLoader = ({ message }: { message: string }) => (
    <div className="fixed inset-0 bg-bg-primary flex flex-col items-center justify-center z-50">
        <LoadingIcon />
        <p className="mt-4 text-lg text-text-secondary font-medium">{message}</p>
    </div>
);

// --- START: REFACTORED LAYOUT COMPONENTS ---

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; }> = React.memo(({ to, icon, label }) => (
    <NavLink
        to={to}
        end={to === '/'}
        className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                isActive
                    ? 'bg-accent-primary text-accent-text'
                    : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
            }`
        }
    >
        {icon}
        <span className="flex-1">{label}</span>
    </NavLink>
));

const Sidebar = React.memo(() => {
    const { user, logout, theme, toggleTheme } = useAppContext();
    if (!user) return null;

    const adminNavLinks = [
        { to: '/', icon: <HomeIcon className="h-5 w-5" />, label: 'Dashboard' },
        { to: '/scheduler', icon: <SchedulerIcon className="h-5 w-5" />, label: 'Timetable Scheduler' },
        { to: '/smart-classroom', icon: <StudentIcon className="h-5 w-5" />, label: 'Smart Classroom' },
    ];

    const teacherNavLinks = [
        { to: '/', icon: <SchedulerIcon className="h-5 w-5" />, label: 'My Timetable' },
        { to: '/attendance', icon: <AttendanceIcon className="h-5 w-5" />, label: 'Attendance' },
        { to: '/ims', icon: <IMSIcon className="h-5 w-5" />, label: 'IMS' },
        { to: '/smart-tools', icon: <SmartToolsIcon className="h-5 w-5" />, label: 'Smart Tools' },
        { to: '/availability', icon: <AvailabilityIcon className="h-5 w-5" />, label: 'Availability' },
        { to: '/requests', icon: <RequestsIcon className="h-5 w-5" />, label: 'Requests' },
        { to: '/notifications', icon: <NotificationsIcon className="h-5 w-5" />, label: 'Notifications' },
        { to: '/chat', icon: <ChatIcon className="h-5 w-5" />, label: 'Chat' },
    ];

    const navLinks = user.role === 'admin' ? adminNavLinks : teacherNavLinks;

    return (
        <aside className="w-64 flex-shrink-0 bg-bg-secondary border-r border-border-primary flex flex-col p-4">
            <div className="flex items-center gap-3 mb-10 p-2">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-slate-700 flex items-center justify-center">
                    <ProfileIcon className="h-6 w-6 text-accent-primary" />
                </div>
                <div>
                    <p className="font-bold capitalize">{user.role}</p>
                    <p className="text-xs text-text-secondary">{user.username}</p>
                </div>
            </div>
            <nav className="flex-grow space-y-2">
                {navLinks.map(link => <NavItem key={link.to} {...link} />)}
            </nav>
            <div className="mt-auto pt-4 border-t border-border-primary flex items-center justify-between">
                 <button onClick={toggleTheme} className="btn-secondary p-2.5">{theme === 'dark' ? <SunIcon /> : <MoonIcon />}</button>
                 <button onClick={logout} className="btn-secondary flex items-center gap-2"><LogoutIcon /> Logout</button>
            </div>
        </aside>
    );
});

const AppLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-8">
                {children}
            </main>
        </div>
    );
};
// --- END: REFACTORED LAYOUT COMPONENTS ---


const AuthenticatedApp = () => {
    // FIX: Destructured all necessary data and handlers from context to pass down as props.
    const { 
        user, appState, classes, faculty, subjects, rooms, students, users, institutions,
        constraints, timetable, attendance, token, chatMessages, handleSaveEntity, handleDeleteEntity, 
        handleUpdateConstraints, handleSaveTimetable, handleSaveClassAttendance, 
        handleSaveUser, handleDeleteUser, handleResetData, handleAdminSendMessage 
    } = useAppContext();

    useEffect(() => {
        // This effect can be used for any actions needed after user is authenticated
        // and initial data is loaded.
    }, [appState]);

    if (appState === 'loading') {
        return <FullScreenLoader message="Loading Campus Data..." />;
    }

    if (!user) return <Navigate to="/login" />;

    // --- STUDENT ROUTING ---
    if (user.role === 'student') {
        return (
             <Routes>
                <Route path="/login" element={<Navigate to="/" />} />
                <Route path="*" element={<Dashboard />} />
            </Routes>
        );
    }
    
    // --- ADMIN & TEACHER ROUTING ---
    return (
        <AppLayout>
            <Suspense fallback={<FullScreenLoader message="Loading Module..." />}>
                 <Routes>
                    {user.role === 'admin' && (
                        <>
                            {/* FIX: Passed all required props to TimetableScheduler. */}
                            <Route path="/scheduler" element={<TimetableScheduler 
                                classes={classes}
                                faculty={faculty}
                                subjects={subjects}
                                rooms={rooms}
                                students={students}
                                institutions={institutions}
                                constraints={constraints}
                                timetable={timetable}
                                setConstraints={handleUpdateConstraints}
                                onSaveEntity={handleSaveEntity}
                                onDeleteEntity={handleDeleteEntity}
                                onResetData={handleResetData}
                                token={token || ''}
                                onSaveTimetable={handleSaveTimetable}
                            />} />
                            {/* FIX: Passed all required props to SmartClassroom. */}
                            <Route path="/smart-classroom" element={<SmartClassroom 
                                user={user}
                                classes={classes}
                                faculty={faculty}
                                students={students}
                                users={users}
                                attendance={attendance}
                                constraints={constraints}
                                chatMessages={chatMessages}
                                onSaveEntity={handleSaveEntity}
                                onDeleteEntity={handleDeleteEntity}
                                onSaveUser={handleSaveUser}
                                onDeleteUser={handleDeleteUser}
                                onSaveClassAttendance={handleSaveClassAttendance}
                                onUpdateConstraints={handleUpdateConstraints}
                                onAdminSendMessage={handleAdminSendMessage}
                            />} />
                            {/* FIX: Passed user prop to ModuleSelectionPage. */}
                            <Route path="/" element={<ModuleSelectionPage user={user} />} />
                        </>
                    )}
                    {user.role === 'teacher' && (
                        <Route path="/" element={<TeacherDashboardLayout />}>
                             {/* FIX: Passed timetable and constraints props to TimetableGrid. */}
                             <Route index element={<TimetableGrid timetable={timetable} constraints={constraints} role="teacher" />} />
                             <Route path="attendance" element={<TeacherAttendancePage />} />
                             <Route path="ims" element={<IMSPage />} />
                             <Route path="smart-tools" element={<SmartToolsPage />} />
                             <Route path="availability" element={<AvailabilityPage />} />
                             <Route path="requests" element={<RequestsPage />} />
                             <Route path="notifications" element={<NotificationsPage />} />
                             <Route path="chat" element={<TeacherChatPage />} />
                        </Route>
                    )}
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </Suspense>
        </AppLayout>
    );
};

const AppRoutes = () => {
    const { user, token, appState } = useAppContext();
    const [authChecked, setAuthChecked] = useState(false);

    useEffect(() => {
        // This ensures we don't flash the login page while checking session storage.
        if (appState !== 'loading') {
            setAuthChecked(true);
        }
    }, [appState]);

    if (!authChecked) {
        return <FullScreenLoader message="Initializing..." />;
    }
    
    return (
        <Routes>
            {!user || !token ? (
                 <>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="*" element={<Navigate to="/login" />} />
                </>
            ) : (
                <Route path="*" element={<AuthenticatedApp />} />
            )}
        </Routes>
    );
}


export const App = () => {
    return (
      <AppProvider>
        <HashRouter>
            <ThemedApp />
        </HashRouter>
      </AppProvider>
    );
};

const ThemedApp = () => {
    const { theme } = useAppContext();
    useEffect(() => {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
      localStorage.setItem('app_theme', theme);
    }, [theme]);

    return <AppRoutes />;
};