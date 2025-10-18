import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate, NavLink, useLocation, Outlet } from 'react-router-dom';
import { LoginPage } from './features/auth/LoginPage';
import { Dashboard } from './features/dashboard/Dashboard';
import { TimetableGrid } from './features/dashboard/TimetableGrid';
import { PlaceholderContent } from './features/dashboard/PlaceholderContent';
import { ModuleSelectionPage } from './features/dashboard/ModuleSelectionPage';
import { SmartClassroom } from './features/classroom/SmartClassroom';
import { TimetableScheduler } from './features/scheduler/TimetableScheduler';
import { LoadingIcon, LogoutIcon, MoonIcon, SunIcon, ProfileIcon, SchedulerIcon, StudentIcon, HomeIcon, AttendanceIcon, IMSIcon, SmartToolsIcon, AvailabilityIcon, RequestsIcon, NotificationsIcon, ChatIcon, GradebookIcon, QuizzesIcon, AnalyticsIcon, MeetingIcon, TutorialsIcon, SendIcon, EditIcon, SearchIcon } from './components/Icons';
import { ChatMessage, Class, Constraints, Faculty, Room, Subject, Student, Attendance, User, AttendanceStatus, TimetableEntry, TeacherRequest, FacultyPreference } from './types';
import { DAYS, TIME_SLOTS } from './constants';

const API_BASE_URL = '/api';

// --- START: REUSABLE HELPER COMPONENTS ---

export const ErrorDisplay = ({ message }: { message: string | null }) => !message ? null : <div className="bg-red-500/10 dark:bg-red-900/50 border border-red-500/50 text-red-700 dark:text-red-300 p-3 rounded-lg text-sm my-2 font-medium" role="alert">{message}</div>;

export const FeedbackBanner = ({ feedback, onDismiss }: { feedback: { type: 'success' | 'error', message: string } | null; onDismiss: () => void; }) => {
    if (!feedback) return null;
    const isSuccess = feedback.type === 'success';
    const baseClasses = "fixed top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md p-4 rounded-xl border-2 shadow-lg transition-all duration-300";
    const colorClasses = isSuccess
        ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300'
        : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300';

    return (
        <div className={`${baseClasses} ${colorClasses}`} role="alert">
            <div className="flex items-center justify-between">
                <span className="font-semibold">{feedback.message}</span>
                <button onClick={onDismiss} className="text-xl font-bold opacity-70 hover:opacity-100">&times;</button>
            </div>
        </div>
    );
};

export const Modal = ({ isOpen, onClose, title, children = null, error = null, size = 'md' }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode; error?: string | null; size?: 'md' | '4xl' }) => {
    if (!isOpen) return null;
    const sizeClass = size === '4xl' ? 'max-w-4xl' : 'max-w-md';
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full ${sizeClass} max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700`}>
                <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold">{title}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <ErrorDisplay message={error} />
                    {children}
                </div>
            </div>
        </div>
    );
};

export const SearchInput = ({ value, onChange, placeholder, label, id }: { value: string; onChange: (v: string) => void; placeholder?: string; label: string; id: string; }) => (
    <div className="relative mb-4">
        <label htmlFor={id} className="sr-only">{label}</label>
        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input type="text" id={id} name={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || "Search..."} className="w-full p-2.5 pl-11 border dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
    </div>
);

export const SectionCard = ({ title, children, actions, className }: { title: string; children?: React.ReactNode; actions?: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 p-6 rounded-2xl shadow-sm transition-all hover:shadow-md ${className || ''}`}>
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
            <h3 className="text-xl font-bold">{title}</h3>
            {actions && <div>{actions}</div>}
        </div>
        {children}
    </div>
);
export const FormField = ({ label, children = null, htmlFor }: { label: string, children?: React.ReactNode, htmlFor: string }) => (
    <div className="mb-4">
        <label htmlFor={htmlFor} className="block text-sm font-medium mb-1.5 text-slate-600 dark:text-slate-300">{label}</label>
        {children}
    </div>
);

export const TextInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} className={"w-full p-2.5 border dark:border-slate-300 bg-slate-50 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow " + (props.className || '')} />;
export const SelectInput = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} className="w-full p-2.5 border dark:border-slate-600 bg-slate-50 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow" />;
export const TextareaInput = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} rows={3} className="w-full p-2.5 border dark:border-slate-600 bg-slate-50 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow" />;

// --- END: REUSABLE HELPER COMPONENTS ---


// --- START: NEW TEACHER FEATURE PAGES ---
const IMSPage = () => {
    const [activeTab, setActiveTab] = useState('grades');
    return (
        <SectionCard title="Information Management System (IMS)">
            <div className="flex gap-2 border-b dark:border-slate-700 mb-4">
                <button onClick={() => setActiveTab('grades')} className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${activeTab === 'grades' ? 'bg-indigo-100 dark:bg-slate-700/50 border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Upload Grades</button>
                <button onClick={() => setActiveTab('assignments')} className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${activeTab === 'assignments' ? 'bg-indigo-100 dark:bg-slate-700/50 border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Manage Assignments</button>
                <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${activeTab === 'analytics' ? 'bg-indigo-100 dark:bg-slate-700/50 border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Performance Analytics</button>
            </div>
            {activeTab === 'grades' && <PlaceholderContent title="Upload Grades" message="This feature for uploading student grades is under development." icon={<GradebookIcon />} />}
            {activeTab === 'assignments' && <PlaceholderContent title="Manage Assignments" message="This feature for creating and managing assignments is under development." icon={<QuizzesIcon />} />}
            {activeTab === 'analytics' && <PlaceholderContent title="Performance Analytics" message="This feature for viewing student performance analytics is under development." icon={<AnalyticsIcon />} />}
        </SectionCard>
    );
};

const SmartToolsPage = () => {
    const tools = [
        { title: "Digital Whiteboard", icon: <EditIcon /> },
        { title: "Join Live Class", icon: <MeetingIcon /> },
        { title: "Smart Notes", icon: <IMSIcon /> },
        { title: "Recordings", icon: <TutorialsIcon /> },
        { title: "Upload Lesson Plan", icon: <SchedulerIcon /> },
        { title: "Create Quiz", icon: <QuizzesIcon /> },
    ];
    return (
        <SectionCard title="Smart Tools">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tools.map(tool => (
                    <div key={tool.title} className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl text-center border dark:border-slate-200 dark:border-slate-700 transition-transform hover:-translate-y-1">
                        <div className="mx-auto h-12 w-12 flex items-center justify-center bg-indigo-100 dark:bg-slate-700 rounded-full mb-3 text-indigo-500">{tool.icon}</div>
                        <h4 className="font-semibold text-lg">{tool.title}</h4>
                        <button className="text-sm mt-4 bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">Launch Tool</button>
                    </div>
                ))}
            </div>
        </SectionCard>
    );
};

const AvailabilityPage = ({ facultyProfile, constraints, onUpdateConstraints }: { facultyProfile: Faculty; constraints: Constraints | null; onUpdateConstraints: (c: Constraints) => void; }) => {
    if (!constraints || !facultyProfile) return <LoadingIcon />;

    const facultyId = facultyProfile.id;
    const currentPref = constraints.facultyPreferences?.find(p => p.facultyId === facultyId) || { facultyId };

    const handlePrefChange = (newPrefData: Partial<FacultyPreference>) => {
        const newPrefs = [...(constraints.facultyPreferences || [])];
        let prefIndex = newPrefs.findIndex(p => p.facultyId === facultyId);
        
        const updatedPref = { ...currentPref, ...newPrefData };

        if (prefIndex === -1) {
            newPrefs.push(updatedPref as FacultyPreference);
        } else {
            newPrefs[prefIndex] = updatedPref as FacultyPreference;
        }
        onUpdateConstraints({ ...constraints, facultyPreferences: newPrefs });
    };

    const handleUnavailabilityToggle = (day: string, timeSlot: string) => {
        const currentUnavailability = currentPref.unavailability || [];
        const slotExists = currentUnavailability.some(slot => slot.day === day && slot.timeSlot === timeSlot);
        const newUnavailability = slotExists
            ? currentUnavailability.filter(slot => !(slot.day === day && slot.timeSlot === timeSlot))
            : [...currentUnavailability, { day, timeSlot }];
        handlePrefChange({ unavailability: newUnavailability });
    };

    const unavailabilitySet = new Set((currentPref.unavailability || []).map(s => `${s.day}:${s.timeSlot}`));

    return (
        <SectionCard title="Set Your Availability">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Click on a time slot to mark it as unavailable (red). The admin will see this when creating timetables. Changes are saved automatically.</p>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs table-fixed">
                    <thead>
                        <tr>
                            <th className="p-2 border dark:border-slate-600 bg-slate-100 dark:bg-slate-700/50 w-24 font-semibold">Time</th>
                            {DAYS.map(day => <th key={day} className="p-2 border dark:border-slate-600 bg-slate-100 dark:bg-slate-700/50 font-semibold capitalize">{day.substring(0, 3)}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {TIME_SLOTS.map(time => (
                            <tr key={time}>
                                <td className="p-2 border dark:border-slate-600 font-medium whitespace-nowrap text-center">{time}</td>
                                {DAYS.map(day => {
                                    const isUnavailable = unavailabilitySet.has(`${day}:${time}`);
                                    return (
                                        <td
                                            key={`${day}-${time}`}
                                            onClick={() => handleUnavailabilityToggle(day, time)}
                                            className={`p-2 border dark:border-slate-700 text-center cursor-pointer transition-colors ${isUnavailable ? 'bg-red-500/80 hover:bg-red-600' : 'bg-green-500/20 hover:bg-green-500/40'}`}
                                            title={isUnavailable ? "Mark as available" : "Mark as unavailable"}
                                        ></td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </SectionCard>
    );
};

const RequestsPage = () => {
    const [requestHistory, setRequestHistory] = useState<TeacherRequest[]>([]);
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <SectionCard title="Submit a New Request">
                 <form className="space-y-4" onSubmit={e => {e.preventDefault(); alert("Request submitted (demo).")}}>
                    <FormField label="Request Type" htmlFor="requestType">
                        <SelectInput id="requestType" name="requestType">
                            <option>Schedule Change</option>
                            <option>Leave Request</option>
                            <option>Resource Request</option>
                            <option>Other</option>
                        </SelectInput>
                    </FormField>
                    <FormField label="Subject (if applicable)" htmlFor="requestSubject">
                        <SelectInput id="requestSubject" name="requestSubject"><option>Select a subject...</option></SelectInput>
                    </FormField>
                    <FormField label="Details of Requested Change" htmlFor="requestDetails">
                        <TextareaInput id="requestDetails" name="requestDetails" placeholder="e.g., Please move CS101 from Monday 9am to Friday 2pm." />
                    </FormField>
                    <FormField label="Reason" htmlFor="requestReason">
                        <TextareaInput id="requestReason" name="requestReason" placeholder="e.g., Due to a clashing appointment." />
                    </FormField>
                    <button type="submit" className="w-full bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors">Submit Request</button>
                </form>
            </SectionCard>
            <SectionCard title="Request History">
                {requestHistory.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">You have not submitted any requests.</p>
                ) : (
                    <div>{/* History table would go here */}</div>
                )}
            </SectionCard>
        </div>
    );
};

const NotificationsPage = () => {
    return (
        <SectionCard title="Notifications">
             <p className="text-slate-500 text-center py-8">No new notifications.</p>
        </SectionCard>
    );
};

const TeacherAttendancePage = ({ classes, students, attendance, onSaveClassAttendance }: { classes: Class[], students: Student[], attendance: Attendance, onSaveClassAttendance: (classId: string, date: string, records: { [studentId: string]: AttendanceStatus; }) => Promise<void> }) => {
    const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [currentRecords, setCurrentRecords] = useState<{ [studentId: string]: AttendanceStatus }>({});
    const [isLoading, setIsLoading] = useState(false);

    const studentsInClass = useMemo(() => students.filter(s => s.classId === selectedClassId), [students, selectedClassId]);

    useEffect(() => {
        const existingRecords = attendance[selectedClassId]?.[selectedDate] || {};
        const initialRecords = studentsInClass.reduce((acc, student) => {
            acc[student.id] = existingRecords[student.id] || 'absent';
            return acc;
        }, {} as { [studentId: string]: AttendanceStatus });
        setCurrentRecords(initialRecords);
    }, [selectedClassId, selectedDate, attendance, studentsInClass]);

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setCurrentRecords(prev => ({ ...prev, [studentId]: status }));
    };

    const handleMarkAll = (status: AttendanceStatus) => {
        const newRecords = studentsInClass.reduce((acc, student) => {
            acc[student.id] = status;
            return acc;
        }, {} as { [studentId: string]: AttendanceStatus });
        setCurrentRecords(newRecords);
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await onSaveClassAttendance(selectedClassId, selectedDate, currentRecords);
            alert(`Attendance for ${selectedDate} saved successfully!`);
        } catch (err) {
            alert(`Failed to save attendance: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
            <div className="flex flex-col md:flex-row gap-4 mb-6 pb-6 border-b dark:border-slate-700">
                <div className="flex-1">
                    <label htmlFor="teacher-attendance-class" className="block text-sm font-medium mb-1.5">Select Class</label>
                    <SelectInput id="teacher-attendance-class" name="teacher-attendance-class" value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} disabled={isLoading}>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </SelectInput>
                </div>
                <div className="flex-1">
                    <label htmlFor="teacher-attendance-date" className="block text-sm font-medium mb-1.5">Select Date</label>
                    <TextInput type="date" id="teacher-attendance-date" name="teacher-attendance-date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} disabled={isLoading} />
                </div>
                <div className="flex-1">
                     <label className="block text-sm font-medium mb-1.5">View Reports</label>
                     <button className="w-full bg-slate-200 dark:bg-slate-700 font-semibold p-2.5 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Generate Report</button>
                </div>
            </div>
             <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl mb-4 flex flex-wrap justify-between items-center gap-4">
                <div className="flex gap-4 font-medium">
                    <span>Total: {summary.total}</span>
                    <span className="text-green-600 dark:text-green-400">Present: {summary.present}</span>
                    <span className="text-red-600 dark:text-red-400">Absent: {summary.absent}</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handleMarkAll('present')} className="text-sm bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 font-semibold px-3 py-1.5 rounded-lg" disabled={isLoading}>Mark All Present</button>
                    <button onClick={() => handleMarkAll('absent')} className="text-sm bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 font-semibold px-3 py-1.5 rounded-lg" disabled={isLoading}>Mark All Absent</button>
                </div>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {studentsInClass.length > 0 ? studentsInClass.map(student => (
                    <div key={student.id} className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-900/50 rounded-xl">
                        <div>
                            <p className="font-semibold">{student.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Roll: {student.roll || 'N/A'}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleStatusChange(student.id, 'present')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${currentRecords[student.id] === 'present' ? 'bg-green-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`} disabled={isLoading}>P</button>
                            <button onClick={() => handleStatusChange(student.id, 'absent')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${currentRecords[student.id] === 'absent' ? 'bg-red-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}`} disabled={isLoading}>A</button>
                        </div>
                    </div>
                )) : <p className="text-center text-slate-500 p-4">No students in this class.</p>}
            </div>
             <div className="flex justify-end mt-6">
                <button onClick={handleSave} className="bg-indigo-600 text-white font-semibold py-2.5 px-6 rounded-lg disabled:opacity-50 hover:bg-indigo-700 transition-colors" disabled={isLoading || studentsInClass.length === 0}>{isLoading ? "Saving..." : "Save Attendance"}</button>
            </div>
        </SectionCard>
    );
};

const TeacherChatPage = ({ user, classes, students, facultyProfile }: { user: User; classes: Class[]; students: Student[]; facultyProfile: Faculty | undefined; }) => {
    const teacherClasses = useMemo(() => {
        // This is a simplification. A real app would link subjects to classes to teachers.
        // Here we assume a teacher teaches all classes in their department.
        if (!facultyProfile) return [];
        return classes.filter(c => c.branch === facultyProfile.department);
    }, [classes, facultyProfile]);

    const [selectedChat, setSelectedChat] = useState<{ type: 'class' | 'student'; id: string; name: string; } | null>(null);
    const [message, setMessage] = useState('');

    const studentsInSelectedClass = useMemo(() => {
        if (!selectedChat || selectedChat.type !== 'class') return [];
        return students.filter(s => s.classId === selectedChat.id);
    }, [students, selectedChat]);
    
    return (
        <SectionCard title="Campus Chat" className="flex flex-col md:flex-row gap-0 p-0 overflow-hidden h-[80vh]">
            <div className="w-full md:w-1/3 border-r dark:border-slate-700 flex flex-col">
                <h4 className="p-4 font-bold border-b dark:border-slate-700 text-lg">Conversations</h4>
                <div className="flex-grow overflow-y-auto">
                    {teacherClasses.map(c => (
                        <div key={c.id}>
                            <div onClick={() => setSelectedChat({ type: 'class', id: c.id, name: `${c.name} Group`})} className={`p-4 cursor-pointer font-semibold border-b dark:border-slate-700/50 ${selectedChat?.id === c.id && selectedChat.type === 'class' ? 'bg-indigo-100 dark:bg-slate-700' : 'hover:bg-slate-100 dark:hover:bg-slate-900/50'}`}>{c.name} (Group)</div>
                            {students.filter(s => s.classId === c.id).map(s => (
                                <div key={s.id} onClick={() => setSelectedChat({ type: 'student', id: s.id, name: s.name})} className={`pl-8 p-3 text-sm cursor-pointer border-b dark:border-slate-700/50 ${selectedChat?.id === s.id && selectedChat.type === 'student' ? 'bg-indigo-100 dark:bg-slate-700' : 'hover:bg-slate-100 dark:hover:bg-slate-900/50'}`}>{s.name}</div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            <div className="w-full md:w-2/3 flex flex-col">
                {selectedChat ? (
                    <>
                        <div className="p-4 border-b dark:border-slate-700 font-bold text-lg">{selectedChat.name}</div>
                        <div className="flex-grow p-6">
                            {/* Chat messages would go here */}
                            <p className="text-center text-slate-500">No messages yet.</p>
                        </div>
                        <div className="p-4 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                             <form className="flex items-center gap-3">
                                <label htmlFor="chat-message" className="sr-only">Type your message</label>
                                <TextInput name="chat-message" id="chat-message" value={message} onChange={e => setMessage(e.target.value)} placeholder="Type your message..." />
                                <button type="submit" className="bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition-colors"><SendIcon /></button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-grow flex items-center justify-center text-slate-500">Select a class or student to start chatting.</div>
                )}
            </div>
        </SectionCard>
    );
};

// --- END: NEW TEACHER FEATURE PAGES ---

const FullScreenLoader = ({ message }: { message: string }) => (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center z-50">
        <LoadingIcon />
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 font-medium">{message}</p>
    </div>
);

const fetchWithAuth = async (url: string, options: RequestInit = {}, token: string | null) => {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
        sessionStorage.clear();
        window.location.hash = '/login';
        throw new Error('Session expired. Please log in again.');
    }
    return response;
};

const handleApiError = async (response: Response) => {
    let errorMsg = `Server responded with status: ${response.status}`;
    try {
        const errorData = await response.json();
        errorMsg = errorData.message || 'The server returned an unspecified error.';
    } catch {}
    throw new Error(errorMsg);
};

// --- START: NEW LAYOUT COMPONENTS ---

const NavItem = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string; }) => (
    <NavLink
        to={to}
        end={to === '/'} // `end` should be true only for the root path
        className={({ isActive }: { isActive: boolean }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/50'
            }`
        }
    >
        {icon}
        <span className="flex-1">{label}</span>
    </NavLink>
);

const Sidebar = ({ user, onLogout, theme, toggleTheme }: { user: User; onLogout: () => void; theme: string; toggleTheme: () => void; }) => {
    const adminNavLinks = [
        { to: '/', icon: <HomeIcon className="h-5 w-5" />, label: 'Dashboard' },
        { to: '/scheduler', icon: <SchedulerIcon className="h-5 w-5" />, label: 'Timetable Scheduler' },
        { to: '/smart-classroom', icon: <StudentIcon className="h-5 w-5" />, label: 'Smart Classroom' },
    ];

    const teacherNavLinks = [
        { to: '/', icon: <SchedulerIcon className="h-5 w-5" />, label: 'My Timetable' },
        { to: '/attendance', icon: <AttendanceIcon className="h-5 w-5" />, label: 'Attendance' },
        { to: '/ims', icon: <IMSIcon className="h-5 w-5" />, label: 'IMS' },
        { to: '/smart-tools', icon: <SmartToolsIcon className="h-5 w-5" />, label: 'Smart Tools' },
        { to: '/availability', icon: <AvailabilityIcon className="h-5 w-5" />, label: 'Availability' },
        { to: '/requests', icon: <RequestsIcon className="h-5 w-5" />, label: 'Requests' },
        { to: '/notifications', icon: <NotificationsIcon className="h-5 w-5" />, label: 'Notifications' },
        { to: '/chat', icon: <ChatIcon className="h-5 w-5" />, label: 'Chat' },
    ];

    const navLinks = user.role === 'admin' ? adminNavLinks : teacherNavLinks;

    return (
        <aside className="w-64 flex-shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col p-4">
            <div className="flex items-center gap-3 mb-10 p-2">
                <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center ring-4 ring-indigo-200 dark:ring-indigo-700/50">
                    <ProfileIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
                </div>
                <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100 capitalize">{user.role}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{user.username}</p>
                </div>
            </div>
            <nav className="flex-grow space-y-2.5">
                {navLinks.map(link => <NavItem key={link.to} {...link} />)}
            </nav>
            <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                 <button onClick={toggleTheme} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-semibold p-2.5 rounded-lg flex items-center gap-2 transition-colors">{theme === 'dark' ? <SunIcon /> : <MoonIcon />}</button>
                 <button onClick={onLogout} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"><LogoutIcon /> Logout</button>
            </div>
        </aside>
    );
};

const AppLayout = ({ user, onLogout, theme, toggleTheme, children }: { user: User; onLogout: () => void; theme: string; toggleTheme: () => void; children: React.ReactNode; }) => {
    return (
        <div className="flex h-screen">
            <Sidebar user={user} onLogout={onLogout} theme={theme} toggleTheme={toggleTheme} />
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
};
// --- END: NEW LAYOUT COMPONENTS ---

// --- START: MODIFIED TEACHER DASHBOARD ---
const TeacherDashboardLayout = (props: {
    user: User;
    faculty: Faculty[];
}) => {
    const { user, faculty } = props;

    const facultyProfile = useMemo(() => faculty.find(f => f.id === user.profileId), [faculty, user.profileId]);

    if (!facultyProfile) {
        return <div className="p-8">Could not find teacher profile.</div>;
    }
    const subtitle = `Welcome back, ${facultyProfile.name} | ${facultyProfile.department} Department`;
    
    return (
        <div className="p-6 sm:p-8 lg:p-10">
            <div className="mb-8">
                <h1 className="text-4xl font-extrabold text-slate-800 dark:text-slate-100">Teacher Portal</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">{subtitle}</p>
            </div>
            <Outlet />
        </div>
    );
};

// --- END: MODIFIED TEACHER DASHBOARD ---


export const App = () => {
    const [user, setUser] = useState<User | null>(() => { try { const u = sessionStorage.getItem('user'); return u ? JSON.parse(u) : null; } catch { return null; } });
    const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('token'));
    const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'dark');
    const [appState, setAppState] = useState<'loading' | 'ready' | 'error'>('loading');

    const [classes, setClasses] = useState<Class[]>([]);
    const [faculty, setFaculty] = useState<Faculty[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [constraints, setConstraints] = useState<Constraints | null>(null);
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    const [attendance, setAttendance] = useState<Attendance>({});
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    
    useEffect(() => {
        const fetchData = async () => {
            if (!token) { setAppState('ready'); return; }
            try {
                const response = await fetchWithAuth(`${API_BASE_URL}/all-data`, {}, token);
                if (!response.ok) await handleApiError(response);
                const data = await response.json();
                setClasses(data.classes || []);
                setFaculty(data.faculty || []);
                setSubjects(data.subjects || []);
                setRooms(data.rooms || []);
                setStudents(data.students || []);
                setConstraints(data.constraints || null);
                setTimetable(data.timetable || []);
                setAttendance(data.attendance || {});
                setChatMessages(data.chatMessages || []);
                if (data.users) setUsers(data.users);
            } catch (error) {
                console.error("Failed to fetch initial data:", error);
                // Optionally handle specific errors, e.g., redirect on auth failure
            } finally {
                setAppState('ready');
            }
        };
        fetchData();
    }, [token]);

    useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); localStorage.setItem('app_theme', theme); }, [theme]);
    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

    const handleLogin = (loggedInUser: User, authToken: string) => {
        setUser(loggedInUser);
        setToken(authToken);
        sessionStorage.setItem('user', JSON.stringify(loggedInUser));
        sessionStorage.setItem('token', authToken);
        setAppState('loading'); // Trigger data refetch
    };

    const handleLogout = () => {
        setUser(null); setToken(null); setUsers([]); sessionStorage.clear();
    };

    const handleSaveEntity = async (type: 'class' | 'faculty' | 'subject' | 'room' | 'student', data: any) => {
        const isAdding = !data.id;
        const url = isAdding ? `${API_BASE_URL}/${type}` : `${API_BASE_URL}/${type}/${data.id}`;
        const method = isAdding ? 'POST' : 'PUT';
        
        const payload = { ...data };
        if (isAdding) {
            delete payload.id; // Let the server generate the ID for new entities.
        }

        const response = await fetchWithAuth(url, { method, body: JSON.stringify(payload) }, token);
        if (!response.ok) await handleApiError(response);
        const savedItem = await response.json();
        const setter = { class: setClasses, faculty: setFaculty, subject: setSubjects, room: setRooms, student: setStudents }[type] as React.Dispatch<React.SetStateAction<any[]>>;
        setter(prev => isAdding ? [...prev, savedItem] : prev.map(item => item.id === savedItem.id ? savedItem : item));
    };

    const handleDeleteEntity = async (type: 'class' | 'faculty' | 'subject' | 'room' | 'student', id: string) => {
        const response = await fetchWithAuth(`${API_BASE_URL}/${type}/${id}`, { method: 'DELETE' }, token);
        if (!response.ok) await handleApiError(response);
        const setter = { class: setClasses, faculty: setFaculty, subject: setSubjects, room: setRooms, student: setStudents }[type] as React.Dispatch<React.SetStateAction<any[]>>;
        setter(prev => prev.filter(item => item.id !== id));
    };
    
    const handleUpdateConstraints = async (newConstraints: Constraints) => {
        setConstraints(newConstraints); // Optimistic update
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/constraints`, { method: 'PUT', body: JSON.stringify(newConstraints) }, token);
            if (!response.ok) await handleApiError(response);
        } catch (error) {
            console.error("Failed to save constraints:", error); // Optionally revert state and show error
        }
    };
    
    const handleSaveTimetable = async (newTimetable: TimetableEntry[]) => {
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/timetable`, { method: 'POST', body: JSON.stringify(newTimetable) }, token);
            if (!response.ok) await handleApiError(response);
            setTimetable(newTimetable);
        } catch (error) {
            console.error("Failed to save timetable:", error);
            throw error; // Re-throw to be caught in the UI
        }
    };

    const handleUpdateAttendance = async (classId: string, date: string, studentId: string, status: AttendanceStatus) => {
        setAttendance(prev => ({ ...prev, [classId]: { ...(prev[classId] || {}), [date]: { ...((prev[classId] && prev[classId][date]) || {}), [studentId]: status } } }));
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/attendance`, { method: 'PUT', body: JSON.stringify({ classId, date, studentId, status }) }, token);
            if (!response.ok) await handleApiError(response); // Optionally revert on error
        } catch (error) { console.error("Failed to update attendance:", error); }
    };

    const handleSaveClassAttendance = async (classId: string, date: string, records: { [studentId: string]: AttendanceStatus }) => {
        setAttendance(prev => {
            const newAttendance = { ...prev };
            if (!newAttendance[classId]) newAttendance[classId] = {};
            newAttendance[classId][date] = records;
            return newAttendance;
        });
        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/attendance/class`, { method: 'PUT', body: JSON.stringify({ classId, date, records }) }, token);
            if (!response.ok) await handleApiError(response); // Optionally revert state on error
        } catch (error) { console.error("Failed to save class attendance:", error); }
    };

    const handleSendMessage = async (messageText: string, classId: string) => {
        if (!user) return;
        // Optimistic update
        const userMessage: ChatMessage = {
            id: `user-msg-${Date.now()}`,
            channel: 'query',
            author: user.username,
            role: user.role,
            text: messageText,
            timestamp: Date.now(),
            classId: classId,
        };
        setChatMessages(prev => [...prev, userMessage]);

        try {
            const response = await fetchWithAuth(`${API_BASE_URL}/chat/ask`, {
                method: 'POST',
                body: JSON.stringify({ messageText, classId })
            }, token);
            if (!response.ok) throw await handleApiError(response);
            const aiMessage = await response.json();
            setChatMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error("Failed to send message:", error);
            const errorMessage: ChatMessage = {
                id: `err-msg-${Date.now()}`,
                channel: 'query',
                author: 'System',
                role: 'admin',
                text: "Sorry, I couldn't connect to the AI assistant. Please try again later.",
                timestamp: Date.now(),
                classId: classId,
            };
            // Revert optimistic update on error and show system message
            setChatMessages(prev => [...prev.slice(0, -1), errorMessage]);
        }
    };
    
    const handleResetData = async () => {
        setAppState('loading');
        try {
            await fetchWithAuth(`${API_BASE_URL}/reset-data`, { method: 'POST' }, token);
            // Re-fetch all data to ensure UI consistency
            const response = await fetchWithAuth(`${API_BASE_URL}/all-data`, {}, token);
            if (!response.ok) await handleApiError(response);
            const data = await response.json();
            setClasses(data.classes || []); setFaculty(data.faculty || []); setSubjects(data.subjects || []);
            setRooms(data.rooms || []); setStudents(data.students || []); setConstraints(data.constraints || null);
            setTimetable(data.timetable || []); setAttendance(data.attendance || {});
            if (data.users) setUsers(data.users);
        } finally {
            setAppState('ready');
        }
    };
    
    const handleSaveUser = async (userData: any) => {
      const isAdding = !userData._id;
      const url = isAdding ? `${API_BASE_URL}/users` : `${API_BASE_URL}/users/${userData._id}`;
      const method = isAdding ? 'POST' : 'PUT';

      const bodyData = { ...userData };
      if (!isAdding) delete bodyData._id;

      const response = await fetchWithAuth(url, { method, body: JSON.stringify(bodyData) }, token);
      if (!response.ok) await handleApiError(response);
      const savedUser = await response.json();
      setUsers(prev => isAdding ? [...prev, savedUser] : prev.map(u => u._id === savedUser._id ? savedUser : u));
    };
    const handleDeleteUser = async (userId: string) => {
      const response = await fetchWithAuth(`${API_BASE_URL}/users/${userId}`, { method: 'DELETE' }, token);
      if (!response.ok) await handleApiError(response);
      setUsers(prev => prev.filter(u => u._id !== userId));
    };

    if (appState === 'loading') {
        return <FullScreenLoader message="Loading Campus Data..." />;
    }

    if (!user) {
        return (
            <HashRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
                    <Route path="*" element={<Navigate to="/login" />} />
                </Routes>
            </HashRouter>
        );
    }
    
    if (user.role === 'student') {
        const studentDashboardProps = {
            user, onLogout: handleLogout, theme, toggleTheme,
            classes, faculty, subjects, students, users,
            constraints, timetable, attendance, token,
            onUpdateAttendance: handleUpdateAttendance,
            chatMessages, onSendMessage: handleSendMessage
        };
        return (
            <HashRouter>
                <Routes>
                    <Route path="/login" element={<Navigate to="/" />} />
                    <Route path="*" element={<Dashboard {...studentDashboardProps} />} />
                </Routes>
            </HashRouter>
        );
    }

    const teacherDashboardProps = {
        user: user, 
        faculty: faculty, 
    };

    return (
        <HashRouter>
            <AppLayout user={user} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme}>
                <Routes>
                    {user.role === 'admin' && (
                        <>
                            <Route
                                path="/scheduler"
                                element={
                                    <TimetableScheduler
                                        classes={classes} faculty={faculty} subjects={subjects} rooms={rooms} students={students}
                                        constraints={constraints} setConstraints={handleUpdateConstraints}
                                        onSaveEntity={handleSaveEntity} onDeleteEntity={handleDeleteEntity} onResetData={handleResetData}
                                        token={token || ''} onSaveTimetable={handleSaveTimetable}
                                    />
                                }
                            />
                            <Route
                                path="/smart-classroom"
                                element={
                                    <SmartClassroom
                                        user={user} classes={classes} faculty={faculty} students={students} users={users} attendance={attendance}
                                        onSaveEntity={handleSaveEntity} onDeleteEntity={handleDeleteEntity}
                                        onSaveUser={handleSaveUser} onDeleteUser={handleDeleteUser}
                                        onSaveClassAttendance={handleSaveClassAttendance}
                                    />
                                }
                            />
                            <Route path="/" element={<ModuleSelectionPage user={user} />} />
                        </>
                    )}
                    {user.role === 'teacher' && (
                        <Route path="/" element={<TeacherDashboardLayout {...teacherDashboardProps} />}>
                             <Route index element={<TimetableGrid timetable={timetable} role="teacher" constraints={constraints} />} />
                             <Route path="attendance" element={<TeacherAttendancePage classes={classes} students={students} attendance={attendance} onSaveClassAttendance={handleSaveClassAttendance} />} />
                             <Route path="ims" element={<IMSPage />} />
                             <Route path="smart-tools" element={<SmartToolsPage />} />
                             <Route path="availability" element={<AvailabilityPage facultyProfile={faculty.find(f => f.id === user.profileId)!} constraints={constraints} onUpdateConstraints={handleUpdateConstraints} />} />
                             <Route path="requests" element={<RequestsPage />} />
                             <Route path="notifications" element={<NotificationsPage />} />
                             <Route path="chat" element={<TeacherChatPage user={user} classes={classes} students={students} facultyProfile={faculty.find(f => f.id === user.profileId)} />} />
                        </Route>
                    )}
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </AppLayout>
        </HashRouter>
    );
};