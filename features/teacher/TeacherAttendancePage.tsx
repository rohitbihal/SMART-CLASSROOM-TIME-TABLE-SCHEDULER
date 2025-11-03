import React, { useState, useEffect, useMemo } from 'react';
import { SectionCard, SelectInput, TextInput, FeedbackBanner } from '../../components/common';
import { useAppContext } from '../../context/AppContext';
import { AttendanceStatus, AttendanceRecord } from '../../types';
import { SaveIcon } from '../../components/Icons';

const TeacherAttendancePage = () => {
    const { user, faculty, subjects, classes, students, attendance, handleSaveClassAttendance } = useAppContext();
    
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const teacherProfile = useMemo(() => faculty.find(f => f.id === user?.profileId), [faculty, user]);

    const teacherClasses = useMemo(() => {
        if (!teacherProfile) return [];
        const assignedClassNames = new Set(subjects.filter(s => s.assignedFacultyId === teacherProfile.id).map(s => s.forClass));
        return classes.filter(c => assignedClassNames.has(c.name));
    }, [teacherProfile, subjects, classes]);

    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [currentRecords, setCurrentRecords] = useState<AttendanceRecord>({});

    const studentsInClass = useMemo(() => students.filter(s => s.classId === selectedClassId).sort((a,b) => (a.roll || '').localeCompare(b.roll || '')), [students, selectedClassId]);
    
    useEffect(() => {
        if (teacherClasses.length > 0) {
            // If the currently selected class is not in the list of available classes
            // (e.g. after a data refresh), or if no class is selected yet,
            // default to the first available class.
            if (!teacherClasses.some(c => c.id === selectedClassId)) {
                setSelectedClassId(teacherClasses[0].id);
            }
        } else {
            // If there are no classes, clear the selection
            setSelectedClassId('');
        }
    }, [teacherClasses, selectedClassId]);


    useEffect(() => {
        const existingRecords = attendance[selectedClassId]?.[selectedDate] || {};
        const initialRecords = studentsInClass.reduce((acc, student) => {
            acc[student.id] = existingRecords[student.id] || 'unmarked';
            return acc;
        }, {} as AttendanceRecord);
        setCurrentRecords(initialRecords);
    }, [selectedClassId, selectedDate, attendance, studentsInClass]);
    
    useEffect(() => {
        if (feedback) {
            const timer = setTimeout(() => setFeedback(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [feedback]);


    const handleStatusChange = (studentId: string, status: 'present' | 'absent') => {
        const currentStatus = currentRecords[studentId];
        if (String(currentStatus).endsWith('_locked')) {
            setFeedback({ type: 'error', message: 'This record is locked by an administrator.' });
            return;
        }
        setCurrentRecords(prev => ({ ...prev, [studentId]: status }));
    };
    
    const handleSave = async () => {
        setIsLoading(true);
        setFeedback(null);
        try {
            await handleSaveClassAttendance(selectedClassId, selectedDate, currentRecords);
            setFeedback({ type: 'success', message: 'Attendance saved successfully!' });
        } catch (err) {
            setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save attendance.' });
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

    const getStatusInfo = (status: AttendanceStatus) => {
        if (status === 'present_locked') return { text: 'Present (Locked)', color: 'text-green-600 dark:text-green-400' };
        if (status === 'absent_locked') return { text: 'Absent (Locked)', color: 'text-red-600 dark:text-red-400' };
        if (status === 'present_suggested') return { text: 'Suggested Present', color: 'text-yellow-600 dark:text-yellow-400' };
        return { text: '', color: '' };
    };

    return (
        <SectionCard title={`Attendance for ${teacherProfile?.name || 'Teacher'}`}>
            <FeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />
            <div className="p-4">
                 <p className="text-text-secondary mb-4">Select a class and date to mark attendance. Records locked by an admin cannot be changed.</p>
                
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <SelectInput value={selectedClassId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedClassId(e.target.value)} disabled={isLoading}>
                        <option value="">Select a Class...</option>
                        {teacherClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </SelectInput>
                    <TextInput type="date" value={selectedDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)} disabled={isLoading} />
                </div>
                
                <div className="bg-bg-primary p-4 rounded-lg mb-4 flex flex-wrap justify-between items-center gap-4 text-sm">
                    <div className="flex gap-4 font-medium">
                        <span>Total: {summary.total}</span>
                        <span className="text-green-600 dark:text-green-400">Present: {summary.present}</span>
                        <span className="text-red-600 dark:text-red-400">Absent: {summary.absent}</span>
                        <span className="text-gray-500 dark:text-gray-400">Unmarked: {summary.unmarked}</span>
                    </div>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {studentsInClass.map(student => {
                        const status = currentRecords[student.id];
                        const isLocked = String(status).endsWith('_locked');
                        const statusInfo = getStatusInfo(status);
                        return (
                            <div key={student.id} className="flex justify-between items-center p-3 bg-bg-tertiary rounded-lg">
                                <div>
                                    <p className="font-semibold">{student.name}</p>
                                    {statusInfo.text && <p className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.text}</p>}
                                </div>
                                <div className="flex gap-2">
                                     <button onClick={() => handleStatusChange(student.id, 'present')} className={`px-4 py-1.5 text-sm font-bold rounded-md ${status === 'present' || status === 'present_suggested' ? 'bg-green-600 text-white' : 'bg-gray-300 dark:bg-slate-600'}`} disabled={isLoading || isLocked}>P</button>
                                     <button onClick={() => handleStatusChange(student.id, 'absent')} className={`px-4 py-1.5 text-sm font-bold rounded-md ${status === 'absent' ? 'bg-red-600 text-white' : 'bg-gray-300 dark:bg-slate-600'}`} disabled={isLoading || isLocked}>A</button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-end mt-6">
                    <button onClick={handleSave} className="btn-primary flex items-center gap-2 w-48 justify-center" disabled={isLoading || !selectedClassId}>
                        <SaveIcon />
                        {isLoading ? 'Saving...' : 'Save Attendance'}
                    </button>
                </div>
            </div>
        </SectionCard>
    );
};

export default TeacherAttendancePage;