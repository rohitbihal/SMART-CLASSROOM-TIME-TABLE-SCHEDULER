import React from 'react';
import { PlaceholderContent } from '../dashboard/PlaceholderContent';
import { SmartToolsIcon } from '../../components/Icons';

export const SmartToolsPage = () => {
    return (
        <PlaceholderContent 
            title="Smart Tools"
            message="AI-powered smart tools for teachers, such as quiz generators and lesson planners, are coming soon."
            icon={<SmartToolsIcon />}
        />
    );
};
