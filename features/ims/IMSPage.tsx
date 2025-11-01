import React, { useState, useMemo } from 'react';
// FIX: Imported shared components from the correct path.
import { SectionCard, FormField, SelectInput } from '../../components/common';
import { useAppContext } from '../../context/AppContext';
import { AnalyticsIcon } from '../../components/Icons';

const ProgressBar = ({ value, color = 'bg-blue-600' }: { value: number; color?: string }) => (
    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full`} style={{ width: `${value}%` }}></div>
    </div>
);

const SyllabusTracking = () => {
    const { faculty, subjects, syllabusProgress } = useAppContext();
    const [selectedFacultyId, setSelectedFacultyId] = useState<string>(faculty[0]?.id || '');

    const facultySubjects = useMemo(() => subjects.filter(s => s.assignedFacultyId === selectedFacultyId), [subjects, selectedFacultyId]);

    const getStatusColor = (status: string) => {
        if (status === 'Completed') return 'text-green-500';
        if (status === 'Deferred') return 'text-yellow-500';
        return 'text-text-secondary';
    };

    return (
        <SectionCard title="Syllabus Tracking & Compliance">
            <div className="mb-4">
                <FormField label="Select Faculty" htmlFor="ims-faculty-select">
                    <SelectInput id="ims-faculty-select" value={selectedFacultyId} onChange={e => setSelectedFacultyId(e.target.value)}>
                        {faculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </SelectInput>
                </FormField>
            </div>
            <div className="space-y-6">
                {facultySubjects.map(subject => {
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
                            <div className="mt-4 overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr className="text-left bg-bg-tertiary">
                                        <th className="p-2">Lec#</th><th className="p-2">Assigned Topic</th><th className="p-2">Taught Topic</th><th className="p-2">Status</th><th className="p-2">Variance</th>
                                    </tr></thead>
                                    <tbody>
                                        {progress.map(p => (
                                            <tr key={p.id} className="border-b border-border-primary">
                                                <td className="p-2">{p.lectureNumber}</td>
                                                <td className="p-2">{p.assignedTopic}</td>
                                                <td className="p-2">{p.taughtTopic}</td>
                                                <td className={`p-2 font-semibold ${getStatusColor(p.status)}`}>{p.status}</td>
                                                <td className={`p-2 font-bold text-center ${p.variance ? 'text-red-500' : 'text-green-500'}`}>{p.variance ? 'YES' : 'NO'}</td>
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
    );
};

const FacultyPerformanceDashboard = () => {
    const { faculty, subjects, timetable } = useAppContext();
    return (
        <SectionCard title="Faculty Teaching Performance">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left bg-bg-tertiary">
                            <th className="p-2">Faculty</th>
                            <th className="p-2">Classes/Wk</th>
                            <th className="p-2">Workload</th>
                            <th className="p-2">Syllabus Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {faculty.map(f => {
                            const scheduledClasses = timetable.filter(t => t.faculty === f.name).length;
                            const workloadPercentage = f.maxWorkload > 0 ? (scheduledClasses / f.maxWorkload) * 100 : 0;
                            return (
                                <tr key={f.id} className="border-b border-border-primary">
                                    <td className="p-2 font-semibold">{f.name}</td>
                                    <td className="p-2">{scheduledClasses}</td>
                                    <td className="p-2"><ProgressBar value={workloadPercentage} color={workloadPercentage > 100 ? 'bg-red-500' : 'bg-green-500'} /></td>
                                    <td className="p-2"><span className="text-green-500">On Track</span></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </SectionCard>
    );
};

const SubjectCoverageReport = () => {
     const { subjects, syllabusProgress } = useAppContext();
     return(
        <SectionCard title="Subject Coverage Report">
            <div className="space-y-4">
                {subjects.map(subject => {
                    const progress = syllabusProgress.filter(p => p.subjectId === subject.id);
                    const completed = progress.filter(p => p.status === 'Completed').length;
                    const total = progress.length || 1;
                    const completionPercentage = (completed / total) * 100;
                    return (
                        <div key={subject.id}>
                            <div className="flex justify-between items-center text-sm mb-1">
                                <span className="font-semibold">{subject.name}</span>
                                <span>{completionPercentage.toFixed(0)}%</span>
                            </div>
                            <ProgressBar value={completionPercentage} />
                        </div>
                    )
                })}
            </div>
        </SectionCard>
     );
};


export const IMSPage = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Integrated Management System (IMS)</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <SyllabusTracking />
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <FacultyPerformanceDashboard />
                    <SubjectCoverageReport />
                </div>
            </div>
        </div>
    );
};

export default IMSPage;