// ======================================================
// MyCHESS Make-up Attendance
//
// M011.01
// Shared Make-up Attendance Integration
//
// Purpose:
// - Handle On-site Make-up from Attendance
// - Use the Frozen makeup_credits model
// - Link Attendance to the consumed Credit
// - Keep Admin / Coach business logic identical
//
// Important:
// - Does NOT use students.makeup_credit
// - Does NOT use attendance_source
// - Does NOT create a makeup_booking
// - Uses exactly ONE Available Credit
//
// Business Timezone:
// Australia/Brisbane
// ======================================================

import { supabase } from "@/lib/supabase";


// ======================================================
// Types
// ======================================================

export type MakeUpOperator =
  | "Admin"
  | "Coach";


export interface AddMakeupAttendanceResult {
  attendanceId: string;

  creditId: string;

  studentId: string;

  lessonId: string;
}


// ======================================================
// Add On-site Make-up Attendance
//
// This is the shared business function used by:
//
// - Admin Attendance
// - Coach Attendance
//
// Business Rule:
//
// Available Credit
//       ↓
// On-site Make-up
//       ↓
// Attendance = Present / Make-up
//       ↓
// Credit = Used
//
// There is NO makeup_booking created here.
//
// This is specifically for the real-world situation where
// a student arrives for a make-up lesson without a prior
// booking.
//
// One Available Credit is consumed.
// ======================================================

export async function addOnSiteMakeupAttendance(
  lessonId: string,
  studentId: string,
  operator: MakeUpOperator
): Promise<AddMakeupAttendanceResult> {

  // ====================================================
  // 1. Find one Available Make-up Credit
  //
  // One Credit = One Database Record.
  //
  // We intentionally consume only ONE record.
  // ====================================================

  const {
    data: credit,
    error: creditError,
  } = await supabase
    .from("makeup_credits")
    .select("id, student_id, status")
    .eq("student_id", studentId)
    .eq("status", "Available")
    .order("created_at", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle();


  if (creditError) {
    throw creditError;
  }


  if (!credit) {
    throw new Error(
      "No available make-up credit was found for this student."
    );
  }


  // ====================================================
  // 2. Protect against duplicate Attendance
  //
  // The same student should not be added twice to the
  // same lesson.
  // ====================================================

  const {
    data: existingAttendance,
    error: existingAttendanceError,
  } = await supabase
    .from("attendance")
    .select("id")
    .eq("lesson_id", lessonId)
    .eq("student_id", studentId)
    .maybeSingle();


  if (existingAttendanceError) {
    throw existingAttendanceError;
  }


  if (existingAttendance) {
    throw new Error(
      "This student already has an attendance record for this lesson."
    );
  }


  // ====================================================
  // 3. Create Attendance
  //
  // IMPORTANT:
  // Do NOT use attendance_source.
  //
  // This field previously caused PGRST204 and is not
  // part of the current Attendance write contract.
  // ====================================================

  const {
    data: attendance,
    error: attendanceError,
  } = await supabase
    .from("attendance")
    .insert({
      lesson_id: lessonId,

      student_id: studentId,

      attendance_status:
        "Present",

      attendance_type:
        "Make-up",
    })
    .select("id")
    .single();


  if (attendanceError) {
    throw attendanceError;
  }


  if (!attendance) {
    throw new Error(
      "Make-up attendance was created but no Attendance ID was returned."
    );
  }


  // ====================================================
  // 4. Consume the Make-up Credit
  //
  // Frozen Credit Model:
  //
  // Available
  //    ↓
  // Used
  //
  // The Attendance ID is stored on the Credit record.
  // ====================================================

  const now =
    new Date().toISOString();


  const {
    error: updateCreditError,
  } = await supabase
    .from("makeup_credits")
    .update({
      status: "Used",

      attendance_id:
        attendance.id,

      used_at:
        now,
    })
    .eq("id", credit.id)
    .eq("status", "Available");


  if (updateCreditError) {

    // --------------------------------------------------
    // IMPORTANT:
    // The Attendance record already exists.
    //
    // We intentionally DO NOT delete Attendance here.
    // Attendance is a permanent operational record.
    //
    // The failure must be surfaced so the transaction
    // can be investigated rather than silently deleting
    // an Attendance record.
    // --------------------------------------------------

    console.error(
      "MAKE-UP CREDIT CONSUMPTION ERROR:",
      updateCreditError
    );

    throw updateCreditError;
  }


  // ====================================================
  // 5. Audit Log
  //
  // Admin / Coach uses the same business action.
  // Only the operator differs.
  // ====================================================

  const {
    error: logError,
  } = await supabase
    .from("attendance_logs")
    .insert({
      attendance_id:
        attendance.id,

      action:
        "Add Make-up",

      new_status:
        "Present",

      operator,

      remarks:
        "On-site make-up attendance added.",
    });


  if (logError) {
    console.error(
      "MAKE-UP ATTENDANCE LOG ERROR:",
      logError
    );

    // Audit failure does NOT undo the completed
    // Attendance / Credit transaction.
  }


  // ====================================================
  // 6. Return
  // ====================================================

  return {
    attendanceId:
      attendance.id,

    creditId:
      credit.id,

    studentId,

    lessonId,
  };
}