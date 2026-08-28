// ======================================================
// MyCHESS Attendance Engine
//
// Step 2A + Part 3D
// Attendance Reconciliation + Make-up Integration
//
// Purpose:
// - Keep existing Attendance records untouched
// - Find Active Enrolments for the selected lesson
// - Find Booked Make-up students for the selected lesson
// - Add only missing Attendance records
// - Correctly distinguish Trial / Regular / Make-up
// - Link Booked Make-up Booking → Attendance
//
// Business Timezone:
// Australia/Brisbane
// ======================================================

import { supabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";


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
//
// Additional Part 3D behaviour:
// - Booked Make-up students are treated as an
//   additional Attendance source.
// - Existing Attendance always has priority.
// - A Booked Make-up Booking is linked to the
//   Attendance record through attendance_id.
// ======================================================

export async function reconcileAttendance(
  lessonId: string,
  db: SupabaseClient = supabase
): Promise<AttendanceReconciliationResult> {

  // ======================================================
  // 1. Load lesson context
  // ======================================================

  const {
    data: lesson,
    error: lessonError,
  } = await db
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
  // This remains the authoritative source for the
  // current Regular / Trial enrolment roster.
  // ======================================================

  const {
    data: enrolments,
    error: enrolmentError,
  } = await db
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
  // 3. Load Booked Make-up Bookings
  //
  // Part 3D
  //
  // Only:
  //
  //     status = "Booked"
  //
  // are eligible to enter the Attendance roster.
  //
  // Cancelled bookings must NOT generate Attendance.
  //
  // attendance_id may initially be NULL because the
  // Booking is created before Attendance reconciliation.
  // ======================================================

  const {
    data: makeupBookings,
    error: makeupBookingError,
  } = await db
    .from("makeup_bookings")
    .select(`
      id,
      student_id,
      lesson_id,
      attendance_id,
      status
    `)
    .eq("lesson_id", lessonId)
    .eq("status", "Booked");

  if (makeupBookingError) {
    throw makeupBookingError;
  }

  const bookedMakeupBookings =
    makeupBookings ?? [];


  // ======================================================
  // 4. Load existing Attendance for this lesson
  //
  // IMPORTANT:
  // Existing Attendance is NEVER overwritten.
  // ======================================================

  const {
    data: existingAttendance,
    error: attendanceError,
  } = await db
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
  // 5. Build existing student set
  // ======================================================

  const existingStudentIds =
    new Set<string>(
      existingRows
        .map((row: any) => row.student_id)
        .filter(Boolean)
    );


  // ======================================================
  // 6. Build Make-up student set
  //
  // A valid Booked Make-up must have:
  //
  // - student_id
  // - lesson_id = current lesson
  // - status = Booked
  //
  // Existing Attendance remains authoritative.
  // ======================================================

  const validMakeupBookings =
    bookedMakeupBookings.filter(
      (booking: any) =>
        Boolean(booking.student_id) &&
        booking.lesson_id === lessonId
    );


  const makeupStudentIds =
    new Set<string>(
      validMakeupBookings
        .map(
          (booking: any) =>
            booking.student_id
        )
        .filter(Boolean)
    );


  // ======================================================
  // 7. Find missing Regular / Trial students
  // ======================================================

  const missingEnrolments =
    eligibleEnrolments.filter(
      (enrolment: any) =>
        !existingStudentIds.has(
          enrolment.student_id
        )
    );


  // ======================================================
  // 8. Build Attendance rows for Regular / Trial
  //
  // Trial:
  //   attendance_type = "Trial"
  //
  // Regular:
  //   attendance_type = "Regular"
  //
  // New Attendance always starts as Present,
  // matching the Frozen Attendance Generation rule.
  //
  // IMPORTANT:
  // A student who is already represented by a Booked
  // Make-up booking is NOT changed here.
  //
  // Existing Attendance always wins.
  // ======================================================

  const now =
    new Date().toISOString();


  const regularTrialRows =
    missingEnrolments
      .filter(
        (enrolment: any) =>
          !makeupStudentIds.has(
            enrolment.student_id
          )
      )
      .map(
        (enrolment: any) => ({
          lesson_id:
            lessonId,

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
  // 9. Find missing Make-up Attendance
  //
  // Only Booked Make-up students without an existing
  // Attendance record are inserted.
  //
  // New Make-up Attendance:
  //
  //   attendance_status = Present
  //   attendance_type   = Make-up
  //
  // Existing Attendance is NEVER overwritten.
  // ======================================================

  const missingMakeupBookings =
    validMakeupBookings.filter(
      (booking: any) =>
        !existingStudentIds.has(
          booking.student_id
        ) &&
        !booking.attendance_id
    );


  const makeupAttendanceRows =
    missingMakeupBookings.map(
      (booking: any) => ({
        lesson_id:
          lessonId,

        student_id:
          booking.student_id,

        attendance_status:
          "Present",

        attendance_type:
          "Make-up",

        created_at:
          now,

        updated_at:
          now,
      })
    );


  // ======================================================
  // 10. Insert Regular / Trial + Make-up Attendance
  //
  // IMPORTANT:
  // We only insert missing records.
  // ======================================================

  const attendanceRows = [
    ...regularTrialRows,
    ...makeupAttendanceRows,
  ];


  if (attendanceRows.length > 0) {

    const {
      error: insertError,
    } = await db
      .from("attendance")
      .insert(attendanceRows);

    if (insertError) {
      throw insertError;
    }
  }


  // ======================================================
  // 11. Re-load Attendance
  //
  // We need the actual Attendance IDs created above
  // so Booked Make-up bookings can be linked.
  //
  // This also makes the operation safe for repeated
  // reconciliation runs.
  // ======================================================

  if (
    makeupAttendanceRows.length > 0
  ) {

    const {
      data: refreshedAttendance,
      error: refreshedAttendanceError,
    } = await db
      .from("attendance")
      .select(`
        id,
        student_id,
        attendance_type
      `)
      .eq("lesson_id", lessonId);

    if (refreshedAttendanceError) {
      throw refreshedAttendanceError;
    }


    const attendanceByStudent =
      new Map<string, any>();


    for (
      const row of
        refreshedAttendance ?? []
    ) {

      if (
        row.student_id &&
        !attendanceByStudent.has(
          row.student_id
        )
      ) {
        attendanceByStudent.set(
          row.student_id,
          row
        );
      }
    }


    // ====================================================
    // 12. Link Make-up Booking → Attendance
    //
    // Only:
    //
    //   status = Booked
    //   attendance_id IS NULL
    //
    // may be linked.
    //
    // Conditional update protects against duplicate
    // linking / concurrent reconciliation.
    // ====================================================

    for (
      const booking of
        missingMakeupBookings
    ) {

      const attendance =
        attendanceByStudent.get(
          booking.student_id
        );


      if (!attendance) {
        continue;
      }


      const {
        error: bookingLinkError,
      } = await db
        .from("makeup_bookings")
        .update({
          attendance_id:
            attendance.id,
        })
        .eq(
          "id",
          booking.id
        )
        .eq(
          "status",
          "Booked"
        )
        .is(
          "attendance_id",
          null
        );


      if (bookingLinkError) {
        throw bookingLinkError;
      }
    }
  }


  // ======================================================
  // 13. Handle Booked Make-up bookings that already
  //     have an Attendance record
  //
  // This is important for idempotency.
  //
  // If reconciliation runs again:
  //
  //     Booking = Booked
  //     Attendance = Make-up
  //     attendance_id already exists
  //
  // nothing is created again.
  // ======================================================


  // ======================================================
  // 14. Result
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