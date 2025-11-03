import React, { useMemo } from 'react';
import { SectionCard } from '../../components/common';
import { useAppContext } from '../../context/AppContext';
import { AppNotification } from '../../types';
import { NotificationsIcon } from '../../components/Icons';

type CombinedNotification = (AppNotification & { sourceType: 'global' });

const NotificationsPage = () => {
    const { appNotifications, user, faculty, subjects, classes } = useAppContext();

    const teacherProfile = useMemo(() => faculty.find(f => f.id === user?.profileId), [faculty, user]);

    const assignedClassIds = useMemo(() => {
        if (!teacherProfile) return new Set<string>();

        const assignedClassNames = new Set(
            subjects.filter(s => s.assignedFacultyId === teacherProfile.id).map(s => s.forClass)
        );

        return new Set(
            classes.filter(c => assignedClassNames.has(c.name)).map(c => c.id)
        );
    }, [teacherProfile, subjects, classes]);

    const combinedNotifications = useMemo(() => {
        const globalNotifications: CombinedNotification[] = appNotifications
            .filter(n => {
                if (n.recipients.type === 'Teachers' || n.recipients.type === 'Both') {
                    return true;
                }
                if (n.recipients.type === 'Specific') {
                    // Show notification if it's for any of the classes the teacher is assigned to
                    return n.recipients.ids?.some(id => assignedClassIds.has(id));
                }
                return false;
            })
            .map(n => ({ ...n, sourceType: 'global' }));

        return [...globalNotifications].sort((a, b) => new Date(b.sentDate).getTime() - new Date(a.sentDate).getTime());

    }, [appNotifications, assignedClassIds]);

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