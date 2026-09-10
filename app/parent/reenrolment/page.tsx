"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { synchroniseStudentStage } from "@/lib/studentSynchronisation";

import {
  getBusinessTime,
  setTestClock,
  clearTestClock,
  isTestClockEnabled,
  getTestClockValue,
} from "@/lib/businessTime";

/**
 * ============================================================
 * MyCHESS — Parent Portal — Re-enrolment
 * Step 1: Family + Current Enrolment
 * ============================================================
 *
 * Step 1 only:
 * - Authenticated Parent
 * - Family
 * - Family Children
 * - Current Active Formal Enrolment
 * - Current Class / Campus
 * - Target Re-enrolment Term selection
 *
 * No Submission is created in this step.
 * No existing student_enrolments are modified.
 * ============================================================
 */

type Student = {
  id: string;
  first_name: string | null;
  preferred_name: string | null;
  last_name: string | null;
  school_year: string | null;
  school_class: string | null;
  medical_information: string | null;
};

type Enrollment = {
  id: string;
  student_id: string;
  class_id: string | null;
  academic_year: number | string | null;
  term: number | string | null;
  status: string | null;
  is_trial: boolean | null;
};

type ClassInfo = {
  id: string;
  campus_id: string | null;
  day: string | null;
  start_time: string | null;
  end_time: string | null;
  level: string | null;
  class_suffix: string | null;
  campuses?:
    | {
        campus_code: string | null;
        short_name: string | null;
        campus_name: string | null;
        type: string | null;
      }
    | {
        campus_code: string | null;
        short_name: string | null;
        campus_name: string | null;
        type: string | null;
      }[]
    | null;
};

type FamilyStudent = {
  student: Student;
  enrollment: Enrollment | null;
  classInfo: ClassInfo | null;
};

type Recommendation = {
  id: string;
  student_id: string;
  academic_year: number;
  term: number;
  recommended_class_id: string;
};

type ReenrolmentSubmission = {
  id: string;
  student_id: string;
  academic_year: number;
  term: number;
  status: string;
  payment_status: string;
  submitted_at: string | null;
};

type ClassSchedule = {
  class_id: string;
  academic_year: number;
  term: number;
  first_lesson: string | null;
  final_lesson: string | null;
  status: string | null;
};

type ReenrolmentDisplayState =
  | "NOT_OPEN"
  | "OPEN"
  | "PENDING"
  | "SUBMITTED"
  | "ENROLLED";

type SpecialRequest = {
  classroom_pickup: boolean;
  ymca_dropoff: boolean;
  walk_home: boolean;
};

function getStudentDisplayName(student: Student): string {
  const preferred = student.preferred_name?.trim();
  const first = student.first_name?.trim();
  const last = student.last_name?.trim();

  return `${preferred || first || ""} ${last || ""}`.trim();
}

function getClassDisplayName(classInfo: ClassInfo | null): string {
  if (!classInfo) {
    return "—";
  }

  const level = classInfo.level?.trim() ?? "";
  const suffix = classInfo.class_suffix?.trim() ?? "";

  if (level && suffix) {
    return `${level} ${suffix}`;
  }

  return level || suffix || "—";
}

function getCampusDisplayName(classInfo: ClassInfo | null): string {
  if (!classInfo?.campuses) {
    return "—";
  }

  const campus = Array.isArray(classInfo.campuses)
    ? classInfo.campuses[0]
    : classInfo.campuses;

  if (!campus) {
    return "—";
  }

  return (
    campus.short_name ||
    campus.campus_name ||
    campus.campus_code ||
    "—"
  );
}

function getCampusType(classInfo: ClassInfo | null): string | null {
  if (!classInfo?.campuses) {
    return null;
  }

  const campus = Array.isArray(classInfo.campuses)
    ? classInfo.campuses[0]
    : classInfo.campuses;

  return campus?.type ?? null;
}

function isClassroomPickupAllowed(schoolYear: string | null | undefined): boolean {
  const normalized = schoolYear?.trim().toLowerCase() ?? "";

  return normalized === "prep" || normalized === "year 1";
}

function addOneCalendarDay(dateKey: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;

  let year = Number(match[1]);
  let month = Number(match[2]);
  let day = Number(match[3]) + 1;

  const daysInMonth = (y: number, m: number) => {
    if (m === 2) {
      return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28;
    }
    return [4, 6, 9, 11].includes(m) ? 30 : 31;
  };

  if (day > daysInMonth(year, month)) {
    day = 1;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getSimulatedBrisbaneNowParts(raw: string): {
  dateKey: string;
  hour: number;
  minute: number;
} | null {
  if (!raw) return null;

  // The test value represents Brisbane wall-clock time.
  // Example: 2026-09-16T08:00
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(raw);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return {
    dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    hour,
    minute,
  };
}

function getBrisbaneNowParts(simulatedRaw?: string): {
  dateKey: string;
  hour: number;
  minute: number;
} {
  const now = getBusinessTime();

  return {
    dateKey: now.dateKey,
    hour: now.hour,
    minute: now.minute,
  };
}

function isOpeningReached(
  finalLesson: string | null,
  now: { dateKey: string; hour: number; minute: number }
): boolean {
  if (!finalLesson) return false;

  const openingDate = addOneCalendarDay(finalLesson.slice(0, 10));
  if (!openingDate) return false;

  if (now.dateKey > openingDate) return true;
  if (now.dateKey < openingDate) return false;

  return now.hour >= 8;
}

function isFirstLessonTomorrow(
  firstLesson: string | null,
  nowDateKey: string
): boolean {
  if (!firstLesson) return false;
  return addOneCalendarDay(nowDateKey) === firstLesson.slice(0, 10);
}

function isFirstLessonPendingPeriod(
  firstLesson: string | null,
  nowDateKey: string
): boolean {
  if (!firstLesson) return false;

  const firstLessonDate = firstLesson.slice(0, 10);

  return (
    nowDateKey >= firstLessonDate ||
    addOneCalendarDay(nowDateKey) === firstLessonDate
  );
}

export default function ParentReenrolmentPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [familyStudents, setFamilyStudents] = useState<FamilyStudent[]>(
    []
  );

  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  const [targetAcademicYear, setTargetAcademicYear] = useState<number>(
    new Date().getFullYear()
  );

  const [targetTerm, setTargetTerm] = useState<number>(4);

  const [recommendation, setRecommendation] =
    useState<Recommendation | null>(null);
  const [recommendedClassInfo, setRecommendedClassInfo] =
    useState<ClassInfo | null>(null);
  const [recommendationLoading, setRecommendationLoading] =
    useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  const [specialRequest, setSpecialRequest] = useState<SpecialRequest>({
    classroom_pickup: false,
    ymca_dropoff: false,
    walk_home: false,
  });

  const [schoolYear, setSchoolYear] = useState("");
  const [schoolClass, setSchoolClass] = useState("");
  const [medicalInformation, setMedicalInformation] = useState("");

  const [tuitionConfig, setTuitionConfig] = useState<{
  id: string;
  single_lesson_fee: number;
  total_lessons: number;
  standard_tuition: number;
} | null>(null);
  const [currentClassSingleLessonFee, setCurrentClassSingleLessonFee] = useState(0);
  const [availableMakeupCredits, setAvailableMakeupCredits] = useState(0);
  const [remainingLessons, setRemainingLessons] = useState(0);
const [calculatedTuition, setCalculatedTuition] = useState(0);
const [standardTuition, setStandardTuition] = useState(0);
  const [financialLoading, setFinancialLoading] = useState(false);
  const [declarationConfirmed, setDeclarationConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [reenrolmentSubmissions, setReenrolmentSubmissions] = useState<
    ReenrolmentSubmission[]
  >([]);

  const [currentClassSchedule, setCurrentClassSchedule] =
    useState<ClassSchedule | null>(null);
  const [targetClassSchedule, setTargetClassSchedule] =
    useState<ClassSchedule | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [statusTick, setStatusTick] = useState(0);
  const [testClockEnabled, setTestClockEnabled] = useState(false);
  const [testClockValue, setTestClockValue] = useState("");
  useEffect(() => {
  const enabled = isTestClockEnabled();
  const value = getTestClockValue();

  setTestClockEnabled(enabled);
  setTestClockValue(value);
}, []);
  
  const [familyDisplayStates, setFamilyDisplayStates] = useState<
    Record<string, ReenrolmentDisplayState>
  >({});

  async function loadFamily() {
    setLoading(true);
    setError(null);

    try {
      /**
       * ------------------------------------------------------
       * 1. Authenticated Parent
       * ------------------------------------------------------
       */

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error(
          "You must be signed in to access Re-enrolment."
        );
      }

      const email = user.email?.trim().toLowerCase();

      if (!email) {
        throw new Error(
          "Your account does not have an email address."
        );
      }

      /**
       * ------------------------------------------------------
       * 2. Resolve Family
       * ------------------------------------------------------
       *
       * Same architecture as MyFAMILY:
       * Parent Email → Family ID
       */

      const {
        data: parentRecords,
        error: parentError,
      } = await supabase
        .from("parents")
        .select(`
          family_id,
          student_id
        `)
        .eq("email", email);

      if (parentError) {
        throw parentError;
      }

      if (!parentRecords || parentRecords.length === 0) {
        throw new Error(
          "No Parent record is linked to this account."
        );
      }

      const familyId =
        parentRecords.find((row) => row.family_id)?.family_id ?? null;

      if (!familyId) {
        throw new Error(
          "Your Parent record does not have a Family ID."
        );
      }

      /**
       * ------------------------------------------------------
       * 3. Family Children
       * ------------------------------------------------------
       */

      const {
        data: familyParents,
        error: familyError,
      } = await supabase
        .from("parents")
        .select(`
          student_id
        `)
        .eq("family_id", familyId);

      if (familyError) {
        throw familyError;
      }

      const studentIds = Array.from(
        new Set(
          (familyParents ?? [])
            .map((row) => row.student_id)
            .filter(Boolean)
        )
      ) as string[];

      if (studentIds.length === 0) {
        setFamilyStudents([]);
        setReenrolmentSubmissions([]);
        return;
      }

      /**
       * ------------------------------------------------------
       * Existing Re-enrolment Submissions
       * ------------------------------------------------------
       *
       * Load all non-cancelled submissions for this Family so
       * each child keeps an independent Re-enrolment state.
       */
      const {
        data: submissionData,
        error: submissionLoadError,
      } = await supabase
        .from("re_enrolment_submissions")
        .select(
          `
          id,
          student_id,
          academic_year,
          term,
          status,
          payment_status,
          submitted_at
        `
        )
        .in("student_id", studentIds)
        .in("status", ["Draft", "Submitted", "Completed"])
        .order("submitted_at", { ascending: false });

      if (submissionLoadError) {
        throw submissionLoadError;
      }

      setReenrolmentSubmissions(
        (submissionData ?? []) as ReenrolmentSubmission[]
      );

      /**
       * ------------------------------------------------------
       * 4. Student Master
       * ------------------------------------------------------
       */

      const {
        data: studentData,
        error: studentError,
      } = await supabase
        .from("students")
        .select(`
          id,
          first_name,
          preferred_name,
          last_name,
          school_year,
          school_class,
          medical_information
        `)
        .in("id", studentIds)
        .order("student_code");

      if (studentError) {
        throw studentError;
      }

      const students = (studentData ?? []) as Student[];

      /**
       * ------------------------------------------------------
       * 5. Current Active Formal Enrolments
       * ------------------------------------------------------
       *
       * Trial enrolments are excluded.
       */

      const {
        data: enrollmentData,
        error: enrollmentError,
      } = await supabase
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
        .in("student_id", studentIds)
        .eq("status", "Active")
        .eq("is_trial", false);

      if (enrollmentError) {
        throw enrollmentError;
      }

      const enrollments = (enrollmentData ?? []) as Enrollment[];

      /**
       * ------------------------------------------------------
       * 6. Current Class / Campus
       * ------------------------------------------------------
       */

      const classIds = Array.from(
        new Set(
          enrollments
            .map((item) => item.class_id)
            .filter(Boolean)
        )
      ) as string[];

      let classMap = new Map<string, ClassInfo>();

      if (classIds.length > 0) {
        const {
          data: classData,
          error: classError,
        } = await supabase
          .from("classes")
          .select(`
            id,
            campus_id,
            day,
            start_time,
            end_time,
            level,
            class_suffix,
            campuses:campus_id (
              campus_code,
              short_name,
              campus_name,
              type
            )
          `)
          .in("id", classIds);

        if (classError) {
          throw classError;
        }

        for (const item of classData ?? []) {
          classMap.set(
            item.id,
            item as unknown as ClassInfo
          );
        }
      }

      /**
       * ------------------------------------------------------
       * 7. Build Family View
       * ------------------------------------------------------
       */

      const result = students.map((student) => {
        const enrollment =
          enrollments.find(
            (item) => item.student_id === student.id
          ) ?? null;

        const classInfo =
          enrollment?.class_id
            ? classMap.get(enrollment.class_id) ?? null
            : null;

        return {
          student,
          enrollment,
          classInfo,
        };
      });

      setFamilyStudents(result);

      if (result.length > 0 && !selectedStudentId) {
        setSelectedStudentId(result[0].student.id);
      }

    } catch (loadError: any) {
      console.error(
        "RE-ENROLMENT LOAD ERROR:",
        loadError
      );

      setError(
        loadError?.message ??
          "Unable to load Re-enrolment."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadReenrolmentSchedules() {
    if (
      !selectedStudent?.enrollment?.class_id ||
      !selectedStudent.enrollment.academic_year ||
      !selectedStudent.enrollment.term ||
      !selectedClassId ||
      !targetAcademicYear ||
      !targetTerm
    ) {
      setCurrentClassSchedule(null);
      setTargetClassSchedule(null);
      return;
    }

    setScheduleLoading(true);

    try {
      const currentClassId =
        selectedStudent.classInfo?.id ?? selectedStudent.enrollment.class_id;

      const [currentResult, targetResult] = await Promise.all([
        supabase
          .from("class_schedule")
          .select("class_id, academic_year, term, first_lesson, final_lesson, status")
          .eq("class_id", currentClassId)
          .eq("academic_year", Number(selectedStudent.enrollment.academic_year))
          .eq("term", Number(selectedStudent.enrollment.term))
          .eq("status", "Active")
          .limit(1)
          .maybeSingle(),
        supabase
          .from("class_schedule")
          .select("class_id, academic_year, term, first_lesson, final_lesson, status")
          .eq("class_id", selectedClassId)
          .eq("academic_year", targetAcademicYear)
          .eq("term", targetTerm)
          .eq("status", "Active")
          .limit(1)
          .maybeSingle(),
      ]);

      if (currentResult.error) throw currentResult.error;
      if (targetResult.error) throw targetResult.error;

      setCurrentClassSchedule((currentResult.data ?? null) as ClassSchedule | null);
      setTargetClassSchedule((targetResult.data ?? null) as ClassSchedule | null);
    } catch (scheduleError: any) {
      console.error("RE-ENROLMENT SCHEDULE LOAD ERROR:", scheduleError);
      setCurrentClassSchedule(null);
      setTargetClassSchedule(null);
    } finally {
      setScheduleLoading(false);
    }
  }

  async function loadFamilyDisplayStates() {
    if (
      familyStudents.length === 0 ||
      !targetAcademicYear ||
      !targetTerm
    ) {
      setFamilyDisplayStates({});
      return;
    }

    try {
      const studentIds = familyStudents.map((item) => item.student.id);

      const { data: targetEnrollments, error: targetEnrollmentError } =
        await supabase
          .from("student_enrolments")
          .select("student_id, academic_year, term, status, is_trial")
          .in("student_id", studentIds)
          .eq("academic_year", Number(targetAcademicYear))
          .eq("term", Number(targetTerm))
          .eq("status", "Active")
          .eq("is_trial", false);

      if (targetEnrollmentError) throw targetEnrollmentError;

      const { data: recommendations, error: recommendationError } =
        await supabase
          .from("re_enrolment_recommendations")
          .select("student_id, recommended_class_id")
          .in("student_id", studentIds)
          .eq("academic_year", Number(targetAcademicYear))
          .eq("term", Number(targetTerm));

      if (recommendationError) throw recommendationError;

      const recommendationMap = new Map<string, string>();
      for (const item of recommendations ?? []) {
        if (item.student_id && item.recommended_class_id) {
          recommendationMap.set(item.student_id, item.recommended_class_id);
        }
      }

      const currentScheduleKeys = Array.from(
        new Set(
          familyStudents
            .filter((item) => item.enrollment?.class_id)
            .map(
              (item) =>
                `${item.enrollment!.class_id}|${Number(item.enrollment!.academic_year)}|${Number(item.enrollment!.term)}`
            )
        )
      );

      const currentScheduleResults = await Promise.all(
        currentScheduleKeys.map(async (key) => {
          const [classId, academicYear, term] = key.split("|");
          const { data, error } = await supabase
            .from("class_schedule")
            .select("class_id, academic_year, term, first_lesson, final_lesson, status")
            .eq("class_id", classId)
            .eq("academic_year", Number(academicYear))
            .eq("term", Number(term))
            .eq("status", "Active")
            .limit(1)
            .maybeSingle();
          if (error) throw error;
          return data as ClassSchedule | null;
        })
      );

      const currentScheduleMap = new Map<string, ClassSchedule>();
      for (const schedule of currentScheduleResults) {
        if (schedule) {
          currentScheduleMap.set(
            `${schedule.class_id}|${schedule.academic_year}|${schedule.term}`,
            schedule
          );
        }
      }

      const targetClassIds = Array.from(
        new Set(
          familyStudents
            .map((item) =>
              recommendationMap.get(item.student.id) ?? item.enrollment?.class_id ?? ""
            )
            .filter(Boolean)
        )
      );

      const { data: targetSchedules, error: targetScheduleError } =
        targetClassIds.length > 0
          ? await supabase
              .from("class_schedule")
              .select("class_id, academic_year, term, first_lesson, final_lesson, status")
              .in("class_id", targetClassIds)
              .eq("academic_year", Number(targetAcademicYear))
              .eq("term", Number(targetTerm))
              .eq("status", "Active")
          : { data: [], error: null };

      if (targetScheduleError) throw targetScheduleError;

      const targetScheduleMap = new Map<string, ClassSchedule>();
      for (const schedule of targetSchedules ?? []) {
        targetScheduleMap.set(schedule.class_id, schedule as ClassSchedule);
      }

      const now = getBrisbaneNowParts(testClockEnabled ? testClockValue : undefined);
      const nextStates: Record<string, ReenrolmentDisplayState> = {};

      for (const item of familyStudents) {
        const studentId = item.student.id;
        const submission = reenrolmentSubmissions.find(
          (entry) =>
            entry.student_id === studentId &&
            entry.academic_year === Number(targetAcademicYear) &&
            entry.term === Number(targetTerm) &&
            entry.status !== "Cancelled"
        );

        const targetEnrollment = (targetEnrollments ?? []).find(
          (entry) => entry.student_id === studentId
        );

        if (!item.enrollment) {
          nextStates[studentId] = "NOT_OPEN";
          continue;
        }

        if (submission?.status === "Completed") {
  nextStates[studentId] = "ENROLLED";
  continue;
}

if (submission?.status === "Submitted") {
  nextStates[studentId] = "SUBMITTED";
  continue;
}

if (targetEnrollment) {
  nextStates[studentId] = "ENROLLED";
  continue;
}

        const currentClassId = item.enrollment.class_id;
        const currentSchedule = currentClassId
          ? currentScheduleMap.get(
              `${currentClassId}|${Number(item.enrollment.academic_year)}|${Number(item.enrollment.term)}`
            )
          : null;

        if (!isOpeningReached(currentSchedule?.final_lesson ?? null, now)) {
          nextStates[studentId] = "NOT_OPEN";
          continue;
        }

        const targetClassId =
          recommendationMap.get(studentId) ?? currentClassId ?? "";
        const targetSchedule = targetScheduleMap.get(targetClassId) ?? null;

        nextStates[studentId] = isFirstLessonPendingPeriod(
  targetSchedule?.first_lesson ?? null,
  now.dateKey
)
  ? "PENDING"
  : "OPEN";
      }

      setFamilyDisplayStates(nextStates);
    } catch (stateError) {
      console.error("RE-ENROLMENT FAMILY STATUS LOAD ERROR:", stateError);
      setFamilyDisplayStates({});
    }
  }

  async function loadRecommendation() {
    if (!selectedStudentId || !targetAcademicYear || !targetTerm) {
      setRecommendation(null);
      setRecommendedClassInfo(null);
      return;
    }

    setRecommendationLoading(true);

    try {
      const { data, error: recommendationError } = await supabase
        .from("re_enrolment_recommendations")
        .select(
          `
          id,
          student_id,
          academic_year,
          term,
          recommended_class_id
        `
        )
        .eq("student_id", selectedStudentId)
        .eq("academic_year", targetAcademicYear)
        .eq("term", targetTerm)
        .maybeSingle();

      if (recommendationError) {
        throw recommendationError;
      }

      const nextRecommendation = (data ?? null) as Recommendation | null;
      setRecommendation(nextRecommendation);

      if (!nextRecommendation) {
        setRecommendedClassInfo(null);
        return;
      }

      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select(`
          id,
          campus_id,
          day,
          start_time,
          end_time,
          level,
          class_suffix,
          campuses:campus_id (
            campus_code,
            short_name,
            campus_name,
            type
          )
        `)
        .eq("id", nextRecommendation.recommended_class_id)
        .maybeSingle();

      if (classError) {
        throw classError;
      }

      setRecommendedClassInfo(
        classData ? (classData as unknown as ClassInfo) : null
      );
    } catch (recommendationError: any) {
      console.error(
        "RE-ENROLMENT RECOMMENDATION LOAD ERROR:",
        recommendationError
      );
      setRecommendation(null);
      setRecommendedClassInfo(null);
    } finally {
      setRecommendationLoading(false);
    }
  }

  async function loadReenrolmentFinancials() {
  if (
    !selectedStudentId ||
    !targetAcademicYear ||
    !targetTerm ||
    !selectedClassId
  ) {
    setTuitionConfig(null);
    setCurrentClassSingleLessonFee(0);
    setAvailableMakeupCredits(0);
    setRemainingLessons(0);
    setCalculatedTuition(0);
    setStandardTuition(0);
    return;
  }

  setFinancialLoading(true);

  try {
    /*
     * Tuition pricing source:
     * Recommended / selected target class.
     *
     * For a term that has already started, tuition is based on
     * the remaining chargeable Lessons in the Lesson SSOT.
     * For a future term, the configured full-term Standard Tuition
     * remains the default.
     */
    const { data: tuitionData, error: tuitionError } =
      await supabase
        .from("tuition_configurations")
        .select(`
          id,
          class_id,
          single_lesson_fee,
          total_lessons,
          standard_tuition
        `)
        .eq("academic_year", targetAcademicYear)
        .eq("term", targetTerm)
        .in(
          "class_id",
          Array.from(
            new Set(
              [
                selectedClassId,
                selectedStudent?.classInfo?.id ??
                  selectedStudent?.enrollment?.class_id ??
                  "",
              ].filter(Boolean)
            )
          )
        )
        .eq("status", "Active");

    if (tuitionError) {
      throw tuitionError;
    }

    const selectedTuitionData =
      (tuitionData ?? []).find(
        (row) => row.class_id === selectedClassId
      ) ?? null;

    const currentClassId =
      selectedStudent?.classInfo?.id ??
      selectedStudent?.enrollment?.class_id ??
      "";

    const currentTuitionData =
      (tuitionData ?? []).find(
        (row) => row.class_id === currentClassId
      ) ?? null;

    if (!selectedTuitionData) {
      setTuitionConfig(null);
      setCurrentClassSingleLessonFee(
        Number(currentTuitionData?.single_lesson_fee ?? 0)
      );
      setRemainingLessons(0);
      setCalculatedTuition(0);
      setStandardTuition(0);
    } else {
      const singleLessonFee = Number(
        selectedTuitionData.single_lesson_fee ?? 0
      );

      const configuredTotalLessons = Number(
        selectedTuitionData.total_lessons ?? 0
      );

      const configuredStandardTuition = Number(
        selectedTuitionData.standard_tuition ?? 0
      );

      /*
       * Use the MyCHESS Business Time Engine so the calculation
       * follows the existing Brisbane test clock in development
       * and Brisbane business date in production.
       */
      const businessDate = getBusinessTime().dateKey;

      const { data: lessonData, error: lessonError } =
        await supabase
          .from("lessons")
          .select(`
            id,
            lesson_date,
            status,
            chargeable
          `)
          .eq("class_id", selectedClassId)
          .eq("academic_year", targetAcademicYear)
          .eq("term", targetTerm)
          .eq("chargeable", true)
          .order("lesson_date", {
            ascending: true,
          });

      if (lessonError) {
        throw lessonError;
      }

      const chargeableLessons = lessonData ?? [];

      const remainingChargeableLessons =
        chargeableLessons.filter(
          (lesson) =>
            lesson.lesson_date >= businessDate
        ).length;

      /*
       * If Lessons have not yet been generated for a future term,
       * retain the configured total lesson count rather than
       * inventing lesson dates in the Parent UI.
       */
      const hasGeneratedLessons =
        chargeableLessons.length > 0;

      const effectiveRemainingLessons =
        hasGeneratedLessons
          ? remainingChargeableLessons
          : configuredTotalLessons;

      const isMidTerm =
        hasGeneratedLessons &&
        remainingChargeableLessons < chargeableLessons.length;

      const dynamicCalculatedTuition =
        effectiveRemainingLessons * singleLessonFee;

      /*
       * Future/full-term enrolment keeps the configured Standard
       * Tuition, including any Admin-configured adjustment.
       *
       * Mid-term uses the calculated remaining-lesson tuition
       * as the default Standard Tuition.
       */
      const effectiveStandardTuition = isMidTerm
        ? dynamicCalculatedTuition
        : configuredStandardTuition;

      setTuitionConfig({
        id: selectedTuitionData.id,
        single_lesson_fee: singleLessonFee,
        total_lessons: configuredTotalLessons,
        standard_tuition: effectiveStandardTuition,
      });

      setCurrentClassSingleLessonFee(
        Number(currentTuitionData?.single_lesson_fee ?? 0)
      );

      setRemainingLessons(
        effectiveRemainingLessons
      );

      setCalculatedTuition(
        dynamicCalculatedTuition
      );

      setStandardTuition(
        effectiveStandardTuition
      );
    }

    const { data: creditData, error: creditError } =
      await supabase
        .from("makeup_credits")
        .select("credits")
        .eq("student_id", selectedStudentId)
        .eq("status", "Available")
        .gt("credits", 0);

    if (creditError) {
      throw creditError;
    }

    const totalCredits =
      (creditData ?? []).reduce(
        (sum, row) =>
          sum + Number(row.credits ?? 0),
        0
      );

    setAvailableMakeupCredits(totalCredits);
  } catch (financialError: any) {
    console.error(
      "RE-ENROLMENT FINANCIAL LOAD ERROR:",
      financialError
    );

    setTuitionConfig(null);
    setCurrentClassSingleLessonFee(0);
    setAvailableMakeupCredits(0);
    setRemainingLessons(0);
    setCalculatedTuition(0);
    setStandardTuition(0);
  } finally {
    setFinancialLoading(false);
  }
}

  const redeemCreditsAvailable = Math.min(
  availableMakeupCredits,
  2
);

const redeemAmount =
  redeemCreditsAvailable *
  currentClassSingleLessonFee;

const amountPayable = tuitionConfig
  ? Math.max(
      0,
      standardTuition - redeemAmount
    )
  : 0;

    async function handleSubmit() {
    setError(null);

    if (!selectedStudent) {
      setError("Please select a student.");
      return;
    }

    if (!canStartReenrolment) {
      setError("Re-enrolment is not currently open for this child.");
      return;
    }

    const currentClassId =
      selectedStudent.classInfo?.id ??
      selectedStudent.enrollment?.class_id ??
      "";

    if (!currentClassId) {
      setError("Current class information is not available.");
      return;
    }

    if (!selectedClassId) {
      setError("Please select a class.");
      return;
    }

    if (isSchoolProgram && targetTerm === 1) {
      if (!schoolYear.trim()) {
        setError("Please provide the School Year.");
        return;
      }

      if (!schoolClass.trim()) {
        setError("Please provide the School Class.");
        return;
      }
    }

    if (!tuitionConfig) {
      setError(
        "Tuition configuration is not available for the selected class and term."
      );
      return;
    }

    if (!declarationConfirmed) {
      setError("Please confirm that the above information is correct.");
      return;
    }

    setSubmitting(true);

    let createdEnrollmentId: string | null = null;

    try {
      /*
       * ----------------------------------------------------------
       * 1. Prevent duplicate Re-enrolment Submission
       * ----------------------------------------------------------
       */

      const {
        data: existingSubmission,
        error: existingError,
      } = await supabase
        .from("re_enrolment_submissions")
        .select("id, status")
        .eq("student_id", selectedStudent.student.id)
        .eq("academic_year", targetAcademicYear)
        .eq("term", targetTerm)
        .in("status", ["Draft", "Submitted", "Completed"])
        .limit(1)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existingSubmission) {
        setError(
          "A Re-enrolment submission already exists for this student and term."
        );
        return;
      }

      /*
       * ----------------------------------------------------------
       * 2. Prepare snapshots
       * ----------------------------------------------------------
       */

      const recommendedClassId =
        recommendation?.recommended_class_id ?? currentClassId;

      const specialRequestSnapshot = {
  classroom_pickup: isSchoolProgram
    ? specialRequest.classroom_pickup
    : false,
  ymca_dropoff: isSchoolProgram
    ? specialRequest.ymca_dropoff
    : false,
  walk_home: specialRequest.walk_home,
  school_year:
          isSchoolProgram && targetTerm === 1
            ? schoolYear.trim()
            : null,
        school_class:
          isSchoolProgram && targetTerm === 1
            ? schoolClass.trim()
            : null,
      };

      const medicalSnapshot =
        medicalInformation.trim() || null;

      /*
       * ----------------------------------------------------------
       * 3. Prevent duplicate formal Enrollment
       * ----------------------------------------------------------
       */

      const {
        data: existingEnrollment,
        error: existingEnrollmentError,
      } = await supabase
        .from("student_enrolments")
        .select("id")
        .eq("student_id", selectedStudent.student.id)
        .eq("academic_year", targetAcademicYear)
        .eq("term", targetTerm)
        .eq("class_id", selectedClassId)
        .eq("is_trial", false)
        .maybeSingle();

      if (existingEnrollmentError) {
        throw existingEnrollmentError;
      }

      if (existingEnrollment?.id) {
        throw new Error(
          "An enrolment already exists for this student, class and term."
        );
      }

      /*
       * ----------------------------------------------------------
       * 4. Create formal Enrollment FIRST
       *
       * New frozen rule:
       * Parent Submit immediately creates the new Enrollment.
       *
       * Payment remains Pending.
       * Enrollment and Payment Verification are independent.
       * ----------------------------------------------------------
       */

      const {
        data: newEnrollment,
        error: enrollmentError,
      } = await supabase
        .from("student_enrolments")
        .insert({
          student_id: selectedStudent.student.id,
          class_id: selectedClassId,
          academic_year: targetAcademicYear,
          term: targetTerm,
          status: "Active",
          is_trial: false,
          trial_status: null,
          payment_status: "Pending",
          payment_amount: Number(amountPayable.toFixed(2)),
          tuition_configuration_id: tuitionConfig.id,
          pricing_method: "Calculated",
          standard_tuition: Number(
            tuitionConfig.standard_tuition.toFixed(2)
          ),
          redeem_amount: Number(redeemAmount.toFixed(2)),
          amount_payable: Number(amountPayable.toFixed(2)),
          medical_snapshot: medicalSnapshot,
          special_request_snapshot: specialRequestSnapshot,
        })
        .select("id")
        .single();

      if (enrollmentError) {
        throw enrollmentError;
      }

      createdEnrollmentId = newEnrollment?.id ?? null;

      if (!createdEnrollmentId) {
        throw new Error(
          "The new enrolment was created but its ID could not be confirmed."
        );
      }

      /*
       * ----------------------------------------------------------
       * 5. Create Re-enrolment Submission
       *
       * Submission is Submitted + Payment Pending.
       * ----------------------------------------------------------
       */

      const submittedAt = new Date().toISOString();

      const {
        data: insertedSubmission,
        error: submissionError,
      } = await supabase
        .from("re_enrolment_submissions")
        .insert({
          student_id: selectedStudent.student.id,
          current_class_id: currentClassId,
          recommended_class_id: recommendedClassId,
          selected_class_id: selectedClassId,
          academic_year: targetAcademicYear,
          term: targetTerm,
          medical_snapshot: medicalSnapshot,
          special_request_snapshot: specialRequestSnapshot,
          available_makeup_credits: Number(availableMakeupCredits),
          redeem_amount: Number(redeemAmount.toFixed(2)),
          standard_tuition: Number(
            tuitionConfig.standard_tuition.toFixed(2)
          ),
          amount_payable: Number(amountPayable.toFixed(2)),
          payment_status: "Pending",
          status: "Submitted",
          submitted_at: submittedAt,
        })
        .select("id")
        .single();

      if (submissionError) {
        /*
         * Parent cannot DELETE submissions under current RLS.
         * Therefore rollback the Enrollment instead.
         */
        const { error: rollbackError } = await supabase
          .from("student_enrolments")
          .delete()
          .eq("id", createdEnrollmentId);

        if (rollbackError) {
          console.error(
            "RE-ENROLMENT ENROLLMENT ROLLBACK ERROR:",
            rollbackError
          );
        }

        throw submissionError;
      }

      /*
       * ----------------------------------------------------------
       * 6. Synchronise Student Stage
       * ----------------------------------------------------------
       */

      await synchroniseStudentStage(
        selectedStudent.student.id,
        targetAcademicYear,
        targetTerm
      );

      /*
       * ----------------------------------------------------------
       * 7. Update local UI state
       * ----------------------------------------------------------
       */

      const newSubmission: ReenrolmentSubmission = {
        id: insertedSubmission.id,
        student_id: selectedStudent.student.id,
        academic_year: targetAcademicYear,
        term: targetTerm,
        status: "Submitted",
        payment_status: "Pending",
        submitted_at: submittedAt,
      };

      setReenrolmentSubmissions((previous) => [
        newSubmission,
        ...previous.filter(
          (item) =>
            !(
              item.student_id === newSubmission.student_id &&
              item.academic_year === newSubmission.academic_year &&
              item.term === newSubmission.term
            )
        ),
      ]);

      setSubmissionId(insertedSubmission.id);
      setSubmitted(true);
    } catch (submitError: any) {
      console.error(
        "RE-ENROLMENT SUBMIT ERROR:",
        submitError
      );

      setError(
        submitError?.message ??
          "Unable to submit Re-enrolment."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function updateSpecialRequest(
    field: keyof SpecialRequest,
    value: boolean
  ) {
    setSpecialRequest((previous) => {
      const request = {
        ...previous,
        [field]: value,
      };

      // Same logic as Registration.
      if (field === "walk_home" && value) {
        request.classroom_pickup = false;
        request.ymca_dropoff = false;
      }

      if (field === "classroom_pickup" && value) {
        if (!isClassroomPickupAllowed(effectiveSchoolYear)) {
          request.classroom_pickup = false;
          return request;
        }

        request.walk_home = false;
      }

      if (field === "ymca_dropoff" && value) {
        request.walk_home = false;
      }

      return request;
    });
  }

  const selectedStudent = useMemo(
    () =>
      familyStudents.find(
        (item) => item.student.id === selectedStudentId
      ) ?? null,
    [familyStudents, selectedStudentId]
  );

  const currentSubmission = useMemo(
    () =>
      reenrolmentSubmissions.find(
        (item) =>
          item.student_id === selectedStudentId &&
          item.academic_year === targetAcademicYear &&
          item.term === targetTerm
      ) ?? null,
    [
      reenrolmentSubmissions,
      selectedStudentId,
      targetAcademicYear,
      targetTerm,
    ]
  );

  const reenrolmentDisplayState = useMemo((): ReenrolmentDisplayState => {
    if (!selectedStudent?.enrollment) return "NOT_OPEN";

    if (currentSubmission?.status === "Completed") return "ENROLLED";
    if (currentSubmission?.status === "Submitted") return "SUBMITTED";

    if (scheduleLoading) return "NOT_OPEN";

    const now = getBrisbaneNowParts(testClockEnabled ? testClockValue : undefined);
    const openingReached = isOpeningReached(
      currentClassSchedule?.final_lesson ?? null,
      now
    );

    if (!openingReached) return "NOT_OPEN";

    if (
  isFirstLessonPendingPeriod(
    targetClassSchedule?.first_lesson ?? null,
    now.dateKey
  )
) {
  return "PENDING";
}

return "OPEN";
  }, [
    selectedStudent,
    currentSubmission,
    currentClassSchedule,
    targetClassSchedule,
    scheduleLoading,
    statusTick,
    testClockEnabled,
    testClockValue,
  ]);

  const canStartReenrolment =
    reenrolmentDisplayState === "OPEN" || reenrolmentDisplayState === "PENDING";

  const selectedClassInfo = useMemo(() => {
    if (!selectedStudent) return null;

    const currentClassId =
      selectedStudent.classInfo?.id ??
      selectedStudent.enrollment?.class_id ??
      "";

    if (
      recommendation &&
      recommendedClassInfo &&
      selectedClassId === recommendation.recommended_class_id
    ) {
      return recommendedClassInfo;
    }

    if (selectedClassId === currentClassId) {
      return selectedStudent.classInfo;
    }

    return recommendedClassInfo ?? selectedStudent.classInfo;
  }, [
    selectedStudent,
    selectedClassId,
    recommendation,
    recommendedClassInfo,
  ]);

  const isSchoolProgram =
    getCampusType(selectedClassInfo) === "School Program";

  const effectiveSchoolYear =
    schoolYear.trim() || selectedStudent?.student.school_year?.trim() || "";

  const isClassroomPickupEligible =
    isSchoolProgram && isClassroomPickupAllowed(effectiveSchoolYear);

  useEffect(() => {
    loadFamily();
  }, []);

  useEffect(() => {
    setError(null);
    setSubmitted(false);
    setSubmissionId(null);
    setDeclarationConfirmed(false);
    setSpecialRequest({
      classroom_pickup: false,
      ymca_dropoff: false,
      walk_home: false,
    });

    const currentClassId = selectedStudent?.classInfo?.id ?? "";
    setSelectedClassId(currentClassId);
    setSchoolYear(selectedStudent?.student.school_year ?? "");
    setSchoolClass(selectedStudent?.student.school_class ?? "");
    setMedicalInformation(selectedStudent?.student.medical_information ?? "");

    const currentYear = Number(selectedStudent?.enrollment?.academic_year);
    const currentTerm = Number(selectedStudent?.enrollment?.term);

    if (
      Number.isFinite(currentYear) &&
      Number.isFinite(currentTerm)
    ) {
      if (currentTerm >= 4) {
        setTargetAcademicYear(currentYear + 1);
        setTargetTerm(1);
      } else {
        setTargetAcademicYear(currentYear);
        setTargetTerm(currentTerm + 1);
      }
    }
  }, [selectedStudent]);

  useEffect(() => {
    if (!isClassroomPickupEligible && specialRequest.classroom_pickup) {
      setSpecialRequest((previous) => ({
        ...previous,
        classroom_pickup: false,
      }));
    }
  }, [isClassroomPickupEligible, specialRequest.classroom_pickup]);
useEffect(() => {
  if (!isSchoolProgram) {
    setSpecialRequest((previous) => {
      if (!previous.classroom_pickup && !previous.ymca_dropoff) {
        return previous;
      }

      return {
        ...previous,
        classroom_pickup: false,
        ymca_dropoff: false,
      };
    });
  }
}, [isSchoolProgram]);
  useEffect(() => {
    loadFamilyDisplayStates();
  }, [
    familyStudents,
    reenrolmentSubmissions,
    targetAcademicYear,
    targetTerm,
    statusTick,
    testClockEnabled,
    testClockValue,
  ]);

  useEffect(() => {
    loadRecommendation();
  }, [selectedStudentId, targetAcademicYear, targetTerm]);

  useEffect(() => {
    loadReenrolmentSchedules();
  }, [selectedStudentId, targetAcademicYear, targetTerm, selectedClassId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setStatusTick((value) => value + 1);
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
  loadReenrolmentFinancials();
}, [
  selectedStudentId,
  targetAcademicYear,
  targetTerm,
  selectedClassId,
  testClockEnabled,
  testClockValue,
]);

  if (loading) {
    return <main className="min-h-screen" />;
  }

  return (
    <main className="min-h-screen text-[#10213A]">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-[#F4F7FB] sm:text-4xl">
            Re-enrolment
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#C8D2DF]/70 sm:text-base">
  Continue your{" "}
  {familyStudents.length === 1 ? "child’s" : "children’s"}{" "}
  enrolment for the next term.
</p>

          {process.env.NODE_ENV !== "production" && (
            <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-100/10 p-4 text-xs text-amber-50">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold uppercase tracking-[0.14em] text-amber-200">
                  🧪 Re-enrolment Test Clock
                </span>

                <label className="inline-flex items-center gap-2">
                  <input
  type="checkbox"
  checked={testClockEnabled}
  onChange={(event) => {
    const enabled = event.target.checked;

    setTestClockEnabled(enabled);

    if (!enabled) {
      clearTestClock();
      return;
    }

    if (testClockValue) {
      setTestClock(testClockValue);
    }
  }}
  className="h-4 w-4 rounded border-slate-300"
/>
                  Simulate Brisbane time
                </label>

                <input
                  type="datetime-local"
                  value={testClockValue}
                  onChange={(event) => {
  const value = event.target.value;

  setTestClockValue(value);

  if (testClockEnabled && value) {
    setTestClock(value);
  }
}}
                  disabled={!testClockEnabled}
                  className="rounded-lg border border-amber-200/40 bg-white px-3 py-2 text-xs text-[#10213A] disabled:cursor-not-allowed disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={() => {
  setTestClockEnabled(false);
  setTestClockValue("");
  clearTestClock();
}}
                  className="rounded-lg border border-amber-200/40 px-3 py-2 font-semibold text-amber-100 hover:bg-amber-100/10"
                >
                  Use Live Time
                </button>
              </div>

              {testClockEnabled && (
                <p className="mt-2 text-amber-100/80">
                  Status calculations use the simulated Brisbane wall-clock time. This control is development-only and does not change the database or Class Schedule.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* No Children */}
        {familyStudents.length === 0 && (
          <section className="overflow-hidden rounded-2xl border border-[#D9E3ED] bg-[#FFFDF8] text-[#10213A] shadow-2xl shadow-black/20">
            <div className="h-[6px] bg-gradient-to-r from-[#F7D968] via-[#D4AF37]/75 to-transparent" />

            <div className="p-8">
              <h2 className="text-xl font-semibold">
                No children found
              </h2>

              <p className="mt-2 text-sm text-[#64748B]">
                No students are currently linked to this Family.
              </p>
            </div>
          </section>
        )}

        {familyStudents.length > 0 && (
          <div className="space-y-6">

            {/* Child Selection */}
            <section className="overflow-hidden rounded-2xl border border-[#D9E3ED] bg-[#FFFDF8] shadow-2xl shadow-black/20">
              <div className="h-[6px] bg-gradient-to-r from-[#F7D968] via-[#D4AF37]/75 to-transparent" />

              <div className="p-5 sm:p-7">
                <div className="mb-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A78312]">
                    Step 1
                  </div>

                  <h2 className="mt-2 text-2xl font-semibold text-[#10213A]">
                    Select Child
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#64748B]">
                    Select the child you would like to re-enrol.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {familyStudents.map((item, index) => {
                    const isSelected =
                      item.student.id === selectedStudentId;

                    return (
                      <button
                        key={item.student.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudentId(item.student.id);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className={`
                          rounded-xl border px-4 py-4 text-left transition
                          ${
                            isSelected
                              ? "border-[#D4AF37] bg-[#FFF8DC] shadow-sm"
                              : "border-[#D9E3ED] bg-[#F5F9FD] hover:border-[#D4AF37]/60"
                          }
                        `}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-4">
                            <div className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A78312]">
                              {familyStudents.length === 1
                                ? "CHILD"
                                : `CHILD ${index + 1}`}
                            </div>

                            <div className="min-w-0 text-base font-semibold text-[#10213A]">
                              {getStudentDisplayName(item.student) || "Student"}
                            </div>
                          </div>

                          {(() => {
                            const itemSubmission = reenrolmentSubmissions.find(
                              (submission) =>
                                submission.student_id === item.student.id &&
                                submission.academic_year === targetAcademicYear &&
                                submission.term === targetTerm &&
                                submission.status !== "Cancelled"
                            );

                            const itemState: ReenrolmentDisplayState | null =
                              isSelected
                                ? reenrolmentDisplayState
                                : familyDisplayStates[item.student.id] ??
                                  (itemSubmission?.status === "Completed"
                                    ? "ENROLLED"
                                    : itemSubmission?.status === "Submitted"
                                      ? "SUBMITTED"
                                      : null);

                            if (!itemState) return null;

                            const stateClass =
                              itemState === "ENROLLED"
                                ? "text-emerald-700"
                                : itemState === "SUBMITTED"
                                  ? "text-emerald-700"
                                  : itemState === "PENDING"
                                    ? "text-amber-700"
                                    : itemState === "OPEN"
                                      ? "text-blue-700"
                                      : "text-slate-500";

                            const stateLabel =
                              itemState === "NOT_OPEN"
                                ? "Not Open"
                                : itemState.charAt(0) + itemState.slice(1).toLowerCase();

                            return (
                              <span className={`shrink-0 text-xs font-semibold ${stateClass}`}>
                                {stateLabel}
                              </span>
                            );
                          })()}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Current Enrolment */}
            {selectedStudent && (
              <section className="overflow-hidden rounded-2xl border border-[#D9E3ED] bg-[#FFFDF8] shadow-2xl shadow-black/20">
                <div className="h-[6px] bg-gradient-to-r from-[#F7D968] via-[#D4AF37]/75 to-transparent" />

                <div className="p-5 sm:p-7">
                  <div className="mb-6">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A78312]">
                      Current Enrolment
                    </div>

                    <h2 className="mt-2 text-2xl font-semibold text-[#10213A]">
                      {getStudentDisplayName(
                        selectedStudent.student
                      ) || "Student"}
                    </h2>
                  </div>

                  {selectedStudent.enrollment ? (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">

                      <InfoField
                        label="Academic Year"
                        value={String(
                          selectedStudent.enrollment
                            .academic_year ?? "—"
                        )}
                      />

                      <InfoField
                        label="Term"
                        value={String(
                          selectedStudent.enrollment.term ??
                            "—"
                        )}
                      />

                      <InfoField
                        label="Chess Campus"
                        value={getCampusDisplayName(
                          selectedStudent.classInfo
                        )}
                      />

                      <InfoField
                        label="Current Class"
                        value={getClassDisplayName(
                          selectedStudent.classInfo
                        )}
                      />

                      <InfoField
                        label="Class Day"
                        value={
                          selectedStudent.classInfo?.day ??
                          "—"
                        }
                      />

                      <InfoField
                        label="Class Time"
                        value={
                          selectedStudent.classInfo
                            ?.start_time
                            ? `${selectedStudent.classInfo.start_time.slice(
                                0,
                                5
                              )}${
                                selectedStudent.classInfo
                                  .end_time
                                  ? ` – ${selectedStudent.classInfo.end_time.slice(
                                      0,
                                      5
                                    )}`
                                  : ""
                              }`
                            : "—"
                        }
                      />

                      <InfoField
                        label="Program"
                        value={
                          getCampusType(
                            selectedStudent.classInfo
                          ) === "School Program"
                            ? "School Program"
                            : "Chess Program"
                        }
                      />

                      <InfoField
                        label="Enrolment Status"
                        value={
                          selectedStudent.enrollment.status ??
                          "—"
                        }
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[#D9E3ED] bg-[#F5F9FD] px-4 py-5">
                      <p className="text-sm font-medium text-[#10213A]">
                        No active formal enrolment was found for this child.
                      </p>

                      <p className="mt-1 text-sm text-[#64748B]">
                        Re-enrolment is available for existing formal enrolments only.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Re-enrolment Status */}
            {selectedStudent?.enrollment && (
              <section className="overflow-hidden rounded-2xl border border-[#D9E3ED] bg-[#FFFDF8] shadow-2xl shadow-black/20">
                <div
                  className={`h-[6px] ${
                    reenrolmentDisplayState === "ENROLLED" || reenrolmentDisplayState === "SUBMITTED"
                      ? "bg-gradient-to-r from-emerald-300 via-emerald-400/70 to-transparent"
                      : "bg-gradient-to-r from-[#F7D968] via-[#D4AF37]/75 to-transparent"
                  }`}
                />
                <div className="p-6 sm:p-8">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A78312]">
                    Re-enrolment Status
                  </div>

                  <h2 className="mt-2 text-2xl font-semibold text-[#10213A]">
                    {reenrolmentDisplayState === "NOT_OPEN"
                      ? "Not Open Yet"
                      : reenrolmentDisplayState === "OPEN"
                        ? "OPEN"
                        : reenrolmentDisplayState === "PENDING"
                          ? "PENDING"
                          : reenrolmentDisplayState === "SUBMITTED"
                            ? "SUBMITTED"
                            : "ENROLLED"}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#64748B]">
                    {reenrolmentDisplayState === "NOT_OPEN"
                      ? currentClassSchedule?.final_lesson
                        ? `Re-enrolment opens at 8:00 AM the day after the Final Lesson (${currentClassSchedule.final_lesson.slice(0, 10)}).`
                        : "Re-enrolment opening is being prepared from the class schedule."
                      : reenrolmentDisplayState === "OPEN"
                        ? "Re-enrolment is now open. Please complete the form below before the new term begins."
                        : reenrolmentDisplayState === "PENDING"
                          ? "This child’s Re-enrolment has not yet been submitted. Please complete it before the first lesson."
                          : reenrolmentDisplayState === "SUBMITTED"
                            ? "This child’s Re-enrolment has been submitted and is now pending payment verification."
                            : "This child’s Re-enrolment has been completed and is now enrolled for the target term."}
                  </p>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <InfoField
                      label="Student"
                      value={getStudentDisplayName(selectedStudent.student)}
                    />
                    <InfoField
                      label="Target Term"
                      value={`${targetAcademicYear} Term ${targetTerm}`}
                    />
                    <InfoField
                      label="Payment Status"
                      value={currentSubmission?.payment_status ?? (reenrolmentDisplayState === "ENROLLED" ? "Paid" : "—")}
                    />
                    <InfoField
                      label="First Lesson"
                      value={targetClassSchedule?.first_lesson?.slice(0, 10) ?? "—"}
                    />
                  </div>

                  {(currentSubmission?.id || submissionId) && (
                    <p className="mt-5 text-xs text-[#64748B]">
                      Submission ID: {currentSubmission?.id ?? submissionId}
                    </p>
                  )}

                  {reenrolmentDisplayState === "NOT_OPEN" && (
                    <div className="mt-6 rounded-xl border border-[#D9E3ED] bg-[#F5F9FD] px-4 py-4 text-sm text-[#31445B]">
                      Re-enrolment will become available automatically according to the current class schedule.
                    </div>
                  )}

                  {reenrolmentDisplayState === "PENDING" && (
  <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
    {(() => {
      const now = getBrisbaneNowParts(
        testClockEnabled ? testClockValue : undefined
      );

      const firstLessonDate =
        targetClassSchedule?.first_lesson?.slice(0, 10) ?? null;

      if (firstLessonDate === now.dateKey) {
        return "Reminder: the first lesson is today. The Re-enrolment link remains active so you can complete the submission.";
      }

      if (addOneCalendarDay(now.dateKey) === firstLessonDate) {
        return "Reminder: the first lesson is tomorrow. The Re-enrolment link remains active so you can complete the submission.";
      }

      return "The first lesson has started. The Re-enrolment link remains active, please complete the reenrollment as soon as possible.";
    })()}
  </div>
)}

                  {(reenrolmentDisplayState === "SUBMITTED" || reenrolmentDisplayState === "ENROLLED") && (
                    <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
                      {reenrolmentDisplayState === "SUBMITTED"
                        ? "Please select another child above if they still need to complete Re-enrolment."
                        : "This Re-enrolment is complete. The enrolled term is now locked by the formal enrolment record."}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Target Term */}
            {selectedStudent?.enrollment && !currentSubmission && !submitted && canStartReenrolment && (
              <section className="overflow-hidden rounded-2xl border border-[#D9E3ED] bg-[#FFFDF8] shadow-2xl shadow-black/20">
                <div className="h-[6px] bg-gradient-to-r from-[#F7D968] via-[#D4AF37]/75 to-transparent" />

                <div className="p-5 sm:p-7">
                  <div className="mb-6">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A78312]">
                      Re-enrolment Term
                    </div>

                    <h2 className="mt-2 text-2xl font-semibold text-[#10213A]">
                      Select Target Term
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-[#64748B]">
                      The next term is selected by default.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                        Academic Year
                      </span>

                      <select
                        value={targetAcademicYear}
                        onChange={(event) =>
                          setTargetAcademicYear(
                            Number(event.target.value)
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-[#D9E3ED] bg-[#F5F9FD] px-4 py-3 text-sm text-[#10213A] outline-none transition focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                      >
                        {[targetAcademicYear - 1, targetAcademicYear, targetAcademicYear + 1].map(
                          (year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                        Term
                      </span>

                      <select
                        value={targetTerm}
                        onChange={(event) =>
                          setTargetTerm(
                            Number(event.target.value)
                          )
                        }
                        className="mt-2 w-full rounded-xl border border-[#D9E3ED] bg-[#F5F9FD] px-4 py-3 text-sm text-[#10213A] outline-none transition focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                      >
                        <option value={1}>Term 1</option>
                        <option value={2}>Term 2</option>
                        <option value={3}>Term 3</option>
                        <option value={4}>Term 4</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-6 rounded-xl border border-[#D9E3ED] bg-[#F5F9FD] px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                      Target Re-enrolment
                    </div>

                    <div className="mt-1 text-lg font-semibold text-[#10213A]">
                      {targetAcademicYear} · Term {targetTerm}
                    </div>

                    <p className="mt-2 text-sm text-[#64748B]">
                      No submission has been created yet.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Class Selection */}
            {selectedStudent?.enrollment && !currentSubmission && !submitted && canStartReenrolment && (
              <section className="overflow-hidden rounded-2xl border border-[#D9E3ED] bg-[#FFFDF8] shadow-2xl shadow-black/20">
                <div className="h-[6px] bg-gradient-to-r from-[#F7D968] via-[#D4AF37]/75 to-transparent" />

                <div className="p-5 sm:p-7">
                  <div className="mb-6">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A78312]">
                      Step 2
                    </div>

                    <h2 className="mt-2 text-2xl font-semibold text-[#10213A]">
                      Class Selection
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-[#64748B]">
                      {recommendation && recommendedClassInfo
                        ? "Choose whether to continue with your current class or select the recommended class."
                        : "Current class is recommended for the next term. Our coach continuously assesses each student’s progress and will recommend a higher-level class when they are ready."}
                    </p>
                  </div>

                  {recommendationLoading ? (
                    <div className="rounded-xl border border-[#D9E3ED] bg-[#F5F9FD] px-4 py-5 text-sm text-[#64748B]">
                      Checking recommended class...
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedClassId(
                            selectedStudent.classInfo?.id ??
                              selectedStudent.enrollment?.class_id ??
                              ""
                          )
                        }
                        className={`rounded-xl border p-5 text-left transition ${
                          selectedClassId ===
                          (selectedStudent.classInfo?.id ??
                            selectedStudent.enrollment?.class_id ??
                            "")
                            ? "border-[#D4AF37] bg-[#FFF8DC] shadow-sm"
                            : "border-[#D9E3ED] bg-[#F5F9FD] hover:border-[#D4AF37]/60"
                        }`}
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A78312]">
                          Current Class
                        </div>
                        <div className="mt-2 text-lg font-semibold text-[#10213A]">
                          {getClassDisplayName(selectedStudent.classInfo)}
                        </div>
                        <div className="mt-2 text-sm text-[#64748B]">
                          {getCampusDisplayName(selectedStudent.classInfo)}
                          {selectedStudent.classInfo?.day
                            ? ` · ${selectedStudent.classInfo.day}`
                            : ""}
                          {selectedStudent.classInfo?.start_time
                            ? ` · ${selectedStudent.classInfo.start_time.slice(0, 5)}`
                            : ""}
                          {selectedStudent.classInfo?.end_time
                            ? ` – ${selectedStudent.classInfo.end_time.slice(0, 5)}`
                            : ""}
                        </div>
                        <div className="mt-4 text-sm font-semibold text-[#A78312]">
                          Continue Current Class
                        </div>
                      </button>

                      {recommendation &&
                      recommendedClassInfo &&
                      recommendation.recommended_class_id !==
                        (selectedStudent.classInfo?.id ??
                          selectedStudent.enrollment?.class_id ??
                          "") ? (
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedClassId(
                              recommendation.recommended_class_id
                            )
                          }
                          className={`rounded-xl border p-5 text-left transition ${
                            selectedClassId ===
                            recommendation.recommended_class_id
                              ? "border-[#D4AF37] bg-[#FFF8DC] shadow-sm"
                              : "border-[#D9E3ED] bg-[#F5F9FD] hover:border-[#D4AF37]/60"
                          }`}
                        >
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A78312]">
                            ⭐ Recommended Class
                          </div>
                          <div className="mt-2 text-lg font-semibold text-[#10213A]">
                            {getClassDisplayName(recommendedClassInfo)}
                          </div>
                          <div className="mt-2 text-sm text-[#64748B]">
                            {getCampusDisplayName(recommendedClassInfo)}
                            {recommendedClassInfo.day
                              ? ` · ${recommendedClassInfo.day}`
                              : ""}
                            {recommendedClassInfo.start_time
                              ? ` · ${recommendedClassInfo.start_time.slice(0, 5)}`
                              : ""}
                            {recommendedClassInfo.end_time
                              ? ` – ${recommendedClassInfo.end_time.slice(0, 5)}`
                              : ""}
                          </div>
                          <div className="mt-4 text-sm font-semibold text-[#A78312]">
                            Select Recommended Class
                          </div>
                        </button>
                      ) : null}
                    </div>
                  )}

                </div>
              </section>
            )}


            {/* Special Request */}
            {selectedStudent?.enrollment && !currentSubmission && !submitted && canStartReenrolment && (
              <section className="overflow-hidden rounded-2xl border border-[#D9E3ED] bg-[#FFFDF8] shadow-2xl shadow-black/20">
                <div className="h-[6px] bg-gradient-to-r from-[#F7D968] via-[#D4AF37]/75 to-transparent" />

                <div className="p-5 sm:p-7">
                  <div className="mb-6">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A78312]">
                      Step 3
                    </div>

                    <h2 className="mt-2 text-2xl font-semibold text-[#10213A]">
                      Special Request
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-[#64748B]">
                      Select any applicable arrangements.
                    </p>
                  </div>

                  {isSchoolProgram && targetTerm === 1 && (
                    <div className="mb-6 border-b border-[#D4AF37]/20 pb-6">
                      <h3 className="text-sm font-semibold text-[#10213A]">
                        School Information
                      </h3>

                      <p className="mt-1 mb-4 text-xs text-[#61778F]">
                        Please provide the school year and school class for the new school year.
                      </p>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-[#31445B]">
                            School Year
                          </label>
                          <input
                            type="text"
                            value={schoolYear}
                            onChange={(event) =>
                              setSchoolYear(event.target.value)
                            }
                            placeholder="e.g. Year 3"
                            className="h-11 w-full rounded-xl border border-[#D3E0EC] bg-white px-3.5 text-sm text-[#10213A] outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-[#31445B]">
                            School Class
                          </label>
                          <input
                            type="text"
                            value={schoolClass}
                            onChange={(event) =>
                              setSchoolClass(event.target.value)
                            }
                            placeholder="e.g. 3A"
                            className="h-11 w-full rounded-xl border border-[#D3E0EC] bg-white px-3.5 text-sm text-[#10213A] outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {isSchoolProgram && (
                      <>
                        <label className="flex min-h-10 items-center rounded-xl border border-[#D3E0EC] bg-[#EEF5FB] px-3.5 text-sm text-[#31445B] transition hover:border-[#D4AF37]/60 hover:bg-[#F7FBFF]">
                          <input
                            type="checkbox"
                            checked={
                              !specialRequest.classroom_pickup &&
                              !specialRequest.ymca_dropoff &&
                              !specialRequest.walk_home
                            }
                            onChange={(event) => {
                              if (event.target.checked) {
                                setSpecialRequest({
                                  classroom_pickup: false,
                                  ymca_dropoff: false,
                                  walk_home: false,
                                });
                              }
                            }}
                            className="mr-3 h-4 w-4 rounded border-slate-300"
                          />
                          None of them
                        </label>

                        <label
                          className={`flex min-h-10 items-center rounded-xl border px-3.5 text-sm transition ${
                            isClassroomPickupEligible
                              ? "border-[#D3E0EC] bg-[#EEF5FB] text-[#31445B] hover:border-[#D4AF37]/60 hover:bg-[#F7FBFF]"
                              : "cursor-not-allowed border-[#D9E3ED] bg-[#F1F4F7] text-[#94A3B8]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={
                              isClassroomPickupEligible &&
                              specialRequest.classroom_pickup
                            }
                            disabled={!isClassroomPickupEligible}
                            onChange={(event) =>
                              updateSpecialRequest(
                                "classroom_pickup",
                                event.target.checked
                              )
                            }
                            className="mr-3 h-4 w-4 rounded border-slate-300 accent-[#D4AF37]"
                          />
                          Classroom Pick-up (Prep or Year 1 ONLY)
                        </label>

                        <label className="flex min-h-10 items-center rounded-xl border border-[#D3E0EC] bg-[#EEF5FB] px-3.5 text-sm text-[#31445B] transition hover:border-[#D4AF37]/60 hover:bg-[#F7FBFF]">
                          <input
                            type="checkbox"
                            checked={specialRequest.ymca_dropoff}
                            onChange={(event) =>
                              updateSpecialRequest(
                                "ymca_dropoff",
                                event.target.checked
                              )
                            }
                            className="mr-3 h-4 w-4 rounded border-slate-300"
                          />
                          YMCA Drop-off
                        </label>
                      </>
                    )}

                    <label className="flex min-h-10 items-center rounded-xl border border-[#D3E0EC] bg-[#EEF5FB] px-3.5 text-sm text-[#31445B] transition hover:border-[#D4AF37]/60 hover:bg-[#F7FBFF]">
                      <input
                        type="checkbox"
                        checked={specialRequest.walk_home}
                        onChange={(event) =>
                          updateSpecialRequest(
                            "walk_home",
                            event.target.checked
                          )
                        }
                        className="mr-3 h-4 w-4 rounded border-slate-300"
                      />
                      Walk Home
                    </label>
                  </div>

                  <div className="mt-5 rounded-xl border border-[#D9E3ED] bg-[#F5F9FD] px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                      Selected Request
                    </div>

                    <div className="mt-1 text-sm font-semibold text-[#10213A]">
                      {[
                        specialRequest.classroom_pickup
                          ? "Classroom Pick-up"
                          : null,
                        specialRequest.ymca_dropoff
                          ? "YMCA Drop-off"
                          : null,
                        specialRequest.walk_home
                          ? "Walk Home"
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" + ") || "None of them"}
                    </div>

                    <p className="mt-2 text-sm text-[#64748B]">
                      Your selection will be saved with the Re-enrolment submission.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Step 4 — Medical Snapshot */}
            {selectedStudent?.enrollment && !currentSubmission && !submitted && canStartReenrolment && (
              <section className="overflow-hidden rounded-2xl border border-[#D9E3ED] bg-[#FFFDF8] shadow-2xl shadow-black/20">
                <div className="h-[6px] bg-gradient-to-r from-[#F7D968] via-[#D4AF37]/75 to-transparent" />
                <div className="p-6 sm:p-8">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A78312]">
                    Step 4
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-[#10213A]">
                    Medical Information
                  </h2>
                  <div className="mt-6">
                    <textarea
                      value={medicalInformation}
                      onChange={(event) => setMedicalInformation(event.target.value)}
                      rows={5}
                      placeholder="Optional"
                      className="w-full rounded-xl border border-[#D3E0EC] bg-white px-3.5 py-3 text-sm leading-6 text-[#10213A] outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Step 5 — Tuition & Make-up Credit */}
            {selectedStudent?.enrollment && !currentSubmission && !submitted && canStartReenrolment && (
              <section className="overflow-hidden rounded-2xl border border-[#D9E3ED] bg-[#FFFDF8] shadow-2xl shadow-black/20">
                <div className="h-[6px] bg-gradient-to-r from-[#F7D968] via-[#D4AF37]/75 to-transparent" />
                <div className="p-6 sm:p-8">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A78312]">
                    Step 5
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-[#10213A]">
                    Tuition & Make-up Credit
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#64748B]">
                    Tuition is calculated from the selected Class pricing configuration. For a term already in progress, tuition is based on the remaining chargeable Lessons. Up to two available Make-up Credits may be redeemed toward the tuition.
                  </p>

                  {financialLoading ? (
                    <div className="mt-6 rounded-xl border border-[#D9E3ED] bg-[#F5F9FD] px-4 py-5 text-sm text-[#64748B]">
                      Loading tuition and Make-up Credit information…
                    </div>
                  ) : tuitionConfig ? (
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <InfoField
  label="Selected Class"
  value={getClassDisplayName(selectedClassInfo)}
/>

<InfoField
  label="Remaining Lessons"
  value={String(remainingLessons)}
/>

<InfoField
  label="Single Lesson Fee"
  value={`$${tuitionConfig.single_lesson_fee.toFixed(2)}`}
/>

<InfoField
  label="Calculated Tuition"
  value={`$${calculatedTuition.toFixed(2)}`}
/>

<InfoField
  label="Standard Tuition (incl. GST)"
  value={`$${standardTuition.toFixed(2)}`}
/>

<InfoField
  label="Available Make-up Credits"
  value={String(availableMakeupCredits)}
/>

<InfoField
  label="Redeem Credits"
  value={String(redeemCreditsAvailable)}
/>

{redeemCreditsAvailable > 0 && (
  <InfoField
    label="Redeem Amount"
    value={`-$${redeemAmount.toFixed(2)}`}
  />
)}

<InfoField
  label="Amount Payable (incl. GST)"
  value={`$${amountPayable.toFixed(2)}`}
/>
                    </div>
                  ) : (
                    <div className="mt-6 rounded-xl border border-[#D4AF37]/40 bg-[#FFF8DC] px-4 py-5 text-sm text-[#64748B]">
                      Tuition configuration is not available for the selected class and term.
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Step 6 — Review & Declaration */}
            {selectedStudent?.enrollment && !currentSubmission && !submitted && canStartReenrolment && (
              <section className="overflow-hidden rounded-2xl border border-[#D9E3ED] bg-[#FFFDF8] shadow-2xl shadow-black/20">
                <div className="h-[6px] bg-gradient-to-r from-[#F7D968] via-[#D4AF37]/75 to-transparent" />
                <div className="p-6 sm:p-8">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A78312]">
                    Step 6
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-[#10213A]">
                    Review & Declaration
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#64748B]">
                    Please review your selections before submitting the Re-enrolment.
                  </p>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <InfoField label="Student" value={getStudentDisplayName(selectedStudent.student)} />
                    <InfoField label="Target Term" value={`${targetAcademicYear} Term ${targetTerm}`} />
                    <InfoField label="Selected Class" value={getClassDisplayName(selectedClassInfo)} />
                    <InfoField
                      label="Special Request"
                      value={[
                        specialRequest.classroom_pickup ? "Classroom Pick-up" : null,
                        specialRequest.ymca_dropoff ? "YMCA Drop-off" : null,
                        specialRequest.walk_home ? "Walk Home" : null,
                      ].filter(Boolean).join(" + ") || "None of them"}
                    />
                    {isSchoolProgram && targetTerm === 1 && (
                      <>
                        <InfoField label="School Year" value={schoolYear.trim() || "—"} />
                        <InfoField label="School Class" value={schoolClass.trim() || "—"} />
                      </>
                    )}
                    <InfoField label="Amount Payable (incl. GST)" value={tuitionConfig ? `$${amountPayable.toFixed(2)}` : "—"} />
                  </div>

                  <label className="mt-6 flex items-start gap-3 rounded-xl border border-[#D3E0EC] bg-[#EEF5FB] px-4 py-4 text-sm text-[#31445B]">
                    <input
                      type="checkbox"
                      checked={declarationConfirmed}
                      onChange={(event) => setDeclarationConfirmed(event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#D4AF37]"
                    />
                    <span>I confirm that the above information is correct.</span>
                  </label>
                </div>
              </section>
            )}

            {/* Step 7 — Submission */}
            {selectedStudent?.enrollment && !currentSubmission && !submitted && canStartReenrolment && (
              <section className="overflow-hidden rounded-2xl border border-[#D9E3ED] bg-[#FFFDF8] shadow-2xl shadow-black/20">
                <div className="h-[6px] bg-gradient-to-r from-[#F7D968] via-[#D4AF37]/75 to-transparent" />
                <div className="p-6 sm:p-8">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A78312]">
                    Step 7
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-[#10213A]">
                    Payment & Enrolment
                  </h2>

                  {submitted ? (
                    <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-5">
                      <div className="text-lg font-semibold text-emerald-900">
                        Re-enrolment Submitted
                      </div>
                      <p className="mt-2 text-sm leading-6 text-emerald-800">
                        Your Re-enrolment has been submitted successfully and is now pending payment verification.
                      </p>
                      {submissionId && (
                        <p className="mt-2 text-xs text-emerald-700">
                          Submission ID: {submissionId}
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <p className="mt-2 text-sm leading-6 text-[#64748B]">
                        Your place will be secured once payment is received. Please make payment to:
                      </p>

                      <div className="mt-5 rounded-xl border border-[#D9E3ED] bg-[#F5F9FD] px-4 py-4 text-sm leading-6 text-[#31445B]">
                        <div><span className="font-semibold">Account Name:</span> [YOUR ACCOUNT NAME]</div>
                        <div><span className="font-semibold">BSB:</span> [YOUR BSB]</div>
                        <div><span className="font-semibold">Account Number:</span> [YOUR ACCOUNT NUMBER]</div>
                        <div><span className="font-semibold">Reference:</span> Student Name</div>
                      </div>

                      {error && (
                        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                          {error}
                        </div>
                      )}

                      <div className="mt-6 flex justify-end">
                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={submitting || financialLoading || !tuitionConfig || !declarationConfirmed}
                          className="rounded-xl bg-[#10213A] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#173456] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {submitting ? "Submitting…" : "Submit Re-enrolment"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </section>
            )}

          </div>
        )}
      </div>
    </main>
  );
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">
        {label}
      </div>

      <div className="mt-1 text-sm font-medium text-[#10213A]">
        {value}
      </div>
    </div>
  );
}