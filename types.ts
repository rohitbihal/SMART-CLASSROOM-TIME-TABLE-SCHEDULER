// === From types.ts ===

// NEW: Type for grounding chunks from Gemini search
export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  // Can be extended with other grounding types like 'maps' if needed
}

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
  employeeId: string; // NEW
  designation: 'Professor' | 'Associate Professor' | 'Assistant Professor' | 'Research Team' | 'Lecturer' | 'Visiting Faculty'; // NEW
  contactNumber: string; // REVERTED to match backend schema
  email: string;
  department: string;
  specialization: string[];
  maxWorkload: number; // NEW (lectures per week)
  availability?: { [day: string]: string[] };
  adminId?: string;
  accessLevel?: 'Super Admin' | 'Timetable Manager' | 'User Management';
}

export interface Subject {
  id:string;
  name: string;
  code: string;
  department: string;
  semester: number; // NEW
  credits: number; // NEW
  type: 'Theory' | 'Lab' | 'Tutorial'; // UPDATED
  hoursPerWeek: number;
  assignedFacultyId: string;
}

// NEW: Equipment type for rooms
export interface Equipment {
    projector: boolean;
    smartBoard: boolean;
    ac: boolean;
    computerSystems: { available: boolean; count: number };
    audioSystem: boolean;
    whiteboard: boolean;
}
export interface Room {
  id: string;
  number: string;
  building: string; // NEW
  type: 'Classroom' | 'Laboratory' | 'Tutorial Room' | 'Seminar Hall'; // UPDATED
  capacity: number;
  equipment: Equipment; // NEW
  block?: string;
}

export interface Student {
  id: string;
  name: string;
  email?: string;
  classId: string;
  roll?: string;
  contactNumber?: string;
}

export interface TimetableEntry {
  className: string;
  subject: string;
  faculty: string;
  room: string;
  day: string;
  time: string;
  classType: 'regular' | 'fixed'; // NEW
  type: 'Theory' | 'Lab' | 'Tutorial'; // UPDATED to match Subject
}

// NEW: Type for sessions that could not be scheduled by the AI.
export interface UnscheduledSession {
  className: string;
  subject: string;
  reason: string;
}

// NEW: Type for the combined result of a timetable generation.
export interface GenerationResult {
  timetable: TimetableEntry[];
  unscheduledSessions: UnscheduledSession[];
}


export interface ChatMessage {
  id: string;
  author: string;
  authorId?: string; // User's profileId
  role: 'student' | 'teacher' | 'admin';
  text: string;
  timestamp: number;
  classId: string; // To scope messages to a class
  channel: string; // To support different channels like 'query', 'attendance', 'class-c1', 'dm-f1-st2'
  groundingChunks?: GroundingChunk[]; // For search-grounded responses
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
  subjectRoomTypeRules?: { subjectId: string; roomType: 'Classroom' | 'Laboratory' }[]; // Updated
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

// NEW: A dedicated type for institution profiles.
export interface Institution {
    id: string;
    name: string;
    academicYear: string;
    semester: 'Odd' | 'Even';
    session: 'Regular' | 'Summer School' | 'Winter School';
    blocks?: string[];
}

// NEW: Type for defining fixed, pre-scheduled classes.
export interface FixedClassConstraint {
  id: string;
  classId: string;
  subjectId: string;
  day: string;
  time: string;
  roomId?: string;
}

// NEW: Type for user-defined custom constraints
export interface CustomConstraint {
  id: string;
  name: string;
  type: 'Hard' | 'Soft';
  description: string;
  appliedTo: 'Faculty' | 'Room' | 'Class' | 'Time Slot';
  priority: 'High' | 'Medium' | 'Low';
  isActive: boolean;
}

export interface Constraints {
    maxConsecutiveClasses: number;
    timePreferences: TimePreferences;
    chatWindow?: { start: string; end: string; };
    isChatboxEnabled?: boolean;
    classSpecific: ClassSpecificConstraint[];
    fixedClasses?: FixedClassConstraint[]; // Added fixed classes
    customConstraints?: CustomConstraint[]; // NEW
    maxConcurrentClassesPerDept: { [department: string]: number };
    facultyPreferences?: FacultyPreference[];
    roomResourceConstraints?: RoomResourceConstraint;
    studentSectionConstraints?: StudentSectionConstraint;
    advancedConstraints?: AdvancedConstraint;
}

// UPDATED: Renamed from TeacherRequest to be more general for the new Query system.
// UPDATED: Added priority and expanded queryType to match new requirements.
export interface TeacherQuery {
  id: string;
  facultyId: string;
  queryType: 'Classroom Allotment' | 'Classroom Change' | 'Timing Adjustment' | 'Workload Review' | 'Leave Request' | 'Swap Lecture' | 'Other';
  subject?: string;
  currentSchedule?: string;
  requestedChange: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Under Review';
  submittedDate: string;
  priority: 'Urgent' | 'Normal';
  adminResponse?: string;
}

// NEW: Type for student queries to admin.
export interface StudentQuery {
  id: string;
  studentId: string;
  queryType: 'Academic' | 'Administrative' | 'Technical' | 'Other';
  subject?: string;
  details: string;
  status: 'Pending' | 'Resolved' | 'Closed';
  submittedDate: string;
  adminResponse?: string;
}


// Attendance Types
export type AttendanceStatus = 'present' | 'absent' | 'present_locked' | 'absent_locked' | 'present_suggested' | 'unmarked';
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

// --- NEW: Student Dashboard Specific Types ---
export interface Exam {
  id: string;
  subjectName: string;
  subjectCode: string;
  date: string;
  time: string;
  room: string;
}

// RENAMED: to avoid conflict with new AppNotification type
export interface StudentDashboardNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

// NEW: Admin-sent notifications
export interface AppNotification {
    id: string;
    title: string;
    message: string;
    recipients: {
        type: 'Students' | 'Teachers' | 'Both' | 'Specific';
        ids?: string[];
    };
    deliveryMethod: ('Email' | 'SMS' | 'In-App')[];
    notificationType: 'Meeting' | 'Event' | 'Schedule Change' | 'Exam' | 'Holiday' | 'Emergency' | 'General';
    sentDate: string;
    status: 'Sent' | 'Delivered' | 'Read' | 'Failed';
    scheduledFor?: string; // NEW for scheduling
}

export interface StudentAttendance {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  attended: number;
  total: number;
}

export interface SmartTool {
  id: string;
  title: string;
  description: string;
  icon: string;
  link: string;
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

// --- NEW: IMS, Calendar, and Meetings Types ---
export interface SyllabusProgress {
    id: string;
    subjectId: string;
    facultyId: string;
    lectureNumber: number;
    assignedTopic: string;
    taughtTopic: string;
    date: string;
    status: 'Completed' | 'Pending' | 'Deferred';
    variance: boolean;
}
export interface CalendarEvent {
    id: string;
    eventType: 'Class' | 'Assignment' | 'Test' | 'Meeting' | 'Holiday' | 'Event' | 'Deadline' | 'Seminar';
    title: string;
    start: string; // ISO string for date or datetime
    end: string;   // ISO string for date or datetime
    description?: string;
    participants?: string[];
    allDay?: boolean;
    color?: string;
}
export interface Meeting {
    id: string;
    title: string;
    description: string;
    meetingType: 'Faculty-Student' | 'Department' | 'Admin-Faculty' | 'One-on-One' | 'Class Meeting' | 'College Meeting';
    platform: 'Google Meet' | 'Zoom' | 'MS Teams' | 'Offline';
    meetingLink?: string;
    room?: string;
    start: string;
    end: string;
    organizerId: string;
    participants: { type: 'faculty' | 'student', id: string }[];
    attendance: { participantId: string; status: 'Present' | 'Absent' | 'Excused' }[];
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