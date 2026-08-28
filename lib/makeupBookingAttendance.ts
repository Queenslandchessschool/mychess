// ======================================================
// MyCHESS Make-up Booking → Attendance Integration
//
// Part 3D-A
//
// Purpose:
// - Synchronise confirmed Make-up Bookings into Attendance
// - Keep Booking and Attendance responsibilities separate
// - Preserve the existing Attendance Engine / Lazy Loading
// - Link Booking-created Attendance back to the Booking
// - Reverse only the Attendance created by a cancelled Booking
//
// Business Rules:
// - Only Booked make-up bookings create Attendance
// - Booking does NOT consume the Credit here
// - Attendance is created as Present / Make-up
// - Existing Attendance is never overwritten
// - Booking-created Attendance is linked by attendance_id
// - Cancelled Booking reverses only its linked Attendance
// - Admin / Coach On-site Make-up is never affected
// - Safe to run repeatedly
//
// Business Timezone:
// Australia/Brisbane
// ======================================================

import { supabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";


// ======================================================
// Types
// ======================================================

export interface MakeupBookingAttendanceResult {
  lessonId: string;
  bookingCount: number;
  insertedCount: number;
  skippedCount: number;
  reversedCount: number;
}


// ======================================================
// Sync Make-up Bookings into Attendance
//
// Flow:
//
// Booked Make-up Booking
//        ↓
// Attendance exists?
//        ↓
//   Yes → Skip
//        ↓
//   No  → Create
//        ↓
// Present / Make-up
//        ↓
// Booking.attendance_id = Attendance.id
//
// Cancelled Make-up Booking
//        ↓
// Booking.attendance_id
//        ↓
// Reverse ONLY linked Attendance
//
// IMPORTANT:
// This function does NOT:
// - consume Credit
// - change Credit status
// - create Booking
// - cancel Booking
// - overwrite existing Attendance
// - modify Regular / Trial Attendance
// - reverse On-site Make-up Attendance
//
// It is an integration layer only.
// ======================================================

export async function syncMakeupBookingsToAttendance(
  lessonId: string,
  db: SupabaseClient = supabase
): Promise<MakeupBookingAttendanceResult> {

  // ====================================================
  // 1. Load ALL Make-up Bookings for this lesson
  //
  // We need both Booked and Cancelled records.
  //
  // Booked:
  //   → create missing Attendance
  //
  // Cancelled:
  //   → reverse the Attendance linked to that Booking
  // ====================================================

  const {
    data: bookings,
    error: bookingError,
  } = await db
    .from("makeup_bookings")
    .select(`
      id,
      lesson_id,
      student_id,
      attendance_id,
      status
    `)
    .eq("lesson_id", lessonId);

  if (bookingError) {
    throw bookingError;
  }

  const bookingRows = bookings ?? [];

  if (bookingRows.length === 0) {
    return {
      lessonId,
      bookingCount: 0,
      insertedCount: 0,
      skippedCount: 0,
      reversedCount: 0,
    };
  }


  // ====================================================
  // 2. Load Existing Attendance
  //
  // Existing Attendance is protected.
  // ====================================================

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


  // ====================================================
  // 3. Build Existing Student Set
  // ====================================================

  const existingStudentIds =
    new Set<string>(
      existingRows
        .map((row: any) => row.student_id)
        .filter(Boolean)
    );


  // ====================================================
  // 4. Process Booked Make-up Bookings
  //
  // Only Booked records can create Attendance.
  //
  // Existing Attendance is NEVER overwritten.
  // ====================================================

  const bookedRows =
    bookingRows.filter(
      (booking: any) =>
        booking.status === "Booked"
    );

  const missingBookings =
    bookedRows.filter(
      (booking: any) =>
        booking.student_id &&
        !existingStudentIds.has(
          booking.student_id
        )
    );


  // ====================================================
  // 5. Create Missing Make-up Attendance
  //
  // Frozen Make-up Attendance:
  //
  // attendance_status = Present
  // attendance_type   = Make-up
  // ====================================================

  let insertedCount = 0;

  for (const booking of missingBookings) {

    const now =
      new Date().toISOString();

    const {
      data: attendance,
      error: insertError,
    } = await db
      .from("attendance")
      .insert({
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
      .select("id")
      .single();

    if (insertError) {
      throw insertError;
    }

    if (!attendance) {
      throw new Error(
        "Make-up Attendance was created but no Attendance ID was returned."
      );
    }

    insertedCount += 1;


    // ==================================================
    // 6. Link Booking → Attendance
    //
    // This creates the reversible relationship:
    //
    // makeup_bookings.attendance_id
    //              ↓
    //        attendance.id
    //
    // The database FK uses:
    // ON DELETE SET NULL
    // ==================================================

    const {
      error: linkError,
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
      );

    if (linkError) {
      throw linkError;
    }

    // Keep the local student set current.
    //
    // This protects this execution from creating
    // another Attendance for the same student.
    existingStudentIds.add(
      booking.student_id
    );
  }


  // ====================================================
  // 7. Reverse Cancelled Booking Attendance
  //
  // IMPORTANT:
  //
  // We ONLY use:
  //
  // makeup_bookings.attendance_id
  //
  // We NEVER search by:
  // - attendance_type alone
  // - student_id alone
  // - lesson_id alone
  //
  // Therefore Admin / Coach On-site Make-up is safe.
  // ====================================================

  const cancelledRows =
    bookingRows.filter(
      (booking: any) =>
        booking.status === "Cancelled" &&
        booking.attendance_id
    );

  let reversedCount = 0;

  for (const booking of cancelledRows) {

    const {
      data: linkedAttendance,
      error: linkedAttendanceError,
    } = await db
      .from("attendance")
      .select(`
        id,
        attendance_type
      `)
      .eq(
        "id",
        booking.attendance_id
      )
      .eq(
        "lesson_id",
        lessonId
      )
      .maybeSingle();

    if (linkedAttendanceError) {
      throw linkedAttendanceError;
    }

    // Already removed.
    //
    // This makes the operation idempotent.
    if (!linkedAttendance) {
      continue;
    }


    // ==================================================
    // Safety Guard
    //
    // The linked Attendance must still be a Make-up
    // Attendance record.
    //
    // We do NOT identify Attendance merely by
    // student_id / lesson_id.
    // ==================================================

    if (
      linkedAttendance.attendance_type !==
      "Make-up"
    ) {
      continue;
    }


    // ==================================================
    // 8. Delete ONLY the Attendance linked to this
    //    cancelled Booking
    //
    // Database FK:
    //
    // makeup_bookings.attendance_id
    //        ↓
    // attendance.id
    //
    // ON DELETE SET NULL
    //
    // Therefore the Booking remains:
    //
    // status = Cancelled
    //
    // while attendance_id automatically becomes NULL.
    // ====================================================

    const {
      error: deleteError,
    } = await db
      .from("attendance")
      .delete()
      .eq(
        "id",
        booking.attendance_id
      )
      .eq(
        "lesson_id",
        lessonId
      )
      .eq(
        "attendance_type",
        "Make-up"
      );

    if (deleteError) {
      throw deleteError;
    }

    reversedCount += 1;
  }


  // ====================================================
  // 9. Result
  // ====================================================

  return {
    lessonId,

    bookingCount:
      bookedRows.length,

    insertedCount,

    skippedCount:
      bookedRows.length -
      missingBookings.length,

    reversedCount,
  };
}