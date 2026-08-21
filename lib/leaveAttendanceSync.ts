// ======================================================
// MyCHESS Leave → Attendance + Make-up Credit Sync
//
// M011.02
// Leave Business Sync
//
// Purpose:
// - Provide ONE shared Leave business rule
// - Used by Admin Attendance
// - Used by Coach Attendance
//
// Frozen Business Rule:
//
// Parent submits Leave
//        ↓
// Immediate Sync
//        ↓
// Regular → Make-up Credit = Available
// Trial   → NO Make-up Credit
//
// Attendance:
// - If Attendance already exists:
//      Attendance = Excused
//      Credit.attendance_id = Attendance.id
//
// - If Attendance does NOT exist:
//      Credit is STILL created
//      Credit.attendance_id = NULL
//
// - When Attendance is generated later:
//      Running this sync again links the Credit
//      to the Attendance record.
//
// IMPORTANT:
// - Leave is the source event for Make-up Credit.
// - Attendance is NOT a prerequisite for Credit.
// - Attendance creation remains the responsibility of
//   attendanceEngine / attendanceRunner.
// - Make-up Credit is stored in makeup_credits.
// - One eligible Leave generates ONE Credit.
// - Existing Credit is never duplicated.
// - Trial students do NOT receive Make-up Credit.
//
// Business Timezone:
// Australia/Brisbane
//
// Shared by:
// - Admin Attendance
// - Coach Attendance
// ======================================================

import { supabase } from "@/lib/supabase";


// ======================================================
// Sync Leave Requests
//
// For a given Lesson:
//
// 1. Load submitted Leave Records
// 2. Load Lesson context
// 3. Load Active Regular Enrolments
// 4. Match Leave by lesson_id + student_id
// 5. Check corresponding Attendance
// 6. If Attendance exists → mark Excused
// 7. Check whether Credit already exists
// 8. Trial students receive NO Credit
// 9. Regular students receive ONE Available Credit
// 10. If Credit already exists but Attendance was previously
//     missing, link the Attendance now.
//
// This function is SAFE to run repeatedly.
// ======================================================

export async function syncLeaveRequests(
  lessonId: string
): Promise<void> {

  // ====================================================
  // 1. Load submitted Leave Records
  //
  // Parent submission creates a Submitted Leave record.
  //
  // Only Submitted Leave records are synchronised here.
  // ====================================================

  const {
    data: leaveRecords,
    error: leaveError,
  } = await supabase
    .from("leave_records")
    .select(`
      id,
      lesson_id,
      student_id,
      reason,
      comments
    `)
    .eq("lesson_id", lessonId)
    .eq("status", "Submitted");


  if (leaveError) {

    console.error(
      "LEAVE → SYNC ERROR:",
      leaveError
    );

    throw leaveError;
  }


  // ====================================================
  // 2. Nothing to synchronise
  // ====================================================

  if (
    !leaveRecords ||
    leaveRecords.length === 0
  ) {
    return;
  }


  // ====================================================
  // 3. Load Lesson Context
  //
  // Credit eligibility is determined from the
  // Student Enrolment belonging to this Lesson.
  //
  // We use:
  // - academic_year
  // - term
  // - class_id
  //
  // from the Lesson itself.
  // ====================================================

  const {
    data: lesson,
    error: lessonError,
  } = await supabase
    .from("lessons")
    .select(`
      id,
      academic_year,
      term,
      class_id
    `)
    .eq("id", lessonId)
    .single();


  if (lessonError) {

    console.error(
      "LEAVE → LESSON CONTEXT ERROR:",
      {
        lessonId,
        error: lessonError,
      }
    );

    throw lessonError;
  }


  if (!lesson) {

    throw new Error(
      "LEAVE → CREDIT SYNC: Lesson not found."
    );
  }


  // ====================================================
  // 4. Load Active Regular Enrolments
  //
  // Credit eligibility:
  //
  // - Same class
  // - Same academic year
  // - Same term
  // - Active enrolment
  // - is_trial = false
  //
  // Trial students are intentionally excluded.
  //
  // Student Enrolment is the authoritative source for
  // Regular / Trial status.
  // ====================================================

  const {
    data: regularEnrolments,
    error: enrolmentError,
  } = await supabase
    .from("student_enrolments")
    .select(`
      student_id
    `)
    .eq(
      "class_id",
      lesson.class_id
    )
    .eq(
      "academic_year",
      lesson.academic_year
    )
    .eq(
      "term",
      lesson.term
    )
    .eq(
      "status",
      "Active"
    )
    .eq(
      "is_trial",
      false
    );


  if (enrolmentError) {

    console.error(
      "LEAVE → ENROLMENT LOOKUP ERROR:",
      {
        lessonId,
        error: enrolmentError,
      }
    );

    throw enrolmentError;
  }


  // ====================================================
  // 5. Build Regular Student Set
  // ====================================================

  const regularStudentIds =
    new Set<string>(
      (regularEnrolments ?? [])
        .map(
          (enrolment) =>
            enrolment.student_id
        )
        .filter(Boolean)
    );


  // ====================================================
  // 6. Process each Leave Record
  // ====================================================

  for (const leave of leaveRecords) {

    // ==================================================
    // 6A. Find corresponding Attendance
    //
    // IMPORTANT:
    //
    // Attendance is OPTIONAL at this stage.
    //
    // Leave → Credit does NOT depend on Attendance.
    //
    // If Attendance already exists, we will:
    //
    // - mark it Excused
    // - link Credit.attendance_id
    //
    // If Attendance does not exist yet:
    //
    // - Credit is still created
    // - attendance_id remains NULL
    // ==================================================

    const {
      data: attendance,
      error: attendanceLookupError,
    } = await supabase
      .from("attendance")
      .select("id")
      .eq(
        "lesson_id",
        lessonId
      )
      .eq(
        "student_id",
        leave.student_id
      )
      .maybeSingle();


    if (attendanceLookupError) {

      console.error(
        "LEAVE → ATTENDANCE LOOKUP ERROR:",
        {
          lessonId,
          studentId:
            leave.student_id,
          leaveId:
            leave.id,
          error:
            attendanceLookupError,
        }
      );

      throw attendanceLookupError;
    }


    // ==================================================
    // 6B. If Attendance exists, mark it Excused
    //
    // Attendance creation itself remains outside this
    // function.
    //
    // This function only synchronises an existing record.
    // ==================================================

    if (attendance) {

      const {
        error: attendanceUpdateError,
      } = await supabase
        .from("attendance")
        .update({
          attendance_type:
            "Excused",
        })
        .eq(
          "id",
          attendance.id
        );


      if (attendanceUpdateError) {

        console.error(
          "LEAVE → ATTENDANCE UPDATE ERROR:",
          {
            lessonId,
            studentId:
              leave.student_id,
            leaveId:
              leave.id,
            attendanceId:
              attendance.id,
            error:
              attendanceUpdateError,
          }
        );

        throw attendanceUpdateError;
      }

    } else {

      console.log(
        "LEAVE → ATTENDANCE NOT YET GENERATED:",
        {
          lessonId,
          studentId:
            leave.student_id,
          leaveId:
            leave.id,
        }
      );
    }


    // ==================================================
    // 6C. Check whether Credit already exists
    //
    // leave_record_id is the idempotency key.
    //
    // One Leave
    //    ↓
    // One Credit
    //
    // This function can safely run repeatedly.
    // ==================================================

    const {
      data: existingCredit,
      error: creditLookupError,
    } = await supabase
      .from("makeup_credits")
      .select(`
        id,
        attendance_id,
        status
      `)
      .eq(
        "leave_record_id",
        leave.id
      )
      .maybeSingle();


    if (creditLookupError) {

      console.error(
        "LEAVE → CREDIT LOOKUP ERROR:",
        {
          lessonId,
          studentId:
            leave.student_id,
          leaveId:
            leave.id,
          error:
            creditLookupError,
        }
      );

      throw creditLookupError;
    }


    // ==================================================
    // 6D. Credit already exists
    //
    // Two possibilities:
    //
    // A. Credit already linked to Attendance
    //    → Nothing to do.
    //
    // B. Credit exists but attendance_id is NULL
    //    and Attendance now exists
    //    → Complete the relationship.
    //
    // This handles the situation where:
    //
    // Leave submitted
    //       ↓
    // Credit created
    //       ↓
    // Attendance generated later
    //       ↓
    // Sync runs again
    // ==================================================

    if (existingCredit) {

      if (
        attendance &&
        !existingCredit.attendance_id
      ) {

        const {
          error: creditLinkError,
        } = await supabase
          .from("makeup_credits")
          .update({
            attendance_id:
              attendance.id,
          })
          .eq(
            "id",
            existingCredit.id
          );


        if (creditLinkError) {

          console.error(
            "LEAVE → CREDIT ATTENDANCE LINK ERROR:",
            {
              lessonId,
              studentId:
                leave.student_id,
              leaveId:
                leave.id,
              creditId:
                existingCredit.id,
              attendanceId:
                attendance.id,
              error:
                creditLinkError,
            }
          );

          throw creditLinkError;
        }


        console.log(
          "LEAVE → CREDIT ATTENDANCE LINKED:",
          {
            lessonId,
            studentId:
              leave.student_id,
            leaveId:
              leave.id,
            creditId:
              existingCredit.id,
            attendanceId:
              attendance.id,
          }
        );
      }

      continue;
    }


    // ==================================================
    // 6E. Trial Eligibility Check
    //
    // Trial:
    //   Attendance = Excused (if Attendance exists)
    //   Credit     = NO
    //
    // Regular:
    //   Credit     = Available
    //
    // IMPORTANT:
    // This check is completely independent of whether
    // Attendance currently exists.
    // ==================================================

    if (
      !regularStudentIds.has(
        leave.student_id
      )
    ) {

      console.log(
        "LEAVE → CREDIT SKIPPED: Student is not eligible for Make-up Credit.",
        {
          lessonId,
          studentId:
            leave.student_id,
          leaveId:
            leave.id,
        }
      );

      continue;
    }


    // ==================================================
    // 6F. Create Make-up Credit
    //
    // Frozen Credit Rule:
    //
    // One eligible Leave
    //        ↓
    // One Credit
    //
    // Initial status:
    // Available
    //
    // Attendance may or may not exist yet.
    //
    // Therefore:
    //
    // attendance_id =
    //   Attendance.id if available
    //   NULL if Attendance not generated yet
    // ==================================================

    const {
      error: creditInsertError,
    } = await supabase
      .from("makeup_credits")
      .insert({
        student_id:
          leave.student_id,

        leave_record_id:
          leave.id,

        attendance_id:
          attendance?.id ??
          null,

        credits:
          1,

        status:
          "Available",

        reason:
          leave.reason ??
          "Leave",
      });


    if (creditInsertError) {

      console.error(
        "LEAVE → CREDIT CREATION ERROR:",
        {
          lessonId,
          studentId:
            leave.student_id,
          leaveId:
            leave.id,
          attendanceId:
            attendance?.id ??
            null,
          error:
            creditInsertError,
        }
      );

      throw creditInsertError;
    }


    console.log(
      "LEAVE → CREDIT CREATED:",
      {
        lessonId,
        studentId:
          leave.student_id,
        leaveId:
          leave.id,
        attendanceId:
          attendance?.id ??
          null,
      }
    );
  }
}
// ======================================================
// Reverse Leave Request
//
// Shared business action for:
// - Parent Cancel Leave
// - Admin Attendance: Leave -> Present
// - Coach Attendance: Leave -> Present
//
// Frozen V1:
// - Attendance is never deleted.
// - Active Leave is cancelled.
// - Available Make-up Credit created from this Leave
//   is deleted.
// - Used Credit is never deleted.
// - Trial Leave has no Credit.
// ======================================================

export async function reverseLeaveRequest(
  leaveRecordId: string
) {
  console.log(
  "REVERSE LEAVE ENGINE VERSION:",
  "2026-08-21-A",
  leaveRecordId
);
  // ----------------------------------------------------
  // 1. Load Leave Record
  // ----------------------------------------------------

  const {
    data: leaveRecord,
    error: leaveError,
  } = await supabase
    .from("leave_records")
    .select(`
      id,
      student_id,
      lesson_id,
      status
    `)
    .eq("id", leaveRecordId)
    .single();

  if (leaveError) {
    throw leaveError;
  }

  if (!leaveRecord) {
    throw new Error(
      "Leave record not found."
    );
  }

  // ----------------------------------------------------
  // 2. Idempotency
  //
  // Already cancelled / inactive:
  // nothing else to reverse.
  // ----------------------------------------------------

  if (
    leaveRecord.status !==
    "Submitted"
  ) {
    return {
      success: true,
      alreadyReversed: true,
    };
  }

  // ----------------------------------------------------
  // 3. Cancel Leave Record
  // ----------------------------------------------------

  const {
    error: cancelError,
  } = await supabase
    .from("leave_records")
    .update({
      status: "Cancelled",
      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      leaveRecord.id
    )
    .eq(
      "status",
      "Submitted"
    );

  if (cancelError) {
    throw cancelError;
  }

// ----------------------------------------------------
// 4. Restore Attendance → Present
//
// IMPORTANT:
// Attendance record is never deleted.
// ----------------------------------------------------

const {
  error: attendanceError,
} = await supabase
  .from("attendance")
  .update({
    attendance_status: "Present",
    attendance_type: "Regular",
  })
  .eq(
    "student_id",
    leaveRecord.student_id
  )
  .eq(
    "lesson_id",
    leaveRecord.lesson_id
  );

if (attendanceError) {
  throw attendanceError;
}

// ----------------------------------------------------
// 5. Remove Available Credit generated by this Leave
//
// One Leave → one Credit.
//
// Only Available Credit can be deleted.
// Used Credit is untouched.
// ----------------------------------------------------

  const {
    error: creditError,
  } = await supabase
    .from("makeup_credits")
    .delete()
    .eq(
      "leave_record_id",
      leaveRecord.id
    )
    .eq(
      "status",
      "Available"
    );

  if (creditError) {
    throw creditError;
  }

  return {
    success: true,
    alreadyReversed: false,
  };
}