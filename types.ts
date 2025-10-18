// === From types.ts ===
export interface Class {
  id: string;
  name: string;
  branch: string;
  year: number;
  section: string;
  studentCount: number;
  block?: string;
}

export interface Faculty {
  id:string;
  name: string;
  department: string;
  specialization: string[];
  email: string;
}

export interface Subject {
  id:string;
  name: string;
  code: string;
  department: string;
  type?: 'theory' | 'lab';
  hoursPerWeek: number;
  assignedFacultyId: string;
}

export interface Room {
  id: string;
  number: string;
  type: 'classroom' | 'lab';
  capacity: number;
  block?: string;
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

export interface TimePreferences {
  workingDays: string[];
  startTime: string; // e.g., "09:00"
  endTime: string;   // e.g., "17:00"
  lunchStartTime: string; // e.g., "13:00"
  lunchDurationMinutes: number;
  slotDurationMinutes: number;
}

export interface FacultyPreference {
  facultyId: string;
  unavailability?: { day: string; timeSlot: string }[];
  preferredDays?: string[];
  dailySchedulePreference?: 'morning' | 'afternoon' | 'none';
  maxConsecutiveClasses?: 1 | 2 | 3 | 4;
  gapPreference?: 'back-to-back' | 'one-hour-gap';
  coursePreferences?: { subjectId: string; time: 'morning' | 'afternoon' }[];
}

export interface RoomResourceConstraint {
  subjectRoomTypeRules?: { subjectId: string; roomType: 'classroom' | 'lab' }[];
  prioritizeSameRoomForConsecutive?: boolean;
  resourceRequirements?: { subjectId: string, resource: string }[];
}

export interface StudentSectionConstraint {
  maxConsecutiveClasses?: number;
  coreSubjectIds?: string[];
  avoidConsecutiveCore?: boolean;
}

export interface AdvancedConstraint {
  enableFacultyLoadBalancing?: boolean;
  blockPeriodRules?: { subjectId: string; periods: 2 | 3 }[];
  coLocationRules?: { classId: string; facultyIds: [string, string] }[];
  travelTimeMinutes?: number;
}

// FIX: Added a dedicated type for institution details to ensure it's saved correctly.
export interface InstitutionDetails {
    name: string;
    academicYear: string;
    semester: 'Odd' | 'Even';
    session: 'Regular' | 'Summer School' | 'Winter School';
}

export interface Constraints {
    maxConsecutiveClasses: number;
    timePreferences: TimePreferences;
    chatWindow?: { start: string; end: string; };
    classSpecific: ClassSpecificConstraint[];
    maxConcurrentClassesPerDept: { [department: string]: number };
    facultyPreferences?: FacultyPreference[];
    roomResourceConstraints?: RoomResourceConstraint;
    studentSectionConstraints?: StudentSectionConstraint;
    advancedConstraints?: AdvancedConstraint;
    institutionDetails?: InstitutionDetails;
}

// Teacher Request Type for new feature
export interface TeacherRequest {
  id: string;
  facultyId: string;
  requestType: 'Schedule Change' | 'Leave Request' | 'Resource Request' | 'Other';
  subject?: string;
  currentSchedule?: string;
  requestedChange: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  submittedDate: string;
}

// Attendance Types
export type AttendanceStatus = 'present' | 'absent' | 'present_locked' | 'absent_locked' | 'present_suggested';
export type AttendanceRecord = { [studentId: string]: AttendanceStatus };
export type Attendance = { [classId: string]: { [date: string]: AttendanceRecord } };

// User type for authentication
export interface User {
  username: string;
  role: 'admin' | 'teacher' | 'student';
  _id?: string; // from MongoDB
  profileId?: string;
  // Optional password field for user creation payloads.
  password?: string;
}

// --- NEW: API & Error Types for enhanced type safety ---

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface PaginatedResponse<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

export interface ErrorResponse {
  message: string;
  code?: string;
  details?: any;
}

// Type guard to check if an error is a structured API error
export function isApiError(error: unknown): error is ErrorResponse {
  return (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as any).message === 'string'
  );
}
