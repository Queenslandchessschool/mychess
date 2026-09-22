"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { synchroniseStudentStage } from "@/lib/studentSynchronisation";
import { getBusinessTime } from "@/lib/businessTime";

type Student = {
  id: string;
  student_code: string | null;
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

type StudentRecord = {
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

type TuitionConfig = {
  id: string;
  single_lesson_fee: number;
  total_lessons: number;
  standard_tuition: number;
};

type PaymentSettings = {
  account_name: string | null;
  bsb: string | null;
  account_number: string | null;
  payment_reference_instruction: string | null;
  payment_reference_example: string | null;
};

type SpecialRequest = {
  classroom_pickup: boolean;
  ymca_dropoff: boolean;
  walk_home: boolean;
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

function getStudentDisplayName(student: Student): string {
  const preferred = student.preferred_name?.trim();
  const first = student.first_name?.trim();
  const last = student.last_name?.trim();
  return `${preferred || first || ""} ${last || ""}`.trim() || "Student";
}

function getClassDisplayName(classInfo: ClassInfo | null): string {
  if (!classInfo) return "—";
  const level = classInfo.level?.trim() ?? "";
  const suffix = classInfo.class_suffix?.trim() ?? "";
  return level && suffix ? `${level} ${suffix}` : level || suffix || "—";
}


function getPaymentReference(
  classInfo: ClassInfo | null,
  student: Student | null
): string {
  if (!classInfo || !student) return "—";

  const campus = Array.isArray(classInfo.campuses)
    ? classInfo.campuses[0]
    : classInfo.campuses;

  const campusRaw = (
    campus?.campus_code ||
    campus?.short_name ||
    campus?.campus_name ||
    ""
  )
    .trim()
    .toUpperCase();

  const campusReference =
    campusRaw.includes("MACG") || campusRaw.includes("MACGREGOR")
      ? "MacG"
      : campusRaw.includes("TOOW")
        ? "TOOW"
        : campusRaw.includes("WRSS") ||
            campusRaw.includes("WARRIGAL")
          ? "WRSS"
          : campusRaw.includes("ONLINE")
            ? "ONLINE"
            : campusRaw;

  const levelRaw = classInfo.level?.trim().toLowerCase() ?? "";

  const classReference =
    levelRaw === "advanced"
      ? "A"
      : levelRaw === "intermediate"
        ? "I"
        : levelRaw === "novice"
          ? "N"
          : levelRaw === "beginner"
            ? "B"
            : classInfo.class_suffix?.trim() || levelRaw;

  return `${campusReference} ${classReference} ${getStudentDisplayName(student)}`.trim();
}

function getCampusDisplayName(classInfo: ClassInfo | null): string {
  if (!classInfo?.campuses) return "—";
  const campus = Array.isArray(classInfo.campuses)
    ? classInfo.campuses[0]
    : classInfo.campuses;
  return campus?.short_name || campus?.campus_name || campus?.campus_code || "—";
}

function getCampusType(classInfo: ClassInfo | null): string | null {
  if (!classInfo?.campuses) return null;
  const campus = Array.isArray(classInfo.campuses)
    ? classInfo.campuses[0]
    : classInfo.campuses;
  return campus?.type ?? null;
}

function isClassroomPickupAllowed(schoolYear: string | null | undefined): boolean {
  const normalized = schoolYear?.trim().toLowerCase() ?? "";
  return normalized === "prep" || normalized === "year 1";
}

function formatTime(value: string | null): string {
  if (!value) return "—";
  return value.length >= 5 ? value.slice(0, 5) : value;
}

export default function AdminAssistedReenrolmentPage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [academicYear, setAcademicYear] = useState("");
  const [term, setTerm] = useState("");
  const [studentId, setStudentId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [recommendedClassInfo, setRecommendedClassInfo] = useState<ClassInfo | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");

  const [specialRequest, setSpecialRequest] = useState<SpecialRequest>({
    classroom_pickup: false,
    ymca_dropoff: false,
    walk_home: false,
  });
  const [schoolYear, setSchoolYear] = useState("");
  const [schoolClass, setSchoolClass] = useState("");
  const [medicalInformation, setMedicalInformation] = useState("");

  const [tuitionConfig, setTuitionConfig] = useState<TuitionConfig | null>(null);
  const [currentClassSingleLessonFee, setCurrentClassSingleLessonFee] = useState(0);
  const [availableMakeupCredits, setAvailableMakeupCredits] = useState(0);
  const [availableTuitionCredit, setAvailableTuitionCredit] = useState(0);
  const [remainingLessons, setRemainingLessons] = useState(0);
  const [attendedLessons, setAttendedLessons] = useState(0);
  const [calculatedTuition, setCalculatedTuition] = useState(0);
  const [standardTuition, setStandardTuition] = useState(0);
  const [financialLoading, setFinancialLoading] = useState(false);

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [paymentSettingsLoading, setPaymentSettingsLoading] = useState(false);
  const [paymentSettingsError, setPaymentSettingsError] = useState<string | null>(null);

  const [declarationConfirmed, setDeclarationConfirmed] = useState(false);
  const [termsPoliciesConfirmed, setTermsPoliciesConfirmed] = useState(false);
  const [legalModal, setLegalModal] = useState<"terms" | "policies" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [existingSubmission, setExistingSubmission] = useState<ReenrolmentSubmission | null>(null);

  const selectedStudent = useMemo(
    () => students.find((item) => item.student.id === studentId) ?? null,
    [students, studentId]
  );

  const filteredStudents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return students;
    return students.filter((item) => {
      const name = getStudentDisplayName(item.student).toLowerCase();
      const code = item.student.student_code?.toLowerCase() ?? "";
      const className = getClassDisplayName(item.classInfo).toLowerCase();
      return name.includes(query) || code.includes(query) || className.includes(query);
    });
  }, [students, searchTerm]);

  const academicYearOptions = useMemo(() => {
    return Array.from(
      new Set(
        students
          .map((item) => Number(item.enrollment?.academic_year))
          .filter((value) => Number.isFinite(value) && value > 0)
      )
    ).sort((a, b) => b - a);
  }, [students]);

  const termOptions = useMemo(() => {
    if (!academicYear) return [];
    return [1, 2, 3, 4];
  }, [academicYear]);

  const currentClassId =
    selectedStudent?.classInfo?.id ?? selectedStudent?.enrollment?.class_id ?? "";

  const selectedClassInfo = useMemo(
    () => classes.find((item) => item.id === selectedClassId) ?? null,
    [classes, selectedClassId]
  );

  const isSchoolProgram = getCampusType(selectedClassInfo) === "School Program";
  const effectiveSchoolYear = schoolYear || selectedStudent?.student.school_year || "";
  const classroomPickupEligible = isClassroomPickupAllowed(effectiveSchoolYear);

  const redeemCreditsAvailable = Math.min(availableMakeupCredits, 2);
  const redeemAmount = redeemCreditsAvailable * currentClassSingleLessonFee;
  const tuitionCreditApplied = tuitionConfig
    ? Math.min(availableTuitionCredit, Math.max(0, standardTuition - redeemAmount))
    : 0;
  const amountPayable = tuitionConfig
    ? Math.max(0, standardTuition - redeemAmount - tuitionCreditApplied)
    : 0;

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [{ data: studentData, error: studentError }, { data: enrollmentData, error: enrollmentError }, { data: classData, error: classError }] =
          await Promise.all([
            supabase
              .from("students")
              .select("id, student_code, first_name, preferred_name, last_name, school_year, school_class, medical_information")
              .order("student_code"),
            supabase
              .from("student_enrolments")
              .select("id, student_id, class_id, academic_year, term, status, is_trial")
              .eq("status", "Active")
              .eq("is_trial", false),
            supabase
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
              .eq("status", "Active")
              .order("day")
              .order("start_time"),
          ]);

        if (studentError) throw studentError;
        if (enrollmentError) throw enrollmentError;
        if (classError) throw classError;

        const loadedStudents = (studentData ?? []) as Student[];
        const loadedEnrollments = (enrollmentData ?? []) as Enrollment[];
        const loadedClasses = (classData ?? []) as unknown as ClassInfo[];
        const classMap = new Map(loadedClasses.map((item) => [item.id, item]));

        const latestByStudent = new Map<string, Enrollment>();
        for (const enrollment of loadedEnrollments) {
          const existing = latestByStudent.get(enrollment.student_id);
          const year = Number(enrollment.academic_year ?? 0);
          const termValue = Number(enrollment.term ?? 0);
          if (
            !existing ||
            year > Number(existing.academic_year ?? 0) ||
            (year === Number(existing.academic_year ?? 0) && termValue > Number(existing.term ?? 0))
          ) {
            latestByStudent.set(enrollment.student_id, enrollment);
          }
        }

        const result: StudentRecord[] = loadedStudents
          .map((student) => {
            const enrollment = latestByStudent.get(student.id) ?? null;
            return {
              student,
              enrollment,
              classInfo: enrollment?.class_id ? classMap.get(enrollment.class_id) ?? null : null,
            };
          })
          .filter((item) => item.enrollment)
          .sort((a, b) => getStudentDisplayName(a.student).localeCompare(getStudentDisplayName(b.student)));

        setStudents(result);
        setClasses(loadedClasses);
      } catch (loadError: any) {
        console.error("ADMIN ASSISTED RE-ENROLMENT LOAD ERROR:", loadError);
        setError(loadError?.message ?? "Unable to load Assisted Re-enrolment data.");
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  useEffect(() => {
    if (!selectedStudent) return;
    const currentYear = Number(selectedStudent.enrollment?.academic_year ?? 0);
    const currentTerm = Number(selectedStudent.enrollment?.term ?? 0);
    if (!academicYear && currentYear) setAcademicYear(String(currentYear));
    if (!term) setTerm(String(currentTerm >= 4 ? 1 : currentTerm + 1));
    setSchoolYear(selectedStudent.student.school_year ?? "");
    setSchoolClass(selectedStudent.student.school_class ?? "");
    setMedicalInformation(selectedStudent.student.medical_information ?? "");
    setDeclarationConfirmed(false);
    setTermsPoliciesConfirmed(false);
    setSubmitted(false);
    setSubmissionId(null);
    setExistingSubmission(null);
    setRecommendation(null);
    setRecommendedClassInfo(null);
    setTuitionConfig(null);
    setAvailableMakeupCredits(0);
    setAvailableTuitionCredit(0);
    setShowForm(false);
  }, [studentId]);

  useEffect(() => {
    async function loadRecommendation() {
      if (!studentId || !academicYear || !term) {
        setRecommendation(null);
        setRecommendedClassInfo(null);
        return;
      }

      setRecommendationLoading(true);
      try {
        const { data, error: recommendationError } = await supabase
          .from("re_enrolment_recommendations")
          .select("id, student_id, academic_year, term, recommended_class_id")
          .eq("student_id", studentId)
          .eq("academic_year", Number(academicYear))
          .eq("term", Number(term))
          .maybeSingle();
        if (recommendationError) throw recommendationError;

        const next = (data ?? null) as Recommendation | null;
        setRecommendation(next);
        const recommended = next
          ? classes.find((item) => item.id === next.recommended_class_id) ?? null
          : null;
        setRecommendedClassInfo(recommended);
      } catch (loadError) {
        console.error("ADMIN ASSISTED RECOMMENDATION LOAD ERROR:", loadError);
        setRecommendation(null);
        setRecommendedClassInfo(null);
      } finally {
        setRecommendationLoading(false);
      }
    }

    void loadRecommendation();
  }, [studentId, academicYear, term, classes]);

  useEffect(() => {
    if (!selectedStudent || !academicYear || !term) return;
    if (recommendation?.recommended_class_id) {
      setSelectedClassId(recommendation.recommended_class_id);
    } else if (currentClassId) {
      setSelectedClassId(currentClassId);
    }
  }, [studentId, academicYear, term, recommendation?.recommended_class_id, currentClassId]);

  useEffect(() => {
    async function loadExistingSubmission() {
      if (!studentId || !academicYear || !term) {
        setExistingSubmission(null);
        return;
      }
      const { data, error: submissionError } = await supabase
        .from("re_enrolment_submissions")
        .select("id, student_id, academic_year, term, status, payment_status, submitted_at")
        .eq("student_id", studentId)
        .eq("academic_year", Number(academicYear))
        .eq("term", Number(term))
        .in("status", ["Draft", "Submitted", "Completed"])
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (submissionError) {
        console.error("ADMIN ASSISTED SUBMISSION LOAD ERROR:", submissionError);
        setExistingSubmission(null);
        return;
      }
      setExistingSubmission((data ?? null) as ReenrolmentSubmission | null);
    }
    void loadExistingSubmission();
  }, [studentId, academicYear, term, submitted]);

  useEffect(() => {
    async function loadPaymentSettings() {
      setPaymentSettingsLoading(true);
      setPaymentSettingsError(null);

      try {
        const { data, error: paymentError } = await supabase
          .from("payment_settings")
          .select(
            `
            account_name,
            bsb,
            account_number,
            payment_reference_instruction,
            payment_reference_example
          `
          )
          .eq("status", "Active")
          .maybeSingle();

        if (paymentError) throw paymentError;

        if (!data) {
          setPaymentSettings(null);
          setPaymentSettingsError("No active payment settings found.");
          return;
        }

        setPaymentSettings(data as PaymentSettings);
      } catch (paymentError: any) {
        console.error("ADMIN ASSISTED PAYMENT SETTINGS LOAD ERROR:", paymentError);
        setPaymentSettings(null);
        setPaymentSettingsError(
          paymentError?.message ?? "Unable to load payment settings."
        );
      } finally {
        setPaymentSettingsLoading(false);
      }
    }

    void loadPaymentSettings();
  }, []);

  useEffect(() => {
    async function loadFinancials() {
      if (!studentId || !academicYear || !term || !selectedClassId) {
        setTuitionConfig(null);
        setCurrentClassSingleLessonFee(0);
        setAvailableMakeupCredits(0);
        setAvailableTuitionCredit(0);
        setAttendedLessons(0);
        setRemainingLessons(0);
        setCalculatedTuition(0);
        setStandardTuition(0);
        return;
      }

      setFinancialLoading(true);
      try {
        const classIds = Array.from(new Set([selectedClassId, currentClassId].filter(Boolean)));
        const { data: tuitionData, error: tuitionError } = await supabase
          .from("tuition_configurations")
          .select("id, class_id, single_lesson_fee, total_lessons, standard_tuition")
          .eq("academic_year", Number(academicYear))
          .eq("term", Number(term))
          .in("class_id", classIds)
          .eq("status", "Active");
        if (tuitionError) throw tuitionError;

        const selectedTuitionData = (tuitionData ?? []).find((row) => row.class_id === selectedClassId) ?? null;
        const currentTuitionData = (tuitionData ?? []).find((row) => row.class_id === currentClassId) ?? null;

        setCurrentClassSingleLessonFee(Number(currentTuitionData?.single_lesson_fee ?? 0));

        if (!selectedTuitionData) {
          setTuitionConfig(null);
          setRemainingLessons(0);
          setAttendedLessons(0);
          setCalculatedTuition(0);
          setStandardTuition(0);
        } else {
          const singleLessonFee = Number(selectedTuitionData.single_lesson_fee ?? 0);
          const configuredTotalLessons = Number(selectedTuitionData.total_lessons ?? 0);
          const configuredStandardTuition = Number(selectedTuitionData.standard_tuition ?? 0);
          const businessDate = getBusinessTime().dateKey;

          const { data: lessonData, error: lessonError } = await supabase
            .from("lessons")
            .select("id, lesson_date, status, chargeable")
            .eq("class_id", selectedClassId)
            .eq("academic_year", Number(academicYear))
            .eq("term", Number(term))
            .eq("chargeable", true)
            .order("lesson_date", { ascending: true });
          if (lessonError) throw lessonError;

          const chargeableLessons = lessonData ?? [];
          const remaining = chargeableLessons.filter((lesson) => lesson.lesson_date >= businessDate).length;
          const pastLessonIds = chargeableLessons.filter((lesson) => lesson.lesson_date < businessDate).map((lesson) => lesson.id);

          const { data: attendedData, error: attendanceError } = pastLessonIds.length
            ? await supabase
                .from("attendance")
                .select("lesson_id, attendance_status, attendance_type")
                .eq("student_id", studentId)
                .in("lesson_id", pastLessonIds)
                .in("attendance_status", ["Present", "Late"])
                .eq("attendance_type", "Regular")
            : { data: [], error: null };
          if (attendanceError) throw attendanceError;

          const attendedCount = new Set((attendedData ?? []).map((row) => row.lesson_id)).size;
          const hasGeneratedLessons = chargeableLessons.length > 0;
          const effectiveRemainingLessons = hasGeneratedLessons ? remaining : configuredTotalLessons;
          const isMidTerm = hasGeneratedLessons && remaining < configuredTotalLessons;
          const dynamicCalculatedTuition = hasGeneratedLessons
            ? (attendedCount + effectiveRemainingLessons) * singleLessonFee
            : effectiveRemainingLessons * singleLessonFee;
          const effectiveStandardTuition = isMidTerm ? dynamicCalculatedTuition : configuredStandardTuition;

          setTuitionConfig({
            id: selectedTuitionData.id,
            single_lesson_fee: singleLessonFee,
            total_lessons: configuredTotalLessons,
            standard_tuition: effectiveStandardTuition,
          });
          setRemainingLessons(effectiveRemainingLessons);
          setAttendedLessons(attendedCount);
          setCalculatedTuition(dynamicCalculatedTuition);
          setStandardTuition(effectiveStandardTuition);
        }

        const { data: creditData, error: creditError } = await supabase
          .from("makeup_credits")
          .select("credits")
          .eq("student_id", studentId)
          .eq("status", "Available")
          .gt("credits", 0);
        if (creditError) throw creditError;
        setAvailableMakeupCredits((creditData ?? []).reduce((sum, row) => sum + Number(row.credits ?? 0), 0));

        const { data: tuitionCreditData, error: tuitionCreditError } = await supabase
          .from("tuition_adjustments")
          .select("id, adjustment_amount")
          .eq("student_id", studentId)
          .eq("adjustment_type", "Tuition Credit")
          .eq("status", "Pending")
          .lt("adjustment_amount", 0)
          .order("created_at", { ascending: true });
        if (tuitionCreditError) throw tuitionCreditError;
        setAvailableTuitionCredit(
          (tuitionCreditData ?? []).reduce((sum, row) => sum + Math.abs(Number(row.adjustment_amount ?? 0)), 0)
        );
      } catch (financialError) {
        console.error("ADMIN ASSISTED FINANCIAL LOAD ERROR:", financialError);
        setTuitionConfig(null);
        setCurrentClassSingleLessonFee(0);
        setAvailableMakeupCredits(0);
        setAvailableTuitionCredit(0);
        setAttendedLessons(0);
        setRemainingLessons(0);
        setCalculatedTuition(0);
        setStandardTuition(0);
      } finally {
        setFinancialLoading(false);
      }
    }

    if (showForm) void loadFinancials();
  }, [showForm, studentId, academicYear, term, selectedClassId, currentClassId]);

  function handleStudentChange(value: string) {
    setStudentId(value);
    setStudentPickerOpen(false);
    setSearchTerm("");
  }

  function handleAcademicYearChange(value: string) {
    setAcademicYear(value);
    setTerm("");
    setShowForm(false);
  }

  function handleContinue() {
    setError(null);
    if (!academicYear || !term || !studentId) return;
    setShowForm(true);
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

      // Same logic as Parent Re-enrolment.
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

  async function handleSubmit() {
    setError(null);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    if (!selectedStudent) {
      setError("Please select a student.");
      return;
    }

    if (!currentClassId) {
      setError("Current class information is not available.");
      return;
    }

    if (!selectedClassId) {
      setError("Please select a class.");
      return;
    }

    if (isSchoolProgram && Number(term) === 1) {
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
      setError("Tuition configuration is not available for the selected class and term.");
      return;
    }

    if (!declarationConfirmed) {
      setError("Please confirm that the above information is correct.");
      return;
    }

    if (!termsPoliciesConfirmed) {
      setError(
        "Please confirm that you have read and agree to comply with the Queensland Chess School Terms of Use and Policies."
      );
      return;
    }

    setSubmitting(true);
    let createdEnrollmentId: string | null = null;

    try {
      const { data: existingSubmissionData, error: existingSubmissionError } = await supabase
        .from("re_enrolment_submissions")
        .select("id, status")
        .eq("student_id", selectedStudent.student.id)
        .eq("academic_year", Number(academicYear))
        .eq("term", Number(term))
        .in("status", ["Draft", "Submitted", "Completed"])
        .limit(1)
        .maybeSingle();

      if (existingSubmissionError) throw existingSubmissionError;
      if (existingSubmissionData) {
        setError("A Re-enrolment submission already exists for this student and term.");
        return;
      }

      const recommendedClassId = recommendation?.recommended_class_id ?? currentClassId;
      const specialRequestSnapshot = {
        classroom_pickup: isSchoolProgram ? specialRequest.classroom_pickup : false,
        ymca_dropoff: isSchoolProgram ? specialRequest.ymca_dropoff : false,
        walk_home: specialRequest.walk_home,
        school_year: isSchoolProgram && Number(term) === 1 ? schoolYear.trim() : null,
        school_class: isSchoolProgram && Number(term) === 1 ? schoolClass.trim() : null,
      };
      const medicalSnapshot = medicalInformation.trim() || null;

      const { data: existingEnrollment, error: existingEnrollmentError } = await supabase
        .from("student_enrolments")
        .select("id")
        .eq("student_id", selectedStudent.student.id)
        .eq("academic_year", Number(academicYear))
        .eq("term", Number(term))
        .eq("class_id", selectedClassId)
        .eq("is_trial", false)
        .maybeSingle();

      if (existingEnrollmentError) throw existingEnrollmentError;
      if (existingEnrollment?.id) {
        throw new Error("An enrolment already exists for this student, class and term.");
      }

      const { data: newEnrollment, error: enrollmentError } = await supabase
        .from("student_enrolments")
        .insert({
          student_id: selectedStudent.student.id,
          class_id: selectedClassId,
          academic_year: Number(academicYear),
          term: Number(term),
          status: "Active",
          is_trial: false,
          trial_status: null,
          payment_status: "Pending",
          payment_amount: Number(amountPayable.toFixed(2)),
          tuition_configuration_id: tuitionConfig.id,
          pricing_method: "Calculated",
          standard_tuition: Number(tuitionConfig.standard_tuition.toFixed(2)),
          redeem_amount: Number(redeemAmount.toFixed(2)),
          amount_payable: Number(amountPayable.toFixed(2)),
          medical_snapshot: medicalSnapshot,
          special_request_snapshot: specialRequestSnapshot,
        })
        .select("id")
        .single();

      if (enrollmentError) throw enrollmentError;
      createdEnrollmentId = newEnrollment?.id ?? null;
      if (!createdEnrollmentId) throw new Error("The new enrolment was created but its ID could not be confirmed.");

      const submittedAt = new Date().toISOString();
      const { data: insertedSubmission, error: submissionError } = await supabase
        .from("re_enrolment_submissions")
        .insert({
          student_id: selectedStudent.student.id,
          current_class_id: currentClassId,
          recommended_class_id: recommendedClassId,
          selected_class_id: selectedClassId,
          academic_year: Number(academicYear),
          term: Number(term),
          medical_snapshot: medicalSnapshot,
          special_request_snapshot: specialRequestSnapshot,
          available_makeup_credits: Number(availableMakeupCredits),
          redeem_amount: Number(redeemAmount.toFixed(2)),
          standard_tuition: Number(tuitionConfig.standard_tuition.toFixed(2)),
          amount_payable: Number(amountPayable.toFixed(2)),
          payment_status: "Pending",
          status: "Submitted",
          submitted_at: submittedAt,
          submitted_by: user.id,
          submission_source: "Admin",
        })
        .select("id")
        .single();

      if (submissionError) {
        const { error: rollbackError } = await supabase
          .from("student_enrolments")
          .delete()
          .eq("id", createdEnrollmentId);
        if (rollbackError) console.error("ADMIN ASSISTED ENROLMENT ROLLBACK ERROR:", rollbackError);
        throw submissionError;
      }

      await synchroniseStudentStage(
        selectedStudent.student.id,
        Number(academicYear),
        Number(term)
      );

              // Synchronise Student Master class snapshot
      if (selectedClassInfo) {
        const campus = Array.isArray(selectedClassInfo.campuses)
          ? selectedClassInfo.campuses[0]
          : selectedClassInfo.campuses;

        const campusLabel =
          campus?.campus_code ||
          campus?.short_name ||
          campus?.campus_name ||
          "";

        const classLabel = [
          campusLabel,
          selectedClassInfo.day,
          selectedClassInfo.level,
        ]
          .map((value) => value?.trim())
          .filter(Boolean)
          .join(" | ");

        const { error: snapshotError } = await supabase
          .from("students")
          .update({
            current_level: selectedClassInfo.level,
            current_class: classLabel || null,
            current_class_id: selectedClassInfo.id,
          })
          .eq("id", selectedStudent.student.id);

        if (snapshotError) {
          throw snapshotError;
        }
      }

      setSubmissionId(insertedSubmission.id);
      setSubmitted(true);
      setExistingSubmission({
        id: insertedSubmission.id,
        student_id: selectedStudent.student.id,
        academic_year: Number(academicYear),
        term: Number(term),
        status: "Submitted",
        payment_status: "Pending",
        submitted_at: submittedAt,
      });
    } catch (submitError: any) {
      console.error("ADMIN ASSISTED RE-ENROLMENT SUBMIT ERROR:", submitError);
      setError(submitError?.message ?? "Unable to submit Assisted Re-enrolment.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="rounded-2xl border border-[#D9E0E8] border-t-4 border-t-[#D4AF37] bg-white p-8 shadow-sm">
            <p className="text-sm text-[#64748B]">Loading Assisted Re-enrolment...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error && !selectedStudent) {
    return (
      <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="rounded-2xl border border-[#D9E0E8] border-t-4 border-t-[#D4AF37] bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-[#10213A]">Admin Assisted Re-enrolment</h1>
            <p className="mt-4 text-sm text-red-600">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-[#F4F7FB] sm:text-4xl">Admin Assisted Re-enrolment</h1>
          <p className="mt-2 text-sm text-[#C8D2DF]/70 sm:text-base">Complete a re-enrolment on behalf of a parent.</p>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <section className="lg:col-span-1">
            <div className="overflow-hidden rounded-2xl border border-[#D9E0E8] border-t-4 border-t-[#D4AF37] bg-white shadow-sm">
              <div className="border-b border-[#D9E0E8] px-5 py-5 sm:px-6">
                <h2 className="text-lg font-semibold text-[#10213A]">Assisted Re-enrolment</h2>
                <p className="mt-1 text-sm leading-6 text-[#64748B]">Admin completes the same re-enrolment business flow on behalf of the parent.</p>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#10213A]">Academic Year</label>
                  <select
                    value={academicYear}
                    onChange={(event) => handleAcademicYearChange(event.target.value)}
                    className="min-h-[48px] w-full rounded-xl border border-[#D9E0E8] bg-white px-4 text-sm text-[#10213A] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                  >
                    <option value="">Select Academic Year</option>
                    {academicYearOptions.map((year) => (
                      <option key={year} value={String(year)}>{year}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#10213A]">Target Term</label>
                  <select
                    value={term}
                    onChange={(event) => { setTerm(event.target.value); setShowForm(false); }}
                    className="min-h-[48px] w-full rounded-xl border border-[#D9E0E8] bg-white px-4 text-sm text-[#10213A] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                  >
                    <option value="">Select Term</option>
                    {termOptions.map((item) => <option key={item} value={String(item)}>Term {item}</option>)}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#10213A]">Student</label>
                  <button
                    type="button"
                    onClick={() => setStudentPickerOpen((previous) => !previous)}
                    className="flex min-h-[48px] w-full items-center justify-between rounded-xl border border-[#D9E0E8] bg-white px-4 text-left text-sm text-[#10213A] outline-none hover:border-[#B9C3D0] focus:border-[#D4AF37]"
                  >
                    <span className="truncate">{selectedStudent ? getStudentDisplayName(selectedStudent.student) : "Select Student"}</span>
                    <span className="ml-3 shrink-0 text-[#64748B]">⌄</span>
                  </button>

                  {studentPickerOpen && (
                    <div className="mt-2 overflow-hidden rounded-xl border border-[#D9E0E8] bg-white shadow-lg">
                      <div className="border-b border-[#E5EAF0] p-3">
                        <input
                          autoFocus
                          value={searchTerm}
                          onChange={(event) => setSearchTerm(event.target.value)}
                          placeholder="Search student..."
                          className="min-h-[42px] w-full rounded-lg border border-[#D9E0E8] px-3 text-sm text-[#10213A] outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {filteredStudents.length === 0 ? (
                          <p className="p-4 text-sm text-[#64748B]">No students found.</p>
                        ) : filteredStudents.map((item) => (
                          <button
                            key={item.student.id}
                            type="button"
                            onClick={() => handleStudentChange(item.student.id)}
                            className={`block w-full border-b border-[#F0F2F5] px-4 py-3 text-left last:border-b-0 hover:bg-[#FFFDF5] ${item.student.id === studentId ? "bg-[#FFF8DD]" : ""}`}
                          >
                            <div className="text-sm font-semibold text-[#10213A]">{getStudentDisplayName(item.student)}</div>
                            <div className="mt-1 text-xs text-[#64748B]">
                              {item.student.student_code ? `${item.student.student_code} · ` : ""}Current Class: {getClassDisplayName(item.classInfo)}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {selectedStudent && (
                  <div className="rounded-xl border border-[#E4E9EF] bg-[#F8FAFC] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A78312]">Current Class</div>
                    <div className="mt-1 text-sm font-semibold text-[#10213A]">{getClassDisplayName(selectedStudent.classInfo)}</div>
                    <div className="mt-1 text-xs text-[#64748B]">{getCampusDisplayName(selectedStudent.classInfo)} · {selectedStudent.classInfo?.day ?? "—"} · {formatTime(selectedStudent.classInfo?.start_time ?? null)}–{formatTime(selectedStudent.classInfo?.end_time ?? null)}</div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={!academicYear || !term || !studentId}
                  className="min-h-[48px] w-full rounded-xl bg-[#10213A] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1A3152] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </div>
          </section>

          <section className="lg:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-[#D9E0E8] border-t-4 border-t-[#D4AF37] bg-white shadow-sm">
              <div className="border-b border-[#D9E0E8] px-5 py-5 sm:px-6">
                <h2 className="text-lg font-semibold text-[#10213A]">Re-enrolment Preview</h2>
                <p className="mt-1 text-sm leading-6 text-[#64748B]">Select a student and target term to continue.</p>
              </div>
              <div className="p-5 sm:p-6">
                {!selectedStudent ? (
                  <div className="rounded-xl border border-[#E4E9EF] bg-[#F8FAFC] p-6 text-sm text-[#64748B]">No student selected.</div>
                ) : (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <InfoField label="Student" value={getStudentDisplayName(selectedStudent.student)} />
                      <InfoField label="Current Enrolment" value={`${selectedStudent.enrollment?.academic_year ?? "—"} · T${selectedStudent.enrollment?.term ?? "—"}`} />
                    </div>
                    <InfoField label="Target" value={academicYear && term ? `${academicYear} · Term ${term}` : "Select target term"} />
                    {showForm && <div className="text-xs font-medium text-[#A78312]">Ready to continue with Assisted Re-enrolment</div>}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {showForm && selectedStudent && (
          <div className="mt-8 space-y-8">
            <section className="overflow-hidden rounded-2xl border border-[#D9E3ED] bg-[#FFFDF8] shadow-2xl shadow-black/20">
              <div className="h-[6px] bg-gradient-to-r from-[#F7D968] via-[#D4AF37]/75 to-transparent" />
              <div className="p-6 sm:p-8">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A78312]">Step 1</div>
                <h2 className="mt-2 text-2xl font-semibold text-[#10213A]">Class Selection</h2>
                <p className="mt-2 text-sm leading-6 text-[#64748B]">The Recommended Class is loaded from the existing Admin recommendation. Admin may select a different class when assisting the parent.</p>

                {recommendationLoading ? (
                  <div className="mt-6 rounded-xl border border-[#D9E3ED] bg-[#F5F9FD] px-4 py-5 text-sm text-[#64748B]">
                    Checking recommended class...
                  </div>
                ) : (
                  <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => currentClassId && setSelectedClassId(currentClassId)}
                      className={`rounded-xl border p-5 text-left transition ${
                        selectedClassId === currentClassId
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
                    recommendation.recommended_class_id !== currentClassId ? (
                      <button
                        type="button"
                        onClick={() => setSelectedClassId(recommendation.recommended_class_id)}
                        className={`rounded-xl border p-5 text-left transition ${
                          selectedClassId === recommendation.recommended_class_id
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

                <div className="mt-6">
                  <label className="mb-2 block text-sm font-medium text-[#10213A]">Selected Class</label>
                  <select
                    value={selectedClassId}
                    onChange={(event) => setSelectedClassId(event.target.value)}
                    className="min-h-[48px] w-full rounded-xl border border-[#D9E0E8] bg-white px-4 text-sm text-[#10213A] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                  >
                    <option value="">Select Class</option>
                    {classes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {getCampusDisplayName(item)} · {item.day ?? "—"} · {getClassDisplayName(item)} · {formatTime(item.start_time)}–{formatTime(item.end_time)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#D9E3ED] bg-[#FFFDF8] shadow-2xl shadow-black/20">
              <div className="h-[6px] bg-gradient-to-r from-[#F7D968] via-[#D4AF37]/75 to-transparent" />
              <div className="p-6 sm:p-8">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A78312]">Step 2</div>
                <h2 className="mt-2 text-2xl font-semibold text-[#10213A]">Special Request</h2>
                <p className="mt-2 text-sm leading-6 text-[#64748B]">These options follow the existing Parent Re-enrolment rules.</p>

                {isSchoolProgram && Number(term) === 1 && (
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
                          onChange={(event) => setSchoolYear(event.target.value)}
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
                          onChange={(event) => setSchoolClass(event.target.value)}
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
                          classroomPickupEligible
                            ? "border-[#D3E0EC] bg-[#EEF5FB] text-[#31445B] hover:border-[#D4AF37]/60 hover:bg-[#F7FBFF]"
                            : "cursor-not-allowed border-[#D9E3ED] bg-[#F1F4F7] text-[#94A3B8]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={
                            classroomPickupEligible &&
                            specialRequest.classroom_pickup
                          }
                          disabled={!classroomPickupEligible}
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
                    This selection will be saved with the Assisted Re-enrolment submission.
                  </p>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#D9E3ED] bg-[#FFFDF8] shadow-2xl shadow-black/20">
              <div className="h-[6px] bg-gradient-to-r from-[#F7D968] via-[#D4AF37]/75 to-transparent" />
              <div className="p-6 sm:p-8">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A78312]">Step 3</div>
                <h2 className="mt-2 text-2xl font-semibold text-[#10213A]">Medical Information</h2>
                <p className="mt-2 text-sm leading-6 text-[#64748B]">Review and update the student's medical information before submission.</p>
                <textarea value={medicalInformation} onChange={(event) => setMedicalInformation(event.target.value)} rows={5} className="mt-6 w-full rounded-xl border border-[#D9E0E8] bg-white px-4 py-3 text-sm leading-6 text-[#10213A] outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/15" />
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#D9E3ED] bg-[#FFFDF8] shadow-2xl shadow-black/20">
              <div className="h-[6px] bg-gradient-to-r from-[#F7D968] via-[#D4AF37]/75 to-transparent" />
              <div className="p-6 sm:p-8">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A78312]">Step 4</div>
                <h2 className="mt-2 text-2xl font-semibold text-[#10213A]">Tuition & Make-up Credit</h2>
                <p className="mt-2 text-sm leading-6 text-[#64748B]">Tuition uses the selected Class pricing configuration. Up to two available Make-up Credits may be redeemed toward tuition.</p>

                {financialLoading ? (
                  <div className="mt-6 rounded-xl border border-[#D9E3ED] bg-[#F5F9FD] px-4 py-5 text-sm text-[#64748B]">Loading tuition and Make-up Credit information…</div>
                ) : tuitionConfig ? (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <InfoField label="Selected Class" value={getClassDisplayName(selectedClassInfo)} />
                    {attendedLessons > 0 && <InfoField label="Attended Lessons" value={String(attendedLessons)} />}
                    <InfoField label="Remaining Lessons" value={String(remainingLessons)} />
                    {attendedLessons > 0 && <InfoField label="Chargeable Lessons" value={String(attendedLessons + remainingLessons)} />}
                    <InfoField label="Standard Tuition (incl. GST)" value={`$${standardTuition.toFixed(2)}`} />
                    {redeemAmount > 0 && <InfoField label="Make-up Credit" value={`-$${redeemAmount.toFixed(2)}`} />}
                    {tuitionCreditApplied > 0 && <InfoField label="Tuition Credit" value={`-$${tuitionCreditApplied.toFixed(2)}`} />}
                    <InfoField label="Amount Payable (incl. GST)" value={`$${amountPayable.toFixed(2)}`} />
                  </div>
                ) : (
                  <div className="mt-6 rounded-xl border border-[#D4AF37]/40 bg-[#FFF8DC] px-4 py-5 text-sm text-[#64748B]">Tuition configuration is not available for the selected class and term.</div>
                )}

                <div className="mt-6 rounded-xl border border-[#E4E9EF] bg-[#F8FAFC] p-4 text-sm text-[#64748B]">
                  Available Make-up Credits: <span className="font-semibold text-[#10213A]">{availableMakeupCredits}</span>
                </div>
                {calculatedTuition > 0 && <div className="mt-3 text-xs text-[#64748B]">Calculated tuition before applicable credits: ${calculatedTuition.toFixed(2)}</div>}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#D9E3ED] bg-[#FFFDF8] shadow-2xl shadow-black/20">
              <div className="h-[6px] bg-gradient-to-r from-[#F7D968] via-[#D4AF37]/75 to-transparent" />
              <div className="p-6 sm:p-8">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A78312]">Step 5</div>
                <h2 className="mt-2 text-2xl font-semibold text-[#10213A]">Review & Declaration</h2>
                <p className="mt-2 text-sm leading-6 text-[#64748B]">Please review the selections before submitting the Re-enrolment.</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <InfoField label="Student" value={getStudentDisplayName(selectedStudent.student)} />
                  <InfoField label="Target Term" value={`${academicYear} Term ${term}`} />
                  <InfoField label="Selected Class" value={getClassDisplayName(selectedClassInfo)} />
                  <InfoField label="Campus" value={getCampusDisplayName(selectedClassInfo)} />
                  <InfoField label="Special Request" value={[
                    specialRequest.classroom_pickup ? "Classroom Pick-up" : null,
                    specialRequest.ymca_dropoff ? "YMCA Drop-off" : null,
                    specialRequest.walk_home ? "Walk Home" : null,
                  ].filter(Boolean).join(" + ") || "None of them"} />
                  {isSchoolProgram && Number(term) === 1 && <InfoField label="School Year / Class" value={`${schoolYear.trim() || "—"} / ${schoolClass.trim() || "—"}`} />}
                  <InfoField label="Amount Payable (incl. GST)" value={tuitionConfig ? `$${amountPayable.toFixed(2)}` : "—"} />
                </div>

                <div className="mt-6 space-y-3">
                    <label className="flex items-start gap-3 rounded-xl border border-[#D3E0EC] bg-[#EEF5FB] px-4 py-4 text-sm text-[#31445B]">
                      <input
                        type="checkbox"
                        checked={declarationConfirmed}
                        onChange={(event) => setDeclarationConfirmed(event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#D4AF37]"
                      />
                      <span>I confirm that the above information is correct.</span>
                    </label>

                    <label className="flex items-start gap-3 rounded-xl border border-[#D3E0EC] bg-[#EEF5FB] px-4 py-4 text-sm text-[#31445B]">
                      <input
                        type="checkbox"
                        checked={termsPoliciesConfirmed}
                        onChange={(event) => setTermsPoliciesConfirmed(event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#D4AF37]"
                      />
                      <span className="leading-6">
                        I have read and agree to comply with the Queensland Chess School{" "}
                        <button
                          type="button"
                          onClick={() => setLegalModal("terms")}
                          className="font-semibold text-[#8A6A0A] underline underline-offset-2 hover:text-[#10213A]"
                        >
                          Terms of Use
                        </button>{" "}
                        and{" "}
                        <button
                          type="button"
                          onClick={() => setLegalModal("policies")}
                          className="font-semibold text-[#8A6A0A] underline underline-offset-2 hover:text-[#10213A]"
                        >
                          Policies
                        </button>
                        .
                      </span>
                    </label>
                  </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#D9E3ED] bg-[#FFFDF8] shadow-2xl shadow-black/20">
              <div className="h-[6px] bg-gradient-to-r from-[#F7D968] via-[#D4AF37]/75 to-transparent" />
              <div className="p-6 sm:p-8">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A78312]">Step 6</div>
                <h2 className="mt-2 text-2xl font-semibold text-[#10213A]">Payment & Enrolment</h2>
                <p className="mt-2 text-sm leading-6 text-[#64748B]">Submission creates the new formal enrolment with Payment Pending, matching the Parent Re-enrolment workflow.</p>
                {paymentSettingsLoading ? (
                  <div className="mt-6 rounded-xl border border-[#D9E3ED] bg-[#F5F9FD] px-4 py-5 text-sm text-[#64748B]">
                    Loading payment details…
                  </div>
                ) : paymentSettings ? (
                  <div className="mt-6 rounded-xl border border-[#D9E3ED] bg-[#F5F9FD] px-4 py-5 text-sm leading-7 text-[#31445B]">
                    <div>
                      <span className="font-semibold">Account Name:</span>{" "}
                      {paymentSettings.account_name || "—"}
                    </div>
                    <div>
                      <span className="font-semibold">BSB:</span>{" "}
                      {paymentSettings.bsb || "—"}
                    </div>
                    <div>
                      <span className="font-semibold">Account Number:</span>{" "}
                      {paymentSettings.account_number || "—"}
                    </div>
                    <div>
                      <span className="font-semibold">Payment Reference:</span>{" "}
                      {getPaymentReference(
                        selectedClassInfo,
                        selectedStudent?.student ?? null
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-5 text-sm text-red-700">
                    {paymentSettingsError || "Payment settings are not available."}
                  </div>
                )}

                {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">{error}</div>}

                {existingSubmission && !submitted && (
                  <div className="mt-5 rounded-xl border border-[#D4AF37]/40 bg-[#FFF8DC] px-4 py-4 text-sm text-[#5B4A12]">
                    A Re-enrolment submission already exists for this student and target term. No second submission will be created.
                  </div>
                )}

                {submitted ? (
                  <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-sm text-emerald-800">
                    Assisted Re-enrolment submitted successfully. Submission ID: {submissionId ?? "—"}. Payment status: Pending.
                  </div>
                ) : (
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting || financialLoading || !tuitionConfig || !declarationConfirmed || !termsPoliciesConfirmed || !!existingSubmission}
                      className="rounded-xl bg-[#10213A] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#173456] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? "Submitting…" : "Submit Assisted Re-enrolment"}
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>

      {legalModal && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-[#07172B]/60 px-4 py-6 backdrop-blur-[2px]"
          onClick={() => setLegalModal(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="legal-modal-title"
            className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#D9E0E8] bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="h-1 bg-[#D4AF37]" />
            <div className="flex items-center justify-between border-b border-[#E5EAF0] px-5 py-4">
              <h2 id="legal-modal-title" className="text-lg font-semibold text-[#10213A]">
                {legalModal === "terms" ? "Terms of Use" : "Policies"}
              </h2>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#10213A]"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 bg-[#F8FAFC]">
              <iframe
                title={legalModal === "terms" ? "Queensland Chess School Terms of Use" : "Queensland Chess School Policies"}
                src={
                  legalModal === "terms"
                    ? "https://queenslandchessschool.com.au/terms-of-use"
                    : "https://queenslandchessschool.com.au/policies"
                }
                className="h-full w-full border-0"
              />
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[#E5EAF0] bg-white px-5 py-3">
              <a
                href={
                  legalModal === "terms"
                    ? "https://queenslandchessschool.com.au/terms-of-use"
                    : "https://queenslandchessschool.com.au/policies"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-[#8A6A0A] underline underline-offset-2 hover:text-[#10213A]"
              >
                Open in a new tab
              </a>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="min-h-[42px] rounded-xl bg-[#10213A] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1A3154]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">{label}</div>
      <div className="mt-1 text-sm font-medium text-[#10213A]">{value}</div>
    </div>
  );
}

function ClassChoiceCard({
  title,
  classInfo,
  selected,
  onClick,
  disabled = false,
  loading = false,
}: {
  title: string;
  classInfo: ClassInfo | null;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border p-5 text-left transition ${selected ? "border-[#D4AF37] bg-[#FFF8DC]" : "border-[#D9E3ED] bg-white hover:border-[#B9C3D0]"} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A78312]">{title}</div>
      <div className="mt-2 text-base font-semibold text-[#10213A]">
        {loading ? "Loading…" : getClassDisplayName(classInfo)}
      </div>
      <div className="mt-1 text-sm text-[#64748B]">
        {classInfo ? `${getCampusDisplayName(classInfo)} · ${classInfo.day ?? "—"} · ${formatTime(classInfo.start_time)}–${formatTime(classInfo.end_time)}` : "Not available"}
      </div>
    </button>
  );
}

function RequestCheckbox({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-sm ${disabled ? "border-[#E4E9EF] bg-[#F8FAFC] text-[#94A3B8]" : "border-[#D9E3ED] bg-white text-[#31445B]"}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 accent-[#D4AF37]"
      />
      <span>{label}</span>
    </label>
  );
}
