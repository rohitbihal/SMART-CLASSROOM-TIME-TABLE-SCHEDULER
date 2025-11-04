

import { TimetableEntry, TimePreferences } from './types';

// === From constants.ts ===
export const TIME_SLOTS = [
    '09:30-10:20', '10:20-11:10', '11:10-12:00', '12:00-12:50',
    '12:50-01:35', // Lunch
    '01:35-02:25', '02:25-03:15', '03:15-04:05', '04:05-04:55'
];
export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];


export const MOCK_STUDENT_TIMETABLE: TimetableEntry[] = [
    // FIX: Changed type to 'Theory' to match type definition.
    { day: 'monday', time: '09:30-10:20', subject: 'Data Structures', faculty: 'Dr. Rajesh Kumar', room: 'CS-101', type: 'Theory', className: 'CSE-3-A', classType: 'regular'},
    // FIX: Changed type to 'Theory' to match type definition.
    { day: 'monday', time: '11:10-12:00', subject: 'Algorithms', faculty: 'Dr. Rajesh Kumar', room: 'CS-101', type: 'Theory', className: 'CSE-3-A', classType: 'regular'},
    // FIX: Changed type to 'Lab' to match type definition.
    { day: 'monday', time: '01:35-02:20', subject: 'Data Structures Lab', faculty: 'Dr. Rajesh Kumar', room: 'CS-Lab-1', type: 'Lab', className: 'CSE-3-A', classType: 'fixed'},
    // FIX: Changed type to 'Theory' to match type definition.
    { day: 'tuesday', time: '09:30-10:20', subject: 'Algorithms', faculty: 'Dr. Rajesh Kumar', room: 'CS-101', type: 'Theory', className: 'CSE-3-A', classType: 'regular'},
];
export const MOCK_TEACHER_TIMETABLE: TimetableEntry[] = [
    // FIX: Changed type to 'Theory' to match type definition.
    { day: 'monday', time: '09:30-10:20', subject: 'Data Structures', className: 'CSE-3-A', room: 'CS-101', type: 'Theory', faculty: 'Dr. Rajesh Kumar', classType: 'regular' },
    // FIX: Changed type to 'Theory' to match type definition.
    { day: 'monday', time: '10:20-11:10', subject: 'Data Structures', className: 'CSE-3-B', room: 'CS-102', type: 'Theory', faculty: 'Dr. Rajesh Kumar', classType: 'regular' },
    // FIX: Changed type to 'Theory' to match type definition.
    { day: 'monday', time: '11:10-12:00', subject: 'Algorithms', className: 'CSE-3-A', room: 'CS-101', type: 'Theory', faculty: 'Dr. Rajesh Kumar', classType: 'regular' },
];


export const calculateTimeSlots = (prefs: TimePreferences): string[] => {
    if (!prefs || !prefs.startTime || !prefs.endTime) return [];
    
    const timeToMinutes = (time: string): number => {
        if (!time || !time.includes(':')) return 0;
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const minutesToTime = (minutes: number): string => {
        const h = Math.floor(minutes / 60).toString().padStart(2, '0');
        const m = (minutes % 60).toString().padStart(2, '0');
        return `${h}:${m}`;
    };

    const slots: string[] = [];
    let currentTime = timeToMinutes(prefs.startTime);
    const endTime = timeToMinutes(prefs.endTime);
    const lunchStart = timeToMinutes(prefs.lunchStartTime);
    const lunchEnd = lunchStart + prefs.lunchDurationMinutes;

    while (currentTime < endTime) {
        const slotEnd = currentTime + prefs.slotDurationMinutes;

        // Check if the proposed slot overlaps with lunch
        const startsDuringLunch = currentTime >= lunchStart && currentTime < lunchEnd;
        const endsDuringLunch = slotEnd > lunchStart && slotEnd <= lunchEnd;
        const spansOverLunch = currentTime < lunchStart && slotEnd > lunchEnd;

        if (startsDuringLunch || endsDuringLunch || spansOverLunch) {
            // If the current time is before lunch, jump to the end of lunch
            if (currentTime < lunchStart) {
                currentTime = lunchEnd;
            } else { // If the current time is already in lunch, jump to the end
                currentTime = lunchEnd;
            }
            continue; 
        }

        if (slotEnd > endTime) {
            break; // Don't add slots that go past the end time
        }
        
        slots.push(`${minutesToTime(currentTime)}-${minutesToTime(slotEnd)}`);
        currentTime = slotEnd;
    }
    return slots;
};