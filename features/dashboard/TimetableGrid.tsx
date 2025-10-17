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
    const getEntry = (day: string, time: string) => timetable.