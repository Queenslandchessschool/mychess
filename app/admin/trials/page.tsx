"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * ============================================================
 * Types
 * ============================================================
 */

type TrialStudent = {
  enrollment_id: string;
  student_id: string;
  student_code: string;
  first_name: string;
  preferred_name: string;
  last_name: string;

  class_id: string;
  class_day: string;
  class_suffix: string;
  class_level: string;
  campus_name: string;

  academic_year: number;
  term: number;
  join_date: string | null;

  attendance_id: string | null;
  attendance_status: string | null;
  lesson_date: string | null;

  feedback_status: "Y" | "N" | "—";
};

/**
 * ============================================================
 * Helpers
 * ============================================================
 */

function getDisplayedStudentName(student: {
  first_name?: string | null;
  preferred_name?: string | null;
  last_name?: string | null;
}) {
  return `${student.first_name ?? ""}${
    student.preferred_name?.trim()
      ? ` (${student.preferred_name.trim()})`
      : ""
  } ${student.last_name ?? ""}`.trim();
}

function formatDate(date: string | null) {
  if (!date) return "—";

  const parts = date.split("-");

  if (parts.length !== 3) {
    return date;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getClassLabel(student: TrialStudent) {
  const parts = [
    student.campus_name,
    student.class_day,
    student.class_suffix,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" | ") : "—";
}

/**
 * ============================================================
 * Page
 * ============================================================
 */

export default function TrialManagementPage() {
  const currentYear = new Date().getFullYear();

  const [academicYear, setAcademicYear] =
    useState<number>(currentYear);

  const [term, setTerm] = useState<number>(3);

  const [students, setStudents] = useState<TrialStudent[]>([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  /**
   * ==========================================================
   * Load Trial Students
   * ==========================================================
   */

  async function loadTrialStudents() {
    setLoading(true);
    setError("");

    try {
      /**
       * ------------------------------------------------------
       * 1. Active Trial Enrolments
       * ------------------------------------------------------
       */

      const {
        data: enrolments,
        error: enrolmentError,
      } = await supabase
        .from("student_enrolments")
        .select(`
          id,
          student_id,
          academic_year,
          term,
          join_date,
          class_id,
          is_trial,
          status,

          students:student_id (
            id,
            student_code,
            first_name,
            preferred_name,
            last_name
          ),

          classes:class_id (
            id,
            day,
            class_suffix,
            level,

            campuses:campus_id (
              campus_name
            )
          )
        `)
        .eq("academic_year", academicYear)
        .eq("term", term)
        .eq("is_trial", true)
        .eq("status", "Active")
        .order("join_date", {
          ascending: true,
        });

      if (enrolmentError) {
        throw enrolmentError;
      }

      if (!enrolments || enrolments.length === 0) {
        setStudents([]);
        return;
      }

      /**
       * ------------------------------------------------------
       * 2. Collect Student IDs
       * ------------------------------------------------------
       */

      const studentIds = enrolments
        .map((row: any) => row.student_id)
        .filter(Boolean);

      /**
       * ------------------------------------------------------
       * 3. Load Attendance
       *
       * Attendance remains the source of truth for whether
       * the Trial actually happened.
       * ------------------------------------------------------
       */

      const {
        data: attendanceRows,
        error: attendanceError,
      } = await supabase
        .from("attendance")
        .select(`
          id,
          student_id,
          attendance_status,
          lesson_id,

          lessons:lesson_id (
            id,
            lesson_date,
            class_id,
            academic_year,
            term
          )
        `)
        .in("student_id", studentIds);

      if (attendanceError) {
        throw attendanceError;
      }

      /**
       * ------------------------------------------------------
       * 4. Match Attendance to Trial Enrollment
       *
       * We only use attendance belonging to the same:
       *
       * Student
       * Class
       * Academic Year
       * Term
       * ------------------------------------------------------
       */

      const matchingAttendance = new Map<
        string,
        any
      >();

      for (const attendance of attendanceRows ?? []) {
  const lesson = attendance.lessons as any;

  if (!lesson) continue;

  const key = [
    attendance.student_id,
    lesson.class_id,
    lesson.academic_year,
    lesson.term,
  ].join("|");

  const existing =
    matchingAttendance.get(key);

  const existingLesson =
    existing?.lessons as any;

  if (
    !existing ||
    String(
      lesson.lesson_date ?? ""
    ) >
      String(
        existingLesson?.lesson_date ?? ""
      )
  ) {
    matchingAttendance.set(
      key,
      attendance
    );
  }
}

      /**
       * ------------------------------------------------------
       * 5. Load Trial Feedback
       *
       * One Trial Attendance → one Trial Feedback.
       * ------------------------------------------------------
       */

      const attendanceIds = (
        attendanceRows ?? []
      )
        .map((row: any) => row.id)
        .filter(Boolean);

      let feedbackAttendanceIds =
        new Set<string>();

      if (attendanceIds.length > 0) {
        const {
          data: feedbackRows,
          error: feedbackError,
        } = await supabase
          .from("trial_feedback")
          .select("attendance_id")
          .in(
            "attendance_id",
            attendanceIds
          );

        if (feedbackError) {
          throw feedbackError;
        }

        feedbackAttendanceIds =
          new Set(
            (feedbackRows ?? [])
              .map(
                (row: any) =>
                  row.attendance_id
              )
              .filter(Boolean)
          );
      }

      /**
       * ------------------------------------------------------
       * 6. Build Trial Management List
       * ------------------------------------------------------
       */

      const result: TrialStudent[] =
        enrolments.map((enrollment: any) => {
          const student =
            enrollment.students ?? {};

          const classData =
            enrollment.classes ?? {};

          const campus =
            classData.campuses ?? {};

          const key = [
            enrollment.student_id,
            enrollment.class_id,
            enrollment.academic_year,
            enrollment.term,
          ].join("|");

          const attendance =
            matchingAttendance.get(key);

          let feedbackStatus:
            | "Y"
            | "N"
            | "—" = "—";

          if (attendance) {
            if (
              attendance.attendance_status ===
              "Present"
            ) {
              feedbackStatus =
                feedbackAttendanceIds.has(
                  attendance.id
                )
                  ? "Y"
                  : "N";
            } else {
              /**
               * Absent / Leave / other non-Present
               * does not require Trial Feedback.
               */
              feedbackStatus = "—";
            }
          }

          return {
            enrollment_id:
              enrollment.id,

            student_id:
              enrollment.student_id,

            student_code:
              student.student_code ?? "",

            first_name:
              student.first_name ?? "",

            preferred_name:
              student.preferred_name ?? "",

            last_name:
              student.last_name ?? "",

            class_id:
              enrollment.class_id,

            class_day:
              classData.day ?? "",

            class_suffix:
              classData.class_suffix ?? "",

            class_level:
              classData.level ?? "",

            campus_name:
              campus.campus_name ?? "",

            academic_year:
              enrollment.academic_year,

            term:
              enrollment.term,

            join_date:
              enrollment.join_date ?? null,

            attendance_id:
              attendance?.id ?? null,

            attendance_status:
              attendance?.attendance_status ??
              null,

            lesson_date:
  (attendance?.lessons as any)
    ?.lesson_date ?? null,

            feedback_status:
              feedbackStatus,
          };
        });

      setStudents(result);
    } catch (err: any) {
      console.error(
        "TRIAL MANAGEMENT LOAD ERROR:",
        err
      );

      setError(
        err?.message ??
          "Unable to load Trial students."
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * ==========================================================
   * Initial Load / Filter Reload
   * ==========================================================
   */

  useEffect(() => {
    loadTrialStudents();
  }, [academicYear, term]);

  /**
   * ==========================================================
   * Search
   * ==========================================================
   */

  const filteredStudents =
    useMemo(() => {
      const keyword =
        search.trim().toLowerCase();

      if (!keyword) {
        return students;
      }

      return students.filter(
        (student) => {
          const name =
            getDisplayedStudentName(
              student
            ).toLowerCase();

          const code =
            student.student_code.toLowerCase();

          const schoolClass =
            getClassLabel(
              student
            ).toLowerCase();

          return (
            name.includes(keyword) ||
            code.includes(keyword) ||
            schoolClass.includes(keyword)
          );
        }
      );
    }, [students, search]);

  /**
   * ==========================================================
   * Summary
   * ==========================================================
   */

  const feedbackRequired =
    students.filter(
      (student) =>
        student.feedback_status === "N"
    ).length;

  const feedbackCompleted =
    students.filter(
      (student) =>
        student.feedback_status === "Y"
    ).length;

  /**
   * ==========================================================
   * Render
   * ==========================================================
   */

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1500px]">
        {/* ================================================== */}
        {/* PAGE HEADER                                        */}
        {/* ================================================== */}

        <header className="mb-6">
          <p
            className="
              mb-2
              text-[11px]
              font-semibold
              uppercase
              tracking-[0.24em]
              text-[#D4AF37]
              sm:text-xs
            "
          >
            OPERATIONS
          </p>

          <div
            className="
              flex
              flex-col
              gap-4
              sm:flex-row
              sm:items-end
              sm:justify-between
            "
          >
            <div>
              <h1
                className="
                  text-2xl
                  font-bold
                  tracking-tight
                  text-[#F7F9FC]
                  sm:text-3xl
                  lg:text-4xl
                "
              >
                Trial Management
              </h1>

              <p
                className="
                  mt-2
                  max-w-2xl
                  text-sm
                  leading-6
                  text-[#B8C6D8]
                  sm:text-base
                "
              >
                Manage active Trial students,
                attendance and Trial Feedback.
              </p>

              <div
                className="
                  mt-4
                  h-[2px]
                  w-16
                  bg-gradient-to-r
                  from-[#D4AF37]
                  to-[#F4D35E]
                "
              />
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={loadTrialStudents}
              disabled={loading}
              className="
                inline-flex
                items-center
                justify-center
                rounded-xl
                border
                border-[#D4AF37]/45
                bg-[#FFFDF8]
                px-4
                py-2.5
                text-sm
                font-semibold
                text-[#10213A]
                shadow-sm
                transition
                hover:border-[#D4AF37]
                hover:bg-[#FFF8E7]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              ↻ Refresh
            </button>
          </div>
        </header>

        {/* ================================================== */}
        {/* SUMMARY CARDS                                      */}
        {/* ================================================== */}

        <section
          className="
            mb-6
            grid
            grid-cols-1
            gap-3
            sm:grid-cols-3
          "
        >
          <SummaryCard
            label="Active Trials"
            value={students.length}
          />

          <SummaryCard
            label="Feedback Pending"
            value={feedbackRequired}
            accent={
              feedbackRequired > 0
                ? "gold"
                : "normal"
            }
          />

          <SummaryCard
            label="Feedback Completed"
            value={feedbackCompleted}
            accent="green"
          />
        </section>

        {/* ================================================== */}
        {/* FILTER BAR                                         */}
        {/* ================================================== */}

        <section
          className="
            mb-6
            rounded-2xl
            border
            border-[#D4AF37]/35
            bg-[#102B4D]
            p-3
            shadow-sm
            sm:p-4
          "
        >
          <div
            className="
              grid
              grid-cols-1
              gap-3
              md:grid-cols-[1fr_150px_130px]
            "
          >
            {/* Search */}

            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search by name, code or class..."
                className="
                  h-11
                  w-full
                  rounded-xl
                  border
                  border-[#D9E3ED]
                  bg-[#FFFDF8]
                  px-4
                  text-sm
                  text-[#10213A]
                  outline-none
                  placeholder:text-[#94A3B8]
                  focus:border-[#D4AF37]
                  focus:ring-2
                  focus:ring-[#D4AF37]/15
                "
              />
            </div>

            {/* Academic Year */}

            <select
              value={academicYear}
              onChange={(e) =>
                setAcademicYear(
                  Number(e.target.value)
                )
              }
              className="
                h-11
                rounded-xl
                border
                border-[#D9E3ED]
                bg-[#FFFDF8]
                px-3
                text-sm
                text-[#10213A]
                outline-none
                focus:border-[#D4AF37]
              "
            >
              <option value={currentYear}>
                {currentYear}
              </option>

              <option
                value={currentYear - 1}
              >
                {currentYear - 1}
              </option>
            </select>

            {/* Term */}

            <select
              value={term}
              onChange={(e) =>
                setTerm(
                  Number(e.target.value)
                )
              }
              className="
                h-11
                rounded-xl
                border
                border-[#D9E3ED]
                bg-[#FFFDF8]
                px-3
                text-sm
                text-[#10213A]
                outline-none
                focus:border-[#D4AF37]
              "
            >
              <option value={1}>
                Term 1
              </option>

              <option value={2}>
                Term 2
              </option>

              <option value={3}>
                Term 3
              </option>

              <option value={4}>
                Term 4
              </option>
            </select>
          </div>
        </section>

        {/* ================================================== */}
        {/* ERROR                                              */}
        {/* ================================================== */}

        {error && (
          <div
            className="
              mb-6
              rounded-2xl
              border
              border-red-200
              bg-red-50
              px-4
              py-4
              text-sm
              text-red-700
            "
          >
            <p className="font-semibold">
              Unable to load Trial Management
            </p>

            <p className="mt-1">
              {error}
            </p>
          </div>
        )}

        {/* ================================================== */}
        {/* MAIN CARD                                          */}
        {/* ================================================== */}

        <section
          className="
            overflow-hidden
            rounded-2xl
            border
            border-[#D4AF37]/45
            bg-[#FFFDF8]
            shadow-sm
          "
        >
          {/* Gold top accent */}

          <div
            className="
              h-[4px]
              bg-gradient-to-r
              from-[#8F6B18]
              via-[#F4D35E]
              to-[#8F6B18]
            "
          />

          {/* Header */}

          <div
            className="
              flex
              items-center
              justify-between
              border-b
              border-[#D9E3ED]
              px-4
              py-4
              sm:px-6
            "
          >
            <div>
              <p
                className="
                  text-[11px]
                  font-semibold
                  uppercase
                  tracking-[0.18em]
                  text-[#B28A22]
                "
              >
                TRIAL STUDENTS
              </p>

              <p
                className="
                  mt-1
                  text-sm
                  text-[#64748B]
                "
              >
                {academicYear} · Term{" "}
                {term}
              </p>
            </div>

            <div
              className="
                text-sm
                font-semibold
                text-[#10213A]
              "
            >
              {filteredStudents.length}{" "}
              {filteredStudents.length ===
              1
                ? "student"
                : "students"}
            </div>
          </div>

          {/* Loading */}

          {loading ? (
            <div className="px-6 py-14 text-center">
              <div
                className="
                  mx-auto
                  h-8
                  w-8
                  animate-spin
                  rounded-full
                  border-2
                  border-[#D4AF37]/25
                  border-t-[#D4AF37]
                "
              />

              <p
                className="
                  mt-4
                  text-sm
                  text-[#64748B]
                "
              >
                Loading Trial students...
              </p>
            </div>
          ) : filteredStudents.length ===
            0 ? (
            /* Empty */

            <div
              className="
                px-6
                py-14
                text-center
              "
            >
              <div
                className="
                  text-3xl
                "
              >
                ♙
              </div>

              <p
                className="
                  mt-3
                  text-base
                  font-semibold
                  text-[#10213A]
                "
              >
                No active Trial students
              </p>

              <p
                className="
                  mt-1
                  text-sm
                  text-[#64748B]
                "
              >
                There are no active Trial
                enrolments for this
                academic year and term.
              </p>
            </div>
          ) : (
            <>
              {/* ================================================= */}
              {/* DESKTOP TABLE                                     */}
              {/* ================================================= */}

              <div className="hidden overflow-x-auto lg:block">
  <div className="max-h-[420px] overflow-y-auto">
    <table className="w-full min-w-[950px]">
                  <thead>
                    <tr
                      className="
                        bg-[#F4F8FC]
                        text-left
                      "
                    >
                      <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
                        Student
                      </th>

                      <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
                        Trial Class
                      </th>

                      <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
                        Join Date
                      </th>

                      <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
                        Attendance
                      </th>

                      <th className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
                        Feedback
                      </th>

                      <th className="px-5 py-4 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredStudents.map(
                      (student) => (
                        <TrialTableRow
                          key={
                            student.enrollment_id
                          }
                          student={student}
                        />
                      )
                    )}
                  </tbody>
                </table>
                  </div>
              </div>

              {/* ================================================= */}
              {/* MOBILE / TABLET CARDS                             */}
              {/* ================================================= */}

              <div className="divide-y divide-[#D9E3ED] lg:hidden">
                {filteredStudents.map(
                  (student) => (
                    <TrialMobileCard
                      key={
                        student.enrollment_id
                      }
                      student={student}
                    />
                  )
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

/**
 * ============================================================
 * Summary Card
 * ============================================================
 */

function SummaryCard({
  label,
  value,
  accent = "normal",
}: {
  label: string;
  value: number;
  accent?: "normal" | "gold" | "green";
}) {
  const valueClass =
    accent === "gold"
      ? "text-[#B28A22]"
      : accent === "green"
      ? "text-green-600"
      : "text-[#10213A]";

  return (
    <div
      className="
        rounded-2xl
        border
        border-[#D4AF37]/30
        bg-[#FFFDF8]
        px-5
        py-4
        shadow-sm
      "
    >
      <p
        className="
          text-[10px]
          font-semibold
          uppercase
          tracking-[0.16em]
          text-[#64748B]
        "
      >
        {label}
      </p>

      <p
        className={`
          mt-2
          text-2xl
          font-bold
          leading-none
          ${valueClass}
        `}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * ============================================================
 * Desktop Row
 * ============================================================
 */

function TrialTableRow({
  student,
}: {
  student: TrialStudent;
}) {
  return (
    <tr
      className="
        border-t
        border-[#D9E3ED]
        transition-colors
        hover:bg-[#FFF8E7]/50
      "
    >
      <td className="px-5 py-4">
        <div>
          <p
            className="
              font-semibold
              text-[#10213A]
            "
          >
            {getDisplayedStudentName(
              student
            )}
          </p>

          {student.student_code && (
            <p
              className="
                mt-1
                text-xs
                text-[#64748B]
              "
            >
              {student.student_code}
            </p>
          )}
        </div>
      </td>

      <td className="px-5 py-4">
        <p
          className="
            text-sm
            font-medium
            text-[#10213A]
          "
        >
          {getClassLabel(student)}
        </p>

        {student.class_level && (
          <p
            className="
              mt-1
              text-xs
              text-[#64748B]
            "
          >
            {student.class_level}
          </p>
        )}
      </td>

      <td className="px-5 py-4">
        <span
          className="
            text-sm
            text-[#475569]
          "
        >
          {formatDate(
            student.join_date
          )}
        </span>
      </td>

      <td className="px-5 py-4">
        <AttendanceBadge
          status={
            student.attendance_status
          }
        />
      </td>

      <td className="px-5 py-4">
        <FeedbackBadge
          status={
            student.feedback_status
          }
        />
      </td>

      <td className="px-5 py-4 text-right">
        <Link
  href={`/admin/trials/${student.enrollment_id}`}
  className="
    inline-flex
    items-center
    justify-center
    rounded-xl
    border
    border-[#D9E3ED]
    bg-white
    px-3.5
    py-2
    text-xs
    font-semibold
    text-[#64748B]
    transition
    hover:border-[#D4AF37]
    hover:bg-[#FFF8E7]
    hover:text-[#10213A]
  "
>
  Manage
</Link>
      </td>
    </tr>
  );
}

/**
 * ============================================================
 * Mobile Card
 * ============================================================
 */

function TrialMobileCard({
  student,
}: {
  student: TrialStudent;
}) {
  return (
    <div
      className="
        p-4
        transition-colors
        hover:bg-[#FFF8E7]/40
      "
    >
      <div
        className="
          flex
          items-start
          justify-between
          gap-3
        "
      >
        <div className="min-w-0">
          <p
            className="
              truncate
              font-semibold
              text-[#10213A]
            "
          >
            {getDisplayedStudentName(
              student
            )}
          </p>

          {student.student_code && (
            <p
              className="
                mt-1
                text-xs
                text-[#64748B]
              "
            >
              {student.student_code}
            </p>
          )}
        </div>

        <FeedbackBadge
          status={
            student.feedback_status
          }
        />
      </div>

      <div
        className="
          mt-4
          grid
          grid-cols-2
          gap-x-4
          gap-y-3
        "
      >
        <InfoItem
          label="TRIAL CLASS"
          value={getClassLabel(student)}
        />

        <InfoItem
          label="JOIN DATE"
          value={formatDate(
            student.join_date
          )}
        />

        <InfoItem
          label="ATTENDANCE"
          value={
            student.attendance_status ??
            "Not yet recorded"
          }
        />

        <InfoItem
          label="LEVEL"
          value={
            student.class_level || "—"
          }
        />
      </div>

      <div
        className="
          mt-4
          border-t
          border-[#D9E3ED]
          pt-3
        "
      >
        <Link
  href={`/admin/trials/${student.enrollment_id}`}
  className="
    inline-flex
    w-full
    items-center
    justify-center
    rounded-xl
    border
    border-[#D9E3ED]
    bg-white
    px-4
    py-2.5
    text-sm
    font-semibold
    text-[#64748B]
    transition
    hover:border-[#D4AF37]
    hover:bg-[#FFF8E7]
    hover:text-[#10213A]
  "
>
  Manage Trial
</Link>
      </div>
    </div>
  );
}

/**
 * ============================================================
 * Info Item
 * ============================================================
 */

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p
        className="
          text-[10px]
          font-semibold
          uppercase
          tracking-[0.12em]
          text-[#64748B]
        "
      >
        {label}
      </p>

      <p
        className="
          mt-1
          truncate
          text-sm
          font-medium
          text-[#10213A]
        "
      >
        {value}
      </p>
    </div>
  );
}

/**
 * ============================================================
 * Attendance Badge
 * ============================================================
 */

function AttendanceBadge({
  status,
}: {
  status: string | null;
}) {
  if (!status) {
    return (
      <span
        className="
          inline-flex
          rounded-full
          border
          border-slate-200
          bg-slate-50
          px-2.5
          py-1
          text-[10px]
          font-semibold
          text-slate-500
        "
      >
        Not yet
      </span>
    );
  }

  if (status === "Present") {
    return (
      <span
        className="
          inline-flex
          items-center
          rounded-full
          border
          border-green-200
          bg-green-50
          px-2.5
          py-1
          text-[10px]
          font-semibold
          text-green-700
        "
      >
        ✓ Present
      </span>
    );
  }

  if (status === "Absent") {
    return (
      <span
        className="
          inline-flex
          items-center
          rounded-full
          border
          border-red-200
          bg-red-50
          px-2.5
          py-1
          text-[10px]
          font-semibold
          text-red-700
        "
      >
        × Absent
      </span>
    );
  }

  if (status === "Leave") {
    return (
      <span
        className="
          inline-flex
          items-center
          rounded-full
          border
          border-amber-200
          bg-amber-50
          px-2.5
          py-1
          text-[10px]
          font-semibold
          text-amber-700
        "
      >
        • Leave
      </span>
    );
  }

  return (
    <span
      className="
        inline-flex
        rounded-full
        border
        border-[#D9E3ED]
        bg-[#F4F8FC]
        px-2.5
        py-1
        text-[10px]
        font-semibold
        text-[#64748B]
      "
    >
      {status}
    </span>
  );
}

/**
 * ============================================================
 * Feedback Badge
 * ============================================================
 */

function FeedbackBadge({
  status,
}: {
  status: "Y" | "N" | "—";
}) {
  if (status === "Y") {
    return (
      <span
        className="
          inline-flex
          items-center
          rounded-full
          border
          border-green-200
          bg-green-50
          px-2.5
          py-1
          text-[10px]
          font-semibold
          text-green-700
        "
      >
        ✓ Y
      </span>
    );
  }

  if (status === "N") {
    return (
      <span
        className="
          inline-flex
          items-center
          rounded-full
          border
          border-[#E5D39A]
          bg-[#FFF8E7]
          px-2.5
          py-1
          text-[10px]
          font-semibold
          text-[#9A7415]
        "
      >
        ! N
      </span>
    );
  }

  return (
    <span
      className="
        inline-flex
        items-center
        rounded-full
        border
        border-slate-200
        bg-slate-50
        px-2.5
        py-1
        text-[10px]
        font-semibold
        text-slate-400
      "
    >
      —
    </span>
  );
}