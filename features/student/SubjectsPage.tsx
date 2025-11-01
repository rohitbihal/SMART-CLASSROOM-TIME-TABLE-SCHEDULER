import React from 'react';
import { SectionCard } from '../../App';
import { useAppContext } from '../../context/AppContext';
import { BookOpenIcon } from '../../components/Icons';

export const SubjectsPage = () => {
    const { subjects, faculty, user } = useAppContext();

    // In a real app, this would be filtered based on the logged-in student's enrollment.
    // For this mock, we assume the student is in a class that takes all subjects from the faculty's department.
    const studentProfile = useAppContext().students.find(s => s.id === user?.profileId);
    const classProfile = useAppContext().classes.find(c => c.id === studentProfile?.classId);
    const studentSubjects = subjects.filter(s => s.department === classProfile?.branch);
    
    return (
        <SectionCard title="My Subjects">
            <div className="space-y-4">
                {studentSubjects.length > 0 ? studentSubjects.map(subject => {
                    const assignedFaculty = faculty.find(f => f.id === subject.assignedFacultyId);
                    return (
                        <div key={subject.id} className="p-4 bg-bg-tertiary rounded-lg flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg">{subject.name} ({subject.code})</h3>
                                <p className="text-sm text-text-secondary">Faculty: {assignedFaculty?.name || 'N/A'}</p>
                            </div>
                            <button className="btn-secondary text-sm">
                                View Materials
                            </button>
                        </div>
                    );
                }) : (
                     <div className="text-center p-8 text-text-secondary">
                        <BookOpenIcon className="h-12 w-12 mx-auto mb-4" />
                        <p>No subjects are currently assigned to your class.</p>
                    </div>
                )}
            </div>
        </SectionCard>
    );
};