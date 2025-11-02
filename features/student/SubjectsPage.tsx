import React, { useMemo } from 'react';
import { SectionCard } from '../../components/common';
import { useAppContext } from '../../context/AppContext';
import { BookOpenIcon } from '../../components/Icons';
import { Subject } from '../../types';

const ProgressBar = ({ value, color = 'bg-accent-primary' }: { value: number; color?: string }) => (
    <div className="w-full bg-bg-primary rounded-full h-2">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${value}%` }}></div>
    </div>
);


// FIX: Changed to React.FC to handle 'key' prop issue in TypeScript.
const SubjectCard: React.FC<{ subject: Subject }> = ({ subject }) => {
    const { faculty, syllabusProgress } = useAppContext();
    const assignedFaculty = faculty.find(f => f.id === subject.assignedFacultyId);

    const completionPercentage = useMemo(() => {
        const progress = syllabusProgress.filter(p => p.subjectId === subject.id);
        if (progress.length === 0) return 0;
        const completed = progress.filter(p => p.status === 'Completed').length;
        return (completed / progress.length) * 100;
    }, [syllabusProgress, subject.id]);

    return (
        <div className="p-4 bg-bg-tertiary rounded-lg">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-lg">{subject.name} ({subject.code})</h3>
                    <p className="text-sm text-text-secondary">Faculty: {assignedFaculty?.name || 'N/A'}</p>
                </div>
                <button className="btn-secondary text-sm">
                    View Materials
                </button>
            </div>
            <div className="mt-4">
                <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold text-text-secondary">Syllabus Progress</span>
                    <span className="font-bold">{completionPercentage.toFixed(0)}%</span>
                </div>
                <ProgressBar value={completionPercentage} />
            </div>
        </div>
    );
}


export const SubjectsPage = () => {
    const { subjects, user } = useAppContext();

    // In a real app, this would be filtered based on the logged-in student's enrollment.
    // For this mock, we assume the student is in a class that takes all subjects from the faculty's department.
    const studentProfile = useAppContext().students.find(s => s.id === user?.profileId);
    const classProfile = useAppContext().classes.find(c => c.id === studentProfile?.classId);
    const studentSubjects = subjects.filter(s => s.department === classProfile?.branch);
    
    return (
        <SectionCard title="My Subjects">
            <div className="space-y-4">
                {studentSubjects.length > 0 ? studentSubjects.map(subject => (
                    <SubjectCard key={subject.id} subject={subject} />
                )) : (
                     <div className="text-center p-8 text-text-secondary">
                        <BookOpenIcon className="h-12 w-12 mx-auto mb-4" />
                        <p>No subjects are currently assigned to your class.</p>
                    </div>
                )}
            </div>
        </SectionCard>
    );
};