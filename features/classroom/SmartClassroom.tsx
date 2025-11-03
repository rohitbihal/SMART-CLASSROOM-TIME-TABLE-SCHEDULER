import React, { useState, useMemo, useEffect, useRef } from 'react';
import { NavLink, Outlet, useOutletContext, useLocation } from 'react-router-dom';
import {
    SearchIcon, StudentIcon, UsersIcon, AddIcon, EditIcon, DeleteIcon, ProfileIcon, AttendanceIcon, UploadIcon, KeyIcon, ShieldIcon, TeacherIcon, ClockIcon, ChatIcon, SendIcon, AIIcon, SaveIcon, IMSIcon, CalendarIcon, MeetingIcon, QueryIcon, NotificationBellIcon
} from '../../components/Icons';
import { SectionCard, Modal, FeedbackBanner, FormField, TextInput, SelectInput } from '../../components/common';
import { User, Class, Student, Faculty, Attendance, AttendanceStatus, AttendanceRecord, Constraints, ChatMessage } from '../../types';

export interface SmartClassroomProps {
    user: User;
    classes: Class[]; faculty: Faculty[]; students: Student[]; users: User[];
    attendance: Attendance;
    constraints: Constraints | null;
    chatMessages: ChatMessage[];
    onSaveEntity: (type: 'student' | 'class' | 'faculty' | 'room' | 'subject', data: any) => Promise<void>;
    onDeleteEntity: (type: 'student' | 'class' | 'faculty' | 'room' | 'subject', id: string) => Promise<void>;
    onSaveUser: (userData: any) => Promise<void>;
    onDeleteUser: (userId: string) => Promise<void>;
    onSaveClassAttendance: (classId: string, date: string, records: AttendanceRecord) => Promise<void>;
    onUpdateConstraints: (constraints: Constraints) => Promise<void>;
    onAdminSendMessage: (classId: string, text: string) => Promise<void>;
    onAdminAskAsStudent: (studentId: string, messageText: string) => Promise<ChatMessage>;
}

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', isLoading = false }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmText?: string; isLoading?: boolean; }) => {
    if (!isOpen) return null;
    return (
        // FIX: Wrapped content inside Modal
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div>
                <div className="flex items-start gap-4">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
                        <ShieldIcon className="h-6 w-6 text-red-600 dark:text-red-300" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                        <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
                    </div>
                </div>
                <div className="flex gap-2 justify-end pt-6 mt-4 border-t dark:border-slate-700">
                    <button onClick={onClose} className="btn-secondary disabled:opacity-50" disabled={isLoading}>Cancel</button>
                    <button onClick={onConfirm} className="btn-danger w-32 disabled:opacity-50" disabled={isLoading}>{isLoading ? "Deleting..." : confirmText}</button>
                </div>
            </div>
        </Modal>
    );
};

const StudentForm: React.FC<{ student: Student | null; onSave: (data: Partial<Student>) => void; onCancel: () => void; classId: string; isLoading: boolean; }> = ({ student, onSave, onCancel, classId, isLoading }) => {
    const [formData, setFormData] = useState(student ? { ...student, email: student.email || '', roll: student.roll || '', contactNumber: student.contactNumber || '' } : { name: '', email: '', roll: '', classId, contactNumber: '' });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(formData); };
    const formId = `student-form-${student?.id || 'new'}`;
    return (
        <form onSubmit={handleSubmit} className="space-y-4 bg-white/5 dark:bg-slate-900/50 p-4 rounded-lg my-2">
            <div>
                <label htmlFor={`${formId}-name`} className="sr-only">Student Name</label>
                <TextInput id={`${formId}-name`} name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Alice Sharma" required disabled={isLoading} />
            </div>
            <div>
                 <label htmlFor={`${formId}-email`} className="sr-only">Student Email</label>
                <TextInput id={`${formId}-email`} name="email" type="email" value={formData.email} onChange={handleChange} placeholder="e.g. name@example.com" disabled={isLoading} />
            </div>
            <div>
                 <label htmlFor={`${formId}-roll`} className="sr-only">Roll Number</label>
                <TextInput id={`${formId}-roll`} name="roll" value={formData.roll} onChange={handleChange} placeholder="e.g. 23" disabled={isLoading} />
            </div>
            <div>
                 <label htmlFor={`${formId}-contactNumber`} className="sr-only">Contact Number</label>
                <TextInput id={`${formId}-contactNumber`} name="contactNumber" type="tel" value={formData.contactNumber} onChange={handleChange} placeholder="e.g. 9876543210" disabled={isLoading} />
            </div>
            <div className="flex gap-2 justify-end">
                <button type="button" onClick={onCancel} className="btn-secondary disabled:opacity-50" disabled={isLoading}>Cancel</button>
                <button type="submit" className="btn-primary w-32 disabled:opacity-50" disabled={isLoading}>{isLoading ? "Saving..." : "Save Student"}</button>
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
                    <p className="text-xs font-mono mt-1 text-gray-600 dark:text-gray-300">Required columns: name, email, classId, roll. Optional: contactNumber</p>
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
                     <button type="button" onClick={() => { alert('File processing is a placeholder.'); onClose(); }} className="btn-primary flex items-center justify-center gap-2">Process File</button>
                </div>
            </div>
        </Modal>
    );
};

export const StudentManagementTab = () => {
    const { classes, students, onSaveEntity, onDeleteEntity } = useOutletContext<SmartClassroomProps>();
    const { setFeedback } = useOutletContext<ReturnType<typeof useSmartClassroomLayout>>();
    
    const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
    const [editingStudent, setEditingStudent] = useState<Student | { new: true } | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [studentToDelete, setStudentToDelete] = useState<{ id: string, name: string } | null>(null);
    const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
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

    const confirmDeleteStudent = async () => {
        if (!studentToDelete) return;
        setIsLoading(true); setFeedback(null);
        try {
            await onDeleteEntity('student', studentToDelete.id);
            setFeedback({ type: 'success', message: `Student '${studentToDelete.name}' deleted successfully!` });
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setFeedback({ type: 'error', message: `Failed to delete student: ${message}` });
        } finally {
            setIsLoading(false);
            setStudentToDelete(null);
        }
    };

    const confirmBulkDelete = async () => {
        if (selectedStudents.length === 0) return;
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
            setIsBulkDeleteConfirmOpen(false);
        }
    };
    
    return (
        <>
            <StudentImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
            <ConfirmationModal 
                isOpen={!!studentToDelete}
                onClose={() => setStudentToDelete(null)}
                onConfirm={confirmDeleteStudent}
                title="Confirm Student Deletion"
                message={`Are you sure you want to delete ${studentToDelete?.name}? This action cannot be undone.`}
                isLoading={isLoading}
            />
            <ConfirmationModal 
                isOpen={isBulkDeleteConfirmOpen}
                onClose={() => setIsBulkDeleteConfirmOpen(false)}
                onConfirm={confirmBulkDelete}
                title={`Confirm Bulk Deletion`}
                message={`Are you sure you want to delete the ${selectedStudents.length} selected student(s)? This action cannot be undone.`}
                isLoading={isLoading}
                confirmText={`Delete ${selectedStudents.length} Student(s)`}
            />
            {/* FIX: Wrapped content inside SectionCard */}
            <SectionCard
                title="Student Management"
                actions={(
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsImportModalOpen(true)} disabled={isLoading} className="action-btn-secondary disabled:opacity-50"><UploadIcon />Import</button>
                        <button onClick={() => setEditingStudent({ new: true })} disabled={!selectedClassId || isLoading} className="action-btn-primary disabled:opacity-50"><AddIcon />Add Student</button>
                    </div>
                )}
            >
                <div>
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <SelectInput id="class-selector" name="class-selector" value={selectedClassId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedClassId(e.target.value)} disabled={isLoading}>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </SelectInput>
                        <div className="relative flex-grow">
                            <label htmlFor="student-search" className="sr-only">Search students in this class</label>
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <TextInput type="text" id="student-search" name="student-search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search students in this class..." className="pl-10" disabled={isLoading} />
                        </div>
                    </div>
                    {(editingStudent && 'new' in editingStudent) && <StudentForm student={null} onSave={handleSaveStudent} onCancel={() => setEditingStudent(null)} classId={selectedClassId} isLoading={isLoading} />}
                    {studentsInClass.length > 0 && (
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg border-b dark:border-slate-700 mb-2 text-sm">
                            <div className="flex items-center gap-3">
                                <input type="checkbox" ref={selectAllCheckboxRef} onChange={handleToggleSelectAll} checked={allIdsInView.length > 0 && selectedIdsInView.length === allIdsInView.length} disabled={isLoading} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                <label className="font-medium">{selectedStudents.length > 0 ? `${selectedStudents.length} selected` : 'Select All'}</label>
                            </div>
                            {selectedStudents.length > 0 && <button onClick={() => setIsBulkDeleteConfirmOpen(true)} className="text-red-500 dark:text-red-400 font-semibold text-sm flex items-center gap-1 disabled:opacity-50" disabled={isLoading}><DeleteIcon />Delete Selected</button>}
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
                                            <button onClick={() => setStudentToDelete({ id: student.id, name: student.name })} className="text-red-500 dark:text-red-400 disabled:opacity-50" disabled={isLoading}><DeleteIcon /></button>
                                        </div>
                                    </div>
                                </div>
                            )
                        ) : <p className="text-center text-gray-500 p-4">No students found in this class.</p>}
                    </div>
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
            {error && <div className="bg-red-100 text-red-700 p-2 rounded">{error}</div>}
            {/* FIX: Wrapped SelectInput inside FormField */}
            <FormField label="Role" htmlFor="userRole">
                <SelectInput id="userRole" name="role" value={formData.role} onChange={handleChange} disabled={isLoading}>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                </SelectInput>
            </FormField>
            {/* FIX: Wrapped SelectInput inside FormField */}
            <FormField label="Link to Profile" htmlFor="userProfileId">
                <SelectInput id="userProfileId" name="profileId" value={formData.profileId} onChange={handleChange} required disabled={isLoading}>
                    <option value="" disabled>Select a profile...</option>
                    {availableProfiles.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </SelectInput>
            </FormField>
            {/* FIX: Wrapped TextInput inside FormField */}
            <FormField label="Username (Email)" htmlFor="userUsername">
                <TextInput id="userUsername" name="username" type="email" value={formData.username} onChange={handleChange} placeholder="user@example.com" required disabled={isLoading} />
            </FormField>
            {/* FIX: Wrapped TextInput inside FormField */}
            <FormField label={isEditing ? "New Password (optional)" : "Password"} htmlFor="userPassword">
                <TextInput id="userPassword" name="password" type="password" value={formData.password} onChange={handleChange} placeholder={isEditing ? "Leave blank to keep current password" : "••••••••"} required={!isEditing} disabled={isLoading} />
            </FormField>
            <div className="flex gap-2 justify-end pt-4">
                <button type="button" onClick={onCancel} className="btn-secondary disabled:opacity-50" disabled={isLoading}>Cancel</button>
                <button type="submit" className="btn-primary w-28 disabled:opacity-50" disabled={isLoading}>{isLoading ? "Saving..." : "Save User"}</button>
            </div>
        </form>
    );
};

export const UserManagementTab = () => {
    const { users, faculty, students, classes, onSaveUser, onDeleteUser } = useOutletContext<SmartClassroomProps>();
    const { setFeedback } = useOutletContext<ReturnType<typeof useSmartClassroomLayout>>();

    const [userType, setUserType] = useState<'teacher' | 'student'>('teacher');
    const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isBulkDeleteUsersConfirmOpen, setIsBulkDeleteUsersConfirmOpen] = useState(false);
    const [userToReset, setUserToReset] = useState<User | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const selectAllUsersCheckboxRef = useRef<HTMLInputElement>(null);
    const [selectedClassIdForUsers, setSelectedClassIdForUsers] = useState(classes[0]?.id || '');

    const profileMap = useMemo(() => { const map = new Map<string, { name: string, contactNumber?: string }>(); faculty.forEach(f => map.set(f.id, { name: f.name, contactNumber: f.contactNumber })); students.forEach(s => map.set(s.id, { name: s.name, contactNumber: s.contactNumber })); return map; }, [faculty, students]);
    
    const filteredUsers = useMemo(() => {
        let usersOfRole = users.filter(u => u.role === userType);

        if (userType === 'student' && selectedClassIdForUsers) {
            const studentIdsInClass = new Set(students.filter(s => s.classId === selectedClassIdForUsers).map(s => s.id));
            usersOfRole = usersOfRole.filter(u => u.profileId && studentIdsInClass.has(u.profileId));
        }

        return usersOfRole.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()) || (profileMap.get(u.profileId || '')?.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
    }, [users, userType, selectedClassIdForUsers, students, searchTerm, profileMap]);
    
    const allUserIdsInView = useMemo(() => filteredUsers.map(u => u._id!).filter(Boolean), [filteredUsers]);
    const selectedUserIdsInView = useMemo(() => selectedUsers.filter(id => allUserIdsInView.includes(id)), [selectedUsers, allUserIdsInView]);
    
    useEffect(() => { setSelectedUsers([]) }, [userType, selectedClassIdForUsers]);

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
            setIsBulkDeleteUsersConfirmOpen(false);
        }
    };

    const isLoading = isSaving || isDeleting;
    
    const UserTypeButton = ({ type, label, icon }: { type: 'teacher' | 'student', label: string, icon: React.ReactNode }) => (
      <button onClick={() => setUserType(type)} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${userType === type ? 'bg-indigo-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'}`}>
        {icon}
        {label}
      </button>
    );

    return (
        <>
            {/* FIX: Wrapped content inside SectionCard */}
            <SectionCard
                title="User Accounts"
                actions={<button onClick={() => setEditingUser({ role: userType })} disabled={isLoading} className="action-btn-primary disabled:opacity-50"><AddIcon />Add {userType === 'teacher' ? 'Teacher' : 'Student'}</button>}
            >
                <div>
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                      <div className="bg-gray-100 dark:bg-slate-800 p-1 rounded-lg flex gap-1">
                          <UserTypeButton type="teacher" label="Teachers" icon={<TeacherIcon className="h-5 w-5" />} />
                          <UserTypeButton type="student" label="Students" icon={<StudentIcon className="h-5 w-5" />} />
                      </div>
                      {userType === 'student' && (
                          <div className="flex-1">
                              <SelectInput id="user-class-selector" value={selectedClassIdForUsers} onChange={e => setSelectedClassIdForUsers(e.target.value)} disabled={isLoading}>
                                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </SelectInput>
                          </div>
                      )}
                      <div className="relative flex-grow">
                          <label htmlFor="user-search" className="sr-only">Search by name or email</label>
                          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <TextInput type="text" id="user-search" name="user-search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={`Search ${userType}s by name or email...`} className="pl-10" disabled={isLoading} />
                      </div>
                    </div>
                    {filteredUsers.length > 0 && (
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg border-b dark:border-slate-700 mb-2 text-sm">
                            <div className="flex items-center gap-3">
                                <input type="checkbox" ref={selectAllUsersCheckboxRef} onChange={handleToggleSelectAllUsers} checked={allUserIdsInView.length > 0 && selectedUserIdsInView.length === allUserIdsInView.length} disabled={isLoading} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                <label className="font-medium">{selectedUsers.length > 0 ? `${selectedUsers.length} selected` : 'Select All'}</label>
                            </div>
                            {selectedUsers.length > 0 && <button onClick={() => setIsBulkDeleteUsersConfirmOpen(true)} className="text-red-500 dark:text-red-400 font-semibold text-sm flex items-center gap-1 disabled:opacity-50" disabled={isLoading}><DeleteIcon />Delete Selected</button>}
                        </div>
                    )}
                    <div className="space-y-2 mt-2 max-h-96 overflow-y-auto pr-2">
                        {filteredUsers.length > 0 ? filteredUsers.map(user =>
                            <div key={user._id} className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-slate-900/50 rounded-lg">
                                <input type="checkbox" checked={selectedUsers.includes(user._id!)} onChange={() => handleToggleUserSelect(user._id!)} disabled={isLoading} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                <div className="flex-grow flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">{profileMap.get(user.profileId || '')?.name || 'Unlinked Profile'}</p>
                                        <p className="text-xs text-gray-500 dark:text-slate-400">{`${user.username} | ${profileMap.get(user.profileId || '')?.contactNumber || 'No contact'}`}</p>
                                    </div>
                                    <div className="flex gap-2"> 
                                        <button onClick={() => setEditingUser(user)} className="text-indigo-500 disabled:opacity-50" disabled={isLoading}><EditIcon /></button>
                                        <button onClick={() => setUserToReset(user)} className="text-yellow-500 dark:text-yellow-400 disabled:opacity-50" title="Generate & Send New Credentials" disabled={isLoading}><KeyIcon /></button>
                                        <button onClick={() => setUserToDelete(user)} className="text-red-500 disabled:opacity-50" disabled={isLoading}><DeleteIcon /></button>
                                    </div>
                                </div>
                            </div>
                        ) : <p className="text-center text-gray-500 p-4">No {userType} accounts found.</p>}
                    </div>
                </div>
            </SectionCard>
            {/* FIX: Wrapped content inside Modal */}
            <Modal isOpen={!!editingUser} onClose={() => !isSaving && setEditingUser(null)} title={editingUser?._id ? "Edit User" : "Add New User"}>
                {editingUser && <UserForm user={editingUser} onSave={handleSave} onCancel={() => setEditingUser(null)} faculty={faculty} students={students} allUsers={users} isLoading={isSaving} />}
            </Modal>
            <ConfirmationModal 
                isOpen={!!userToDelete}
                onClose={() => setUserToDelete(null)}
                onConfirm={handleDelete}
                title="Confirm User Deletion"
                message={`Are you sure you want to delete the user account for ${userToDelete?.username}? This action is permanent.`}
                isLoading={isDeleting}
            />
             <ConfirmationModal 
                isOpen={isBulkDeleteUsersConfirmOpen}
                onClose={() => setIsBulkDeleteUsersConfirmOpen(false)}
                onConfirm={handleBulkDeleteUsers}
                title={`Confirm Bulk User Deletion`}
                message={`Are you sure you want to delete the ${selectedUsers.length} selected user account(s)? This action is permanent.`}
                isLoading={isDeleting}
                confirmText={`Delete ${selectedUsers.length} Account(s)`}
            />
            {/* FIX: Wrapped content inside Modal */}
            <Modal isOpen={!!userToReset} onClose={() => !isLoading && setUserToReset(null)} title="Generate New Credentials">
                {userToReset && (
                    <div>
                        <p className="mb-4">This will generate a new temporary password for <strong>{userToReset.username}</strong> and send it to their email. Are you sure?</p>
                        <div className="flex gap-2 justify-end pt-4">
                            <button onClick={() => setUserToReset(null)} className="btn-secondary disabled:opacity-50" disabled={isLoading}>Cancel</button>
                            <button onClick={handleGenerateCredentials} className="btn-primary w-40 disabled:opacity-50" disabled={isLoading}>{isLoading ? "Sending..." : "Confirm & Send"}</button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
};

export const MyProfileTab = () => {
    const { user, faculty, students, onSaveEntity, onSaveUser } = useOutletContext<SmartClassroomProps>();
    const { setFeedback } = useOutletContext<ReturnType<typeof useSmartClassroomLayout>>();

    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const userProfile = useMemo((): Faculty | Student | null => {
        if (!user.profileId) return null;
        if (user.role === 'admin') {
            return faculty.find(f => f.id === user.profileId) || {
                id: user.profileId,
                name: user.username.split('@')[0],
                email: user.username,
                department: 'Administration',
                specialization: [],
                accessLevel: 'Super Admin',
                adminId: `ADM-${user.profileId.substring(0, 4)}`,
                employeeId: `ADM-${user.profileId.substring(0, 4)}`,
                designation: 'Professor',
                contactNumber: '',
                maxWorkload: 40,
            };
        }
        if (user.role === 'teacher') return faculty.find(f => f.id === user.profileId) || null;
        if (user.role === 'student') return students.find(s => s.id === user.profileId) || null;
        return null;
    }, [user, faculty, students]);
    
    const [profileData, setProfileData] = useState({ name: '', specialization: '', adminId: '', contactNumber: '', accessLevel: 'Super Admin' as Faculty['accessLevel'] });
    const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });

    useEffect(() => {
        if (userProfile) {
            setProfileData({
                name: userProfile.name,
                specialization: 'specialization' in userProfile ? userProfile.specialization.join(', ') : '',
                adminId: 'adminId' in userProfile ? userProfile.adminId || '' : '',
                contactNumber: 'contactNumber' in userProfile ? userProfile.contactNumber || '' : '',
                accessLevel: 'accessLevel' in userProfile ? userProfile.accessLevel : 'Super Admin',
            });
        }
    }, [userProfile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
            if (userProfile) {
                const profilePayload = {
                    ...userProfile,
                    name: profileData.name,
                    contactNumber: profileData.contactNumber,
                    ...(user.role !== 'student' && { specialization: profileData.specialization.split(',').map(s => s.trim()) }),
                    ...(user.role === 'admin' && { adminId: profileData.adminId, accessLevel: profileData.accessLevel })
                };
                await onSaveEntity(user.role === 'student' ? 'student' : 'faculty', profilePayload);
            }

            if (passwordData.newPassword) {
                const userPayload = { _id: user._id, password: passwordData.newPassword, username: user.username, role: user.role, profileId: user.profileId };
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
        <div><p className="text-sm text-gray-500 dark:text-gray-400">{label}</p><p className="font-medium">{value || 'N/A'}</p></div>
    );

    return (
        <SectionCard
            title="My Profile"
            actions={!isEditing && <button onClick={() => setIsEditing(true)} className="action-btn-primary"><EditIcon />Edit Profile</button>}
        >
            {isEditing ? (
                <div className="space-y-6">
                    {formError && <div className="bg-red-100 text-red-700 p-2 rounded">{formError}</div>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="Full Name" htmlFor="profileName"><TextInput id="profileName" name="name" value={profileData.name} onChange={handleChange} disabled={isLoading} /></FormField>
                        <FormField label="Contact Number" htmlFor="profileContact"><TextInput id="profileContact" name="contactNumber" type="tel" value={profileData.contactNumber} onChange={handleChange} disabled={isLoading} /></FormField>
                        {user.role === 'admin' && (
                            <>
                                <FormField label="Admin ID" htmlFor="profileAdminId"><TextInput id="profileAdminId" name="adminId" value={profileData.adminId} onChange={handleChange} disabled={isLoading} /></FormField>
                                <FormField label="Access Level" htmlFor="profileAccessLevel">
                                    <SelectInput id="profileAccessLevel" name="accessLevel" value={profileData.accessLevel} onChange={handleChange} disabled={isLoading}>
                                        <option>Super Admin</option>
                                        <option>Timetable Manager</option>
                                        <option>User Management</option>
                                    </SelectInput>
                                </FormField>
                            </>
                        )}
                        {user.role !== 'student' && <FormField label="Specializations (comma-separated)" htmlFor="profileSpecialization"><TextInput id="profileSpecialization" name="specialization" value={profileData.specialization} onChange={handleChange} disabled={isLoading} /></FormField>}
                        <div className="md:col-span-2"><FormField label="Profile Picture" htmlFor="profilePicture"><TextInput id="profilePicture" type="file" disabled={isLoading} /></FormField></div>
                    </div>
                    <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                        <h4 className="font-semibold mb-2">Change Password</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField label="New Password" htmlFor="newPassword"><TextInput id="newPassword" name="newPassword" type="password" value={passwordData.newPassword} onChange={handlePasswordChange} disabled={isLoading} /></FormField>
                             <FormField label="Confirm New Password" htmlFor="confirmPassword"><TextInput id="confirmPassword" name="confirmPassword" type="password" value={passwordData.confirmPassword} onChange={handlePasswordChange} disabled={isLoading} /></FormField>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setIsEditing(false)} className="btn-secondary" disabled={isLoading}>Cancel</button>
                        <button onClick={handleSave} className="btn-primary w-36" disabled={isLoading}>{isLoading ? "Saving..." : "Save Changes"}</button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ProfileField label="Full Name" value={userProfile.name} />
                        <ProfileField label="Username/Email" value={user.username} />
                        {'contactNumber' in userProfile && <ProfileField label="Contact Number" value={userProfile.contactNumber} />}
                        {'department' in userProfile && <ProfileField label="Department" value={userProfile.department} />}
                        {user.role === 'admin' && 'adminId' in userProfile && <ProfileField label="Admin ID" value={userProfile.adminId} />}
                        {user.role === 'admin' && 'accessLevel' in userProfile && <ProfileField label="Access Level" value={userProfile.accessLevel} />}
                        {'specialization' in userProfile && userProfile.specialization.length > 0 && <ProfileField label="Specialization" value={userProfile.specialization.join(', ')} />}
                    </div>
                </div>
            )}
        </SectionCard>
    );
};

export const AttendanceManagementTab = () => {
    const { classes, students, attendance, onSaveClassAttendance } = useOutletContext<SmartClassroomProps>();
    const { setFeedback } = useOutletContext<ReturnType<typeof useSmartClassroomLayout>>();

    const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [currentRecords, setCurrentRecords] = useState<AttendanceRecord>({});
    const [isLoading, setIsLoading] = useState(false);

    const studentsInClass = useMemo(() => students.filter(s => s.classId === selectedClassId), [students, selectedClassId]);

    useEffect(() => {
        const existingRecords = attendance[selectedClassId]?.[selectedDate] || {};
        const initialRecords = studentsInClass.reduce((acc, student) => {
            acc[student.id] = existingRecords[student.id] || 'unmarked';
            return acc;
        }, {} as AttendanceRecord);
        setCurrentRecords(initialRecords);
    }, [selectedClassId, selectedDate, attendance, studentsInClass]);

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setCurrentRecords(prev => ({ ...prev, [studentId]: status }));
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
        const statuses = Object.values(currentRecords);
        const present = statuses.filter(s => String(s).startsWith('present')).length;
        const absent = statuses.filter(s => String(s).startsWith('absent')).length;
        const unmarked = statuses.filter(s => s === 'unmarked').length;
        return { total: studentsInClass.length, present, absent, unmarked };
    }, [currentRecords, studentsInClass]);

    return (
        // FIX: Wrapped content inside SectionCard
        <SectionCard title="Attendance Tracking">
            <div>
                <div className="flex flex-col md:flex-row gap-4 mb-4 pb-4 border-b dark:border-slate-700">
                    <div className="flex-1">
                        <label htmlFor="attendance-class" className="block text-sm font-medium mb-1">Select Class</label>
                        <SelectInput id="attendance-class" name="attendance-class" value={selectedClassId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedClassId(e.target.value)} disabled={isLoading}>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </SelectInput>
                    </div>
                    <div className="flex-1">
                        <label htmlFor="attendance-date" className="block text-sm font-medium mb-1">Select Date</label>
                        <TextInput type="date" id="attendance-date" name="attendance-date" value={selectedDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)} disabled={isLoading} />
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg mb-4 flex flex-wrap justify-between items-center gap-4">
                    <div className="flex gap-4 font-medium">
                        <span>Total Students: {summary.total}</span>
                        <span className="text-green-600 dark:text-green-400">Present: {summary.present}</span>
                        <span className="text-red-600 dark:text-red-400">Absent: {summary.absent}</span>
                        <span className="text-gray-500 dark:text-gray-400">Unmarked: {summary.unmarked}</span>
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
                                <button title="Mark Present and Lock" onClick={() => handleStatusChange(student.id, 'present_locked')} className={`px-3 py-1.5 text-sm font-bold rounded-md ${currentRecords[student.id] === 'present_locked' ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-slate-700'}`} disabled={isLoading}>Lock P</button>
                                <button title="Mark Absent and Lock" onClick={() => handleStatusChange(student.id, 'absent_locked')} className={`px-3 py-1.5 text-sm font-bold rounded-md ${currentRecords[student.id] === 'absent_locked' ? 'bg-red-600 text-white' : 'bg-gray-200 dark:bg-slate-700'}`} disabled={isLoading}>Lock A</button>
                                <button title="Suggest Present to Teacher" onClick={() => handleStatusChange(student.id, 'present_suggested')} className={`px-3 py-1.5 text-sm font-bold rounded-md ${currentRecords[student.id] === 'present_suggested' ? 'bg-yellow-500 text-white' : 'bg-gray-200 dark:bg-slate-700'}`} disabled={isLoading}>Suggest P</button>
                            </div>
                        </div>
                    )) : <p className="text-center text-gray-500 p-4">No students in this class.</p>}
                </div>
                <div className="flex justify-end mt-6">
                    <button onClick={handleSave} className="btn-primary py-2 px-6 disabled:opacity-50" disabled={isLoading || studentsInClass.length === 0}>{isLoading ? "Saving..." : "Save & Lock Attendance"}</button>
                </div>
            </div>
        </SectionCard>
    );
};

export const ChatbotControlTab = () => {
    const { classes, constraints, chatMessages, onUpdateConstraints, onAdminSendMessage, students, onAdminAskAsStudent } = useOutletContext<SmartClassroomProps>();
    const { setFeedback } = useOutletContext<ReturnType<typeof useSmartClassroomLayout>>();
    
    const [chatWindow, setChatWindow] = useState(constraints?.chatWindow || { start: '09:00', end: '17:00' });
    const [isChatEnabled, setIsChatEnabled] = useState(constraints?.isChatboxEnabled ?? true);
    const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
    const [newMessage, setNewMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    
    // State for the AI testbed
    const [testStudentId, setTestStudentId] = useState(students[0]?.id || '');
    const [testQuestion, setTestQuestion] = useState('');
    const [testResponse, setTestResponse] = useState<ChatMessage | null>(null);
    const [isTesting, setIsTesting] = useState(false);

    const selectedClassName = useMemo(() => classes.find(c => c.id === selectedClassId)?.name, [classes, selectedClassId]);

    const filteredMessages = useMemo(() => {
        const channel = `admin-chat-${selectedClassId}`;
        return chatMessages
            .filter(m => m.channel === channel)
            .sort((a, b) => a.timestamp - b.timestamp);
    }, [chatMessages, selectedClassId]);
    
    useEffect(() => {
        if (constraints) {
            setChatWindow(constraints.chatWindow || { start: '09:00', end: '17:00' });
            setIsChatEnabled(constraints.isChatboxEnabled ?? true);
        }
    }, [constraints]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [filteredMessages]);

    const handleSaveSettings = async () => {
        if (!constraints) return;
        setIsSaving(true);
        setFeedback(null);
        try {
            await onUpdateConstraints({ ...constraints, chatWindow, isChatboxEnabled: isChatEnabled });
            setFeedback({ type: 'success', message: 'Chat settings updated!' });
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setFeedback({ type: 'error', message: `Failed to save settings: ${message}` });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = newMessage.trim();
        if (!text || !selectedClassId) return;

        setIsSending(true);
        setFeedback(null);
        try {
            await onAdminSendMessage(selectedClassId, text);
            setNewMessage('');
            setFeedback({ type: 'success', message: 'Message sent successfully!' });
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setFeedback({ type: 'error', message: `Failed to send message: ${message}` });
        } finally {
            setIsSending(false);
        }
    };

    const handleTestQuery = async () => {
        const text = testQuestion.trim();
        if (!text || !testStudentId) return;
        setIsTesting(true);
        setTestResponse(null);
        try {
            const aiResponse = await onAdminAskAsStudent(testStudentId, text);
            setTestResponse(aiResponse);
        } catch (error) {
            const errorMessage: ChatMessage = {
                id: `error-${Date.now()}`, author: 'System Error', role: 'admin',
                text: `The AI could not process this request. Details: ${error instanceof Error ? error.message : 'Unknown error'}`,
                timestamp: Date.now(), classId: '', channel: 'admin-test'
            };
            setTestResponse(errorMessage);
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 flex flex-col gap-6">
                    {/* FIX: Wrapped content inside SectionCard */}
                    <SectionCard title="Chatbot & Chatbox Settings">
                        <div>
                            <div>
                                <h4 className="font-semibold text-lg mb-2">Campus AI Availability</h4>
                                <p className="text-sm text-text-secondary mb-4">Set the time window when the student AI chatbot is active.</p>
                                <div className="space-y-4">
                                    <FormField label="Start Time" htmlFor="chat-start"><TextInput type="time" id="chat-start" value={chatWindow.start} onChange={e => setChatWindow(p => ({...p, start: e.target.value}))} /></FormField>
                                    <FormField label="End Time" htmlFor="chat-end"><TextInput type="time" id="chat-end" value={chatWindow.end} onChange={e => setChatWindow(p => ({...p, end: e.target.value}))} /></FormField>
                                </div>
                            </div>
                            <div className="border-t border-border-primary mt-6 pt-6">
                                <h4 className="font-semibold text-lg mb-2">Student/Teacher Chatbox</h4>
                                <div className="flex items-center justify-between bg-bg-tertiary p-4 rounded-lg">
                                    <div>
                                        <p className="font-semibold">Enable Chatbox</p>
                                        <p className="text-sm text-text-secondary">Allow students and teachers to communicate directly and in class groups.</p>
                                    </div>
                                    <label htmlFor="chatbox-toggle" className="flex items-center cursor-pointer">
                                        <div className="relative">
                                            <input type="checkbox" id="chatbox-toggle" className="sr-only peer" checked={isChatEnabled} onChange={() => setIsChatEnabled(!isChatEnabled)} />
                                            <div className="block bg-gray-400 dark:bg-gray-600 w-14 h-8 rounded-full peer-checked:bg-green-500 transition-colors"></div>
                                            <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform transform peer-checked:translate-x-6"></div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                            <div className="flex justify-end mt-6">
                                <button onClick={handleSaveSettings} className="btn-primary w-32" disabled={isSaving}>{isSaving ? "Saving..." : "Save Settings"}</button>
                            </div>
                        </div>
                    </SectionCard>
                </div>
                <div className="lg:col-span-2">
                    {/* FIX: Wrapped content inside SectionCard */}
                    <SectionCard title="Admin Announcements">
                        <div>
                            <div className="flex flex-col md:flex-row gap-4 mb-4">
                                <div className="flex-1">
                                    <label htmlFor="chat-class" className="block text-sm font-medium mb-1">Send to Class</label>
                                    <SelectInput id="chat-class" value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} disabled={isSending}>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </SelectInput>
                                </div>
                            </div>
                            <div className="h-60 bg-bg-primary border border-border-primary rounded-lg p-4 overflow-y-auto space-y-4" ref={chatContainerRef}>
                                {filteredMessages.length > 0 ? filteredMessages.map(msg => (
                                    <div key={msg.id} className={`flex ${msg.role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`p-2 rounded-lg max-w-[80%] ${msg.role === 'admin' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-slate-700'}`}>
                                            <p className="text-xs font-bold">{msg.author}</p>
                                            <p className="text-sm">{msg.text}</p>
                                        </div>
                                    </div>
                                )) : <p className="text-center text-text-secondary pt-20">No messages sent to {selectedClassName} yet.</p>}
                            </div>
                            <form onSubmit={handleSendMessage} className="flex items-center gap-3 mt-4">
                                <TextInput type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder={`Message ${selectedClassName}...`} className="flex-grow" disabled={isSending} />
                                <button type="submit" className="btn-primary p-2.5" disabled={isSending || !newMessage.trim()}><SendIcon className="h-5 w-5"/></button>
                            </form>
                        </div>
                    </SectionCard>
                </div>
                <div className="lg:col-span-3">
                    {/* FIX: Wrapped content inside SectionCard */}
                    <SectionCard title="Campus AI Testbed">
                        <div>
                             <p className="text-sm text-text-secondary mb-4">Test the AI's responses by asking questions as if you were a student. Select a student profile to provide context for the query.</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField label="Ask as Student" htmlFor="test-student"><SelectInput id="test-student" value={testStudentId} onChange={e => setTestStudentId(e.target.value)} disabled={isTesting}>{students.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</SelectInput></FormField>
                                <div className="md:col-span-2"><FormField label="Question" htmlFor="test-question"><TextInput id="test-question" value={testQuestion} onChange={e=>setTestQuestion(e.target.value)} placeholder="e.g., When is my next Algorithms class?" disabled={isTesting}/></FormField></div>
                            </div>
                            <div className="flex justify-end mt-4">
                                <button onClick={handleTestQuery} className="btn-primary flex items-center gap-2 w-48 justify-center" disabled={isTesting}>{isTesting ? 'Querying AI...' : <><AIIcon/>Test Query</>}</button>
                            </div>
                            {testResponse && (
                                <div className="mt-6 p-4 bg-bg-primary border border-border-primary rounded-lg">
                                    <h4 className="font-semibold mb-2">AI Response:</h4>
                                    <p className="text-sm whitespace-pre-wrap">{testResponse.text}</p>
                                </div>
                            )}
                        </div>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
};

const useSmartClassroomLayout = () => {
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        if (feedback) {
            const timer = setTimeout(() => setFeedback(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [feedback]);
    
    return { feedback, setFeedback };
};


// FIX: Made children optional to handle cases where it might not be provided, preventing a TypeScript error.
const SmartClassroomLayout = (props: SmartClassroomProps & { children?: React.ReactNode }) => {
    const { feedback, setFeedback } = useSmartClassroomLayout();
    const location = useLocation();
    
    const tabs = [
        { key: 'students', label: 'Students', icon: <StudentIcon className="h-5 w-5" />, path: '/smart-classroom/students' },
        { key: 'users', label: 'Users', icon: <UsersIcon className="h-5 w-5" />, path: '/smart-classroom/users' },
        { key: 'attendance', label: 'Attendance', icon: <AttendanceIcon className="h-5 w-5" />, path: '/smart-classroom/attendance' },
        { key: 'chat', label: 'Chat Control', icon: <ChatIcon className="h-5 w-5" />, path: '/smart-classroom/chat' },
        { key: 'ims', label: 'IMS', icon: <IMSIcon className="h-5 w-5" />, path: '/smart-classroom/ims'},
        { key: 'calendar', label: 'Calendar', icon: <CalendarIcon className="h-5 w-5" />, path: '/smart-classroom/calendar' },
        { key: 'meetings', label: 'Meetings', icon: <MeetingIcon className="h-5 w-5" />, path: '/smart-classroom/meetings' },
        { key: 'query-management', label: 'Queries', icon: <QueryIcon className="h-5 w-5" />, path: '/smart-classroom/query-management'},
        { key: 'notification-center', label: 'Notifications', icon: <NotificationBellIcon className="h-5 w-5" />, path: '/smart-classroom/notification-center'},
        { key: 'profile', label: 'My Profile', icon: <ProfileIcon className="h-5 w-5" />, path: '/smart-classroom/profile' },
    ];
    
    return (
        <div className="min-h-screen">
            <FeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Smart Classroom</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage students, users, attendance, and classroom settings.</p>
                </div>
            </header>
            <nav className="bg-white dark:bg-slate-800 border dark:border-slate-700 p-2 rounded-xl flex flex-wrap gap-2 mb-8 overflow-x-auto">
                {tabs.map(tab => (
                    <NavLink key={tab.key} to={tab.path}
                        className={({ isActive }) => `flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors whitespace-nowrap ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'}`}
                    >
                        {tab.icon}{tab.label}
                    </NavLink>
                ))}
            </nav>
            <main className="space-y-6">
                 <Outlet context={{...props, feedback, setFeedback}} />
            </main>
        </div>
    );
};

export default SmartClassroomLayout;