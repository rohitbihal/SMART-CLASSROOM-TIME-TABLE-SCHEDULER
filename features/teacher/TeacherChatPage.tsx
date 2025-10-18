import React from 'react';
import { PlaceholderContent } from '../dashboard/PlaceholderContent';
import { ChatIcon } from '../../components/Icons';

export const TeacherChatPage = () => {
    return (
        <PlaceholderContent 
            title="Chat"
            message="A dedicated chat interface for teachers to communicate with students and administration is coming soon."
            icon={<ChatIcon />}
        />
    );
};
