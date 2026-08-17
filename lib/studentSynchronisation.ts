// ======================================================
// MyCHESS Student Synchronisation Engine
//
// Purpose:
// Keep Student Master student_stage aligned with the
// student's current Active Enrolment.
//
// Frozen Business Rule:
//
// Active Trial Enrolment
//      -> Student Master = Trial
//
// Active Regular Enrolment
//      -> Student Master = Regular
//
// Historical Enrolments are never modified.
//
// Business Timezone:
// Australia/Brisbane
// ======================================================

import { supabase } from "@/lib/supabase";


// ======================================================
// Types
// ======================================================

export interface StudentStageSyncResult {
  studentId: string;
  previousStage: string | null;
  newStage: "Trial" | "Regular";
  changed: boolean;
}


// ======================================================
// Synchronise one Student
//
// This function only updates Student Master.
//
// It does NOT:
// - modify enrolments
// - modify attendance
// - modify historical records
// ======================================================

export async function synchroniseStudentStage(
  studentId: string,
  academicYear: number,
  term: number
): Promise<StudentStageSyncResult> {

  // ======================================================
  // 1. Load current Student Master stage
  // ======================================================

  const {
    data: student,
    error: studentError,
  } = await supabase
    .from("students")
    .select(`
      id,
      student_stage
    `)
    .eq("id", studentId)
    .single();

  if (studentError) {
    throw studentError;
  }

  if (!student) {
    throw new Error(
      `Student synchronisation failed: student ${studentId} not found.`
    );
  }


  // ======================================================
  // 2. Load Active Enrolment for the current Term
  //
  // Current Active Enrolment is the source of truth for
  // the student's current Trial / Regular state.
  // ======================================================

  const {
    data: enrolments,
    error: enrolmentError,
  } = await supabase
    .from("student_enrolments")
    .select(`
      id,
      is_trial,
      status
    `)
    .eq("student_id", studentId)
    .eq("academic_year", academicYear)
    .eq("term", term)
    .eq("status", "Active")
    .order("created_at", {
      ascending: false,
    });

  if (enrolmentError) {
    throw enrolmentError;
  }


  // ======================================================
  // 3. Determine current stage
  //
  // If there is an Active Trial Enrolment, the student
  // is Trial.
  //
  // Otherwise an Active Regular Enrolment means Regular.
  // ======================================================

  const activeEnrolments =
    enrolments ?? [];


  const hasActiveTrial =
    activeEnrolments.some(
      (enrolment: any) =>
        enrolment.is_trial === true
    );


  const newStage: "Trial" | "Regular" =
    hasActiveTrial
      ? "Trial"
      : "Regular";


  // ======================================================
  // 4. Avoid unnecessary database writes
  // ======================================================

  const previousStage =
    student.student_stage ?? null;


  if (previousStage === newStage) {
    return {
      studentId,
      previousStage,
      newStage,
      changed: false,
    };
  }


  // ======================================================
  // 5. Update Student Master
  //
  // IMPORTANT:
  // Only the current Student Master stage is updated.
  //
  // Historical Enrolments and Attendance are untouched.
  // ======================================================

  const {
  error: updateError,
} = await supabase
  .from("students")
  .update({
    student_stage: newStage,
  })
  .eq("id", studentId);

  if (updateError) {
    throw updateError;
  }


  // ======================================================
  // 6. Return result
  // ======================================================

  return {
    studentId,
    previousStage,
    newStage,
    changed: true,
  };
}