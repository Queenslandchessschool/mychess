import { supabase } from "@/lib/supabase";

/**
 * Special Arrangement → Actual Attendance → Single Lesson Fee
 *
 * Business rules:
 * - Only formal Active enrolments.
 * - Trial students are excluded.
 * - The lesson must be covered by an Active Special Arrangement.
 * - Only an actual Present/Late attendance creates the fee.
 * - No Leave Record.
 * - No Make-up Credit.
 * - Attendance keeps attendance_type = "Holiday".
 * - Uses the existing tuition_adjustments /
 *   Pending Additional Payment mechanism.
 *
 * Idempotency:
 * - Each Attendance row represents one specific student + lesson.
 * - attendance_logs are used to determine whether this specific
 *   attendance has already been recorded as actual Present/Late.
 * - Therefore different SA lessons can each create their own fee,
 *   while the same SA lesson cannot be charged twice.
 */
export async function createSpecialArrangementAttendanceFee(
  studentId: string,
  lessonId: string
): Promise<void> {
  /*
   * ------------------------------------------------------------
   * 1. Find the student's active formal enrolment
   * ------------------------------------------------------------
   */
  const { data: enrolment, error: enrolmentError } =
    await supabase
      .from("student_enrolments")
      .select(`
        id,
        student_id,
        is_trial,
        status,
        standard_tuition,
        tuition_configuration_id
      `)
      .eq("student_id", studentId)
      .eq("is_trial", false)
      .eq("status", "Active")
      .maybeSingle();

  if (enrolmentError) {
    throw enrolmentError;
  }

  if (!enrolment) {
    return;
  }

  /*
   * ------------------------------------------------------------
   * 2. Confirm this lesson belongs to an Active SA
   * ------------------------------------------------------------
   */
  const {
    data: arrangementLesson,
    error: arrangementError,
  } = await supabase
    .from("special_arrangement_lessons")
    .select(`
      id,
      lesson_id,
      special_arrangements!inner (
        id,
        student_enrolment_id,
        status
      )
    `)
    .eq("lesson_id", lessonId)
    .eq(
      "special_arrangements.student_enrolment_id",
      enrolment.id
    )
    .eq("special_arrangements.status", "Active")
    .maybeSingle();

  if (arrangementError) {
    throw arrangementError;
  }

  if (!arrangementLesson) {
    return;
  }

  /*
   * ------------------------------------------------------------
   * 3. Confirm the Attendance row is actually Present/Late
   * ------------------------------------------------------------
   *
   * Holiday is deliberately preserved in attendance_type.
   */
  const {
    data: attendance,
    error: attendanceError,
  } = await supabase
    .from("attendance")
    .select(`
      id,
      student_id,
      lesson_id,
      attendance_status,
      attendance_type
    `)
    .eq("student_id", studentId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (attendanceError) {
    throw attendanceError;
  }

  if (!attendance) {
    return;
  }

  if (
    attendance.attendance_type !== "Holiday" ||
    !["Present", "Late"].includes(
      attendance.attendance_status
    )
  ) {
    return;
  }

  /*
   * ------------------------------------------------------------
   * 4. Prevent duplicate fee for the same SA lesson
   * ------------------------------------------------------------
   *
   * The Attendance row belongs to one specific student + lesson.
   *
   * attendance_logs contains:
   * - attendance_id
   * - action
   * - new_status
   *
   * If this Attendance has ever already been recorded as
   * Present/Late, the actual-attendance fee has already been
   * processed for this lesson.
   *
   * This also prevents:
   * Present → Late
   * Late → Present
   * Present → Absent → Present
   *
   * from creating additional fees for the same lesson.
   */
  const {
    data: actualAttendanceLogs,
    error: logError,
  } = await supabase
    .from("attendance_logs")
    .select("id, new_status")
    .eq("attendance_id", attendance.id)
    .eq("action", "Status Change")
    .in("new_status", ["Present", "Late"])
    .limit(1);

  if (logError) {
    throw logError;
  }

  if (
    actualAttendanceLogs &&
    actualAttendanceLogs.length > 0
  ) {
    return;
  }

  /*
   * ------------------------------------------------------------
   * 5. Get the configured single-lesson fee
   * ------------------------------------------------------------
   */
  const {
    data: tuitionConfig,
    error: tuitionConfigError,
  } = await supabase
    .from("tuition_configurations")
.select("single_lesson_fee")
.eq("id", enrolment.tuition_configuration_id)
.single();

  if (tuitionConfigError) {
    throw tuitionConfigError;
  }

  const singleLessonFee = Number(
    tuitionConfig?.single_lesson_fee ?? 0
  );

  if (singleLessonFee <= 0) {
    return;
  }

  /*
   * ------------------------------------------------------------
   * 6. Create Pending Additional Payment
   * ------------------------------------------------------------
   *
   * This intentionally reuses the existing tuition adjustment
   * mechanism used by Mid-term Transfer / Parent Tuition.
   *
   * This is NOT a class transfer, therefore the same formal
   * enrolment is used for both original and new enrolment IDs.
   */
  const originalTuition = Number(
    enrolment.standard_tuition ?? 0
  );

  const revisedTuition = Number(
    (
      originalTuition +
      singleLessonFee
    ).toFixed(2)
  );

  const {
    error: adjustmentError,
  } = await supabase
    .from("tuition_adjustments")
    .insert({
      student_id: studentId,

      original_enrollment_id: enrolment.id,
      new_enrollment_id: enrolment.id,

      original_tuition: originalTuition,
      revised_tuition: revisedTuition,

      paid_amount: 0,

      adjustment_amount: singleLessonFee,
      system_calculated_amount: singleLessonFee,

      adjustment_type: "Additional Payment",

      status: "Pending",
    });

  if (adjustmentError) {
    throw adjustmentError;
  }
}