import React, { useState, useMemo } from 'react';
// FIX: Imported shared components from the correct path.
import { SectionCard, Modal, FormField, SelectInput, TextInput } from '../../components/common';
import { useAppContext } from '../../context/AppContext';
import { Meeting } from '../../types';
import { AddIcon, MeetingIcon } from '../../components/Icons';

const MeetingForm = ({ isOpen, onClose, onCreateMeeting }: { isOpen: boolean, onClose: () => void, onCreateMeeting: (meeting: Omit<Meeting, 'id' | 'attendance'>) => void }) => {
    const { faculty, students } = useAppContext();
    const initialState = {
        title: '', description: '', meetingType: 'Department' as Meeting['meetingType'], platform: 'Offline' as Meeting['platform'], meetingLink: '', room: '',
        start: '', end: '', organizerId: 'f1', // Assume current user is f1 for mock
        participants: [] as { type: 'faculty' | 'student', id: string }[]
    };
    const [form, setForm] = useState(initialState);
    const [selectedFaculty, setSelectedFaculty] = useState<string[]>([]);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const participants = [
            ...selectedFaculty.map(id => ({ type: 'faculty' as const, id })),
            ...selectedStudents.map(id => ({ type: 'student' as const, id }))
        ];
        onCreateMeeting({ ...form, participants });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Schedule a New Meeting" size="4xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Meeting Title" htmlFor="meet-title"><TextInput id="meet-title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required /></FormField>
                    <FormField label="Meeting Type" htmlFor="meet-type">
                        <SelectInput id="meet-type" value={form.meetingType} onChange={e => setForm({...form, meetingType: e.target.value as Meeting['meetingType']})}>
                            <option>Department</option><option>Admin-Faculty</option><option>Faculty-Student</option><option>Class Meeting</option><option>One-on-One</option><option>College Meeting</option>
                        </SelectInput>
                    </FormField>
                </div>
                <FormField label="Agenda / Description" htmlFor="meet-desc"><textarea id="meet-desc" value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className="input-base" /></FormField>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Start Time" htmlFor="meet-start"><TextInput id="meet-start" type="datetime-local" value={form.start} onChange={e => setForm({...form, start: e.target.value})} required /></FormField>
                    <FormField label="End Time" htmlFor="meet-end"><TextInput id="meet-end" type="datetime-local" value={form.end} onChange={e => setForm({...form, end: e.target.value})} required /></FormField>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Platform" htmlFor="meet-platform">
                        <SelectInput id="meet-platform" value={form.platform} onChange={e => setForm({...form, platform: e.target.value as Meeting['platform']})}>
                            <option>Offline</option><option>Google Meet</option><option>Zoom</option><option>MS Teams</option>
                        </SelectInput>
                    </FormField>
                    {form.platform === 'Offline' ? 
                        <FormField label="Room" htmlFor="meet-room"><TextInput id="meet-room" value={form.room} onChange={e => setForm({...form, room: e.target.value})} placeholder="e.g., Seminar Hall 1" /></FormField> :
                        <FormField label="Meeting Link" htmlFor="meet-link"><TextInput id="meet-link" value={form.meetingLink} onChange={e => setForm({...form, meetingLink: e.target.value})} placeholder="Auto-generated secure link" /></FormField>
                    }
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {/* FIX: Added explicit type for the event in onChange handler to resolve TypeScript error. */}
                     {/* FIX: Add explicit type annotation for option element in Array.from to resolve potential type inference issues. */}
                     <FormField label="Select Faculty" htmlFor="meet-faculty"><SelectInput id="meet-faculty" multiple value={selectedFaculty} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedFaculty(Array.from(e.target.selectedOptions, (o: HTMLOptionElement) => o.value))}>{faculty.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</SelectInput></FormField>
                     {/* FIX: Added explicit type for the event in onChange handler to resolve TypeScript error. */}
                     {/* FIX: Add explicit type annotation for option element in Array.from to resolve potential type inference issues. */}
                     <FormField label="Select Students" htmlFor="meet-students"><SelectInput id="meet-students" multiple value={selectedStudents} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedStudents(Array.from(e.target.selectedOptions, (o: HTMLOptionElement) => o.value))}>{students.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</SelectInput></FormField>
                </div>
                <div className="flex justify-end pt-4"><button className="btn-primary" type="submit">Schedule Meeting</button></div>
            </form>
        </Modal>
    );
};


export const MeetingsPage = () => {
    const { meetings, handleCreateMeeting, faculty, students } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const profileMap = useMemo(() => {
        const map = new Map();
        faculty.forEach(f => map.set(f.id, f.name));
        students.forEach(s => map.set(s.id, s.name));
        return map;
    }, [faculty, students]);

    return (
        <div className="space-y-6">
            <MeetingForm isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreateMeeting={handleCreateMeeting} />
            <h1 className="text-3xl font-bold">Meeting Management</h1>
            <SectionCard title="Upcoming & Past Meetings" actions={<button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2"><AddIcon/>New Meeting</button>}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left bg-bg-tertiary">
                            <tr>
                                <th className="p-3">Title</th>
                                <th className="p-3">Date & Time</th>
                                <th className="p-3">Type</th>
                                <th className="p-3">Platform/Room</th>
                                <th className="p-3">Organizer</th>
                                <th className="p-3">Participants</th>
                            </tr>
                        </thead>
                        <tbody>
                            {meetings.map(meeting => (
                                <tr key={meeting.id} className="border-b border-border-primary">
                                    <td className="p-3 font-semibold">{meeting.title}</td>
                                    <td className="p-3">{new Date(meeting.start).toLocaleString()}</td>
                                    <td className="p-3">{meeting.meetingType}</td>
                                    <td className="p-3">{meeting.platform === 'Offline' ? meeting.room : meeting.platform}</td>
                                    <td className="p-3">{profileMap.get(meeting.organizerId) || 'N/A'}</td>
                                    <td className="p-3">{meeting.participants.length}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </SectionCard>
        </div>
    );
};

export default MeetingsPage;