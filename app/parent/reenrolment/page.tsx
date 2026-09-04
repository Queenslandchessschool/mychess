"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

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
        return;
      }

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
          school_class
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

      /**
       * ------------------------------------------------------
       * 8. Default Target Term
       * ------------------------------------------------------
       *
       * If a current formal enrolment exists,
       * default to the next term.
       *
       * Term 4 rolls into next academic year Term 1.
       */

      const firstEnrolment = result.find(
        (item) => item.enrollment
      )?.enrollment;

      if (firstEnrolment) {
        const currentYear = Number(
          firstEnrolment.academic_year
        );

        const currentTerm = Number(
          firstEnrolment.term
        );

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
    const currentClassId = selectedStudent?.classInfo?.id ?? "";
    setSelectedClassId(currentClassId);
    setSchoolYear(selectedStudent?.student.school_year ?? "");
    setSchoolClass(selectedStudent?.student.school_class ?? "");
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
    loadRecommendation();
  }, [selectedStudentId, targetAcademicYear, targetTerm]);

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
                        onClick={() =>
                          setSelectedStudentId(
                            item.student.id
                          )
                        }
                        className={`
                          rounded-xl border px-4 py-4 text-left transition
                          ${
                            isSelected
                              ? "border-[#D4AF37] bg-[#FFF8DC] shadow-sm"
                              : "border-[#D9E3ED] bg-[#F5F9FD] hover:border-[#D4AF37]/60"
                          }
                        `}
                      >
                        <div className="flex items-center gap-4">
  <div className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A78312]">
    {familyStudents.length === 1
      ? "CHILD"
      : `CHILD ${index + 1}`}
  </div>

  <div className="min-w-0 text-base font-semibold text-[#10213A]">
    {getStudentDisplayName(item.student) || "Student"}
  </div>
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

            {/* Target Term */}
            {selectedStudent?.enrollment && (
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
            {selectedStudent?.enrollment && (
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
                      Choose whether to continue with the current class or follow the recommended class for the new term.
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

                  <div className="mt-5 rounded-xl border border-[#D9E3ED] bg-[#F5F9FD] px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                      Selected Class
                    </div>
                    <div className="mt-1 text-lg font-semibold text-[#10213A]">
                      {selectedClassId === recommendation?.recommended_class_id &&
                      recommendedClassInfo
                        ? getClassDisplayName(recommendedClassInfo)
                        : getClassDisplayName(selectedStudent.classInfo)}
                    </div>
                    <p className="mt-2 text-sm text-[#64748B]">
                      Your selection will be saved with the Re-enrolment submission.
                    </p>
                  </div>
                </div>
              </section>
            )}


            {/* Special Request */}
            {selectedStudent?.enrollment && (
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