import React from 'react';
import { SectionCard } from '../../components/common';
import { useAppContext } from '../../context/AppContext';
import { AttendanceStatus } from '../../types';


// This is a placeholder component for the Teacher's Attendance Page.
// A full implementation would involve fetching assigned classes,
// students, and attendance data specific to this teacher.
export const TeacherAttendancePage = () => {
    const { user, faculty } = useAppContext();
    const teacherProfile = faculty.find(f => f.id === user?.profileId);

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        // In a real implementation, this would trigger a state update and API call.
        // For now, it shows an alert for locked records.
        alert(`Attendance interaction for student ${studentId}. In a real app, this would be saved.`);
    };

    const handleLockedClick = () => {
        alert("This attendance record has been locked by an administrator and cannot be changed.");
    }

    return (
        <SectionCard title={`Attendance Management for ${teacherProfile?.name || 'Teacher'}`}>
            <div className="p-4">
                 <p className="text-text-secondary mb-4">Select a class and date to view or modify attendance. Records locked by an admin cannot be changed.</p>
                
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <select className="input-base">
                        <option>Select a Class...</option>
                        <option>CSE-3-A</option>
                        <option>CSE-3-B</option>
                    </select>
                    <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="input-base" />
                </div>

                <div className="bg-yellow-100 dark:bg-yellow-900/50 border border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded-lg my-4" role="alert">
                    <p><span className="font-bold">Note:</span> A student flagged with "Suggested Present" by the admin requires your confirmation. Click the "P" to confirm their attendance.</p>
                </div>

                {/* Mock student list */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 bg-bg-tertiary rounded-lg">
                        <div>
                            <p className="font-semibold">Alice Sharma</p>
                            <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Admin Suggested Present</p>
                        </div>
                        <div className="flex gap-2">
                             <button onClick={() => handleStatusChange('st1', 'present')} className="px-3 py-1.5 text-sm font-bold rounded-md bg-yellow-400 hover:bg-yellow-500 text-black">Confirm P</button>
                             <button onClick={() => handleStatusChange('st1', 'absent')} className="px-3 py-1.5 text-sm font-bold rounded-md bg-gray-300 dark:bg-slate-600">Mark A</button>
                        </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-bg-tertiary rounded-lg">
                         <div>
                            <p className="font-semibold">Bob Singh</p>
                             <p className="text-xs text-green-600 dark:text-green-400 font-medium">Present (Locked by Admin)</p>
                        </div>
                        <div className="flex gap-2">
                             <button onClick={handleLockedClick} className="px-3 py-1.5 text-sm font-bold rounded-md bg-green-600 text-white cursor-not-allowed" disabled>P</button>
                             <button onClick={handleLockedClick} className="px-3 py-1.5 text-sm font-bold rounded-md bg-gray-300 dark:bg-slate-600 cursor-not-allowed" disabled>A</button>
                        </div>
                    </div>
                </div>

            </div>
        </SectionCard>
    );
};