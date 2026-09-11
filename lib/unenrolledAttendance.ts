import {
  addManualRegularAttendance,
} from "@/lib/attendanceEngine";

// ======================================================
// Unenrolled Student Attendance
//
// Business purpose:
// - Coach explicitly adds a student who attended the lesson
//   but has not yet enrolled for the current term.
//
// Rules:
// - Student must have been an Active Regular student
//   in the same class in the previous term.
// - Student must NOT already be enrolled in the current term.
// - Attendance = Present.
// - Attendance Type = Regular.
// - No Make-up Credit.
// - No Trial.
// - No current-term Enrolment creation.
//
// Attendance writing is delegated to Attendance Engine.
// Coach UI must NOT write directly to attendance.
// ======================================================

export interface AddUnenrolledAttendanceResult {
  attendanceId: string;
  lessonId: string;
  studentId: string;
  attendanceStatus: string;
  attendanceType: string;
}

export async function addUnenrolledStudentAttendance({
  lessonId,
  studentId,
}: {
  lessonId: string;
  studentId: string;
}): Promise<AddUnenrolledAttendanceResult> {

  if (!lessonId) {
    throw new Error(
      "Lesson is required."
    );
  }

  if (!studentId) {
    throw new Error(
      "Student is required."
    );
  }

  const result =
    await addManualRegularAttendance(
      lessonId,
      studentId
    );

  return {
    attendanceId:
      result.attendanceId,
    lessonId:
      result.lessonId,
    studentId:
      result.studentId,
    attendanceStatus:
      result.attendanceStatus,
    attendanceType:
      result.attendanceType,
  };
}