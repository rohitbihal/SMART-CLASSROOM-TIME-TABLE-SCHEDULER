import React, { useState } from 'react';
import { SectionCard, FormField, SelectInput, TextInput } from '../../components/common';
import { useAppContext } from '../../context/AppContext';
import { SendIcon } from '../../components/Icons';
import { StudentQuery } from '../../types';

const StudentQueryPage = () => {
    const { studentQueries, subjects, handleSubmitStudentQuery } = useAppContext();

    const initialState: Omit<StudentQuery, 'id' | 'studentId' | 'status' | 'submittedDate' | 'adminResponse'> = {
        queryType: 'Academic',
        subject: '',
        details: '',
    };
    const [formState, setFormState] = useState(initialState);
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormState({ ...formState, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setFeedback('');
        try {
            await handleSubmitStudentQuery(formState);
            setFeedback('Query submitted successfully!');
            setFormState(initialState);
            setTimeout(() => setFeedback(''), 3000);
        } catch (error) {
            setFeedback('Failed to submit query.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const getStatusChipColor = (status: string) => {
        switch (status) {
            case 'Resolved':
            case 'Closed':
                return 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300';
            default:
                return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300';
        }
    };

    return (
        <div className="space-y-8">
            <SectionCard title="Submit a Query">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField label="Query Type" htmlFor="queryType">
                            <SelectInput id="queryType" name="queryType" value={formState.queryType} onChange={handleChange}>
                                <option value="Academic">Academic</option>
                                <option value="Administrative">Administrative</option>
                                <option value="Technical">Technical</option>
                                <option value="Other">Other</option>
                            </SelectInput>
                        </FormField>
                        <FormField label="Related Subject (optional)" htmlFor="subject">
                             <SelectInput id="subject" name="subject" value={formState.subject} onChange={handleChange}>
                                <option value="">Select a subject...</option>
                                {subjects.map(s => <option key={s.id} value={s.name}>{s.name} ({s.code})</option>)}
                             </SelectInput>
                        </FormField>
                    </div>
                     <FormField label="Details" htmlFor="details">
                        <textarea id="details" name="details" rows={5} className="input-base" placeholder="Please describe your query in detail." value={formState.details} onChange={handleChange} required></textarea>
                    </FormField>
                    <div className="flex justify-end items-center gap-4 pt-4">
                         {feedback && <p className="text-sm font-semibold text-green-600 dark:text-green-400">{feedback}</p>}
                        <button type="submit" className="btn-primary flex items-center gap-2 w-48 justify-center" disabled={isLoading}>
                            <SendIcon />
                            {isLoading ? 'Submitting...' : 'Submit Query'}
                        </button>
                    </div>
                </form>
            </SectionCard>
            <SectionCard title="My Query History">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left bg-bg-primary">
                            <tr>
                                <th className="p-3">Date</th>
                                <th className="p-3">Type</th>
                                <th className="p-3">Details</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Admin Response</th>
                            </tr>
                        </thead>
                        <tbody>
                            {studentQueries.length > 0 ? studentQueries.sort((a,b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime()).map(q => (
                                <tr key={q.id} className="border-b border-border-primary">
                                    <td className="p-3 whitespace-nowrap">{new Date(q.submittedDate).toLocaleDateString()}</td>
                                    <td className="p-3">{q.queryType}</td>
                                    <td className="p-3 max-w-sm truncate" title={q.details}>{q.details}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusChipColor(q.status)}`}>
                                            {q.status}
                                        </span>
                                    </td>
                                     <td className="p-3 text-text-secondary italic">{q.adminResponse || 'No response yet.'}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="text-center p-8 text-text-secondary">You haven't submitted any queries yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </SectionCard>
        </div>
    );
};

export default StudentQueryPage;
