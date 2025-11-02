





import React, { useState, useEffect, Suspense, lazy, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate, NavLink, Outlet } from 'react-router-dom';
import { LoginPage } from './features/auth/LoginPage';
import { LoadingIcon, LogoutIcon, MoonIcon, SunIcon, ProfileIcon, SchedulerIcon, StudentIcon, HomeIcon, AttendanceIcon, IMSIcon, SmartToolsIcon, AvailabilityIcon, RequestsIcon, NotificationsIcon, ChatIcon, UsersIcon, CalendarIcon, MeetingIcon, QueryIcon, NotificationBellIcon, AnalyticsIcon } from './components/Icons';
import { User } from './types';
import { AppProvider, useAppContext } from './context/AppContext';
import { SectionCard, Modal, FormField, TextInput, SelectInput, SearchInput, ErrorDisplay, FeedbackBanner } from './components/common';
// FIX: Changed to a default import for SmartClassroomLayout as it is a default export in its module.
import SmartClassroomLayout, { StudentManagementTab, UserManagementTab, AttendanceManagementTab, ChatbotControlTab, MyProfileTab } from './features/classroom/SmartClassroom';


// --- START: LAZY LOADED COMPONENTS FOR PERFORMANCE ---
const Dashboard = lazy(() => import('./features/dashboard/Dashboard'));
const TimetableScheduler = lazy(() => import('./features/scheduler/TimetableScheduler'));
const SmartClassroom = lazy(() => import('./features/classroom/SmartClassroom'));
const ModuleSelectionPage = lazy(() => import('./features/dashboard/ModuleSelectionPage'));
const TeacherDashboardLayout = lazy(() => import('./features/teacher/TeacherDashboardLayout'));
const TeacherAttendancePage = lazy(() => import('./features/teacher/TeacherAttendancePage'));
const IMSPageTeacher = lazy(() => import('./features/teacher/IMSPage'));
const SmartToolsPage = lazy(() => import('./features/teacher/SmartToolsPage'));
const AvailabilityPage = lazy(() => import('./features/teacher/AvailabilityPage'));
const RequestsPage = lazy(() => import('./features/teacher/RequestsPage'));
const NotificationsPageTeacher = lazy(() => import('./features/teacher/NotificationsPage'));
const TeacherChatPage = lazy(() => import('./features/teacher/TeacherChatPage'));
const TeacherChatboxPage = lazy(() => import('./features/teacher/TeacherChatboxPage'));
const TimetableGrid = lazy(() => import('./features/dashboard/TimetableGrid'));
const QueryPage = lazy(() => import('./features/query/QueryPage'));
const NotificationsCenterPage = lazy(() => import('./features/notifications/NotificationsCenterPage'));
// --- NEW: Import fully implemented module pages ---
const IMSPage = lazy(() => import('./features/ims/IMSPage'));
const CalendarPage = lazy(() => import('./features/calendar/CalendarPage'));
const MeetingsPage = lazy(() => import('./features/meetings/MeetingsPage'));


// --- SHARED UI COMPONENTS (MOVED TO components/common.tsx) ---

export const FullScreenLoader = ({ message }: { message: string }) => (
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
        { to: '/chat', icon: <ChatIcon className="h-5 w-5" />, label: 'Campus AI' },
        { to: '/chatbox', icon: <UsersIcon className="h-5 w-5" />, label: 'Chatbox' },
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

// FIX: Made children optional to handle cases where it might not be provided, preventing a TypeScript error.
const AppLayout = ({ children }: { children?: React.ReactNode }) => {
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
    const { 
        user, appState, classes, faculty, subjects, rooms, students, users, institutions,
        constraints, timetable, attendance, token, chatMessages, handleSaveEntity, handleDeleteEntity, 
        handleUpdateConstraints, handleSaveTimetable, handleSaveClassAttendance, 
        handleSaveUser, handleDeleteUser, handleResetData, handleAdminSendMessage, handleAdminAskAsStudent,
        handleAddCustomConstraint, handleUpdateCustomConstraint, handleDeleteCustomConstraint, handleUniversalImport
    } = useAppContext();

    useEffect(() => {
    }, [appState]);

    if (appState === 'loading') {
        return <FullScreenLoader message="Loading Campus Data..." />;
    }

    if (!user) return <Navigate to="/login" />;

    if (user.role === 'student') {
        return (
             <Routes>
                <Route path="/login" element={<Navigate to="/" />} />
                <Route path="*" element={<Dashboard />} />
            </Routes>
        );
    }
    
    return (
        <AppLayout>
            <Suspense fallback={<FullScreenLoader message="Loading Module..." />}>
                 <Routes>
                    {user.role === 'admin' && (
                        <>
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
                                onAddCustomConstraint={handleAddCustomConstraint}
                                onUpdateCustomConstraint={handleUpdateCustomConstraint}
                                onDeleteCustomConstraint={handleDeleteCustomConstraint}
                                onUniversalImport={handleUniversalImport}
                            />} />
                            <Route path="/smart-classroom" element={
                                <SmartClassroomLayout 
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
                                    onAdminAskAsStudent={handleAdminAskAsStudent}
                                >
                                    <Outlet />
                                </SmartClassroomLayout>
                            }>
                                <Route index element={<Navigate to="students" replace />} />
                                <Route path="students" element={<StudentManagementTab />} />
                                <Route path="users" element={<UserManagementTab />} />
                                <Route path="attendance" element={<AttendanceManagementTab />} />
                                <Route path="chat" element={<ChatbotControlTab />} />
                                <Route path="profile" element={<MyProfileTab />} />
                                <Route path="ims" element={<IMSPage />} />
                                <Route path="calendar" element={<CalendarPage />} />
                                <Route path="meetings" element={<MeetingsPage />} />
                                <Route path="query-management" element={<QueryPage />} />
                                <Route path="notification-center" element={<NotificationsCenterPage />} />
                            </Route>
                            <Route path="/" element={<ModuleSelectionPage user={user} />} />
                        </>
                    )}
                    {user.role === 'teacher' && (
                        <Route path="/" element={<TeacherDashboardLayout />}>
                             <Route index element={<TimetableGrid timetable={timetable} constraints={constraints} role="teacher" />} />
                             <Route path="attendance" element={<TeacherAttendancePage />} />
                             <Route path="ims" element={<IMSPageTeacher />} />
                             <Route path="smart-tools" element={<SmartToolsPage />} />
                             <Route path="availability" element={<AvailabilityPage />} />
                             <Route path="requests" element={<RequestsPage />} />
                             <Route path="notifications" element={<NotificationsPageTeacher />} />
                             <Route path="chat" element={<TeacherChatPage />} />
                             <Route path="chatbox" element={<TeacherChatboxPage />} />
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