import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import {
    SearchIcon, StudentIcon, UsersIcon, AddIcon, EditIcon, DeleteIcon, ProfileIcon, AttendanceIcon, UploadIcon, KeyIcon
} from '../../components/Icons';
import { User, Class, Student, Faculty, Attendance, AttendanceStatus, AttendanceRecord } from '../../types';

interface SmartClassroomProps {
    user: User;
    classes: Class[]; faculty: Faculty[]; students: Student[]; users: User[];
    attendance: Attendance;
    onSaveEntity: (type: 'student' | 'class' | 'faculty' | 'room' | 'subject', data: any) => Promise<void>;
    onDeleteEntity: (type: 'student' | 'class' | 'faculty' | 'room' | 'subject', id: string) => Promise<void>;
    onSaveUser: (userData: any) => Promise<void>;
    onDeleteUser: (userId: string) => Promise<void>;
    onSaveClassAttendance: (classId: string, date: string, records: AttendanceRecord) => Promise<void>;
}

const ErrorDisplay = ({ message }: { message: string | null }) => !message ? null : <div className="bg-red-500/10 dark:bg-red-900/50 border border-red-500/50 text-red-700 dark:text-red-300 p-3 rounded-md text-sm my-2" role="alert">{message}</div>;
const SectionCard = ({ title, children, actions }: { title: string; children?: React.ReactNode; actions?: React.ReactNode; }) => (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm">
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-slate-700 pb-3 mb-4">
            <h3 className="text-xl font-bold">{title}</h3>
            {actions && <div>{actions}</div>}
        </div>
        {children}
    </div>
);
const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode; }) => !isOpen ? null : (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b dark:border-slate-700">
                <h2 className="text-lg font-bold">{title}</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <div className="p-6 overflow-y-auto">{children}</div>
        </div>
    </div>
);
const FeedbackBanner = ({ feedback, onDismiss }: { feedback: { type: 'success' | 'error', message: string } | null; onDismiss: () => void; }) => {
    if (!feedback) return null;
    const isSuccess = feedback.type === 'success';
    const baseClasses = "fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md p-4 rounded-md border shadow-lg transition-opacity duration-300";
    const colorClasses = isSuccess
        ? 'bg-green-500/10 dark:bg-green-900/50 border-green-500/50 text-green-700 dark:text-green-300'
        : 'bg-red-500/10 dark:bg-red-900/50 border-red-500/50 text-red-700 dark:text-red-300';

    return (
        <div className={`${baseClasses} ${colorClasses}`} role="alert">
            <div className="flex items-center justify-between">
                <span className="font-medium">{feedback.message}</span>
                <button onClick={onDismiss} className="text-lg font-bold opacity-70 hover:opacity-100">×</button>
            </div>
        </div>
    );
};

const StudentForm = ({ student, onSave, onCancel, classId, isLoading }: { student: Student | null; onSave: (data: Partial<Student>) => void; onCancel: () => void; classId: string; isLoading: boolean; }) => {
    const [formData, setFormData] = useState(student ? { ...student, email: student.email || '', roll: student.roll || '' } : { name: '', email: '', roll: '', classId });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(formData); };
    const formId = `student-form-${student?.id || 'new'}`;
    return (
        <form onSubmit={handleSubmit} className="space-y-4 bg-white/5 dark:bg-slate-900/50 p-4 rounded-lg my-2">
            <div>
                <label htmlFor={`${formId}-name`} className="sr-only">Student Name</label>
                <input id={`${formId}-name`} name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Alice Sharma" className="w-full p-2 border bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md" required disabled={isLoading} />
            </div>
            <div>
                 <label htmlFor={`${formId}-email`} className="sr-only">Student Email</label>
                <input id={`${formId}-email`} name="email" type="email" value={formData.email} onChange={handleChange} placeholder="e.g. name@example.com" className="w-full p-2 border bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md" disabled={isLoading} />
            </div>
            <div>
                 <label htmlFor={`${formId}-roll`} className="sr-only">Roll Number</label>
                <input id={`${formId}-roll`} name="roll" value={formData.roll} onChange={handleChange} placeholder="e.g. 23" className="w-full p-2 border bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md" disabled={isLoading} />
            </div>
            <div className="flex gap-2 justify-end">
                <button type="button" onClick={onCancel} className="bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 font-semibold py-2 px-4 rounded-md disabled:opacity-50" disabled={isLoading}>Cancel</button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md w-32 disabled:opacity-50" disabled={isLoading}>{isLoading ? "Saving..." : "Save Student"}</button>
            </div>
        </form>
    );
};

const StudentImportModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) => {
    if (!isOpen) return null;
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Import Student Data"
        >
            <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Upload a CSV or Excel file to bulk-add students. Make sure your file has the correct columns.</p>
                <div className="p-3 bg-gray-100 dark:bg-slate-700/50 rounded-md">
                    <p className="text-sm font-semibold">File Format:</p>
                    <p className="text-xs font-mono mt-1 text-gray-600 dark:text-gray-300">Required columns: name, email, classId, roll</p>
                </div>
                <div>
                    <label htmlFor="file-upload" className="block text-sm font-medium mb-1">Upload File</label>
                    <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/50 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-800/50"
                    />
                </div>
                 <p className="text-xs text-center text-gray-400">PDF import support is coming soon.</p>
                <div className="flex justify-end pt-4">
                     <button type="button" onClick={() => { alert('File processing is a placeholder.'); onClose(); }} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2">Process File</button>
                </div>
            </div>
        </Modal>
    );
};

const StudentManagementTab = ({ classes, students, onSaveEntity, onDeleteEntity, setFeedback }: Pick<SmartClassroomProps, 'classes' | 'students' | 'onSaveEntity' | 'onDeleteEntity'> & { setFeedback: (feedback: { type: 'success' | 'error', message: string } | null) => void; }) => {
    const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
    const [editingStudent, setEditingStudent] = useState<Student | { new: true } | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

    const studentsInClass = useMemo(() => students.filter(s => s.classId === selectedClassId && s.name.toLowerCase().includes(searchTerm.toLowerCase())), [students, selectedClassId, searchTerm]);

    const allIdsInView = useMemo(() => studentsInClass.map(s => s.id), [studentsInClass]);
    const selectedIdsInView = useMemo(() => selectedStudents.filter(id => allIdsInView.includes(id)), [selectedStudents, allIdsInView]);

    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            selectAllCheckboxRef.current.indeterminate = selectedIdsInView.length > 0 && selectedIdsInView.length < allIdsInView.length;
        }
    }, [selectedIdsInView, allIdsInView]);

    const handleToggleSelectAll = () => {
        if (selectedIdsInView.length === allIdsInView.length) {
            setSelectedStudents(prev => prev.filter(id => !allIdsInView.includes(id)));
        } else {
            setSelectedStudents(prev => [...new Set([...prev, ...allIdsInView])]);
        }
    };

    const handleToggleSelect = (studentId: string) => {
        setSelectedStudents(prev => prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]);
    };

    const handleSaveStudent = async (studentData: Partial<Student>) => {
        setIsLoading(true); setFeedback(null);
        try {
            await onSaveEntity('student', studentData);
            setEditingStudent(null);
            setFeedback({ type: 'success', message: `Student '${studentData.name}' saved successfully!` });
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setFeedback({ type: 'error', message: `Failed to save student: ${message}` });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteStudent = async (studentId: string, studentName: string) => {
        if (!window.confirm(`Are you sure you want to delete ${studentName}?`)) return;
        setIsLoading(true); setFeedback(null);
        try {
            await onDeleteEntity('student', studentId);
            setFeedback({ type: 'success', message: `Student '${studentName}' deleted successfully!` });
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setFeedback({ type: 'error', message: `Failed to delete student: ${message}` });
        } finally {
            setIsLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedStudents.length === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedStudents.length} selected student(s)?`)) return;
        setIsLoading(true); setFeedback(null);
        try {
            await Promise.all(selectedStudents.map(id => onDeleteEntity('student', id)));
            setFeedback({ type: 'success', message: `${selectedStudents.length} student(s) deleted successfully!` });
            setSelectedStudents([]);
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setFeedback({ type: 'error', message: `Failed to delete students: ${message}` });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <>
            <StudentImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
            <SectionCard
                title="Student Management"
                actions={(
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsImportModalOpen(true)} disabled={isLoading} className="flex items-center gap-1 text-sm bg-gray-100 dark:bg-slate-700/50 text-gray-700 dark:text-gray-300 font-semibold px-3 py-1.5 rounded-md disabled:opacity-50"><UploadIcon />Import</button>
                        <button onClick={() => setEditingStudent({ new: true })} disabled={!selectedClassId || isLoading} className="flex items-center gap-1 text-sm bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-semibold px-3 py-1.5 rounded-md disabled:opacity-50"><AddIcon />Add Student</button>
                    </div>
                )}
            >
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <select id="class-selector" name="class-selector" value={selectedClassId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedClassId(e.target.value)} className="p-2 border bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md" disabled={isLoading}>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <div className="relative flex-grow">
                        <label htmlFor="student-search" className="sr-only">Search students in this class</label>
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input type="text" id="student-search" name="student-search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search students in this class..." className="w-full p-2 pl-10 border dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 rounded-md" disabled={isLoading} />
                    </div>
                </div>
                {(editingStudent && 'new' in editingStudent) && <StudentForm student={null} onSave={handleSaveStudent} onCancel={() => setEditingStudent(null)} classId={selectedClassId} isLoading={isLoading} />}
                {studentsInClass.length > 0 && (
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg border-b dark:border-slate-700 mb-2 text-sm">
                        <div className="flex items-center gap-3">
                            <input type="checkbox" ref={selectAllCheckboxRef} onChange={handleToggleSelectAll} checked={allIdsInView.length > 0 && selectedIdsInView.length === allIdsInView.length} disabled={isLoading} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                            <label className="font-medium">{selectedStudents.length > 0 ? `${selectedStudents.length} selected` : 'Select All'}</label>
                        </div>
                        {selectedStudents.length > 0 && <button onClick={handleBulkDelete} className="text-red-500 dark:text-red-400 font-semibold text-sm flex items-center gap-1 disabled:opacity-50" disabled={isLoading}><DeleteIcon />Delete Selected</button>}
                    </div>
                )}
                <div className="space-y-2 mt-2 max-h-96 overflow-y-auto pr-2">
                    {studentsInClass.length > 0 ? studentsInClass.map(student =>
                        (editingStudent && 'id' in editingStudent && editingStudent.id === student.id) ? (
                            <StudentForm key={student.id} student={student} onSave={handleSaveStudent} onCancel={() => setEditingStudent(null)} classId={selectedClassId} isLoading={isLoading} />
                        ) : (
                            <div key={student.id} className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-slate-900/50 rounded-lg">
                                <input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={() => handleToggleSelect(student.id)} disabled={isLoading} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                <div className="flex-grow flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">{student.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-slate-400">{`Roll: ${student.roll || 'N/A'} | ${student.email || 'No email'}`}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditingStudent(student)} className="text-indigo-500 dark:text-indigo-400 disabled:opacity-50" disabled={isLoading}><EditIcon /></button>
                                        <button onClick={() => handleDeleteStudent(student.id, student.name)} className="text-red-500 dark:text-red-400 disabled:opacity-50" disabled={isLoading}><DeleteIcon /></button>
                                    </div>
                                </div>
                            </div>
                        )
                    ) : <p className="text-center text-gray-500 p-4">No students found in this class.</p>}
                </div>
            </SectionCard>
        </>
    );
};

const UserForm = ({ user, onSave, onCancel, faculty, students, allUsers, isLoading }: { user: Partial<User> | null; onSave: (data: Partial<User>) => void; onCancel: () => void; faculty: Faculty[]; students: Student[]; allUsers: User[]; isLoading: boolean; }) => {
    const isEditing = !!(user && user._id);
    const [formData, setFormData] = useState({
        role: user?.role || 'student',
        profileId: user?.profileId || '',
        username: user?.username || '',
        password: '',
        _id: user?._id
    });
    const [error, setError] = useState<string | null>(null);

    const availableProfiles = useMemo(() => {
        const usedProfileIds = new Set(
            allUsers
                .map(u => u.profileId)
                .filter(id => id !== user?.profileId) 
        );

        if (formData.role === 'teacher') {
            return faculty.filter(f => !usedProfileIds.has(f.id));
        }
        if (formData.role === 'student') {
            return students.filter(s => !usedProfileIds.has(s.id));
        }
        return [];
    }, [formData.role, allUsers, faculty, students, user]);

    useEffect(() => {
        if (isEditing || !formData.profileId) return;
        const selectedProfile = availableProfiles.find(p => p.id === formData.profileId);
        if (selectedProfile && selectedProfile.email) {
            setFormData(prev => ({ ...prev, username: selectedProfile.email! }));
        }
    }, [formData.profileId, isEditing, availableProfiles]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'role') {
            setFormData(prev => ({
                ...prev,
                role: value as 'student' | 'teacher',
                profileId: '',
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!isEditing && !formData.password) { setError("Password is required for new users."); return; }
        if (!formData.profileId) { setError("A profile must be selected."); return; }
        const dataToSend: Partial<User> = { ...formData };
        if (!dataToSend.password) {
            delete dataToSend.password; 
        }
        onSave(dataToSend);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <ErrorDisplay message={error} />
            <div>
                <label htmlFor="userRole" className="block text-sm font-medium mb-1">Role</label>
                <select id="userRole" name="role" value={formData.role} onChange={handleChange} className="w-full p-2 border bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md" disabled={isLoading}>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                </select>
            </div>
            <div>
                <label htmlFor="userProfileId" className="block text-sm font-medium mb-1">Link to Profile</label>
                <select id="userProfileId" name="profileId" value={formData.profileId} onChange={handleChange} className="w-full p-2 border bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md" required disabled={isLoading}>
                    <option value="" disabled>Select a profile...</option>
                    {availableProfiles.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="userUsername" className="block text-sm font-medium mb-1">Username (Email)</label>
                <input id="userUsername" name="username" type="email" value={formData.username} onChange={handleChange} placeholder="user@example.com" className="w-full p-2 border bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md" required disabled={isLoading} />
            </div>
            <div>
                <label htmlFor="userPassword" className="block text-sm font-medium mb-1">{isEditing ? "New Password (optional)" : "Password"}</label>
                <input id="userPassword" name="password" type="password" value={formData.password} onChange={handleChange} placeholder={isEditing ? "Leave blank to keep current password" : "••••••••"} className="w-full p-2 border bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md" required={!isEditing} disabled={isLoading} />
            </div>
            <div className="flex gap-2 justify-end pt-4">
                <button type="button" onClick={onCancel} className="bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 font-semibold py-2 px-4 rounded-md disabled:opacity-50" disabled={isLoading}>Cancel</button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md w-28 disabled:opacity-50" disabled={isLoading}>{isLoading ? "Saving..." : "Save User"}</button>
            </div>
        </form>
    );
};

const UserManagementTab = ({ users, faculty, students, onSaveUser, onDeleteUser, setFeedback }: Pick<SmartClassroomProps, 'users' | 'faculty' | 'students' | 'onSaveUser' | 'onDeleteUser'> & { setFeedback: (feedback: { type: 'success' | 'error', message: string } | null) => void; }) => {
    const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [userToReset, setUserToReset] = useState<User | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const selectAllUsersCheckboxRef = useRef<HTMLInputElement>(null);

    const profileMap = useMemo(() => { const map = new Map<string, { name: string }>(); faculty.forEach(f => map.set(f.id, { name: f.name })); students.forEach(s => map.set(s.id, { name: s.name })); return map; }, [faculty, students]);
    const filteredUsers = useMemo(() => users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()) || (profileMap.get(u.profileId || '')?.name || '').toLowerCase().includes(searchTerm.toLowerCase())), [users, searchTerm, profileMap]);
    
    const allUserIdsInView = useMemo(() => filteredUsers.map(u => u._id!).filter(Boolean), [filteredUsers]);
    const selectedUserIdsInView = useMemo(() => selectedUsers.filter(id => allUserIdsInView.includes(id)), [selectedUsers, allUserIdsInView]);

    useEffect(() => {
        if (selectAllUsersCheckboxRef.current) {
            selectAllUsersCheckboxRef.current.indeterminate = selectedUserIdsInView.length > 0 && selectedUserIdsInView.length < allUserIdsInView.length;
        }
    }, [selectedUserIdsInView, allUserIdsInView]);

    const handleToggleSelectAllUsers = () => {
        if (selectedUserIdsInView.length === allUserIdsInView.length) {
            setSelectedUsers(prev => prev.filter(id => !allUserIdsInView.includes(id)));
        } else {
            setSelectedUsers(prev => [...new Set([...prev, ...allUserIdsInView])]);
        }
    };

    const handleToggleUserSelect = (userId: string) => {
        setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    };
    
    const handleSave = async (userData: Partial<User>) => {
        setIsSaving(true);
        setFeedback(null);
        try {
            const action = userData._id ? 'updated' : 'created';
            await onSaveUser(userData);
            setEditingUser(null);
            setFeedback({ type: 'success', message: `User account for '${userData.username}' ${action} successfully!` });
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setFeedback({ type: 'error', message: `Failed to save user account: ${message}` });
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
            setFeedback({ type: 'success', message: `User account '${userToDelete.username}' deleted successfully!` });
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setFeedback({ type: 'error', message: `Failed to delete user account: ${message}` });
        } finally {
            setIsDeleting(false);
        }
    };
    
    const handleGenerateCredentials = async () => {
        if (!userToReset) return;
        setIsSaving(true);
        setFeedback(null);
        try {
            // In a real app, this would call a backend endpoint to reset the password and send an email.
            // Here, we simulate the action with a delay.
            await new Promise(res => setTimeout(res, 1000)); 
            setFeedback({ type: 'success', message: `New credentials for ${userToReset.username} have been generated and sent.` });
            setUserToReset(null);
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setFeedback({ type: 'error', message: `Failed to generate credentials: ${message}` });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleBulkDeleteUsers = async () => {
        if (selectedUsers.length === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedUsers.length} selected user account(s)?`)) return;
        setIsDeleting(true);
        setFeedback(null);
        try {
            await Promise.all(selectedUsers.map(id => onDeleteUser(id)));
            setFeedback({ type: 'success', message: `${selectedUsers.length} user account(s) deleted successfully!` });
            setSelectedUsers([]);
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setFeedback({ type: 'error', message: `Failed to delete user accounts: ${message}` });
        } finally {
            setIsDeleting(false);
        }
    };

    const isLoading = isSaving || isDeleting;

    return (
        <>
            <SectionCard
                title="User Accounts"
                actions={<button onClick={() => setEditingUser({})} disabled={isLoading} className="flex items-center gap-1 text-sm bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-semibold px-3 py-1.5 rounded-md disabled:opacity-50"><AddIcon />Add User</button>}
            >
                <div className="relative mb-4">
                    <label htmlFor="user-search" className="sr-only">Search by name or email</label>
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input type="text" id="user-search" name="user-search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by name or email..." className="w-full p-2 pl-10 border dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 rounded-md" disabled={isLoading} />
                </div>
                {filteredUsers.length > 0 && (
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg border-b dark:border-slate-700 mb-2 text-sm">
                        <div className="flex items-center gap-3">
                            <input type="checkbox" ref={selectAllUsersCheckboxRef} onChange={handleToggleSelectAllUsers} checked={allUserIdsInView.length > 0 && selectedUserIdsInView.length === allUserIdsInView.length} disabled={isLoading} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                            <label className="font-medium">{selectedUsers.length > 0 ? `${selectedUsers.length} selected` : 'Select All'}</label>
                        </div>
                        {selectedUsers.length > 0 && <button onClick={handleBulkDeleteUsers} className="text-red-500 dark:text-red-400 font-semibold text-sm flex items-center gap-1 disabled:opacity-50" disabled={isLoading}><DeleteIcon />Delete Selected</button>}
                    </div>
                )}
                <div className="space-y-2 mt-2 max-h-96 overflow-y-auto pr-2">
                    {filteredUsers.length > 0 ? filteredUsers.map(user =>
                        <div key={user._id} className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-slate-900/50 rounded-lg">
                            <input type="checkbox" checked={selectedUsers.includes(user._id!)} onChange={() => handleToggleUserSelect(user._id!)} disabled={isLoading} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                            <div className="flex-grow flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{profileMap.get(user.profileId || '')?.name || 'Unlinked Profile'}</p>
                                    <p className="text-xs text-gray-500 dark:text-slate-400">{`${user.username} | Role: ${user.role}`}</p>
                                </div>
                                <div className="flex gap-2"> 
                                    <button onClick={() => setEditingUser(user)} className="text-indigo-500 disabled:opacity-50" disabled={isLoading}><EditIcon /></button>
                                    <button onClick={() => setUserToReset(user)} className="text-yellow-500 dark:text-yellow-400 disabled:opacity-50" title="Generate & Send New Credentials" disabled={isLoading}><KeyIcon /></button>
                                    <button onClick={() => setUserToDelete(user)} className="text-red-500 disabled:opacity-50" disabled={isLoading}><DeleteIcon /></button>
                                </div>
                            </div>
                        </div>
                    ) : <p className="text-center text-gray-500 p-4">No users found.</p>}
                </div>
            </SectionCard>
            <Modal isOpen={!!editingUser} onClose={() => !isSaving && setEditingUser(null)} title={editingUser?._id ? "Edit User" : "Add New User"}>
                {editingUser && <UserForm user={editingUser} onSave={handleSave} onCancel={() => setEditingUser(null)} faculty={faculty} students={students} allUsers={users} isLoading={isSaving} />}
            </Modal>
            <Modal isOpen={!!userToDelete} onClose={() => !isDeleting && setUserToDelete(null)} title="Confirm Deletion">
                {userToDelete && (
                    <div>
                        <p>Are you sure you want to delete the user account for <strong>{userToDelete.username}</strong>? This action cannot be undone.</p>
                        <div className="flex gap-2 justify-end pt-4">
                            <button onClick={() => setUserToDelete(null)} className="bg-gray-200 dark:bg-slate-600 font-semibold py-2 px-4 rounded-md disabled:opacity-50" disabled={isDeleting}>Cancel</button>
                            <button onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md w-28 disabled:opacity-50" disabled={isDeleting}>{isDeleting ? "Deleting..." : "Delete"}</button>
                        </div>
                    </div>
                )}
            </Modal>
            <Modal isOpen={!!userToReset} onClose={() => !isLoading && setUserToReset(null)} title="Generate New Credentials">
                {userToReset && (
                    <div>
                        <p className="mb-4">This will generate a new temporary password for <strong>{userToReset.username}</strong> and send it to their email. Are you sure?</p>
                        <div className="flex gap-2 justify-end pt-4">
                            <button onClick={() => setUserToReset(null)} className="bg-gray-200 dark:bg-slate-600 font-semibold py-2 px-4 rounded-md disabled:opacity-50" disabled={isLoading}>Cancel</button>
                            <button onClick={handleGenerateCredentials} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md w-40 disabled:opacity-50" disabled={isLoading}>{isLoading ? "Sending..." : "Confirm & Send"}</button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
};

const MyProfileTab = ({ user, faculty, students, onSaveEntity, onSaveUser, setFeedback }: Pick<SmartClassroomProps, 'user' | 'faculty' | 'students' | 'onSaveEntity' | 'onSaveUser'> & { setFeedback: (feedback: { type: 'success' | 'error', message: string } | null) => void; }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const userProfile = useMemo(() => {
        if (!user.profileId) return null;
        if (user.role === 'teacher' || user.role === 'admin') { // Admin often has a faculty profile
            return faculty.find(f => f.id === user.profileId);
        }
        if (user.role === 'student') {
            return students.find(s => s.id === user.profileId);
        }
        return null;
    }, [user, faculty, students]);
    
    const [profileData, setProfileData] = useState({ name: '', specialization: '' });
    const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });

    useEffect(() => {
        if (userProfile) {
            setProfileData({
                name: userProfile.name,
                specialization: 'specialization' in userProfile ? userProfile.specialization.join(', ') : ''
            });
        }
    }, [userProfile]);

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfileData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswordData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async () => {
        setFormError(null);
        setFeedback(null);

        if (passwordData.newPassword && passwordData.newPassword !== passwordData.confirmPassword) {
            setFormError("Passwords do not match.");
            return;
        }

        setIsLoading(true);
        try {
            // 1. Update Profile (Faculty/Student record)
            if (userProfile) {
                const profilePayload = {
                    ...userProfile,
                    name: profileData.name,
                    ...( 'specialization' in userProfile && { specialization: profileData.specialization.split(',').map(s => s.trim()) } )
                };
                await onSaveEntity(user.role === 'student' ? 'student' : 'faculty', profilePayload);
            }

            // 2. Update User (password, if changed)
            if (passwordData.newPassword) {
                const userPayload = {
                    _id: user._id,
                    password: passwordData.newPassword,
                    // Pass other fields to ensure they aren't overwritten
                    username: user.username,
                    role: user.role,
                    profileId: user.profileId,
                };
                await onSaveUser(userPayload);
            }
            
            setFeedback({ type: 'success', message: 'Your profile was updated successfully!' });
            setIsEditing(false);
            setPasswordData({ newPassword: '', confirmPassword: '' });

        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setFeedback({ type: 'error', message: `Failed to update profile: ${message}` });
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!userProfile) {
        return <SectionCard title="My Profile"><p className="text-gray-500">Your profile is not linked. Please contact an administrator.</p></SectionCard>;
    }

    const ProfileField = ({ label, value }: { label: string, value: React.ReactNode }) => (
        <div><p className="text-sm text-gray-500 dark:text-gray-400">{label}</p><p className="font-medium">{value}</p></div>
    );

    return (
        <SectionCard
            title="My Profile"
            actions={!isEditing && <button onClick={() => setIsEditing(true)} className="flex items-center gap-1 text-sm bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-semibold px-3 py-1.5 rounded-md"><EditIcon />Edit Profile</button>}
        >
            {isEditing ? (
                <div className="space-y-6">
                    <ErrorDisplay message={formError} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label htmlFor="profileName" className="block text-sm font-medium mb-1">Full Name</label><input id="profileName" name="name" value={profileData.name} onChange={handleProfileChange} className="w-full p-2 border bg-gray-50 dark:bg-slate-700 rounded-md" disabled={isLoading} /></div>
                        {'specialization' in userProfile && <div><label htmlFor="profileSpecialization" className="block text-sm font-medium mb-1">Specializations (comma-separated)</label><input id="profileSpecialization" name="specialization" value={profileData.specialization} onChange={handleProfileChange} className="w-full p-2 border bg-gray-50 dark:bg-slate-700 rounded-md" disabled={isLoading} /></div>}
                    </div>
                    <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                        <h4 className="font-semibold mb-2">Change Password</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div><label htmlFor="newPassword" className="block text-sm font-medium mb-1">New Password</label><input id="newPassword" name="newPassword" type="password" value={passwordData.newPassword} onChange={handlePasswordChange} className="w-full p-2 border bg-gray-50 dark:bg-slate-700 rounded-md" disabled={isLoading} /></div>
                             <div><label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">Confirm New Password</label><input id="confirmPassword" name="confirmPassword" type="password" value={passwordData.confirmPassword} onChange={handlePasswordChange} className="w-full p-2 border bg-gray-50 dark:bg-slate-700 rounded-md" disabled={isLoading} /></div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setIsEditing(false)} className="bg-gray-200 dark:bg-slate-600 font-semibold py-2 px-4 rounded-md" disabled={isLoading}>Cancel</button>
                        <button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md w-36" disabled={isLoading}>{isLoading ? "Saving..." : "Save Changes"}</button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ProfileField label="Full Name" value={userProfile.name} />
                        <ProfileField label="Username/Email" value={user.username} />
                        {('department' in userProfile) && <ProfileField label="Department" value={userProfile.department} />}
                        {('specialization' in userProfile) && <ProfileField label="Specialization" value={userProfile.specialization.join(', ')} />}
                    </div>
                </div>
            )}
        </SectionCard>
    );
};

const AttendanceManagementTab = ({ classes, students, attendance, onSaveClassAttendance, setFeedback }: Pick<SmartClassroomProps, 'classes' | 'students' | 'attendance' | 'onSaveClassAttendance'> & { setFeedback: (feedback: { type: 'success' | 'error', message: string } | null) => void; }) => {
    const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [currentRecords, setCurrentRecords] = useState<AttendanceRecord>({});
    const [isLoading, setIsLoading] = useState(false);

    const studentsInClass = useMemo(() => students.filter(s => s.classId === selectedClassId), [students, selectedClassId]);

    useEffect(() => {
        const existingRecords = attendance[selectedClassId]?.[selectedDate] || {};
        const initialRecords = studentsInClass.reduce((acc, student) => {
            acc[student.id] = existingRecords[student.id] || 'absent';
            return acc;
        }, {} as AttendanceRecord);
        setCurrentRecords(initialRecords);
    }, [selectedClassId, selectedDate, attendance, studentsInClass]);

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setCurrentRecords(prev => ({ ...prev, [studentId]: status }));
    };

    const handleMarkAll = (status: AttendanceStatus) => {
        const newRecords = studentsInClass.reduce((acc, student) => {
            acc[student.id] = status;
            return acc;
        }, {} as AttendanceRecord);
        setCurrentRecords(newRecords);
    };

    const handleSave = async () => {
        setIsLoading(true);
        setFeedback(null);
        try {
            await onSaveClassAttendance(selectedClassId, selectedDate, currentRecords);
            setFeedback({ type: 'success', message: `Attendance for ${selectedDate} saved successfully!` });
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setFeedback({ type: 'error', message: `Failed to save attendance: ${message}` });
        } finally {
            setIsLoading(false);
        }
    };
    
    const summary = useMemo(() => {
        const present = Object.values(currentRecords).filter(s => s === 'present').length;
        const absent = Object.values(currentRecords).filter(s => s === 'absent').length;
        return { total: studentsInClass.length, present, absent };
    }, [currentRecords, studentsInClass]);

    return (
        <SectionCard title="Attendance Tracking">
            <div className="flex flex-col md:flex-row gap-4 mb-4 pb-4 border-b dark:border-slate-700">
                <div className="flex-1">
                    <label htmlFor="attendance-class" className="block text-sm font-medium mb-1">Select Class</label>
                    <select id="attendance-class" name="attendance-class" value={selectedClassId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedClassId(e.target.value)} className="w-full p-2 border bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md" disabled={isLoading}>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="flex-1">
                    <label htmlFor="attendance-date" className="block text-sm font-medium mb-1">Select Date</label>
                    <input type="date" id="attendance-date" name="attendance-date" value={selectedDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)} className="w-full p-2 border bg-gray-50 dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-md" disabled={isLoading} />
                </div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg mb-4 flex flex-wrap justify-between items-center gap-4">
                <div className="flex gap-4 font-medium">
                    <span>Total Students: {summary.total}</span>
                    <span className="text-green-600 dark:text-green-400">Present: {summary.present}</span>
                    <span className="text-red-600 dark:text-red-400">Absent: {summary.absent}</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handleMarkAll('present')} className="text-sm bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 font-semibold px-3 py-1.5 rounded-md" disabled={isLoading}>Mark All Present</button>
                    <button onClick={() => handleMarkAll('absent')} className="text-sm bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 font-semibold px-3 py-1.5 rounded-md" disabled={isLoading}>Mark All Absent</button>
                </div>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {studentsInClass.length > 0 ? studentsInClass.map(student => (
                    <div key={student.id} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-slate-900/50 rounded-lg">
                        <div>
                            <p className="font-semibold">{student.name}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400">Roll: {student.roll || 'N/A'}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleStatusChange(student.id, 'present')} className={`px-4 py-1.5 text-sm font-bold rounded-md ${currentRecords[student.id] === 'present' ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-slate-700'}`} disabled={isLoading}>Present</button>
                            <button onClick={() => handleStatusChange(student.id, 'absent')} className={`px-4 py-1.5 text-sm font-bold rounded-md ${currentRecords[student.id] === 'absent' ? 'bg-red-600 text-white' : 'bg-gray-200 dark:bg-slate-700'}`} disabled={isLoading}>Absent</button>
                        </div>
                    </div>
                )) : <p className="text-center text-gray-500 p-4">No students in this class.</p>}
            </div>
            <div className="flex justify-end mt-6">
                <button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg disabled:opacity-50" disabled={isLoading || studentsInClass.length === 0}>{isLoading ? "Saving..." : "Save Attendance"}</button>
            </div>
        </SectionCard>
    );
};

export const SmartClassroom = (props: SmartClassroomProps) => {
    const { user, classes, faculty, students, users, attendance, onSaveEntity, onDeleteEntity, onSaveUser, onDeleteUser, onSaveClassAttendance } = props;
    const [activeTab, setActiveTab] = useState('profile');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [globalSearchQuery, setGlobalSearchQuery] = useState('');
    const [isSearchResultsVisible, setIsSearchResultsVisible] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (feedback) {
            const timer = setTimeout(() => setFeedback(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [feedback]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsSearchResultsVisible(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const classMap = useMemo(() => new Map(classes.map(c => [c.id, c.name])), [classes]);

    const searchResults = useMemo(() => {
        const query = globalSearchQuery.trim().toLowerCase();
        if (!query) return [];

        const studentResults = students
            .filter(s => s.name.toLowerCase().includes(query) || s.email?.toLowerCase().includes(query))
            .map(s => ({
                id: s.id,
                name: s.name,
                type: 'Student',
                details: `Class: ${classMap.get(s.classId) || 'N/A'}`
            }));

        const facultyResults = faculty
            .filter(f => f.name.toLowerCase().includes(query) || f.email.toLowerCase().includes(query))
            .map(f => ({
                id: f.id,
                name: f.name,
                type: 'Faculty',
                details: `Dept: ${f.department}`
            }));

        return [...studentResults, ...facultyResults];
    }, [globalSearchQuery, students, faculty, classMap]);

    const tabs = [
        { key: 'profile', label: "My Profile", icon: <ProfileIcon className='h-5 w-5' /> },
        { key: 'students', label: "Student Management", icon: <StudentIcon className='h-5 w-5' /> },
        { key: 'users', label: "User Accounts", icon: <UsersIcon className='h-5 w-5' /> },
        { key: 'attendance', label: "Attendance", icon: <AttendanceIcon className='h-5 w-5' /> },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'profile': return <MyProfileTab user={user} faculty={faculty} students={students} onSaveEntity={onSaveEntity} onSaveUser={onSaveUser} setFeedback={setFeedback} />;
            case 'students': return <StudentManagementTab classes={classes} students={students} onSaveEntity={onSaveEntity} onDeleteEntity={onDeleteEntity} setFeedback={setFeedback} />;
            case 'users': return <UserManagementTab users={users} faculty={faculty} students={students} onSaveUser={onSaveUser} onDeleteUser={onDeleteUser} setFeedback={setFeedback} />;
            case 'attendance': return <AttendanceManagementTab classes={classes} students={students} attendance={attendance} onSaveClassAttendance={onSaveClassAttendance} setFeedback={setFeedback} />;
            default: return <SectionCard title="Coming Soon"><p>This feature is under development.</p></SectionCard>;
        }
    };

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">
            <FeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />
            <header className="flex flex-wrap justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Smart Classroom Administration</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage students, users, and class settings.</p>
                </div>
                <div ref={searchContainerRef} className="relative flex-grow max-w-lg mx-auto">
                    <label htmlFor="global-search" className="sr-only">Search all students and faculty</label>
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        name="global-search"
                        id="global-search"
                        value={globalSearchQuery}
                        onChange={e => setGlobalSearchQuery(e.target.value)}
                        onFocus={() => setIsSearchResultsVisible(true)}
                        placeholder="Search all students & faculty..."
                        className="w-full p-2.5 pl-10 border dark:border-slate-600 bg-white dark:bg-slate-900/50 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500"
                    />
                    {(isSearchResultsVisible && globalSearchQuery) && (
                        <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-lg z-10 max-h-80 overflow-y-auto">
                            {searchResults.length > 0 ? searchResults.map(item =>
                                <div key={`${item.type}-${item.id}`} className="p-3 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer border-b dark:border-slate-700/50">
                                    <p className="font-semibold">{item.name}</p>
                                    <div className="text-xs flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                        <span className={`px-2 py-0.5 rounded-full text-white ${item.type === 'Student' ? 'bg-blue-500' : 'bg-green-500'}`}>{item.type}</span>
                                        <span>{item.details}</span>
                                    </div>
                                </div>
                            ) : <p className="p-4 text-center text-gray-500">No results found.</p>}
                        </div>
                    )}
                </div>
            </header>
            <nav className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-2 rounded-xl flex flex-wrap gap-2 mb-8">
                {tabs.map(tab => <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === tab.key ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'}`}>{tab.icon}{tab.label}</button>)}
            </nav>
            <main>{renderContent()}</main>
        </div>
    );
};