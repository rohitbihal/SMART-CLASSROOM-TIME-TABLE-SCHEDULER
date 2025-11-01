

import { TimetableEntry } from './types';

// === From constants.ts ===
export const TIME_SLOTS = [
    '09:30-10:20', '10:20-11:10', '11:10-12:00', '12:00-12:50',
    '12:50-01:35', // Lunch
    '01:35-02:20', '02:20-03:05', '03:05-03:50', '03:50-04:35'
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