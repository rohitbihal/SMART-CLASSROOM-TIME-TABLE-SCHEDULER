import React from 'react';
import { SectionCard } from '../../App';
import { useAppContext } from '../../context/AppContext';
import { ExamsIcon } from '../../components/Icons';

export const ExamsPage = () => {
    const { exams } = useAppContext();
    
    return (
        <SectionCard title="Upcoming Exams Schedule">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-bg-tertiary text-text-secondary uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Time</th>
                            <th className="px-6 py-3">Subject</th>
                            <th className="px-6 py-3">Code</th>
                            <th className="px-6 py-3">Room No.</th>
                        </tr>
                    </thead>
                    <tbody className="text-text-primary">
                        {exams.length > 0 ? exams.map(exam => (
                            <tr key={exam.id} className="border-b border-border-primary hover:bg-bg-primary">
                                <td className="px-6 py-4 font-medium">{new Date(exam.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                <td className="px-6 py-4">{exam.time}</td>
                                <td className="px-6 py-4 font-semibold">{exam.subjectName}</td>
                                <td className="px-6 py-4">{exam.subjectCode}</td>
                                <td className="px-6 py-4">{exam.room}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="text-center p-8 text-text-secondary">
                                    <ExamsIcon className="h-12 w-12 mx-auto mb-4" />
                                    No exam schedule has been published yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </SectionCard>
    );
};