"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import {
  getAttendanceStudentCounts,
} from "@/lib/attendanceStudentCount";
import {
  getCoachScope,
} from "@/lib/coachScope";
import {
  getCurrentUser,
} from "@/lib/currentUser";

import {
  calculateAttendanceSummary,
} from "@/lib/attendanceSummary";
import { runAttendanceReconciliation } from "@/lib/attendanceRunner";
import { reconcileAttendance } from "@/lib/attendanceEngine";
import {
  syncLeaveRequests,
  reverseLeaveRequest,
} from "@/lib/leaveAttendanceSync";
import { addOnSiteMakeupAttendance } from "@/lib/makeupAttendance";
import {
  getLessonStartTimestamp,
  getBrisbaneDate,
  getBrisbaneDateParts,
  isAttendanceLocked,
} from "@/lib/attendanceTime";

import {
  clearTestClock,
  getBusinessTime,
  getBusinessTimeAsDate,
  getTestClockValue,
  isTestClockEnabled,
  setTestClock,
} from "@/lib/businessTime";

import AttendanceHeader from "@/components/attendance/AttendanceHeader";
import AttendanceLessonCard from "@/components/attendance/AttendanceLessonCard";
import AttendanceLessonFilters from "@/components/attendance/AttendanceLessonFilters";
import AttendanceSummary from "@/components/attendance/AttendanceSummary";
import AttendanceStudentTable from "@/components/attendance/AttendanceStudentTable";
import StudentQuickView from "@/components/attendance/StudentQuickView";
import MakeUpStudentDialog from "@/components/attendance/MakeUpStudentDialog";

import type {
  LessonCard,
  AttendanceStudent,
  AttendanceHeaderStats,
  AttendanceSummary as AttendanceSummaryType,
} from "@/components/attendance/types";


// ======================================================
// DEV / UAT Global Business Time
//
// Production safety:
// - The simulator is rendered only when NODE_ENV !== "production".
// - Production always uses the real current time.
//
// IMPORTANT:
// - This Coach control uses the existing global lib/businessTime.ts.
// - Re-enrolment and Coach therefore share the same localStorage clock.
// - This clock is used here to determine Roll Call availability only.
// - It does NOT disable Attendance Runner / Engine / Reconciliation.
// - It does NOT change Leave / Trial / Make-up / Holiday sync.
// - The normal 23:59 Attendance lock remains controlled by the
//   shared Attendance Time Engine.
// ======================================================

function getLiveBrisbaneDateTimeLocalValue() {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Brisbane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

// ======================================================
// Page
// ======================================================

export default function CoachAttendancePage() {

  // ======================================================
  // States
  // ======================================================

  const [loading, setLoading] =
    useState(true);

  const [lessons, setLessons] =
    useState<LessonCard[]>([]);

  const [students, setStudents] =
    useState<AttendanceStudent[]>([]);

  const [selectedLesson, setSelectedLesson] =
    useState<LessonCard | null>(null);

  const [showMakeupDialog, setShowMakeupDialog] =
    useState(false);

  const [eligibleStudents, setEligibleStudents] =
    useState<any[]>([]);

  const [quickViewStudent, setQuickViewStudent] =
    useState<AttendanceStudent | null>(null);

  const [headerStats, setHeaderStats] =
    useState<AttendanceHeaderStats>({
      totalLessons: 0,
      totalStudents: 0,
      trialCount: 0,
      pickupCount: 0,
      ymcaCount: 0,
    });

  const [summary, setSummary] =
    useState<AttendanceSummaryType>({
      totalStudents: 0,
      present: 0,
      absent: 0,
      late: 0,
      leave: 0,
      attendanceRate: 0,
    });


  // ======================================================
  // Attendance Submission
  //
  // New feature only:
  // - Does NOT change any attendance record.
  // - Records that the Coach has completed roll call.
  // - submitted_at is stored as timestamptz and displayed
  //   in Australia/Brisbane time.
  // ======================================================

  const [attendanceSubmittedAt, setAttendanceSubmittedAt] =
    useState<string | null>(null);

  const [submittingAttendance, setSubmittingAttendance] =
    useState(false);

  const [reminderMessage, setReminderMessage] =
  useState<string | null>(null);

  const [eightPmPopupShown, setEightPmPopupShown] =
  useState(false);

  // Global Business Time / UAT clock.
  // The actual state lives in lib/businessTime.ts localStorage.
  const [rollCallTimeTick, setRollCallTimeTick] =
    useState(Date.now());

  const [rollCallTestClockEnabled, setRollCallTestClockEnabled] =
    useState(false);

  const [rollCallTestClockValue, setRollCallTestClockValue] =
    useState("");

const [coachGreetingName, setCoachGreetingName] =
    useState("");


  // ======================================================
  // Lesson Filters
  // Same UI architecture as Admin Attendance.
  // Coach scope is applied when loading Lessons.
  // ======================================================

  const [search, setSearch] =
    useState("");

  const [academicYearFilter, setAcademicYearFilter] =
    useState("");

  const [termFilter, setTermFilter] =
    useState("");

  const [campusFilter, setCampusFilter] =
    useState("");

  const [coachFilter, setCoachFilter] =
    useState("");


  // ======================================================
  // Permission
  // ======================================================

  const isAdmin = false;

  const canAddMakeup = true;


  // ======================================================
  // Attendance Status Change
  // Same logic as Admin Attendance.
  // ======================================================

  async function handleStatusChange(
    studentId: string,
    status: AttendanceStudent["attendance_status"]
  ) {

    if (!selectedLesson) return;

    // Coach Attendance becomes read-only at 00:00 Brisbane
    // on the lesson date.
    if (
      isAttendanceLocked(
        selectedLesson.lesson_date,
        getBusinessTimeAsDate()
      )
    ) {
      await loadStudents(
        selectedLesson.id
      );
      return;
    }

    // Before Lesson Start, Coach Roll Call is disabled.
    // This guard affects only Coach-initiated status changes.
    // Automatic Attendance synchronization remains unaffected.
    if (
      rollCallTimeTick <
      getLessonStartTimestamp(
        selectedLesson.lesson_date,
        selectedLesson.start_time
      )
    ) {
      await loadStudents(
        selectedLesson.id
      );
      return;
    }

    const currentStudent =
  students.find(
    (student) =>
      student.student_id === studentId
  );

  if (
  status === "Present" &&
  currentStudent?.attendance_type === "Excused" &&
  currentStudent?.leave_status === "Submitted"
) {
  const {
    data: leaveRecord,
    error: leaveLookupError,
  } = await supabase
    .from("leave_records")
    .select("id")
    .eq(
      "student_id",
      studentId
    )
    .eq(
      "lesson_id",
      selectedLesson.id
    )
    .eq(
      "status",
      "Submitted"
    )
    .maybeSingle();

  if (leaveLookupError) {
    console.error(
      "COACH LEAVE REVERSE LOOKUP ERROR:",
      leaveLookupError
    );

    await loadStudents(
      selectedLesson.id
    );

    return;
  }

  if (!leaveRecord) {
    console.error(
      "COACH LEAVE REVERSE ERROR: Submitted Leave record not found."
    );

    await loadStudents(
      selectedLesson.id
    );

    return;
  }

  try {
    await reverseLeaveRequest(
      leaveRecord.id
    );
  } catch (reverseError) {
    console.error(
      "COACH LEAVE REVERSE ERROR:",
      reverseError
    );

    await loadStudents(
      selectedLesson.id
    );

    return;
  }

  return;
}


    // ----------------------------------------------------
    // Optimistic UI
    // ----------------------------------------------------

    setStudents((prev) =>
      prev.map((student) =>
        student.student_id === studentId
          ? {
              ...student,
              attendance_status: status,
            }
          : student
      )
    );


    // ----------------------------------------------------
    // Update Attendance
    // ----------------------------------------------------

    const { error } =
      await supabase
        .from("attendance")
        .update({
          attendance_status: status,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "lesson_id",
          selectedLesson.id
        )
        .eq(
          "student_id",
          studentId
        );


    if (error) {

      console.error(
        "COACH ATTENDANCE UPDATE ERROR:",
        error
      );

      await loadStudents(
        selectedLesson.id
      );

      return;
    }


    // ----------------------------------------------------
    // Audit Log
    // ----------------------------------------------------

    const {
      data: attendanceRecord,
      error: attendanceRecordError,
    } = await supabase
      .from("attendance")
      .select("id")
      .eq(
        "lesson_id",
        selectedLesson.id
      )
      .eq(
        "student_id",
        studentId
      )
      .single();


    if (attendanceRecordError) {

      console.error(
        "COACH ATTENDANCE RECORD ERROR:",
        attendanceRecordError
      );

      return;
    }


    if (attendanceRecord) {

      const {
        error: logError,
      } = await supabase
        .from("attendance_logs")
        .insert({
          attendance_id:
            attendanceRecord.id,

          action:
            "Status Change",

          new_status:
            status,

          operator:
            "Coach",

          remarks:
            "Attendance updated from Coach Attendance page",
        });


      if (logError) {

        console.error(
          "COACH ATTENDANCE LOG ERROR:",
          logError
        );
      }
    }


    // ----------------------------------------------------
    // Reload
    // ----------------------------------------------------

    await loadStudents(
      selectedLesson.id
    );
  }


  // ======================================================
  // Attendance Submission
  // ======================================================

  async function loadAttendanceSubmission(lessonId: string) {
    try {
      const { data, error } = await supabase
        .from("attendance_submissions")
        .select("submitted_at")
        .eq("lesson_id", lessonId)
        .maybeSingle();

      if (error) {
        console.error(
          "COACH ATTENDANCE SUBMISSION LOAD ERROR:",
          error
        );
        setAttendanceSubmittedAt(null);
        return;
      }

      setAttendanceSubmittedAt(
        data?.submitted_at ?? null
      );
    } catch (error) {
      console.error(
        "COACH ATTENDANCE SUBMISSION LOAD ERROR:",
        error
      );
      setAttendanceSubmittedAt(null);
    }
  }

  async function handleSubmitAttendance() {
    if (!selectedLesson || submittingAttendance) return;

    // Submit Attendance is a Coach Roll Call action.
    // It is unavailable before Lesson Start and after the
    // Attendance lock. Automatic synchronization is unaffected.
    if (
      isAttendanceLocked(
        selectedLesson.lesson_date,
        getBusinessTimeAsDate()
      ) ||
      rollCallTimeTick <
        getLessonStartTimestamp(
          selectedLesson.lesson_date,
          selectedLesson.start_time
        )
    ) {
      return;
    }

    const currentUser = await getCurrentUser();

    if (
      !currentUser ||
      currentUser.role !== "coach" ||
      !currentUser.coachId
    ) {
      console.error(
        "COACH ATTENDANCE SUBMISSION ERROR: Coach user not found."
      );
      return;
    }

      try {
      setSubmittingAttendance(true);

        const { data, error } = await supabase
  .from("attendance_submissions")
  .upsert(
    {
      lesson_id: selectedLesson.id,
      coach_id: currentUser.coachId,
      submitted_at: new Date().toISOString(),
    },
    {
      onConflict: "lesson_id",
    }
  )
  .select("submitted_at")
  .single();

      if (error) {
        throw error;
      }

      setAttendanceSubmittedAt(
        data?.submitted_at ??
          new Date().toISOString()
      );
    } catch (error) {
      console.error(
        "COACH ATTENDANCE SUBMISSION ERROR:",
        error
      );
    } finally {
      setSubmittingAttendance(false);
    }
  }

// ======================================================
// Attendance Reminder
//
// Step 1F-C-2-B
//
// IMPORTANT:
// - Reminder only.
// - Does NOT change Attendance.
// - Does NOT submit Attendance.
// - Does NOT change Leave / Make-up.
// - Uses Australia/Brisbane business time.
// ======================================================

async function loadCoachGreeting() {
  const currentUser = await getCurrentUser();

  if (
    !currentUser ||
    currentUser.role !== "coach" ||
    !currentUser.coachId
  ) {
    return;
  }

  const { data, error } = await supabase
    .from("coaches")
    .select("title, first_name")
    .eq("id", currentUser.coachId)
    .single();

  if (error) {
    console.error(
      "COACH REMINDER NAME LOAD ERROR:",
      error
    );
    return;
  }

  const title =
    data?.title?.trim() ?? "";

  const firstName =
    data?.first_name?.trim() ?? "";

  setCoachGreetingName(
    `${title ? `${title} ` : ""}${firstName}`.trim()
  );
}


async function hasReminderBeenSent(
  lessonId: string,
  reminderType:
    | "LESSON_START"
    | "T10"
) {
  const { data, error } =
    await supabase
      .from("attendance_reminder_logs")
      .select("id")
      .eq("lesson_id", lessonId)
      .eq(
        "reminder_type",
        reminderType
      )
      .maybeSingle();

  if (error) {
    console.error(
      "ATTENDANCE REMINDER LOG CHECK ERROR:",
      error
    );

    // Fail closed:
    // Do not risk duplicate reminders.
    return true;
  }

  return Boolean(data);
}


async function checkAttendanceReminder(
  lesson: LessonCard
) {
  if (!lesson) return;

  const now =
    new Date().getTime();

  const lessonStart =
    getLessonStartTimestamp(
      lesson.lesson_date,
      lesson.start_time
    );

  const lessonEnd =
  getLessonStartTimestamp(
    lesson.lesson_date,
    lesson.end_time
  );

const t10 =
  lessonEnd -
  10 * 60 * 1000;

  let reminderType:
    | "LESSON_START"
    | "T10"
    | null = null;

  // Lesson Start reminder:
// Once the lesson has started, show the reminder
// until the T-10 reminder window begins.
//
// The reminder log prevents duplicate display.
if (
  now >= lessonStart &&
  now < t10
) {
  reminderType =
    "LESSON_START";
}

  // T-10 reminder.
  else if (
  now >= t10 &&
  now < lessonEnd
) {
  reminderType = "T10";
}

// ----------------------------------------------------
// 8 PM Brisbane Reminder
//
// IMPORTANT:
// - UI popup only.
// - Email is handled by /api/attendance/reminder-8pm.
// - Do NOT use attendance_reminder_logs to suppress
//   this popup.
// ----------------------------------------------------

const brisbaneNow = getBrisbaneDateParts();
const brisbaneToday = getBrisbaneDate();

const isTodayLesson =
  lesson.lesson_date === brisbaneToday;

const isAfterEightPm =
  brisbaneNow.hour >= 20;

if (
  isTodayLesson &&
  isAfterEightPm
) {
  const popupKey =
    `mychess-attendance-8pm-popup-${lesson.id}`;

  const alreadyShown =
    sessionStorage.getItem(popupKey) === "1";

  if (!alreadyShown) {
    const {
      data: eightPmSubmission,
      error: eightPmSubmissionError,
    } = await supabase
      .from("attendance_submissions")
      .select("submitted_at")
      .eq("lesson_id", lesson.id)
      .maybeSingle();

    if (eightPmSubmissionError) {
      console.error(
        "8PM POPUP SUBMISSION CHECK ERROR:",
        eightPmSubmissionError
      );
    } else if (!eightPmSubmission?.submitted_at) {
      setReminderMessage(
        `Hi ${coachGreetingName}, the attendance for today's lesson has not been submitted yet. Please complete the attendance before 11:59 PM, when attendance will be locked.`
      );

      sessionStorage.setItem(
        popupKey,
        "1"
      );
    }
  }
}

  if (!reminderType) {
    return;
  }

  // ----------------------------------------------------
  // Check Submission
  // ----------------------------------------------------

  const {
    data: submission,
    error: submissionError,
  } = await supabase
    .from("attendance_submissions")
    .select("submitted_at")
    .eq("lesson_id", lesson.id)
    .maybeSingle();

  if (submissionError) {
    console.error(
      "ATTENDANCE REMINDER SUBMISSION CHECK ERROR:",
      submissionError
    );

    return;
  }

  // Already submitted:
  // No Reminder.
  if (submission?.submitted_at) {
    return;
  }

  // ----------------------------------------------------
  // Prevent duplicate Reminder
  // ----------------------------------------------------

  const alreadySent =
    await hasReminderBeenSent(
      lesson.id,
      reminderType
    );

  if (alreadySent) {
    return;
  }

  // ----------------------------------------------------
  // Reminder Message
  // ----------------------------------------------------

  const message =
    reminderType ===
    "LESSON_START"
      ? `Hi ${coachGreetingName}, you can start marking roll call now.`
      : `Hi ${coachGreetingName}, don't forget to make a roll call.`;

  // ----------------------------------------------------
  // Record Reminder
  // ----------------------------------------------------

  const currentUser =
    await getCurrentUser();

  if (
    !currentUser ||
    currentUser.role !== "coach" ||
    !currentUser.coachId
  ) {
    return;
  }

  const {
  error: insertError,
} = await supabase
  .from("attendance_reminder_logs")
  .insert({
    lesson_id: lesson.id,
    coach_id: currentUser.coachId,
    reminder_type: reminderType,
    sent_at: new Date().toISOString(),
  });

if (insertError) {
  // Another reminder check may have inserted
  // the same reminder at the same time.
  //
  // The database unique constraint guarantees
  // that only one reminder log is created.
  // Treat duplicate insert as already handled.
  if (insertError.code === "23505") {
    return;
  }

  console.error(
    "ATTENDANCE REMINDER LOG INSERT ERROR:",
    insertError
  );

  return;
}

  // ----------------------------------------------------
  // Show Popup
  // ----------------------------------------------------

  setReminderMessage(
    message
  );
}


  function formatBrisbaneDateTime(value: string) {
    return new Intl.DateTimeFormat(
      "en-AU",
      {
        timeZone: "Australia/Brisbane",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }
    ).format(new Date(value));
  }


  // ======================================================
  // Student List
  //
  // IMPORTANT:
  // Runner is the only execution gateway.
  //
  // Coach does NOT generate Attendance directly.
  // ======================================================

  async function loadStudents(
    lessonId: string
  ) {

    try {

      await loadAttendanceSubmission(lessonId);

      // --------------------------------------------------
      // 1. Lesson context
      // --------------------------------------------------

      const {
        data: lesson,
        error: lessonError,
      } = await supabase
        .from("lessons")
        .select(`
          id,
          academic_year,
          term,
          class_id
        `)
        .eq(
          "id",
          lessonId
        )
        .single();


      if (lessonError)
        throw lessonError;


      if (!lesson) {
        throw new Error(
          "Lesson not found."
        );
      }


      // --------------------------------------------------
      // 2. Attendance Runner
      //
      // Time Engine + Attendance Engine
      // --------------------------------------------------

    const runnerResult =
  await runAttendanceReconciliation(
    lessonId
  );


// --------------------------------------------------
// 3. Lazy Load Attendance
//
// When a user explicitly opens a Lesson,
// Attendance must be available even if the
// Time Engine does not allow automatic reconciliation.
//
// Future Lesson:
// Runner does not execute
//        ↓
// Explicit Lesson open
//        ↓
// Lazy reconciliation
//
// reconcileAttendance() only inserts missing
// Attendance records and does not overwrite
// existing records.
// --------------------------------------------------

if (!runnerResult.executed) {
  await reconcileAttendance(
    lessonId
  );
}


// --------------------------------------------------
// 4. Sync submitted Leave
// --------------------------------------------------

await syncLeaveRequests(
  lessonId
);

const {
  data: leaveRecords,
  error: leaveError,
} = await supabase
  .from("leave_records")
  .select(
    "student_id, status"
  )
  .eq(
    "lesson_id",
    lessonId
  )
  .eq(
    "status",
    "Submitted"
  );

if (leaveError) {
  throw leaveError;
}

const leaveMap =
  new Map<string, "Submitted">();

for (
  const leave of leaveRecords ?? []
) {
  leaveMap.set(
    leave.student_id,
    "Submitted"
  );
}

      // --------------------------------------------------
      // 4. Load Attendance
      // --------------------------------------------------

      const {
        data,
        error,
      } = await supabase
        .from("attendance")
        .select(`
          *,
          students:student_id (
            id,
            student_code,
            first_name,
            preferred_name,
            last_name,
            current_level,
            school_class
          )
        `)
        .eq(
          "lesson_id",
          lessonId
        )
        .order(
          "created_at"
        );


      if (error)
        throw error;


      // --------------------------------------------------
      // 5. Enrollment snapshots
      // --------------------------------------------------

      const studentIds =
        (data ?? [])
          .map(
            (row: any) =>
              row.student_id
          )
          .filter(Boolean);


      let enrollmentMap =
        new Map<string, any>();


      if (studentIds.length > 0) {

        const {
          data: enrolments,
          error: enrolmentError,
        } = await supabase
          .from("student_enrolments")
          .select(`
            student_id,
            special_request_snapshot,
            medical_snapshot,
            is_trial
          `)
          .in(
            "student_id",
            studentIds
          )
          .eq(
            "academic_year",
            lesson.academic_year
          )
          .eq(
            "term",
            lesson.term
          )
          .eq(
            "class_id",
            lesson.class_id
          )
          .eq(
            "status",
            "Active"
          );


        if (enrolmentError)
          throw enrolmentError;


        for (
          const enrolment
          of enrolments ?? []
        ) {

          enrollmentMap.set(
            enrolment.student_id,
            enrolment
          );
        }
      }


      // --------------------------------------------------
      // 6. Parent contact
      // --------------------------------------------------

      let parentMap =
        new Map<string, any>();


      if (studentIds.length > 0) {

        const {
          data: parents,
          error: parentError,
        } = await supabase
          .from("parents")
          .select(`
            student_id,
            parent1_name,
            mobile
          `)
          .in(
            "student_id",
            studentIds
          );


        if (parentError)
          throw parentError;


        for (
          const parent
          of parents ?? []
        ) {

          parentMap.set(
            parent.student_id,
            parent
          );
        }
      }


      // --------------------------------------------------
      // 7. Build Student List
      // --------------------------------------------------

      const attendanceStudents:
        AttendanceStudent[] =
        (data ?? []).map(
          (row: any) => {

            const enrollment =
              enrollmentMap.get(
                row.student_id
              );

            const parent =
              parentMap.get(
                row.student_id
              );

            const snapshot =
              enrollment
                ?.special_request_snapshot ??
              {};


            return {

              id:
                row.id,

              student_id:
                row.student_id,

              student_code:
                row.students
                  ?.student_code ?? "",

              first_name:
                row.students
                  ?.first_name ?? "",

              preferred_name:
                row.students
                  ?.preferred_name ?? "",

              last_name:
                row.students
                  ?.last_name ?? "",

              student_name:
                `${row.students?.first_name ?? ""}${
                  row.students?.preferred_name?.trim()
                    ? ` (${row.students.preferred_name.trim()})`
                    : ""
                } ${row.students?.last_name ?? ""}`.trim(),

              parent_name:
                parent?.parent1_name ?? "",

              parent_mobile:
                parent?.mobile ?? "",

              current_level:
                row.students
                  ?.current_level ?? "",

              school_class:
                row.students
                  ?.school_class
                  ?.trim() ?? "",

              attendance_status:
                row.attendance_status,

              attendance_type:
                row.attendance_type,

              leave_status:
  leaveMap.get(row.student_id),

              classroom_pickup:
                snapshot.classroom_pickup ??
                false,

              ymca_dropoff:
                snapshot.ymca_dropoff ??
                false,

              walk_home:
                snapshot.walk_home ??
                false,

              has_medical:
                Boolean(
                  enrollment
                    ?.medical_snapshot
                ),

              isTrial:
                row.attendance_type ===
                  "Trial" ||
                enrollment
                  ?.is_trial === true,

              needsPickup:
                snapshot.classroom_pickup ??
                false,

              ymcaDropoff:
                snapshot.ymca_dropoff ??
                false,
            };
          }
        );


      // --------------------------------------------------
      // 8. Frozen Student Priority
      //
      // Trial
      // Make-up
      // Excused / Leave
      // Holiday
      // Classroom Pickup
      // YMCA Drop-off
      // Walk Home
      // Normal
      // --------------------------------------------------

      attendanceStudents.sort(
        (a, b) => {

          const getPriority =
            (
              student:
                AttendanceStudent
            ) => {

              if (
                student.attendance_type ===
                "Trial"
              ) {
                return 1;
              }

              if (
                student.attendance_type ===
                "Make-up"
              ) {
                return 2;
              }

              if (
                student.attendance_type ===
                "Excused"
              ) {
                return 3;
              }

              if (
                student.attendance_type ===
                "Holiday"
              ) {
                return 4;
              }

              if (
                student.classroom_pickup
              ) {
                return 5;
              }

              if (
                student.ymca_dropoff
              ) {
                return 6;
              }

              if (
                student.walk_home
              ) {
                return 7;
              }

              return 8;
            };


          const priorityA =
            getPriority(a);

          const priorityB =
            getPriority(b);


          if (
            priorityA !==
            priorityB
          ) {
            return (
              priorityA -
              priorityB
            );
          }


          return a.student_name.localeCompare(
            b.student_name,
            undefined,
            {
              sensitivity:
                "base",
            }
          );
        }
      );


      // --------------------------------------------------
      // 9. Students
      // --------------------------------------------------

      setStudents(
        attendanceStudents
      );


      // --------------------------------------------------
      // 10. Summary
      // --------------------------------------------------

    const summary =
  calculateAttendanceSummary(
    attendanceStudents
  );

setSummary(summary);


      setHeaderStats((prev) => ({
  ...prev,
  totalStudents: summary.totalStudents,
}));

    } catch (error) {

      console.error(
        "Failed to load Coach attendance students:",
        error
      );
    }
  }


// ======================================================
// Make-up Eligible Students
//
// Frozen:
// - Coach Scope = ALL Active Students from ALL Classes
//   assigned to the current Coach for the Academic
//   Year / Term of the selected Lesson.
// - Credit Source of Truth = makeup_credits
// - Only Available Credits are eligible.
// - Does NOT use students.makeup_credit.
// - Does NOT restrict Make-up to the current Class.
//
// IMPORTANT:
// Make-up is NOT limited to the selected Class.
//
// Example:
// A Coach has:
//   Class A
//   Class B
//   Class C
//   Class D
//
// A student from Class A may make up in Class B/C/D,
// provided the student has an Available Make-up Credit.
// ======================================================

async function loadEligibleStudents() {
  try {

    // ====================================================
    // 1. Selected Lesson Context
    //
    // The selected Lesson determines the current
    // Academic Year / Term for Coach Scope.
    // ====================================================

    if (!selectedLesson) {
      setEligibleStudents([]);
      return;
    }

    const academicYear =
      Number(
        selectedLesson.academic_year
      );

    const term =
      Number(
        selectedLesson.term
      );


    // ====================================================
    // 2. Current Coach Scope
    //
    // IMPORTANT:
    //
    // Scope is ALL classes assigned to this Coach
    // for the selected Lesson's Academic Year / Term.
    //
    // It is NOT the current Class only.
    // ====================================================

    const currentUser = await getCurrentUser();

if (
  !currentUser ||
  currentUser.role !== "coach" ||
  !currentUser.coachId
) {
  setEligibleStudents([]);
  return;
}

    const {
      students: coachStudents,
    } = await getCoachScope(
      currentUser.coachId,
      academicYear,
      term
    );


    // ====================================================
    // 3. No students in Coach Scope
    // ====================================================

    if (
      coachStudents.length === 0
    ) {
      setEligibleStudents([]);
      return;
    }


    // ====================================================
    // 4. Get Available Make-up Credits
    //
    // IMPORTANT:
    //
    // makeup_credits is the ONLY Credit Source of Truth.
    //
    // Do NOT use:
    //
    // students.makeup_credit
    // ====================================================

    const studentIds =
      coachStudents.map(
        (student) =>
          student.student_id
      );


    const {
      data: credits,
      error: creditError,
    } = await supabase
      .from("makeup_credits")
      .select(`
        student_id,
        credits
      `)
      .in(
        "student_id",
        studentIds
      )
      .eq(
        "status",
        "Available"
      )
      .gt(
        "credits",
        0
      );


    if (creditError) {
      throw creditError;
    }


    // ====================================================
    // 5. Build Credit Map
    //
    // A student may have more than one Available Credit.
    //
    // Combine all Available Credits for that student.
    // ====================================================

    const creditMap =
      new Map<
        string,
        number
      >();


    for (
      const credit of credits ?? []
    ) {

      creditMap.set(
        credit.student_id,
        (
          creditMap.get(
            credit.student_id
          ) ?? 0
        ) +
        (
          credit.credits ?? 0
        )
      );
    }


    // ====================================================
    // 6. Build Make-up Eligible Students
    //
    // Coach Scope
    //        +
    // Available Credit
    //        ↓
    // Eligible Students
    //
    // IMPORTANT:
    //
    // The student does NOT need to belong to the
    // currently selected Class.
    // ====================================================

    const eligibleStudents =
      coachStudents
        .map(
          (student) => ({
            id:
              student.student_id,

            student_code:
              student.student_code,

            first_name:
              student.first_name,

            last_name:
              student.last_name,

            current_level:
              (
                student as any
              ).current_level ??
              "",

            makeup_credit:
              creditMap.get(
                student.student_id
              ) ?? 0,
          })
        )
        .filter(
          (student) =>
            student.makeup_credit > 0
        )
        .sort(
          (a, b) =>
            a.student_code.localeCompare(
              b.student_code
            )
        );

    // ====================================================
    // 7. Update UI
    // ====================================================

    setEligibleStudents(
      eligibleStudents
    );

  } catch (error) {

    console.error(
      "LOAD COACH MAKE-UP ELIGIBLE STUDENTS ERROR:",
      error
    );

    throw error;
  }
}

  // ======================================================
  // Open Make-up
  // ======================================================

  async function openMakeupDialog() {

    if (!selectedLesson) {
      return;
    }


    await loadEligibleStudents();

    setShowMakeupDialog(
      true
    );
  }


  // ======================================================
  // Add Make-up Student
  //
  // Coach:
  // - Cannot modify credit directly
  // - Uses available credit
  // - Credit -1
  // - Attendance Type = Make-up
  // ======================================================

async function addMakeupStudent(
  student: any
) {
  if (!selectedLesson) {
    return;
  }

  // ----------------------------------------------------
  // Coach Attendance Lock
  //
  // Frozen rule:
  // - Attendance remains editable until 23:59 Brisbane.
  // - At 00:00 Brisbane, Coach cannot make any
  //   Attendance mutation.
  // - Admin may continue to modify Attendance.
  // ----------------------------------------------------

  if (
    isAttendanceLocked(
      selectedLesson.lesson_date,
      getBusinessTimeAsDate()
    )
  ) {
    await loadStudents(
      selectedLesson.id
    );
    return;
  }

  // ----------------------------------------------------
  // Shared Make-up Business Action
  // Same business logic as Admin Attendance.
  // Coach permission is controlled by the Coach page scope.
  // ----------------------------------------------------

  await addOnSiteMakeupAttendance(
    selectedLesson.id,
    student.id,
    "Coach"
  );

  // ----------------------------------------------------
  // Reload Attendance
  // ----------------------------------------------------

  await loadStudents(
    selectedLesson.id
  );

  // ----------------------------------------------------
  // Reload Available Make-up Students
  // Used Credit should disappear immediately.
  // ----------------------------------------------------

  await loadEligibleStudents();
}


  // ======================================================
  // Load Coach Lessons
  //
  // IMPORTANT:
  // Same Lesson Card architecture as Admin.
  //
  // ONLY difference:
  // first resolve Coach's class IDs,
  // then load Lessons for those classes.
  // ======================================================

  async function loadLessons() {

    setLoading(true);


    try {

      const today =
        new Date().toLocaleDateString(
          "en-CA"
        );


      // --------------------------------------------------
      // 1. Coach Classes
      // --------------------------------------------------

      const currentUser = await getCurrentUser();

if (
  !currentUser ||
  currentUser.role !== "coach" ||
  !currentUser.coachId
) {
  setLessons([]);
  return;
}

const {
  data: coachClasses,
  error: coachClassError,
} = await supabase
  .from("classes")
  .select("id")
  .eq(
    "coach_id",
    currentUser.coachId
  );


      if (coachClassError)
        throw coachClassError;


      const coachClassIds =
        (coachClasses ?? [])
          .map(
            (item) => item.id
          );


      if (
        coachClassIds.length === 0
      ) {

        setLessons([]);

        setHeaderStats({
          totalLessons: 0,
          totalStudents: 0,
          trialCount: 0,
          pickupCount: 0,
          ymcaCount: 0,
        });

        return;
      }


      // --------------------------------------------------
      // 2. Lessons
      // --------------------------------------------------

      const {
        data,
        error,
      } = await supabase
        .from("lessons")
        .select(`
          *,
          classes:class_id (
            class_suffix,
            level,
            start_time,
            end_time,
            campuses:campus_id (
              campus_name
            ),
            coaches:coach_id (
              display_name
            )
          )
        `)
        .in(
          "class_id",
          coachClassIds
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
          "lesson_date"
        )
        .limit(20);


      if (error)
        throw error;


      // --------------------------------------------------
      // 3. Attendance Counts
      // --------------------------------------------------

      const lessonIds =
  (data ?? []).map(
    (lesson: any) =>
      lesson.id
  );

const countMap =
  await getAttendanceStudentCounts(
    lessonIds
  );


      // --------------------------------------------------
      // 4. Build Lesson Cards
      // Same LessonCard used by Admin.
      // --------------------------------------------------

      const lessonCards:
        LessonCard[] =
        (data ?? []).map(
          (lesson: any) => ({

            id:
              lesson.id,

            lesson_date:
              lesson.lesson_date,

            academic_year:
              lesson.academic_year,

            term:
              lesson.term,

            campus:
              lesson.classes
                ?.campuses
                ?.campus_name ?? "",

            level:
              lesson.classes
                ?.level ?? "",

            coach:
              lesson.classes
                ?.coaches
                ?.display_name ?? "",

            start_time:
              lesson.classes
                ?.start_time ?? "",

            end_time:
              lesson.classes
                ?.end_time ?? "",

            studentCount:
              countMap[
                lesson.id
              ] ?? 0,

            status:
              lesson.status,
          })
        );


      setLessons(
        lessonCards
      );


      setHeaderStats({
        totalLessons:
          data?.length ?? 0,

        totalStudents: 0,

        trialCount: 0,

        pickupCount: 0,

        ymcaCount: 0,
      });

    } catch (error) {

      console.error(
        "COACH ATTENDANCE LESSON ERROR:",
        error
      );

    } finally {

      setLoading(false);
    }
  }


  // ======================================================
  // Filter Options
  // ======================================================

  const academicYears =
    Array.from(
      new Set(
        lessons
          .map(
            (lesson) =>
              lesson.academic_year !=
              null
                ? String(
                    lesson.academic_year
                  )
                : ""
          )
          .filter(Boolean)
      )
    ).sort();


  const terms =
    Array.from(
      new Set(
        lessons
          .map(
            (lesson) =>
              lesson.term != null
                ? String(
                    lesson.term
                  )
                : ""
          )
          .filter(Boolean)
      )
    ).sort();


  const campuses =
    Array.from(
      new Set(
        lessons
          .map(
            (lesson) =>
              lesson.campus
          )
          .filter(Boolean)
      )
    ).sort();


  const coaches =
    Array.from(
      new Set(
        lessons
          .map(
            (lesson) =>
              lesson.coach
          )
          .filter(Boolean)
      )
    ).sort();


  // ======================================================
  // Filtered Lessons
  // Same filter logic as Admin.
  // ======================================================

  const filteredLessons =
    lessons.filter(
      (lesson) => {

        const searchText =
          search
            .trim()
            .toLowerCase();


        const matchesSearch =
          !searchText ||
          lesson.campus
            .toLowerCase()
            .includes(
              searchText
            ) ||
          lesson.level
            .toLowerCase()
            .includes(
              searchText
            ) ||
          lesson.coach
            .toLowerCase()
            .includes(
              searchText
            );


        const matchesYear =
          !academicYearFilter ||
          String(
            lesson.academic_year ??
              ""
          ) ===
            academicYearFilter;


        const matchesTerm =
          !termFilter ||
          String(
            lesson.term ??
              ""
          ) ===
            termFilter;


        const matchesCampus =
          !campusFilter ||
          lesson.campus ===
            campusFilter;


        const matchesCoach =
          !coachFilter ||
          lesson.coach ===
            coachFilter;


        return (
          matchesSearch &&
          matchesYear &&
          matchesTerm &&
          matchesCampus &&
          matchesCoach
        );
      }
    );


  // ======================================================
  // Initial Load
  // ======================================================

  useEffect(() => {
    loadLessons();
  }, []);

  useEffect(() => {
  loadCoachGreeting();
}, []);

  useEffect(() => {
    // Read the existing Global Business Time on mount.
    const syncGlobalBusinessTime = () => {
      const enabled = isTestClockEnabled();
      const value = getTestClockValue();

      setRollCallTestClockEnabled(enabled);
      setRollCallTestClockValue(
        value || getLiveBrisbaneDateTimeLocalValue()
      );
      setRollCallTimeTick(
        getBusinessTimeAsDate().getTime()
      );
    };

    syncGlobalBusinessTime();

    // Keep the displayed business time moving while in live mode.
    const interval = window.setInterval(
      () => {
        setRollCallTimeTick(
          getBusinessTimeAsDate().getTime()
        );
      },
      1000
    );

    // A different Portal / tab may change the shared Test Clock.
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === "mychess_test_clock_enabled" ||
        event.key === "mychess_test_clock_value"
      ) {
        syncGlobalBusinessTime();
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, []);

useEffect(() => {
  if (!selectedLesson) {
    return;
  }

  const checkReminder = () => {
    checkAttendanceReminder(
      selectedLesson
    );
  };

  // Check immediately.
  checkReminder();

  // Re-check every 30 seconds.
  const interval =
    window.setInterval(
      checkReminder,
      30 * 1000
    );

  return () => {
    window.clearInterval(
      interval
    );
  };
}, [selectedLesson]);

  // ======================================================
  // Coach Attendance Lock
  //
  // Frozen rule:
  // - Attendance remains editable until 23:59 Brisbane.
  // - At 00:00 Brisbane, Coach Attendance becomes read-only.
  // - Student Quick View remains available.
  //
  // The shared Attendance Time Engine remains the
  // single source of truth.
  // ======================================================

  const attendanceLocked =
    selectedLesson
      ? isAttendanceLocked(
          selectedLesson.lesson_date
        )
      : false;

  // ======================================================
  // Coach Roll Call Availability
  //
  // Frozen rule:
  // - Before Lesson Start: Coach Roll Call is disabled.
  // - At / after Lesson Start: Coach Roll Call is enabled.
  // - At 23:59 / next day: Attendance is locked.
  //
  // IMPORTANT:
  // This guard applies ONLY to Coach Roll Call actions.
  // It does NOT affect Attendance Runner, reconciliation,
  // Leave sync, Trial / Make-up sync, or any other
  // automatic Attendance synchronization.
  // ======================================================
  const rollCallEnabled =
    selectedLesson
      ? !attendanceLocked &&
        rollCallTimeTick >=
          getLessonStartTimestamp(
            selectedLesson.lesson_date,
            selectedLesson.start_time
          )
      : false;


  // ======================================================
  // Render
  //
  // UI is intentionally the same component architecture
  // as Admin Attendance.
  // ======================================================

  return (
    <main className="w-full">

      <div
        className="
          mx-auto
          w-full
          max-w-[1500px]
          px-4
          py-6
          sm:px-6
          sm:py-8
          lg:px-8
          lg:py-10
        "
      >

        <AttendanceHeader
          stats={headerStats}
          onRefresh={loadLessons}
          isAdmin={isAdmin}
          canAddMakeup={
            canAddMakeup
          }
          onAddMakeup={
            openMakeupDialog
          }
        />

        {process.env.NODE_ENV !== "production" && (
          <div
            className="
              fixed
              bottom-4
              right-4
              z-[200]
              w-[min(360px,calc(100vw-2rem))]
              rounded-2xl
              border
              border-[#D4AF37]
              bg-[#071B36]
              p-4
              text-white
              shadow-2xl
            "
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[#F4C542]">
                  Global Business Time
                </div>
                <div className="mt-1 text-xs text-slate-300">
                  Shared UAT clock — Roll Call availability only.
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (rollCallTestClockEnabled) {
                    clearTestClock();
                    setRollCallTestClockEnabled(false);
                    setRollCallTestClockValue(
                      getLiveBrisbaneDateTimeLocalValue()
                    );
                    setRollCallTimeTick(Date.now());
                    return;
                  }

                  const nextValue =
                    rollCallTestClockValue ||
                    getLiveBrisbaneDateTimeLocalValue();

                  setTestClock(nextValue);
                  setRollCallTestClockEnabled(true);
                  setRollCallTestClockValue(nextValue);
                  setRollCallTimeTick(
                    getBusinessTimeAsDate().getTime()
                  );
                }}
                className={`
                  rounded-lg
                  px-3
                  py-1.5
                  text-xs
                  font-semibold
                  ${
                    rollCallTestClockEnabled
                      ? "bg-[#F4C542] text-[#071B36]"
                      : "bg-white/10 text-white"
                  }
                `}
              >
                {rollCallTestClockEnabled
                  ? "TEST ON"
                  : "TEST OFF"}
              </button>
            </div>

            <div className="mt-3">
              <label className="text-xs text-slate-300">
                Brisbane simulated time
              </label>
              <input
                type="datetime-local"
                value={rollCallTestClockValue}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setRollCallTestClockValue(nextValue);

                  if (rollCallTestClockEnabled && nextValue) {
                    setTestClock(nextValue);
                    setRollCallTimeTick(
                      getBusinessTimeAsDate().getTime()
                    );
                  }
                }}
                disabled={!rollCallTestClockEnabled}
                className="
                  mt-1
                  w-full
                  rounded-lg
                  border
                  border-white/20
                  bg-white
                  px-3
                  py-2
                  text-sm
                  text-[#071B36]
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-300">
                Current Roll Call clock
              </span>
              <span className="font-semibold text-[#F4C542]">
                {new Intl.DateTimeFormat("en-AU", {
                  timeZone: "Australia/Brisbane",
                  dateStyle: "short",
                  timeStyle: "medium",
                }).format(
                  new Date(rollCallTimeTick)
                )}
              </span>
            </div>

            {selectedLesson && (
              <div className="mt-2 text-xs text-slate-300">
                {rollCallEnabled
                  ? "Roll Call: ENABLED"
                  : "Roll Call: LOCKED"}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                clearTestClock();
                setRollCallTestClockValue(
                  getLiveBrisbaneDateTimeLocalValue()
                );
                setRollCallTestClockEnabled(false);
                setRollCallTimeTick(Date.now());
              }}
              className="mt-3 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
            >
              Reset to Real Time
            </button>
          </div>
        )}

        {loading ? (

          <div
            className="
              mt-6
              rounded-2xl
              border
              border-[#D9E0E8]
              bg-[#FFFDF8]
              px-5
              py-12
              text-center
              text-sm
              text-[#64748B]
            "
          >
            Loading lessons...
          </div>

        ) : (

          <>

            {/* ==========================================
                Selected Lesson Attendance
            ========================================== */}

            {selectedLesson && (

              <div className="mt-6">

                <AttendanceSummary
                  {...summary}
                />

                <div className="mt-5">

                  <div
                    className="
                      mb-4
                      flex
                      flex-col
                      gap-3
                      rounded-2xl
                      border
                      border-[#D9E0E8]
                      bg-[#FFFDF8]
                      px-4
                      py-4
                      sm:flex-row
                      sm:items-center
                      sm:justify-between
                      sm:px-5
                    "
                  >
                    <div>
                      <div
                        className="
                          text-sm
                          font-semibold
                          text-[#0B2A4A]
                        "
                      >
                        Roll Call
                      </div>

                      {attendanceSubmittedAt ? (
                        <div
                          className="
                            mt-1
                            text-sm
                            text-[#64748B]
                          "
                        >
                          <div
  className="
    mt-1
    text-sm
    text-[#64748B]
  "
>
  {attendanceLocked

    ? "Attendance is now locked for Coach editing."

    : "You can still update attendance before the lesson locks."}

  <br />
  Last submitted{" "}
  <span className="font-medium text-[#0B2A4A]">
    {formatBrisbaneDateTime(
      attendanceSubmittedAt
    )}
  </span>
</div>
                        </div>
                      ) : (
                        <div
                          className="
                            mt-1
                            text-sm
                            text-[#64748B]
                          "
                        >
                          Complete the roll call, then submit attendance.
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleSubmitAttendance}
                      disabled={
                        submittingAttendance ||
                        !rollCallEnabled
                      }
                      className={`
                        inline-flex
                        min-h-[44px]
                        items-center
                        justify-center
                        rounded-xl
                        border
                        px-5
                        py-2.5
                        text-sm
                        font-semibold
                        transition
                        ${
                          attendanceSubmittedAt
  ? "cursor-pointer border-[#16A34A] bg-[#DCFCE7] text-[#15803D] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
  : "border-[#D4AF37] bg-[#071B36] text-[#F4C542] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        }
                      `}
                    >
                      {attendanceLocked
  ? "Attendance Locked"
  : !rollCallEnabled
  ? "Roll Call Not Open"
  : submittingAttendance
  ? "Saving..."
  : attendanceSubmittedAt
  ? "Update Submission"
  : "Submit Attendance"}
                    </button>
                  </div>

                  <AttendanceStudentTable
                    students={
                      students
                    }

                    onStatusChange={
                      handleStatusChange
                    }

                    onStudentClick={(
                      student
                    ) =>
                      setQuickViewStudent(
                        student
                      )
                    }

                    locked={
                      !rollCallEnabled
                    }
                  />

                </div>

              </div>
            )}


            {/* ==========================================
                Lesson Finder
            ========================================== */}

            <div className="mt-6">

              <AttendanceLessonFilters

                search={
                  search
                }

                academicYear={
                  academicYearFilter
                }

                term={
                  termFilter
                }

                campus={
                  campusFilter
                }

                coach={
                  coachFilter
                }

                academicYears={
                  academicYears
                }

                terms={
                  terms
                }

                campuses={
                  campuses
                }

                coaches={
                  coaches
                }

                onSearchChange={
                  setSearch
                }

                onAcademicYearChange={
                  setAcademicYearFilter
                }

                onTermChange={
                  setTermFilter
                }

                onCampusChange={
                  setCampusFilter
                }

                onCoachChange={
                  setCoachFilter
                }

                onClear={() => {

                  setSearch("");

                  setAcademicYearFilter(
                    ""
                  );

                  setTermFilter("");

                  setCampusFilter(
                    ""
                  );

                  setCoachFilter(
                    ""
                  );
                }}
              />

            </div>


            {/* ==========================================
                Lesson List
            ========================================== */}

            <div className="mt-5">

              {filteredLessons.length ===
              0 ? (

                <div
                  className="
                    rounded-xl
                    bg-white
                    px-5
                    py-12
                    text-center
                    text-sm
                    text-[#64748B]
                  "
                >
                  No lessons match your
                  filters.
                </div>

              ) : (

                <div className="space-y-3">

                  {filteredLessons.map(
                    (lesson) => (

                      <AttendanceLessonCard

                        key={
                          lesson.id
                        }

                        lesson={
                          lesson
                        }

                        selected={
                          selectedLesson?.id ===
                          lesson.id
                        }

                        onClick={() => {

                          setSelectedLesson(
                            lesson
                          );

                          loadStudents(
                            lesson.id
                          );
                        }}
                      />

                    )
                  )}

                </div>
              )}

            </div>

          </>
        )}

      </div>


{/* ==================================================
    Shared Make-up Dialog
================================================== */}

{reminderMessage && (
  <div
    className="
      fixed
      inset-0
      z-[100]
      flex
      items-center
      justify-center
      bg-black/40
      px-4
    "
  >
    <div
      className="
        w-full
        max-w-md
        rounded-2xl
        border
        border-[#D4AF37]
        bg-[#FFFDF8]
        p-6
        shadow-2xl
      "
    >
      <div
        className="
          text-lg
          font-semibold
          text-[#0B2A4A]
        "
      >
        Attendance Reminder
      </div>

      <p
        className="
          mt-4
          text-sm
          leading-6
          text-[#475569]
        "
      >
        {reminderMessage}
      </p>

      <button
        type="button"
        onClick={() =>
          setReminderMessage(
            null
          )
        }
        className="
          mt-6
          min-h-[44px]
          w-full
          rounded-xl
          border
          border-[#D4AF37]
          bg-[#071B36]
          px-5
          py-2.5
          text-sm
          font-semibold
          text-[#F4C542]
          hover:opacity-90
        "
      >
        OK
      </button>
    </div>
  </div>
)}

<MakeUpStudentDialog
  open={showMakeupDialog}

  students={eligibleStudents.map(
    (student) => ({
      student_id:
        student.id,

      student_code:
        student.student_code,

      student_name:
        `${student.first_name} ${student.last_name}`.trim(),

      level:
        student.current_level,

      credits:
        student.makeup_credit,
    })
  )}

  onClose={() =>
    setShowMakeupDialog(false)
  }

  onAdd={async (student) => {

    const originalStudent =
      eligibleStudents.find(
        (item) =>
          item.id ===
          student.student_id
      );

    if (!originalStudent) {
      return;
    }

    try {

      await addMakeupStudent(
        originalStudent
      );

      setShowMakeupDialog(false);

    } catch (error) {

      console.error(
        "COACH MAKE-UP ERROR:",
        error
      );
    }
  }}
/>

      {/* ==================================================
          Student Quick View
      ================================================== */}

      <StudentQuickView

        open={
          quickViewStudent !==
          null
        }

        student={
          quickViewStudent
        }

        onClose={() =>
          setQuickViewStudent(
            null
          )
        }

      />

    </main>
  );
}