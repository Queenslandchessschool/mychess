"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/currentUser";

type AcademicCalendar = {
  id: string;
  academic_year: number;
  term: number;
};

type Campus = {
  id: string;
  campus_code: string | null;
  short_name: string | null;
  type: string | null;
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

type StudentEnrolment = {
  id: string;
  student_id: string;
  academic_year: number;
  term: number;
  class_id: string;
  status: string;
  is_trial: boolean | null;
  student_name: string;
  class_name: string;
};

type Recommendation = {
  id: string;
  student_id: string;
  academic_year: number;
  term: number;
  recommended_class_id: string;
  student_name: string;
  current_class_name: string;
  recommended_class_name: string;
};

type FormState = {
  academic_year: string;
  term: string;
  student_id: string;
  recommended_class_id: string;
};

type PopupState = {
  open: boolean;
  title: string;
  message: string;
  type: "info" | "success" | "error";
};

const emptyForm: FormState = {
  academic_year: "",
  term: "",
  student_id: "",
  recommended_class_id: "",
};

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

  const parts = [campusName, day, level, suffix].filter(Boolean);
  return parts.join(" | ") || "Class";
}

function formatTime(value: string | null) {
  if (!value) return "";
  return value.substring(0, 5);
}

export default function ReenrolmentPage() {
  const [calendars, setCalendars] = useState<AcademicCalendar[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [enrolments, setEnrolments] = useState<StudentEnrolment[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingRecommendation, setEditingRecommendation] =
    useState<Recommendation | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [targetSearchTerm, setTargetSearchTerm] = useState("");
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [targetPickerOpen, setTargetPickerOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
    setPopup({ open: true, title, message, type });
  }

  function closePopup() {
    setPopup((previous) => ({ ...previous, open: false }));
  }

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
      calendarResult,
      campusResult,
      classResult,
      enrolmentResult,
      recommendationResult,
    ] = await Promise.all([
      supabase
        .from("academic_calendar")
        .select("id, academic_year, term")
        .order("academic_year", { ascending: false })
        .order("term"),
      supabase
        .from("campuses")
        .select("id, campus_code, short_name, type")
        .order("short_name"),
      supabase
        .from("classes")
        .select(
          "id, campus_id, level, class_suffix, day, start_time, end_time, status"
        )
        .eq("status", "Active")
        .order("day")
        .order("start_time"),
      supabase
        .from("student_enrolments")
        .select(`
          id,
          student_id,
          academic_year,
          term,
          class_id,
          status,
          is_trial,
          students:student_id (
            first_name,
            last_name
          ),
          classes:class_id (
            id,
            campus_id,
            level,
            class_suffix,
            day,
            start_time,
            end_time,
            status
          )
        `)
        .eq("status", "Active")
        .eq("is_trial", false)
        .order("student_id"),
      supabase
        .from("re_enrolment_recommendations")
        .select(`
          id,
          student_id,
          academic_year,
          term,
          recommended_class_id,
          students:student_id (
            first_name,
            last_name
          )
        `)
        .order("academic_year", { ascending: false })
        .order("term")
        .order("created_at", { ascending: false }),
    ]);

    if (
      calendarResult.error ||
      campusResult.error ||
      classResult.error ||
      enrolmentResult.error ||
      recommendationResult.error
    ) {
      console.error(
        "RE-ENROLMENT LOAD ERROR:",
        calendarResult.error ??
          campusResult.error ??
          classResult.error ??
          enrolmentResult.error ??
          recommendationResult.error
      );
      setErrorMessage("Unable to load Re-enrolment data.");
      setLoading(false);
      return;
    }

    const loadedCalendars = (calendarResult.data ?? []) as AcademicCalendar[];
    const loadedCampuses = (campusResult.data ?? []) as Campus[];
    const loadedClasses = (classResult.data ?? []) as ClassRecord[];

    const campusMapLocal = new Map(
      loadedCampuses.map((item) => [item.id, item])
    );
    const classMapLocal = new Map(
      loadedClasses.map((item) => [item.id, item])
    );

    const loadedEnrolments: StudentEnrolment[] = (enrolmentResult.data ?? [])
      .filter((item: any) => item.status === "Active" && item.is_trial === false)
      .map((item: any) => ({
        id: item.id,
        student_id: item.student_id,
        academic_year: item.academic_year,
        term: item.term,
        class_id: item.class_id,
        status: item.status,
        is_trial: item.is_trial,
        student_name:
          `${item.students?.first_name ?? ""} ${
            item.students?.last_name ?? ""
          }`.trim() || "Student",
        class_name: buildClassName(item.classes, campusMapLocal),
      }));

    const currentEnrolmentMap = new Map<string, StudentEnrolment>();

    for (const enrolment of loadedEnrolments) {
      const existing = currentEnrolmentMap.get(enrolment.student_id);
      if (
        !existing ||
        enrolment.academic_year > existing.academic_year ||
        (enrolment.academic_year === existing.academic_year &&
          enrolment.term > existing.term)
      ) {
        currentEnrolmentMap.set(enrolment.student_id, enrolment);
      }
    }

    const loadedRecommendations: Recommendation[] = (
      recommendationResult.data ?? []
    )
      .map((item: any) => {
        const current = currentEnrolmentMap.get(item.student_id);
        const recommendedClass = classMapLocal.get(
          item.recommended_class_id
        );

        return {
          id: item.id,
          student_id: item.student_id,
          academic_year: item.academic_year,
          term: item.term,
          recommended_class_id: item.recommended_class_id,
          student_name:
            `${item.students?.first_name ?? ""} ${
              item.students?.last_name ?? ""
            }`.trim() || "Student",
          current_class_name: current?.class_name ?? "—",
          recommended_class_name: buildClassName(
            recommendedClass,
            campusMapLocal
          ),
        };
      });

    setCalendars(loadedCalendars);
    setCampuses(loadedCampuses);
    setClasses(loadedClasses);
    setEnrolments(loadedEnrolments);
    setRecommendations(loadedRecommendations);

    if (!form.academic_year && loadedCalendars.length > 0) {
      setForm((previous) => ({
        ...previous,
        academic_year: String(loadedCalendars[0].academic_year),
        term: String(loadedCalendars[0].term),
      }));
    }

    setLoading(false);
  }

  const campusMap = useMemo(
    () => new Map(campuses.map((item) => [item.id, item])),
    [campuses]
  );

  const classMap = useMemo(
    () => new Map(classes.map((item) => [item.id, item])),
    [classes]
  );

  const academicYearOptions = useMemo(() => {
    const years = new Set<number>();
    calendars.forEach((item) => years.add(item.academic_year));
    return Array.from(years).sort((a, b) => b - a);
  }, [calendars]);

  const termOptions = useMemo(() => {
    if (!form.academic_year) return [];

    return Array.from(
      new Set(
        calendars
          .filter(
            (item) => String(item.academic_year) === form.academic_year
          )
          .map((item) => item.term)
      )
    ).sort((a, b) => a - b);
  }, [calendars, form.academic_year]);

  const activeFormalStudents = useMemo(() => {
    const latestByStudent = new Map<string, StudentEnrolment>();

    for (const enrolment of enrolments) {
      const existing = latestByStudent.get(enrolment.student_id);

      if (
        !existing ||
        enrolment.academic_year > existing.academic_year ||
        (enrolment.academic_year === existing.academic_year &&
          enrolment.term > existing.term)
      ) {
        latestByStudent.set(enrolment.student_id, enrolment);
      }
    }

    return Array.from(latestByStudent.values()).sort((a, b) =>
      a.student_name.localeCompare(b.student_name)
    );
  }, [enrolments]);

  const selectedStudent = useMemo(
    () =>
      activeFormalStudents.find(
        (item) => item.student_id === form.student_id
      ) ?? null,
    [activeFormalStudents, form.student_id]
  );

  const targetClassOptions = useMemo(() => {
    const query = targetSearchTerm.trim().toLowerCase();

    return classes
      .filter((item) => item.status === "Active")
      .filter((item) => {
        if (!query) return true;

        const className = buildClassName(item, campusMap).toLowerCase();
        return (
          className.includes(query) ||
          (item.level ?? "").toLowerCase().includes(query) ||
          (item.class_suffix ?? "").toLowerCase().includes(query) ||
          (item.day ?? "").toLowerCase().includes(query)
        );
      })
      .sort((a, b) =>
        buildClassName(a, campusMap).localeCompare(
          buildClassName(b, campusMap)
        )
      );
  }, [classes, campusMap, targetSearchTerm]);

  const filteredStudents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return activeFormalStudents;

    return activeFormalStudents.filter(
      (item) =>
        item.student_name.toLowerCase().includes(query) ||
        item.class_name.toLowerCase().includes(query) ||
        String(item.academic_year).includes(query) ||
        String(item.term).includes(query)
    );
  }, [activeFormalStudents, searchTerm]);

  const filteredRecommendations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return recommendations.filter((item) => {
      if (!query) return true;

      return (
        item.student_name.toLowerCase().includes(query) ||
        item.current_class_name.toLowerCase().includes(query) ||
        item.recommended_class_name.toLowerCase().includes(query) ||
        String(item.academic_year).includes(query) ||
        `term ${item.term}`.includes(query)
      );
    });
  }, [recommendations, searchTerm]);

  function handleAcademicYearChange(value: string) {
    setForm((previous) => ({
      ...previous,
      academic_year: value,
      term: "",
    }));
  }

  function handleStudentChange(studentId: string) {
    const student = activeFormalStudents.find(
      (item) => item.student_id === studentId
    );

    setForm((previous) => ({
      ...previous,
      student_id: studentId,
      recommended_class_id: student?.class_id ?? "",
    }));

    setStudentPickerOpen(false);
  }

  function resetForm() {
    setForm((previous) => ({
      ...emptyForm,
      academic_year: previous.academic_year,
      term: previous.term,
    }));
    setEditingRecommendation(null);
    setSearchTerm("");
    setTargetSearchTerm("");
    setStudentPickerOpen(false);
    setTargetPickerOpen(false);
  }

  function validateForm(): string | null {
    if (!form.academic_year) return "Please select Academic Year.";
    if (!form.term) return "Please select Term.";
    if (!form.student_id) return "Please select a student.";
    if (!form.recommended_class_id)
      return "Please select a Recommended Class.";

    if (!selectedStudent) {
      return "The selected formal student is no longer available.";
    }

    const duplicate = recommendations.find(
      (item) =>
        item.id !== editingRecommendation?.id &&
        item.student_id === form.student_id &&
        item.academic_year === Number(form.academic_year) &&
        item.term === Number(form.term)
    );

    if (duplicate) {
      return "A recommendation already exists for this student and target term.";
    }

    return null;
  }

  async function handleSave() {
    if (saving) return;

    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "admin") {
      showPopup("Access Required", "Admin access is required.", "error");
      return;
    }

    const validation = validateForm();

    if (validation) {
      showPopup("Please Check the Form", validation, "error");
      return;
    }

    setSaving(true);

    try {
      const academicYear = Number(form.academic_year);
      const term = Number(form.term);

      if (editingRecommendation) {
        const { data, error } = await supabase
          .from("re_enrolment_recommendations")
          .update({
            academic_year: academicYear,
            term,
            recommended_class_id: form.recommended_class_id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingRecommendation.id)
          .select(`
            id,
            student_id,
            academic_year,
            term,
            recommended_class_id,
            students:student_id (
              first_name,
              last_name
            )
          `)
          .single();

        if (error) throw error;

        const current = activeFormalStudents.find(
          (item) => item.student_id === data.student_id
        );

        const updated: Recommendation = {
          id: data.id,
          student_id: data.student_id,
          academic_year: data.academic_year,
          term: data.term,
          recommended_class_id: data.recommended_class_id,
          student_name: current?.student_name || "Student",
          current_class_name: current?.class_name ?? "—",
          recommended_class_name: buildClassName(
            classMap.get(data.recommended_class_id),
            campusMap
          ),
        };

        setRecommendations((previous) =>
          previous.map((item) => (item.id === updated.id ? updated : item))
        );

        showPopup(
          "Updated Successfully",
          "The Re-enrolment recommendation has been updated.",
          "success"
        );
      } else {
        const { data, error } = await supabase
          .from("re_enrolment_recommendations")
          .insert({
            student_id: form.student_id,
            academic_year: academicYear,
            term,
            recommended_class_id: form.recommended_class_id,
          })
          .select(`
            id,
            student_id,
            academic_year,
            term,
            recommended_class_id,
            students:student_id (
              first_name,
              last_name
            )
          `)
          .single();

        if (error) throw error;

        const current = activeFormalStudents.find(
          (item) => item.student_id === data.student_id
        );

        const created: Recommendation = {
          id: data.id,
          student_id: data.student_id,
          academic_year: data.academic_year,
          term: data.term,
          recommended_class_id: data.recommended_class_id,
          student_name: current?.student_name || "Student",
          current_class_name: current?.class_name ?? "—",
          recommended_class_name: buildClassName(
            classMap.get(data.recommended_class_id),
            campusMap
          ),
        };

        setRecommendations((previous) => [created, ...previous]);

        showPopup(
          "Saved Successfully",
          "The Re-enrolment recommendation has been saved.",
          "success"
        );
      }

      resetForm();
    } catch (error: any) {
      console.error("RE-ENROLMENT RECOMMENDATION SAVE ERROR:", error);
      showPopup(
        "Save Failed",
        error?.message ?? "Unable to save the recommendation.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item: Recommendation) {
    setEditingRecommendation(item);

    setForm({
      academic_year: String(item.academic_year),
      term: String(item.term),
      student_id: item.student_id,
      recommended_class_id: item.recommended_class_id,
    });

    setTargetSearchTerm("");
    setStudentPickerOpen(false);
    setTargetPickerOpen(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEdit() {
    resetForm();
  }

  if (loading) {
    return <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8" />;
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="overflow-hidden rounded-2xl border border-[#D9E0E8] border-t-4 border-t-[#D4AF37] bg-white shadow-sm">
            <div className="p-8">
              <h1 className="text-2xl font-bold text-[#10213A]">
                Re-enrolment
              </h1>
              <p className="mt-4 text-sm text-red-600">{errorMessage}</p>
            </div>
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
            <h1 className="text-3xl font-bold tracking-tight text-[#F4F7FB] sm:text-4xl">
              Re-enrolment
            </h1>
            <p className="mt-2 text-sm text-[#C8D2DF]/70 sm:text-base">
              Manage recommended classes for the next term.
            </p>
          </header>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <section className="lg:col-span-1">
              <div className="overflow-hidden rounded-2xl border border-[#D9E0E8] border-t-4 border-t-[#D4AF37] bg-white shadow-sm">
                <div className="border-b border-[#D9E0E8] px-5 py-5 sm:px-6">
                  <h2 className="text-lg font-semibold text-[#10213A]">
                    {editingRecommendation
                      ? "Edit Recommendation"
                      : "New Recommendation"}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-[#64748B]">
                    Set the class recommended for a student in the selected
                    target term.
                  </p>
                </div>

                <div className="space-y-5 p-5 sm:p-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#10213A]">
                      Academic Year
                    </label>
                    <select
                      value={form.academic_year}
                      onChange={(e) =>
                        handleAcademicYearChange(e.target.value)
                      }
                      className="min-h-[48px] w-full rounded-xl border border-[#D9E0E8] bg-white px-4 text-sm text-[#10213A] outline-none transition-colors hover:border-[#B9C3D0] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                    >
                      <option value="">Select Academic Year</option>
                      {academicYearOptions.map((year) => (
                        <option key={year} value={String(year)}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#10213A]">
                      Target Term
                    </label>
                    <select
                      value={form.term}
                      onChange={(e) =>
                        setForm((previous) => ({
                          ...previous,
                          term: e.target.value,
                        }))
                      }
                      className="min-h-[48px] w-full rounded-xl border border-[#D9E0E8] bg-white px-4 text-sm text-[#10213A] outline-none transition-colors hover:border-[#B9C3D0] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                    >
                      <option value="">Select Term</option>
                      {termOptions.map((term) => (
                        <option key={term} value={String(term)}>
                          Term {term}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#10213A]">
                      Student
                    </label>

                    <button
                      type="button"
                      onClick={() => setStudentPickerOpen((previous) => !previous)}
                      className="flex min-h-[48px] w-full items-center justify-between rounded-xl border border-[#D9E0E8] bg-white px-4 text-left text-sm text-[#10213A] outline-none transition-colors hover:border-[#B9C3D0] focus:border-[#D4AF37]"
                    >
                      <span className="truncate">
                        {selectedStudent?.student_name ?? "Select Student"}
                      </span>
                      <span className="ml-3 shrink-0 text-[#64748B]">⌄</span>
                    </button>

                    {studentPickerOpen && (
                      <div className="mt-2 overflow-hidden rounded-xl border border-[#D9E0E8] bg-white shadow-lg">
                        <div className="border-b border-[#E5EAF0] p-3">
                          <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search student or class..."
                            className="min-h-[42px] w-full rounded-lg border border-[#D9E0E8] px-3 text-sm text-[#10213A] outline-none focus:border-[#D4AF37]"
                          />
                        </div>

                        <div className="max-h-64 overflow-y-auto">
                          {filteredStudents.length === 0 ? (
                            <p className="p-4 text-sm text-[#64748B]">
                              No students found.
                            </p>
                          ) : (
                            filteredStudents.map((item) => (
                              <button
                                key={item.student_id}
                                type="button"
                                onClick={() =>
                                  handleStudentChange(item.student_id)
                                }
                                className={`block w-full border-b border-[#F0F2F5] px-4 py-3 text-left last:border-b-0 hover:bg-[#FFFDF5] ${
                                  item.student_id === form.student_id
                                    ? "bg-[#FFF8DD]"
                                    : ""
                                }`}
                              >
                                <div className="text-sm font-semibold text-[#10213A]">
                                  {item.student_name}
                                </div>
                                <div className="mt-1 text-xs text-[#64748B]">
                                  Current Class: {item.class_name}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedStudent && (
                    <div className="rounded-xl border border-[#E4E9EF] bg-[#F8FAFC] p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A78312]">
                        Current Class
                      </div>
                      <div className="mt-1 text-sm font-semibold text-[#10213A]">
                        {selectedStudent.class_name}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#10213A]">
                      Recommended Class
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        setTargetPickerOpen((previous) => !previous)
                      }
                      className="flex min-h-[48px] w-full items-center justify-between rounded-xl border border-[#D9E0E8] bg-white px-4 text-left text-sm text-[#10213A] outline-none transition-colors hover:border-[#B9C3D0] focus:border-[#D4AF37]"
                    >
                      <span className="truncate">
                        {buildClassName(
                          classMap.get(form.recommended_class_id),
                          campusMap
                        ) || "Select Recommended Class"}
                        {form.recommended_class_id &&
                        classMap.get(form.recommended_class_id)?.start_time
                          ? ` | ${formatTime(
                              classMap.get(form.recommended_class_id)
                                ?.start_time ?? null
                            )}`
                          : ""}
                      </span>
                      <span className="ml-3 shrink-0 text-[#64748B]">
                        ⌄
                      </span>
                    </button>

                    {targetPickerOpen && (
                      <div className="mt-2 overflow-hidden rounded-xl border border-[#D9E0E8] bg-white shadow-lg">
                        <div className="border-b border-[#E5EAF0] p-3">
                          <input
                            autoFocus
                            value={targetSearchTerm}
                            onChange={(e) =>
                              setTargetSearchTerm(e.target.value)
                            }
                            placeholder="Search classes..."
                            className="min-h-[42px] w-full rounded-lg border border-[#D9E0E8] px-3 text-sm text-[#10213A] outline-none focus:border-[#D4AF37]"
                          />
                        </div>

                        <div className="max-h-64 overflow-y-auto">
                          {targetClassOptions.length === 0 ? (
                            <p className="p-4 text-sm text-[#64748B]">
                              No active classes found.
                            </p>
                          ) : (
                            targetClassOptions.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                  setForm((previous) => ({
                                    ...previous,
                                    recommended_class_id: item.id,
                                  }));
                                  setTargetSearchTerm("");
                                  setTargetPickerOpen(false);
                                }}
                                className={`block w-full border-b border-[#F0F2F5] px-4 py-3 text-left last:border-b-0 hover:bg-[#FFFDF5] ${
                                  item.id === form.recommended_class_id
                                    ? "bg-[#FFF8DD]"
                                    : ""
                                }`}
                              >
                                <div className="text-sm font-semibold text-[#10213A]">
                                  {buildClassName(item, campusMap)}
                                </div>
                                {item.start_time && (
                                  <div className="mt-1 text-xs text-[#64748B]">
                                    {formatTime(item.start_time)}
                                  </div>
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    <p className="mt-2 text-xs leading-5 text-[#64748B]">
                      The current class is used as the default recommendation.
                      Admin may change it before Parent submission.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => void handleSave()}
                      disabled={saving}
                      className="min-h-[48px] flex-1 rounded-xl bg-[#10213A] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1A3152] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving
                        ? "Saving..."
                        : editingRecommendation
                          ? "Update Recommendation"
                          : "Save Recommendation"}
                    </button>

                    {editingRecommendation && (
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={saving}
                        className="min-h-[48px] rounded-xl border border-[#D9E0E8] bg-white px-5 text-sm font-semibold text-[#10213A] transition-colors hover:bg-[#F8FAFC] disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="lg:col-span-2">
              <div className="overflow-hidden rounded-2xl border border-[#D9E0E8] border-t-4 border-t-[#D4AF37] bg-white shadow-sm">
                <div className="border-b border-[#D9E0E8] px-5 py-5 sm:px-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-[#10213A]">
                        Existing Recommendations
                      </h2>
                      <p className="mt-1 text-sm text-[#64748B]">
                        {recommendations.length} recommendation
                        {recommendations.length === 1 ? "" : "s"} saved.
                      </p>
                    </div>

                    <div className="w-full sm:max-w-sm">
                      <label className="sr-only">Search recommendations</label>
                      <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search student, class, year or term..."
                        className="min-h-[44px] w-full rounded-xl border border-[#D9E0E8] bg-white px-4 text-sm text-[#10213A] outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>
                </div>

                <div className="hidden max-h-[620px] overflow-x-hidden overflow-y-auto md:block">
                  <table className="w-full table-fixed text-left">
                    <thead className="sticky top-0 z-10 border-b border-[#E5EAF0] bg-[#F8FAFC]">
                      <tr className="text-[11px] uppercase tracking-[0.12em] text-[#64748B]">
                        <th className="w-[22%] px-3 py-4 font-semibold whitespace-nowrap">
                          Student
                        </th>
                        <th className="w-[14%] px-3 py-4 font-semibold whitespace-nowrap">
                          Target Term
                        </th>
                        <th className="w-[23%] px-3 py-4 font-semibold whitespace-nowrap">
                          Current Class
                        </th>
                        <th className="w-[28%] px-3 py-4 font-semibold whitespace-nowrap">
                          Recommended Class
                        </th>
                        <th className="w-[13%] px-3 py-4 text-right font-semibold whitespace-nowrap">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecommendations.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-5 py-10 text-center text-sm text-[#64748B]"
                          >
                            No recommendations found.
                          </td>
                        </tr>
                      ) : (
                        filteredRecommendations.map((item) => (
                          <tr
                            key={item.id}
                            className="border-b border-[#EEF1F5] last:border-b-0"
                          >
                            <td className="px-4 py-4">
                              <div
                                className="truncate whitespace-nowrap text-[13px] font-semibold text-[#10213A]"
                                title={item.student_name}
                              >
                                {item.student_name}
                              </div>
                            </td>
                            <td className="px-3 py-4 text-[13px] text-[#475569] whitespace-nowrap">
                              {item.academic_year} · Term {item.term}
                            </td>
                            <td
                              className="px-3 py-4 text-[13px] text-[#475569] whitespace-nowrap"
                              title={item.current_class_name}
                            >
                              <div className="truncate">
                                {item.current_class_name}
                              </div>
                            </td>
                            <td
                              className="px-3 py-4 text-[13px] font-medium text-[#10213A] whitespace-nowrap"
                              title={item.recommended_class_name}
                            >
                              <div className="truncate">
                                ⭐ {item.recommended_class_name}
                              </div>
                            </td>
                            <td className="px-3 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => startEdit(item)}
                                className="rounded-lg border border-[#D9E0E8] px-4 py-2 text-sm font-semibold text-[#10213A] hover:border-[#D4AF37] hover:bg-[#FFFDF5]"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="max-h-[620px] space-y-3 overflow-y-auto p-4 md:hidden">
                  {filteredRecommendations.length === 0 ? (
                    <div className="rounded-xl border border-[#E5EAF0] p-5 text-center text-sm text-[#64748B]">
                      No recommendations found.
                    </div>
                  ) : (
                    filteredRecommendations.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-[#E5EAF0] bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="text-base font-semibold text-[#10213A]">
                              {item.student_name}
                            </div>
                            <div className="mt-1 text-xs text-[#64748B]">
                              {item.academic_year} · Term {item.term}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            className="shrink-0 rounded-lg border border-[#D9E0E8] px-3 py-2 text-xs font-semibold text-[#10213A] hover:border-[#D4AF37]"
                          >
                            Edit
                          </button>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#A78312]">
                              Current Class
                            </div>
                            <div className="mt-1 text-sm text-[#475569]">
                              {item.current_class_name}
                            </div>
                          </div>

                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#A78312]">
                              Recommended Class
                            </div>
                            <div className="mt-1 text-sm font-semibold text-[#10213A]">
                              ⭐ {item.recommended_class_name}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {popup.open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07172B]/55 px-4 backdrop-blur-[2px]"
          onClick={closePopup}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reenrolment-popup-title"
            className="w-full max-w-[440px] overflow-hidden rounded-2xl border border-[#D9E0E8] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1 bg-[#D4AF37]" />

            <div className="p-6 sm:p-7">
              <div className="flex items-start gap-4">
                <div
                  className={
                    popup.type === "success"
                      ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700"
                      : popup.type === "error"
                        ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600"
                        : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#10213A]"
                  }
                >
                  {popup.type === "success"
                    ? "✓"
                    : popup.type === "error"
                      ? "!"
                      : "i"}
                </div>

                <div className="min-w-0 flex-1">
                  <h2
                    id="reenrolment-popup-title"
                    className="text-lg font-semibold text-[#10213A]"
                  >
                    {popup.title}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#64748B]">
                    {popup.message}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={closePopup}
                  autoFocus
                  className="min-h-[44px] min-w-[88px] rounded-xl bg-[#10213A] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1A3154] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
