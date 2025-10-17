import React from 'react';
import { DAYS, TIME_SLOTS } from '../../constants';
import { TimetableEntry } from '../../types';
import { SchedulerIcon } from '../../components/Icons';

export const TimetableGrid = ({ timetable, role = 'student' }: { timetable: TimetableEntry[], role?: 'student' | 'teacher' }) => {
    if (!timetable || timetable.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-800 border-2 border-dashed border-gray-300 dark:border-slate-700 p-8 rounded-2xl text-center min-h-[500px] flex flex-col justify-center items-center">
                <SchedulerIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold">Timetable Not Available</h3>
                <p className="text-gray-500 mt-2">Your schedule will appear here once it has been published by the admin.</p>
            </div>
        );
    }
    const getEntry = (day: string, time: string) => timetable.find(e => e.day.toLowerCase() === day.toLowerCase() && e.time === time);
    const cellBgColor = role === 'teacher' ? 'bg-green-500' : 'bg-indigo-500';
    return (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-4 sm:p-6 rounded-2xl shadow-md overflow-x-auto">
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr>
                        <th className="p-3 font-semibold text-left text-gray-600 dark:text-gray-300 border-b-2 dark:border-slate-700">Time</th>
                        {DAYS.map(day => <th key={day} className="p-3 font-semibold text-center capitalize text-gray-600 dark:text-gray-300 border-b-2 dark:border-slate-700">{day}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {TIME_SLOTS.map(time => (
                        <tr key={time} className="dark:text-gray-200">
                            <td className="p-3 font-medium border-b dark:border-slate-700 whitespace-nowrap">{time}</td>
                            {DAYS.map(day => {
                                const entry = getEntry(day, time);
                                return (
                                    <td key={day} className="p-2 border-b dark:border-slate-700 text-center">
                                        {entry ? (
                                            <div className={`p-2.5 rounded-lg text-white text-xs ${cellBgColor}`}>
                                                <div className="font-bold">{entry.subject}</div>
                                                <div className="opacity-80">{role === 'teacher' ? entry.className : entry.faculty}</div>
                                                <div className="opacity-80">Room: {entry.room}</div>
                                            </div>
                                        ) : (time === '12:50-01:35' ? <div className="text-gray-400 text-xs">Lunch</div> : null)}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};