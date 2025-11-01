import React, { useState, useMemo } from 'react';
import {
    LogoutIcon, MoonIcon, SchedulerIcon, StudentIcon, SunIcon, ChatIcon, ProfileIcon, IMSIcon, SmartToolsIcon, BookOpenIcon, NotificationsIcon, ExamsIcon, ExtrasIcon, AttendanceIcon, UsersIcon
} from '../../components/Icons';
import { ChatInterface } from '../chat/ChatInterface';
import { TimetableGrid } from './TimetableGrid';
import { PlaceholderContent } from './PlaceholderContent';
import { User, Class } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { Chatbox, Conversation } from '../chat/Chatbox';

// Import new student feature components
import { ImsAndSmartToolsPage } from '../student/ImsAndSmartToolsPage';
import { SubjectsPage } from '../student/SubjectsPage';
import { UpcomingClassesPage } from '../student/UpcomingClassesPage';
import { NotificationsPage } from '../student/NotificationsPage';
import { ExamsPage } from '../student/ExamsPage';
import { AttendancePage } from '../student/AttendancePage';
import { ExtrasPage } from '../student/ExtrasPage';


const Header = () => {
    const { user, logout, theme, toggleTheme, students, classes } = useAppContext();
    const studentProfile = useMemo(() => students.find(s => s.id === user?.profileId), [students, user]);
    const classProfile = useMemo(() => classes.find(c => c.id === studentProfile?.classId), [classes, studentProfile]);
    
    const subtitle = `Welcome, ${studentProfile?.name || user?.username} | ${classProfile?.name || ''} | Roll No: ${studentProfile?.roll || 'N/A'}`;

    if (!user) return null;

    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
            <div>
                <h1 className="text-4xl font-extrabold">Student Dashboard</h1>
                <p className="text-text-secondary mt-2 text-lg">{subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
                 <div className="h-11 w-11 rounded-full bg-bg-tertiary flex items-center justify-center">
                    <ProfileIcon className="h-6 w-6 text-text-secondary" />
                </div>
                <button onClick={toggleTheme} className="btn-secondary p-3">{theme === 'dark' ? <SunIcon /> : <MoonIcon />}</button>
                <button onClick={logout} className="btn-secondary flex items-center gap-2"><LogoutIcon /> Logout</button>
            </div>
        </div>
    );
};

const StudentChatbox = () => {
    const { user, faculty, students, classes, subjects, chatMessages, constraints, handleSendHumanMessage } = useAppContext();

    const studentProfile = useMemo(() => students.find(s => s.id === user?.profileId), [students, user]);
    const classProfile = useMemo(() => classes.find(c => c.id === studentProfile?.classId), [classes, studentProfile]);

    const conversations = useMemo((): Conversation[] => {
        if (!classProfile || !user?.profileId || !studentProfile) return [];

        const classConv: Conversation = {
            id: `class-${classProfile.id}`,
            name: `${classProfile.name} Group`,
            type: 'class'
        };

        const classSubjects = subjects.filter(s => s.department === classProfile.branch);
        const teacherIds = [...new Set(classSubjects.map(s => s.assignedFacultyId))];
        const teachers = faculty.filter(f => teacherIds.includes(f.id));

        const teacherConvs: Conversation[] = teachers.map(t => ({
            id: `dm-${[studentProfile.id, t.id].sort().join('-')}`,
            name: t.name,
            type: 'dm'
        }));
        
        return [classConv, ...teacherConvs];
    }, [classProfile, studentProfile, faculty, user, subjects, classes]);

    if (!constraints?.isChatboxEnabled) {
        return <PlaceholderContent title="Chatbox Disabled" message="The chat feature is currently disabled by the administrator." icon={<ChatIcon />} />
    }
    
    if (!user) return null;

    return (
        <Chatbox 
            conversations={conversations}
            messages={chatMessages}
            onSendMessage={handleSendHumanMessage}
            currentUser={user}
        />
    );
};

const StudentDashboardView = ({ user, classProfile }: { user: User, classProfile: Class | undefined }) => {
    const { timetable, chatMessages, handleSendMessage, constraints, subjects } = useAppContext();
    const [activeTab, setActiveTab] = useState('schedule');
    const [isChatLoading, setIsChatLoading] = useState(false);
    
    const handleSendMessageWrapper = async (text: string, messageId: string) => {
        if (!classProfile) return;
        setIsChatLoading(true);
        await handleSendMessage(text, messageId, classProfile.id); 
        setIsChatLoading(false);
    };

    const tabs = [
        { key: 'schedule', label: 'My Schedule', icon: <SchedulerIcon className='h-5 w-5' /> },
        { key: 'chat', label: 'Campus AI', icon: <ChatIcon className='h-5 w-5' /> },
        { key: 'chatbox', label: 'Chatbox', icon: <UsersIcon className='h-5 w-5' /> },
        { key: 'ims-tools', label: 'IMS & Smart Tools', icon: <IMSIcon className='h-5 w-5' /> },
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
                messages={chatMessages.filter(m => m.channel === 'query')} 
                onSendMessage={handleSendMessageWrapper} 
                isLoading={isChatLoading}
                classProfile={classProfile} 
            />;
            case 'chatbox': return <StudentChatbox />;
            case 'ims-tools': return <ImsAndSmartToolsPage />;
            case 'subjects': return <SubjectsPage />;
            case 'upcoming': return <UpcomingClassesPage />;
            case 'notifications': return <NotificationsPage />;
            case 'exams': return <ExamsPage />;
            case 'attendance': return <AttendancePage />;
            case 'extras': return <ExtrasPage />;
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

export function Dashboard () {
    const { user, students, classes } = useAppContext();

    const studentProfile = useMemo(() => students.find(s => s.id === user?.profileId), [students, user]);
    const classProfile = useMemo(() => classes.find(c => c.id === studentProfile?.classId), [classes, studentProfile]);
    
    if (!user) return null;
    
    return (
        <div className="min-h-screen p-8">
            <Header />
            <StudentDashboardView user={user} classProfile={classProfile} />
        </div>
    );
};