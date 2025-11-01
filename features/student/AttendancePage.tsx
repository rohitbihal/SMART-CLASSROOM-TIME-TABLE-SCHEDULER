import React from 'react';
import { SectionCard } from '../../components/common';
import { useAppContext } from '../../context/AppContext';
import { StudentAttendance } from '../../types';
import { AttendanceIcon } from '../../components/Icons';

const AttendanceBar = ({ record }: { record: StudentAttendance }) => {
    const percentage = record.total > 0 ? (record.attended / record.total) * 100 : 0;
    const barColor = percentage >= 75 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500';

    return (
        <div className="bg-bg-tertiary p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <p className="font-bold">{record.subjectName}</p>
                    <p className="text-xs text-text-secondary">{record.subjectCode}</p>
                </div>
                <div className="text-right">
                    <p className={`text-xl font-bold ${percentage < 75 ? 'text-red-500' : 'text-green-500'}`}>{percentage.toFixed(1)}%</p>
                    <p className="text-xs text-text-secondary">{record.attended} / {record.total} classes</p>
                </div>
            </div>
            <div className="w-full bg-bg-primary rounded-full h-2.5">
                <div className={`${barColor} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

export const AttendancePage = () => {
    const { studentAttendance } = useAppContext();
    
    return (
        <SectionCard title="My Attendance">
            {studentAttendance.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {studentAttendance.map(record => (
                        <AttendanceBar key={record.subjectId} record={record} />
                    ))}
                </div>
            ) : (
                <div className="text-center p-8 text-text-secondary">
                    <AttendanceIcon className="h-12 w-12 mx-auto mb-4" />
                    <p>Your attendance records are not yet available.</p>
                </div>
            )}
        </SectionCard>
    );
};