// ======================================================
// MyCHESS Special Arrangement → Attendance Sync
//
// Purpose:
// - Provide ONE shared Special Arrangement business rule
// - Sync Active Special Arrangement lessons to Attendance
// - Used by Admin Special Arrangement management
//
// Frozen Business Rule:
// - Special Arrangement = planned holiday
// - Affected Attendance = Present + Holiday
// - No Leave Record
// - No Make-up Credit
// - Attendance creation remains the responsibility of
//   attendanceEngine / attendanceRunner
// - Historical Attendance must not be rewritten
// - Matching is always by lesson_id + student_id
//
// IMPORTANT:
// - This function only synchronises existing Attendance.
// - It does NOT create Attendance records.
// ======================================================

import { supabase } from "@/lib/supabase";
import { hasLessonStarted } from "@/lib/attendanceTime";

// ======================================================
// Sync one Special Arrangement
// ======================================================

export async function syncSpecialArrangementAttendance(
  specialArrangementId: string
): Promise<void> {
  // ----------------------------------------------------
  // 1. Load Special Arrangement
  // ----------------------------------------------------

  const {
    data: arrangement,
    error: arrangementError,
  } = await supabase
    .from("special_arrangements")
    .select(`
      id,
      student_enrolment_id,
      start_date,
      end_date,
      status
    `)
    .eq("id", specialArrangementId)
    .single();

  if (arrangementError) {
    console.error(
      "SA → ATTENDANCE ARRANGEMENT LOOKUP ERROR:",
      {
        specialArrangementId,
        error: arrangementError,
      }
    );

    throw arrangementError;
  }

  if (!arrangement) {
    throw new Error(
      "Special Arrangement not found."
    );
  }

  // ----------------------------------------------------
  // 2. Only Active SA can create Holiday Attendance
  // ----------------------------------------------------

  if (arrangement.status !== "Active") {
    return;
  }

  // ----------------------------------------------------
  // 3. Load Student from authoritative Enrolment
  // ----------------------------------------------------

  const {
    data: enrolment,
    error: enrolmentError,
  } = await supabase
    .from("student_enrolments")
    .select(`
      id,
      student_id
    `)
    .eq(
      "id",
      arrangement.student_enrolment_id
    )
    .single();

  if (enrolmentError) {
    console.error(
      "SA → ATTENDANCE ENROLMENT LOOKUP ERROR:",
      {
        specialArrangementId,
        studentEnrolmentId:
          arrangement.student_enrolment_id,
        error: enrolmentError,
      }
    );

    throw enrolmentError;
  }

  if (!enrolment) {
    throw new Error(
      "Student Enrolment not found for Special Arrangement."
    );
  }

  // ----------------------------------------------------
  // 4. Load SA → Lesson mappings
  // ----------------------------------------------------

  const {
    data: mappings,
    error: mappingError,
  } = await supabase
    .from("special_arrangement_lessons")
    .select(`
      lesson_id
    `)
    .eq(
      "special_arrangement_id",
      specialArrangementId
    );

  if (mappingError) {
    console.error(
      "SA → ATTENDANCE MAPPING LOOKUP ERROR:",
      {
        specialArrangementId,
        error: mappingError,
      }
    );

    throw mappingError;
  }

  if (
    !mappings ||
    mappings.length === 0
  ) {
    return;
  }

  // ----------------------------------------------------
  // 5. Load lesson dates
  //
  // Historical Attendance must not be rewritten.
  // Only future lessons are synchronised.
  // ----------------------------------------------------

  const lessonIds = mappings
    .map(
      (mapping) =>
        mapping.lesson_id
    )
    .filter(Boolean);

  const {
    data: lessons,
    error: lessonError,
  } = await supabase
    .from("lessons")
    .select(`
      id,
      lesson_date
    `)
    .in(
      "id",
      lessonIds
    );

  if (lessonError) {
    console.error(
      "SA → ATTENDANCE LESSON LOOKUP ERROR:",
      {
        specialArrangementId,
        error: lessonError,
      }
    );

    throw lessonError;
  }

  if (
    !lessons ||
    lessons.length === 0
  ) {
    return;
  }

  // ----------------------------------------------------
  // 6. Determine Brisbane "today"
  //
  // SA must not rewrite historical Attendance.
  // ----------------------------------------------------

  const todayBrisbane =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Australia/Brisbane",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).format(
      new Date()
    );

  // ----------------------------------------------------
  // 7. Process affected future lessons
  // ----------------------------------------------------

  for (const lesson of lessons) {
    if (
      !lesson.lesson_date
    ) {
      continue;
    }

    const lessonDate =
      String(
        lesson.lesson_date
      ).slice(0, 10);

    // Historical lessons are never rewritten.
    if (
      lessonDate <
      todayBrisbane
    ) {
      continue;
    }

    // --------------------------------------------------
    // 8. Find Attendance by lesson + student
    // --------------------------------------------------

    const {
      data: attendance,
      error: attendanceLookupError,
    } = await supabase
      .from("attendance")
      .select(`
        id,
        attendance_status,
        attendance_type
      `)
      .eq(
        "lesson_id",
        lesson.id
      )
      .eq(
        "student_id",
        enrolment.student_id
      )
      .maybeSingle();

    if (attendanceLookupError) {
      console.error(
        "SA → ATTENDANCE LOOKUP ERROR:",
        {
          specialArrangementId,
          lessonId:
            lesson.id,
          studentId:
            enrolment.student_id,
          error:
            attendanceLookupError,
        }
      );

      throw attendanceLookupError;
    }

    // --------------------------------------------------
    // 9. Attendance does not exist yet
    //
    // Attendance creation remains with
    // attendanceEngine / attendanceRunner.
    // --------------------------------------------------

    if (!attendance) {
      console.log(
        "SA → ATTENDANCE NOT YET GENERATED:",
        {
          specialArrangementId,
          lessonId:
            lesson.id,
          studentId:
            enrolment.student_id,
        }
      );

      continue;
    }

// --------------------------------------------------
// 10. Existing Holiday already synced
// --------------------------------------------------

if (
  attendance.attendance_type ===
  "Holiday"
) {
  continue;
}

    // --------------------------------------------------
    // 11. Apply Special Arrangement
    //
    // Holiday is represented by:
    //   attendance_status = Present
    //   attendance_type   = Holiday
    // --------------------------------------------------

    const {
      error: attendanceUpdateError,
    } = await supabase
      .from("attendance")
      .update({
        attendance_status:
          "Present",
        attendance_type:
          "Holiday",
      })
      .eq(
        "id",
        attendance.id
      );

    if (attendanceUpdateError) {
      console.error(
        "SA → ATTENDANCE UPDATE ERROR:",
        {
          specialArrangementId,
          lessonId:
            lesson.id,
          studentId:
            enrolment.student_id,
          attendanceId:
            attendance.id,
          error:
            attendanceUpdateError,
        }
      );

      throw attendanceUpdateError;
    }

    console.log(
      "SA → ATTENDANCE HOLIDAY SYNCED:",
      {
        specialArrangementId,
        lessonId:
          lesson.id,
        studentId:
          enrolment.student_id,
        attendanceId:
          attendance.id,
      }
    );
  }
}
export async function clearSpecialArrangementAttendance(
  specialArrangementId: string
): Promise<void> {
  const { data: arrangement, error: arrangementError } =
    await supabase
      .from("special_arrangements")
      .select("id, student_enrolment_id")
      .eq("id", specialArrangementId)
      .single();

  if (arrangementError) {
    throw arrangementError;
  }

  if (!arrangement) {
    return;
  }

  const { data: enrolment, error: enrolmentError } =
    await supabase
      .from("student_enrolments")
      .select("id, student_id")
      .eq("id", arrangement.student_enrolment_id)
      .single();

  if (enrolmentError) {
    throw enrolmentError;
  }

  if (!enrolment?.student_id) {
    return;
  }

  const { data: mappings, error: mappingError } =
    await supabase
      .from("special_arrangement_lessons")
      .select("lesson_id")
      .eq("special_arrangement_id", specialArrangementId);

  if (mappingError) {
    throw mappingError;
  }

  const lessonIds = (mappings ?? [])
    .map((item) => item.lesson_id)
    .filter(Boolean);

  if (lessonIds.length === 0) {
    return;
  }

  const todayBrisbane = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Australia/Brisbane",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(new Date());

  const { data: lessons, error: lessonError } =
    await supabase
      .from("lessons")
      .select("id, lesson_date")
      .in("id", lessonIds);

  if (lessonError) {
    throw lessonError;
  }

  const futureLessonIds = (lessons ?? [])
    .filter(
      (lesson) =>
        lesson.lesson_date &&
        lesson.lesson_date >= todayBrisbane
    )
    .map((lesson) => lesson.id);

  if (futureLessonIds.length === 0) {
    return;
  }

  const { error: attendanceError } =
    await supabase
      .from("attendance")
      .update({
        attendance_type: "Regular",
      })
      .eq("student_id", enrolment.student_id)
      .in("lesson_id", futureLessonIds)
      .eq("attendance_type", "Holiday");

  if (attendanceError) {
    throw attendanceError;
  }
}
/**
 * Sync Special Arrangement Attendance for one lesson.
 *
 * Shared Admin / Coach business logic.
 * Attendance must already exist (created by Attendance Engine / Runner / Lazy Load).
 * Actual Present / Late attendance is preserved and must never be converted to Holiday.
 */
export async function syncSpecialArrangementAttendanceForLesson(
  lessonId: string
): Promise<void> {
  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("id, class_id, lesson_date")
    .eq("id", lessonId)
    .single();

  if (lessonError) {
    throw lessonError;
  }

  if (!lesson?.lesson_date || !lesson?.class_id) {
    return;
  }

  const { data: classData, error: classError } = await supabase
    .from("classes")
    .select("id, start_time")
    .eq("id", lesson.class_id)
    .single();

  if (classError) {
    throw classError;
  }

  if (!classData?.start_time) {
    return;
  }

  const startTime = classData.start_time;

  if (hasLessonStarted(lesson.lesson_date, startTime)) {
    return;
  }

  const { data: mappings, error: mappingError } = await supabase
    .from("special_arrangement_lessons")
    .select("special_arrangement_id")
    .eq("lesson_id", lessonId);

  if (mappingError) {
    throw mappingError;
  }

  if (!mappings || mappings.length === 0) {
    return;
  }

  const specialArrangementIds = mappings
    .map((row) => row.special_arrangement_id)
    .filter(Boolean);

  if (specialArrangementIds.length === 0) {
    return;
  }

  const { data: arrangements, error: arrangementError } =
    await supabase
      .from("special_arrangements")
      .select("id, student_enrolment_id, status")
      .in("id", specialArrangementIds)
      .eq("status", "Active");

  if (arrangementError) {
    throw arrangementError;
  }

  if (!arrangements || arrangements.length === 0) {
    return;
  }

  const enrolmentIds = arrangements
    .map((row) => row.student_enrolment_id)
    .filter(Boolean);

  if (enrolmentIds.length === 0) {
    return;
  }

  const { data: enrolments, error: enrolmentError } = await supabase
    .from("student_enrolments")
    .select("id, student_id")
    .in("id", enrolmentIds);

  if (enrolmentError) {
    throw enrolmentError;
  }

  if (!enrolments || enrolments.length === 0) {
    return;
  }

  const studentIds = enrolments
    .map((row) => row.student_id)
    .filter(Boolean);

  const { data: attendances, error: attendanceError } = await supabase
    .from("attendance")
    .select(
      "id, student_id, lesson_id, attendance_status, attendance_type"
    )
    .eq("lesson_id", lessonId)
    .in("student_id", studentIds);

  if (attendanceError) {
    throw attendanceError;
  }

  if (!attendances || attendances.length === 0) {
    return;
  }

  const attendanceIds = attendances.map((row) => row.id);

  const { data: logs, error: logError } = await supabase
    .from("attendance_logs")
    .select("attendance_id, action, new_status")
    .in("attendance_id", attendanceIds)
    .eq("action", "Status Change")
    .in("new_status", ["Present", "Late"]);

  if (logError) {
    throw logError;
  }

  const actuallyAttendedIds = new Set(
    (logs ?? []).map((log) => log.attendance_id)
  );

  for (const attendance of attendances) {
    if (attendance.attendance_type === "Holiday") {
  continue;
}

if (actuallyAttendedIds.has(attendance.id)) {
  continue;
}

    const { error: updateError } = await supabase
      .from("attendance")
      .update({
        attendance_status: "Present",
        attendance_type: "Holiday",
      })
      .eq("id", attendance.id);

    if (updateError) {
      throw updateError;
    }
  }
}
