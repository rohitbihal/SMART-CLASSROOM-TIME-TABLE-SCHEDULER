import React from 'react';
import { PlaceholderContent } from '../dashboard/PlaceholderContent';
import { NotificationsIcon } from '../../components/Icons';

export const NotificationsPage = () => {
    return (
        <PlaceholderContent 
            title="Notifications"
            message="All your notifications regarding schedule changes, requests, and alerts will appear here."
            icon={<NotificationsIcon />}
        />
    );
};
