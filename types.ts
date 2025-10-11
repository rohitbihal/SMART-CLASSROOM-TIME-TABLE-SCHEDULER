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

export interface TimetableEntry {
  className: string;
  subject: string;
  faculty: string;
  room: string;
  day: string;
  time: string;
  type: 'theory' | 'lab';
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
    details: string;
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
    classSpecific: ClassSpecificConstraint[];
    maxConcurrentClassesPerDept: { [department: string]: number };
}
