// ======================================================
// MyCHESS Attendance Engine
//
// Step 2A
// Attendance Reconciliation
//
// Purpose:
// - Keep existing Attendance records untouched
// - Find Active Enrolments for the selected lesson
// - Add only missing Attendance records
// - Correctly distinguish Trial vs Regular
//
// Business Timezone:
// Australia/Brisbane
// ======================================================

import { supabase } from "@/lib/supabase";


// ======================================================
// Types
// ======================================================

export interface AttendanceReconciliationResult {
  lessonId: string;
  existingCount: number;
  eligibleEnrollmentCount: number;
  insertedCount: number;
  skippedCount: number;
}


// ======================================================
// Reconcile Attendance
//
// This function is SAFE to run multiple times.
//
// It does NOT:
// - delete Attendance
// - recreate Attendance
// - overwrite Present / Absent / Late
// - overwrite existing attendance_type
//
// It ONLY inserts missing Attendance records.
// ======================================================

export async function reconcileAttendance(
  lessonId: string
): Promise<AttendanceReconciliationResult> {

  // ======================================================
  // 1. Load lesson context
  // ======================================================

  const {
    data: lesson,
    error: lessonError,
  } = await supabase
    .from("lessons")
    .select(`
      id,
      class_id,
      academic_year,
      term
    `)
    .eq("id", lessonId)
    .single();

  if (lessonError) {
    throw lessonError;
  }

  if (!lesson) {
    throw new Error(
      "Attendance reconciliation failed: lesson not found."
    );
  }


  // ======================================================
  // 2. Load Active Enrolments for this lesson
  //
  // This is the authoritative source for the current
  // Regular / Trial enrolment roster.
  // ======================================================

  const {
    data: enrolments,
    error: enrolmentError,
  } = await supabase
    .from("student_enrolments")
    .select(`
      student_id,
      is_trial
    `)
    .eq("class_id", lesson.class_id)
    .eq("academic_year", lesson.academic_year)
    .eq("term", lesson.term)
    .eq("status", "Active");

  if (enrolmentError) {
    throw enrolmentError;
  }


  const eligibleEnrolments =
    enrolments ?? [];


  // ======================================================
  // 3. Load existing Attendance for this lesson
  //
  // IMPORTANT:
  // Existing Attendance is NEVER overwritten.
  // ======================================================

  const {
    data: existingAttendance,
    error: attendanceError,
  } = await supabase
    .from("attendance")
    .select(`
      id,
      student_id,
      attendance_type
    `)
    .eq("lesson_id", lessonId);

  if (attendanceError) {
    throw attendanceError;
  }


  const existingRows =
    existingAttendance ?? [];


  // ======================================================
  // 4. Build existing student set
  // ======================================================

  const existingStudentIds =
    new Set<string>(
      existingRows
        .map((row: any) => row.student_id)
        .filter(Boolean)
    );


  // ======================================================
  // 5. Find missing students
  // ======================================================

  const missingEnrolments =
    eligibleEnrolments.filter(
      (enrolment: any) =>
        !existingStudentIds.has(
          enrolment.student_id
        )
    );


  // ======================================================
  // 6. Build Attendance rows
  //
  // Trial:
  //   attendance_type = "Trial"
  //
  // Regular:
  //   attendance_type = "Regular"
  //
  // New Attendance always starts as Present,
  // matching the Frozen Attendance Generation rule.
  // ======================================================

  const now =
    new Date().toISOString();

  const attendanceRows =
    missingEnrolments.map(
      (enrolment: any) => ({
        lesson_id: lessonId,

        student_id:
          enrolment.student_id,

        attendance_status:
          "Present",

        attendance_type:
          enrolment.is_trial === true
            ? "Trial"
            : "Regular",

        created_at:
          now,

        updated_at:
          now,
      })
    );


  // ======================================================
  // 7. Insert ONLY missing records
  // ======================================================

  if (attendanceRows.length > 0) {

    const {
      error: insertError,
    } = await supabase
      .from("attendance")
      .insert(attendanceRows);

    if (insertError) {
      throw insertError;
    }
  }


  // ======================================================
  // 8. Result
  // ======================================================

  return {
    lessonId,

    existingCount:
      existingRows.length,

    eligibleEnrollmentCount:
      eligibleEnrolments.length,

    insertedCount:
      attendanceRows.length,

    skippedCount:
      eligibleEnrolments.length -
      missingEnrolments.length,
  };
}