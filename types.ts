// === From types.ts ===
export interface Class {
  id: string;
  name: string;
  branch: string;
  year: number;
  section: string;
  studentCount: number;
}

export interface Faculty {
  id: string;
  name: string;
  department: string;
  specialization: string[];
  email: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  type?: 'theory' | 'lab';
  hoursPerWeek: number;
  assignedFacultyId: string;
}

export interface Room {
  id: string;
  number: string;
  type: 'classroom' | 'lab';
  capacity: number;
}

export interface Student {
  id: string;
  name: string;
  email?: string;
  classId: string;
  roll?: string;
}

export interface TimetableEntry {
  className: string;
  subject: string;
  faculty: string;
  room: string;
  day: string;
  time: string;
  type: 'theory' | 'lab';
}

export interface ChatMessage {
  id: string;
  author: string;
  role: 'student' | 'teacher' | 'admin';
  text: string;
  timestamp: number;
  classId: string; // To scope messages to a class
  channel: string; // To support different channels like 'query', 'attendance'
}

export interface NonConsecutiveConstraint {
    id: number;
    type: 'nonConsecutive';
    classId: string;
    subjectId1: string;
    subjectId2: string;
}
export interface PreferredTimeConstraint {
    id: number;
    type: 'preferredTime';
    classId: string;
    day: string;
    timePreference: 'morning' | 'afternoon';
}
export interface FacultyAvailabilityConstraint {
    id: number;
    type: 'facultyAvailability';
    facultyId: string;
    day: string;
    timeSlot: string;
}
export type ClassSpecificConstraint = NonConsecutiveConstraint | PreferredTimeConstraint | FacultyAvailabilityConstraint;
export interface Constraints {
    maxConsecutiveClasses: number;
    workingDays: string[];
    lunchBreak: string;
    chatWindow?: { start: string; end: string; };
    classSpecific: ClassSpecificConstraint[];
    maxConcurrentClassesPerDept: { [department: string]: number };
}

// Attendance Types
export type AttendanceStatus = 'present' | 'absent';
export type AttendanceRecord = { [studentId: string]: AttendanceStatus };
export type Attendance = { [classId: string]: { [date: string]: AttendanceRecord } };