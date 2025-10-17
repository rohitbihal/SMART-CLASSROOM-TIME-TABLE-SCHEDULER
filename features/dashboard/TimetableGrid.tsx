
import React, { useMemo } from 'react';
import { DAYS, TIME_SLOTS } from '../../constants';
import { TimetableEntry, Constraints } from '../../types';
import { SchedulerIcon } from '../../components/Icons';

// Helper function to find a timetable entry for a specific day and time.
const getEntryForSlot = (timetable: TimetableEntry[], day: string, time: string): TimetableEntry | undefined => {
    return timetable.find(e => e.day.toLowerCase() === day.toLowerCase() && e.time === time);
};

// A dedicated component for rendering a single cell in the timetable.
const TimetableCell = ({ entry, time, role, day, lunchSlot }: { entry: TimetableEntry | undefined; time: string; role: 'student' | 'teacher', day: string; lunchSlot: string; }) => {
    // Special styling and content for the lunch break slot.
    if (time === lunchSlot) {
        return (
            <td key={`${day}-lunch`} className="p-3 border-b dark:border-slate-700 text-center bg-gray-100 dark:bg-slate-900/50 font-semibold">
                Lunch Break
            </td>
        );
    }

    // Default cell styling for regular class slots.
    return (
        <td key={day} className="p-1 border-b dark:border-slate-700 align-top">
            {entry && (
                <div className="p-2 rounded-lg text-white bg-indigo-500">
                    <div className="font-bold">{entry.subject}</div>
                    <div className="text-xs opacity-80">{role === 'student' ? entry.faculty : entry.className}</div>
                    <div className="text-xs opacity-80">Room: {entry.room}</div>
                </div>
            )}
        </td>
    );
};


export const TimetableGrid = ({ timetable, role = 'student', constraints }: { timetable: TimetableEntry[], role?: 'student' | 'teacher', constraints: Constraints | null }) => {
    if (!timetable || timetable.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-800 border-2 border-dashed border-gray-300 dark:border-slate-700 p-8 rounded-2xl text-center min-h-[500px] flex flex-col justify-center items-center">
                <SchedulerIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold">Timetable Not Available</h3>
                <p className="text-gray-500 mt-2">Your schedule will appear here once it has been published by the admin.</p>
            </div>
        );
    }

    const lunchSlot = useMemo(() => {
        if (constraints?.timePreferences) {
            const { lunchStartTime, lunchDurationMinutes } = constraints.timePreferences;
            const [hours, minutes] = lunchStartTime.split(':').map(Number);
            const startTotalMinutes = hours * 60 + minutes;
            const endTotalMinutes = startTotalMinutes + lunchDurationMinutes;
            const endHours = Math.floor(endTotalMinutes / 60).toString().padStart(2, '0');
            const endMinutes = (endTotalMinutes % 60).toString().padStart(2, '0');
            return `${lunchStartTime}-${endHours}:${endMinutes}`;
        }
        // Fallback to the constant if constraints are not available
        return '12:50-01:35';
    }, [constraints]);
    
    return (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr>
                            <th className="p-3 font-bold uppercase text-gray-600 dark:text-gray-300 border-b-2 dark:border-slate-600">Time</th>
                            {DAYS.map(day => <th key={day} className="p-3 font-bold uppercase text-gray-600 dark:text-gray-300 border-b-2 dark:border-slate-600 text-center capitalize">{day}</th>)}
                        </tr>
                    </thead>
                    <tbody className="text-gray-700 dark:text-gray-200">
                        {TIME_SLOTS.map(time => (
                            <tr key={time}>
                                <td className="p-3 border-b dark:border-slate-700 font-medium whitespace-nowrap">{time}</td>
                                {DAYS.map(day => (
                                    <TimetableCell
                                        key={`${day}-${time}`}
                                        day={day}
                                        time={time}
                                        entry={getEntryForSlot(timetable, day, time)}
                                        role={role}
                                        lunchSlot={lunchSlot}
                                    />
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};