import React, { useState, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import {
    LogoutIcon, MoonIcon, SunIcon, ProfileIcon, SearchIcon, StudentIcon, ChatIcon, AttendanceIcon, IMSIcon, NotificationsIcon, MeetingIcon, CalendarIcon, QuizzesIcon, GradebookIcon, TutorialsIcon, UsersIcon, AddIcon, EditIcon, DeleteIcon, BackIcon
} from '../../components/Icons.tsx';
import { User, Class, Student, Faculty, Constraints, Attendance, AttendanceStatus } from '../../types.ts';

// Re-using management components from the old Dashboard by adapting them for this new layout
// They are defined here to be self-contained within this new module.

interface SmartClassroomProps {
    user: User; onLogout: () => void; theme: string; toggleTheme: () => void;
    classes: Class[]; faculty: Faculty[]; students: Student[]; users: User[];
    constraints: Constraints | null; updateConstraints: (c: Constraints) => void;
    attendance: Attendance; onUpdateAttendance: (classId: string, date: string, studentId: string, status: AttendanceStatus) => void;
    onSaveEntity: (type: 'student' | 'class' | 'faculty' | 'room' | 'subject', data: any) => Promise<void>;
    onDeleteEntity: (type: 'student' | 'class' | 'faculty' | 'room' | 'subject', id: string) => Promise<void>;
    onSaveUser: (userData: any) => Promise<void>;
    onDeleteUser: (userId: string) => Promise<void>;
}

const ErrorDisplay = ({ message }: { message: string | null }) => !message ? null : React.createElement("div", { className: "bg-red-500/10 dark:bg-red-900/50 border border-red-500/50 text-red-700 dark:text-red-300 p-3 rounded-md text-sm my-2", role: "alert" }, message);

const StudentForm = ({ student, onSave, onCancel, classId }: { student: Student | null; onSave: (data: Partial<Student>) => Promise<void>; onCancel: () => void; classId: string; }) => {
    const [formData, setFormData] = useState(student ? { ...student, email: student.email || '', roll: student.roll || '' } : { name: '', email: '', roll: '', classId });
    const [error, setError] = useState<string | null>(null);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setError(null); try { await onSave(formData); } catch (err) { setError(err instanceof Error ? err.message : "An unknown error occurred."); } };
    return React.createElement("form", { onSubmit: handleSubmit, className: "space-y-4 bg-slate-800/50 p-4 rounded-lg mt-4" },
        React.createElement(ErrorDisplay, { message: error }),
        React.createElement("input", { name: "name", value: formData.name, onChange: handleChange, placeholder: "e.g. Alice Sharma", className: "w-full p-2 border bg-slate-900 border-slate-600 rounded-md", required: true }),
        React.createElement("input", { name: "email", type: "email", value: formData.email, onChange: handleChange, placeholder: "e.g. name@example.com", className: "w-full p-2 border bg-slate-900 border-slate-600 rounded-md" }),
        React.createElement("input", { name: "roll", value: formData.roll, onChange: handleChange, placeholder: "e.g. 23", className: "w-full p-2 border bg-slate-900 border-slate-600 rounded-md" }),
        React.createElement("div", { className: "flex gap-2 justify-end" },
            React.createElement("button", { type: "button", onClick: onCancel, className: "bg-slate-700 hover:bg-slate-600 font-semibold py-2 px-4 rounded-md" }, "Cancel"),
            React.createElement("button", { type: "submit", className: "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md" }, "Save")
        )
    );
};

const GroupsManager = ({ classes, students, onSaveEntity, onDeleteEntity, constraints, updateConstraints }: Omit<SmartClassroomProps, 'user' | 'onLogout' | 'theme' | 'toggleTheme' | 'attendance' | 'onUpdateAttendance' | 'onSaveUser' | 'onDeleteUser' | 'faculty' | 'users' >) => {
    const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
    const [editingStudent, setEditingStudent] = useState<Student | { new: true } | null>(null);
    const [listError, setListError] = useState<string | null>(null);

    const studentsInClass = useMemo(() => students.filter(s => s.classId === selectedClassId), [students, selectedClassId]);
    const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);

    const handleChatWindowChange = (e: React.ChangeEvent<HTMLInputElement>) => constraints && updateConstraints({ ...constraints, chatWindow: { ...(constraints.chatWindow || { start: '', end: '' }), [e.target.name]: e.target.value } });
    const handleSaveStudent = async (studentData: Partial<Student>) => { await onSaveEntity('student', studentData); setEditingStudent(null); };
    const handleDeleteStudent = async (studentId: string) => { setListError(null); try { await onDeleteEntity('student', studentId); } catch(err) { setListError(err instanceof Error ? err.message : "Could not delete student."); } };
    
    return React.createElement("div", { className: "flex-grow grid grid-cols-12 gap-6" },
        React.createElement("div", { className: "col-span-3" },
            React.createElement("div", { className: "bg-slate-800/50 p-4 rounded-2xl border border-slate-700" },
                React.createElement("h3", { className: "font-bold text-lg mb-4 px-2" }, "Groups"),
                React.createElement("div", { className: "space-y-1" }, classes.map(c => React.createElement("button", { key: c.id, onClick: () => { setSelectedClassId(c.id); setListError(null); }, className: `w-full text-left p-3 rounded-lg transition ${selectedClassId === c.id ? 'bg-indigo-500 text-white' : 'hover:bg-slate-700'}` }, c.name)))
            )
        ),
        React.createElement("div", { className: "col-span-9 grid grid-cols-3 gap-6" },
             !selectedClass ? React.createElement("p", {className: "col-span-3"}, "Select a class to manage students.") :
             React.createElement(React.Fragment, null,
                React.createElement("div", { className: "col-span-3 xl:col-span-2" },
                    React.createElement("div", { className: "bg-slate-800/50 p-6 rounded-2xl border border-slate-700 mb-6" },
                        React.createElement("h3", { className: "text-lg font-bold" }, "Selected Group"),
                        React.createElement("p", { className: "text-3xl font-bold text-indigo-400" }, selectedClass.name),
                        React.createElement("p", { className: "text-slate-400" }, `${studentsInClass.length} students`)
                    ),
                    React.createElement("div", { className: "bg-slate-800/50 p-6 rounded-2xl border border-slate-700" },
                        React.createElement("div", { className: "flex justify-between items-center mb-4" },
                            React.createElement("h3", { className: "font-bold text-lg" }, "Students"),
                            React.createElement("button", { onClick: () => setEditingStudent({ new: true }), className: "flex items-center gap-1 text-sm text-indigo-400 font-semibold" }, React.createElement(AddIcon, null), "Add Student")
                        ),
                        React.createElement(ErrorDisplay, { message: listError }),
                        (editingStudent && 'new' in editingStudent) && React.createElement(StudentForm, { student: null, onSave: handleSaveStudent, onCancel: () => setEditingStudent(null), classId: selectedClassId }),
                        React.createElement("div", { className: "space-y-2 mt-4" }, studentsInClass.map(student =>
                            (editingStudent && 'id' in editingStudent && editingStudent.id === student.id) ? React.createElement(StudentForm, { key: student.id, student: student, onSave: handleSaveStudent, onCancel: () => setEditingStudent(null), classId: selectedClassId })
                            : React.createElement("div", { key: student.id, className: "flex justify-between items-center p-3 bg-slate-900/50 rounded-lg" },
                                React.createElement("div", null, React.createElement("p", { className: "font-semibold" }, student.name), React.createElement("p", { className: "text-xs text-slate-400" }, `Roll: ${student.roll || 'N/A'} | ${student.email || 'No email'}`)),
                                React.createElement("div", { className: "flex gap-2" },
                                    React.createElement("button", { onClick: () => setEditingStudent(student), className: "text-indigo-400" }, React.createElement(EditIcon, null)),
                                    React.createElement("button", { onClick: () => handleDeleteStudent(student.id), className: "text-red-400" }, React.createElement(DeleteIcon, null))
                                )
                            )
                        ))
                    )
                ),
                React.createElement("div", { className: "col-span-3 xl:col-span-1" },
                    constraints && React.createElement("div", { className: "bg-slate-800/50 p-6 rounded-2xl border border-slate-700" },
                        React.createElement("h3", { className: "font-bold text-lg mb-4" }, "Chat Window"),
                         React.createElement("div", { className: "space-y-2" },
                            React.createElement("label", { className: "text-sm font-semibold" }, "Start"),
                            React.createElement("input", { type: "time", name: "start", value: constraints.chatWindow?.start || '', onChange: handleChatWindowChange, className: "w-full p-2 border rounded-md bg-slate-900 border-slate-600" }),
                            React.createElement("label", { className: "text-sm font-semibold" }, "End"),
                            React.createElement("input", { type: "time", name: "end", value: constraints.chatWindow?.end || '', onChange: handleChatWindowChange, className: "w-full p-2 border rounded-md bg-slate-900 border-slate-600" })
                        ),
                        React.createElement("p", {className: "text-xs text-slate-400 mt-2"}, `Chat window: ${constraints.chatWindow?.start || 'N/A'} - ${constraints.chatWindow?.end || 'N/A'}`)
                    )
                )
             )
        )
    );
};

const PlaceholderView = ({ title }: { title: string }) => (
    React.createElement("div", { className: "flex-grow flex items-center justify-center" },
        React.createElement("div", { className: "text-center" },
            React.createElement("h2", { className: "text-3xl font-bold text-slate-400" }, title),
            React.createElement("p", { className: "text-slate-500" }, "This feature is under construction.")
        )
    )
);

export const SmartClassroom = (props: SmartClassroomProps) => {
    const { user, onLogout, theme, toggleTheme } = props;
    const [activeView, setActiveView] = useState('groups');

    const sidebarItems = [
        { key: 'groups', label: "Groups", icon: React.createElement(StudentIcon, { className: 'h-5 w-5' }) },
        { key: 'chat', label: "Chat", icon: React.createElement(ChatIcon, { className: 'h-5 w-5' }) },
        { key: 'attendance', label: "Attendance", icon: React.createElement(AttendanceIcon, { className: 'h-5 w-5' }) },
        { key: 'ims', label: "IMS", icon: React.createElement(IMSIcon, { className: 'h-5 w-5' }) },
        { key: 'notifications', label: "Notifications", icon: React.createElement(NotificationsIcon, { className: 'h-5 w-5' }) },
        { key: 'meetings', label: "Meetings", icon: React.createElement(MeetingIcon, { className: 'h-5 w-5' }) },
        { key: 'calendar', label: "Calendar", icon: React.createElement(CalendarIcon, { className: 'h-5 w-5' }) },
        { key: 'quizzes', label: "Quizzes", icon: React.createElement(QuizzesIcon, { className: 'h-5 w-5' }) },
        { key: 'gradebook', label: "Gradebook", icon: React.createElement(GradebookIcon, { className: 'h-5 w-5' }) },
        { key: 'tutorials', label: "Tutorials", icon: React.createElement(TutorialsIcon, { className: 'h-5 w-5' }) },
    ];

    const renderContent = () => {
        switch (activeView) {
            case 'groups':
                return React.createElement(GroupsManager, {
                    classes: props.classes,
                    students: props.students,
                    onSaveEntity: props.onSaveEntity,
                    onDeleteEntity: props.onDeleteEntity,
                    constraints: props.constraints,
                    updateConstraints: props.updateConstraints,
                });
            default:
                return React.createElement(PlaceholderView, { title: sidebarItems.find(i => i.key === activeView)?.label || "Content" });
        }
    };

    return (
        React.createElement("div", { className: "min-h-screen bg-slate-900 text-gray-200 flex" },
            // Sidebar
            React.createElement("nav", { className: "w-64 bg-slate-800/50 border-r border-slate-700 p-4 flex flex-col" },
                React.createElement("div", { className: "flex items-center gap-3 mb-8" },
                    React.createElement(StudentIcon, { className: "h-8 w-8 text-indigo-400" }),
                    React.createElement("h1", { className: "text-xl font-bold" }, "Smart Classroom")
                ),
                React.createElement("div", { className: "flex-grow space-y-2" },
                    sidebarItems.map(item =>
                        React.createElement("button", {
                            key: item.key,
                            onClick: () => setActiveView(item.key),
                            className: `w-full flex items-center gap-3 p-3 rounded-lg text-sm transition ${activeView === item.key ? 'bg-indigo-500 text-white' : 'hover:bg-slate-700'}`
                        }, item.icon, item.label)
                    )
                )
            ),
            // Main Content
            React.createElement("main", { className: "flex-1 flex flex-col" },
                // Header
                React.createElement("header", { className: "bg-slate-800/50 border-b border-slate-700 p-4 flex justify-between items-center" },
                    React.createElement("div", { className: "relative w-full max-w-xs" },
                        React.createElement(SearchIcon, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" }),
                        React.createElement("input", { type: "search", placeholder: "Search groups, students, assignments...", className: "bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-4 w-full focus:ring-2 focus:ring-indigo-500" })
                    ),
                    React.createElement("div", { className: "flex items-center gap-4" },
                        React.createElement("span", { className: "bg-slate-700 text-xs font-bold px-3 py-1 rounded-full" }, "Role: Admin"),
                        React.createElement("button", { onClick: toggleTheme, className: "p-2 rounded-full hover:bg-slate-700" }, theme === 'dark' ? React.createElement(SunIcon, null) : React.createElement(MoonIcon, null)),
                        React.createElement(ReactRouterDOM.Link, { to: "/", className: "p-2 rounded-full hover:bg-slate-700" }, React.createElement(BackIcon, null)),
                        React.createElement("button", { onClick: onLogout, className: "p-2 rounded-full hover:bg-slate-700" }, React.createElement(LogoutIcon, null))
                    )
                ),
                React.createElement("div", { className: "flex-grow p-6 flex flex-col" },
                    React.createElement("h2", { className: "text-2xl font-bold mb-6" }, sidebarItems.find(i => i.key === activeView)?.label),
                    renderContent()
                )
            )
        )
    );
};