import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoutIcon, MoonIcon, SchedulerIcon, StudentIcon, SubjectIcon, SunIcon, TeacherIcon } from '../../components/Icons';
import { DAYS, TIME_SLOTS } from '../../constants';
import { TimetableEntry, Class, Faculty, Subject } from '../../types';


// === From features/dashboard/Dashboard.tsx ===
const Header = ({ title, subtitle, onLogout, theme, toggleTheme }) => (
    React.createElement("div", { className: "bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-2xl shadow-lg mb-8 flex justify-between items-center" },
        React.createElement("div", null,
            React.createElement("h1", { className: "text-3xl font-bold" }, title),
            React.createElement("p", { className: "opacity-90 mt-1" }, subtitle)
        ),
        React.createElement("div", {className: "flex items-center gap-2"},
            React.createElement("button", { onClick: toggleTheme, className: "bg-white/20 hover:bg-white/30 text-white font-semibold p-2.5 rounded-lg flex items-center gap-2 transition" },
                theme === 'dark' ? React.createElement(SunIcon, null) : React.createElement(MoonIcon, null)
            ),
            React.createElement("button", { onClick: onLogout, className: "bg-white/20 hover:bg-white/30 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition" },
                React.createElement(LogoutIcon, null), " Logout"
            )
        )
    )
);

const TimetableGrid = ({ timetable }: { timetable: TimetableEntry[] }) => {
    if (!timetable || timetable.length === 0) {
        return React.createElement("div", { className: "bg-white/80 dark:bg-slate-800/50 backdrop-blur-lg border border-gray-200 dark:border-slate-700 p-8 rounded-2xl shadow-md text-center" },
            React.createElement("h3", { className: "text-xl font-bold text-gray-800 dark:text-gray-100" }, "Timetable Not Available"),
            React.createElement("p", { className: "text-gray-500 dark:text-gray-400 mt-2" }, "A timetable has not been generated or assigned to you yet.")
        );
    }
    
    const getEntry = (day, time) => {
        return timetable.find(e => e.day.toLowerCase() === day.toLowerCase() && e.time === time);
    };

    return (
        React.createElement("div", { className: "bg-white/80 dark:bg-slate-800/50 backdrop-blur-lg border border-gray-200 dark:border-slate-700 p-6 rounded-2xl shadow-md overflow-x-auto" },
            React.createElement("table", { className: "w-full border-collapse text-sm" },
                React.createElement("thead", null,
                    React.createElement("tr", null,
                        React.createElement("th", { className: "p-3 font-semibold text-left text-gray-600 dark:text-gray-300 border-b-2 border-gray-200 dark:border-slate-700" }, "Time"),
                        DAYS.map(day => React.createElement("th", { key: day, className: "p-3 font-semibold text-center capitalize text-gray-600 dark:text-gray-300 border-b-2 border-gray-200 dark:border-slate-700" }, day))
                    )
                ),
                React.createElement("tbody", null,
                    TIME_SLOTS.map(time => (
                        React.createElement("tr", { key: time, className: "hover:bg-gray-100/50 dark:hover:bg-slate-800/50 transition-colors" },
                            React.createElement("td", { className: "p-3 text-gray-800 dark:text-gray-200 font-medium border-b border-gray-200 dark:border-slate-700" }, time),
                            DAYS.map(day => {
                                const entry = getEntry(day, time);
                                return (
                                    React.createElement("td", { key: day, className: "p-2 border-b border-gray-200 dark:border-slate-700 text-center" },
                                        entry ? (
                                            React.createElement("div", { className: `p-2 rounded-lg text-white text-xs ${entry.type === 'lab' ? 'bg-purple-500' : 'bg-indigo-500'}` },
                                                React.createElement("div", { className: "font-bold" }, entry.subject),
                                                React.createElement("div", { className: "opacity-80" }, entry.type === 'lab' ? entry.room : entry.className || entry.faculty)
                                            )
                                        ) : (
                                            time === '12:50-01:35' ? React.createElement("div", { className: "text-gray-400 dark:text-gray-500 text-xs" }, "Lunch") : null
                                        )
                                    )
                                );
                            })
                        )
                    ))
                )
            )
        )
    );
};
const AdminDashboard = ({ user, onLogout, theme, toggleTheme, classes, faculty, subjects }: { user: any, onLogout: () => void, theme: string, toggleTheme: () => void, classes: Class[], faculty: Faculty[], subjects: Subject[] }) => {
    const navigate = useNavigate();
    const studentCount = classes.reduce((sum, c) => sum + c.studentCount, 0);
    const teacherCount = faculty.length;
    const classCount = classes.length;
    
    return (
        React.createElement("div", { className: "p-4 md:p-8 min-h-screen bg-transparent" },
            React.createElement(Header, { title: "Admin Control Center", subtitle: `Welcome, ${user.username}`, onLogout: onLogout, theme: theme, toggleTheme: toggleTheme }),
            React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" },
                React.createElement("div", { className: "bg-white/80 dark:bg-slate-800/50 backdrop-blur-lg border border-gray-200 dark:border-slate-700 p-6 rounded-2xl flex items-center gap-4" },
                    React.createElement("div", { className: "bg-blue-500/10 text-blue-500 dark:text-blue-400 p-3 rounded-full" }, React.createElement(StudentIcon, null)),
                    React.createElement("div", null, React.createElement("div", { className: "text-3xl font-bold text-gray-800 dark:text-gray-100" }, studentCount), React.createElement("div", { className: "text-gray-500 dark:text-gray-400" }, "Students"))
                ),
                 React.createElement("div", { className: "bg-white/80 dark:bg-slate-800/50 backdrop-blur-lg border border-gray-200 dark:border-slate-700 p-6 rounded-2xl flex items-center gap-4" },
                    React.createElement("div", { className: "bg-green-500/10 text-green-500 dark:text-green-400 p-3 rounded-full" }, React.createElement(TeacherIcon, null)),
                    React.createElement("div", null, React.createElement("div", { className: "text-3xl font-bold text-gray-800 dark:text-gray-100" }, teacherCount), React.createElement("div", { className: "text-gray-500 dark:text-gray-400" }, "Teachers"))
                ),
                React.createElement("div", { className: "bg-white/80 dark:bg-slate-800/50 backdrop-blur-lg border border-gray-200 dark:border-slate-700 p-6 rounded-2xl flex items-center gap-4" },
                    React.createElement("div", { className: "bg-yellow-500/10 text-yellow-500 dark:text-yellow-400 p-3 rounded-full" }, React.createElement(SubjectIcon, null)),
                    React.createElement("div", null, React.createElement("div", { className: "text-3xl font-bold text-gray-800 dark:text-gray-100" }, classCount), React.createElement("div", { className: "text-gray-500 dark:text-gray-400" }, "Active Classes"))
                ),
                 React.createElement("div", { className: "bg-white/80 dark:bg-slate-800/50 backdrop-blur-lg border border-gray-200 dark:border-slate-700 p-6 rounded-2xl flex items-center gap-4" },
                    React.createElement("div", { className: "bg-red-500/10 text-red-500 dark:text-red-400 p-3 rounded-full" }, React.createElement("div", { className: "text-xl" }, "📚")),
                    React.createElement("div", null, React.createElement("div", { className: "text-3xl font-bold text-gray-800 dark:text-gray-100" }, subjects.length), React.createElement("div", { className: "text-gray-500 dark:text-gray-400" }, "Subjects"))
                )
            ),
            React.createElement("div", { className: "bg-white/80 dark:bg-slate-800/50 backdrop-blur-lg border border-gray-200 dark:border-slate-700 p-8 rounded-2xl shadow-lg text-center" },
                React.createElement("h2", { className: "text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2" }, "Timetable Scheduler Module"),
                React.createElement("p", { className: "text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-6" }, "Use the AI-powered scheduler to generate, manage, and optimize the academic timetable for the entire institution."),
                React.createElement("button", {
                    onClick: () => navigate('/scheduler'),
                    className: "bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg flex items-center gap-3 mx-auto transition-transform transform hover:scale-105 shadow-lg shadow-indigo-600/30"
                }, React.createElement(SchedulerIcon, null), " Open Scheduler")
            )
        )
    );
};
const TeacherDashboard = ({ user, onLogout, theme, toggleTheme }) => (
    React.createElement("div", { className: "p-4 md:p-8 min-h-screen bg-transparent" },
        React.createElement(Header, { title: "Teacher Dashboard", subtitle: `Welcome, ${user.username}`, onLogout: onLogout, theme: theme, toggleTheme: toggleTheme }),
        React.createElement("h2", { className: "text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4" }, "Your Weekly Schedule"),
        React.createElement(TimetableGrid, { timetable: [] })
    )
);
const StudentDashboard = ({ user, onLogout, theme, toggleTheme }) => (
    React.createElement("div", { className: "p-4 md:p-8 min-h-screen bg-transparent" },
        React.createElement(Header, { title: "Student Dashboard", subtitle: `Welcome, ${user.username}`, onLogout: onLogout, theme: theme, toggleTheme: toggleTheme }),
        React.createElement("h2", { className: "text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4" }, "Your Class Schedule"),
        React.createElement(TimetableGrid, { timetable: [] })
    )
);
export const Dashboard = ({ user, onLogout, theme, toggleTheme, classes, faculty, subjects }) => {
    switch (user.role) {
        case 'admin':
            return React.createElement(AdminDashboard, { user: user, onLogout: onLogout, theme: theme, toggleTheme: toggleTheme, classes: classes, faculty: faculty, subjects: subjects });
        case 'teacher':
            return React.createElement(TeacherDashboard, { user: user, onLogout: onLogout, theme: theme, toggleTheme: toggleTheme });
        case 'student':
            return React.createElement(StudentDashboard, { user: user, onLogout: onLogout, theme: theme, toggleTheme: toggleTheme });
        default:
            return React.createElement("div", null, "Invalid role");
    }
};
