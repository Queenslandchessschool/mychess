import { supabase } from "@/lib/supabase";

type RecalculateResult = {
  amountPayable: number;
  cancelledLessonCount: number;
  specialArrangementLessonCount: number;
  singleLessonFee: number;
};

export async function recalculateSpecialArrangementTuition(
  enrolmentId: string
): Promise<RecalculateResult> {
  // 1. Load enrolment tuition information
  const { data: enrolment, error: enrolmentError } = await supabase
    .from("student_enrolments")
    .select(
      "id, student_id, class_id, academic_year, term, standard_tuition, redeem_amount"
    )
    .eq("id", enrolmentId)
    .single();

  if (enrolmentError) {
    throw new Error(
      `Failed to load enrolment: ${enrolmentError.message}`
    );
  }

  if (!enrolment) {
    throw new Error("Enrolment not found.");
  }

  const standardTuition = Number(enrolment.standard_tuition ?? 0);
  const redeemAmount = Number(enrolment.redeem_amount ?? 0);

  // 2. Load the latest Re-enrolment Submission baseline, if this
  //    enrolment belongs to a Re-enrolment flow.
  //
  //    For Re-enrolment, amount_payable already includes the
  //    applicable cancelled-lesson / redeem / other enrolment-stage
  //    calculations. Special Arrangement must adjust this amount,
  //    rather than recalculating those deductions again.
  const { data: reEnrolmentSubmission, error: submissionError } =
    await supabase
      .from("re_enrolment_submissions")
      .select("amount_payable, status, submitted_at")
      .eq("student_id", enrolment.student_id)
      .eq("academic_year", enrolment.academic_year)
      .eq("term", enrolment.term)
      .in("status", ["Draft", "Submitted", "Completed"])
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (submissionError) {
    throw new Error(
      `Failed to load re-enrolment submission: ${submissionError.message}`
    );
  }

  const hasReEnrolmentBaseline =
    reEnrolmentSubmission?.amount_payable != null;

  const reEnrolmentBaseline = hasReEnrolmentBaseline
    ? Number(reEnrolmentSubmission.amount_payable)
    : null;

  // 3. Load single lesson fee
  const { data: tuitionConfig, error: tuitionConfigError } =
    await supabase
      .from("tuition_configurations")
      .select("single_lesson_fee")
      .eq("academic_year", enrolment.academic_year)
      .eq("term", enrolment.term)
      .eq("class_id", enrolment.class_id)
      .maybeSingle();

  if (tuitionConfigError) {
    throw new Error(
      `Failed to load tuition configuration: ${tuitionConfigError.message}`
    );
  }

  const singleLessonFee = Number(
    tuitionConfig?.single_lesson_fee ?? 0
  );

  // 4. Load all cancelled lessons for this class and term
  const { data: cancelledLessons, error: cancelledLessonsError } =
    await supabase
      .from("lessons")
      .select("id")
      .eq("class_id", enrolment.class_id)
      .eq("academic_year", enrolment.academic_year)
      .eq("term", enrolment.term)
      .eq("status", "Cancelled");

  if (cancelledLessonsError) {
    throw new Error(
      `Failed to load cancelled lessons: ${cancelledLessonsError.message}`
    );
  }

  const cancelledLessonIds = new Set(
    (cancelledLessons ?? []).map((lesson) => lesson.id)
  );

  // 5. Load active Special Arrangements
  const { data: activeArrangements, error: arrangementsError } =
    await supabase
      .from("special_arrangements")
      .select("id")
      .eq("student_enrolment_id", enrolmentId)
      .eq("status", "Active");

  if (arrangementsError) {
    throw new Error(
      `Failed to load special arrangements: ${arrangementsError.message}`
    );
  }

  const arrangementIds = (activeArrangements ?? []).map(
    (arrangement) => arrangement.id
  );

  let specialArrangementLessonIds = new Set<string>();

  // 6. Load mapped lessons from active Special Arrangements
  if (arrangementIds.length > 0) {
    const { data: mappings, error: mappingsError } = await supabase
      .from("special_arrangement_lessons")
      .select("lesson_id")
      .in("special_arrangement_id", arrangementIds);

    if (mappingsError) {
      throw new Error(
        `Failed to load special arrangement lessons: ${mappingsError.message}`
      );
    }

    specialArrangementLessonIds = new Set(
      (mappings ?? [])
        .map((mapping) => mapping.lesson_id)
        .filter((lessonId) => !cancelledLessonIds.has(lessonId))
    );
  }

  const cancelledLessonCount = cancelledLessonIds.size;
  const specialArrangementLessonCount =
    specialArrangementLessonIds.size;

  // 7. Calculate final tuition.
  //
  // Re-enrolment:
  // Use the saved Re-enrolment amount as the stable pre-SA baseline.
  // Do NOT deduct cancelled lessons or redeem again.
  //
  // Normal Registration / legacy enrolment:
  // Fall back to the original calculation because there is no
  // Re-enrolment Submission baseline.
  const specialArrangementDeduction =
    specialArrangementLessonCount * singleLessonFee;

  let amountPayable: number;

  if (reEnrolmentBaseline != null) {
    amountPayable = Math.max(
      0,
      reEnrolmentBaseline - specialArrangementDeduction
    );
  } else {
    const cancelledDeduction =
      cancelledLessonCount * singleLessonFee;

    amountPayable = Math.max(
      0,
      standardTuition -
        cancelledDeduction -
        specialArrangementDeduction -
        redeemAmount
    );
  }

  // 8. Update the authoritative amount_payable
  const { error: updateError } = await supabase
    .from("student_enrolments")
    .update({
      amount_payable: amountPayable,
      updated_at: new Date().toISOString(),
    })
    .eq("id", enrolmentId);

  if (updateError) {
    throw new Error(
      `Failed to update amount payable: ${updateError.message}`
    );
  }

  return {
    amountPayable,
    cancelledLessonCount,
    specialArrangementLessonCount,
    singleLessonFee,
  };
}