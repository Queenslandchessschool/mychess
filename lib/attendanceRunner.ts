// ======================================================
// MyCHESS Attendance Runner
//
// Step 2B
// Attendance Execution Layer
//
// Purpose:
// - Connect Attendance Time Engine with Attendance Engine
// - Decide whether reconciliation is currently allowed
// - Keep business timing rules outside UI
// - Support both Browser and Server Supabase clients
//
// Business Timezone:
// Australia/Brisbane
// ======================================================

import { supabase } from "@/lib/supabase";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getLessonTimePhase,
  isAutoReconciliationAllowed,
  type LessonTimePhase,
} from "@/lib/attendanceTime";

import {
  reconcileAttendance,
  type AttendanceReconciliationResult,
} from "@/lib/attendanceEngine";


// ======================================================
// Result
// ======================================================

export interface AttendanceRunnerResult {
  lessonId: string;

  phase: LessonTimePhase;

  executed: boolean;

  reason: string;

  reconciliation?: AttendanceReconciliationResult;
}


// ======================================================
// Run Attendance Reconciliation
//
// This function does NOT generate Attendance directly.
//
// It:
// 1. Loads lesson context
// 2. Loads the related Class directly
// 3. Gets the Class start time
// 4. Checks Attendance Time Engine
// 5. Executes Attendance Engine only when allowed
//
// Safe to call from:
// - Admin Attendance
// - Coach Attendance
// - Scheduler / Cron
// - Future Supabase Edge Function
//
// Database Client:
// - Default: Browser Supabase client
// - Scheduler: Server Supabase client
//
// IMPORTANT:
// Business logic remains ONE shared function.
// Only the database execution client changes.
// ======================================================

export async function runAttendanceReconciliation(
  lessonId: string,
  db: SupabaseClient = supabase
): Promise<AttendanceRunnerResult> {

  // ====================================================
  // 1. Load lesson context
  //
  // IMPORTANT:
  // We only load the Lesson itself here.
  //
  // We intentionally DO NOT use a nested
  // classes:class_id(start_time) relationship.
  //
  // This avoids Supabase relationship ambiguity between
  // classes and class_schedule.
  // ====================================================

  const {
    data: lesson,
    error: lessonError,
  } = await db
    .from("lessons")
    .select(`
      id,
      class_id,
      lesson_date
    `)
    .eq("id", lessonId)
    .single();

  if (lessonError) {
    throw lessonError;
  }

  if (!lesson) {
    throw new Error(
      "Attendance runner failed: lesson not found."
    );
  }


  // ====================================================
  // 2. Load Class directly
  //
  // Frozen Architecture:
  //
  // classes
  // - campus_id
  // - coach_id
  // - level
  // - day
  // - start_time
  // - end_time
  //
  // class_schedule
  // - academic_year
  // - term
  // - first_lesson
  // - final_lesson
  //
  // Therefore lesson timing comes from classes,
  // NOT class_schedule.
  // ====================================================

  const {
    data: classData,
    error: classError,
  } = await db
    .from("classes")
    .select(`
      id,
      start_time
    `)
    .eq("id", lesson.class_id)
    .single();

  if (classError) {
    throw classError;
  }

  if (!classData) {
    throw new Error(
      "Attendance runner failed: class not found."
    );
  }


  // ====================================================
  // 3. Get class start time
  // ====================================================

  const startTime =
    classData.start_time;

  if (
    !lesson.lesson_date ||
    !startTime
  ) {
    throw new Error(
      "Attendance runner failed: lesson date or class start time is missing."
    );
  }


  // ====================================================
  // 4. Determine current Attendance phase
  //
  // IMPORTANT:
  // attendanceTime.ts remains the single source of truth
  // for Attendance timing.
  // ====================================================

  const phase =
    getLessonTimePhase(
      lesson.lesson_date,
      startTime
    );


  // ====================================================
  // 5. Check whether automatic reconciliation
  // is currently allowed
  // ====================================================

  if (
    !isAutoReconciliationAllowed(
      lesson.lesson_date,
      startTime
    )
  ) {
    return {
      lessonId,

      phase,

      executed: false,

      reason:
        "Attendance reconciliation is not currently allowed.",
    };
  }


  // ====================================================
  // 6. Execute Attendance Engine
  //
  // The Engine remains responsible for:
  //
  // - Active Enrolments
  // - Trial / Regular
  // - Missing Attendance only
  // - Existing Attendance protection
  //
  // IMPORTANT:
  // Pass the same database client through to the Engine.
  // ====================================================

  const reconciliation =
    await reconcileAttendance(
      lessonId,
      db
    );


  // ====================================================
  // 7. Result
  // ====================================================

  return {
    lessonId,

    phase,

    executed: true,

    reason:
      "Attendance reconciliation executed successfully.",

    reconciliation,
  };
}