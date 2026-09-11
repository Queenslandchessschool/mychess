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
//
// Trial Attendance rule:
// - Regular enrolments enter normally.
// - Trial enrolments only enter on their Trial Date.
// - Trial Date = student_enrolments.join_date.
// - A Trial already marked Enrolled is treated as
//   Regular for future Attendance.
// - Historical Trial Attendance remains untouched.
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
  term,
  lesson_date
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
  //
  // Trial rules are applied below using:
  // - is_trial
  // - trial_status
  // - join_date
  //
  // Frozen business rule:
  //
  // Regular:
  //   is_trial = false
  //   -> enters normally
  //
  // Trial, not yet Enrolled:
  //   is_trial = true
  //   AND trial_status != "Enrolled"
  //   -> enters ONLY when:
  //      join_date = lesson.lesson_date
  //
  // Trial already Enrolled:
  //   is_trial = true
  //   AND trial_status = "Enrolled"
  //   -> treated as Regular
  //
  // Trial with no join_date:
  //   -> does not enter Attendance
  // ======================================================

  const {
    data: enrolments,
    error: enrolmentError,
  } = await db
    .from("student_enrolments")
    .select(`
      student_id,
      is_trial,
      trial_status,
      join_date
    `)
    .eq("class_id", lesson.class_id)
    .eq("academic_year", lesson.academic_year)
    .eq("term", lesson.term)
    .eq("status", "Active");

  if (enrolmentError) {
    throw enrolmentError;
  }


  // ======================================================
  // 2B. Filter enrolments eligible for this lesson
  //
  // IMPORTANT:
  //
  // We intentionally keep the existing Active
  // Enrolment source and only add the Trial-specific
  // eligibility rule here.
  //
  // This prevents a Trial student from appearing in
  // every future Attendance lesson after their Trial.
  // ======================================================

  const eligibleEnrolments =
    (enrolments ?? []).filter(
      (enrolment: any) => {

        // --------------------------------------------------
        // Regular enrolment
        // --------------------------------------------------
        if (enrolment.is_trial !== true) {
          return true;
        }


        // --------------------------------------------------
        // Trial already converted to Regular
        //
        // Historical Trial Attendance remains untouched.
        // Future Attendance is Regular.
        // --------------------------------------------------
        if (
          enrolment.trial_status ===
          "Enrolled"
        ) {
          return true;
        }


        // --------------------------------------------------
        // Trial not yet Enrolled
        //
        // Trial Date is student_enrolments.join_date.
        //
        // A Trial student may enter Attendance ONLY
        // for the lesson on that Trial Date.
        // --------------------------------------------------
        if (!enrolment.join_date) {
          return false;
        }


        return (
          String(enrolment.join_date) ===
          String(lesson.lesson_date)
        );
      }
    );


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
  // Enrolled Trial:
  //   attendance_type = "Regular"
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
            enrolment.is_trial === true &&
            enrolment.trial_status !==
              "Enrolled"
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
  .upsert(attendanceRows, {
    onConflict: "lesson_id,student_id",
    ignoreDuplicates: true,
  });

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
// ======================================================
// Manual Attendance for Unenrolled Student
//
// Frozen business rule:
// - Explicit Coach action only.
// - Student comes from previous-term enrolment.
// - Does NOT create current-term enrolment.
// - Does NOT use Make-up Credit.
// - Attendance Type = Regular.
// - Attendance Status = Present.
// - Existing Attendance always wins.
//
// IMPORTANT:
// This is still an Attendance Engine write path.
// Coach UI must NOT write directly to attendance.
// ======================================================

export async function addManualRegularAttendance(
  lessonId: string,
  studentId: string,
  db: SupabaseClient = supabase
): Promise<{
  attendanceId: string;
  lessonId: string;
  studentId: string;
  attendanceStatus: string;
  attendanceType: string;
}> {

  if (!lessonId) {
    throw new Error(
      "Manual Attendance failed: lesson is required."
    );
  }

  if (!studentId) {
    throw new Error(
      "Manual Attendance failed: student is required."
    );
  }

  // ====================================================
  // 1. Load current Lesson
  // ====================================================

  const {
    data: lesson,
    error: lessonError,
  } = await db
    .from("lessons")
    .select(`
      id,
      class_id,
      academic_year,
      term,
      lesson_date
    `)
    .eq("id", lessonId)
    .single();

  if (lessonError) {
    throw lessonError;
  }

  if (!lesson) {
    throw new Error(
      "Manual Attendance failed: lesson not found."
    );
  }

  // ====================================================
  // 2. Check existing Attendance
  //
  // Existing Attendance always wins.
  // ====================================================

  const {
    data: existingAttendance,
    error: existingAttendanceError,
  } = await db
    .from("attendance")
    .select(`
      id,
      lesson_id,
      student_id,
      attendance_status,
      attendance_type
    `)
    .eq("lesson_id", lessonId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (existingAttendanceError) {
    throw existingAttendanceError;
  }

  if (existingAttendance) {
    return {
      attendanceId: existingAttendance.id,
      lessonId,
      studentId,
      attendanceStatus:
        existingAttendance.attendance_status,
      attendanceType:
        existingAttendance.attendance_type,
    };
  }

  // ====================================================
  // 3. Resolve Previous Term
  //
  // Current Term 1:
  //   Previous = previous Academic Year Term 4
  //
  // Current Term 2/3/4:
  //   Previous = same Academic Year, previous Term
  // ====================================================

  const currentAcademicYear =
    Number(lesson.academic_year);

  const currentTerm =
    Number(lesson.term);

  const previousAcademicYear =
    currentTerm === 1
      ? currentAcademicYear - 1
      : currentAcademicYear;

  const previousTerm =
    currentTerm === 1
      ? 4
      : currentTerm - 1;

  // ====================================================
  // 4. Verify student was enrolled in the SAME CLASS
  //    in the previous term.
  //
  // Only Active Regular enrolment is accepted.
  // Trial students are excluded.
  // ====================================================

  const {
    data: previousEnrollment,
    error: previousEnrollmentError,
  } = await db
    .from("student_enrolments")
    .select(`
      id,
      student_id,
      class_id,
      academic_year,
      term,
      status,
      is_trial
    `)
    .eq("student_id", studentId)
    .eq("class_id", lesson.class_id)
    .eq(
      "academic_year",
      previousAcademicYear
    )
    .eq(
      "term",
      previousTerm
    )
    .eq("status", "Active")
    .eq("is_trial", false)
    .maybeSingle();

  if (previousEnrollmentError) {
    throw previousEnrollmentError;
  }

  if (!previousEnrollment) {
    throw new Error(
      "Manual Attendance failed: student was not enrolled in this class in the previous term."
    );
  }

  // ====================================================
  // 5. Verify student is NOT currently enrolled
  //    in this lesson's class.
  //
  // This protects the meaning of:
  // "Add Unenrolled Student"
  // ====================================================

  const {
    data: currentEnrollment,
    error: currentEnrollmentError,
  } = await db
    .from("student_enrolments")
    .select("id")
    .eq("student_id", studentId)
    .eq(
      "academic_year",
      currentAcademicYear
    )
    .eq(
      "term",
      currentTerm
    )
    .eq("status", "Active")
    .maybeSingle();

  if (currentEnrollmentError) {
    throw currentEnrollmentError;
  }

  if (currentEnrollment) {
    throw new Error(
      "Manual Attendance failed: student is already enrolled in this class for the current term."
    );
  }

  // ====================================================
  // 6. Insert through Attendance Engine
  //
  // This is the ONLY database write in this function.
  //
  // No:
  // - current enrolment
  // - make-up credit
  // - trial
  // - leave
  // - holiday
  // ====================================================

  const now =
    new Date().toISOString();

  const {
    data: insertedAttendance,
    error: insertError,
  } = await db
    .from("attendance")
    .insert({
      lesson_id: lessonId,
      student_id: studentId,
      attendance_status: "Present",
      attendance_type: "Regular",
      created_at: now,
      updated_at: now,
    })
    .select(`
      id,
      lesson_id,
      student_id,
      attendance_status,
      attendance_type
    `)
    .single();

  if (insertError) {
    throw insertError;
  }

  if (!insertedAttendance) {
    throw new Error(
      "Manual Attendance failed: Attendance record was not created."
    );
  }

  return {
    attendanceId:
      insertedAttendance.id,
    lessonId:
      insertedAttendance.lesson_id,
    studentId:
      insertedAttendance.student_id,
    attendanceStatus:
      insertedAttendance.attendance_status,
    attendanceType:
      insertedAttendance.attendance_type,
  };
}