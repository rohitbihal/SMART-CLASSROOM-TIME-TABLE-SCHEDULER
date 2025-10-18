import React, { useState, useEffect, useMemo } from 'react';
import {
    LogoutIcon, MoonIcon, SchedulerIcon, StudentIcon, SunIcon, ChatIcon, ProfileIcon, IMSIcon, SmartToolsIcon, BookOpenIcon, NotificationsIcon, ExamsIcon, ExtrasIcon, AttendanceIcon
} from '../../components/Icons';
import { ChatInterface } from '../chat/ChatInterface';
import { TimetableGrid } from './TimetableGrid';
import { PlaceholderContent } from './PlaceholderContent';
import { TimetableEntry, User, Class, Subject, Student, Faculty, Attendance, AttendanceStatus, ChatMessage, Constraints } from '../../types';

interface DashboardProps {
    user: User; onLogout: () => void; theme: string; toggleTheme: () => void;
    timetable: TimetableEntry[];
    classes: Class[]; subjects: Subject[]; students: Student[]; faculty: Faculty[];
    attendance: Attendance; onUpdateAttendance: (classId: string, date: string, studentId: string, status: AttendanceStatus) => void;
    chatMessages: ChatMessage[]; onSendMessage: (messageText: string, messageId: string) => Promise<void>;
    users: User[];
    constraints: Constraints | null;
    token: string | null;
}
interface HeaderProps { user: User; title: string; subtitle: string; onLogout: () => void; theme: string; toggleTheme: () => void; }

const Header = ({ user, title, subtitle, onLogout, theme, toggleTheme }: HeaderProps) => (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
            <h1 className="text-4xl font-extrabold text-slate-800 dark:text-slate-100">{title}</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
             <div className="h-11 w-11 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center ring-4 ring-white dark:ring-slate-800">
                <ProfileIcon className="h-6 w-6 text-slate-500 dark:text-slate-300" />
            </div>
            <button onClick={toggleTheme} className="bg-white dark:bg-slate-800 border dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold p-3 rounded-lg flex items-center gap-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700">{theme === 'dark' ? <SunIcon /> : <MoonIcon />}</button>
            <button onClick={onLogout} className="bg-white dark:bg-slate-800 border dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold py-2.5 px-4 rounded-lg flex items-center gap-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"><LogoutIcon /> Logout</button>
        </div>
    </div>
);

const StudentDashboardView = ({ user, timetable, chatMessages, onSendMessage, classProfile, constraints }: { user: User, timetable: TimetableEntry[], chatMessages: ChatMessage[], onSendMessage: (messageText: string, messageId: string) => Promise<void>, classProfile: Class | undefined, constraints: Constraints | null }) => {
    const [activeTab, setActiveTab] = useState('schedule');
    const [isChatLoading, setIsChatLoading] = useState(false);
    
    const handleSendMessageWrapper = async (text: string, messageId: string) => {
        if (!classProfile) return;
        setIsChatLoading(true);
        await onSendMessage(text, messageId);
        setIsChatLoading(false);
    };

    const tabs = [
        { key: 'schedule', label: 'My Schedule', icon: <SchedulerIcon className='h-5 w-5' /> },
        { key: 'chat', label: 'Campus AI', icon: <ChatIcon className='h-5 w-5' /> },
        { key: 'ims', label: 'IMS', icon: <IMSIcon className='h-5 w-5' /> },
        { key: 'smart-tools', label: 'Smart Tools', icon: <SmartToolsIcon className='h-5 w-5' /> },
        { key: 'subjects', label: 'Subjects', icon: <BookOpenIcon className='h-5 w-5' /> },
        { key: 'upcoming', label: 'Upcoming Classes', icon: <SchedulerIcon className='h-5 w-5' />},
        { key: 'notifications', label: 'Notifications', icon: <NotificationsIcon className='h-5 w-5' /> },
        { key: 'exams', label: 'Exams', icon: <ExamsIcon className='h-5 w-5' /> },
        { key: 'attendance', label: 'Attendance', icon: <AttendanceIcon className='h-5 w-5' /> },
        { key: 'extras', label: 'Extras', icon: <ExtrasIcon className='h-5 w-5' /> }
    ];

     const renderContent = () => {
        switch(activeTab) {
            case 'schedule': return <TimetableGrid timetable={timetable} role="student" constraints={constraints} />;
            case 'chat': return <ChatInterface 
                user={user} 
                messages={chatMessages} 
                onSendMessage={handleSendMessageWrapper} 
                isLoading={isChatLoading}
                classProfile={classProfile} 
            />;
            default: return <PlaceholderContent
                title="Coming Soon"
                message={`The "${tabs.find(t => t.key === activeTab)?.label}" feature is currently under development.`}
                icon={tabs.find(t => t.key === activeTab)?.icon || <ChatIcon className="h-5 w-5" />}
            />;
        }
    };
    
    return (
        <div>
            <div className="border-b border-slate-200 dark:border-slate-700 mb-8">
                <nav className="-mb-px flex space-x-6 overflow-x-auto">
                    {tabs.map(tab => (
                        <button 
                          key={tab.key} 
                          onClick={() => setActiveTab(tab.key)} 
                          className={`whitespace-nowrap flex items-center gap-2 pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === tab.key
                              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          {tab.icon} {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
            {renderContent()}
        </div>
    );
};

export function Dashboard (props: DashboardProps) {
    const { user, onLogout, theme, toggleTheme, timetable, chatMessages, onSendMessage, constraints } = props;

    const studentProfile = useMemo(() => props.students.find(s => s.id === user.profileId), [props.students, user.profileId]);
    const classProfile = useMemo(() => props.classes.find(c => c.id === studentProfile?.classId), [props.classes, studentProfile]);
    
    const subtitle = `Welcome, ${studentProfile?.name || user.username} | ${classProfile?.name || ''} | Roll No: ${studentProfile?.roll || 'N/A'}`;
    
    return (
        <div className="min-h-screen p-6 sm:p-8 lg:p-10">
            <Header
                user={user}
                title="Student Dashboard"
                subtitle={subtitle}
                onLogout={onLogout}
                theme={theme}
                toggleTheme={toggleTheme}
            />
            <StudentDashboardView user={user} timetable={timetable} chatMessages={chatMessages} onSendMessage={onSendMessage} classProfile={classProfile} constraints={constraints} />
        </div>
    );
};