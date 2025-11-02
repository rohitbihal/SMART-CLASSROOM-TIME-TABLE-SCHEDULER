import React from 'react';
import { SectionCard, FormField, SelectInput } from '../../components/common';
import { useAppContext } from '../../context/AppContext';

const ProgressBar = ({ value, color = 'bg-blue-600' }: { value: number; color?: string }) => (
    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full`} style={{ width: `${value}%` }}></div>
    </div>
);

const IMSPage = () => {
    const { user, faculty, subjects, syllabusProgress } = useAppContext();
    const teacherProfile = faculty.find(f => f.id === user?.profileId);

    const teacherSubjects = subjects.filter(s => s.assignedFacultyId === teacherProfile?.id);

    const getStatusColor = (status: string) => {
        if (status === 'Completed') return 'text-green-500';
        if (status === 'Deferred') return 'text-yellow-500';
        return 'text-text-secondary';
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">IMS & Syllabus Tracking</h1>
            <SectionCard title="My Subjects' Progress">
                <div className="space-y-6">
                    {teacherSubjects.map(subject => {
                        const progress = syllabusProgress.filter(p => p.subjectId === subject.id);
                        const completed = progress.filter(p => p.status === 'Completed').length;
                        const total = progress.length || 1;
                        const completionPercentage = (completed / total) * 100;

                        return (
                            <div key={subject.id} className="p-4 border border-border-primary rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold">{subject.name} ({subject.code})</h4>
                                    <span className="font-semibold">{completionPercentage.toFixed(0)}% Complete</span>
                                </div>
                                <ProgressBar value={completionPercentage} />
                                <div className="mt-4 overflow-auto max-h-60">
                                    <table className="w-full text-sm">
                                        <thead><tr className="text-left bg-bg-tertiary">
                                            <th className="p-2">Lec#</th><th className="p-2">Assigned Topic</th><th className="p-2">Taught Topic</th><th className="p-2">Status</th>
                                        </tr></thead>
                                        <tbody>
                                            {progress.map(p => (
                                                <tr key={p.id} className="border-b border-border-primary">
                                                    <td className="p-2">{p.lectureNumber}</td>
                                                    <td className="p-2">{p.assignedTopic}</td>
                                                    <td className="p-2">{p.taughtTopic}</td>
                                                    <td className={`p-2 font-semibold ${getStatusColor(p.status)}`}>{p.status}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </SectionCard>
        </div>
    );
};

export default IMSPage;