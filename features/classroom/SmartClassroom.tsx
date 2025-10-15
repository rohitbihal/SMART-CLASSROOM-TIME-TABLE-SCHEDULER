

import React, { useState, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import {
    LogoutIcon, MoonIcon, SunIcon, SearchIcon, StudentIcon, UsersIcon, AddIcon, EditIcon, DeleteIcon, BackIcon
} from '../../components/Icons.tsx';
import { User, Class, Student, Faculty } from '../../types.ts';

interface SmartClassroomProps {
    user: User; onLogout: () => void; theme: string; toggleTheme: () => void;
    classes: Class[]; faculty: Faculty[]; students: Student[]; users: User[];
    onSaveEntity: (type: 'student' | 'class' | 'faculty' | 'room' | 'subject', data: any) => Promise<void>;
    onDeleteEntity: (type: 'student' | 'class' | 'faculty' | 'room' | 'subject', id: string) => Promise<void>;
    onSaveUser: (userData: any) => Promise<void>;
    onDeleteUser: (userId: string) => Promise<void>;
}

const ErrorDisplay = ({ message }: { message: string | null }) => !message ? null : React.createElement("div", { className: "bg-red-500/10 dark:bg-red-900/50 border border-red-500/50 text-red-700 dark:text-red-300 p-3 rounded-md text-sm my-2", role: "alert" }, message);
const SectionCard = ({ title, children, actions }: { title: string; children?: React.ReactNode; actions?: React.ReactNode; }) => (React.createElement("div", { className: "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm" }, React.createElement("div", { className: "flex justify-between items-center border-b border-gray-200 dark:border-slate-700 pb-3 mb-4" }, React.createElement("h3", { className: "text-xl font-bold" }, title), actions && React.createElement("div", null, actions)), children));
const PlaceholderView = ({ title }: { title: string }) => ( React.createElement("div", { className: "flex-grow flex items-center justify-center h-96 bg-gray-100 dark:bg-slate-800/50 rounded-2xl p-8" }, React.createElement("div", { className: "text-center" }, React.createElement("h2", { className: "text-3xl font-bold text-slate-400" }, title), React.createElement("p", { className: "text-slate-500" }, "This feature is under construction."))));

const StudentForm = ({ student, onSave, onCancel, classId }: { student: Student | null; onSave: (data: Partial<Student>) => Promise<void>; onCancel: () => void; classId: string; }) => {
    const [formData, setFormData] = useState(student ? { ...student, email: student.email || '', roll: student.roll || '' } : { name: '', email: '', roll: '', classId });
    const [error, setError] = useState<string | null>(null);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setError(null); try { await onSave(formData); } catch (err) { setError(err instanceof Error ? err.message : "An unknown error occurred."); } };
    return React.createElement("form", { onSubmit: handleSubmit, className: "space-y-4 bg-white/5 dark:bg-slate-900/50 p-4 rounded-lg my-2" },
        React.createElement(ErrorDisplay, { message: error }),
        React.createElement("input", { name: "name", value: formData.name, onChange: handleChange, placeholder: "e.g. Alice Sharma", className: "w-full p-2 border bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md", required: true }),
        React.createElement("input", { name: "email", type: "email", value: formData.email, onChange: handleChange, placeholder: "e.g. name@example.com", className: "w-full p-2 border bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md" }),
        React.createElement("input", { name: "roll", value: formData.roll, onChange: handleChange, placeholder: "e.g. 23", className: "w-full p-2 border bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md" }),
        React.createElement("div", { className: "flex gap-2 justify-end" },
            React.createElement("button", { type: "button", onClick: onCancel, className: "bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 font-semibold py-2 px-4 rounded-md" }, "Cancel"),
            React.createElement("button", { type: "submit", className: "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md" }, "Save Student")
        )
    );
};

const StudentManagementTab = ({ classes, students, onSaveEntity, onDeleteEntity }: Pick<SmartClassroomProps, 'classes' | 'students' | 'onSaveEntity' | 'onDeleteEntity'>) => {
    const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
    const [editingStudent, setEditingStudent] = useState<Student | { new: true } | null>(null);
    const [listError, setListError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const studentsInClass = useMemo(() => students.filter(s => s.classId === selectedClassId && s.name.toLowerCase().includes(searchTerm.toLowerCase())), [students, selectedClassId, searchTerm]);
    const handleSaveStudent = async (studentData: Partial<Student>) => { await onSaveEntity('student', studentData); setEditingStudent(null); };
    const handleDeleteStudent = async (studentId: string) => { setListError(null); try { await onDeleteEntity('student', studentId); } catch(err) { setListError(err instanceof Error ? err.message : "Could not delete student."); } };
    
    return React.createElement(SectionCard, {
        title: "Student Management",
        actions: React.createElement("button", { onClick: () => setEditingStudent({ new: true }), disabled: !selectedClassId, className: "flex items-center gap-1 text-sm bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-semibold px-3 py-1.5 rounded-md disabled:opacity-50" }, React.createElement(AddIcon, null), "Add Student")
    },
        React.createElement("div", { className: "flex flex-col md:flex-row gap-4 mb-4" },
            // FIX: Explicitly typed the onChange event handler and added a name attribute to improve type safety and robustness, which likely resolves the misleading error on a different line.
            React.createElement("select", { name: "class-selector", value: selectedClassId, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setSelectedClassId(e.target.value), className: "p-2 border bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md" }, classes.map(c => React.createElement("option", { key: c.id, value: c.id }, c.name))),
            React.createElement("div", { className: "relative flex-grow" }, React.createElement(SearchIcon, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" }), React.createElement("input", { type: "text", value: searchTerm, onChange: e => setSearchTerm(e.target.value), placeholder: "Search students in this class...", className: "w-full p-2 pl-10 border dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 rounded-md" }))
        ),
        React.createElement(ErrorDisplay, { message: listError }),
        (editingStudent && 'new' in editingStudent) && React.createElement(StudentForm, { student: null, onSave: handleSaveStudent, onCancel: () => setEditingStudent(null), classId: selectedClassId }),
        React.createElement("div", { className: "space-y-2 mt-4" }, studentsInClass.length > 0 ? studentsInClass.map(student =>
            (editingStudent && 'id' in editingStudent && editingStudent.id === student.id) ? React.createElement(StudentForm, { key: student.id, student: student, onSave: handleSaveStudent, onCancel: () => setEditingStudent(null), classId: selectedClassId })
            : React.createElement("div", { key: student.id, className: "flex justify-between items-center p-3 bg-gray-100 dark:bg-slate-900/50 rounded-lg" },
                React.createElement("div", null, React.createElement("p", { className: "font-semibold" }, student.name), React.createElement("p", { className: "text-xs text-gray-500 dark:text-slate-400" }, `Roll: ${student.roll || 'N/A'} | ${student.email || 'No email'}`)),
                React.createElement("div", { className: "flex gap-2" },
                    React.createElement("button", { onClick: () => setEditingStudent(student), className: "text-indigo-500 dark:text-indigo-400" }, React.createElement(EditIcon, null)),
                    React.createElement("button", { onClick: () => handleDeleteStudent(student.id), className: "text-red-500 dark:text-red-400" }, React.createElement(DeleteIcon, null))
                )
            )
        ) : React.createElement("p", { className: "text-center text-gray-500 p-4" }, "No students found in this class."))
    );
};

export const SmartClassroom = (props: SmartClassroomProps) => {
    const { user, onLogout, theme, toggleTheme } = props;
    const [activeTab, setActiveTab] = useState('students');
    const navigate = ReactRouterDOM.useNavigate();

    const tabs = [
        { key: 'students', label: "Student Management", icon: React.createElement(StudentIcon, { className: 'h-5 w-5' }) },
        { key: 'users', label: "User Accounts", icon: React.createElement(UsersIcon, { className: 'h-5 w-5' }) },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'students': return React.createElement(StudentManagementTab, { ...props });
            case 'users': return React.createElement(PlaceholderView, { title: "User Management" }); // Placeholder for now
            default: return React.createElement(PlaceholderView, { title: "Coming Soon" });
        }
    };

    return (
        React.createElement("div", { className: "min-h-screen p-4 sm:p-6 lg:p-8" },
            React.createElement("header", { className: "flex flex-wrap justify-between items-center mb-8 gap-4" },
                React.createElement("div", null,
                    React.createElement("h1", { className: "text-3xl font-bold text-gray-800 dark:text-gray-100" }, "Smart Classroom Administration"),
                    React.createElement("p", { className: "text-gray-500 dark:text-gray-400 mt-1" }, "Manage students, users, and class settings.")
                ),
                React.createElement("div", { className: "flex items-center gap-2" },
                    React.createElement("button", { onClick: toggleTheme, className: "bg-white dark:bg-slate-800 p-2.5 border dark:border-slate-700 rounded-lg" }, theme === 'dark' ? React.createElement(SunIcon, null) : React.createElement(MoonIcon, null)),
                    React.createElement("button", { onClick: () => navigate("/"), className: "bg-white dark:bg-slate-800 py-2 px-4 border dark:border-slate-700 rounded-lg flex items-center gap-2" }, React.createElement(BackIcon, null), "Modules"),
                    React.createElement("button", { onClick: onLogout, className: "bg-white dark:bg-slate-800 py-2 px-4 border dark:border-slate-700 rounded-lg flex items-center gap-2" }, React.createElement(LogoutIcon, null), "Logout")
                )
            ),
            React.createElement("nav", { className: "bg-white dark:bg-slate-800 border dark:border-slate-700 p-2 rounded-xl flex flex-wrap gap-2 mb-8" },
                tabs.map(tab => React.createElement("button", { key: tab.key, onClick: () => setActiveTab(tab.key), className: `flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === tab.key ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'}`}, tab.icon, tab.label))
            ),
            React.createElement("main", null, renderContent())
        )
    );
};