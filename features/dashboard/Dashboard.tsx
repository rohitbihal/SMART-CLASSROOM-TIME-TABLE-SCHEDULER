import React, { useState, useEffect, useRef, useMemo } from 'react';
// Fix: Use wildcard import for react-router-dom to address potential module resolution issues.
import * as ReactRouterDOM from 'react-router-dom';
import {
    LogoutIcon, MoonIcon, SchedulerIcon, StudentIcon, SubjectIcon, SunIcon, TeacherIcon, ChatIcon, EditIcon, DeleteIcon, AddIcon, SaveIcon, UsersIcon,
    IMSIcon, AnalyticsIcon, SecurityIcon, AIIcon, ResourcesIcon, AttendanceIcon, CommunicationIcon, SmartToolsIcon, NotificationsIcon, ExamsIcon, ExtrasIcon, BookOpenIcon, AvailabilityIcon, RequestsIcon, ProfileIcon, CameraIcon, UploadIcon
} from '../../components/Icons';
import { DAYS, TIME_SLOTS } from '../../constants';
import { TimetableEntry, Class, Faculty, Subject, Constraints, ChatMessage, Student, Attendance, AttendanceStatus, User } from '../../types';

// --- Prop Interfaces ---

interface TabContainerProps {
    children: React.ReactNode;
    className?: string;
}

interface TabButtonProps {
    isActive: boolean;
    onClick: () => void;
    children: React.ReactNode;
}

interface HeaderProps {
    user: User;
    title: string;
    subtitle: string;
    onLogout: () => void;
    theme: string;
    toggleTheme: () => void;
    onProfileClick: () => void;
}

interface TimetableGridProps {
    timetable: TimetableEntry[];
    role?: 'student' | 'teacher';
}

interface ChatComponentProps {
    messages: ChatMessage[];
    onSendMessage: (text: string, classId: string, channel: string) => void;
    user: User;
    constraints: Constraints;
    classId: string;
    channel: string;
}

interface StudentFormProps {
    student: Student | null;
    onSave: (data: Partial<Student>) => Promise<void>;
    onCancel: () => void;
    classId: string;
}

interface ClassroomManagerProps {
    classes: Class[];
    students: Student[];
    onSaveEntity: (type: 'student', data: Partial<Student>) => Promise<void>;
    onDeleteEntity: (type: 'student', id: string) => Promise<void>;
    constraints: Constraints;
    updateConstraints: (c: Constraints) => void;
}

interface AttendanceManagerProps {
    classes: Class[];
    students: Student[];
    attendance: Attendance;
    onUpdateAttendance: (classId: string, date: string, studentId: string, status: AttendanceStatus) => void;
}

interface UserManagerProps {
    faculty: Faculty[];
    students: Student[];
    users: User[];
    onSaveUser: (userData: Partial<User>) => Promise<void>;
    onDeleteUser: (userId: string) => Promise<void>;
}

interface UserFormProps {
    onSave: (userData: Partial<User>) => Promise<void>;
    onCancel: () => void;
    availableFaculty: Faculty[];
    availableStudents: Student[];
}

interface PlaceholderContentProps {
    title: string;
    icon: React.ReactNode;
    message?: string;
}

interface UpcomingClassesProps {
    upcoming: TimetableEntry[];
}

// Fix: Removed `timetable` and `onProfileClick` from DashboardProps as they are handled internally by the Dashboard component.
interface DashboardProps {
    user: User;
    onLogout: () => void;
    theme: string;
    toggleTheme: () => void;
    classes: Class[];
    faculty: Faculty[];
    subjects: Subject[];
    students: Student[];
    users: User[];
    constraints: Constraints;
    updateConstraints: (c: Constraints) => void;
    chatMessages: ChatMessage[];
    onSendMessage: (text: string, classId: string, channel: string) => void;
    attendance: Attendance;
    onUpdateAttendance: (classId: string, date: string, studentId: string, status: AttendanceStatus) => void;
    onSaveEntity: (type: 'class' | 'faculty' | 'subject' | 'room' | 'student', data: any) => Promise<void>;
    onDeleteEntity: (type: 'class' | 'faculty' | 'subject' | 'room' | 'student', id: string) => Promise<void>;
    onSaveUser: (userData: any) => Promise<void>;
    onDeleteUser: (userId: string) => Promise<void>;
    onUpdateProfilePicture: (dataUrl: string) => void;
    token: string | null;
}

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children?: React.ReactNode;
    error?: string | null;
}

interface ProfilePictureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (dataUrl: string) => void;
    currentUser: User;
}

// Reusable UI Components
const Tabs = ({ children, className = '' }: TabContainerProps) => React.createElement("div", { className: `bg-white/80 dark:bg-slate-800/50 backdrop-blur-lg border border-gray-200 dark:border-slate-700 p-2 rounded-xl shadow-md flex flex-wrap gap-2 mb-8 ${className}` }, children);
const TabButton = ({ isActive, onClick, children }: TabButtonProps) => React.createElement("button", { onClick, className: `flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg transition-all ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-slate-700/50'}` }, children);
const ErrorDisplay = ({ message }: { message: string | null }) => {
    if (!message) return null;
    return React.createElement("div", { className: "bg-red-500/10 dark:bg-red-900/50 border border-red-500/50 text-red-700 dark:text-red-300 p-3 rounded-md text-sm my-2", role: "alert" }, message);
};

const Modal = ({ isOpen, onClose, title, children = null, error = null }: ModalProps) => {
    if (!isOpen) return null;

    return (
        React.createElement("div", { className: "fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4", "aria-modal": true, role: "dialog" },
            React.createElement("div", { className: "bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" },
                React.createElement("div", { className: "flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-700" },
                    React.createElement("h2", { className: "text-lg font-bold text-gray-800 dark:text-gray-100" }, title),
                    React.createElement("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" },
                        React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-6 w-6", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
                            React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" })
                        )
                    )
                ),
                React.createElement("div", { className: "p-6 overflow-y-auto" }, 
                    React.createElement(ErrorDisplay, { message: error }),
                    children
                )
            )
        )
    );
};

const Header = ({ user, title, subtitle, onLogout, theme, toggleTheme, onProfileClick }: HeaderProps) => (
    React.createElement("div", { className: "bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-2xl shadow-lg mb-8 flex justify-between items-center" },
        React.createElement("div", null,
            React.createElement("h1", { className: "text-3xl font-bold" }, title),
            React.createElement("p", { className: "opacity-90 mt-1" }, subtitle)
        ),
        React.createElement("div", {className: "flex items-center gap-2"},
             React.createElement("button", { onClick: onProfileClick, className: "h-12 w-12 rounded-full bg-white/20 flex items-center justify-center ring-2 ring-white/50 hover:ring-white transition", title: "Change Profile Picture" },
                user.profilePictureUrl ?
                    React.createElement("img", { src: user.profilePictureUrl, alt: "Profile", className: "h-full w-full rounded-full object-cover" }) :
                    React.createElement(ProfileIcon, { className: "h-7 w-7 text-white" })
            ),
            React.createElement("button", { onClick: toggleTheme, className: "bg-white/20 hover:bg-white/30 text-white font-semibold p-2.5 rounded-lg flex items-center gap-2 transition" },
                theme === 'dark' ? React.createElement(SunIcon, null) : React.createElement(MoonIcon, null)
            ),
            React.createElement("button", { onClick: onLogout, className: "bg-white/20 hover:bg-white/30 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition" },
                React.createElement(LogoutIcon, null), " Logout"
            )
        )
    )
);

const TimetableGrid = ({ timetable, role = 'student' }: TimetableGridProps) => {
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
    
    const getEntry = (day: string, time: string) => timetable.find(e => e.day.toLowerCase() === day.toLowerCase() && e.time === time);

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

const ChatComponent = ({ messages, onSendMessage, user, constraints, classId, channel }: ChatComponentProps) => {
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
        const formatTime = (timeStr: string) => new Date(`1970-01-01T${timeStr}:00`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

        const open = currentTime >= startTime && currentTime <= endTime;
        return { isOpen: open, statusText: `Chat is ${open ? 'open' : 'closed'}. Hours: ${formatTime(chatWindow.start)} - ${formatTime(chatWindow.end)}.` };
    }, [chatWindow]);

    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages, classId, channel]);

    const handleSend = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (newMessage.trim() && isOpen && classId) {
            onSendMessage(newMessage, classId, channel);
            setNewMessage('');
        }
    };
    
    const filteredMessages = messages.filter(m => m.classId === classId && m.channel === channel);
    const roleColors: { [key in 'admin' | 'teacher' | 'student']: string } = { admin: 'bg-red-500', teacher: 'bg-green-500', student: 'bg-blue-500' };

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
                React.createElement("input", { type: "text", value: newMessage, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value), placeholder: isOpen ? "Type a message..." : "Chat is closed", disabled: !isOpen, className: "flex-grow p-3 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition disabled:opacity-50" }),
                React.createElement("button", { type: "submit", disabled: !isOpen || !newMessage.trim(), className: "bg-indigo-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-indigo-700 transition disabled:bg-indigo-400 disabled:cursor-not-allowed" }, "Send")
            )
        )
    );
};

const StudentForm = ({ student, onSave, onCancel, classId }: StudentFormProps) => {
    const [formData, setFormData] = useState(
        student
            ? { ...student, email: student.email || '', roll: student.roll || '' }
            : { name: '', email: '', roll: '', classId }
    );
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            await onSave(formData);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        }
    };
    
    return React.createElement("form", { onSubmit: handleSubmit, className: "space-y-4 bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg" },
        React.createElement(ErrorDisplay, { message: error }),
        React.createElement("input", { name: "name", value: formData.name, onChange: handleChange, placeholder: "Student Name", className: "w-full p-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-md", required: true }),
        React.createElement("input", { name: "email", type: "email", value: formData.email, onChange: handleChange, placeholder: "Email (optional)", className: "w-full p-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-md" }),
        React.createElement("input", { name: "roll", value: formData.roll, onChange: handleChange, placeholder: "Roll Number", className: "w-full p-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-md" }),
        React.createElement("div", { className: "flex gap-2 justify-end" },
            React.createElement("button", { type: "button", onClick: onCancel, className: "bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 font-semibold py-2 px-4 rounded-md" }, "Cancel"),
            React.createElement("button", { type: "submit", className: "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md" }, "Save")
        )
    );
};

const ClassroomManager = ({ classes, students, onSaveEntity, onDeleteEntity, constraints, updateConstraints }: ClassroomManagerProps) => {
    const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
    const [editingStudent, setEditingStudent] = useState<Student | { new: true } | null>(null);
    const [listError, setListError] = useState<string | null>(null);

    const studentsInClass = useMemo(() => students.filter(s => s.classId === selectedClassId), [students, selectedClassId]);
    const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);

    const handleChatWindowChange = (e: React.ChangeEvent<HTMLInputElement>) => updateConstraints({ ...constraints, chatWindow: { ...(constraints.chatWindow || { start: '', end: '' }), [e.target.name]: e.target.value } });
    
    const handleSaveStudent = async (studentData: Partial<Student>) => { 
        await onSaveEntity('student', studentData); 
        setEditingStudent(null); 
    };

    const handleDeleteStudent = async (studentId: string) => {
        setListError(null);
        try {
            await onDeleteEntity('student', studentId);
        } catch(err: unknown) {
            setListError(err instanceof Error ? err.message : "Could not delete student.");
        }
    };

    return React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-8" },
        React.createElement("div", { className: "lg:col-span-1" },
            React.createElement("div", { className: "bg-white/80 dark:bg-slate-800/50 p-6 rounded-2xl shadow-md" },
                React.createElement("h3", { className: "font-bold text-lg mb-4" }, "Select Class"),
                React.createElement("div", { className: "space-y-2" }, classes.map(c =>
                    React.createElement("button", { key: c.id, onClick: () => { setSelectedClassId(c.id); setListError(null); }, className: `w-full text-left p-3 rounded-lg transition ${selectedClassId === c.id ? 'bg-indigo-500 text-white' : 'hover:bg-gray-200/50 dark:hover:bg-slate-700/50'}` }, c.name)
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
                    React.createElement(ErrorDisplay, { message: listError }),
                    (editingStudent && 'new' in editingStudent) && React.createElement(StudentForm, { student: null, onSave: handleSaveStudent, onCancel: () => setEditingStudent(null), classId: selectedClassId }),
                    React.createElement("div", { className: "space-y-2 mt-4" }, studentsInClass.map(student =>
                        (editingStudent && 'id' in editingStudent && editingStudent.id === student.id) ? React.createElement(StudentForm, { key: student.id, student: student, onSave: handleSaveStudent, onCancel: () => setEditingStudent(null), classId: selectedClassId })
                        : React.createElement("div", { key: student.id, className: "flex justify-between items-center p-3 bg-gray-100 dark:bg-slate-900/50 rounded-lg" },
                            React.createElement("div", null,
                                React.createElement("p", { className: "font-semibold" }, student.name),
                                React.createElement("p", { className: "text-xs text-gray-500" }, "Roll: ", student.roll, " | ", student.email)
                            ),
                            React.createElement("div", { className: "flex gap-2" },
                                React.createElement("button", { onClick: () => setEditingStudent(student), className: "text-indigo-500 hover:text-indigo-700" }, React.createElement(EditIcon, null)),
                                React.createElement("button", { onClick: () => handleDeleteStudent(student.id), className: "text-red-500 hover:text-red-700" }, React.createElement(DeleteIcon, null))
                            )
                        )
                    ))
                )
            )
        )
    );
};

const AttendanceManager = ({ classes, students, attendance, onUpdateAttendance }: AttendanceManagerProps) => {
    const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const studentsInClass = students.filter(s => s.classId === selectedClassId);
    const attendanceForDay = attendance[selectedClassId]?.[selectedDate] || {};

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => { onUpdateAttendance(selectedClassId, selectedDate, studentId, status); };
    
    return React.createElement("div", { className: "bg-white/80 dark:bg-slate-800/50 p-6 rounded-2xl shadow-md" },
        React.createElement("h3", { className: "font-bold text-lg mb-4" }, "Mark Attendance"),
        React.createElement("div", { className: "flex gap-4 mb-4" },
            React.createElement("select", { value: selectedClassId, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setSelectedClassId(e.target.value), className: "p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" },
                ...classes.map(c => React.createElement("option", { key: c.id, value: c.id }, c.name))
            ),
            React.createElement("input", { type: "date", value: selectedDate, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value), className: "p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" })
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

const UserForm = ({ onSave, onCancel, availableFaculty, availableStudents }: UserFormProps) => {
    const [role, setRole] = useState<string>('teacher');
    const [profileId, setProfileId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>('');
    const profiles = role === 'teacher' ? availableFaculty : availableStudents;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const profile = profiles.find(p => p.id === profileId);
        if (!profileId || !password.trim() || !profile) {
            setError("Please select a valid profile and enter a password.");
            return;
        }
        
        try {
            await onSave({ username: profile.email || '', password, role: role as User['role'], profileId });
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred.");
        }
    };

    useEffect(() => { setProfileId(''); }, [role]);
    
    const profileOptions: React.ReactNode[] = [
        React.createElement("option", { key: "placeholder", value: "", disabled: true }, "Select a profile"),
        ...(profiles.length > 0
            ? profiles.map(p => React.createElement("option", { key: p.id, value: p.id }, `${p.name} (${p.email || ''})`))
            : [React.createElement("option", { key: "no-profiles", value: "", disabled: true }, `No available ${role} profiles`)])
    ];

    const roleData = [
        { value: 'teacher', label: 'Teacher' },
        { value: 'student', label: 'Student' }
    ];
    const roleOptions = roleData.map(r =>
        React.createElement("option", { key: r.value, value: r.value }, r.label)
    );

    return React.createElement("form", { onSubmit: handleSubmit, className: "space-y-4" },
        React.createElement(ErrorDisplay, { message: error }),
        React.createElement("div", { key: "role-selector" },
            React.createElement("label", { className: "block font-medium" }, "Role"),
            React.createElement("select", { value: role, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setRole(e.target.value), className: "w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" },
                ...roleOptions
            )
        ),
        React.createElement("div", { key: "profile-selector" },
            React.createElement("label", { className: "block font-medium" }, "Select Profile"),
            React.createElement("select", { value: profileId, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setProfileId(e.target.value), required: true, className: "w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" },
                ...profileOptions
            )
        ),
        React.createElement("div", { key: "password-input" },
            React.createElement("label", { className: "block font-medium" }, "Password"),
            React.createElement("input", { type: "password", value: password, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value), required: true, className: "w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" })
        ),
        React.createElement("div", { key: "action-buttons", className: "flex justify-end gap-2" },
            React.createElement("button", { type: "button", onClick: onCancel, className: "bg-gray-200 dark:bg-slate-600 px-4 py-2 rounded-md" }, "Cancel"),
            React.createElement("button", { type: "submit", className: "bg-indigo-600 text-white px-4 py-2 rounded-md" }, "Create User")
        )
    );
};


const UserManager = ({ faculty, students, users, onSaveUser, onDeleteUser }: UserManagerProps) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [listError, setListError] = useState<string>('');
    const [confirmDeleteUser, setConfirmDeleteUser] = useState<User | null>(null);

    const facultyMap = useMemo(() => new Map(faculty.map(f => [f.id, f.name])), [faculty]);
    const studentMap = useMemo(() => new Map(students.map(s => [s.id, s.name])), [students]);
    
    const userProfileIds = useMemo(() => new Set(users.map(u => u.profileId)), [users]);
    const availableFaculty = useMemo(() => faculty.filter(f => f.email && !userProfileIds.has(f.id)), [faculty, userProfileIds]);
    const availableStudents = useMemo(() => students.filter(s => s.email && !userProfileIds.has(s.id)), [students, userProfileIds]);

    const handleSave = async (userData: Partial<User>) => {
        await onSaveUser(userData);
        setModalOpen(false);
    };
    
    const handleDeleteRequest = (user: User) => {
        setListError('');
        setConfirmDeleteUser(user);
    };

    const executeDelete = async () => {
        if (!confirmDeleteUser || !confirmDeleteUser._id) return;
        
        setListError('');
        try {
            await onDeleteUser(confirmDeleteUser._id);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'An unknown server error occurred.';
            setListError(`Could not delete user '${confirmDeleteUser.username}'. Reason: ${message}`);
        } finally {
            setConfirmDeleteUser(null);
        }
    };

    // Fix: Added the UI for the UserManager component which was missing due to a truncated file.
    return React.createElement("div", { className: "bg-white/80 dark:bg-slate-800/50 p-6 rounded-2xl shadow-md" },
        React.createElement(Modal, {
            isOpen: modalOpen,
            onClose: () => setModalOpen(false),
            title: "Add New User"
        },
            React.createElement(UserForm, {
                onSave: handleSave,
                onCancel: () => setModalOpen(false),
                availableFaculty: availableFaculty,
                availableStudents: availableStudents
            })
        ),
        React.createElement(Modal, {
            isOpen: !!confirmDeleteUser,
            onClose: () => setConfirmDeleteUser(null),
            title: "Confirm Deletion"
        },
            React.createElement("div", null,
                React.createElement("p", { className: "text-gray-600 dark:text-gray-300" }, `Are you sure you want to delete the user '${confirmDeleteUser?.username}'?`),
                React.createElement("div", { className: "flex justify-end gap-4 mt-6" },
                    React.createElement("button", { onClick: () => setConfirmDeleteUser(null), className: "bg-gray-200 dark:bg-slate-600 px-4 py-2 rounded-md" }, "Cancel"),
                    React.createElement("button", { onClick: executeDelete, className: "bg-red-600 text-white px-4 py-2 rounded-md" }, "Delete")
                )
            )
        ),
        React.createElement("div", { className: "flex justify-between items-center mb-4" },
            React.createElement("h3", { className: "font-bold text-lg" }, "Manage Users"),
            React.createElement("button", { onClick: () => setModalOpen(true), className: "flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 font-semibold" },
                React.createElement(AddIcon, null), "Add User"
            )
        ),
        React.createElement(ErrorDisplay, { message: listError }),
        React.createElement("div", { className: "space-y-2 mt-4" },
            users.map(user =>
                React.createElement("div", { key: user._id, className: "flex justify-between items-center p-3 bg-gray-100 dark:bg-slate-900/50 rounded-lg" },
                    React.createElement("div", null,
                        React.createElement("p", { className: "font-semibold" }, user.username),
                        React.createElement("p", { className: "text-xs text-gray-500" }, `Role: ${user.role} | Profile: ${facultyMap.get(user.profileId) || studentMap.get(user.profileId) || 'N/A'}`)
                    ),
                    React.createElement("button", { onClick: () => handleDeleteRequest(user), className: "text-red-500 hover:text-red-700" },
                        React.createElement(DeleteIcon, null)
                    )
                )
            )
        )
    );
};

// Fix: Added missing PlaceholderContent component implementation.
const PlaceholderContent = ({ title, icon, message }: PlaceholderContentProps) => (
    React.createElement("div", { className: "text-center p-8" },
        React.createElement("div", { className: "text-gray-400 dark:text-gray-500 mb-4" }, React.cloneElement(icon as React.ReactElement, { className: "h-12 w-12 mx-auto" })),
        React.createElement("h3", { className: "text-xl font-bold text-gray-800 dark:text-gray-100" }, title),
        message && React.createElement("p", { className: "text-gray-500 dark:text-gray-400 mt-2" }, message)
    )
);

// Fix: Added missing ProfilePictureModal component implementation
const ProfilePictureModal = ({ isOpen, onClose, onSave, currentUser }: ProfilePictureModalProps) => {
    const [imageSrc, setImageSrc] = useState<string | null>(currentUser.profilePictureUrl || null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                setError("File is too large. Please select an image under 2MB.");
                return;
            }
            setError(null);
            const reader = new FileReader();
            reader.onload = (e) => {
                setImageSrc(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveClick = () => {
        if (imageSrc) {
            onSave(imageSrc);
            onClose();
        }
    };

    return React.createElement(Modal, { isOpen, onClose, title: "Update Profile Picture", error },
        React.createElement("div", { className: "flex flex-col items-center" },
            React.createElement("div", { className: "w-40 h-40 rounded-full bg-gray-200 dark:bg-slate-700 mb-4 flex items-center justify-center overflow-hidden" },
                imageSrc ? React.createElement("img", { src: imageSrc, alt: "Profile Preview", className: "w-full h-full object-cover" }) : React.createElement(ProfileIcon, { className: "w-20 h-20 text-gray-400" })
            ),
            React.createElement("input", { type: "file", accept: "image/*", ref: fileInputRef, onChange: handleFileChange, className: "hidden" }),
            React.createElement("button", { onClick: () => fileInputRef.current?.click(), className: "flex items-center gap-2 bg-gray-200 dark:bg-slate-600 px-4 py-2 rounded-lg text-sm font-semibold mb-4" },
                React.createElement(UploadIcon, null), "Choose Image"
            ),
            React.createElement("div", { className: "flex gap-2 w-full" },
                React.createElement("button", { onClick: onClose, className: "flex-1 bg-gray-100 dark:bg-slate-700 font-semibold py-2 px-4 rounded-lg" }, "Cancel"),
                React.createElement("button", { onClick: handleSaveClick, disabled: !imageSrc, className: "flex-1 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg disabled:bg-indigo-400" }, "Save")
            )
        )
    );
};

// Fix: Added the main Dashboard component which was missing and is now exported.
export const Dashboard = ({
    user, onLogout, theme, toggleTheme, classes, faculty, subjects, students, users, constraints, updateConstraints,
    chatMessages, onSendMessage, attendance, onUpdateAttendance,
    onSaveEntity, onDeleteEntity, onSaveUser, onDeleteUser, onUpdateProfilePicture
}: DashboardProps) => {
    const [activeTab, setActiveTab] = useState('timetable');
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    const [isProfileModalOpen, setProfileModalOpen] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('smartCampusShared');
            if (saved) {
                setTimetable(JSON.parse(saved).timetable || []);
            }
        } catch (e) { console.error("Could not load timetable from storage", e); }
    }, []);

    const handleProfileClick = () => setProfileModalOpen(true);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'timetable':
                return React.createElement(TimetableGrid, { timetable: timetable, role: user.role as 'student' | 'teacher' });
            case 'chat': {
                const classIdForUser = user.role === 'student' ? students.find(s => s.id === user.profileId)?.classId :
                                       user.role === 'teacher' ? (subjects.find(s => s.assignedFacultyId === user.profileId) ? classes[0]?.id : undefined) : // Teacher needs a class context
                                       classes[0]?.id; // Admin default
                return classIdForUser ?
                    React.createElement(ChatComponent, { messages: chatMessages, onSendMessage: onSendMessage, user: user, constraints: constraints, classId: classIdForUser, channel: 'general' }) :
                    React.createElement(PlaceholderContent, { icon: React.createElement(ChatIcon, {}), title: "Chat Unavailable", message: "Cannot determine your class for chat."});
            }
            case 'classroom':
                return React.createElement(ClassroomManager, { classes, students, onSaveEntity, onDeleteEntity, constraints, updateConstraints });
            case 'attendance':
                return React.createElement(AttendanceManager, { classes, students, attendance, onUpdateAttendance });
            case 'users':
                return React.createElement(UserManager, { faculty, students, users, onSaveUser, onDeleteUser });
            default:
                 return React.createElement(TimetableGrid, { timetable: timetable, role: user.role as 'student' | 'teacher' });
        }
    };

    const tabs: { key: string; label: string; icon: React.ReactNode; roles: User['role'][] }[] = [
        { key: 'timetable', label: 'My Timetable', icon: React.createElement(SchedulerIcon, { className: 'h-5 w-5' }), roles: ['student', 'teacher'] },
        { key: 'chat', label: 'Class Chat', icon: React.createElement(ChatIcon, {}), roles: ['student', 'teacher'] },
        { key: 'classroom', label: 'Classrooms', icon: React.createElement(StudentIcon, {}), roles: ['admin', 'teacher'] },
        { key: 'attendance', label: 'Attendance', icon: React.createElement(AttendanceIcon, { className: 'h-5 w-5' }), roles: ['admin', 'teacher'] },
        { key: 'users', label: 'Users', icon: React.createElement(UsersIcon, { className: 'h-5 w-5' }), roles: ['admin'] },
        { key: 'scheduler', label: 'Scheduler', icon: React.createElement(AIIcon, { className: 'h-5 w-5' }), roles: ['admin'] },
    ];
    
    const availableTabs = tabs.filter(tab => tab.roles.includes(user.role));
    
    useEffect(() => {
        if (!availableTabs.find(t => t.key === activeTab)) {
            setActiveTab(availableTabs[0]?.key || 'timetable');
        }
    }, [user.role]);
    
    const renderTabContent = () => {
        if (activeTab === 'scheduler') {
            return React.createElement(ReactRouterDOM.Navigate, { to: "/scheduler" });
        }
        return renderContent();
    };

    return React.createElement("div", { className: "p-4 sm:p-6 lg:p-8" },
        React.createElement(ProfilePictureModal, {
            isOpen: isProfileModalOpen,
            onClose: () => setProfileModalOpen(false),
            onSave: onUpdateProfilePicture,
            currentUser: user
        }),
        React.createElement(Header, {
            user,
            title: `${getGreeting()}, ${user.username.split('@')[0]}!`,
            subtitle: `Welcome to your ${user.role} dashboard.`,
            onLogout,
            theme,
            toggleTheme,
            onProfileClick: handleProfileClick
        }),
        React.createElement(Tabs, {}, availableTabs.map(tab => 
            React.createElement(TabButton, {
                key: tab.key,
                isActive: activeTab === tab.key,
                onClick: () => setActiveTab(tab.key)
            }, tab.icon, tab.label)
        )),
        React.createElement("div", null, renderTabContent())
    );
};
