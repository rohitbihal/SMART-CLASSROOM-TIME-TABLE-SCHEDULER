import React, { useState } from 'react';
import { SectionCard } from '../../App';
import { useAppContext } from '../../context/AppContext';
import { Notification } from '../../types';
import { NotificationsIcon } from '../../components/Icons';

export const NotificationsPage = () => {
    const { notifications: initialNotifications } = useAppContext();
    const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

    const handleMarkAsRead = (id: string) => {
        setNotifications(prev => 
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
        // In a real app, you would also call an API to update the status on the server.
    };

    return (
        <SectionCard title="Notifications & Announcements">
            <div className="space-y-4">
                {notifications.length > 0 ? notifications.map(notification => (
                    <div key={notification.id} className={`p-4 rounded-lg transition-colors ${notification.read ? 'bg-bg-primary opacity-70' : 'bg-bg-secondary shadow-sm'}`}>
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-grow">
                                <h3 className="font-bold">{notification.title}</h3>
                                <p className="text-sm text-text-secondary mt-1">{notification.message}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-xs text-text-secondary">{notification.timestamp}</p>
                                {!notification.read && (
                                    <button 
                                        onClick={() => handleMarkAsRead(notification.id)} 
                                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-2"
                                    >
                                        Mark as Read
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )) : (
                     <div className="text-center p-8 text-text-secondary">
                        <NotificationsIcon className="h-12 w-12 mx-auto mb-4" />
                        <p>You have no new notifications.</p>
                    </div>
                )}
            </div>
        </SectionCard>
    );
};