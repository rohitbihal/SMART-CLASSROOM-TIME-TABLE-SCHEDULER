


import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import {
    LogoutIcon, MoonIcon, SchedulerIcon, StudentIcon, SunIcon, ChatIcon, ProfileIcon, IMSIcon, SmartToolsIcon, BookOpenIcon, NotificationsIcon, ExamsIcon, ExtrasIcon, AvailabilityIcon, RequestsIcon, AttendanceIcon
} from '../../components/Icons.tsx';
import { DAYS, TIME_SLOTS } from '../../constants.ts';
import { TimetableEntry, User, Class, Subject, Student, Faculty, Attendance, AttendanceStatus } from '../../types.ts';

interface DashboardProps {
    user: User; onLogout: () => void; theme: string; toggleTheme: () => void;
    timetable: TimetableEntry[];
    classes: Class[]; subjects: Subject[]; students: Student[]; faculty: Faculty[];
    attendance: Attendance; onUpdateAttendance: (classId: string, date: string, studentId: string, status: AttendanceStatus) => void;
}
interface HeaderProps { user: User; title: string; subtitle: string; onLogout: () => void; theme: string; toggleTheme: () => void; }

const Header = ({ user, title, subtitle, onLogout, theme, toggleTheme }: HeaderProps) => (
    React.createElement("div", { className: "flex justify-between items-center mb-8" },
        // FIX: Replaced `null` props with `{}` to avoid TypeScript type inference issues.
        React.createElement("div", {},
            React.createElement("h1", { className: "text-3xl font-bold text-gray-800 dark:text-gray-100" }, title),
            React.createElement("p", { className: "text-gray-500 dark:text-gray-400 mt-1" }, subtitle)),
        React.createElement("div", { className: "flex items-center gap-2" },
             React.createElement("div", { className: "h-10 w-10 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center ring-2 ring-gray-300 dark:ring-slate-600" },
                React.createElement(ProfileIcon, { className: "h-6 w-6 text-gray-500 dark:text-gray-300" })
            ),
            // FIX: Replaced implicit `null` props with `{}` to avoid TypeScript type inference issues.
            // FIX: Changed props from `{}` to `null` for components without props to resolve typing error.
            React.createElement("button", { onClick: toggleTheme, className: "bg-white dark:bg-slate-800 border dark:border-slate-700 text-gray-600 dark:text-gray-300 font-semibold p-3 rounded-lg flex items-center gap-2 transition" }, theme === 'dark' ? React.createElement(SunIcon, null) : React.createElement(MoonIcon, null)),
            // FIX: Replaced implicit `null` props with `{}` to avoid TypeScript type inference issues.
            // FIX: Changed props from `{}` to `null` for components without props to resolve typing error.
            React.createElement("button", { onClick: onLogout, className: "bg-white dark:bg-slate-800 border dark:border-slate-700 text-gray-600 dark:text-gray-300 font-semibold py-2.5 px-4 rounded-lg flex items-center gap-2 transition" }, React.createElement(LogoutIcon, null), " Logout")
        )
    )
);

const TimetableGrid = ({ timetable, role = 'student' }: { timetable: TimetableEntry[], role?: 'student' | 'teacher' }) => {
    if (!timetable || timetable.length === 0) {
        return React.createElement("div", { className: "bg-white dark:bg-slate-800 border-2 border-dashed border-gray-300 dark:border-slate-700 p-8 rounded-2xl text-center min-h-[500px] flex flex-col justify-center items-center" }, React.createElement(SchedulerIcon, { className: "h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" }), React.createElement("h3", { className: "text-xl font-bold" }, "Timetable Not Available"), React.createElement("p", { className: "text-gray-500 mt-2" }, "Your schedule will appear here once it has been published by the admin."));
    }
    const getEntry = (day: string, time: string) => timetable.find(e => e.day.toLowerCase() === day.toLowerCase() && e.time === time);
    const cellBgColor = role === 'teacher' ? 'bg-green-500' : 'bg-indigo-500';
    return (
        React.createElement("div", { className: "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-4 sm:p-6 rounded-2xl shadow-md overflow-x-auto" },
            React.createElement("table", { className: "w-full border-collapse text-sm" },
                // FIX: Replaced `null` props with `{}` to avoid TypeScript type inference issues.
                React.createElement("thead", {}, React.createElement("tr", {}, React.createElement("th", { className: "p-3 font-semibold text-left text-gray-600 dark:text-gray-300 border-b-2 dark:border-slate-700" }, "Time"), DAYS.map(day => React.createElement("th", { key: day, className: "p-3 font-semibold text-center capitalize text-gray-600 dark:text-gray-300 border-b-2 dark:border-slate-700" }, day)))),
                // FIX: Replaced `null` props with `{}` to avoid TypeScript type inference issues.
                React.createElement("tbody", {}, TIME_SLOTS.map(time => (
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

// FIX: Updated the type of the `icon` prop to be more specific, ensuring that `React.cloneElement` can correctly infer that `className` is a valid prop.
const PlaceholderContent = ({ title, message, icon }: { title: string; message: string; icon: React.ReactElement<{ className?: string }> }) => (
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
    
    // FIX: Changed React.createElement("div", null, ...) to React.createElement("div", {}, ...) to avoid potential TS type inference issues.
    return React.createElement("div", {},
        React.createElement("div", { className: "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-2 rounded-xl shadow-sm flex flex-wrap gap-2 mb-8" },
            tabs.map(tab => React.createElement("button", { key: tab.key, onClick: () => setActiveTab(tab.key), className: `flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === tab.key ? 'bg-green-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'}`}, tab.icon, tab.label))
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
    
    // FIX: Changed React.createElement("div", null, ...) to React.createElement("div", {}, ...) to avoid potential TS type inference issues.
    return React.createElement("div", {},
        React.createElement("div", { className: "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-2 rounded-xl shadow-sm flex flex-wrap gap-2 mb-8" },
            tabs.map(tab => React.createElement("button", { key: tab.key, onClick: () => setActiveTab(tab.key), className: `flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === tab.key ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'}`}, tab.icon, tab.label))
        ),
        renderContent()
    );
};

export const Dashboard = (props: DashboardProps) => {
    const { user, onLogout, theme, toggleTheme, timetable } = props;

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
            React.createElement(Header, {
                user,
                title: title,
                subtitle: subtitle,
                onLogout, theme, toggleTheme
            }),
            // FIX: Removed spread of `...rest` which passed unsupported props to the view components.
            user.role === 'teacher' && React.createElement(TeacherDashboardView, { timetable }),
            user.role === 'student' && React.createElement(StudentDashboardView, { timetable })
        )
    );
};