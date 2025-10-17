

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
    chatMessages: ChatMessage[]; onSendMessage: (messageText: string, classId: string) => Promise<void>;
    users: User[];
    constraints: Constraints | null;
    token: string | null;
}
interface HeaderProps { user: User; title: string; subtitle: string; onLogout: () => void; theme: string; toggleTheme: () => void; }

const Header = ({ user, title, subtitle, onLogout, theme, toggleTheme }: HeaderProps) => (
    <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{title}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
             <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center ring-2 ring-gray-300 dark:ring-slate-600">
                <ProfileIcon className="h-6 w-6 text-gray-500 dark:text-gray-300" />
            </div>
            <button onClick={toggleTheme} className="bg-white dark:bg-slate-800 border dark:border-slate-700 text-gray-600 dark:text-gray-300 font-semibold p-3 rounded-lg flex items-center gap-2 transition">{theme === 'dark' ? <SunIcon /> : <MoonIcon />}</button>
            <button onClick={onLogout} className="bg-white dark:bg-slate-800 border dark:border-slate-700 text-gray-600 dark:text-gray-300 font-semibold py-2.5 px-4 rounded-lg flex items-center gap-2 transition"><LogoutIcon /> Logout</button>
        </div>
    </div>
);

const StudentDashboardView = ({ user, timetable, chatMessages, onSendMessage, classProfile }: { user: User, timetable: TimetableEntry[], chatMessages: ChatMessage[], onSendMessage: (messageText: string, classId: string) => Promise<void>, classProfile: Class | undefined }) => {
    const [activeTab, setActiveTab] = useState('schedule');
    const [isChatLoading, setIsChatLoading] = useState(false);
    
    const handleSendMessageWrapper = async (text: string) => {
        if (!classProfile) return;
        setIsChatLoading(true);
        await onSendMessage(text, classProfile.id);
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
            case 'schedule': return <TimetableGrid timetable={timetable} role="student" />;
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
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-2 rounded-xl shadow-sm flex flex-wrap gap-2 mb-8">
                {tabs.map(tab => <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === tab.key ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'}`}>{tab.icon} {tab.label}</button>)}
            </div>
            {renderContent()}
        </div>
    );
};

export function Dashboard (props: DashboardProps) {
    const { user, onLogout, theme, toggleTheme, timetable, chatMessages, onSendMessage } = props;

    const studentProfile = props.students.find(s => s.id === user.profileId);
    const classProfile = props.classes.find(c => c.id === studentProfile?.classId);
    const subtitle = `Welcome, ${studentProfile?.name || user.username} | ${classProfile?.name || ''} | Roll No: ${studentProfile?.roll || 'N/A'}`;
    
    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">
            <Header
                user={user}
                title="Student Dashboard"
                subtitle={subtitle}
                onLogout={onLogout}
                theme={theme}
                toggleTheme={toggleTheme}
            />
            <StudentDashboardView user={user} timetable={timetable} chatMessages={chatMessages} onSendMessage={onSendMessage} classProfile={classProfile} />
        </div>
    );
};