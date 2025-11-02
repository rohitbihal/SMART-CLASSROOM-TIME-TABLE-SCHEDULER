import React, { useMemo } from 'react';
import { SectionCard } from '../../components/common';
import { useAppContext } from '../../context/AppContext';
import { AppNotification } from '../../types';
import { NotificationsIcon } from '../../components/Icons';

type CombinedNotification = (AppNotification & { sourceType: 'global' });

const NotificationsPage = () => {
    const { appNotifications, user } = useAppContext();

    const combinedNotifications = useMemo(() => {
        const globalNotifications: CombinedNotification[] = appNotifications
            .filter(n => {
                if (n.recipients.type === 'Teachers' || n.recipients.type === 'Both') {
                    return true;
                }
                // Placeholder for more specific filtering logic if needed
                return false;
            })
            .map(n => ({ ...n, sourceType: 'global' }));

        return [...globalNotifications].sort((a, b) => new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime());

    }, [appNotifications, user]);

    return (
        <SectionCard title="Notifications & Announcements">
            <div className="space-y-4">
                {combinedNotifications.length > 0 ? combinedNotifications.map(notification => (
                    <div key={`${notification.sourceType}-${notification.id}`} className={`p-4 rounded-lg bg-bg-secondary shadow-sm`}>
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-grow">
                                <span className="text-xs font-bold uppercase text-accent-primary">Announcement</span>
                                <h3 className="font-bold mt-1">{notification.title}</h3>
                                <p className="text-sm text-text-secondary mt-1">{notification.message}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-xs text-text-secondary">{new Date(notification.sentDate).toLocaleString()}</p>
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

export default NotificationsPage;