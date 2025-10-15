import React from 'react';
import { Link } from 'react-router-dom';
import { User } from '../../types.ts';
import { LogoutIcon, MoonIcon, ProfileIcon, SchedulerIcon, StudentIcon, SunIcon } from '../../components/Icons.tsx';

interface ModuleSelectionPageProps {
    user: User;
    onLogout: () => void;
    theme: string;
    toggleTheme: () => void;
}

const Header = ({ user, onLogout, theme, toggleTheme }: { user: User; onLogout: () => void; theme: string; toggleTheme: () => void; }) => (
    React.createElement("div", { className: "bg-white/80 dark:bg-slate-800/50 backdrop-blur-lg border border-gray-200 dark:border-slate-700 p-4 rounded-2xl shadow-md mb-8 flex justify-between items-center" },
        React.createElement("div", { className: "flex items-center gap-4" },
            React.createElement("div", { className: "h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center ring-2 ring-indigo-200 dark:ring-indigo-700" },
                 React.createElement(ProfileIcon, { className: "h-7 w-7 text-indigo-600 dark:text-indigo-300" })
            ),
            React.createElement("div", null,
                React.createElement("h2", { className: "font-bold text-lg text-gray-800 dark:text-gray-100" }, "Welcome, Admin"),
                React.createElement("p", { className: "text-sm text-gray-500 dark:text-gray-400" }, user.username)
            )
        ),
        React.createElement("div", {className: "flex items-center gap-2"},
            React.createElement("button", { onClick: toggleTheme, className: "bg-white/80 dark:bg-slate-700/50 hover:bg-gray-200/50 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 font-semibold p-2.5 rounded-lg flex items-center gap-2 transition" }, theme === 'dark' ? React.createElement(SunIcon, null) : React.createElement(MoonIcon, null)),
            React.createElement("button", { onClick: onLogout, className: "bg-white/80 dark:bg-slate-700/50 hover:bg-gray-200/50 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition" }, React.createElement(LogoutIcon, null), " Logout")
        )
    )
);

const ModuleCard = ({ to, icon, title, description }: { to: string; icon: React.ReactNode; title: string; description: string; }) => (
    React.createElement(Link, { to: to, className: "group bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl p-8 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-start" },
        React.createElement("div", { className: "bg-gradient-to-br from-indigo-500 to-purple-500 p-4 rounded-xl text-white mb-6 group-hover:scale-110 transition-transform" },
            icon
        ),
        React.createElement("h3", { className: "text-xl font-bold text-gray-800 dark:text-gray-100 mb-2" }, title),
        React.createElement("p", { className: "text-gray-500 dark:text-gray-400" }, description)
    )
);

export const ModuleSelectionPage = ({ user, onLogout, theme, toggleTheme }: ModuleSelectionPageProps) => {
    return (
        React.createElement("div", { className: "min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col" },
            React.createElement(Header, { user, onLogout, theme, toggleTheme }),
            React.createElement("div", { className: "flex-grow flex flex-col items-center justify-center text-center" },
                React.createElement("h1", { className: "text-4xl font-extrabold text-gray-800 dark:text-gray-100 mb-2" }, "Smart Campus"),
                React.createElement("p", { className: "text-lg text-gray-500 dark:text-gray-400 mb-12" }, "Choose a module to continue"),
                React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl" },
                    React.createElement(ModuleCard, {
                        to: "/scheduler",
                        icon: React.createElement(SchedulerIcon, { className: "h-8 w-8" }),
                        title: "Timetable Scheduler",
                        description: "Create and manage class schedules, rooms, and faculty workload."
                    }),
                    React.createElement(ModuleCard, {
                        to: "/smart-classroom",
                        icon: React.createElement(StudentIcon, { className: "h-8 w-8" }),
                        title: "Smart Classroom",
                        description: "Manage classroom sessions, attendance, and in-class resources."
                    })
                )
            )
        )
    );
};