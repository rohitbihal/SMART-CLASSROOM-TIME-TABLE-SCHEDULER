


import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LogoutIcon, MoonIcon, SchedulerIcon, StudentIcon, SubjectIcon, SunIcon, TeacherIcon, ChatIcon, EditIcon, DeleteIcon, AddIcon, SaveIcon, UsersIcon,
    IMSIcon, AnalyticsIcon, SecurityIcon, AIIcon, ResourcesIcon, AttendanceIcon, CommunicationIcon, SmartToolsIcon, NotificationsIcon, ExamsIcon, ExtrasIcon, BookOpenIcon, AvailabilityIcon, RequestsIcon
} from '../../components/Icons';
import { DAYS, TIME_SLOTS } from '../../constants';
import { TimetableEntry, Class, Faculty, Subject, Constraints, ChatMessage, Student, Attendance, AttendanceStatus } from '../../types';

// Reusable UI Components
const Tabs = ({ children, className = '' }) => React.createElement("div", { className: `bg-white/80 dark:bg-slate-800/50 backdrop-blur-lg border border-gray-200 dark:border-slate-700 p-2 rounded-xl shadow-md flex flex-wrap gap-2 mb-8 ${className}` }, children);
const TabButton = ({ isActive, onClick, children }) => React.createElement("button", { onClick, className: `flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg transition-all ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-slate-700/50'}` }, children);

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

const TimetableGrid = ({ timetable, role = 'student' }: { timetable: TimetableEntry[], role?: 'student' | 'teacher' }) => {
    if (!timetable || timetable.length === 0) {
        const emptyStateContent = {
            student: { title: "Timetable Not Published", message: "Your class timetable is not available yet. It will be displayed here once it's published by the admin." },
            teacher: { title: "No Schedule Assigned", message: "Your teaching schedule has not been generated yet. It will appear here once finalized." }
        };
        const { title, message } = emptyStateContent[role];
        return React.createElement("div", { className: "bg-white/80 dark:bg-slate-800/50 backdrop-blur-lg border-2 border-dashed border-gray-300 dark:border-slate-700 p-8 rounded-2xl shadow-inner text-center flex flex-col items-center justify-center min-h-[500px]" },
            React.createElement(SchedulerIcon, { className: "h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" }),
            React.createElement("h3", { className: "text-xl font-bold text-gray-800 dark:text-gray-100" }, title),
            React.createElement("p", { className: "text-gray-500 dark:text-gray-400 mt-2 max-w-sm" }, message)
        );
    }
    
    const getEntry = (day, time) => timetable.find(e => e.day.toLowerCase() === day.toLowerCase() && e.time === time);

    return (
        React.createElement("div", { className: "bg-white/80 dark:bg-slate-800/50 backdrop-blur-lg border border-gray-200 dark:border-slate-700 p-6 rounded-2xl shadow-md overflow-x-auto" },
            React.createElement("table", { className: "w-full border-collapse text-sm" },
                React.createElement("thead", null, React.createElement("tr", null,
                    React.createElement("th", { className: "p-3 font-semibold text-left text-gray-600 dark:text-gray-300 border-b-2 border-gray-200 dark:border-slate-700" }, "Time"),
                    DAYS.map(day => React.createElement("th", { key: day, className: "p-3 font-semibold text-center capitalize text-gray-600 dark:text-gray-300 border-b-2 border-gray-200 dark:border-slate-700" }, day))
                )),
                React.createElement("tbody", null, TIME_SLOTS.map(time => (
                    React.createElement("tr", { key: time, className: "hover:bg-gray-100/50 dark:hover:bg-slate-800/50 transition-colors" },
                        React.createElement("td", { className: "p-3 text-gray-800 dark:text-gray-200 font-medium border-b border-gray-200 dark:border-slate-700" }, time),
                        DAYS.map(day => {
                            const entry = getEntry(day, time);
                            return React.createElement("td", { key: day, className: "p-2 border-b border-gray-200 dark:border-slate-700 text-center" },
                                entry ? React.createElement("div", { className: `p-2 rounded-lg text-white text-xs ${entry.type === 'lab' ? 'bg-purple-500' : 'bg-indigo-500'}` },
                                    React.createElement("div", { className: "font-bold" }, entry.subject),
                                    React.createElement("div", { className: "opacity-80" }, role === 'teacher' ? entry.className : entry.faculty)
                                ) : (time === '12:50-01:35' ? React.createElement("div", { className: "text-gray-400 dark:text-gray-500 text-xs" }, "Lunch") : null)
                            );
                        })
                    )
                )))
            )
        )
    );
};

const ChatComponent = ({ messages, onSendMessage, user, constraints, classId, channel }) => {
    const [newMessage, setNewMessage] = useState('');
    const chatBoxRef = useRef<HTMLDivElement>(null);
    const { chatWindow } = constraints;

    const { isOpen, statusText } = useMemo(() => {
        if (!chatWindow?.start || !chatWindow?.end) {
            return { isOpen: false, statusText: "Chat is currently disabled by the admin." };
        }
        const now = new Date();
        const [startH, startM] = chatWindow.start.split(':').map(Number);
        const [endH, endM] = chatWindow.end.split(':').map(Number);
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const startTime = startH * 60 + startM;
        const endTime = endH * 60 + endM;
        const formatTime = (timeStr) => new Date(`1970-01-01T${timeStr}:00`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

        const open = currentTime >= startTime && currentTime <= endTime;
        return { isOpen: open, statusText: `Chat is ${open ? 'open' : 'closed'}. Hours: ${formatTime(chatWindow.start)} - ${formatTime(chatWindow.end)}.` };
    }, [chatWindow]);

    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages, classId, channel]);

    const handleSend = (e) => {
        e.preventDefault();
        if (newMessage.trim() && isOpen && classId) {
            onSendMessage(newMessage, classId, channel);
            setNewMessage('');
        }
    };
    
    const filteredMessages = messages.filter(m => m.classId === classId && m.channel === channel);
    const roleColors = { admin: 'bg-red-500', teacher: 'bg-green-500', student: 'bg-blue-500' };

    return (
        React.createElement("div", { className: "bg-white/80 dark:bg-slate-800/50 backdrop-blur-lg border border-gray-200 dark:border-slate-700 p-6 rounded-2xl shadow-md flex flex-col h-[500px] lg:h-full" },
            React.createElement("h3", { className: "text-xl font-bold text-gray-800 dark:text-gray-100 mb-1" }, "Class Chat"),
            React.createElement("p", { className: `text-sm mb-4 ${isOpen ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}` }, statusText),
            React.createElement("div", { ref: chatBoxRef, className: "flex-grow overflow-y-auto pr-2 -mr-2 space-y-4 mb-4" },
                filteredMessages.length > 0 ? filteredMessages.map(msg => (
                    React.createElement("div", { key: msg.id, className: `flex items-start gap-3 ${msg.author === user.username ? 'flex-row-reverse' : ''}` },
                        React.createElement("div", { className: `w-8 h-8 rounded-full flex-shrink-0 ${roleColors[msg.role]} text-white flex items-center justify-center font-bold text-sm` }, msg.author.charAt(0).toUpperCase()),
                        React.createElement("div", { className: `p-3 rounded-lg max-w-xs lg:max-w-md ${msg.author === user.username ? 'bg-indigo-500 text-white' : 'bg-gray-200 dark:bg-slate-700'}` },
                            React.createElement("p", { className: "text-sm" }, msg.text),
                            React.createElement("div", { className: `text-xs mt-1 opacity-70 ${msg.author === user.username ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'}` }, new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
                        )
                    )
                )) : React.createElement("div", { className: "text-center text-gray-500 dark:text-gray-400 pt-16" }, "Be the first to send a message!")
            ),
            React.createElement("form", { onSubmit: handleSend, className: "flex gap-2" },
                React.createElement("input", { type: "text", value: newMessage, onChange: (e) => setNewMessage(e.target.value), placeholder: isOpen ? "Type a message..." : "Chat is closed", disabled: !isOpen, className: "flex-grow p-3 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition disabled:opacity-50" }),
                React.createElement("button", { type: "submit", disabled: !isOpen || !newMessage.trim(), className: "bg-indigo-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-indigo-700 transition disabled:bg-indigo-400 disabled:cursor-not-allowed" }, "Send")
            )
        )
    );
};

// FIX: Add type annotations for props to aid TypeScript's type inference and resolve errors.
const StudentForm = ({ student, onSave, onCancel, classId }: { student: Student | null, onSave: (data: any) => void, onCancel: () => void, classId: string }) => {
    const [formData, setFormData] = useState(
        student
            ? { ...student, email: student.email || '', roll: student.roll || '' }
            : { name: '', email: '', roll: '', classId }
    );
    // FIX: Add type annotation to the event object to resolve ambiguity for the 'value' property on the input element.
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };
    return React.createElement("form", { onSubmit: handleSubmit, className: "space-y-4 bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg" },
        React.createElement("input", { name: "name", value: formData.name, onChange: handleChange, placeholder: "Student Name", className: "w-full p-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-md", required: true }),
        React.createElement("input", { name: "email", type: "email", value: formData.email, onChange: handleChange, placeholder: "Email (optional)", className: "w-full p-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-md" }),
        React.createElement("input", { name: "roll", value: formData.roll, onChange: handleChange, placeholder: "Roll Number", className: "w-full p-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-md" }),
        React.createElement("div", { className: "flex gap-2 justify-end" },
            React.createElement("button", { type: "button", onClick: onCancel, className: "bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 font-semibold py-2 px-4 rounded-md" }, "Cancel"),
            React.createElement("button", { type: "submit", className: "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md" }, "Save")
        )
    );
};

const ClassroomManager = ({ classes, students, onSaveEntity, onDeleteEntity, constraints, updateConstraints }) => {
    const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
    const [editingStudent, setEditingStudent] = useState(null);

    const studentsInClass = useMemo(() => students.filter(s => s.classId === selectedClassId), [students, selectedClassId]);
    const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);

    const handleChatWindowChange = (e) => updateConstraints({ ...constraints, chatWindow: { ...(constraints.chatWindow || {}), [e.target.name]: e.target.value } });
    const handleSaveStudent = (studentData) => { onSaveEntity('student', studentData); setEditingStudent(null); };

    return React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-8" },
        React.createElement("div", { className: "lg:col-span-1" },
            React.createElement("div", { className: "bg-white/80 dark:bg-slate-800/50 p-6 rounded-2xl shadow-md" },
                React.createElement("h3", { className: "font-bold text-lg mb-4" }, "Select Class"),
                React.createElement("div", { className: "space-y-2" }, classes.map(c =>
                    React.createElement("button", { key: c.id, onClick: () => setSelectedClassId(c.id), className: `w-full text-left p-3 rounded-lg transition ${selectedClassId === c.id ? 'bg-indigo-500 text-white' : 'hover:bg-gray-200/50 dark:hover:bg-slate-700/50'}` }, c.name)
                ))
            ),
            React.createElement("div", { className: "bg-white/80 dark:bg-slate-800/50 p-6 rounded-2xl shadow-md mt-8" },
                React.createElement("h3", { className: "font-bold text-lg mb-4" }, "Chat Settings"),
                React.createElement("label", { className: "text-sm font-semibold" }, "Chat Window"),
                React.createElement("div", { className: "flex items-center gap-2 mt-2" },
                    React.createElement("input", { type: "time", name: "start", value: constraints.chatWindow?.start || '', onChange: handleChatWindowChange, className: "w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" }),
                    React.createElement("span", null, "to"),
                    React.createElement("input", { type: "time", name: "end", value: constraints.chatWindow?.end || '', onChange: handleChatWindowChange, className: "w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" })
                )
            )
        ),
        React.createElement("div", { className: "lg:col-span-2" },
            React.createElement("div", { className: "bg-white/80 dark:bg-slate-800/50 p-6 rounded-2xl shadow-md" },
                !selectedClass ? React.createElement("p", null, "Select a class to manage students.") :
                React.createElement(React.Fragment, null,
                    React.createElement("div", { className: "flex justify-between items-center mb-4" },
                        React.createElement("h3", { className: "font-bold text-lg" }, "Students in ", selectedClass.name),
                        React.createElement("button", { onClick: () => setEditingStudent({ new: true }), className: "flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 font-semibold" }, React.createElement(AddIcon, null), "Add Student")
                    ),
                    editingStudent?.new && React.createElement(StudentForm, { student: null, onSave: handleSaveStudent, onCancel: () => setEditingStudent(null), classId: selectedClassId }),
                    React.createElement("div", { className: "space-y-2 mt-4" }, studentsInClass.map(student =>
                        editingStudent?.id === student.id ? React.createElement(StudentForm, { key: student.id, student: student, onSave: handleSaveStudent, onCancel: () => setEditingStudent(null), classId: selectedClassId })
                        : React.createElement("div", { key: student.id, className: "flex justify-between items-center p-3 bg-gray-100 dark:bg-slate-900/50 rounded-lg" },
                            React.createElement("div", null,
                                React.createElement("p", { className: "font-semibold" }, student.name),
                                React.createElement("p", { className: "text-xs text-gray-500" }, "Roll: ", student.roll, " | ", student.email)
                            ),
                            React.createElement("div", { className: "flex gap-2" },
                                React.createElement("button", { onClick: () => setEditingStudent(student), className: "text-indigo-500 hover:text-indigo-700" }, React.createElement(EditIcon, null)),
                                React.createElement("button", { onClick: () => onDeleteEntity('student', student.id), className: "text-red-500 hover:text-red-700" }, React.createElement(DeleteIcon, null))
                            )
                        )
                    ))
                )
            )
        )
    );
};

// FIX: Add explicit types for component props to assist TypeScript inference and resolve the error on the 'select' element's 'value' prop.
const AttendanceManager = ({ classes, students, attendance, onUpdateAttendance }: { classes: Class[], students: Student[], attendance: Attendance, onUpdateAttendance: (classId: string, date: string, studentId: string, status: AttendanceStatus) => void }) => {
    const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const studentsInClass = students.filter(s => s.classId === selectedClassId);
    const attendanceForDay = attendance[selectedClassId]?.[selectedDate] || {};

    const handleStatusChange = (studentId, status) => { onUpdateAttendance(selectedClassId, selectedDate, studentId, status); };
    
    return React.createElement("div", { className: "bg-white/80 dark:bg-slate-800/50 p-6 rounded-2xl shadow-md" },
        React.createElement("h3", { className: "font-bold text-lg mb-4" }, "Mark Attendance"),
        React.createElement("div", { className: "flex gap-4 mb-4" },
            // FIX: Use spread operator for children to resolve a TypeScript type inference issue with the parent select element's props.
            React.createElement("select", { value: selectedClassId, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setSelectedClassId(e.target.value), className: "p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" },
                ...classes.map(c => React.createElement("option", { key: c.id, value: c.id }, c.name))
            ),
            React.createElement("input", { type: "date", value: selectedDate, onChange: e => setSelectedDate(e.target.value), className: "p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" })
        ),
        React.createElement("div", { className: "space-y-2" }, studentsInClass.map(student =>
            React.createElement("div", { key: student.id, className: "flex justify-between items-center p-3 bg-gray-100 dark:bg-slate-900/50 rounded-lg" },
                React.createElement("p", null, student.name),
                React.createElement("div", { className: "flex gap-2" },
                    React.createElement("button", { onClick: () => handleStatusChange(student.id, 'present'), className: `px-3 py-1 text-sm rounded-md ${attendanceForDay[student.id] === 'present' ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-slate-700'}` }, "Present"),
                    React.createElement("button", { onClick: () => handleStatusChange(student.id, 'absent'), className: `px-3 py-1 text-sm rounded-md ${attendanceForDay[student.id] === 'absent' ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-slate-700'}` }, "Absent")
                )
            )
        ))
    );
};

// NEW: User Management Component for Admin Dashboard
const UserManager = ({ faculty, students, users, onSaveUser, onDeleteUser }) => {
    const [modalOpen, setModalOpen] = useState(false);
    // FIX: Explicitly type the 'error' state as a string to prevent it from being inferred as 'unknown' within the 'catch' block context.
    const [error, setError] = useState<string>('');

    const facultyMap = useMemo(() => new Map(faculty.map(f => [f.id, f.name])), [faculty]);
    const studentMap = useMemo(() => new Map(students.map(s => [s.id, s.name])), [students]);
    
    const userProfileIds = useMemo(() => new Set(users.map(u => u.profileId)), [users]);
    const availableFaculty = useMemo(() => faculty.filter(f => f.email && !userProfileIds.has(f.id)), [faculty, userProfileIds]);
    const availableStudents = useMemo(() => students.filter(s => s.email && !userProfileIds.has(s.id)), [students, userProfileIds]);

    const handleSave = async (userData) => {
        setError('');
        try {
            await onSaveUser(userData);
            setModalOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred.");
        }
    };
    
    const handleDelete = (user) => {
        if (window.confirm(`Are you sure you want to delete the user account for ${user.username}?`)) {
            onDeleteUser(user._id).catch(err => alert(`Failed to delete user: ${err.message}`));
        }
    };

    const UserForm = ({ onSave, onCancel }) => {
        const [role, setRole] = useState('teacher');
        const [profileId, setProfileId] = useState('');
        const [password, setPassword] = useState('');
        const profiles = role === 'teacher' ? availableFaculty : availableStudents;
        
        const handleSubmit = (e) => {
            e.preventDefault();
            const profile = profiles.find(p => p.id === profileId);
            if (!profile || !password) {
                alert("Please select a profile and enter a password.");
                return;
            }
            onSave({ username: profile.email, password, role, profileId });
        };
        
        useEffect(() => { setProfileId(''); }, [role]);

        return React.createElement("form", { onSubmit: handleSubmit, className: "space-y-4" },
            error && React.createElement("div", { className: "bg-red-100 text-red-700 p-3 rounded-md" }, error),
            React.createElement("div", null, 
                React.createElement("label", { className: "block font-medium" }, "Role"),
// FIX: Add an explicit type for the `onChange` event handler to help TypeScript correctly infer props for the `select` element, resolving the error on the `value` property.
// FIX: Replaced individual option elements with a mapped array and spread operator to resolve a TypeScript type inference issue, consistent with other working dropdowns in the app.
                React.createElement("select", { value: role, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setRole(e.target.value), className: "w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" },
                    ...[{value: "teacher", label: "Teacher"}, {value: "student", label: "Student"}].map(opt => React.createElement("option", { key: opt.value, value: opt.value }, opt.label))
                )
            ),
            React.createElement("div", null,
                 React.createElement("label", { className: "block font-medium" }, "Select Profile"),
                 React.createElement("select", { value: profileId, onChange: e => setProfileId(e.target.value), required: true, className: "w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" },
                     React.createElement("option", { value: "", disabled: true }, "Select a profile"),
                     ...(profiles.length > 0 ? profiles.map(p => React.createElement("option", { key: p.id, value: p.id }, `${p.name} (${p.email})`))
                     : [React.createElement("option", { value: "", disabled: true }, `No available ${role} profiles`)])
                 )
            ),
            React.createElement("div", null,
                React.createElement("label", { className: "block font-medium" }, "Password"),
                React.createElement("input", { type: "password", value: password, onChange: e => setPassword(e.target.value), required: true, className: "w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" })
            ),
            React.createElement("div", { className: "flex justify-end gap-2" },
                React.createElement("button", { type: "button", onClick: onCancel, className: "bg-gray-200 dark:bg-slate-600 px-4 py-2 rounded-md" }, "Cancel"),
                React.createElement("button", { type: "submit", className: "bg-indigo-600 text-white px-4 py-2 rounded-md" }, "Create User")
            )
        );
    };

    return React.createElement("div", { className: "bg-white/80 dark:bg-slate-800/50 p-6 rounded-2xl shadow-md" },
        React.createElement("div", { className: "flex justify-between items-center mb-4" },
            React.createElement("h3", { className: "font-bold text-lg" }, "User Account Management"),
            React.createElement("button", { onClick: () => { setError(''); setModalOpen(true); }, className: "flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 font-semibold" }, React.createElement(AddIcon, null), "Add User")
        ),
        modalOpen && React.createElement("div", { className: "fixed inset-0 bg-black/50 z-50 flex items-center justify-center" }, 
            React.createElement("div", { className: "bg-white dark:bg-slate-800 p-6 rounded-lg w-full max-w-md" },
                React.createElement("h3", { className: "text-lg font-bold mb-4" }, "Create New User"),
                React.createElement(UserForm, { onSave: handleSave, onCancel: () => setModalOpen(false) })
            )
        ),
        React.createElement("div", { className: "space-y-4" },
            users.length > 0 ? users.map(user =>
                React.createElement("div", { key: user._id, className: "flex justify-between items-center p-3 bg-gray-100 dark:bg-slate-900/50 rounded-lg" },
                    React.createElement("div", null,
                        // FIX: Added a comma between the two <p> elements to correct a syntax error that was causing a TypeScript type error.
                        // FIX: Add a fallback value for the user's name. The map `get` method can return `undefined`, which is not a valid React child and would cause a render error.
                        React.createElement("p", { className: "font-semibold" }, (user.role === 'teacher' ? facultyMap.get(user.profileId) : studentMap.get(user.profileId)) || '[Profile Not Found]'),
                        React.createElement("p", { className: "text-xs text-gray-500" }, user.username, " (", user.role, ")")
                    ),
                    React.createElement("button", { onClick: () => handleDelete(user), className: "text-red-500 hover:text-red-700" }, React.createElement(DeleteIcon, null))
                )
            ) : React.createElement("p", { className: "text-gray-500 dark:text-gray-400 text-center py-8" }, "No teacher or student user accounts found.")
        )
    );
};

const PlaceholderContent = ({ title, icon, message = "This feature is under development and will be available soon." }) => (
    React.createElement("div", { className: "bg-white/80 dark:bg-slate-800/50 backdrop-blur-lg border-2 border-dashed border-gray-300 dark:border-slate-700 p-8 rounded-2xl shadow-inner text-center flex flex-col items-center justify-center min-h-[400px]" },
        React.createElement("div", { className: "text-gray-400 dark:text-gray-500 mb-4" }, icon),
        React.createElement("h3", { className: "text-xl font-bold text-gray-800 dark:text-gray-100" }, title),
        React.createElement("p", { className: "text-gray-500 dark:text-gray-400 mt-2 max-w-sm" }, message)
    )
);

const AdminDashboard = (props) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const studentCount = props.students.length;
    
    const renderContent = () => {
        switch(activeTab) {
            case 'overview':
                return React.createElement(React.Fragment, null,
                    React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" },
                        React.createElement("div", {className: "bg-white/80 dark:bg-slate-800/50 p-6 rounded-2xl flex items-center gap-4"}, React.createElement("div", {className: "bg-blue-500/10 text-blue-500 p-3 rounded-full"}, React.createElement(StudentIcon, null)), React.createElement("div", null, React.createElement("div", {className: "text-3xl font-bold"}, studentCount), React.createElement("div", {className: "text-gray-500"}, "Students"))),
                        React.createElement("div", {className: "bg-white/80 dark:bg-slate-800/50 p-6 rounded-2xl flex items-center gap-4"}, React.createElement("div", {className: "bg-green-500/10 text-green-500 p-3 rounded-full"}, React.createElement(TeacherIcon, null)), React.createElement("div", null, React.createElement("div", {className: "text-3xl font-bold"}, props.faculty.length), React.createElement("div", {className: "text-gray-500"}, "Teachers"))),
                        React.createElement("div", {className: "bg-white/80 dark:bg-slate-800/50 p-6 rounded-2xl flex items-center gap-4"}, React.createElement("div", {className: "bg-yellow-500/10 text-yellow-500 p-3 rounded-full"}, React.createElement(UsersIcon, {className:"h-6 w-6"})), React.createElement("div", null, React.createElement("div", {className: "text-3xl font-bold"}, props.classes.length), React.createElement("div", {className: "text-gray-500"}, "Classes"))),
                        React.createElement("div", {className: "bg-white/80 dark:bg-slate-800/50 p-6 rounded-2xl flex items-center gap-4"}, React.createElement("div", {className: "bg-red-500/10 text-red-500 p-3 rounded-full"}, React.createElement(BookOpenIcon, {className:"h-6 w-6"})), React.createElement("div", null, React.createElement("div", {className: "text-3xl font-bold"}, props.subjects.length), React.createElement("div", {className: "text-gray-500"}, "Subjects")))
                    ),
                    React.createElement("div", { className: "bg-white/80 dark:bg-slate-800/50 p-8 rounded-2xl shadow-lg text-center" },
                        React.createElement("h2", { className: "text-2xl font-bold mb-2" }, "Timetable Scheduler"),
                        React.createElement("p", { className: "text-gray-500 max-w-2xl mx-auto mb-6" }, "Use the AI-powered scheduler to generate and manage academic timetables."),
                        React.createElement("button", { onClick: () => navigate('/scheduler'), className: "bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg flex items-center gap-3 mx-auto transition-transform transform hover:scale-105 shadow-lg shadow-indigo-600/30" }, React.createElement(SchedulerIcon, {className: 'h-5 w-5'}), "Open Scheduler")
                    )
                );
            case 'classroom':
                return React.createElement(ClassroomManager, { ...props });
            case 'users':
                return React.createElement(UserManager, { faculty: props.faculty, students: props.students, users: props.users, onSaveUser: props.onSaveUser, onDeleteUser: props.onDeleteUser });
            case 'resources':
                return React.createElement(PlaceholderContent, { title: "Classrooms & Resources", icon: React.createElement(ResourcesIcon, { className: "h-12 w-12" }) });
            case 'attendance':
                return React.createElement(PlaceholderContent, { title: "Attendance Monitoring", icon: React.createElement(AttendanceIcon, { className: "h-12 w-12" }) });
            case 'ims':
                return React.createElement(PlaceholderContent, { title: "IMS Academic Management", icon: React.createElement(IMSIcon, { className: "h-12 w-12" }) });
            case 'communication':
                return React.createElement(PlaceholderContent, { title: "Communication", icon: React.createElement(CommunicationIcon, { className: "h-12 w-12" }) });
            case 'analytics':
                return React.createElement(PlaceholderContent, { title: "Analytics & Reports", icon: React.createElement(AnalyticsIcon, { className: "h-12 w-12" }) });
            case 'security':
                return React.createElement(PlaceholderContent, { title: "Security & Access Control", icon: React.createElement(SecurityIcon, { className: "h-12 w-12" }) });
            case 'ai':
                return React.createElement(PlaceholderContent, { title: "AI Insights", icon: React.createElement(AIIcon, { className: "h-12 w-12" }) });
            default: return null;
        }
    }
    
    return (
        React.createElement("div", { className: "p-4 md:p-8 min-h-screen bg-transparent" },
            React.createElement(Header, { title: "Admin Control Center", subtitle: `Welcome, ${props.user.username}`, ...props }),
            React.createElement(Tabs, null,
                React.createElement(TabButton, { isActive: activeTab === 'overview', onClick: () => setActiveTab('overview'), children: [React.createElement(SchedulerIcon, {className: 'h-5 w-5'}), "Overview"] }),
                React.createElement(TabButton, { isActive: activeTab === 'classroom', onClick: () => setActiveTab('classroom'), children: [React.createElement(UsersIcon, {className: 'h-5 w-5'}), "Classroom Management"] }),
                React.createElement(TabButton, { isActive: activeTab === 'users', onClick: () => setActiveTab('users'), children: [React.createElement(UsersIcon, {className: 'h-5 w-5'}), "Users"] }),
                React.createElement(TabButton, { isActive: activeTab === 'resources', onClick: () => setActiveTab('resources'), children: [React.createElement(ResourcesIcon, {className: 'h-5 w-5'}), "Resources"] }),
                React.createElement(TabButton, { isActive: activeTab === 'attendance', onClick: () => setActiveTab('attendance'), children: [React.createElement(AttendanceIcon, {className: 'h-5 w-5'}), "Attendance"] }),
                React.createElement(TabButton, { isActive: activeTab === 'ims', onClick: () => setActiveTab('ims'), children: [React.createElement(IMSIcon, {className: 'h-5 w-5'}), "IMS"] }),
                React.createElement(TabButton, { isActive: activeTab === 'communication', onClick: () => setActiveTab('communication'), children: [React.createElement(CommunicationIcon, {className: 'h-5 w-5'}), "Communication"] }),
                React.createElement(TabButton, { isActive: activeTab === 'analytics', onClick: () => setActiveTab('analytics'), children: [React.createElement(AnalyticsIcon, {className: 'h-5 w-5'}), "Analytics"] }),
                React.createElement(TabButton, { isActive: activeTab === 'security', onClick: () => setActiveTab('security'), children: [React.createElement(SecurityIcon, {className: 'h-5 w-5'}), "Security"] }),
                React.createElement(TabButton, { isActive: activeTab === 'ai', onClick: () => setActiveTab('ai'), children: [React.createElement(AIIcon, {className: 'h-5 w-5'}), "AI Insights"] })
            ),
            renderContent()
        )
    );
};

const TeacherDashboard = (props) => {
    const [activeTab, setActiveTab] = useState('timetable');

    const myFacultyProfile = useMemo(() => 
        props.faculty.find(f => f.email === props.user.username), 
    [props.faculty, props.user.username]);

    const teacherTimetable = useMemo(() => {
        if (!myFacultyProfile) return [];
        return (props.timetable || []).filter(e => e.faculty === myFacultyProfile.name);
    }, [props.timetable, myFacultyProfile]);
    
    const teacherClasses = useMemo(() => {
        if (!teacherTimetable) return [];
        const classNames = [...new Set(teacherTimetable.map(e => e.className))];
        return classNames.map(name => props.classes.find(c => c.name === name)).filter(Boolean);
    }, [teacherTimetable, props.classes]);

    const [selectedClassId, setSelectedClassId] = useState('');
    const [channel, setChannel] = useState('query');
    
    useEffect(() => {
        if (teacherClasses.length > 0 && !selectedClassId) {
            setSelectedClassId(teacherClasses[0].id);
        }
    }, [teacherClasses, selectedClassId]);
    
    const renderContent = () => {
        switch(activeTab) {
            case 'timetable': return React.createElement(TimetableGrid, { timetable: teacherTimetable, role: "teacher" });
            case 'attendance': 
                if (teacherClasses.length === 0) {
                     return React.createElement(PlaceholderContent, { title: "Attendance Unavailable", icon: React.createElement(AttendanceIcon, {className:"h-12 w-12"}), message: "You are not assigned to any classes with a timetable. Attendance marking will be available once your schedule is generated." });
                }
                return React.createElement(AttendanceManager, { ...props, classes: teacherClasses });
            case 'chat': 
                if (teacherClasses.length === 0) {
                    return React.createElement(PlaceholderContent, { title: "Chat Unavailable", icon: React.createElement(ChatIcon, {className:"h-12 w-12"}), message: "You are not assigned to any classes with a timetable. Chat will be available once your schedule is generated." });
                }
                return React.createElement(React.Fragment, null,
                    React.createElement("div", { className: "flex gap-4 mb-4" },
                        React.createElement("select", { value: selectedClassId, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setSelectedClassId(e.target.value), className: "p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" }, ...teacherClasses.map(c => React.createElement("option", { key: c.id, value: c.id }, c.name))),
                        React.createElement("select", { value: channel, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setChannel(e.target.value), className: "p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" }, React.createElement("option", { value: "query" }, "Query"), React.createElement("option", { value: "attendance" }, "Attendance"))
                    ),
                    React.createElement(ChatComponent, { ...props, classId: selectedClassId, channel: channel })
                );
            case 'ims': return React.createElement(PlaceholderContent, { title: "IMS", icon: React.createElement(IMSIcon, { className: "h-12 w-12" }) });
            case 'smart_tools': return React.createElement(PlaceholderContent, { title: "Smart Tools", icon: React.createElement(SmartToolsIcon, { className: "h-12 w-12" }) });
            case 'availability': return React.createElement(PlaceholderContent, { title: "Availability", icon: React.createElement(AvailabilityIcon, { className: "h-12 w-12" }) });
            case 'requests': return React.createElement(PlaceholderContent, { title: "Requests", icon: React.createElement(RequestsIcon, { className: "h-12 w-12" }) });
            case 'notifications': return React.createElement(PlaceholderContent, { title: "Notifications", icon: React.createElement(NotificationsIcon, { className: "h-12 w-12" }) });
            default: return null;
        }
    };
    
    return React.createElement("div", { className: "p-4 md:p-8 min-h-screen bg-transparent" },
        React.createElement(Header, { title: "Teacher Dashboard", subtitle: `Welcome, ${myFacultyProfile?.name || props.user.username}`, ...props }),
        React.createElement(Tabs, null,
            React.createElement(TabButton, { isActive: activeTab === 'timetable', onClick: () => setActiveTab('timetable'), children: [React.createElement(SchedulerIcon, {className: 'h-5 w-5'}), "My Timetable"] }),
            React.createElement(TabButton, { isActive: activeTab === 'ims', onClick: () => setActiveTab('ims'), children: [React.createElement(IMSIcon, {className: 'h-5 w-5'}), "IMS"] }),
            React.createElement(TabButton, { isActive: activeTab === 'smart_tools', onClick: () => setActiveTab('smart_tools'), children: [React.createElement(SmartToolsIcon, {className: 'h-5 w-5'}), "Smart Tools"] }),
            React.createElement(TabButton, { isActive: activeTab === 'availability', onClick: () => setActiveTab('availability'), children: [React.createElement(AvailabilityIcon, {className: 'h-5 w-5'}), "Availability"] }),
            React.createElement(TabButton, { isActive: activeTab === 'requests', onClick: () => setActiveTab('requests'), children: [React.createElement(RequestsIcon, {className: 'h-5 w-5'}), "Requests"] }),
            React.createElement(TabButton, { isActive: activeTab === 'notifications', onClick: () => setActiveTab('notifications'), children: [React.createElement(NotificationsIcon, {className: 'h-5 w-5'}), "Notifications"] }),
            React.createElement(TabButton, { isActive: activeTab === 'attendance', onClick: () => setActiveTab('attendance'), children: [React.createElement(AttendanceIcon, {className: 'h-5 w-5'}), "Attendance"] }),
            React.createElement(TabButton, { isActive: activeTab === 'chat', onClick: () => setActiveTab('chat'), children: [React.createElement(ChatIcon, {className: 'h-5 w-5'}), "Chat"] })
        ),
        renderContent()
    )
};

const UpcomingClasses = ({ upcoming }) => {
  const getRelativeDay = (dayName) => {
    const now = new Date();
    const jsDayToName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = jsDayToName[now.getDay()];

    if (dayName.toLowerCase() === todayName) return "Today";
    
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowName = jsDayToName[tomorrow.getDay()];

    if (dayName.toLowerCase() === tomorrowName) return "Tomorrow";
    
    return dayName.charAt(0).toUpperCase() + dayName.slice(1);
  };

  return (
    React.createElement("div", { className: "bg-white/80 dark:bg-slate-800/50 backdrop-blur-lg border border-gray-200 dark:border-slate-700 p-6 rounded-2xl shadow-md h-full" },
      React.createElement("h3", { className: "text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2" }, React.createElement(SchedulerIcon, { className: "h-6 w-6" }), "Upcoming Classes"),
      upcoming.length > 0 ? (
        React.createElement("div", { className: "space-y-4" },
          upcoming.map((entry, index) => (
            React.createElement("div", { key: `${entry.day}-${entry.time}-${entry.subject}-${index}`, className: "p-4 bg-gray-50 dark:bg-slate-900/50 rounded-lg border border-gray-200 dark:border-slate-700" },
              React.createElement("div", { className: "flex justify-between items-start" },
                React.createElement("p", { className: "font-bold text-gray-800 dark:text-gray-100" }, entry.subject),
                React.createElement("span", { className: `text-xs font-semibold px-2 py-1 rounded-full ${entry.type === 'lab' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300'}` }, getRelativeDay(entry.day))
              ),
              React.createElement("p", { className: "text-sm text-gray-500 dark:text-gray-400 mt-1" }, entry.time),
              React.createElement("div", { className: "text-sm text-gray-600 dark:text-gray-300 mt-2 flex justify-between" },
                React.createElement("span", null, entry.faculty),
                React.createElement("span", null, "Room: ", entry.room)
              )
            )
          ))
        )
      ) : (
        React.createElement("div", { className: "text-center py-12 flex flex-col items-center justify-center h-full" },
           React.createElement(SchedulerIcon, { className: "h-10 w-10 text-gray-400 dark:text-gray-500 mx-auto mb-3" }),
           React.createElement("p", { className: "text-gray-500 dark:text-gray-400" }, "No more classes scheduled for this week. Enjoy your break!")
        )
      )
    )
  );
};

const StudentDashboard = (props) => {
    const [activeTab, setActiveTab] = useState('schedule');
    
    // FIX: Removed insecure fallback. Now strictly finds the student profile matching the logged-in user.
    const myStudentProfile = useMemo(() => props.students.find(s => s.email === props.user.username), [props.students, props.user.username]);
    
    // FIX: This logic now safely handles cases where the student profile might not be found.
    const myClass = useMemo(() => myStudentProfile ? props.classes.find(c => c.id === myStudentProfile.classId) : null, [props.classes, myStudentProfile]);
    
    // FIX: Ensure timetable is filtered only if a class is found.
    const studentTimetable = useMemo(() => (myClass && props.timetable) ? props.timetable.filter(e => e.className === myClass.name) : [], [props.timetable, myClass]);
    
    const [channel, setChannel] = useState('query');

    const upcomingClasses = useMemo(() => {
        if (!studentTimetable.length) return [];
        
        const now = new Date();
        const jsDayToName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayName = jsDayToName[now.getDay()];
        const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

        const dayIndexMap = Object.fromEntries(DAYS.map((day, i) => [day.toLowerCase(), i]));

        const getStartTimeInMinutes = (timeSlot) => {
          const [start] = timeSlot.split('-');
          const [h, m] = start.split(':').map(Number);
          return h * 60 + m;
        };

        return studentTimetable
          .map(entry => ({
            ...entry,
            dayIndex: dayIndexMap[entry.day.toLowerCase()],
            startTimeMinutes: getStartTimeInMinutes(entry.time),
          }))
          .filter(entry => {
            const entryDayIndex = entry.dayIndex;
            const todayDayIndex = dayIndexMap[todayName];

            if (todayDayIndex === undefined) return true;
            if (entryDayIndex > todayDayIndex) return true;
            if (entryDayIndex === todayDayIndex) return entry.startTimeMinutes > currentTimeInMinutes;
            
            return false;
          })
          .sort((a, b) => {
            if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
            return a.startTimeMinutes - b.startTimeMinutes;
          })
          .slice(0, 4);
    }, [studentTimetable]);

    // NEW: If the student profile is not found, display a clear, helpful message instead of potentially incorrect data.
    if (!myStudentProfile) {
        return React.createElement("div", { className: "p-4 md:p-8 min-h-screen bg-transparent" },
            React.createElement(Header, { title: "Student Dashboard", subtitle: `Welcome, ${props.user.username}`, ...props }),
            React.createElement(PlaceholderContent, {
                title: "Profile Not Found",
                icon: React.createElement(UsersIcon, { className: "h-12 w-12" }),
                message: "We couldn't find your student profile. Please contact the administration to ensure your account is set up correctly."
            })
        );
    }

    const renderContent = () => {
        switch(activeTab) {
            case 'schedule': 
                return (
                    React.createElement("div", { className: "grid grid-cols-1 xl:grid-cols-4 gap-8" },
                        React.createElement("div", { className: "xl:col-span-3" },
                            React.createElement(TimetableGrid, { timetable: studentTimetable, role: "student" })
                        ),
                        React.createElement("div", { className: "xl:col-span-1" },
                            React.createElement(UpcomingClasses, { upcoming: upcomingClasses })
                        )
                    )
                );
            case 'chat': 
                if (!myClass) {
                    return React.createElement(PlaceholderContent, { title: "Chat Unavailable", icon: React.createElement(ChatIcon, { className: "h-12 w-12" }), message: "You are not currently assigned to a class. Please contact an administrator." });
                }
                return React.createElement(React.Fragment, null,
                    React.createElement("div", { className: "flex gap-4 mb-4" },
                        React.createElement("select", { value: channel, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setChannel(e.target.value), className: "p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" }, React.createElement("option", { value: "query" }, "Query"), React.createElement("option", { value: "attendance" }, "Attendance"))
                    ),
                    React.createElement(ChatComponent, { ...props, classId: myClass.id, channel: channel })
                );
            case 'ims': return React.createElement(PlaceholderContent, { title: "IMS", icon: React.createElement(IMSIcon, { className: "h-12 w-12" }) });
            case 'smart_tools': return React.createElement(PlaceholderContent, { title: "Smart Tools", icon: React.createElement(SmartToolsIcon, { className: "h-12 w-12" }) });
            case 'subjects': return React.createElement(PlaceholderContent, { title: "Subjects", icon: React.createElement(BookOpenIcon, { className: "h-12 w-12" }) });
            case 'upcoming': return React.createElement(PlaceholderContent, { title: "Upcoming Classes", icon: React.createElement(SchedulerIcon, { className: "h-12 w-12" }) });
            case 'notifications': return React.createElement(PlaceholderContent, { title: "Notifications", icon: React.createElement(NotificationsIcon, { className: "h-12 w-12" }) });
            case 'exams': return React.createElement(PlaceholderContent, { title: "Exams", icon: React.createElement(ExamsIcon, { className: "h-12 w-12" }) });
            case 'attendance': return React.createElement(PlaceholderContent, { title: "Attendance", icon: React.createElement(AttendanceIcon, { className: "h-12 w-12" }) });
            case 'extras': return React.createElement(PlaceholderContent, { title: "Extras", icon: React.createElement(ExtrasIcon, { className: "h-12 w-12" }) });
            default: return null;
        }
    };
    
    return React.createElement("div", { className: "p-4 md:p-8 min-h-screen bg-transparent" },
        React.createElement(Header, { title: "Student Dashboard", subtitle: `Welcome, ${myStudentProfile?.name || props.user.username}`, ...props }),
        React.createElement(Tabs, null,
            React.createElement(TabButton, { isActive: activeTab === 'schedule', onClick: () => setActiveTab('schedule'), children: [React.createElement(SchedulerIcon, { className: 'h-5 w-5'}), "My Schedule"] }),
            React.createElement(TabButton, { isActive: activeTab === 'ims', onClick: () => setActiveTab('ims'), children: [React.createElement(IMSIcon, {className: 'h-5 w-5'}), "IMS"] }),
            React.createElement(TabButton, { isActive: activeTab === 'smart_tools', onClick: () => setActiveTab('smart_tools'), children: [React.createElement(SmartToolsIcon, {className: 'h-5 w-5'}), "Smart Tools"] }),
            React.createElement(TabButton, { isActive: activeTab === 'subjects', onClick: () => setActiveTab('subjects'), children: [React.createElement(BookOpenIcon, {className: 'h-5 w-5'}), "Subjects"] }),
            React.createElement(TabButton, { isActive: activeTab === 'chat', onClick: () => setActiveTab('chat'), children: [React.createElement(ChatIcon, {className: 'h-5 w-5'}), "Class Chat"] }),
            React.createElement(TabButton, { isActive: activeTab === 'attendance', onClick: () => setActiveTab('attendance'), children: [React.createElement(AttendanceIcon, {className: 'h-5 w-5'}), "Attendance"] }),
            React.createElement(TabButton, { isActive: activeTab === 'upcoming', onClick: () => setActiveTab('upcoming'), children: [React.createElement(SchedulerIcon, {className: 'h-5 w-5'}), "Upcoming"] }),
            React.createElement(TabButton, { isActive: activeTab === 'notifications', onClick: () => setActiveTab('notifications'), children: [React.createElement(NotificationsIcon, {className: 'h-5 w-5'}), "Notifications"] }),
            React.createElement(TabButton, { isActive: activeTab === 'exams', onClick: () => setActiveTab('exams'), children: [React.createElement(ExamsIcon, {className: 'h-5 w-5'}), "Exams"] }),
            React.createElement(TabButton, { isActive: activeTab === 'extras', onClick: () => setActiveTab('extras'), children: [React.createElement(ExtrasIcon, {className: 'h-5 w-5'}), "Extras"] })
        ),
        renderContent()
    )
};

export const Dashboard = (props) => {
    const { user, ...restProps } = props;
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    
    useEffect(() => {
        const loadTimetable = () => {
            try {
                const sharedData = JSON.parse(localStorage.getItem('smartCampusShared') || '{}');
                if (sharedData.timetable) {
                    setTimetable(sharedData.timetable);
                }
            } catch (error) {
                console.error("Failed to load timetable from storage", error);
            }
        };
        loadTimetable();
        window.addEventListener('storage', loadTimetable);
        return () => window.removeEventListener('storage', loadTimetable);
    }, []);

    const dashboardProps = { ...restProps, user, timetable };

    switch (user.role) {
        case 'admin': return React.createElement(AdminDashboard, dashboardProps);
        case 'teacher': return React.createElement(TeacherDashboard, dashboardProps);
        case 'student': return React.createElement(StudentDashboard, dashboardProps);
        default: return React.createElement("div", null, "Invalid role");
    }
};