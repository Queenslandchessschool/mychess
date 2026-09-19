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
      "id, class_id, academic_year, term, standard_tuition, redeem_amount"
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

  // 2. Load single lesson fee
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

  // 3. Load all cancelled lessons for this class and term
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

  // 4. Load active Special Arrangements
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

  // 5. Load mapped lessons from active Special Arrangements
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

  // 6. Recalculate the final tuition amount
  const cancelledDeduction =
    cancelledLessonCount * singleLessonFee;

  const specialArrangementDeduction =
    specialArrangementLessonCount * singleLessonFee;

  const amountPayable = Math.max(
    0,
    standardTuition -
      cancelledDeduction -
      specialArrangementDeduction -
      redeemAmount
  );

  // 7. Update the authoritative amount_payable
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