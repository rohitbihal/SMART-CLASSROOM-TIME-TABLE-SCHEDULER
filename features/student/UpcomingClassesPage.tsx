import React, { useMemo } from 'react';
import { SectionCard } from '../../App';
import { useAppContext } from '../../context/AppContext';
import { TimetableEntry } from '../../types';
import { ClockIcon } from '../../components/Icons';

export const UpcomingClassesPage = () => {
    const { timetable } = useAppContext();

    const upcomingClasses = useMemo(() => {
        const today = new Date().toLocaleString('en-us', { weekday: 'long' }).toLowerCase();
        // In a real app, you'd also filter by time to only show classes remaining in the day.
        return timetable
            .filter(entry => entry.day.toLowerCase() === today)
            .sort((a, b) => a.time.localeCompare(b.time));
    }, [timetable]);

    return (
        <SectionCard title="Today's Upcoming Classes">
            {upcomingClasses.length > 0 ? (
                <div className="space-y-4">
                    {upcomingClasses.map((entry, index) => (
                        <div key={index} className="flex items-center gap-4 p-4 bg-bg-tertiary rounded-lg">
                            <div className="w-24 text-center">
                                <p className="font-bold text-lg">{entry.time.split('-')[0]}</p>
                                <p className="text-xs text-text-secondary">{entry.time.split('-')[1]}</p>
                            </div>
                            <div className="flex-grow border-l-2 border-blue-500 pl-4">
                                <h3 className="font-semibold">{entry.subject}</h3>
                                <p className="text-sm text-text-secondary">Room: {entry.room} | Faculty: {entry.faculty}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center p-8 text-text-secondary">
                    <ClockIcon className="h-12 w-12 mx-auto mb-4" />
                    <p>No more classes scheduled for today!</p>
                </div>
            )}
        </SectionCard>
    );
};