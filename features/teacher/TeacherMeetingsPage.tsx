import React, { useMemo } from 'react';
import { SectionCard } from '../../components/common';
import { useAppContext } from '../../context/AppContext';
import { MeetingIcon } from '../../components/Icons';

const TeacherMeetingsPage = () => {
    const { meetings, user, faculty, students } = useAppContext();

    const profileMap = useMemo(() => {
        const map = new Map();
        faculty.forEach(f => map.set(f.id, f.name));
        students.forEach(s => map.set(s.id, s.name));
        return map;
    }, [faculty, students]);

    const teacherMeetings = useMemo(() => {
        if (!user?.profileId) return [];
        return meetings
            .filter(m => m.organizerId === user.profileId || m.participants.some(p => p.id === user.profileId))
            .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
    }, [meetings, user]);

    return (
        <SectionCard title="My Meetings">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-left bg-bg-tertiary">
                        <tr>
                            <th className="p-3">Title</th>
                            <th className="p-3">Date & Time</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Platform/Room</th>
                            <th className="p-3">Organizer</th>
                            <th className="p-3">Link</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teacherMeetings.length > 0 ? teacherMeetings.map(meeting => (
                            <tr key={meeting.id} className="border-b border-border-primary">
                                <td className="p-3 font-semibold">{meeting.title}</td>
                                <td className="p-3">{new Date(meeting.start).toLocaleString()}</td>
                                <td className="p-3">{meeting.meetingType}</td>
                                <td className="p-3">{meeting.platform === 'Offline' ? meeting.room : meeting.platform}</td>
                                <td className="p-3">{profileMap.get(meeting.organizerId) || 'N/A'}</td>
                                <td className="p-3">
                                    {meeting.meetingLink ? 
                                        <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer" className="text-accent-primary font-semibold hover:underline">Join</a> 
                                        : 'N/A'}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="text-center p-8 text-text-secondary">
                                    <MeetingIcon className="h-12 w-12 mx-auto mb-4" />
                                    You have no scheduled meetings.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </SectionCard>
    );
};

export default TeacherMeetingsPage;
