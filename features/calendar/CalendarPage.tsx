import React, { useState, useMemo } from 'react';
// FIX: Imported shared components from the correct path.
import { SectionCard, Modal, FormField, SelectInput, TextInput } from '../../components/common';
import { useAppContext } from '../../context/AppContext';
import { CalendarEvent } from '../../types';
import { AddIcon } from '../../components/Icons';

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EventPill: React.FC<{ event: CalendarEvent }> = ({ event }) => (
    <div className={`p-1 text-xs rounded truncate ${event.color ? '' : 'bg-blue-500 text-white'}`} style={{ backgroundColor: event.color }}>
        {event.title}
    </div>
);

const AddEventModal = ({ isOpen, onClose, onAddEvent, date }: { isOpen: boolean; onClose: () => void; onAddEvent: (event: Omit<CalendarEvent, 'id'>) => void; date: Date | null; }) => {
    const initialState = { eventType: 'Event' as CalendarEvent['eventType'], title: '', start: date?.toISOString().substring(0, 10) || '', end: date?.toISOString().substring(0, 10) || '', description: '', allDay: true, color: '#0ea5e9' };
    const [event, setEvent] = useState(initialState);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddEvent(event);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Calendar Event">
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormField label="Title" htmlFor="event-title"><TextInput id="event-title" value={event.title} onChange={e => setEvent({...event, title: e.target.value})} required /></FormField>
                <FormField label="Event Type" htmlFor="event-type">
                    <SelectInput id="event-type" value={event.eventType} onChange={e => setEvent({...event, eventType: e.target.value as CalendarEvent['eventType']})}>
                        <option>Event</option><option>Meeting</option><option>Deadline</option><option>Holiday</option><option>Seminar</option><option>Test</option>
                    </SelectInput>
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Start Date" htmlFor="start-date"><TextInput id="start-date" type="date" value={event.start} onChange={e => setEvent({...event, start: e.target.value})} /></FormField>
                    <FormField label="End Date" htmlFor="end-date"><TextInput id="end-date" type="date" value={event.end} onChange={e => setEvent({...event, end: e.target.value})} /></FormField>
                </div>
                <FormField label="Description" htmlFor="event-desc"><textarea id="event-desc" rows={3} className="input-base" value={event.description} onChange={e => setEvent({...event, description: e.target.value})}></textarea></FormField>
                <div className="flex justify-end pt-4"><button type="submit" className="btn-primary">Add Event</button></div>
            </form>
        </Modal>
    );
};


export const CalendarPage = () => {
    const { calendarEvents, handleCreateCalendarEvent } = useAppContext();
    const [view, setView] = useState<'month' | 'week'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const openAddEventModal = (date: Date) => {
        setSelectedDate(date);
        setIsModalOpen(true);
    };

    const monthlyGrid = useMemo(() => {
        const grid = [];
        const startDate = new Date(firstDayOfMonth);
        startDate.setDate(startDate.getDate() - startDate.getDay());

        for (let i = 0; i < 42; i++) {
            const day = new Date(startDate);
            day.setDate(day.getDate() + i);
            const eventsForDay = calendarEvents.filter(e => {
                const eventStart = new Date(e.start);
                const eventEnd = new Date(e.end);
                return day >= new Date(eventStart.toDateString()) && day <= new Date(eventEnd.toDateString());
            });
            grid.push({ day, events: eventsForDay });
        }
        return grid;
    }, [currentDate, calendarEvents]);

    const renderMonthView = () => (
        <div className="grid grid-cols-7">
            {daysOfWeek.map(day => <div key={day} className="text-center font-bold p-2 border-b border-border-primary">{day}</div>)}
            {monthlyGrid.map(({ day, events }, i) => (
                <div key={i} className={`h-32 border border-border-primary p-1 ${day.getMonth() !== currentDate.getMonth() ? 'bg-bg-primary text-text-secondary' : ''}`}>
                    <button onClick={() => openAddEventModal(day)} className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-bg-tertiary">{day.getDate()}</button>
                    <div className="space-y-1 mt-1 overflow-y-auto max-h-20">
                        {/* FIX: Changed EventPill to a React.FC component which correctly handles the 'key' prop. */}
                        {events.map(event => <EventPill key={event.id} event={event} />)}
                    </div>
                </div>
            ))}
        </div>
    );

    const renderWeekView = () => <div className="text-center p-12">Weekly view coming soon!</div>;


    return (
        <div className="space-y-6">
             <AddEventModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAddEvent={handleCreateCalendarEvent} date={selectedDate} />
            <h1 className="text-3xl font-bold">Academic Calendar</h1>
            <SectionCard title="Calendar" actions={
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <button onClick={handlePrevMonth} className="p-2 rounded-md hover:bg-bg-tertiary">&lt;</button>
                        <h3 className="font-bold w-32 text-center">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                        <button onClick={handleNextMonth} className="p-2 rounded-md hover:bg-bg-tertiary">&gt;</button>
                    </div>
                    <div className="bg-bg-tertiary p-1 rounded-lg">
                        <button onClick={() => setView('month')} className={`px-3 py-1 text-sm rounded-md ${view === 'month' ? 'bg-bg-secondary shadow' : ''}`}>Month</button>
                        <button onClick={() => setView('week')} className={`px-3 py-1 text-sm rounded-md ${view === 'week' ? 'bg-bg-secondary shadow' : ''}`}>Week</button>
                    </div>
                    <button onClick={() => openAddEventModal(new Date())} className="btn-primary flex items-center gap-2"><AddIcon />Add Event</button>
                </div>
            }>
                {view === 'month' ? renderMonthView() : renderWeekView()}
            </SectionCard>
        </div>
    );
};

export default CalendarPage;