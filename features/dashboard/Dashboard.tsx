

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import {
    LogoutIcon, MoonIcon, SchedulerIcon, StudentIcon, SunIcon, ChatIcon, ProfileIcon, UploadIcon, IMSIcon, SmartToolsIcon, BookOpenIcon, NotificationsIcon, ExamsIcon, ExtrasIcon, AvailabilityIcon, RequestsIcon, AttendanceIcon
} from '../../components/Icons.tsx';
import { DAYS, TIME_SLOTS } from '../../constants.ts';
import { TimetableEntry, User, Class, Subject, Student, Faculty, Attendance, AttendanceStatus } from '../../types.ts';

interface DashboardProps {
    user: User; onLogout: () => void; theme: string; toggleTheme: () => void;
    onUpdateProfilePicture: (dataUrl: string) => void;
    timetable: TimetableEntry[];
    classes: Class[]; subjects: Subject[]; students: Student[]; faculty: Faculty[];
    attendance: Attendance; onUpdateAttendance: (classId: string, date: string, studentId: string, status: AttendanceStatus) => void;
}
interface HeaderProps { user: User; title: string; subtitle: string; onLogout: () => void; theme: string; toggleTheme: () => void; onProfileClick: () => void; }
interface ProfilePictureModalProps { isOpen: boolean; onClose: () => void; onSave: (dataUrl: string) => void; currentUser: User; }
interface ModalProps { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode; error?: string | null; }
interface TimetableGridProps { timetable: TimetableEntry[]; role?: 'student' | 'teacher'; }

const Modal = ({ isOpen, onClose, title, children = null, error = null }: ModalProps) => !isOpen ? null : (
    React.createElement("div", { className: "fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4", "aria-modal": true, role: "dialog" },
        React.createElement("div", { className: "bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" },
            React.createElement("div", { className: "flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700" },
                React.createElement("h2", { className: "text-lg font-bold text-gray-800 dark:text-gray-100" }, title),
                React.createElement("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" }, React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-6 w-6", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" }, React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" })))
            ),
            React.createElement("div", { className: "p-6 overflow-y-auto" }, children)
        )
    )
);

const ProfilePictureModal = ({ isOpen, onClose, onSave, currentUser }: ProfilePictureModalProps) => {
    const [imageSrc, setImageSrc] = useState<string | null>(currentUser.profilePictureUrl || null); const fileInputRef = useRef<HTMLInputElement>(null); const [error, setError] = useState<string | null>(null);
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 2 * 1024 * 1024) { setError("File is too large (max 2MB)."); return; } setError(null); const reader = new FileReader(); reader.onload = (ev) => setImageSrc(ev.target?.result as string); reader.readAsDataURL(file); };
    return React.createElement(Modal, { isOpen, onClose, title: "Update Profile Picture", error },
        React.createElement("div", { className: "flex flex-col items-center" },
            React.createElement("div", { className: "w-40 h-40 rounded-full bg-gray-200 dark:bg-slate-700 mb-4 overflow-hidden" }, imageSrc ? React.createElement("img", { src: imageSrc, alt: "Preview", className: "w-full h-full object-cover" }) : React.createElement(ProfileIcon, { className: "w-20 h-20 text-gray-400 m-auto" })),
            React.createElement("input", { type: "file", accept: "image/*", ref: fileInputRef, onChange: handleFileChange, className: "hidden" }),
            React.createElement("button", { onClick: () => fileInputRef.current?.click(), className: "flex items-center gap-2 bg-gray-200 dark:bg-slate-600 px-4 py-2 rounded-lg text-sm mb-4" }, React.createElement(UploadIcon, null), "Choose Image"),
            React.createElement("div", { className: "flex gap-2 w-full" }, React.createElement("button", { onClick: onClose, className: "flex-1 bg-gray-100 dark:bg-slate-700 py-2 px-4 rounded-lg" }, "Cancel"), React.createElement("button", { onClick: () => imageSrc && onSave(imageSrc), disabled: !imageSrc, className: "flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg disabled:bg-indigo-400" }, "Save"))
        )
    );
};

const Header = ({ user, title, subtitle, onLogout, theme, toggleTheme, onProfileClick }: HeaderProps) => (
    React.createElement("div", { className: "flex justify-between items-center mb-8" },
        React.createElement("div", null,
            React.createElement("h1", { className: "text-3xl font-bold text-gray-800 dark:text-gray-100" }, title),
            React.createElement("p", { className: "text-gray-500 dark:text-gray-400 mt-1" }, subtitle)),
        React.createElement("div", { className: "flex items-center gap-2" },
             React.createElement("button", { onClick: onProfileClick, className: "h-12 w-12 rounded-full bg-white dark:bg-slate-800 border dark:border-slate-700 flex items-center justify-center ring-2 ring-transparent hover:ring-indigo-500 transition", title: "Change Profile Picture" },
                user.profilePictureUrl ? React.createElement("img", { src: user.profilePictureUrl, alt: "Profile", className: "h-full w-full rounded-full object-cover" }) : React.createElement(ProfileIcon, { className: "h-7 w-7 text-gray-500 dark:text-gray-300" })
            ),
            React.createElement("button", { onClick: toggleTheme, className: "bg-white dark:bg-slate-800 border dark:border-slate-700 text-gray-600 dark:text-gray-300 font-semibold p-3 rounded-lg flex items-center gap-2 transition" }, theme === 'dark' ? React.createElement(SunIcon, null) : React.createElement(MoonIcon, null)),
            React.createElement("button", { onClick: onLogout, className: "bg-white dark:bg-slate-800 border dark:border-slate-700 text-gray-600 dark:text-gray-300 font-semibold py-2.5 px-4 rounded-lg flex items-center gap-2 transition" }, React.createElement(LogoutIcon, null), " Logout")
        )
    )
);

const TimetableGrid = ({ timetable, role = 'student' }: TimetableGridProps) => {
    if (!timetable || timetable.length === 0) {
        return React.createElement("div", { className: "bg-white dark:bg-slate-800/80 backdrop-blur-lg border-2 border-dashed border-gray-300 dark:border-slate-700 p-8 rounded-2xl text-center min-h-[500px] flex flex-col justify-center items-center" }, React.createElement(SchedulerIcon, { className: "h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" }), React.createElement("h3", { className: "text-xl font-bold" }, "Timetable Not Available"), React.createElement("p", { className: "text-gray-500 mt-2" }, "Your schedule will appear here once it has been published by the admin."));
    }
    const getEntry = (day: string, time: string) => timetable.find(e => e.day.toLowerCase() === day.toLowerCase() && e.time === time);
    const cellBgColor = role === 'teacher' ? 'bg-green-500/90' : 'bg-indigo-500/90';
    return (
        React.createElement("div", { className: "bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border border-gray-200 dark:border-slate-700 p-4 sm:p-6 rounded-2xl shadow-md overflow-x-auto" },
            React.createElement("table", { className: "w-full border-collapse text-sm" },
                React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", { className: "p-3 font-semibold text-left text-gray-600 dark:text-gray-300 border-b-2 dark:border-slate-700" }, "Time"), DAYS.map(day => React.createElement("th", { key: day, className: "p-3 font-semibold text-center capitalize text-gray-600 dark:text-gray-300 border-b-2 dark:border-slate-700" }, day)))),
                React.createElement("tbody", null, TIME_SLOTS.map(time => (
                    React.createElement("tr", { key: time, className: "dark:text-gray-200" },
                        React.createElement("td", { className: "p-3 font-medium border-b dark:border-slate-700 whitespace-nowrap" }, time),
                        DAYS.map(day => {
                            const entry = getEntry(day, time);
                            return React.createElement("td", { key: day, className: "p-2 border-b dark:border-slate-700 text-center" },
                                entry ? React.createElement("div", { className: `p-2.5 rounded-lg text-white text-xs ${cellBgColor}` },
                                    React.createElement("div", { className: "font-bold" }, entry.subject),
                                    React.createElement("div", { className: "opacity-80" }, role === 'teacher' ? entry.className : entry.faculty),
                                    React.createElement("div", { className: "opacity-80" }, "Room: ", entry.room)
                                ) : (time === '12:50-01:35' ? React.createElement("div", { className: "text-gray-400 text-xs" }, "Lunch") : null)
                            );
                        })
                    )
                )))
            )
        )
    );
};

const PlaceholderContent = ({ title, message, icon }: { title: string; message: string; icon: React.ReactElement }) => (
    React.createElement("div", { className: "flex flex-col items-center justify-center h-96 bg-gray-100 dark:bg-slate-800/50 rounded-2xl p-8" },
        React.cloneElement(icon, { className: "h-16 w-16 text-gray-400 dark:text-gray-500 mb-4" }),
        React.createElement("h3", { className: "text-xl font-bold text-gray-800 dark:text-gray-100" }, title),
        React.createElement("p", { className: "text-gray-500 dark:text-gray-400 mt-2 text-center" }, message)
    )
);

// FIX: Removed unused `...props` from signature to prevent passing unsupported props.
const TeacherDashboardView = ({ timetable }: { timetable: TimetableEntry[] }) => {
    const [activeTab, setActiveTab] = useState('timetable');

    const tabs = [
        { key: 'timetable', label: 'My Timetable', icon: React.createElement(SchedulerIcon, { className: 'h-5 w-5' }) },
        { key: 'ims', label: 'IMS', icon: React.createElement(IMSIcon, { className: 'h-5 w-5' }) },
        { key: 'smart-tools', label: 'Smart Tools', icon: React.createElement(SmartToolsIcon, { className: 'h-5 w-5' }) },
        { key: 'availability', label: 'Availability', icon: React.createElement(AvailabilityIcon, { className: 'h-5 w-5' }) },
        { key: 'requests', label: 'Requests', icon: React.createElement(RequestsIcon, { className: 'h-5 w-5' }) },
        { key: 'notifications', label: 'Notifications', icon: React.createElement(NotificationsIcon, { className: 'h-5 w-5' }) },
        { key: 'attendance', label: 'Attendance', icon: React.createElement(AttendanceIcon, { className: 'h-5 w-5' }) },
        { key: 'chat', label: 'Chat', icon: React.createElement(ChatIcon, { className: 'h-5 w-5' }) }
    ];

    const renderContent = () => {
        switch(activeTab) {
            case 'timetable': return React.createElement(TimetableGrid, { timetable: timetable, role: "teacher" });
            default: return React.createElement(PlaceholderContent, {
                title: "Coming Soon",
                message: `The "${tabs.find(t => t.key === activeTab)?.label}" feature is currently under development.`,
                // FIX: Changed fallback icon from `React.createElement("div", null)` to `React.createElement("div", {})` to avoid potential type inference issues with `React.cloneElement` when props are null.
                icon: tabs.find(t => t.key === activeTab)?.icon || React.createElement("div", {})
            });
        }
    };
    
    return React.createElement("div", null,
        React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" },
            React.createElement(StatCard, { title: "Classes This Week", value: "12", color: "from-indigo-500 to-blue-500" }),
            React.createElement(StatCard, { title: "Pending Requests", value: "3", color: "from-purple-500 to-indigo-500" }),
            React.createElement(StatCard, { title: "New Notifications", value: "2", color: "from-blue-500 to-sky-500" }),
            React.createElement(StatCard, { title: "Workload Utilization", value: "85%", color: "from-sky-500 to-indigo-500" })
        ),
        React.createElement("div", { className: "bg-white/80 dark:bg-slate-800/50 backdrop-blur-lg border border-gray-200 dark:border-slate-700 p-2 rounded-xl shadow-md flex flex-wrap gap-2 mb-8" },
            tabs.map(tab => React.createElement("button", { key: tab.key, onClick: () => setActiveTab(tab.key), className: `flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg transition-all ${activeTab === tab.key ? 'bg-green-600 text-white shadow-lg shadow-green-600/30' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-slate-700/50'}`}, tab.icon, tab.label))
        ),
        renderContent()
    );
};

// FIX: Removed unused `...props` from signature to prevent passing unsupported props.
const StudentDashboardView = ({ timetable }: { timetable: TimetableEntry[] }) => {
    const [activeTab, setActiveTab] = useState('schedule');
    
    const tabs = [
        { key: 'schedule', label: 'My Schedule', icon: React.createElement(SchedulerIcon, { className: 'h-5 w-5' }) },
        { key: 'ims', label: 'IMS', icon: React.createElement(IMSIcon, { className: 'h-5 w-5' }) },
        { key: 'smart-tools', label: 'Smart Tools', icon: React.createElement(SmartToolsIcon, { className: 'h-5 w-5' }) },
        { key: 'subjects', label: 'Subjects', icon: React.createElement(BookOpenIcon, { className: 'h-5 w-5' }) },
        { key: 'upcoming', label: 'Upcoming Classes', icon: React.createElement(SchedulerIcon, { className: 'h-5 w-5' })},
        { key: 'notifications', label: 'Notifications', icon: React.createElement(NotificationsIcon, { className: 'h-5 w-5' }) },
        { key: 'exams', label: 'Exams', icon: React.createElement(ExamsIcon, { className: 'h-5 w-5' }) },
        { key: 'chat', label: 'Chat', icon: React.createElement(ChatIcon, { className: 'h-5 w-5' }) },
        { key: 'attendance', label: 'Attendance', icon: React.createElement(AttendanceIcon, { className: 'h-5 w-5' }) },
        { key: 'extras', label: 'Extras', icon: React.createElement(ExtrasIcon, { className: 'h-5 w-5' }) }
    ];

     const renderContent = () => {
        switch(activeTab) {
            case 'schedule': return React.createElement(TimetableGrid, { timetable: timetable, role: "student" });
            default: return React.createElement(PlaceholderContent, {
                title: "Coming Soon",
                message: `The "${tabs.find(t => t.key === activeTab)?.label}" feature is currently under development.`,
                // FIX: Changed fallback icon from `React.createElement("div", null)` to `React.createElement("div", {})` to avoid potential type inference issues with `React.cloneElement` when props are null.
                icon: tabs.find(t => t.key === activeTab)?.icon || React.createElement("div", {})
            });
        }
    };
    
    return React.createElement("div", null,
        React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" },
            React.createElement(StatCard, { title: "Classes This Week", value: "15", color: "from-indigo-500 to-purple-500" }),
            React.createElement(StatCard, { title: "Subjects", value: "3", color: "from-sky-500 to-cyan-500" }),
            React.createElement(StatCard, { title: "New Notifications", value: "2", color: "from-red-500 to-pink-500" }),
            React.createElement(StatCard, { title: "Attendance", value: "85%", color: "from-green-500 to-lime-500" })
        ),
        React.createElement("div", { className: "bg-white/80 dark:bg-slate-800/50 backdrop-blur-lg border border-gray-200 dark:border-slate-700 p-2 rounded-xl shadow-md flex flex-wrap gap-2 mb-8" },
            tabs.map(tab => React.createElement("button", { key: tab.key, onClick: () => setActiveTab(tab.key), className: `flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg transition-all ${activeTab === tab.key ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-slate-700/50'}`}, tab.icon, tab.label))
        ),
        renderContent()
    );
};

const StatCard = ({ title, value, color }: { title: string; value: string; color: string }) => (
    React.createElement("div", { className: `p-6 rounded-2xl text-white shadow-lg bg-gradient-to-br ${color}` },
        React.createElement("p", { className: "text-sm opacity-80" }, title),
        React.createElement("p", { className: "text-3xl font-bold mt-1" }, value)
    )
);

export const Dashboard = (props: DashboardProps) => {
    const { user, onLogout, theme, toggleTheme, onUpdateProfilePicture, timetable } = props;
    const [isProfileModalOpen, setProfileModalOpen] = useState(false);

    const { title, subtitle } = useMemo(() => {
        if (user.role === 'teacher') {
            const facultyProfile = props.faculty.find(f => f.id === user.profileId);
            return {
                title: "Teacher Dashboard",
                subtitle: `Welcome, ${facultyProfile?.name || user.username} | ${facultyProfile?.department || 'N/A'}`,
            };
        }
        if (user.role === 'student') {
            const studentProfile = props.students.find(s => s.id === user.profileId);
            const classProfile = props.classes.find(c => c.id === studentProfile?.classId);
            return {
                title: "Student Dashboard",
                subtitle: `Welcome, ${studentProfile?.name || user.username} | ${classProfile?.name || ''} | Roll No: ${studentProfile?.roll || 'N/A'}`,
            };
        }
        return { title: "Dashboard", subtitle: `Welcome, ${user.username}` };
    }, [user, props.faculty, props.students, props.classes]);

    return (
        React.createElement("div", { className: "min-h-screen p-4 sm:p-6 lg:p-8" },
            React.createElement(ProfilePictureModal, { isOpen: isProfileModalOpen, onClose: () => setProfileModalOpen(false), onSave: onUpdateProfilePicture, currentUser: user }),
            React.createElement(Header, {
                user,
                title: title,
                subtitle: subtitle,
                onLogout, theme, toggleTheme,
                onProfileClick: () => setProfileModalOpen(true)
            }),
            // FIX: Removed spread of `...rest` which passed unsupported props to the view components.
            user.role === 'teacher' && React.createElement(TeacherDashboardView, { timetable }),
            user.role === 'student' && React.createElement(StudentDashboardView, { timetable })
        )
    );
};