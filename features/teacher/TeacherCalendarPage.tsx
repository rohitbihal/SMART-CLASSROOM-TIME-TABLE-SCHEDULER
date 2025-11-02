import React, { useState, useMemo } from 'react';
import { SectionCard } from '../../components/common';
import { useAppContext } from '../../context/AppContext';
import { CalendarEvent } from '../../types';

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EventPill: React.FC<{ event: CalendarEvent & { eventSource?: 'calendar' | 'timetable' } }> = ({ event }) => {
    const defaultColor = event.eventSource === 'timetable' ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white';
    return (
        <div className={`p-1 text-xs rounded truncate ${event.color ? '' : defaultColor}`} style={{ backgroundColor: event.color }}>
            {event.title}
        </div>
    );
};

const TeacherCalendarPage = () => {
    const { calendarEvents, timetable, user, faculty } = useAppContext();
    const [currentDate, setCurrentDate] = useState(new Date());

    const teacherProfile = faculty.find(f => f.id === user?.profileId);

    const combinedEvents = useMemo(() => {
        const academicEvents: (CalendarEvent & { eventSource: 'calendar' })[] = calendarEvents.map(e => ({ ...e, eventSource: 'calendar' }));
        
        const teacherTimetable = timetable.filter(t => t.faculty === teacherProfile?.name);

        const classEvents: (CalendarEvent & { eventSource: 'timetable', dayOfWeek: string, time: string })[] = teacherTimetable.map(t => ({
            id: `tt-${t.day}-${t.time}-${t.className}`,
            eventType: 'Class',
            title: `${t.subject} (${t.className})`,
            start: '', 
            end: '',  
            description: `in ${t.room}`,
            dayOfWeek: t.day.toLowerCase(),
            time: t.time,
            eventSource: 'timetable'
        }));

        return { academicEvents, classEvents };
    }, [calendarEvents, timetable, teacherProfile]);

    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const monthlyGrid = useMemo(() => {
        const grid = [];
        const startDate = new Date(firstDayOfMonth);
        startDate.setDate(startDate.getDate() - startDate.getDay());

        for (let i = 0; i < 42; i++) {
            const day = new Date(startDate);
            day.setDate(day.getDate() + i);
            
            const eventsForDay = combinedEvents.academicEvents.filter(e => {
                const eventStart = new Date(e.start);
                const eventEnd = new Date(e.end);
                return day >= new Date(eventStart.toDateString()) && day <= new Date(eventEnd.toDateString());
            });

            const dayOfWeekName = day.toLocaleString('en-us', { weekday: 'long' }).toLowerCase();
            const timetableForDay = combinedEvents.classEvents.filter(t => t.dayOfWeek === dayOfWeekName);
            
            grid.push({ day, events: [...eventsForDay, ...timetableForDay] });
        }
        return grid;
    }, [currentDate, combinedEvents, firstDayOfMonth]);
    
    return (
        <SectionCard title="My Calendar" actions={
            <div className="flex items-center gap-2">
                <button onClick={handlePrevMonth} className="p-2 rounded-md hover:bg-bg-tertiary">&lt;</button>
                <h3 className="font-bold w-32 text-center">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                <button onClick={handleNextMonth} className="p-2 rounded-md hover:bg-bg-tertiary">&gt;</button>
            </div>
        }>
            <div className="grid grid-cols-7">
                {daysOfWeek.map(day => <div key={day} className="text-center font-bold p-2 border-b border-border-primary">{day}</div>)}
                {monthlyGrid.map(({ day, events }, i) => (
                    <div key={i} className={`h-32 border border-border-primary p-1 overflow-hidden ${day.getMonth() !== currentDate.getMonth() ? 'bg-bg-primary text-text-secondary' : ''}`}>
                        <div className="h-6 w-6 flex items-center justify-center rounded-full">{day.getDate()}</div>
                        <div className="space-y-1 mt-1 overflow-y-auto max-h-20">
                            {events.map(event => <EventPill key={event.id} event={event} />)}
                        </div>
                    </div>
                ))}
            </div>
        </SectionCard>
    );
};

export default TeacherCalendarPage;
