import React, { useMemo } from 'react';
import { DAYS, TIME_SLOTS, calculateTimeSlots } from '../../constants';
import { TimetableEntry, Constraints } from '../../types';
import { SchedulerIcon } from '../../components/Icons';

// Helper function to find timetable entries for a specific day and time.
const getEntriesForSlot = (timetable: TimetableEntry[], day: string, time: string): TimetableEntry[] => {
    return timetable.filter(e => e.day.toLowerCase() === day.toLowerCase() && e.time === time);
};

// A dedicated component for rendering a single cell in the timetable.
// FIX: Changed to React.FC to handle 'key' prop issue in TypeScript.
const TimetableCell: React.FC<{ entry: TimetableEntry; viewType: 'class' | 'faculty' | 'room' | 'student' | 'teacher' }> = ({ entry, viewType }) => {
    const details = useMemo(() => {
        if (!entry) return null;
        switch (viewType) {
            case 'faculty':
                return <><div className="text-xs opacity-80 mt-1">{entry.className}</div><div className="text-xs opacity-80">Room: {entry.room}</div></>;
            case 'room':
                return <><div className="text-xs opacity-80 mt-1">{entry.className}</div><div className="text-xs opacity-80">{entry.faculty}</div></>;
            case 'class':
            case 'student':
            case 'teacher':
            default:
                return <><div className="text-xs opacity-80 mt-1">{viewType === 'student' || viewType === 'class' ? entry.faculty : entry.className}</div><div className="text-xs opacity-80">Room: {entry.room}</div></>;
        }
    }, [entry, viewType]);

    return (
        <div className={`p-2.5 rounded-lg h-full flex flex-col justify-center ${entry.classType === 'fixed' ? 'timetable-cell-fixed' : 'timetable-cell-regular'}`}>
            <div className="font-bold text-sm">{entry.subject}</div>
            {details}
        </div>
    );
};


const TimetableGrid = ({ timetable, role = 'student', constraints, viewType = 'class', title }: { timetable: TimetableEntry[], role?: 'student' | 'teacher', constraints: Constraints | null, viewType?: 'class' | 'faculty' | 'room' | 'student' | 'teacher', title?: string }) => {
    
    const timeSlots = useMemo(() => {
        if (!constraints?.timePreferences) {
            return TIME_SLOTS; // Fallback to constant if constraints aren't available
        }
        return calculateTimeSlots(constraints.timePreferences);
    }, [constraints]);

    if (!timetable || timetable.length === 0) {
        return (
            <div className="bg-bg-secondary border-2 border-dashed border-border-primary p-8 rounded-xl text-center min-h-[500px] flex flex-col justify-center items-center">
                <SchedulerIcon className="h-12 w-12 text-text-secondary mx-auto mb-4" />
                <h3 className="text-xl font-bold">{title || "Timetable Not Available"}</h3>
                <p className="text-text-secondary mt-2">{title ? "No entries for this selection." : "Your schedule will appear here once it has been published by the admin."}</p>
            </div>
        );
    }

    return (
        <div className="card-base p-0">
            {title && <h3 className="text-xl font-bold p-4 border-b border-border-primary">{title}</h3>}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr>
                            <th className="p-3 font-semibold text-text-secondary border-b-2 border-border-primary w-32">Time</th>
                            {DAYS.map(day => <th key={day} className="p-3 font-semibold text-text-secondary border-b-2 border-border-primary text-center capitalize">{day}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {timeSlots.map(time => (
                            <tr key={time}>
                                <td className="p-3 border border-border-primary font-semibold whitespace-nowrap text-center">{time}</td>
                                {DAYS.map(day => {
                                    const entries = getEntriesForSlot(timetable, day, time);
                                    return (
                                        <td key={day} className="p-1.5 border border-border-primary align-top h-24">
                                            <div className="space-y-1">
                                                {entries.map((entry, idx) => (
                                                    <TimetableCell key={idx} entry={entry} viewType={viewType || role} />
                                                ))}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TimetableGrid;