import React, { useState, useMemo } from 'react';
import { SectionCard, FormField, SelectInput, TextInput } from '../../App';
import { useAppContext } from '../../context/AppContext';
import { SendIcon } from '../../components/Icons';
import { TeacherRequest } from '../../types';

export const RequestsPage = () => {
    const { user, subjects, teacherRequests, handleSubmitTeacherRequest } = useAppContext();

    const initialState: Omit<TeacherRequest, 'id' | 'facultyId' | 'status' | 'submittedDate'> = {
        requestType: 'Schedule Change',
        subject: '',
        currentSchedule: '',
        requestedChange: '',
        reason: '',
    };
    const [formState, setFormState] = useState(initialState);
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState('');

    const teacherSubjects = useMemo(() => {
        return subjects.filter(s => s.assignedFacultyId === user?.profileId);
    }, [subjects, user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormState({ ...formState, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setFeedback('');
        try {
            await handleSubmitTeacherRequest(formState);
            setFeedback('Request submitted successfully!');
            setFormState(initialState);
            setTimeout(() => setFeedback(''), 3000);
        } catch (error) {
            setFeedback('Failed to submit request.');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusChipColor = (status: string) => {
        switch (status) {
            case 'Approved': return 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300';
            case 'Rejected': return 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300';
            default: return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300';
        }
    };

    return (
        <div className="space-y-8">
            <SectionCard title="Submit Request">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormField label="Request Type" htmlFor="requestType">
                            <SelectInput id="requestType" name="requestType" value={formState.requestType} onChange={handleChange}>
                                <option>Schedule Change</option>
                                <option>Leave Request</option>
                                <option>Resource Request</option>
                                <option>Other</option>
                            </SelectInput>
                        </FormField>
                        <FormField label="Subject/Class" htmlFor="subject">
                             <SelectInput id="subject" name="subject" value={formState.subject} onChange={handleChange}>
                                <option value="">Select a subject...</option>
                                {teacherSubjects.map(s => <option key={s.id} value={s.name}>{s.name} ({s.code})</option>)}
                             </SelectInput>
                        </FormField>
                         <FormField label="Current Schedule (if applicable)" htmlFor="currentSchedule">
                            <TextInput id="currentSchedule" name="currentSchedule" placeholder="e.g., Monday 9:30-10:20" value={formState.currentSchedule} onChange={handleChange} />
                        </FormField>
                        <FormField label="Requested Change" htmlFor="requestedChange">
                            <TextInput id="requestedChange" name="requestedChange" placeholder="Describe your request" value={formState.requestedChange} onChange={handleChange} required />
                        </FormField>
                    </div>
                     <FormField label="Reason" htmlFor="reason">
                        <textarea id="reason" name="reason" rows={4} className="input-base" placeholder="Please provide a reason for this request" value={formState.reason} onChange={handleChange} required></textarea>
                    </FormField>
                    <div className="flex justify-end items-center gap-4 pt-4">
                         {feedback && <p className="text-sm font-semibold text-green-600 dark:text-green-400">{feedback}</p>}
                        <button type="submit" className="btn-primary flex items-center gap-2 w-48 justify-center" disabled={isLoading}>
                            <SendIcon />
                            {isLoading ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </SectionCard>
            <SectionCard title="Request History">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left bg-bg-primary">
                            <tr>
                                <th className="p-3">Date</th>
                                <th className="p-3">Type</th>
                                <th className="p-3">Details</th>
                                <th className="p-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teacherRequests.length > 0 ? teacherRequests.map(req => (
                                <tr key={req.id} className="border-b border-border-primary">
                                    <td className="p-3 whitespace-nowrap">{new Date(req.submittedDate).toLocaleDateString()}</td>
                                    <td className="p-3">{req.requestType}</td>
                                    <td className="p-3">{req.requestedChange}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusChipColor(req.status)}`}>
                                            {req.status}
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="text-center p-8 text-text-secondary">No requests submitted yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </SectionCard>
        </div>
    );
};