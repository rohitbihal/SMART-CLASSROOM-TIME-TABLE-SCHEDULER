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
            <h1 className="text-4xl font-extrabold">{title}</h1>
            <p className="text-text-secondary mt-2 text-lg">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
             <div className="h-11 w-11 rounded-full bg-bg-tertiary flex items-center justify-center">
                <ProfileIcon className="h-6 w-6 text-text-secondary" />
            </div>
            <button onClick={toggleTheme} className="btn-secondary p-3">{theme === 'dark' ? <SunIcon /> : <MoonIcon />}</button>
            <button onClick={onLogout} className="btn-secondary flex items-center gap-2"><LogoutIcon /> Logout</button>
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
            <div className="border-b border-border-primary mb-8">
                <nav className="-mb-px flex space-x-6 overflow-x-auto">
                    {tabs.map(tab => (
                        <button 
                          key={tab.key} 
                          onClick={() => setActiveTab(tab.key)} 
                          className={`tab-item ${
                            activeTab === tab.key
                              ? 'tab-item-active'
                              : 'tab-item-inactive'
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
        <div className="min-h-screen p-8">
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