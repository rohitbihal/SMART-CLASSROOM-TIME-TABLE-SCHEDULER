

import React, { useState, useMemo, useEffect } from 'react';
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
const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode; }) => !isOpen ? null : (React.createElement("div", { className: "fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" }, React.createElement("div", { className: "bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" }, React.createElement("div", { className: "flex justify-between items-center p-4 border-b dark:border-slate-700" }, React.createElement("h2", { className: "text-lg font-bold" }, title), React.createElement("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600" }, React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-6 w-6", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" }, React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" })))), React.createElement("div", { className: "p-6 overflow-y-auto" }, children))));
const FeedbackBanner = ({ feedback, onDismiss }: { feedback: { type: 'success' | 'error', message: string } | null; onDismiss: () => void; }) => {
    if (!feedback) return null;
    const isSuccess = feedback.type === 'success';
    const baseClasses = "fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md p-4 rounded-md border shadow-lg transition-opacity duration-300";
    const colorClasses = isSuccess
        ? 'bg-green-500/10 dark:bg-green-900/50 border-green-500/50 text-green-700 dark:text-green-300'
        : 'bg-red-500/10 dark:bg-red-900/50 border-red-500/50 text-red-700 dark:text-red-300';

    return React.createElement("div", { className: `${baseClasses} ${colorClasses}`, role: "alert" },
        React.createElement("div", { className: "flex items-center justify-between" },
            React.createElement("span", { className: "font-medium" }, feedback.message),
            React.createElement("button", { onClick: onDismiss, className: "text-lg font-bold opacity-70 hover:opacity-100" }, "×")
        )
    );
};

const StudentForm = ({ student, onSave, onCancel, classId, isLoading }: { student: Student | null; onSave: (data: Partial<Student>) => void; onCancel: () => void; classId: string; isLoading: boolean; }) => {
    const [formData, setFormData] = useState(student ? { ...student, email: student.email || '', roll: student.roll || '' } : { name: '', email: '', roll: '', classId });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(formData); };
    return React.createElement("form", { onSubmit: handleSubmit, className: "space-y-4 bg-white/5 dark:bg-slate-900/50 p-4 rounded-lg my-2" },
        React.createElement("input", { name: "name", value: formData.name, onChange: handleChange, placeholder: "e.g. Alice Sharma", className: "w-full p-2 border bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md", required: true, disabled: isLoading }),
        React.createElement("input", { name: "email", type: "email", value: formData.email, onChange: handleChange, placeholder: "e.g. name@example.com", className: "w-full p-2 border bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md", disabled: isLoading }),
        React.createElement("input", { name: "roll", value: formData.roll, onChange: handleChange, placeholder: "e.g. 23", className: "w-full p-2 border bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md", disabled: isLoading }),
        React.createElement("div", { className: "flex gap-2 justify-end" },
            React.createElement("button", { type: "button", onClick: onCancel, className: "bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 font-semibold py-2 px-4 rounded-md disabled:opacity-50", disabled: isLoading }, "Cancel"),
            React.createElement("button", { type: "submit", className: "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md w-32 disabled:opacity-50", disabled: isLoading }, isLoading ? "Saving..." : "Save Student")
        )
    );
};

const StudentManagementTab = ({ classes, students, onSaveEntity, onDeleteEntity, setFeedback }: Pick<SmartClassroomProps, 'classes' | 'students' | 'onSaveEntity' | 'onDeleteEntity'> & { setFeedback: (feedback: { type: 'success' | 'error', message: string } | null) => void; }) => {
    const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
    const [editingStudent, setEditingStudent] = useState<Student | { new: true } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const studentsInClass = useMemo(() => students.filter(s => s.classId === selectedClassId && s.name.toLowerCase().includes(searchTerm.toLowerCase())), [students, selectedClassId, searchTerm]);

    const handleSaveStudent = async (studentData: Partial<Student>) => {
        setIsLoading(true); setFeedback(null);
        try {
            await onSaveEntity('student', studentData);
            setEditingStudent(null);
            setFeedback({ type: 'success', message: `Student '${studentData.name}' saved successfully.` });
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setFeedback({ type: 'error', message: `Error saving student: ${message}` });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteStudent = async (studentId: string, studentName: string) => {
        if (!window.confirm(`Are you sure you want to delete ${studentName}?`)) return;
        setIsLoading(true); setFeedback(null);
        try {
            await onDeleteEntity('student', studentId);
            setFeedback({ type: 'success', message: `Student '${studentName}' deleted successfully.` });
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setFeedback({ type: 'error', message: `Error deleting student: ${message}` });
        } finally {
            setIsLoading(false);
        }
    };
    
    return React.createElement(SectionCard, {
        title: "Student Management",
        actions: React.createElement("button", { onClick: () => setEditingStudent({ new: true }), disabled: !selectedClassId || isLoading, className: "flex items-center gap-1 text-sm bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-semibold px-3 py-1.5 rounded-md disabled:opacity-50" }, React.createElement(AddIcon, null), "Add Student")
    },
        React.createElement("div", { className: "flex flex-col md:flex-row gap-4 mb-4" },
            React.createElement("select", { name: "class-selector", value: selectedClassId, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setSelectedClassId(e.target.value), className: "p-2 border bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md", disabled: isLoading }, classes.map(c => React.createElement("option", { key: c.id, value: c.id }, c.name))),
            React.createElement("div", { className: "relative flex-grow" }, React.createElement(SearchIcon, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" }), React.createElement("input", { type: "text", value: searchTerm, onChange: e => setSearchTerm(e.target.value), placeholder: "Search students in this class...", className: "w-full p-2 pl-10 border dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 rounded-md", disabled: isLoading }))
        ),
        (editingStudent && 'new' in editingStudent) && React.createElement(StudentForm, { student: null, onSave: handleSaveStudent, onCancel: () => setEditingStudent(null), classId: selectedClassId, isLoading: isLoading }),
        React.createElement("div", { className: "space-y-2 mt-4" }, studentsInClass.length > 0 ? studentsInClass.map(student =>
            (editingStudent && 'id' in editingStudent && editingStudent.id === student.id) ? React.createElement(StudentForm, { key: student.id, student: student, onSave: handleSaveStudent, onCancel: () => setEditingStudent(null), classId: selectedClassId, isLoading: isLoading })
            : React.createElement("div", { key: student.id, className: "flex justify-between items-center p-3 bg-gray-100 dark:bg-slate-900/50 rounded-lg" },
                React.createElement("div", null, React.createElement("p", { className: "font-semibold" }, student.name), React.createElement("p", { className: "text-xs text-gray-500 dark:text-slate-400" }, `Roll: ${student.roll || 'N/A'} | ${student.email || 'No email'}`)),
                React.createElement("div", { className: "flex gap-2" },
                    React.createElement("button", { onClick: () => setEditingStudent(student), className: "text-indigo-500 dark:text-indigo-400 disabled:opacity-50", disabled: isLoading }, React.createElement(EditIcon, null)),
                    React.createElement("button", { onClick: () => handleDeleteStudent(student.id, student.name), className: "text-red-500 dark:text-red-400 disabled:opacity-50", disabled: isLoading }, React.createElement(DeleteIcon, null))
                )
            )
        ) : React.createElement("p", { className: "text-center text-gray-500 p-4" }, "No students found in this class."))
    );
};

const UserForm = ({ user, onSave, onCancel, faculty, students, allUsers, isLoading }: { user: Partial<User> | null; onSave: (data: Partial<User>) => void; onCancel: () => void; faculty: Faculty[]; students: Student[]; allUsers: User[]; isLoading: boolean; }) => {
    const isEditing = !!(user && user._id);
    const [formData, setFormData] = useState({ role: user?.role || 'student', profileId: user?.profileId || '', username: user?.username || '', password: '', _id: user?._id });
    const [error, setError] = useState<string | null>(null);

    const availableProfiles = useMemo(() => {
        const usedProfileIds = new Set(allUsers.map(u => u.profileId).filter(id => id !== user?.profileId));
        if (formData.role === 'teacher') return faculty.filter(f => !usedProfileIds.has(f.id));
        if (formData.role === 'student') return students.filter(s => !usedProfileIds.has(s.id));
        return [];
    }, [formData.role, allUsers, faculty, students, user]);

    useEffect(() => { if (!availableProfiles.some(p => p.id === formData.profileId)) { setFormData(prev => ({ ...prev, profileId: '' })); } }, [formData.role, availableProfiles]);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!isEditing && !formData.password) { setError("Password is required for new users."); return; }
        if (!formData.profileId) { setError("A profile must be selected."); return; }
        const dataToSend = { ...formData };
        if (!dataToSend.password) delete dataToSend.password;
        onSave(dataToSend);
    };

    return React.createElement("form", { onSubmit: handleSubmit, className: "space-y-4" },
        React.createElement(ErrorDisplay, { message: error }),
        React.createElement("div", null, React.createElement("label", { className: "block text-sm font-medium mb-1" }, "Role"), React.createElement("select", { name: "role", value: formData.role, onChange: handleChange, className: "w-full p-2 border bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md", disabled: isLoading }, React.createElement("option", { value: "student" }, "Student"), React.createElement("option", { value: "teacher" }, "Teacher"))),
        React.createElement("div", null, React.createElement("label", { className: "block text-sm font-medium mb-1" }, "Link to Profile"), React.createElement("select", { name: "profileId", value: formData.profileId, onChange: handleChange, className: "w-full p-2 border bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md", required: true, disabled: isLoading }, React.createElement("option", { value: "", disabled: true }, "Select a profile..."), availableProfiles.map(p => React.createElement("option", { key: p.id, value: p.id }, p.name)))),
        React.createElement("div", null, React.createElement("label", { className: "block text-sm font-medium mb-1" }, "Username (Email)"), React.createElement("input", { name: "username", type: "email", value: formData.username, onChange: handleChange, placeholder: "user@example.com", className: "w-full p-2 border bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md", required: true, disabled: isLoading })),
        React.createElement("div", null, React.createElement("label", { className: "block text-sm font-medium mb-1" }, isEditing ? "New Password (optional)" : "Password"), React.createElement("input", { name: "password", type: "password", value: formData.password, onChange: handleChange, placeholder: isEditing ? "Leave blank to keep current password" : "••••••••", className: "w-full p-2 border bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md", required: !isEditing, disabled: isLoading })),
        React.createElement("div", { className: "flex gap-2 justify-end pt-4" }, React.createElement("button", { type: "button", onClick: onCancel, className: "bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 font-semibold py-2 px-4 rounded-md disabled:opacity-50", disabled: isLoading }, "Cancel"), React.createElement("button", { type: "submit", className: "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md w-28 disabled:opacity-50", disabled: isLoading }, isLoading ? "Saving..." : "Save User"))
    );
};

const UserManagementTab = ({ users, faculty, students, onSaveUser, onDeleteUser, setFeedback }: Pick<SmartClassroomProps, 'users' | 'faculty' | 'students' | 'onSaveUser' | 'onDeleteUser'> & { setFeedback: (feedback: { type: 'success' | 'error', message: string } | null) => void; }) => {
    const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const profileMap = useMemo(() => { const map = new Map<string, { name: string }>(); faculty.forEach(f => map.set(f.id, { name: f.name })); students.forEach(s => map.set(s.id, { name: s.name })); return map; }, [faculty, students]);
    const filteredUsers = useMemo(() => users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()) || (profileMap.get(u.profileId || '')?.name || '').toLowerCase().includes(searchTerm.toLowerCase())), [users, searchTerm, profileMap]);
    
    const handleSave = async (userData: Partial<User>) => {
        setIsSaving(true);
        setFeedback(null);
        try {
            await onSaveUser(userData);
            setEditingUser(null);
            setFeedback({ type: 'success', message: 'User account saved successfully!' });
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setFeedback({ type: 'error', message: `Error saving user: ${message}` });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!userToDelete || !userToDelete._id) return;
        setIsDeleting(true);
        setFeedback(null);
        try {
            await onDeleteUser(userToDelete._id);
            setUserToDelete(null);
            setFeedback({ type: 'success', message: `User '${userToDelete.username}' deleted successfully.` });
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setFeedback({ type: 'error', message: `Error deleting user: ${message}` });
        } finally {
            setIsDeleting(false);
        }
    };
    
    const isLoading = isSaving || isDeleting;

    return React.createElement(React.Fragment, null,
        React.createElement(SectionCard, {
            title: "User Accounts",
            actions: React.createElement("button", { onClick: () => setEditingUser({}), disabled: isLoading, className: "flex items-center gap-1 text-sm bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-semibold px-3 py-1.5 rounded-md disabled:opacity-50" }, React.createElement(AddIcon, null), "Add User")
        },
            React.createElement("div", { className: "relative mb-4" }, React.createElement(SearchIcon, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" }), React.createElement("input", { type: "text", value: searchTerm, onChange: e => setSearchTerm(e.target.value), placeholder: "Search by name or email...", className: "w-full p-2 pl-10 border dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 rounded-md", disabled: isLoading })),
            React.createElement("div", { className: "space-y-2 mt-4" }, filteredUsers.length > 0 ? filteredUsers.map(user =>
                React.createElement("div", { key: user._id, className: "flex justify-between items-center p-3 bg-gray-100 dark:bg-slate-900/50 rounded-lg" },
                    React.createElement("div", null, React.createElement("p", { className: "font-semibold" }, profileMap.get(user.profileId || '')?.name || 'Unlinked Profile'), React.createElement("p", { className: "text-xs text-gray-500 dark:text-slate-400" }, `${user.username} | Role: ${user.role}`)),
                    React.createElement("div", { className: "flex gap-2" }, React.createElement("button", { onClick: () => setEditingUser(user), className: "text-indigo-500 disabled:opacity-50", disabled: isLoading }, React.createElement(EditIcon, null)), React.createElement("button", { onClick: () => setUserToDelete(user), className: "text-red-500 disabled:opacity-50", disabled: isLoading }, React.createElement(DeleteIcon, null)))
                )) : React.createElement("p", { className: "text-center text-gray-500 p-4" }, "No users found."))
        ),
        React.createElement(Modal, { isOpen: !!editingUser, onClose: () => !isSaving && setEditingUser(null), title: editingUser?._id ? "Edit User" : "Add New User" }, editingUser && React.createElement(UserForm, { user: editingUser, onSave: handleSave, onCancel: () => setEditingUser(null), faculty: faculty, students: students, allUsers: users, isLoading: isSaving })),
        React.createElement(Modal, { isOpen: !!userToDelete, onClose: () => !isDeleting && setUserToDelete(null), title: "Confirm Deletion" }, userToDelete && React.createElement("div", null, React.createElement("p", null, "Are you sure you want to delete the user account for ", React.createElement("strong", null, userToDelete.username), "? This action cannot be undone."), React.createElement("div", { className: "flex gap-2 justify-end pt-4" }, React.createElement("button", { onClick: () => setUserToDelete(null), className: "bg-gray-200 dark:bg-slate-600 font-semibold py-2 px-4 rounded-md disabled:opacity-50", disabled: isDeleting }, "Cancel"), React.createElement("button", { onClick: handleDelete, className: "bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md w-28 disabled:opacity-50", disabled: isDeleting }, isDeleting ? "Deleting..." : "Delete"))))
    );
};


export const SmartClassroom = (props: SmartClassroomProps) => {
    const { onLogout, theme, toggleTheme } = props;
    const [activeTab, setActiveTab] = useState('students');
    const navigate = ReactRouterDOM.useNavigate();
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        if (feedback) {
            const timer = setTimeout(() => setFeedback(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [feedback]);

    const tabs = [
        { key: 'students', label: "Student Management", icon: React.createElement(StudentIcon, { className: 'h-5 w-5' }) },
        { key: 'users', label: "User Accounts", icon: React.createElement(UsersIcon, { className: 'h-5 w-5' }) },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'students': return React.createElement(StudentManagementTab, { ...props, setFeedback: setFeedback });
            case 'users': return React.createElement(UserManagementTab, { users: props.users, faculty: props.faculty, students: props.students, onSaveUser: props.onSaveUser, onDeleteUser: props.onDeleteUser, setFeedback: setFeedback });
            default: return React.createElement(SectionCard, { title: "Coming Soon" }, React.createElement("p", null, "This feature is under development."));
        }
    };

    return (
        React.createElement("div", { className: "min-h-screen p-4 sm:p-6 lg:p-8" },
            React.createElement(FeedbackBanner, { feedback: feedback, onDismiss: () => setFeedback(null) }),
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
