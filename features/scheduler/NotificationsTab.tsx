import React, { useState, useMemo } from 'react';
// FIX: Imported shared components from the correct path.
import { SectionCard, FormField, SelectInput, TextInput } from '../../components/common';
import { useAppContext } from '../../context/AppContext';
import { AppNotification } from '../../types';
// FIX: Imported the missing InfoIcon component.
import { SendIcon, UsersIcon, TeacherIcon, StudentIcon, EventIcon, EmergencyIcon, MeetingIcon, TemplateIcon, SchedulerIcon, InfoIcon } from '../../components/Icons';

type RecipientType = AppNotification['recipients']['type'];
type DeliveryMethod = AppNotification['deliveryMethod'][number];
type NotificationType = AppNotification['notificationType'];

const iconMap: Record<NotificationType, React.ReactNode> = {
    'Meeting': <MeetingIcon className="h-5 w-5" />,
    'Event': <EventIcon className="h-5 w-5" />,
    'Schedule Change': <SchedulerIcon className="h-5 w-5" />,
    'Exam': <EventIcon className="h-5 w-5" />,
    'Holiday': <EventIcon className="h-5 w-5" />,
    'Emergency': <EmergencyIcon className="h-5 w-5" />,
    'General': <InfoIcon className="h-5 w-5" />,
};

export const NotificationsTab = () => {
    const { classes, appNotifications } = useAppContext();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [recipientType, setRecipientType] = useState<RecipientType>('Both');
    const [specificClassIds, setSpecificClassIds] = useState<string[]>([]);
    const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>(['In-App']);
    const [notificationType, setNotificationType] = useState<NotificationType>('General');
    const [isSending, setIsSending] = useState(false);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSending(true);
        // In a real app, this would call the context/API handler
        const newNotification: AppNotification = {
            id: `notif-${Date.now()}`,
            title, message,
            recipients: { type: recipientType, ids: specificClassIds },
            deliveryMethod: deliveryMethods,
            notificationType,
            sentDate: new Date().toISOString(),
            status: 'Sent'
        };
        console.log("Sending notification:", newNotification);
        alert('Notification sent! (This is a mock action)');
        // In a real app: await sendNotification(newNotification);
        setIsSending(false);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <SectionCard title="Create Notification">
                    <form onSubmit={handleSend} className="space-y-6">
                        {/* Step 1: Recipients */}
                        <div>
                            <h3 className="font-semibold text-lg mb-3 border-b border-border-primary pb-2">Step 1: Select Recipients</h3>
                            <div className="flex flex-wrap gap-4">
                                <label className="flex items-center gap-2"><input type="radio" name="recipient" value="Both" checked={recipientType === 'Both'} onChange={() => setRecipientType('Both')} /> Both Teachers & Students</label>
                                <label className="flex items-center gap-2"><input type="radio" name="recipient" value="Teachers" checked={recipientType === 'Teachers'} onChange={() => setRecipientType('Teachers')} /> Teachers Only</label>
                                <label className="flex items-center gap-2"><input type="radio" name="recipient" value="Students" checked={recipientType === 'Students'} onChange={() => setRecipientType('Students')} /> Students Only</label>
                                <label className="flex items-center gap-2"><input type="radio" name="recipient" value="Specific" checked={recipientType === 'Specific'} onChange={() => setRecipientType('Specific')} /> Specific Classes</label>
                            </div>
                            {recipientType === 'Specific' && (
                                <div className="mt-4">
                                    <FormField label="Select Classes" htmlFor="specific-classes">
                                        {/* FIX: Added explicit type for the event in onChange handler to resolve TypeScript error. */}
                                        {/* FIX: Explicitly typed `option` as HTMLOptionElement to resolve error 'property "value" does not exist on type "unknown"'. */}
                                        <SelectInput id="specific-classes" multiple value={specificClassIds} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSpecificClassIds(Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value))}>
                                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </SelectInput>
                                    </FormField>
                                </div>
                            )}
                        </div>
                        {/* Step 2 & 3: Method & Type */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="font-semibold text-lg mb-3 border-b border-border-primary pb-2">Step 2: Delivery Method</h3>
                                <div className="space-y-2">
                                    {(['In-App', 'Email', 'SMS'] as DeliveryMethod[]).map(method => (
                                        <label key={method} className="flex items-center gap-2">
                                            <input type="checkbox" checked={deliveryMethods.includes(method)} onChange={() => setDeliveryMethods(prev => prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method])} /> {method} Notification
                                        </label>
                                    ))}
                                </div>
                            </div>
                             <div>
                                <h3 className="font-semibold text-lg mb-3 border-b border-border-primary pb-2">Step 3: Category</h3>
                                <FormField label="Notification Type" htmlFor="notif-type">
                                    {/* FIX: Add explicit type annotation to onChange event handler to resolve TypeScript error. */}
                                    <SelectInput id="notif-type" value={notificationType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNotificationType(e.target.value as NotificationType)}>
                                        {(['General', 'Meeting', 'Event', 'Schedule Change', 'Exam', 'Holiday', 'Emergency'] as NotificationType[]).map(type => <option key={type} value={type}>{type}</option>)}
                                    </SelectInput>
                                </FormField>
                            </div>
                        </div>
                        {/* Step 4: Content */}
                        <div>
                             <h3 className="font-semibold text-lg mb-3 border-b border-border-primary pb-2">Step 4: Compose Message</h3>
                             <div className="space-y-4">
                                <FormField label="Notification Title" htmlFor="notif-title"><TextInput id="notif-title" value={title} onChange={e => setTitle(e.target.value)} required /></FormField>
                                <FormField label="Message" htmlFor="notif-message"><textarea id="notif-message" value={message} onChange={e => setMessage(e.target.value)} rows={6} className="input-base" required></textarea></FormField>
                                <FormField label="Attachment (Optional)" htmlFor="notif-attachment"><TextInput id="notif-attachment" type="file" /></FormField>
                             </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-border-primary">
                            <button type="submit" className="btn-primary flex items-center gap-2 w-48 justify-center" disabled={isSending}>
                                <SendIcon /> {isSending ? 'Sending...' : 'Send Notification'}
                            </button>
                        </div>
                    </form>
                </SectionCard>
            </div>
            <div className="lg:col-span-1">
                 <SectionCard title="Notification History">
                    <div className="space-y-3 max-h-[80vh] overflow-y-auto">
                        {appNotifications.map(n => (
                            <div key={n.id} className="p-3 bg-bg-primary rounded-lg">
                                <p className="font-bold text-sm">{n.title}</p>
                                <p className="text-xs text-text-secondary">{new Date(n.sentDate).toLocaleString()}</p>
                                <p className="text-xs mt-1">To: {n.recipients.type}</p>
                            </div>
                        ))}
                    </div>
                </SectionCard>
            </div>
        </div>
    );
};