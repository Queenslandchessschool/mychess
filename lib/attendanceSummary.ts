// ======================================================
// MyCHESS Attendance Summary
//
// Shared Attendance Module
//
// Purpose:
// - Provide ONE Attendance Summary calculation
// - Used by Admin Attendance
// - Used by Coach Attendance
//
// Frozen rule:
// - Excused / Leave is not counted as Present
// - Excused / Leave is not counted as Absent
// - Excused / Leave is not counted as Late
// - Leave remains included in total students
// - Attendance Rate = (Present + Late) / Total Students
//
// Admin and Coach must use this same calculation.
// Their difference is Scope / Permission only.
// ======================================================

import type {
  AttendanceStudent,
  AttendanceSummary,
} from "@/components/attendance/types";

// ======================================================
// Calculate Attendance Summary
// ======================================================

export function calculateAttendanceSummary(
  students: AttendanceStudent[]
): AttendanceSummary {
  const totalStudents =
    students.length;

  const present =
    students.filter(
      (student) =>
        student.attendance_type !== "Excused" &&
        student.attendance_status === "Present"
    ).length;

  const absent =
    students.filter(
      (student) =>
        student.attendance_type !== "Excused" &&
        student.attendance_status === "Absent"
    ).length;

  const late =
    students.filter(
      (student) =>
        student.attendance_type !== "Excused" &&
        student.attendance_status === "Late"
    ).length;

  const leave =
    students.filter(
      (student) =>
        student.attendance_type === "Excused"
    ).length;

  const attendanceRate =
    totalStudents === 0
      ? 0
      : Math.round(
          (
            students.filter(
              (student) =>
                student.attendance_type !== "Excused" &&
                (
                  student.attendance_status === "Present" ||
                  student.attendance_status === "Late"
                )
            ).length *
            100
          ) /
          totalStudents
        );

  return {
    totalStudents,
    present,
    absent,
    late,
    leave,
    attendanceRate,
  };
}
