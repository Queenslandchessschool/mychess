// ======================================================
// MyCHESS Attendance Student Count
//
// Shared Attendance Student Count
//
// Purpose:
// - Provide ONE shared Student Count business function
// - Used by Admin Attendance
// - Used by Coach Attendance
// - Count current Attendance records by Lesson
//
// Frozen:
// - Attendance is the operational source for Lesson Student Count
// - Admin / Coach use the same function
// - Permission scope is handled by the calling page
// - This function does NOT create Attendance
// - This function does NOT reconcile Attendance
// - This function does NOT apply Lazy Mode
// - This function only reads existing Attendance
//
// Business Timezone:
// Australia/Brisbane
// ======================================================

import { supabase } from "@/lib/supabase";


// ======================================================
// Result Type
// ======================================================

export type AttendanceStudentCountMap =
  Record<string, number>;


// ======================================================
// Get Student Counts for Lessons
//
// Input:
// - lessonIds
//
// Output:
// - Record<lessonId, studentCount>
//
// Example:
//
// {
//   "lesson-001": 19,
//   "lesson-002": 10,
//   "lesson-003": 0
// }
//
// IMPORTANT:
// - This function only reads Attendance.
// - It does NOT trigger reconciliation.
// - It does NOT create missing Attendance.
// - It does NOT modify any data.
//
// Reconciliation remains the responsibility of:
// - attendanceRunner
// - attendanceEngine
//
// ======================================================

export async function getAttendanceStudentCounts(
  lessonIds: string[]
): Promise<AttendanceStudentCountMap> {

  // ====================================================
  // 1. Empty Lesson List
  // ====================================================

  if (
    lessonIds.length === 0
  ) {
    return {};
  }


  // ====================================================
  // 2. Load Attendance Records
  //
  // Only the Lesson ID is required.
  //
  // Each Attendance record represents one student
  // currently represented in that Lesson's Attendance.
  // ====================================================

  const {
    data,
    error,
  } = await supabase
    .from("attendance")
    .select("lesson_id")
    .in(
      "lesson_id",
      lessonIds
    );


  if (error) {

    console.error(
      "ATTENDANCE STUDENT COUNT ERROR:",
      error
    );

    throw error;
  }


  // ====================================================
  // 3. Build Count Map
  // ====================================================

  const countMap:
    AttendanceStudentCountMap = {};


  for (
    const row of data ?? []
  ) {

    if (
      !row.lesson_id
    ) {
      continue;
    }


    countMap[row.lesson_id] =
      (
        countMap[row.lesson_id] ??
        0
      ) + 1;
  }


  // ====================================================
  // 4. Return
  //
  // Lessons without Attendance records are intentionally
  // absent from the map.
  //
  // The caller uses:
  //
  // countMap[lesson.id] ?? 0
  //
  // ====================================================

  return countMap;
}