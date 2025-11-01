import React from 'react';
import { SectionCard } from '../../App';
import { NotificationBellIcon } from '../../components/Icons';

export const NotificationsTab = () => {
    // This is a placeholder for the full Notification Center feature.
    return (
        <SectionCard title="Notification Center">
            <div className="text-center p-8">
                <NotificationBellIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-bold">Notification Center</h2>
                <p className="text-text-secondary mt-2">This section will allow admins to create and send notifications to students and teachers via multiple channels.</p>
                <button className="btn-primary mt-6">Create Notification</button>
            </div>
        </SectionCard>
    );
};
