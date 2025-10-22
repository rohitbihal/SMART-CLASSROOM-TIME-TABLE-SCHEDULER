import React, { useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Chatbox, Conversation } from '../chat/Chatbox';
import { PlaceholderContent } from '../dashboard/PlaceholderContent';
import { ChatIcon } from '../../components/Icons';

export const TeacherChatboxPage = () => {
    const { user, faculty, students, classes, subjects, chatMessages, constraints, handleSendHumanMessage } = useAppContext();

    const teacherProfile = useMemo(() => faculty.find(f => f.id === user?.profileId), [faculty, user]);

    const conversations = useMemo((): Conversation[] => {
        if (!teacherProfile) return [];

        // Determine which classes the teacher is associated with based on subject department and class branch.
        const departmentClasses = classes.filter(c => c.branch === teacherProfile.department);
        const classConversations: Conversation[] = departmentClasses.map(c => ({
            id: `class-${c.id}`,
            name: `${c.name} Group`,
            type: 'class',
        }));

        // Get all students from those classes to enable DMs
        const departmentClassIds = departmentClasses.map(c => c.id);
        const relevantStudents = students.filter(s => departmentClassIds.includes(s.classId));
        const studentConversations: Conversation[] = relevantStudents.map(s => ({
            id: `dm-${[teacherProfile.id, s.id].sort().join('-')}`,
            name: s.name,
            type: 'dm'
        }));

        return [...classConversations, ...studentConversations].sort((a,b) => a.name.localeCompare(b.name));
    }, [teacherProfile, classes, students]);

    if (!constraints?.isChatboxEnabled) {
        return (
            <div className="p-8">
                 <PlaceholderContent title="Chatbox Disabled" message="The chat feature is currently disabled by the administrator." icon={<ChatIcon />} />
            </div>
        );
    }
    
    if (!user) return null;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Chatbox</h1>
            <Chatbox
                conversations={conversations}
                messages={chatMessages}
                onSendMessage={handleSendHumanMessage}
                currentUser={user}
            />
        </div>
    );
};

export default TeacherChatboxPage;
