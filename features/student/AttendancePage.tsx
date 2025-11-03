import React, { useState, useMemo } from 'react';
import { SectionCard, TextInput } from '../../components/common';
import { useAppContext } from '../../context/AppContext';
import { StudentAttendance, TimetableEntry } from '../../types';
import { AttendanceIcon } from '../../components/Icons';

const AttendanceBar: React.FC<{ record: StudentAttendance }> = ({ record }) => {
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

const DailyStatusCard: React.FC<{ record: TimetableEntry & { attendanceStatus: 'Present' | 'Absent' | 'Not Marked' } }> = ({ record }) => {
    const statusStyles = {
        'Present': 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
        'Absent': 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
        'Not Marked': 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    };
    
    return (
        <div className="flex items-center gap-4 p-4 bg-bg-tertiary rounded-lg">
            <div className="w-24 text-center">
                <p className="font-bold text-lg">{record.time.split('-')[0]}</p>
                <p className="text-xs text-text-secondary">{record.time.split('-')[1]}</p>
            </div>
            <div className="flex-grow border-l-2 border-accent-primary pl-4">
                <h3 className="font-semibold">{record.subject}</h3>
                <p className="text-sm text-text-secondary">Faculty: {record.faculty}</p>
            </div>
            <div className={`px-3 py-1 text-sm font-bold rounded-full ${statusStyles[record.attendanceStatus]}`}>
                {record.attendanceStatus}
            </div>
        </div>
    );
};

export const AttendancePage = () => {
    const { user, students, classes, subjects, timetable, attendance } = useAppContext();
    const [viewMode, setViewMode] = useState<'summary' | 'daily'>('summary');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const studentProfile = useMemo(() => students.find(s => s.id === user?.profileId), [students, user]);
    const classProfile = useMemo(() => classes.find(c => c.id === studentProfile?.classId), [classes, studentProfile]);

    const overallAttendance = useMemo((): StudentAttendance[] => {
        if (!studentProfile || !classProfile) return [];
        const classAttendanceRecords = attendance[classProfile.id];
        if (!classAttendanceRecords) return [];

        const studentSubjects = subjects.filter(s => s.department === classProfile.branch && s.forClass === classProfile.name);

        const stats = studentSubjects.map(subject => {
            let attended = 0;
            let total = 0;
            
            for (const date in classAttendanceRecords) {
                const dayOfWeek = new Date(date + 'T00:00:00').toLocaleString('en-us', { weekday: 'long' }).toLowerCase();
                const studentStatus = classAttendanceRecords[date]?.[studentProfile.id];

                if (studentStatus && studentStatus !== 'unmarked') {
                    const scheduledCount = timetable.filter(t => 
                        t.className === classProfile.name && 
                        t.subject === subject.name &&
                        t.day.toLowerCase() === dayOfWeek
                    ).length;

                    if (scheduledCount > 0) {
                        total += scheduledCount;
                        if (String(studentStatus).startsWith('present')) {
                            attended += scheduledCount;
                        }
                    }
                }
            }
            return {
                subjectId: subject.id,
                subjectName: subject.name,
                subjectCode: subject.code,
                attended,
                total,
            };
        });

        return stats;
    }, [studentProfile, classProfile, attendance, subjects, timetable]);

    const dailyAttendance = useMemo(() => {
        if (!studentProfile || !classProfile) return [];
        const dayOfWeek = new Date(selectedDate + 'T00:00:00').toLocaleString('en-us', { weekday: 'long' }).toLowerCase();
        
        const classesOnDay = timetable
            .filter(t => t.className === classProfile.name && t.day.toLowerCase() === dayOfWeek)
            .sort((a,b) => a.time.localeCompare(b.time));

        const studentStatusForDay = attendance[classProfile.id]?.[selectedDate]?.[studentProfile.id] || 'unmarked';
        
        return classesOnDay.map(scheduledClass => {
            let status: 'Present' | 'Absent' | 'Not Marked' = 'Not Marked';
            if (studentStatusForDay !== 'unmarked') {
                status = String(studentStatusForDay).startsWith('present') ? 'Present' : 'Absent';
            }
            
            return {
                ...scheduledClass,
                attendanceStatus: status
            };
        });
    }, [studentProfile, classProfile, selectedDate, timetable, attendance]);
    
    const viewToggle = (
        <div className="bg-bg-tertiary p-1 rounded-lg">
          <button onClick={() => setViewMode('summary')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${viewMode === 'summary' ? 'bg-bg-secondary shadow' : 'bg-transparent'}`}>Overall Summary</button>
          <button onClick={() => setViewMode('daily')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${viewMode === 'daily' ? 'bg-bg-secondary shadow' : 'bg-transparent'}`}>Daily View</button>
        </div>
      );

    return (
        <SectionCard title="My Attendance" actions={viewToggle}>
            {viewMode === 'summary' && (
                <>
                    {overallAttendance.length > 0 && overallAttendance.some(s => s.total > 0) ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {overallAttendance.filter(s => s.total > 0).map(record => (
                                <AttendanceBar key={record.subjectId} record={record} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center p-8 text-text-secondary">
                            <AttendanceIcon className="h-12 w-12 mx-auto mb-4" />
                            <p>Your attendance records are not yet available.</p>
                        </div>
                    )}
                </>
            )}

            {viewMode === 'daily' && (
                <div>
                    <div className="mb-4">
                        <label htmlFor="attendance-date" className="block text-sm font-medium text-text-secondary mb-1">Select Date</label>
                        <TextInput type="date" id="attendance-date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="max-w-xs" />
                    </div>
                    {dailyAttendance.length > 0 ? (
                        <div className="space-y-4">
                            {dailyAttendance.map((record, index) => (
                                <DailyStatusCard key={`${record.day}-${record.time}-${index}`} record={record} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center p-8 text-text-secondary">
                            <AttendanceIcon className="h-12 w-12 mx-auto mb-4" />
                            <p>No classes were scheduled for you on this day.</p>
                        </div>
                    )}
                </div>
            )}
        </SectionCard>
    );
};
