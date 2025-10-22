import React, { useState, useEffect } from 'react';
import { SectionCard } from '../../App';
import { useAppContext } from '../../context/AppContext';
import { DAYS, TIME_SLOTS } from '../../constants';
import { SaveIcon } from '../../components/Icons';

export const AvailabilityPage = () => {
    const { user, faculty, handleUpdateTeacherAvailability } = useAppContext();
    const teacherProfile = faculty.find(f => f.id === user?.profileId);
    
    const [availability, setAvailability] = useState<{ [day: string]: string[] }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        if (teacherProfile?.availability) {
            setAvailability(teacherProfile.availability);
        } else {
            // Initialize with empty arrays for all working days if no availability is set
            const initialAvail = DAYS.reduce((acc, day) => {
                acc[day] = [];
                return acc;
            }, {} as { [day: string]: string[] });
            setAvailability(initialAvail);
        }
    }, [teacherProfile]);

    const handleToggle = (day: string, timeSlot: string) => {
        setAvailability(prev => {
            const daySlots = prev[day] || [];
            const newDaySlots = daySlots.includes(timeSlot)
                ? daySlots.filter(slot => slot !== timeSlot)
                : [...daySlots, timeSlot];
            return { ...prev, [day]: newDaySlots };
        });
    };

    const handleSubmit = async () => {
        if (!teacherProfile) return;
        setIsLoading(true);
        setFeedback('');
        try {
            await handleUpdateTeacherAvailability(teacherProfile.id, availability);
            setFeedback('Availability updated successfully!');
            setTimeout(() => setFeedback(''), 3000);
        } catch (error) {
            setFeedback('Failed to update availability.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SectionCard title="Set Your Availability">
            <p className="text-text-secondary mb-6">Update your availability for the upcoming week. This helps administrators schedule your classes optimally. Checked boxes indicate you are available.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {DAYS.map(day => (
                    <div key={day} className="p-4 border border-border-primary rounded-lg bg-bg-secondary">
                        <h3 className="font-bold capitalize text-lg mb-3">{day}</h3>
                        <div className="space-y-2">
                            {TIME_SLOTS.map(slot => (
                                <label key={slot} className="flex items-center gap-3 p-2 rounded-md hover:bg-bg-tertiary cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={(availability[day] || []).includes(slot)}
                                        onChange={() => handleToggle(day, slot)}
                                    />
                                    <span className="text-sm font-mono">{slot}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 flex justify-end items-center gap-4">
                {feedback && <p className="text-sm font-semibold text-green-600 dark:text-green-400">{feedback}</p>}
                <button
                    onClick={handleSubmit}
                    className="btn-primary flex items-center gap-2 w-48 justify-center"
                    disabled={isLoading}
                >
                    <SaveIcon />
                    {isLoading ? 'Updating...' : 'Update Availability'}
                </button>
            </div>
        </SectionCard>
    );
};