import React from 'react';
import { SectionCard } from '../../App';
import { NotificationsIcon } from '../../components/Icons';

const MOCK_NOTIFICATIONS = [
    {
        id: 1,
        type: 'SCHEDULE CHANGE',
        message: 'Your Data Structures class for CSE-3-A has been moved to Tuesday 9:30-10:20 in CS-101',
        timestamp: '2024-12-15 10:30',
        priority: 'HIGH'
    },
    {
        id: 2,
        type: 'ROOM CHANGE',
        message: 'Room change for Algorithms Lab: CS-Lab-1 is now CS-Lab-2',
        timestamp: '2024-12-15 09:15',
        priority: 'NORMAL'
    },
    {
        id: 3,
        type: 'REQUEST APPROVED',
        message: 'Your leave request for 2024-12-20 has been approved.',
        timestamp: '2024-12-14 17:00',
        priority: 'NORMAL'
    }
];

export const NotificationsPage = () => {
    
    const getPriorityStyles = (priority: string) => {
        switch(priority) {
            case 'HIGH': return 'border-l-4 border-red-500';
            case 'NORMAL': return 'border-l-4 border-blue-500';
            default: return 'border-l-4 border-gray-400';
        }
    };
    
     const getPriorityTagStyles = (priority: string) => {
        switch(priority) {
            case 'HIGH': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
            case 'NORMAL': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
            default: return 'bg-gray-200 text-gray-800 dark:bg-slate-700 dark:text-slate-300';
        }
    };

    return (
        <SectionCard title="Notifications">
            <div className="space-y-4">
                {MOCK_NOTIFICATIONS.length > 0 ? MOCK_NOTIFICATIONS.map(notification => (
                    <div key={notification.id} className={`p-4 bg-bg-secondary rounded-lg shadow-sm flex flex-col md:flex-row justify-between md:items-start gap-4 ${getPriorityStyles(notification.priority)}`}>
                        <div className="flex-grow">
                            <p className="font-bold text-sm tracking-wider text-text-secondary">{notification.type}</p>
                            <p className="mt-1 text-text-primary">{notification.message}</p>
                             <div className="mt-3">
                                <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${getPriorityTagStyles(notification.priority)}`}>
                                    {notification.priority}
                                </span>
                            </div>
                        </div>
                        <p className="text-xs text-text-secondary whitespace-nowrap mt-1 md:mt-0">{notification.timestamp}</p>
                    </div>
                )) : (
                    <div className="text-center p-8 text-text-secondary">
                        <NotificationsIcon className="h-12 w-12 mx-auto mb-4" />
                        <p>No new notifications.</p>
                    </div>
                )}
            </div>
        </SectionCard>
    );
};