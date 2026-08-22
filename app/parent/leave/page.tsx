"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  syncLeaveRequests,
  reverseLeaveRequest,
} from "@/lib/leaveAttendanceSync";

/**
 * ============================================================
 * MyCHESS — Parent Leave
 * ============================================================
 *
 * Business flow:
 *
 * Authenticated Parent
 *        ↓
 * Parent Email
 *        ↓
 * Family
 *        ↓
 * Children
 *        ↓
 * Active Enrolments
 *        ↓
 * Lessons
 *        ↓
 * Parent selects one or more lessons
 *        ↓
 * leave_records
 *        ↓
 * Existing Attendance Leave Sync
 *
 * IMPORTANT:
 * - This page does NOT create Attendance.
 * - This page does NOT modify Attendance.
 * - This page does NOT implement Make-up Credit rules itself.
 * - After Leave records are inserted, this page invokes the
 *   shared Leave / Attendance / Make-up sync.
 * - The shared sync owns Attendance + Make-up business rules.
 *
 * Business timezone:
 * Australia/Brisbane
 * ============================================================
 */

type Student = {
  id: string;
  student_code: string | null;
  first_name: string | null;
  preferred_name: string | null;
  last_name: string | null;
};

type Enrollment = {
  student_id: string;
  class_id: string;
  academic_year: number | string;
  term: number | string;
  status: string;
  is_trial: boolean | null;
};

type ClassInfo = {
  class_suffix?: string | null;
  level?: string | null;
  start_time?: string | null;
  end_time?: string | null;
};

type Lesson = {
  id: string;
  lesson_date: string;
  academic_year: number | string;
  term: number | string;
  class_id: string;
  status: string | null;
  classes?: ClassInfo | null;
};

type LeaveRecord = {
  id: string;
  student_id: string;
  lesson_id: string;
  reason: string;
  comments: string | null;
  status: string | null;
};

type LessonRow = {
  lesson: Lesson;
  student: Student;
  enrollment: Enrollment;
  leaveRecord?: LeaveRecord;
};

type LeaveReason = "Sick" | "Holiday" | "Family" | "Other";

const LEAVE_REASONS: LeaveReason[] = [
  "Sick",
  "Holiday",
  "Family",
  "Other",
];

/**
 * Brisbane is UTC+10 throughout the year.
 *
 * The MyCHESS business timezone is Australia/Brisbane.
 */
function getBrisbaneDateTime(
  lessonDate: string,
  startTime: string
): Date {
  const cleanTime = startTime.length === 5
    ? `${startTime}:00`
    : startTime;

  return new Date(
    `${lessonDate}T${cleanTime}+10:00`
  );
}

function getTodayBrisbane(): string {
  const formatter = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Australia/Brisbane",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  );

  return formatter.format(new Date());
}

function formatDate(
  dateString: string
): string {
  const [year, month, day] =
    dateString.split("-");

  if (!year || !month || !day) {
    return dateString;
  }

  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  );

  return date.toLocaleDateString(
    "en-AU",
    {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatTime(
  timeString: string | null | undefined
): string {
  if (!timeString) {
    return "";
  }

  const parts = timeString.split(":");

  const hour = Number(parts[0]);
  const minute = Number(parts[1] ?? 0);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return timeString;
  }

  const suffix = hour >= 12
    ? "PM"
    : "AM";

  const displayHour =
    hour % 12 === 0
      ? 12
      : hour % 12;

  return `${displayHour}:${String(
    minute
  ).padStart(2, "0")} ${suffix}`;
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

  const givenName =
    preferred || first || "";

  return `${givenName} ${last ?? ""}`.trim();
}

function getClassDisplayName(
  lesson: Lesson
): string {
  const level =
    lesson.classes?.level?.trim() ?? "";

  const suffix =
    lesson.classes?.class_suffix?.trim() ?? "";

  if (level && suffix) {
    return `${level} ${suffix}`;
  }

  return level || suffix || "Class";
}

function isLessonOpenForLeave(
  lesson: Lesson
): boolean {
  if (lesson.status === "Cancelled") {
    return false;
  }

  if (!lesson.lesson_date) {
    return false;
  }

  if (!lesson.classes?.start_time) {
    return false;
  }

  const lessonStart =
    getBrisbaneDateTime(
      lesson.lesson_date,
      lesson.classes.start_time
    );

  return lessonStart.getTime() > Date.now();
}

export default function ParentLeavePage() {
  // ==========================================================
  // Loading / error
  // ==========================================================

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [cancellingLeaveId, setCancellingLeaveId] =
  useState<string | null>(null);

  const [cancelConfirmLeave, setCancelConfirmLeave] =
  useState<LeaveRecord | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  // ==========================================================
  // Parent / Family
  // ==========================================================

  const [parentEmail, setParentEmail] =
    useState("");

  const [familyId, setFamilyId] =
    useState<string | null>(null);

  // ==========================================================
  // Students
  // ==========================================================

  const [students, setStudents] =
    useState<Student[]>([]);

  // ==========================================================
  // Lessons
  // ==========================================================

  const [lessonRows, setLessonRows] =
    useState<LessonRow[]>([]);

  // ==========================================================
  // Selection
  // ==========================================================

  const [selectedStudentLessonKeys, setSelectedStudentLessonKeys] =
    useState<Set<string>>(
      new Set()
    );

  // ==========================================================
  // Leave form
  // ==========================================================

  const [reason, setReason] =
    useState<LeaveReason>("Sick");

  const [comments, setComments] =
    useState("");

  // ==========================================================
  // Load Parent / Family / Children / Lessons
  // ==========================================================

  async function loadParentLeaveData() {
    setLoading(true);
    setError(null);

    try {
      // ------------------------------------------------------
      // 1. Authenticated user
      // ------------------------------------------------------

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
          "You must be signed in to access Parent Leave."
        );
      }

      const email =
        user.email?.trim().toLowerCase();

      if (!email) {
        throw new Error(
          "Your account does not have an email address."
        );
      }

      setParentEmail(email);

      // ------------------------------------------------------
      // 2. Find Parent record
      // ------------------------------------------------------

      const {
        data: parentRecords,
        error: parentError,
      } = await supabase
        .from("parents")
        .select(`
          family_id,
          student_id
        `)
        .eq(
          "email",
          email
        );

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

      // ------------------------------------------------------
      // 3. Resolve Family
      //
      // Multiple parent rows may exist for multiple
      // children. The family_id is the SSOT for the family.
      // ------------------------------------------------------

      const resolvedFamilyId =
        parentRecords.find(
          (row) => row.family_id
        )?.family_id ?? null;

      if (!resolvedFamilyId) {
        throw new Error(
          "Your Parent record does not have a Family ID."
        );
      }

      setFamilyId(
        resolvedFamilyId
      );

      // ------------------------------------------------------
      // 4. Load all children in this Family
      // ------------------------------------------------------

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

      const studentIds = Array.from(
        new Set(
          (familyParents ?? [])
            .map(
              (row) => row.student_id
            )
            .filter(Boolean)
        )
      );

      if (studentIds.length === 0) {
        setStudents([]);
        setLessonRows([]);
        return;
      }

      // ------------------------------------------------------
      // 5. Load Students
      // ------------------------------------------------------

      const {
        data: studentData,
        error: studentError,
      } = await supabase
        .from("students")
        .select(`
          id,
          student_code,
          first_name,
          preferred_name,
          last_name
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

      const familyStudents =
        (studentData ?? []) as Student[];

      setStudents(
        familyStudents
      );

      // ------------------------------------------------------
      // 6. Load Active Enrolments
      //
      // We do NOT calculate lessons from class schedule.
      // Lessons are the operational source of truth.
      // ------------------------------------------------------

      const {
        data: enrollmentData,
        error: enrollmentError,
      } = await supabase
        .from("student_enrolments")
        .select(`
          student_id,
          class_id,
          academic_year,
          term,
          status,
          is_trial
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

      const activeEnrollments =
        (enrollmentData ?? []) as Enrollment[];

      if (
        activeEnrollments.length === 0
      ) {
        setLessonRows([]);
        return;
      }

      // ------------------------------------------------------
      // 7. Unique class IDs
      // ------------------------------------------------------

      const classIds = Array.from(
        new Set(
          activeEnrollments
            .map(
              (enrollment) =>
                enrollment.class_id
            )
            .filter(Boolean)
        )
      );

      if (classIds.length === 0) {
        setLessonRows([]);
        return;
      }

      // ------------------------------------------------------
      // 8. Load future Lessons
      //
      // A lesson belongs to a specific:
      //
      // academic_year
      // term
      // class_id
      //
      // We match all three against the Active Enrollment.
      // ------------------------------------------------------

      const today =
        getTodayBrisbane();

      const {
        data: lessonData,
        error: lessonError,
      } = await supabase
        .from("lessons")
        .select(`
          id,
          lesson_date,
          academic_year,
          term,
          class_id,
          status,
          classes:class_id (
            class_suffix,
            level,
            start_time,
            end_time
          )
        `)
        .in(
          "class_id",
          classIds
        )
        .gte(
          "lesson_date",
          today
        )
        .neq(
          "status",
          "Cancelled"
        )
        .order(
          "lesson_date",
          {
            ascending: true,
          }
        );

      if (lessonError) {
        throw lessonError;
      }

      const lessons =
        (lessonData ?? []) as Lesson[];

      // ------------------------------------------------------
      // 9. Match Lessons to Students
      // ------------------------------------------------------

      const rows: LessonRow[] = [];

      for (
        const enrollment
        of activeEnrollments
      ) {
        const student =
          familyStudents.find(
            (item) =>
              item.id ===
              enrollment.student_id
          );

        if (!student) {
          continue;
        }

        for (
          const lesson
          of lessons
        ) {
          const sameClass =
            lesson.class_id ===
            enrollment.class_id;

          const sameYear =
            String(
              lesson.academic_year
            ) ===
            String(
              enrollment.academic_year
            );

          const sameTerm =
            String(
              lesson.term
            ) ===
            String(
              enrollment.term
            );

          if (
            !sameClass ||
            !sameYear ||
            !sameTerm
          ) {
            continue;
          }

          if (
            !isLessonOpenForLeave(
              lesson
            )
          ) {
            continue;
          }

          rows.push({
            lesson,
            student,
            enrollment,
          });
        }
      }

      // ------------------------------------------------------
      // 10. Remove duplicate student + lesson combinations
      // ------------------------------------------------------

      const uniqueRows =
        new Map<string, LessonRow>();

      for (
        const row
        of rows
      ) {
        const key =
          `${row.student.id}:${row.lesson.id}`;

        if (
          !uniqueRows.has(key)
        ) {
          uniqueRows.set(
            key,
            row
          );
        }
      }

      const finalRows =
        Array.from(
          uniqueRows.values()
        );

      // ------------------------------------------------------
      // 11. Load existing Leave records
      //
      // We only use this to prevent duplicate submission
      // for the same Student + Lesson.
      // ------------------------------------------------------

      const {
        data: leaveData,
        error: leaveError,
      } = await supabase
        .from("leave_records")
        .select(`
          id,
          student_id,
          lesson_id,
          reason,
          comments,
          status
        `)
        .in(
          "student_id",
          studentIds
        );

      if (leaveError) {
        throw leaveError;
      }

      const leaveRecords =
        (leaveData ?? []) as LeaveRecord[];

      const leaveMap =
        new Map<string, LeaveRecord>();

      for (
        const leave
        of leaveRecords
      ) {
        const key =
          `${leave.student_id}:${leave.lesson_id}`;

        if (
          !leaveMap.has(key)
        ) {
          leaveMap.set(
            key,
            leave
          );
        }
      }

      const rowsWithLeave =
        finalRows.map(
          (row) => {
            const key =
              `${row.student.id}:${row.lesson.id}`;

            return {
              ...row,
              leaveRecord:
                leaveMap.get(key),
            };
          }
        );

      // ------------------------------------------------------
      // 12. Sort
      //
      // Student first, then date.
      // ------------------------------------------------------

      rowsWithLeave.sort(
        (a, b) => {
          const studentCompare =
            getStudentDisplayName(
              a.student
            ).localeCompare(
              getStudentDisplayName(
                b.student
              ),
              undefined,
              {
                sensitivity:
                  "base",
              }
            );

          if (
            studentCompare !== 0
          ) {
            return studentCompare;
          }

          return (
            a.lesson.lesson_date.localeCompare(
              b.lesson.lesson_date
            )
          );
        }
      );

      setLessonRows(
        rowsWithLeave
      );

    } catch (loadError: any) {
      console.error(
        "PARENT LEAVE LOAD ERROR:",
        loadError
      );

      setError(
        loadError?.message ??
        "Unable to load Parent Leave."
      );

    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // Initial Load
  // ==========================================================

  useEffect(() => {
    loadParentLeaveData();
  }, []);

  // ==========================================================
  // Group Lessons by Student
  // ==========================================================

  const studentGroups =
    useMemo(() => {
      const groups =
        new Map<
          string,
          {
            student: Student;
            rows: LessonRow[];
          }
        >();

      for (
        const row
        of lessonRows
      ) {
        const existing =
          groups.get(
            row.student.id
          );

        if (existing) {
          existing.rows.push(
            row
          );
        } else {
          groups.set(
            row.student.id,
            {
              student:
                row.student,
              rows: [row],
            }
          );
        }
      }

      return Array.from(
        groups.values()
      );
    }, [lessonRows]);

  // ==========================================================
  // Selection Helpers
  // ==========================================================

  function getSelectionKey(
    studentId: string,
    lessonId: string
  ): string {
    return `${studentId}:${lessonId}`;
  }

  function toggleLesson(
    studentId: string,
    lessonId: string
  ) {
    setSuccess(null);
    setError(null);

    const selectionKey =
      getSelectionKey(
        studentId,
        lessonId
      );

    setSelectedStudentLessonKeys(
      (previous) => {
        const next =
          new Set(previous);

        if (
          next.has(selectionKey)
        ) {
          next.delete(
            selectionKey
          );
        } else {
          next.add(
            selectionKey
          );
        }

        return next;
      }
    );
  }

  function selectStudentLessons(
    rows: LessonRow[]
  ) {
    setSelectedStudentLessonKeys(
      (previous) => {
        const next =
          new Set(previous);

        for (
          const row
          of rows
        ) {
if (row.leaveRecord?.status !== "Submitted") {
            next.add(
              getSelectionKey(
                row.student.id,
                row.lesson.id
              )
            );
          }
        }

        return next;
      }
    );
  }

  function clearSelection() {
    setSelectedStudentLessonKeys(
      new Set()
    );
  }

  // ==========================================================
  // Submit Leave
  // ==========================================================

  async function handleSubmit() {
    setError(null);
    setSuccess(null);

    if (
      selectedStudentLessonKeys.size === 0
    ) {
      setError(
        "Please select at least one lesson."
      );
      return;
    }

    if (
      !LEAVE_REASONS.includes(
        reason
      )
    ) {
      setError(
        "Please select a valid leave reason."
      );
      return;
    }

    setSubmitting(true);

    try {
      // ------------------------------------------------------
      // 1. Re-check authentication
      // ------------------------------------------------------

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
          "Your session has expired. Please sign in again."
        );
      }

      // ------------------------------------------------------
      // 2. Re-check all selected rows
      // ------------------------------------------------------

      const selectedRows =
        lessonRows.filter(
          (row) =>
            selectedStudentLessonKeys.has(
              getSelectionKey(
                row.student.id,
                row.lesson.id
              )
            )
        );

      if (
        selectedRows.length === 0
      ) {
        throw new Error(
          "The selected lessons are no longer available."
        );
      }

      // ------------------------------------------------------
      // 3. Business deadline check
      //
      // Parent Leave must be submitted before
      // scheduled Lesson Start.
      // ------------------------------------------------------

      const now =
        Date.now();

      for (
        const row
        of selectedRows
      ) {
if (row.leaveRecord?.status === "Submitted") {
          throw new Error(
            `${getStudentDisplayName(
              row.student
            )} already has a Leave record for ${formatDate(
              row.lesson.lesson_date
            )}.`
          );
        }

        const startTime =
          row.lesson.classes
            ?.start_time;

        if (!startTime) {
          throw new Error(
            `Lesson time is unavailable for ${formatDate(
              row.lesson.lesson_date
            )}.`
          );
        }

        const lessonStart =
          getBrisbaneDateTime(
            row.lesson.lesson_date,
            startTime
          );

        if (
          lessonStart.getTime() <=
          now
        ) {
          throw new Error(
            `Leave can no longer be submitted for ${getStudentDisplayName(
              row.student
            )} on ${formatDate(
              row.lesson.lesson_date
            )}. The lesson has started or is about to start.`
          );
        }
      }

      // ------------------------------------------------------
      // 5. Create or reactivate Leave Records
      //
      // One Student + Lesson has one Leave Record.
      // A Cancelled record is reactivated instead of creating
      // a duplicate row, preserving unique_student_lesson.
      // ------------------------------------------------------

      for (const row of selectedRows) {
        const existingLeave = row.leaveRecord;
        const payload = {
          reason,
          comments: comments.trim() || null,
          status: "Submitted",
          updated_at: new Date().toISOString(),
        };

        if (existingLeave?.status === "Cancelled") {
          const { error: updateError } = await supabase
            .from("leave_records")
            .update(payload)
            .eq("id", existingLeave.id)
            .eq("status", "Cancelled");

          if (updateError) {
            throw updateError;
          }
        } else {
          const { error: insertError } = await supabase
            .from("leave_records")
            .insert({
              student_id: row.student.id,
              lesson_id: row.lesson.id,
              ...payload,
            });

          if (insertError) {
            throw insertError;
          }
        }
      }

      const records = selectedRows.map((row) => ({
        student_id: row.student.id,
        lesson_id: row.lesson.id,
        reason,
        comments: comments.trim() || null,
        status: "Submitted",
      }));

      // ------------------------------------------------------
      // 6. Immediate Leave Business Sync
      //
      // Parent Leave is the source event for:
      // - Attendance = Excused (when Attendance exists)
      // - Make-up Credit for Regular students
      // - No Credit for Trial students
      //
      // One Parent submission may contain multiple students
      // on the same Lesson. Sync each unique Lesson exactly
      // once. The shared sync is idempotent and prevents
      // duplicate Credits.
      // ------------------------------------------------------

      const lessonIdsToSync =
        Array.from(
          new Set(
            selectedRows.map(
              (row) => row.lesson.id
            )
          )
        );

      try {
        for (
          const lessonId
          of lessonIdsToSync
        ) {
          await syncLeaveRequests(
            lessonId
          );
        }
      } catch (syncError: any) {
        console.error(
          "PARENT LEAVE → SHARED SYNC ERROR:",
          syncError
        );

        throw new Error(
          "Leave was submitted, but the Attendance / Make-up Credit sync failed. Please try again or contact an administrator."
        );
      }

      // ------------------------------------------------------
      // 7. Success
      // ------------------------------------------------------

      const count =
        records.length;

      setSelectedStudentLessonKeys(
        new Set()
      );

      setComments("");

      setSuccess(
        count === 1
          ? "Leave submitted successfully."
          : `${count} Leave Requests submitted successfully.`
      );

      // ------------------------------------------------------
      // 7. Reload
      //
      // Existing Leave records will now be shown and
      // cannot be duplicated.
      // ------------------------------------------------------

      await loadParentLeaveData();

    } catch (submitError: any) {
      console.error(
        "PARENT LEAVE SUBMIT ERROR:",
        submitError
      );

      setError(
        submitError?.message ??
        "Unable to submit Leave."
      );

    } finally {
      setSubmitting(false);
    }
  }

    // ==========================================================
  // Cancel Leave
  //
  // Parent may cancel only an active Submitted Leave.
  //
  // Shared Reverse Engine handles:
  // - Leave → Cancelled
  // - Attendance → Present
  // - Available Make-up Credit → removed
  // - Used Credit → untouched
  // ==========================================================

  async function handleCancelLeave(
    leaveRecord: LeaveRecord
  ) {
    setError(null);
    setSuccess(null);

    if (
      leaveRecord.status !== "Submitted"
    ) {
      return;
    }

    const lesson =
      lessonRows.find(
        (row) =>
          row.lesson.id ===
          leaveRecord.lesson_id &&
          row.student.id ===
          leaveRecord.student_id
      )?.lesson;

    if (!lesson) {
      setError(
        "The lesson associated with this Leave request could not be found."
      );
      return;
    }

    // ------------------------------------------------------
    // Business deadline check
    //
    // Parent Cancel is only allowed before Lesson Start.
    // ------------------------------------------------------

    if (
      !isLessonOpenForLeave(lesson)
    ) {
      setError(
        `This Leave request can no longer be cancelled because the lesson has started or is about to start.`
      );
      return;
    }

    setCancellingLeaveId(
      leaveRecord.id
    );

    try {
      // ----------------------------------------------------
      // Shared Reverse Engine
      // ----------------------------------------------------

      await reverseLeaveRequest(
        leaveRecord.id
      );

      setSuccess(
        "Leave cancelled successfully."
      );

      // ----------------------------------------------------
      // Reload
      // ----------------------------------------------------

      await loadParentLeaveData();

    } catch (cancelError: any) {
      console.error(
        "PARENT LEAVE CANCEL ERROR:",
        cancelError
      );

      setError(
        cancelError?.message ??
        "Unable to cancel Leave."
      );
    } finally {
      setCancellingLeaveId(null);
    }
  }

  // ==========================================================
  // Loading
  // ==========================================================

  if (loading) {
    return (
      <main className="min-h-screen text-white">
        <div
          className="min-h-screen"
          style={{
            backgroundImage: `
              conic-gradient(
                #102A4A 25%,
                #0D2444 0 50%,
                #102A4A 0 75%,
                #0D2444 0
              )
            `,
            backgroundSize: "50px 50px",
          }}
        >
          <div className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-[#FFFDF8] p-8 shadow-sm">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-0 right-0 top-0 h-[6px] bg-gradient-to-r from-[#F7D968] via-[#D4AF37]/75 to-transparent [clip-path:polygon(0_0,100%_42%,100%_58%,0_100%)]"
              />
              <div className="animate-pulse">
                <div className="mb-4 h-8 w-48 rounded bg-[#10213A]/10" />
                <div className="mb-2 h-4 w-80 rounded bg-[#10213A]/10" />
                <div className="h-4 w-64 rounded bg-[#10213A]/10" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================================
  // Page
  // ==========================================================

  return (
    <main className="min-h-screen text-white">
      <div
        className="min-h-screen"
        style={{
          backgroundImage: `
            conic-gradient(
              #102A4A 25%,
              #0D2444 0 50%,
              #102A4A 0 75%,
              #0D2444 0
            )
          `,
          backgroundSize: "50px 50px",
        }}
      >
      <div className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">

        {/* ==================================================
            Header
        ================================================== */}

        <div className="mb-8">
          <div className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-[#D4AF37]">
            Parent Portal
          </div>

          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Leave Request
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70 sm:text-base">
            Submit leave for one or more upcoming lessons.
            Leave takes effect immediately after submission.
          </p>

          {parentEmail && (
            <div className="mt-3 text-xs text-white/45">
              Signed in as {parentEmail}
            </div>
          )}

          {familyId && (
            <div className="mt-1 text-xs text-white/30">
              Family: {familyId}
            </div>
          )}
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
            No children
        ================================================== */}

        {students.length === 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-[#FFFDF8] p-8 text-[#10213A] shadow-sm">
            <h2 className="text-xl font-semibold text-[#10213A]">
              No children found
            </h2>

            <p className="mt-2 text-sm text-[#64748B]">
              No students are currently linked to this Family.
            </p>
          </div>
        )}

        {/* ==================================================
            No upcoming lessons
        ================================================== */}

        {students.length > 0 &&
          lessonRows.length === 0 && (
            <div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-[#FFFDF8] p-8 text-[#10213A] shadow-sm">
              <h2 className="text-xl font-semibold">
                No upcoming lessons available
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#64748B]">
                There are currently no upcoming lessons available
                for Leave submission.
              </p>
            </div>
          )}

        {/* ==================================================
            Leave Form
        ================================================== */}

        {selectedStudentLessonKeys.size > 0 && (
          <section className="relative mt-8 overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-[#FFFDF8] p-5 text-[#10213A] shadow-sm sm:p-7">

            <div aria-hidden="true" className="pointer-events-none absolute left-0 right-0 top-0 h-[6px] bg-gradient-to-r from-[#F7D968] via-[#D4AF37]/75 to-transparent [clip-path:polygon(0_0,100%_42%,100%_58%,0_100%)]" />

            <div className="mb-6">
              <h2 className="text-xl font-semibold">
                Leave Details
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#64748B]">
                The selected lesson
                {selectedStudentLessonKeys.size === 1
                  ? ""
                  : "s"} will be submitted together.
                Each lesson will receive its own Leave Record.
              </p>
            </div>

            {/* Reason */}

            <div>
              <label
                htmlFor="leave-reason"
                className="mb-2 block text-sm font-medium text-[#10213A]"
              >
                Leave Reason
              </label>

              <select
                id="leave-reason"
                value={reason}
                disabled={submitting}
                onChange={(event) =>
                  setReason(
                    event.target.value as LeaveReason
                  )
                }
                className="w-full rounded-xl border border-[#D9E3ED] bg-[#F5F9FD] px-4 py-3 text-sm text-[#10213A] outline-none transition focus:border-[#D4AF37]"
              >
                {LEAVE_REASONS.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                      className="bg-[#F5F9FD] text-[#10213A]"
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Comments */}

            <div className="mt-5">
              <label
                htmlFor="leave-comments"
                className="mb-2 block text-sm font-medium text-[#10213A]"
              >
                Comments
                <span className="ml-2 text-xs text-[#64748B]">
                  Optional
                </span>
              </label>

              <textarea
                id="leave-comments"
                value={comments}
                disabled={submitting}
                onChange={(event) =>
                  setComments(
                    event.target.value
                  )
                }
                rows={4}
                maxLength={500}
                placeholder="Add any additional information if required."
                className="w-full resize-none rounded-xl border border-[#D9E3ED] bg-[#F5F9FD] px-4 py-3 text-sm text-[#10213A] placeholder:text-[#94A3B8] outline-none transition focus:border-[#D4AF37]"
              />

              <div className="mt-1 text-right text-xs text-[#64748B]">
                {comments.length}/500
              </div>
            </div>

            {/* Confirmation */}

            <div className="mt-6 rounded-xl border border-[#D9E3ED] bg-[#F5F9FD] p-4">
              <p className="text-sm leading-6 text-[#64748B]">
                By submitting this request, the selected
                lessons will immediately be recorded as Leave.
                Leave must be submitted before the scheduled
                lesson start time.
              </p>
            </div>

            {/* Actions */}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">

              <button
                type="button"
                disabled={submitting}
                onClick={clearSelection}
                className="rounded-xl border border-[#D9E3ED] bg-white px-5 py-3 text-sm font-medium text-[#64748B] transition hover:bg-[#F5F9FD] hover:text-[#10213A] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear Selection
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="rounded-xl border border-[#D4AF37] bg-[#D4AF37] px-6 py-3 text-sm font-semibold text-[#10213A] shadow-sm transition hover:bg-[#F4D35E] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? "Submitting..."
                  : `Submit Leave${
                      selectedStudentLessonKeys.size > 1
                        ? ` (${selectedStudentLessonKeys.size})`
                        : ""
                    }`}
              </button>

            </div>

          </section>
        )}


        {/* ==================================================
            Children / Lessons
        ================================================== */}

        {studentGroups.length > 0 && (
          <div className="mt-5 space-y-6">

            {studentGroups.map(
              ({
                student,
                rows,
              }) => {

                const selectableRows =
                  rows.filter(
                    (row) =>
                      !row.leaveRecord
                  );

                const selectedCount =
                  rows.filter(
                    (row) =>
                      selectedStudentLessonKeys.has(
                        getSelectionKey(
                          row.student.id,
                          row.lesson.id
                        )
                      )
                  ).length;

                return (
                  <section
                    key={student.id}
                    className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-[#FFFDF8] text-[#10213A] shadow-sm"
                  >

                    {/* Frozen MyCHESS Gold Tapered Accent */}
                    <div aria-hidden="true" className="pointer-events-none absolute left-0 right-0 top-0 h-[6px] bg-gradient-to-r from-[#F7D968] via-[#D4AF37]/75 to-transparent [clip-path:polygon(0_0,100%_42%,100%_58%,0_100%)]" />

                    {/* Student Header */}

                    <div className="flex flex-col gap-4 border-b border-[#D9E3ED] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">

                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-semibold">
                            {getStudentDisplayName(
                              student
                            )}
                          </h2>

                          {student.student_code && (
                            <span className="rounded-full border border-[#D9E3ED] px-2.5 py-1 text-xs text-[#64748B]">
                              {student.student_code}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm text-[#64748B]">
                          {rows.length} upcoming lesson
                          {rows.length === 1
                            ? ""
                            : "s"} available
                        </p>
                      </div>

                      {selectableRows.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            selectStudentLessons(
                              selectableRows
                            )
                          }
                          className="rounded-lg border border-[#D4AF37]/40 px-4 py-2 text-sm font-medium text-[#D4AF37] transition hover:bg-[#D4AF37]/10"
                        >
                          Select All
                        </button>
                      )}

                    </div>

                    {/* Lesson List */}

                    <div className="divide-y divide-[#D9E3ED]">

                      {rows.map(
                        (row) => {

                          const {
                            lesson,
                            leaveRecord,
                          } = row;

                          const selected =
                            selectedStudentLessonKeys.has(
                              getSelectionKey(
                                student.id,
                                lesson.id
                              )
                            );

                          const startTime =
                            lesson.classes
                              ?.start_time ?? "";

                          const endTime =
                            lesson.classes
                              ?.end_time ?? "";

                          const isAlreadySubmitted =
  leaveRecord?.status === "Submitted";

                          return (
                            <label
                              key={lesson.id}
                              className={`block px-5 py-5 transition ${
                                isAlreadySubmitted
                                  ? "cursor-default bg-[#F5F9FD]"
                                  : "cursor-pointer hover:bg-[#F5F9FD]"
                              }`}
                            >

                              <div className="flex items-start gap-4">

                                {/* Checkbox */}

                                <div className="pt-1">
                                  <input
                                    type="checkbox"
                                    checked={
                                      selected
                                    }
                                    disabled={
                                      isAlreadySubmitted ||
                                      submitting
                                    }
                                    onChange={() =>
                                      toggleLesson(
                                        student.id,
                                        lesson.id
                                      )
                                    }
                                    className="h-5 w-5 rounded border-[#B8C7D8] bg-white accent-[#D4AF37]"
                                  />
                                </div>

                                {/* Lesson Info */}

                                <div className="min-w-0 flex-1">

                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                                    <div>
                                      <div className="font-medium text-[#10213A]">
                                        {formatDate(
                                          lesson.lesson_date
                                        )}
                                      </div>

                                      <div className="mt-1 text-sm text-[#64748B]">
                                        {getClassDisplayName(
                                          lesson
                                        )}
                                      </div>
                                    </div>

                                    <div className="text-left sm:text-right">
                                      <div className="text-sm font-medium text-[#D4AF37]">
                                        {formatTime(
                                          startTime
                                        )}
                                        {" – "}
                                        {formatTime(
                                          endTime
                                        )}
                                      </div>

                                      <div className="mt-1 text-xs text-[#64748B]">
                                        Lesson
                                      </div>
                                    </div>

                                  </div>

                                  {/* Existing Leave */}

{isAlreadySubmitted &&
  leaveRecord?.status === "Submitted" && (
    <div className="mt-3 flex flex-wrap items-center gap-2">

      {/* Leave Status */}
      <span
        className="
          inline-flex
          items-center
          gap-1.5
          rounded-full
          border
          border-[#B9D6F2]
          bg-[#EEF6FF]
          px-3
          py-1
          text-xs
          font-medium
          text-[#2563A6]
        "
      >
        <span>✓</span>
        Leave Submitted
      </span>

      {/* Reason */}
      {leaveRecord.reason && (
        <span className="text-xs text-[#64748B]">
          {leaveRecord.reason}
        </span>
      )}

      {/* Cancel */}
      <button
        type="button"
        disabled={
          cancellingLeaveId ===
          leaveRecord.id
        }
        onClick={() =>
          setCancelConfirmLeave(
            leaveRecord
          )
        }
        className="
          ml-1
          inline-flex
          min-h-[32px]
          items-center
          justify-center
          rounded-lg
          border
          border-[#E7B8B8]
          bg-[#FFF7F7]
          px-3
          py-1
          text-xs
          font-medium
          text-[#B45353]
          transition
          hover:border-[#D99A9A]
          hover:bg-[#FFF0F0]
          disabled:cursor-not-allowed
          disabled:opacity-50
        "
      >
        {cancellingLeaveId ===
        leaveRecord.id
          ? "Cancelling..."
          : "Cancel Leave"}
      </button>

    </div>
  )}

                                  {leaveRecord?.status === "Cancelled" && (
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                      <span className="inline-flex items-center rounded-full border border-[#D9E3ED] bg-[#F5F9FD] px-3 py-1 text-xs font-medium text-[#64748B]">
                                        Leave Cancelled
                                      </span>
                                      <span className="text-xs text-[#64748B]">
                                        Select this lesson to submit Leave again.
                                      </span>
                                    </div>
                                  )}

                                </div>
                              </div>

                            </label>
                          );
                        }
                      )}

                    </div>

                    {/* Student Footer */}

                    {selectedCount > 0 && (
                      <div className="border-t border-[#D9E3ED] bg-[#F8F5ED] px-5 py-3 text-xs text-[#8F6B18]">
                        {selectedCount} lesson
                        {selectedCount === 1
                          ? ""
                          : "s"} selected
                      </div>
                    )}

                  </section>
                );
              }
            )}

          </div>
        )}

        {/* ==================================================
            Business Rule Note
        ================================================== */}

        <div className="mt-8 rounded-xl border border-[#D9E3ED] bg-[#F5F9FD] px-5 py-4">
          <p className="text-xs leading-5 text-[#64748B]">
            Leave requests are effective immediately and do not
            require approval. Attendance and Make-up processing
            are handled by the existing MyCHESS Leave /
            Attendance workflow.
          </p>
        </div>

      </div>
      </div>
      {cancelConfirmLeave && (
  <div
    className="
      fixed
      inset-0
      z-50
      flex
      items-center
      justify-center
      bg-black/60
      px-4
      backdrop-blur-sm
    "
  >
    <div
      className="
        w-full
        max-w-md
        rounded-2xl
        border
        border-[#D4AF37]/30
        bg-[#FFFDF8]
        p-6
        text-[#10213A]
        shadow-2xl
      "
    >

      {/* Warning Icon */}
      <div
        className="
          mx-auto
          flex
          h-12
          w-12
          items-center
          justify-center
          rounded-full
          border
          border-amber-400/30
          bg-amber-400/10
          text-2xl
        "
      >
        ⚠️
      </div>

      {/* Title */}
      <h3
        className="
          mt-4
          text-center
          text-xl
          font-semibold
          text-[#10213A]
        "
      >
        Cancel Leave Request?
      </h3>

      {/* Message */}
      <p
        className="
          mt-3
          text-center
          text-sm
          leading-6
          text-[#64748B]
        "
      >
        Are you sure you want to cancel
        this leave request?
      </p>

      {cancelConfirmLeave.reason && (
        <div
          className="
            mt-4
            rounded-xl
            border
            border-[#D9E3ED]
            bg-[#F5F9FD]
            px-4
            py-3
            text-center
            text-sm
            text-[#64748B]
          "
        >
          Reason:{" "}
          <span className="font-medium text-[#D4AF37]">
            {cancelConfirmLeave.reason}
          </span>
        </div>
      )}

      {/* Actions */}
      <div
        className="
          mt-6
          flex
          flex-col-reverse
          gap-3
          sm:flex-row
          sm:justify-end
        "
      >

        {/* Keep Leave */}
        <button
          type="button"
          onClick={() =>
            setCancelConfirmLeave(null)
          }
          className="
            min-h-[44px]
            rounded-xl
            border
            border-[#D9E3ED]
            bg-white
            px-5
            py-2.5
            text-sm
            font-medium
            text-[#10213A]
            transition
            hover:bg-white/[0.08]
          "
        >
          Keep Leave
        </button>

        {/* Confirm Cancel */}
        <button
          type="button"
          disabled={
            cancellingLeaveId ===
            cancelConfirmLeave.id
          }
          onClick={async () => {
            const leave =
              cancelConfirmLeave;

            setCancelConfirmLeave(null);

            await handleCancelLeave(
              leave
            );
          }}
          className="
  min-h-[44px]
  rounded-xl
  border
  border-[#10213A]
  bg-[#10213A]
  px-5
  py-2.5
  text-sm
  font-semibold
  text-white
  shadow-sm
  transition-all
  duration-200
  hover:bg-[#1B3558]
  hover:border-[#1B3558]
  active:scale-[0.98]
  disabled:cursor-not-allowed
  disabled:opacity-50
"
        >
          {cancellingLeaveId ===
          cancelConfirmLeave.id
            ? "Cancelling..."
            : "Cancel Leave"}
        </button>

      </div>
    </div>
  </div>
)}
    </main>
  );
}