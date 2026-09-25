"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/currentUser";
import { getBusinessTime } from "@/lib/businessTime";

import ChessboardBackground from "@/components/layout/ChessboardBackground";

type Student = {
  id: string;
  student_code: string | null;
  first_name: string;
  last_name: string;
};

type ClassRecord = {
  id: string;
  campus_id: string | null;
  level: string | null;
  class_suffix: string | null;
  day: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string | null;
};

type Campus = {
  id: string;
  campus_code: string | null;
  short_name: string | null;
};

type Enrollment = {
  id: string;
  student_id: string;
  class_id: string;
  academic_year: number;
  term: number;
  status: string;
  is_trial: boolean | null;
  start_date: string | null;
  end_date: string | null;
  join_date: string | null;
  payment_status: string | null;
  payment_amount: number | null;
  standard_tuition: number | null;
  redeem_amount: number | null;
  amount_payable: number | null;
  tuition_configuration_id: string | null;
};

type TransferHistoryRow = {
  id: string;
  studentName: string;
  transferDate: string | null;
  fromClass: string;
  toClass: string;
  adjustmentAmount: number;
  adjustmentType: string;
  status: string;
  systemCalculatedAmount: number | null;
  overrideAmount: number | null;
  overrideReason: string | null;
};

type PopupState = {
  open: boolean;
  title: string;
  message: string;
  type: "success" | "error" | "info";
};

function formatTime(value: string | null) {
  if (!value) return "";
  return value.substring(0, 5);
}

function buildClassName(
  classRecord: ClassRecord | null | undefined,
  campusMap: Map<string, Campus>
) {
  if (!classRecord) return "—";

  const campus = classRecord.campus_id
    ? campusMap.get(classRecord.campus_id)
    : undefined;

  const campusName =
    campus?.campus_code ??
    campus?.short_name ??
    "";

  const day = classRecord.day?.substring(0, 3) ?? "";
  const level = classRecord.level ?? "";
  const suffix = classRecord.class_suffix?.trim() ?? "";

  const time =
    classRecord.start_time && classRecord.end_time
      ? `${formatTime(classRecord.start_time)}–${formatTime(
          classRecord.end_time
        )}`
      : "";

  return [campusName, day, time, level, suffix]
    .filter(Boolean)
    .join(" | ") || "Class";
}

export default function TransferPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);

  const [selectedStudentId, setSelectedStudentId] = useState("");
const [studentSearch, setStudentSearch] = useState("");

const [currentEnrollment, setCurrentEnrollment] =
  useState<Enrollment | null>(null);

const [transferHistory, setTransferHistory] =
  useState<TransferHistoryRow[]>([]);

 const [selectedClassId, setSelectedClassId] = useState("");
const [classSearch, setClassSearch] = useState("");
const [effectiveDate, setEffectiveDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [overrideId, setOverrideId] = useState<string | null>(null);
const [overrideAmount, setOverrideAmount] = useState("");
const [overrideReason, setOverrideReason] = useState("");
const [overrideSaving, setOverrideSaving] = useState(false);

  const [popup, setPopup] = useState<PopupState>({
    open: false,
    title: "",
    message: "",
    type: "info",
  });

  function showPopup(
  title: string,
  message: string,
  type: PopupState["type"] = "info"
) {
  setPopup({
    open: true,
    title,
    message,
    type,
  });
}

  const campusMap = new Map(
    campuses.map((item) => [item.id, item])
  );

  useEffect(() => {
    void loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setErrorMessage("");

    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "admin") {
      setErrorMessage("Admin access is required.");
      setLoading(false);
      return;
    }

    const [
      studentResult,
      classResult,
      campusResult,
    ] = await Promise.all([
      supabase
        .from("students")
        .select(
          "id, student_code, first_name, last_name"
        )
        .eq("status", "Active")
        .order("first_name")
        .order("last_name"),

      supabase
        .from("classes")
        .select(
          "id, campus_id, level, class_suffix, day, start_time, end_time, status"
        )
        .eq("status", "Active")
        .order("day")
        .order("start_time"),

      supabase
        .from("campuses")
        .select(
          "id, campus_code, short_name"
        )
        .order("short_name"),
    ]);

    if (
      studentResult.error ||
      classResult.error ||
      campusResult.error
    ) {
      console.error(
        "TRANSFER LOAD ERROR:",
        studentResult.error ??
          classResult.error ??
          campusResult.error
      );

      setErrorMessage(
        "Unable to load transfer data."
      );

      setLoading(false);
      return;
    }

    setStudents(
      (studentResult.data ?? []) as Student[]
    );

    setClasses(
      (classResult.data ?? []) as ClassRecord[]
    );

    setCampuses(
      (campusResult.data ?? []) as Campus[]
    );

        /*
     * ------------------------------------------------------
     * Transfer History
     * ------------------------------------------------------
     */

    const { data: adjustmentData, error: adjustmentError } =
      await supabase
        .from("tuition_adjustments")
        .select(`
  id,
  student_id,
  original_enrollment_id,
  new_enrollment_id,
  adjustment_amount,
  adjustment_type,
  status,
  system_calculated_amount,
  override_amount,
  override_reason,
  created_at
`)
        .order("created_at", { ascending: false });

    if (adjustmentError) {
      console.error(
        "TRANSFER HISTORY LOAD ERROR:",
        adjustmentError
      );

      setErrorMessage(
        "Unable to load transfer history."
      );

      setTransferHistory([]);
      setLoading(false);
      return;
    }

    if (!adjustmentData || adjustmentData.length === 0) {
      setTransferHistory([]);
    } else {
      const studentIds = [
        ...new Set(
          adjustmentData.map(
            (item: any) => item.student_id
          )
        ),
      ];

      const enrollmentIds = [
        ...new Set(
          adjustmentData.flatMap((item: any) => [
            item.original_enrollment_id,
            item.new_enrollment_id,
          ])
        ),
      ];

      const [
        historyStudentsResult,
        historyEnrollmentsResult,
      ] = await Promise.all([
        supabase
          .from("students")
          .select(
            "id, first_name, last_name"
          )
          .in("id", studentIds),

        supabase
          .from("student_enrolments")
          .select(
            "id, student_id, class_id, start_date"
          )
          .in("id", enrollmentIds),
      ]);

      if (
        historyStudentsResult.error ||
        historyEnrollmentsResult.error
      ) {
        console.error(
          "TRANSFER HISTORY RELATION LOAD ERROR:",
          historyStudentsResult.error ??
            historyEnrollmentsResult.error
        );

        setErrorMessage(
          "Unable to load transfer history."
        );

        setTransferHistory([]);
        setLoading(false);
        return;
      }

      const historyStudentMap = new Map(
        (historyStudentsResult.data ?? []).map(
          (item: any) => [item.id, item]
        )
      );

      const historyEnrollmentMap = new Map(
        (historyEnrollmentsResult.data ?? []).map(
          (item: any) => [item.id, item]
        )
      );

      const historyClassIds = [
        ...new Set(
          (historyEnrollmentsResult.data ?? [])
            .map(
              (item: any) => item.class_id
            )
            .filter(Boolean)
        ),
      ];

      let historyClasses: any[] = [];

      if (historyClassIds.length > 0) {
        const {
          data: historyClassData,
          error: historyClassError,
        } = await supabase
          .from("classes")
          .select(
            "id, campus_id, level, class_suffix, day, start_time, end_time"
          )
          .in("id", historyClassIds);

        if (historyClassError) {
          console.error(
            "TRANSFER HISTORY CLASS LOAD ERROR:",
            historyClassError
          );

          setErrorMessage(
            "Unable to load transfer history."
          );

          setTransferHistory([]);
          setLoading(false);
          return;
        }

        historyClasses =
          historyClassData ?? [];
      }

      const historyClassMap = new Map(
        historyClasses.map(
          (item: any) => [item.id, item]
        )
      );

      const historyRows =
        adjustmentData.map((item: any) => {
          const student =
            historyStudentMap.get(
              item.student_id
            );

          const originalEnrollment =
            historyEnrollmentMap.get(
              item.original_enrollment_id
            );

          const newEnrollment =
            historyEnrollmentMap.get(
              item.new_enrollment_id
            );

          const originalClass =
            historyClassMap.get(
              originalEnrollment?.class_id
            );

          const newClass =
            historyClassMap.get(
              newEnrollment?.class_id
            );

          return {
            id: item.id,
            studentName:
              student
                ? `${student.first_name} ${student.last_name}`
                : "—",
            transferDate:
              newEnrollment?.start_date ??
              item.created_at,
            fromClass: buildClassName(
              originalClass,
              campusMap
            ),
            toClass: buildClassName(
              newClass,
              campusMap
            ),
           adjustmentAmount:
  Number(
    item.adjustment_amount ?? 0
  ),
adjustmentType:
  item.adjustment_type,
status:
  item.status,
systemCalculatedAmount:
  item.system_calculated_amount !== null
    ? Number(item.system_calculated_amount)
    : null,
overrideAmount:
  item.override_amount !== null
    ? Number(item.override_amount)
    : null,
overrideReason:
  item.override_reason ?? null,
          };
        });

      setTransferHistory(
        historyRows as TransferHistoryRow[]
      );
    }

    setLoading(false);
  }

  async function loadCurrentEnrollment(
    studentId: string
  ) {
    setCurrentEnrollment(null);
    setSelectedClassId("");
    setEffectiveDate("");
    setErrorMessage("");

    if (!studentId) return;

    const { data, error } = await supabase
      .from("student_enrolments")
     .select(`
  id,
  student_id,
  class_id,
  academic_year,
  term,
  status,
  is_trial,
  start_date,
  end_date,
  join_date,
  payment_status,
  payment_amount,
  standard_tuition,
  redeem_amount,
  amount_payable,
  tuition_configuration_id
`)
      .eq("student_id", studentId)
      .eq("status", "Active")
      .eq("is_trial", false)
      .order("academic_year", {
        ascending: false,
      })
      .order("term", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        "TRANSFER ENROLLMENT LOAD ERROR:",
        error
      );

      setErrorMessage(
        "Unable to load the student's current enrolment."
      );

      return;
    }

    if (!data) {
      setErrorMessage(
        "No active regular enrolment was found."
      );

      return;
    }

    const enrollment = data as Enrollment;

    setCurrentEnrollment(enrollment);

    const today = getBusinessTime().dateKey;

    setEffectiveDate(
      enrollment.start_date &&
        enrollment.start_date > today
        ? enrollment.start_date
        : today
    );
  }
function openOverride(item: TransferHistoryRow) {
  if (item.status !== "Pending") {
    return;
  }

  setOverrideId(item.id);
  setOverrideAmount(
    item.adjustmentAmount.toFixed(2)
  );
  setOverrideReason("");
  setErrorMessage("");
}
  async function saveOverride() {
    if (!overrideId) {
      return;
    }

    const parsedAmount = Number(
      overrideAmount.trim()
    );

    if (!Number.isFinite(parsedAmount)) {
      setErrorMessage(
        "Please enter a valid override amount."
      );
      return;
    }

    if (!overrideReason.trim()) {
      setErrorMessage(
        "Please provide an override reason."
      );
      return;
    }

    setOverrideSaving(true);
    setErrorMessage("");

    try {
      const { data: adjustment, error: loadError } =
        await supabase
          .from("tuition_adjustments")
          .select(`
            id,
            status,
            original_tuition,
            system_calculated_amount
          `)
          .eq("id", overrideId)
          .maybeSingle();

      if (loadError) {
        throw loadError;
      }

      if (!adjustment) {
        throw new Error(
          "Tuition adjustment not found."
        );
      }

      if (adjustment.status !== "Pending") {
        throw new Error(
          "Only Pending tuition adjustments can be overridden."
        );
      }

      const finalAmount = Number(
        parsedAmount.toFixed(2)
      );

      const adjustmentType =
        finalAmount > 0
          ? "Additional Payment"
          : finalAmount < 0
            ? "Tuition Credit"
            : "No Adjustment";

      const revisedTuition = Number(
        (
          Number(
            adjustment.original_tuition ?? 0
          ) + finalAmount
        ).toFixed(2)
      );

      const { error: updateError } =
        await supabase
          .from("tuition_adjustments")
          .update({
            override_amount: finalAmount,
            override_reason:
              overrideReason.trim(),
            adjustment_amount: finalAmount,
            adjustment_type:
              adjustmentType,
            revised_tuition:
              revisedTuition,
          })
          .eq("id", overrideId)
          .eq("status", "Pending");

      if (updateError) {
        throw updateError;
      }

      setOverrideId(null);
      setOverrideAmount("");
      setOverrideReason("");

      await loadPage();

      showPopup(
        "Override Saved",
        "The tuition adjustment override has been saved.",
        "success"
      );
    } catch (error: any) {
      console.error(
        "TRANSFER ADJUSTMENT OVERRIDE ERROR:",
        error
      );

      setErrorMessage(
        error?.message ??
          "Unable to save the tuition adjustment override."
      );
    } finally {
      setOverrideSaving(false);
    }
  }
  async function handleStudentChange(
    studentId: string
  ) {
    setSelectedStudentId(studentId);
    await loadCurrentEnrollment(studentId);
  }

  async function handleTransfer() {
    if (!currentEnrollment) {
      setErrorMessage(
        "Please select a student with an active enrolment."
      );
      return;
    }

    if (!selectedClassId) {
      setErrorMessage(
        "Please select the new class."
      );
      return;
    }

    if (
      selectedClassId === currentEnrollment.class_id
    ) {
      setErrorMessage(
        "The new class must be different from the current class."
      );
      return;
    }

    if (!effectiveDate) {
      setErrorMessage(
        "Please select the effective date."
      );
      return;
    }

    const student = students.find(
      (item) => item.id === selectedStudentId
    );

    const newClass = classes.find(
      (item) => item.id === selectedClassId
    );

    if (!student || !newClass) {
      setErrorMessage(
        "Student or class could not be found."
      );
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const { data: calendar, error: calendarError } =
        await supabase
          .from("academic_calendar")
          .select(
            "academic_year, term, start_date, end_date"
          )
          .eq(
            "academic_year",
            currentEnrollment.academic_year
          )
          .eq(
            "term",
            currentEnrollment.term
          )
          .single();

      if (calendarError) {
        throw calendarError;
      }

      if (!calendar) {
        throw new Error(
          "Academic Calendar could not be found."
        );
      }

          /*
       * ------------------------------------------------------
       * Tuition calculation for Mid-term Transfer
       * ------------------------------------------------------
       */

      if (
        effectiveDate < calendar.start_date ||
        effectiveDate > calendar.end_date
      ) {
        throw new Error(
          "Effective Date must be within the current term."
        );
      }

      if (
        currentEnrollment.start_date &&
        effectiveDate <= currentEnrollment.start_date
      ) {
        throw new Error(
          "Effective Date must be after the current enrolment start date."
        );
      }

      /*
       * Get Tuition Configuration for old and new classes.
       */

      const { data: oldTuitionConfig, error: oldTuitionError } =
        await supabase
          .from("tuition_configurations")
          .select(
            "id, single_lesson_fee, total_lessons, standard_tuition"
          )
          .eq(
            "academic_year",
            currentEnrollment.academic_year
          )
          .eq(
            "term",
            currentEnrollment.term
          )
          .eq(
            "class_id",
            currentEnrollment.class_id
          )
          .eq("status", "Active")
          .maybeSingle();

      if (oldTuitionError) {
        throw oldTuitionError;
      }

      if (!oldTuitionConfig) {
        throw new Error(
          "Tuition configuration for the current class could not be found."
        );
      }

      const { data: newTuitionConfig, error: newTuitionError } =
        await supabase
          .from("tuition_configurations")
          .select(
            "id, single_lesson_fee, total_lessons, standard_tuition"
          )
          .eq(
            "academic_year",
            currentEnrollment.academic_year
          )
          .eq(
            "term",
            currentEnrollment.term
          )
          .eq(
            "class_id",
            selectedClassId
          )
          .eq("status", "Active")
          .maybeSingle();

      if (newTuitionError) {
        throw newTuitionError;
      }

      if (!newTuitionConfig) {
        throw new Error(
          "Tuition configuration for the new class could not be found."
        );
      }

      /*
       * Get lessons from the OLD class.
       * Only lessons before the transfer date remain
       * chargeable at the old-class rate.
       */

      const { data: oldClassLessons, error: oldLessonsError } =
        await supabase
          .from("lessons")
          .select("id, lesson_date")
          .eq(
            "academic_year",
            currentEnrollment.academic_year
          )
          .eq(
            "term",
            currentEnrollment.term
          )
          .eq(
            "class_id",
            currentEnrollment.class_id
          )
          .in("status", ["Planned", "Completed"])
          .order("lesson_date");

      if (oldLessonsError) {
        throw oldLessonsError;
      }

      /*
       * Get lessons from the NEW class.
       * Only lessons on/after the transfer date are
       * chargeable at the new-class rate.
       */

      const { data: newClassLessons, error: newLessonsError } =
        await supabase
          .from("lessons")
          .select("id, lesson_date")
          .eq(
            "academic_year",
            currentEnrollment.academic_year
          )
          .eq(
            "term",
            currentEnrollment.term
          )
          .eq(
            "class_id",
            selectedClassId
          )
          .in("status", ["Planned", "Completed"])
          .order("lesson_date");

      if (newLessonsError) {
        throw newLessonsError;
      }

      const oldRemainingLessons =
  (oldClassLessons ?? []).filter(
    (lesson) =>
      lesson.lesson_date > effectiveDate
  ).length;

const newRemainingLessons =
  (newClassLessons ?? []).filter(
    (lesson) =>
      lesson.lesson_date > effectiveDate
  ).length;

if (newRemainingLessons === 0) {
  throw new Error(
    "No remaining lessons were found in the new class after the Effective Date. Please generate the new class lessons before completing the transfer."
  );
}

const oldSingleLessonFee =
  Number(oldTuitionConfig.single_lesson_fee ?? 0);

const newSingleLessonFee =
  Number(newTuitionConfig.single_lesson_fee ?? 0);

const oldRemainingTuition =
  oldSingleLessonFee * oldRemainingLessons;

const newRemainingTuition =
  newSingleLessonFee * newRemainingLessons;

const adjustmentAmount =
  newRemainingTuition -
  oldRemainingTuition;

const adjustmentType =
  adjustmentAmount > 0
    ? "Additional Payment"
    : adjustmentAmount < 0
      ? "Tuition Credit"
      : "No Adjustment";

    const originalPaidAmount =
  Number(currentEnrollment.payment_amount ?? 0);

const originalTuition =
  Number(
    currentEnrollment.standard_tuition ??
      oldTuitionConfig.standard_tuition ??
      0
  );

const revisedTuition =
  originalTuition + adjustmentAmount;

     const [year, month, day] = effectiveDate
  .split("-")
  .map(Number);

const effectiveDateObject = new Date(
  Date.UTC(year, month - 1, day)
);

effectiveDateObject.setUTCDate(
  effectiveDateObject.getUTCDate() - 1
);

const previousDate =
  effectiveDateObject
    .toISOString()
    .substring(0, 10);

      /*
       * ------------------------------------------------------
       * 1. Close the current Enrollment segment
       * ------------------------------------------------------
       */

      /*
       * ------------------------------------------------------
       * 1. Close the current Enrollment segment
       * ------------------------------------------------------
       */

      const { error: closeError } =
        await supabase
          .from("student_enrolments")
          .update({
            status: "Inactive",
            end_date: previousDate,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentEnrollment.id)
          .eq("status", "Active");

      if (closeError) {
        throw closeError;
      }

      let newEnrollmentId: string | null = null;
      let adjustmentId: string | null = null;

      try {
        /*
         * ----------------------------------------------------
         * 2. Create the new Enrollment segment
         * ----------------------------------------------------
         */

        const {
          data: newEnrollment,
          error: createError,
        } = await supabase
          .from("student_enrolments")
          .insert({
            student_id:
              currentEnrollment.student_id,

            class_id:
              selectedClassId,

            academic_year:
              currentEnrollment.academic_year,

            term:
              currentEnrollment.term,

            status: "Active",

            start_date:
              effectiveDate,

            end_date:
              calendar.end_date,

            join_date:
              effectiveDate,

            is_trial: false,
            trial_status: null,

            medical_snapshot: null,
            special_request_snapshot: null,

            payment_status:
  adjustmentAmount > 0
    ? "Pending"
    : currentEnrollment.payment_status ?? "Paid",

payment_amount:
  adjustmentAmount > 0
    ? null
    : currentEnrollment.payment_amount ?? 0,

            tuition_configuration_id:
              newTuitionConfig.id,

            pricing_method:
  "Calculated",

            standard_tuition:
  Number(
    newTuitionConfig.standard_tuition ?? 0
  ),

            redeem_amount: 0,

            amount_payable:
              Number(
                Math.max(
                  adjustmentAmount,
                  0
                ).toFixed(2)
              ),
          })
          .select("id")
          .single();

        if (createError) {
          throw createError;
        }

        if (!newEnrollment?.id) {
          throw new Error(
            "New enrolment could not be created."
          );
        }

        newEnrollmentId =
          newEnrollment.id;

        /*
         * ----------------------------------------------------
         * 3. Create Tuition Adjustment
         * ----------------------------------------------------
         */

        const {
          data: adjustment,
          error: adjustmentError,
        } = await supabase
          .from("tuition_adjustments")
          .insert({
            student_id:
              currentEnrollment.student_id,

            original_enrollment_id:
              currentEnrollment.id,

            new_enrollment_id:
              newEnrollment.id,

            original_tuition:
  Number(
    currentEnrollment.standard_tuition ??
      oldTuitionConfig.standard_tuition ??
      0
  ),

            revised_tuition:
              Number(
                revisedTuition.toFixed(2)
              ),

            paid_amount:
              Number(
                originalPaidAmount.toFixed(2)
              ),

                        adjustment_amount:
              Number(
                adjustmentAmount.toFixed(2)
              ),

            system_calculated_amount:
              Number(
                adjustmentAmount.toFixed(2)
              ),

            adjustment_type:
              adjustmentType,

            status:
              adjustmentAmount > 0
                ? "Pending"
                : adjustmentAmount < 0
                  ? "Pending"
                  : "Applied",
          })
          .select("id")
          .single();

        if (adjustmentError) {
          throw adjustmentError;
        }

        if (!adjustment?.id) {
          throw new Error(
            "Tuition adjustment could not be created."
          );
        }

        adjustmentId =
          adjustment.id;

        /*
         * ----------------------------------------------------
         * 4. Update Student Current Snapshot
         * ----------------------------------------------------
         */

        const {
          data: classData,
          error: classError,
        } = await supabase
          .from("classes")
          .select(`
            id,
            level,
            class_suffix,
            day
          `)
          .eq("id", selectedClassId)
          .single();

        if (classError) {
          throw classError;
        }

        if (!classData) {
          throw new Error(
            "Selected class could not be found."
          );
        }

        const currentClass =
          classData.class_suffix?.trim()
            ? `${classData.day} | ${classData.class_suffix}`
            : classData.day ?? "";

        const {
          error: studentUpdateError,
        } = await supabase
          .from("students")
          .update({
            current_level:
              classData.level,

            current_class:
              currentClass,

            current_class_id:
              classData.id,
          })
          .eq(
            "id",
            selectedStudentId
          );

        if (studentUpdateError) {
          throw studentUpdateError;
        }
      } catch (transferError) {
        /*
         * ----------------------------------------------------
         * Rollback partial Transfer
         * ----------------------------------------------------
         */

        if (adjustmentId) {
          await supabase
            .from("tuition_adjustments")
            .delete()
            .eq(
              "id",
              adjustmentId
            );
        }

        if (newEnrollmentId) {
          await supabase
            .from("student_enrolments")
            .delete()
            .eq(
              "id",
              newEnrollmentId
            );
        }

        await supabase
          .from("student_enrolments")
          .update({
            status: "Active",
            end_date:
              currentEnrollment.end_date,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            currentEnrollment.id
          );

        throw transferError;
      }

      showPopup(
        "Transfer Completed",
        `${student.first_name} ${student.last_name} has been transferred to ${buildClassName(
          newClass,
          campusMap
        )} from ${effectiveDate}.`,
        "success"
      );

      setSelectedClassId("");

      await loadCurrentEnrollment(
        selectedStudentId
      );
    } catch (error: any) {
      console.error(
        "TRANSFER ERROR:",
        error
      );

      setErrorMessage(
        error?.message ??
          "Unable to complete the transfer."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <ChessboardBackground>
        <main className="min-h-screen">
          <div className="mx-auto max-w-[1600px] px-6 py-10 text-[#F4F7FB]">
            Loading...
          </div>
        </main>
      </ChessboardBackground>
    );
  }

  return (
    <ChessboardBackground>
      <main className="min-h-screen">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">

          <div className="mb-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#D4AF37]">
              ENROLMENT
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#F4F7FB] sm:text-3xl">
              Mid-term Class Transfer
            </h1>

            <p className="mt-1 text-sm text-[#C8D2DF]/75">
              Transfer a student to another class during the current term.
            </p>
          </div>

          <div className="rounded-[18px] border border-[#D4AF37]/30 bg-[#102B4D] p-5 shadow-xl">

            <div className="grid grid-cols-1 gap-5">

              {/* Student */}

              <div>
                <label className="mb-2 block text-sm font-medium text-[#F4F7FB]">
                  Student
                </label>

                <div className="space-y-2">
  <input
    type="text"
    placeholder="Search student by code or name..."
    value={studentSearch}
    onChange={(e) => setStudentSearch(e.target.value)}
    className="w-full rounded-lg border border-white/70 bg-white px-3 py-2.5 text-sm text-[#10213A] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
  />

  <select
    value={selectedStudentId}
    onChange={(e) =>
      void handleStudentChange(e.target.value)
    }
    className="w-full rounded-lg border border-white/70 bg-white px-3 py-2.5 text-sm text-[#10213A] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
  >
    <option value="">Select Student</option>

    {students
      .filter((student) => {
        const keyword = studentSearch
          .trim()
          .toLowerCase();

        if (!keyword) return true;

        return [
          student.student_code,
          student.first_name,
          student.last_name,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(keyword)
          );
      })
      .map((student) => (
        <option
          key={student.id}
          value={student.id}
        >
          {student.student_code
            ? `${student.student_code} — `
            : ""}
          {student.first_name}{" "}
          {student.last_name}
        </option>
      ))}
  </select>
</div>
              </div>

              {/* Current Class */}

              {currentEnrollment && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">

                  <p className="text-xs uppercase tracking-wider text-[#C8D2DF]/60">
                    Current Class
                  </p>

                  <p className="mt-1 font-semibold text-[#F4F7FB]">
                    {buildClassName(
                      classes.find(
                        (item) =>
                          item.id ===
                          currentEnrollment.class_id
                      ),
                      campusMap
                    )}
                  </p>

                  <p className="mt-1 text-xs text-[#C8D2DF]/65">
                    Term {currentEnrollment.term},{" "}
                    {currentEnrollment.academic_year}
                  </p>

                </div>
              )}

              {/* New Class */}

              {currentEnrollment && (
                <div className="space-y-2">
  <input
    type="text"
    placeholder="Search class by day, time, level or suffix..."
    value={classSearch}
    onChange={(e) => setClassSearch(e.target.value)}
    className="w-full rounded-lg border border-white/70 bg-white px-3 py-2.5 text-sm text-[#10213A] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
  />

  <select
    value={selectedClassId}
    onChange={(e) =>
      setSelectedClassId(e.target.value)
    }
    className="w-full rounded-lg border border-white/70 bg-white px-3 py-2.5 text-sm text-[#10213A] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
  >
    <option value="">Select New Class</option>

    {classes
      .filter(
        (item) =>
          item.id !== currentEnrollment.class_id
      )
      .filter((item) => {
        const keyword = classSearch
          .trim()
          .toLowerCase();

        if (!keyword) return true;

        return [
          item.day,
          item.start_time,
          item.end_time,
          item.level,
          item.class_suffix,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(keyword)
          );
      })
      .map((item) => (
        <option
          key={item.id}
          value={item.id}
        >
          {buildClassName(item, campusMap)}
        </option>
      ))}
  </select>
</div>
              )}

              {/* Effective Date */}

              {currentEnrollment && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#F4F7FB]">
                    Effective Date
                  </label>

                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) =>
                      setEffectiveDate(
                        e.target.value
                      )
                    }
                    min={
                      currentEnrollment.start_date ??
                      undefined
                    }
                    max={
                      currentEnrollment.end_date ??
                      undefined
                    }
                    className="w-full rounded-lg border border-white/70 bg-white px-3 py-2.5 text-sm text-[#10213A] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                  />
                </div>
              )}

              {/* Error */}

              {errorMessage && (
                <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {errorMessage}
                </div>
              )}

              {/* Confirm */}

              {currentEnrollment && (
                <div className="flex justify-end pt-2">

                  <button
                    type="button"
                    onClick={() =>
                      void handleTransfer()
                    }
                    disabled={saving}
                    className="rounded-lg bg-[#D4AF37] px-5 py-2.5 text-sm font-semibold text-[#10213A] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Processing..."
                      : "Confirm Transfer"}
                  </button>

                </div>
              )}

            </div>
          </div>

          {/* ------------------------------------------------------
 * Transfer History
 * ------------------------------------------------------ */}

<div className="mt-6 overflow-hidden rounded-[18px] border border-[#D4AF37]/30 bg-white shadow-xl">
  <div className="border-t-4 border-[#D4AF37] px-5 py-5 sm:px-6">
    <div>
      <h2 className="text-lg font-bold text-[#10213A] sm:text-xl">
        Transfer History
      </h2>

      <p className="mt-1 text-sm text-[#64748B]">
        Completed mid-term class transfers and tuition adjustments.
      </p>
    </div>

    {transferHistory.length === 0 ? (
      <div className="mt-5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-8 text-center text-sm text-[#64748B]">
        No transfer history available.
      </div>
    ) : (
      <>
        {/* Mobile */}
        <div className="mt-5 space-y-3 md:hidden">
          {transferHistory.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-semibold text-[#10213A]">
                    {item.studentName}
                  </p>

                  <p className="mt-1 text-xs text-[#64748B]">
                    {item.transferDate
  ? new Date(item.transferDate).toLocaleDateString(
                      "en-AU",
                      {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }
                    )
  : "—"}
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-[#F1F5F9] px-2.5 py-1 text-xs font-semibold text-[#475569]">
                  {item.status}
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#64748B]">
                    From
                  </p>
                  <p className="mt-1 break-words text-sm text-[#10213A]">
                    {item.fromClass}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#64748B]">
                    To
                  </p>
                  <p className="mt-1 break-words text-sm font-semibold text-[#10213A]">
                    {item.toClass}
                  </p>
                </div>

                <div className="flex items-end justify-between gap-4 border-t border-[#E2E8F0] pt-3">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#64748B]">
                      Adjustment
                    </p>

                    <p className="mt-1 text-sm font-semibold text-[#10213A]">
                      {item.adjustmentAmount > 0
                        ? `+$${item.adjustmentAmount.toFixed(2)}`
                        : item.adjustmentAmount < 0
                          ? `-$${Math.abs(
                              item.adjustmentAmount
                            ).toFixed(2)}`
                          : "$0.00"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#64748B]">
                      Type
                    </p>

                    <p className="mt-1 text-sm text-[#10213A]">
                      {item.adjustmentType}
                    </p>
                  </div>
                </div>
                              {item.status === "Pending" && (
                <div className="border-t border-[#E2E8F0] pt-3">
                  {overrideId === item.id ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#64748B]">
                          System Calculated
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#10213A]">
                          {item.systemCalculatedAmount !== null
                            ? item.systemCalculatedAmount > 0
                              ? `+$${item.systemCalculatedAmount.toFixed(2)}`
                              : item.systemCalculatedAmount < 0
                                ? `-$${Math.abs(item.systemCalculatedAmount).toFixed(2)}`
                                : "$0.00"
                            : "—"}
                        </p>
                      </div>

                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#64748B]">
                          Override Amount
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={overrideAmount}
                          onChange={(e) =>
                            setOverrideAmount(e.target.value)
                          }
                          className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#10213A] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#64748B]">
                          Override Reason
                        </label>
                        <textarea
                          value={overrideReason}
                          onChange={(e) =>
                            setOverrideReason(e.target.value)
                          }
                          rows={3}
                          className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#10213A] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                          placeholder="Enter reason for override..."
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void saveOverride()}
                          disabled={overrideSaving}
                          className="rounded-lg bg-[#D4AF37] px-3 py-2 text-xs font-semibold text-[#10213A] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {overrideSaving
                            ? "Saving..."
                            : "Save Override"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setOverrideId(null);
                            setOverrideAmount("");
                            setOverrideReason("");
                          }}
                          disabled={overrideSaving}
                          className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-semibold text-[#475569] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openOverride(item)}
                      className="w-full rounded-lg border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-3 py-2 text-xs font-semibold text-[#8A6D1D] transition hover:bg-[#D4AF37]/20"
                    >
                      Override Adjustment
                    </button>
                  )}
                </div>
              )}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop / Tablet */}
        <div className="mt-5 hidden overflow-hidden rounded-xl border border-[#E2E8F0] md:block">
          <div className="max-h-[420px] overflow-y-auto overflow-x-hidden">
            <table className="w-full table-fixed border-collapse">
              <thead className="sticky top-0 z-10 bg-[#F8FAFC]">
                <tr className="border-b border-[#E2E8F0]">
                  <th className="w-[14%] px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                    Student
                  </th>

                  <th className="w-[11%] px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                    Transfer Date
                  </th>

                  <th className="w-[15%] px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                    From
                  </th>

                  <th className="w-[15%] px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                    To
                  </th>

                  <th className="w-[10%] px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                    Adjustment
                  </th>

                  <th className="w-[10%] px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                    Type
                  </th>

                  <th className="w-[7%] px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">
  Status
</th>

<th className="w-[18%] px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">
  Override
</th>
                </tr>
              </thead>

              <tbody>
                {transferHistory.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[#E2E8F0] last:border-b-0"
                  >
                    <td className="break-words px-3 py-4 text-sm font-semibold text-[#10213A]">
                      {item.studentName}
                    </td>

                    <td className="break-words px-3 py-4 text-sm text-[#475569]">
                      {item.transferDate
  ? new Date(item.transferDate).toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  : "—"}
                    </td>

                    <td className="break-words px-3 py-4 text-sm text-[#475569]">
                      {item.fromClass}
                    </td>

                    <td className="break-words px-3 py-4 text-sm font-medium text-[#10213A]">
                      {item.toClass}
                    </td>

                    <td className="break-words px-3 py-4 text-right text-sm font-semibold text-[#10213A]">
                      {item.adjustmentAmount > 0
                        ? `+$${item.adjustmentAmount.toFixed(2)}`
                        : item.adjustmentAmount < 0
                          ? `-$${Math.abs(
                              item.adjustmentAmount
                            ).toFixed(2)}`
                          : "$0.00"}
                    </td>

                    <td className="break-words px-3 py-4 text-sm text-[#475569]">
                      {item.adjustmentType}
                    </td>

                    <td className="break-words px-3 py-4 text-sm font-semibold text-[#475569]">
                      {item.status}
                    </td>
                                        <td className="px-3 py-4 text-sm">
                      {item.status === "Pending" ? (
                        overrideId === item.id ? (
                          <div className="min-w-[220px] space-y-3">
                            <div>
                              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#64748B]">
                                System Calculated
                              </p>

                              <p className="mt-1 font-semibold text-[#10213A]">
                                {item.systemCalculatedAmount !== null
                                  ? item.systemCalculatedAmount > 0
                                    ? `+$${item.systemCalculatedAmount.toFixed(2)}`
                                    : item.systemCalculatedAmount < 0
                                      ? `-$${Math.abs(item.systemCalculatedAmount).toFixed(2)}`
                                      : "$0.00"
                                  : "—"}
                              </p>
                            </div>

                            <div>
                              <label className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#64748B]">
                                Override Amount
                              </label>

                              <input
                                type="number"
                                step="0.01"
                                value={overrideAmount}
                                onChange={(e) =>
                                  setOverrideAmount(e.target.value)
                                }
                                className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-white px-2 py-1.5 text-sm text-[#10213A] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#64748B]">
                                Override Reason
                              </label>

                              <textarea
                                value={overrideReason}
                                onChange={(e) =>
                                  setOverrideReason(e.target.value)
                                }
                                rows={3}
                                className="mt-1 w-full rounded-lg border border-[#CBD5E1] bg-white px-2 py-1.5 text-sm text-[#10213A] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                                placeholder="Enter reason..."
                              />
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => void saveOverride()}
                                disabled={overrideSaving}
                                className="rounded-lg bg-[#D4AF37] px-3 py-2 text-xs font-semibold text-[#10213A] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {overrideSaving
                                  ? "Saving..."
                                  : "Save"}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setOverrideId(null);
                                  setOverrideAmount("");
                                  setOverrideReason("");
                                }}
                                disabled={overrideSaving}
                                className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-semibold text-[#475569] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openOverride(item)}
                            className="rounded-lg border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-3 py-2 text-xs font-semibold text-[#8A6D1D] transition hover:bg-[#D4AF37]/20"
                          >
                            Override
                          </button>
                        )
                      ) : (
                        <span className="text-xs text-[#94A3B8]">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    )}
  </div>
</div>

          {/* Popup */}

          {popup.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">

              <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#102B4D] p-6 shadow-2xl">

                <h2 className="text-lg font-bold text-[#F4F7FB]">
                  {popup.title}
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#C8D2DF]">
                  {popup.message}
                </p>

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setPopup((previous) => ({
                        ...previous,
                        open: false,
                      }))
                    }
                    className="rounded-lg bg-[#D4AF37] px-5 py-2 text-sm font-semibold text-[#10213A]"
                  >
                    OK
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>
    </ChessboardBackground>
  );
}