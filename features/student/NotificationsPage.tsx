import React, { useState, useMemo } from 'react';
import { SectionCard } from '../../components/common';
import { useAppContext } from '../../context/AppContext';
import { StudentDashboardNotification, AppNotification } from '../../types';
import { NotificationsIcon } from '../../components/Icons';

// FIX: Added `timestamp` to the global notification part of the union type to match the object structure created in the `useMemo` hook.
type CombinedNotification = (StudentDashboardNotification & { sourceType: 'personal' }) | (AppNotification & { sourceType: 'global', timestamp: string });


export const NotificationsPage = () => {
    const { notifications: personalNotifications, appNotifications, user } = useAppContext();

    const combinedNotifications = useMemo(() => {
        const studentNotifications: CombinedNotification[] = personalNotifications.map(n => ({ ...n, sourceType: 'personal' }));
        
        const globalNotifications: CombinedNotification[] = appNotifications
            .filter(n => {
                if (n.recipients.type === 'Students' || n.recipients.type === 'Both') {
                    return true;
                }
                // In a real app with class data, you'd check specific class IDs here
                return false;
            })
            .map(n => ({ ...n, sourceType: 'global', timestamp: n.sentDate }));

        return [...studentNotifications, ...globalNotifications].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    }, [personalNotifications, appNotifications, user]);
    
    const [notifications, setNotifications] = useState(combinedNotifications);


    const handleMarkAsRead = (id: string) => {
        setNotifications(prev => 
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
        // In a real app, you would also call an API to update the status on the server.
    };

    return (
        <SectionCard title="Notifications & Announcements">
            <div className="space-y-4">
                {notifications.length > 0 ? notifications.map(notification => {
                    // FIX: Check `sourceType` to determine if a notification is read, as the `read` property only exists on personal notifications.
                    const isRead = notification.sourceType === 'personal' ? notification.read : notification.status === 'Read';
                    return (
                        <div key={`${notification.sourceType}-${notification.id}`} className={`p-4 rounded-lg transition-colors ${isRead ? 'bg-bg-primary opacity-70' : 'bg-bg-secondary shadow-sm'}`}>
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-grow">
                                    {notification.sourceType === 'global' && <span className="text-xs font-bold uppercase text-accent-primary">Announcement</span>}
                                    <h3 className="font-bold">{notification.title}</h3>
                                    <p className="text-sm text-text-secondary mt-1">{notification.message}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-xs text-text-secondary">{new Date(notification.timestamp).toLocaleString()}</p>
                                    {/* FIX: Check `sourceType` before `read` to ensure type safety and correct property access. */}
                                    {notification.sourceType === 'personal' && !notification.read && (
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
                    );
                }) : (
                     <div className="text-center p-8 text-text-secondary">
                        <NotificationsIcon className="h-12 w-12 mx-auto mb-4" />
                        <p>You have no new notifications.</p>
                    </div>
                )}
            </div>
        </SectionCard>
    );
};