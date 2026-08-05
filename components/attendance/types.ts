// ======================================================
// Lesson Card
// Used by Today's Lessons panel
// ======================================================

export interface LessonCard {
  id: string;

  lesson_date: string;

  campus: string;

  level: string;

  coach: string;

  start_time: string;

  end_time: string;

  studentCount: number;

  status: string;
}

// ======================================================
// Attendance Student
// One student in attendance page
// ======================================================

export interface AttendanceStudent {
  id: string;

  student_id: string;

  student_code: string;

  first_name: string;

  last_name: string;

  student_name: string;

  current_level: string;

  makeup_credit: number;

classroom_pickup: boolean;

ymca_dropoff: boolean;

walk_home: boolean;

has_medical: boolean;

  attendance_status:
    | "Present"
    | "Absent"
    | "Late";

  attendance_type:
    | "Regular"
    | "Trial"
    | "Make-up"
    | "Excused"
    | "Holiday";

  arrival_time?: string;

  remarks?: string;

  attendance_id?: string;

  isTrial?: boolean;

  needsPickup?: boolean;

  ymcaDropoff?: boolean;
}

// ======================================================
// Attendance Summary
// Right summary panel
// ======================================================

export interface AttendanceSummary {
  totalStudents: number;

  present: number;

  absent: number;

  late: number;

  leave: number;

  attendanceRate: number;
}

// ======================================================
// Header Statistics
// Top dashboard cards
// ======================================================

export interface AttendanceHeaderStats {
  totalLessons: number;

  totalStudents: number;

  trialCount: number;

  pickupCount: number;

  ymcaCount: number;
}