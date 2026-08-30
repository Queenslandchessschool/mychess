"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * ============================================================
 * MyCHESS — Parent Portal — MyFAMILY v1.0
 * ============================================================
 *
 * Frozen architecture:
 *
 * Authenticated Parent
 *        ↓
 * Parent Email
 *        ↓
 * Family ID
 *        ↓
 * Family Children
 *        ↓
 * Student Master
 *        +
 * Current Enrolment
 *        +
 * Current Class / Campus
 *
 * Student Master = long-term student information
 * Current Enrolment = current-term operational information
 *
 * MyFAMILY does NOT display:
 * - Current Level
 * - Status
 * - Student Stage
 * - Notes
 *
 * Parent-editable Student Master fields:
 * - First Name
 * - Last Name
 * - Preferred Name
 * - Gender
 * - Date of Birth
 * - School
 *
 * Display-only:
 * - School Class
 * - Chess Campus
 * - Current Chess Class
 *
 * School Class:
 * - Only displayed for School Program students
 * - Read from current Enrolment
 * - Parent cannot edit
 *
 * Updates:
 * Old value → New value
 * ↓
 * Confirmation Modal
 * ↓
 * Student Master update
 *
 * ============================================================
 */

type Student = {
  id: string;
  first_name: string | null;
  preferred_name: string | null;
  last_name: string | null;

  gender: string | null;
  date_of_birth: string | null;
  school: string | null;
  school_class: string | null;

  is_school_program: boolean | null;
};

type Enrollment = {
  id: string;
  student_id: string;

  class_id: string | null;

  academic_year: number | string | null;
  term: number | string | null;

  status: string | null;

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
      }
    | {
        campus_code: string | null;
        short_name: string | null;
        campus_name: string | null;
      }[]
    | null;
};

type FamilyStudent = {
  student: Student;
  enrollment: Enrollment | null;
  classInfo: ClassInfo | null;
};

type EditableStudent = {
  first_name: string;
  last_name: string;
  preferred_name: string;
  gender: string;
  date_of_birth: string;
  school: string;
};

type EditableField =
  | "first_name"
  | "last_name"
  | "preferred_name"
  | "gender"
  | "date_of_birth"
  | "school";

const EDITABLE_FIELDS: {
  key: EditableField;
  label: string;
}[] = [
  {
    key: "first_name",
    label: "First Name",
  },
  {
    key: "last_name",
    label: "Last Name",
  },
  {
    key: "preferred_name",
    label: "Preferred Name",
  },
  {
    key: "gender",
    label: "Gender",
  },
  {
    key: "date_of_birth",
    label: "Date of Birth",
  },
  {
    key: "school",
    label: "School",
  },
];

function emptyEditableStudent(): EditableStudent {
  return {
    first_name: "",
    last_name: "",
    preferred_name: "",
    gender: "",
    date_of_birth: "",
    school: "",
  };
}

function displayValue(
  value: string | number | null | undefined
): string {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return "—";
  }

  return String(value);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const parts = value.split("-");

  if (parts.length !== 3) {
    return value;
  }

  const [year, month, day] = parts;

  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStudentDisplayName(
  student: Student
): string {
  const preferred =
    student.preferred_name?.trim();

  const first =
    student.first_name?.trim();

  const last =
    student.last_name?.trim();

  return `${preferred || first || ""} ${last || ""}`.trim();
}

function getClassDisplayName(
  classInfo: ClassInfo | null
): string {
  if (!classInfo) {
    return "—";
  }

  const level =
    classInfo.level?.trim() ?? "";

  const suffix =
    classInfo.class_suffix?.trim() ?? "";

  if (level && suffix) {
    return `${level} ${suffix}`;
  }

  return level || suffix || "—";
}

function getCampusDisplayName(
  classInfo: ClassInfo | null
): string {
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

export default function ParentFamilyPage() {
  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const [familyStudents, setFamilyStudents] =
    useState<FamilyStudent[]>([]);

  const [editingStudent, setEditingStudent] =
    useState<FamilyStudent | null>(null);

  const [originalEdit, setOriginalEdit] =
    useState<EditableStudent>(
      emptyEditableStudent()
    );

  const [editForm, setEditForm] =
    useState<EditableStudent>(
      emptyEditableStudent()
    );

  const [showConfirm, setShowConfirm] =
    useState(false);

  /**
   * ==========================================================
   * Load Family
   * ==========================================================
   */

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
        data: {
          user,
        },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error(
          "You must be signed in to access MyFAMILY."
        );
      }

      const email =
        user.email?.trim().toLowerCase();

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
       * Same Family Scope architecture already used
       * successfully by Parent Leave.
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

      if (
        !parentRecords ||
        parentRecords.length === 0
      ) {
        throw new Error(
          "No Parent record is linked to this account."
        );
      }

      const resolvedFamilyId =
        parentRecords.find(
          (row) => row.family_id
        )?.family_id ?? null;

      if (!resolvedFamilyId) {
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
        .eq(
          "family_id",
          resolvedFamilyId
        );

      if (familyError) {
        throw familyError;
      }

      const studentIds =
        Array.from(
          new Set(
            (familyParents ?? [])
              .map(
                (row) =>
                  row.student_id
              )
              .filter(Boolean)
          )
        );

      if (studentIds.length === 0) {
        setFamilyStudents([]);
        return;
      }

      /**
       * ------------------------------------------------------
       * 4. Student Master
       * ------------------------------------------------------
       *
       * Only fields required by MyFAMILY are loaded.
       *
       * We deliberately do NOT expose:
       * - status
       * - student_stage
       * - notes
       * - current_level
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
          gender,
          date_of_birth,
          school,
          school_class,
          is_school_program
        `)
        .in(
          "id",
          studentIds
        )
        .order(
          "student_code"
        );

      if (studentError) {
        throw studentError;
      }

      const students =
        (studentData ?? []) as Student[];

      /**
       * ------------------------------------------------------
       * 5. Current Enrolment
       * ------------------------------------------------------
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
          status
        `)
        .in(
          "student_id",
          studentIds
        )
        .eq(
          "status",
          "Active"
        );

      if (enrollmentError) {
        throw enrollmentError;
      }

      const enrollments =
        (enrollmentData ?? []) as Enrollment[];

      /**
       * ------------------------------------------------------
       * 6. Current Class / Campus
       * ------------------------------------------------------
       *
       * Class Master is joined in real time.
       *
       * This means a class level / suffix / campus change
       * is reflected automatically here.
       */

      const classIds =
        Array.from(
          new Set(
            enrollments
              .map(
                (item) =>
                  item.class_id
              )
              .filter(Boolean)
          )
        ) as string[];

      let classMap =
        new Map<string, ClassInfo>();

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
              campus_name
            )
          `)
          .in(
            "id",
            classIds
          );

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

      const result =
        students.map(
          (student) => {
            const enrollment =
              enrollments.find(
                (item) =>
                  item.student_id ===
                  student.id
              ) ?? null;

            const classInfo =
              enrollment?.class_id
                ? classMap.get(
                    enrollment.class_id
                  ) ?? null
                : null;

            return {
              student,
              enrollment,
              classInfo,
            };
          }
        );

      setFamilyStudents(result);
    } catch (loadError: any) {
      console.error(
        "MYFAMILY LOAD ERROR:",
        loadError
      );

      setError(
        loadError?.message ??
          "Unable to load MyFAMILY."
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * ==========================================================
   * Initial Load
   * ==========================================================
   */

  useEffect(() => {
    loadFamily();
  }, []);

  /**
   * ==========================================================
   * Edit
   * ==========================================================
   */

  function startEdit(
    item: FamilyStudent
  ) {
    const original: EditableStudent = {
      first_name:
        item.student.first_name ?? "",

      last_name:
        item.student.last_name ?? "",

      preferred_name:
        item.student.preferred_name ?? "",

      gender:
        item.student.gender ?? "",

      date_of_birth:
        item.student.date_of_birth ?? "",

      school:
        item.student.school ?? "",
    };

    setEditingStudent(item);
    setOriginalEdit(original);
    setEditForm(original);

    setError(null);
    setSuccess(null);
  }

  function cancelEdit() {
    if (saving) {
      return;
    }

    setEditingStudent(null);
    setOriginalEdit(
      emptyEditableStudent()
    );
    setEditForm(
      emptyEditableStudent()
    );
  }

  /**
   * ==========================================================
   * Check Changes
   * ==========================================================
   */

  const changedFields =
    useMemo(() => {
      return EDITABLE_FIELDS.filter(
        ({ key }) =>
          originalEdit[key] !==
          editForm[key]
      );
    }, [
      originalEdit,
      editForm,
    ]);

  /**
   * ==========================================================
   * Open Confirmation
   * ==========================================================
   */

  function requestSave() {
    setError(null);
    setSuccess(null);

    if (!editingStudent) {
      return;
    }

    if (changedFields.length === 0) {
      return;
    }

    setShowConfirm(true);
  }

  /**
   * ==========================================================
   * Confirm Student Master Update
   * ==========================================================
   */

  async function confirmSave() {
    if (
      !editingStudent ||
      changedFields.length === 0
    ) {
      setShowConfirm(false);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const {
        error: updateError,
      } = await supabase
        .from("students")
        .update({
          first_name:
            editForm.first_name.trim(),

          last_name:
            editForm.last_name.trim(),

          preferred_name:
            editForm.preferred_name.trim() ||
            null,

          gender:
            editForm.gender.trim() ||
            null,

          date_of_birth:
            editForm.date_of_birth ||
            null,

          school:
            editForm.school.trim() ||
            null,
        })
        .eq(
          "id",
          editingStudent.student.id
        );

      if (updateError) {
        throw updateError;
      }

      setShowConfirm(false);
      setEditingStudent(null);

      setOriginalEdit(
        emptyEditableStudent()
      );

      setEditForm(
        emptyEditableStudent()
      );

      setSuccess(
        "Student information updated successfully."
      );

      await loadFamily();
    } catch (saveError: any) {
      console.error(
        "MYFAMILY UPDATE ERROR:",
        saveError
      );

      setError(
        saveError?.message ??
          "Unable to update student information."
      );
    } finally {
      setSaving(false);
    }
  }

if (loading) {
  return <main className="min-h-screen" />;
}

  /**
   * ==========================================================
   * Page
   * ==========================================================
   */

  return (
    <>
      <main className="min-h-screen text-[#10213A]">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">

          {/* ==================================================
              Header
          ================================================== */}

          <div className="mb-8">
            <div className="h-1" />

            <h1 className="text-3xl font-semibold tracking-tight text-[#F4F7FB] sm:text-4xl">
              MyFAMILY
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#64748B] sm:text-base">
  View and update my{" "}
  {familyStudents.length === 1 ? "child's" : "children's"}{" "}
  information.
</p>
          </div>

          {/* ==================================================
              Messages
          ================================================== */}

          {error && (
            <div className="mb-6 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-4 text-sm text-red-200">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-200">
              {success}
            </div>
          )}

          {/* ==================================================
              No Children
          ================================================== */}

          {familyStudents.length === 0 && (
            <section className="overflow-hidden rounded-2xl border border-[#D9E3ED] bg-[#FFFDF8] text-[#10213A] shadow-2xl shadow-black/20">
              <div
                aria-hidden="true"
                className="
                  h-[6px]
                  bg-gradient-to-r
                  from-[#F7D968]
                  via-[#D4AF37]/75
                  to-transparent
                "
              />

              <div className="p-8">
                <h2 className="text-xl font-semibold">
                  No children found
                </h2>

                <p className="mt-2 text-sm text-[#64748B]">
                  No students are currently linked
                  to this Family.
                </p>
              </div>
            </section>
          )}

          {/* ==================================================
              Family Children
          ================================================== */}

          {familyStudents.length > 0 && (
            <div className="space-y-6">

              {familyStudents.map(
                (item, index) => {
                  const {
                    student,
                    enrollment,
                    classInfo,
                  } = item;

                  const studentName =
                    getStudentDisplayName(
                      student
                    );

                  return (
                    <section
                      key={student.id}
                      className="
                        relative
                        overflow-hidden
                        rounded-2xl
                        border
                        border-[#D9E3ED]
                        bg-[#FFFDF8]
                        text-[#10213A]
                        shadow-2xl shadow-black/20
                      "
                    >

                      {/* Gold tapered top line */}

                      <div
                        aria-hidden="true"
                        className="
                          pointer-events-none
                          absolute
                          left-0
                          right-0
                          top-0
                          h-[6px]
                          bg-gradient-to-r
                          from-[#F7D968]
                          via-[#D4AF37]/75
                          to-transparent
                          [clip-path:polygon(0_0,100%_42%,100%_58%,0_100%)]
                        "
                      />

                      {/* ==================================================
                          Card Header
                      ================================================== */}

                      <div className="border-b border-[#D9E3ED] px-5 py-5 sm:px-7">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                          <div>
                            <div className="flex flex-wrap items-center gap-3">

                              <h2 className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
  <span className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#D4AF37]">
    {familyStudents.length === 1
      ? "CHILD"
      : `CHILD ${index + 1}`}
  </span>

  <span className="text-[20px] font-semibold text-[#10213A]">
    : {studentName || "Student"}
  </span>
</h2>

                            </div>

                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              startEdit(item)
                            }
                            className="
                              rounded-xl
                              border
                              border-[#D4AF37]
                              bg-transparent
                              px-5
                              py-2.5
                              text-sm
                              font-medium
                              text-[#8F6B18]
                              transition
                              hover:bg-[#F4D35E]/10
                            "
                          >
                            Edit
                          </button>

                        </div>
                      </div>

                      {/* ==================================================
                          Student Information
                      ================================================== */}

                      <div className="grid grid-cols-1 gap-x-8 gap-y-6 px-5 py-6 sm:grid-cols-2 sm:px-7 lg:grid-cols-3">

                        <InfoField
                          label="First Name"
                          value={
                            displayValue(
                              student.first_name
                            )
                          }
                        />

                        <InfoField
                          label="Last Name"
                          value={
                            displayValue(
                              student.last_name
                            )
                          }
                        />

                        <InfoField
                          label="Preferred Name"
                          value={
                            displayValue(
                              student.preferred_name
                            )
                          }
                        />

                        <InfoField
                          label="Gender"
                          value={
                            displayValue(
                              student.gender
                            )
                          }
                        />

                        <InfoField
                          label="Date of Birth"
                          value={
                            formatDate(
                              student.date_of_birth
                            )
                          }
                        />

                        <InfoField
                          label="School"
                          value={
                            displayValue(
                              student.school
                            )
                          }
                        />

                        {/* School Class only for School Program */}

                        {student.is_school_program && (
                          <InfoField
                            label="School Class"
                            value={
                              displayValue(
                                student.school_class
                              )
                            }
                            note="Managed by Admin"
                          />
                        )}

                        {/* Chess Campus */}

                        <InfoField
                          label="Chess Campus"
                          value={
                            getCampusDisplayName(
                              classInfo
                            )
                          }
                        />

                      </div>

                      {/* ==================================================
                          Current Class Summary
                      ================================================== */}

                      <div className="border-t border-[#D9E3ED] bg-[#F5F9FD] px-5 py-4 sm:px-7">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748B]">
                              Current Chess Class
                            </p>

                            <p className="mt-1 text-sm font-medium text-[#10213A]">
                              {getClassDisplayName(
                                classInfo
                              )}
                            </p>
                          </div>

                          <div className="text-sm text-[#64748B]">
                            {classInfo?.day
                              ? `${classInfo.day} · `
                              : ""}
                            {classInfo?.start_time
                              ? classInfo.start_time.slice(
                                  0,
                                  5
                                )
                              : ""}
                            {classInfo?.end_time
                              ? ` – ${classInfo.end_time.slice(
                                  0,
                                  5
                                )}`
                              : ""}
                          </div>

                        </div>
                      </div>

                    </section>
                  );
                }
              )}

            </div>
          )}

        </div>
      </main>

      {/* ======================================================
          Edit Student Information Modal
          Old value → New value confirmation follows this form.
      ====================================================== */}

      {editingStudent && !showConfirm && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#011029]/75 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-student-information-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto overflow-hidden rounded-2xl border border-[#D9E3ED] bg-[#FFFDF8] text-[#10213A] shadow-2xl">
            <div aria-hidden="true" className="h-[6px] bg-gradient-to-r from-[#F7D968] via-[#D4AF37]/75 to-transparent" />

            <div className="p-6 sm:p-8">
              <div className="mb-6">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#D4AF37]">
                  Edit Student Information
                </div>
                <h2 id="edit-student-information-title" className="mt-2 text-2xl font-semibold text-[#10213A]">
                  {getStudentDisplayName(editingStudent.student)}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#64748B]">
                  Update the information below. Your changes will be reviewed before they are saved to Student Master.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <EditField label="First Name" value={editForm.first_name} required onChange={(value) => setEditForm((current) => ({ ...current, first_name: value }))} />
                <EditField label="Last Name" value={editForm.last_name} required onChange={(value) => setEditForm((current) => ({ ...current, last_name: value }))} />
                <EditField label="Preferred Name" value={editForm.preferred_name} onChange={(value) => setEditForm((current) => ({ ...current, preferred_name: value }))} />
                <EditField label="Gender" value={editForm.gender} onChange={(value) => setEditForm((current) => ({ ...current, gender: value }))} />
                <EditField label="Date of Birth" type="date" value={editForm.date_of_birth} onChange={(value) => setEditForm((current) => ({ ...current, date_of_birth: value }))} />
                <EditField label="School" value={editForm.school} onChange={(value) => setEditForm((current) => ({ ...current, school: value }))} />
              </div>

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" disabled={saving} onClick={cancelEdit} className="rounded-xl border border-[#D9E3ED] bg-transparent px-5 py-3 text-sm font-medium text-[#64748B] transition hover:bg-[#F5F9FD] hover:text-[#10213A] disabled:cursor-not-allowed disabled:opacity-50">
                  Cancel
                </button>
                <button type="button" disabled={saving || changedFields.length === 0} onClick={requestSave} className="rounded-xl border border-[#D4AF37] bg-[#D4AF37] px-6 py-3 text-sm font-semibold text-[#10213A] shadow-sm transition hover:bg-[#F4D35E] disabled:cursor-not-allowed disabled:opacity-50">
                  Review Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          Confirmation Modal
      ====================================================== */}

      {showConfirm &&
        editingStudent && (
          <div
            className="
              fixed
              inset-0
              z-[100]
              flex
              items-center
              justify-center
              bg-[#011029]/75
              px-4
              backdrop-blur-sm
            "
          >
            <div
              className="
                w-full
                max-w-2xl
                overflow-hidden
                rounded-2xl
                border
                border-[#D9E3ED]
                bg-[#FFFDF8]
                text-[#10213A]
                shadow-2xl
              "
            >

              {/* Gold line */}

              <div
                aria-hidden="true"
                className="
                  h-[6px]
                  bg-gradient-to-r
                  from-[#F7D968]
                  via-[#D4AF37]/75
                  to-transparent
                "
              />

              <div className="p-6 sm:p-8">

                <div className="mb-6">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A78312]">
                    Confirm Update
                  </div>

                  <h2 className="mt-2 text-2xl font-semibold">
                    Update Student Information?
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#64748B]">
                    Are you sure you want to update
                    the following information?
                  </p>
                </div>

                {/* Old → New */}

                <div className="space-y-3">
                  {changedFields.map(
                    ({ key, label }) => (
                      <div
                        key={key}
                        className="
                          rounded-xl
                          border
                          border-white/10
                          bg-[#F5F9FD]
                          p-4
                        "
                      >
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                          {label}
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">

                          <div>
                            <div className="text-[10px] uppercase tracking-[0.12em] text-[#64748B]">
                              Current
                            </div>

                            <div className="mt-1 text-sm text-[#64748B]">
                              {key === "date_of_birth"
                                ? formatDate(
                                    originalEdit[
                                      key
                                    ]
                                  )
                                : displayValue(
                                    originalEdit[
                                      key
                                    ]
                                  )}
                            </div>
                          </div>

                          <div className="hidden text-[#D4AF37] sm:block">
                            →
                          </div>

                          <div>
                            <div className="text-[10px] uppercase tracking-[0.12em] text-[#A78312]">
                              New
                            </div>

                            <div className="mt-1 text-sm font-medium text-[#10213A]">
                              {key === "date_of_birth"
                                ? formatDate(
                                    editForm[key]
                                  )
                                : displayValue(
                                    editForm[key]
                                  )}
                            </div>
                          </div>

                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* Actions */}

                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      setShowConfirm(false)
                    }
                    className="
                      rounded-xl
                      border
                      border-white/15
                      bg-transparent
                      px-5
                      py-3
                      text-sm
                      font-medium
                      text-[#64748B]
                      transition
                      hover:bg-[#F5F9FD]
                      hover:text-[#10213A]
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                  >
                    Back to Edit
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={confirmSave}
                    className="
                      rounded-xl
                      border
                      border-[#D4AF37]
                      bg-[#D4AF37]
                      px-6
                      py-3
                      text-sm
                      font-semibold
                      text-[#10213A]
                      shadow-sm
                      transition
                      hover:bg-[#F4D35E]
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                  >
                    {saving
                      ? "Updating..."
                      : "Confirm Update"}
                  </button>

                </div>

              </div>
            </div>
          </div>
        )}
    </>
  );
}

/**
 * ============================================================
 * Info Field
 * ============================================================
 */

function EditField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date";
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">
        {label}
        {required && <span className="ml-1 text-[#F7D968]">*</span>}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-white/15 bg-[#F5F9FD] px-4 py-3 text-sm text-[#10213A] outline-none transition placeholder:text-[#C8D2DF]/30 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50"
      />
    </label>
  );
}

function InfoField({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">
        {label}
      </div>

      <div className="mt-1 text-sm font-medium text-[#10213A]">
        {value}
      </div>

      {note && (
        <div className="mt-1 text-[11px] text-[#64748B]">
          {note}
        </div>
      )}
    </div>
  );
}