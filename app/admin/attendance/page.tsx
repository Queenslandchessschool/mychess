"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import {
  getAttendanceStudentCounts,
} from "@/lib/attendanceStudentCount";
import {
  calculateAttendanceSummary,
} from "@/lib/attendanceSummary";

import { runAttendanceReconciliation } from "@/lib/attendanceRunner";
import { reconcileAttendance } from "@/lib/attendanceEngine";
import { syncLeaveRequests } from "@/lib/leaveAttendanceSync";
import { reverseLeaveRequest } from "@/lib/leaveAttendanceSync";
import { addOnSiteMakeupAttendance } from "@/lib/makeupAttendance";

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

export default function AttendancePage() {
  // ======================================================
  // States
  // ======================================================

  const [loading, setLoading] = useState(true);

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

  const [quickViewStudent, setQuickViewStudent] =
    useState<AttendanceStudent | null>(null);

  // ======================================================
  // Lesson Filters
  // ======================================================

  const [search, setSearch] = useState("");

  const [academicYearFilter, setAcademicYearFilter] =
    useState("");

  const [termFilter, setTermFilter] =
    useState("");

  const [campusFilter, setCampusFilter] =
    useState("");

  const [coachFilter, setCoachFilter] =
    useState("");

  // ======================================================
  // Permission Framework (Frozen)
  // TODO: Replace with authenticated user role in Module 003
  // ======================================================

  const isAdmin = true;

  // ======================================================
  // Attendance
  // ======================================================

  async function handleStatusChange(
  studentId: string,
  status: AttendanceStudent["attendance_status"]
) {
  if (!selectedLesson) return;

    const currentStudent =
    students.find(
      (student) =>
        student.student_id === studentId
    );

  // ----------------------------------------------------
  // Leave → Present
  //
  // Admin explicitly confirms that a student who was
  // on Leave actually attended the lesson.
  //
  // Use the shared Leave Reverse Engine so that:
  // - Leave is cancelled
  // - Attendance becomes Present
  // - Available Credit is reversed
  // ----------------------------------------------------

 if (
  status === "Present" &&
  currentStudent?.attendance_type === "Excused"
) {

   const {
  data: leaveRecord,
  error: leaveLookupError,
} = await supabase
  .from("leave_records")
  .select("id, student_id, lesson_id, status")
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
        "LEAVE REVERSE LOOKUP ERROR:",
        leaveLookupError
      );

      await loadStudents(
        selectedLesson.id
      );

      return;
    }

    if (!leaveRecord) {
      console.error(
        "LEAVE REVERSE ERROR: Submitted Leave record not found."
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
        "LEAVE REVERSE ERROR:",
        reverseError
      );

      await loadStudents(
        selectedLesson.id
      );

      return;
    }

    await loadStudents(
  selectedLesson.id
);

    return;

    // Shared Reverse Engine has already:
    // Leave → Cancelled
    // Attendance → Present
    // Available Credit → Deleted
    //
    // Continue with the existing attendance audit flow.
  }

  // Optimistic UI update
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

  const { error } = await supabase
    .from("attendance")
    .update({
      attendance_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq("lesson_id", selectedLesson.id)
    .eq("student_id", studentId);

  if (error) {
    console.error("ATTENDANCE UPDATE ERROR:", error);

    // Reload only after a failed update so UI returns to DB state
    await loadStudents(selectedLesson.id);

    return;
  }

  const {
    data: attendanceRecord,
    error: attendanceRecordError,
  } = await supabase
    .from("attendance")
    .select("id")
    .eq("lesson_id", selectedLesson.id)
    .eq("student_id", studentId)
    .single();

  if (attendanceRecordError) {
    console.error(
      "ATTENDANCE RECORD ERROR:",
      attendanceRecordError
    );
    return;
  }

  if (attendanceRecord) {
    const { error: logError } = await supabase
      .from("attendance_logs")
      .insert({
        attendance_id: attendanceRecord.id,
        action: "Status Change",
        new_status: status,
        operator: "Coach",
        remarks:
          "Attendance updated from Attendance page",
      });

    if (logError) {
      console.error(
        "ATTENDANCE LOG ERROR:",
        logError
      );
    }
  }

  // Refresh summary/data only after successful update
  await loadStudents(selectedLesson.id);
}

  // ======================================================
  // Generate Attendance
  // ======================================================

  async function generateAttendance(
    lessonId: string
  ) {
    const {
      data: lesson,
      error: lessonError,
    } = await supabase
      .from("lessons")
      .select(`
        class_id,
        academic_year,
        term
      `)
      .eq("id", lessonId)
      .single();

    if (lessonError) throw lessonError;

    const {
      data: students,
      error: studentError,
    } = await supabase
      .from("student_enrolments")
      .select(`
        student_id,
        students (
          id,
          student_code,
          first_name,
          last_name
        )
      `)
      .eq("class_id", lesson.class_id)
      .eq("academic_year", lesson.academic_year)
      .eq("term", lesson.term)
      .eq("status", "Active");

    if (studentError) throw studentError;

    if ((students ?? []).length === 0) {
      console.warn(
        "No active enrolments found."
      );

      return;
    }

    const attendanceRows =
      (students ?? []).map((item: any) => ({
        lesson_id: lessonId,
        student_id: item.student_id,
        attendance_status: "Present",
        attendance_type: "Regular",
        created_at:
          new Date().toISOString(),
        updated_at:
          new Date().toISOString(),
      }));

    const { error: insertError } =
      await supabase
        .from("attendance")
        .insert(attendanceRows);

    if (insertError) throw insertError;

    await loadStudents(lessonId);
  }

// ======================================================
// Student List Priority
// ======================================================

function getStudentListPriority(
  student: AttendanceStudent
): number {
  // 1. Trial
  if (
    student.isTrial ||
    student.attendance_type === "Trial"
  ) {
    return 1;
  }

  // 2. Leave
  // Leave is represented by Excused attendance type
  if (
    student.attendance_type === "Excused"
  ) {
    return 2;
  }

  // 3. Holiday
  if (
    student.attendance_type === "Holiday"
  ) {
    return 3;
  }

  // 4. Medical
  if (student.has_medical) {
    return 4;
  }

  // 5. Special Request
  if (
    student.classroom_pickup ||
    student.ymca_dropoff ||
    student.walk_home ||
    student.needsPickup ||
    student.ymcaDropoff
  ) {
    return 5;
  }

  // 6. Normal
  return 6;
}

  // ======================================================
  // Load Students
  // ======================================================

    async function loadStudents(lessonId: string) {
  try {

    const {
      data: { session },
    } = await supabase.auth.getSession();

      // ======================================================
      // 1. Get lesson context
      // ======================================================

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
        .eq("id", lessonId)
        .single();

      if (lessonError) throw lessonError;

      // ======================================================
// 2. Reconcile Attendance roster
//
// IMPORTANT:
// This only inserts missing Attendance records.
// Existing Attendance status/type is never overwritten.
// ======================================================

const runnerResult =
  await runAttendanceReconciliation(
    lessonId
  );


// ======================================================
// 3. Lazy Load Attendance
//
// IMPORTANT:
// The Attendance Runner controls automatic reconciliation.
// However, when an Admin/Coach explicitly opens a Lesson,
// the Attendance roster must still be available.
//
// Future lessons are intentionally blocked by the Time Engine
// from automatic reconciliation.
//
// Therefore:
// Runner not executed
//        ↓
// Explicit Lesson open
//        ↓
// Lazy reconciliation
//
// reconcileAttendance() remains idempotent and only inserts
// missing Attendance records.
// ======================================================

if (!runnerResult.executed) {
  await reconcileAttendance(
    lessonId
  );
}


// ======================================================
// 4. Sync submitted leave requests
// ======================================================

await syncLeaveRequests(
  lessonId
);

      // ======================================================
      // 4. Load attendance records + basic Student Master data
      //
      // IMPORTANT:
      // Special-request fields are NOT read directly from
      // students anymore.
      // They are stored in the enrollment snapshot.
      // ======================================================

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
        .eq("lesson_id", lessonId)
        .order("created_at");

      if (error) throw error;

      // ======================================================
      // 4. Load enrollment snapshots for these students
      // ======================================================

      const studentIds = (data ?? [])
        .map((row: any) => row.student_id)
        .filter(Boolean);

      let enrollmentMap = new Map<string, any>();

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
    .in("student_id", studentIds)
    .eq("academic_year", lesson.academic_year)
    .eq("term", lesson.term)
    .eq("class_id", lesson.class_id)
    .eq("status", "Active");

  if (enrolmentError) throw enrolmentError;

  for (const enrolment of enrolments ?? []) {
    enrollmentMap.set(
      enrolment.student_id,
      enrolment
    );
  }
}

// ======================================================
// Load parent contact information
// ======================================================

let parentMap = new Map<string, any>();

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
    .in("student_id", studentIds);

  if (parentError) throw parentError;

  for (const parent of parents ?? []) {
    parentMap.set(
      parent.student_id,
      parent
    );
  }
}
// ======================================================
// Load active submitted Leave records for this lesson
//
// Only Submitted Leave is exposed to the Attendance UI.
// Cancelled Leave is intentionally treated as no active Leave.
// ======================================================

let leaveMap = new Map<string, string>();

if (studentIds.length > 0) {
  const {
    data: leaveRecords,
    error: leaveError,
  } = await supabase
    .from("leave_records")
    .select(`
      student_id,
      status
    `)
    .in("student_id", studentIds)
    .eq("lesson_id", lessonId)
    .eq("status", "Submitted");

  if (leaveError) throw leaveError;

  for (const leave of leaveRecords ?? []) {
    leaveMap.set(
      leave.student_id,
      "Submitted"
    );
  }
}

      // ======================================================
      // 5. Build Attendance Student list
      // ======================================================

      const attendanceStudents: AttendanceStudent[] =
        (data ?? []).map((row: any) => {
          const enrollment =
            enrollmentMap.get(row.student_id);

          const parent = parentMap.get(row.student_id);

          const snapshot =
            enrollment?.special_request_snapshot ?? {};


          return {
            id: row.id,

            student_id:
              row.student_id,

            student_code:
              row.students?.student_code ?? "",

            first_name:
              row.students?.first_name ?? "",

            last_name:
              row.students?.last_name ?? "",

            student_name:
  `${row.students?.first_name ?? ""}${
    row.students?.preferred_name?.trim()
      ? ` (${row.students.preferred_name.trim()})`
      : ""
  } ${row.students?.last_name ?? ""}`.trim(),

            parent_name: parent?.parent1_name ?? "",
parent_mobile: parent?.mobile ?? "",

            current_level:
              row.students?.current_level ?? "",

            school_class:
              row.students?.school_class?.trim() ?? "",

            attendance_status:
              row.attendance_status,

            attendance_type:
              row.attendance_type,

            leave_status:
  leaveMap.get(row.student_id) as
    | "Submitted"
    | "Cancelled"
    | undefined,

 
    // ==================================================
            // Special Request
            // These come from the enrollment snapshot.
            // ==================================================

            classroom_pickup:
              snapshot.classroom_pickup ?? false,

            ymca_dropoff:
              snapshot.ymca_dropoff ?? false,

            walk_home:
              snapshot.walk_home ?? false,

            has_medical:
              Boolean(
                enrollment?.medical_snapshot
              ),

            isTrial:
              row.attendance_type === "Trial" ||
              enrollment?.is_trial === true,

            needsPickup:
              snapshot.classroom_pickup ?? false,

            ymcaDropoff:
              snapshot.ymca_dropoff ?? false,
          };
        });

// ======================================================
// 6. Sort students
//
// Frozen SRS priority:
// 1. Trial
// 2. Make-up
// 3. Excused / Leave
// 4. Holiday
// 5. Classroom Pickup
// 6. YMCA Drop-off
// 7. Walk Home
// 8. Normal
//
// Medical does NOT affect sorting.
// Within each group: A–Z by displayed student name.
// ======================================================

attendanceStudents.sort((a, b) => {
  const getPriority = (student: AttendanceStudent) => {
    // --------------------------------------------------
    // 1. Attendance / enrolment type
    // --------------------------------------------------

    if (student.attendance_type === "Trial") {
      return 1;
    }

    if (student.attendance_type === "Make-up") {
      return 2;
    }

    if (student.attendance_type === "Excused") {
      return 3;
    }

    if (student.attendance_type === "Holiday") {
      return 4;
    }

    // --------------------------------------------------
    // 2. Special Request
    // --------------------------------------------------

    if (student.classroom_pickup) {
      return 5;
    }

    if (student.ymca_dropoff) {
      return 6;
    }

    if (student.walk_home) {
      return 7;
    }

    // --------------------------------------------------
    // 3. Normal
    // --------------------------------------------------

    return 8;
  };

  const priorityA = getPriority(a);
  const priorityB = getPriority(b);

  // First: priority group
  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }

  // Second: A–Z by displayed student name
  return a.student_name.localeCompare(
    b.student_name,
    undefined,
    {
      sensitivity: "base",
    }
  );
});

      // ======================================================
      // 7. Update students
      // ======================================================

      setStudents(attendanceStudents);

      // ======================================================
      // 8. Update attendance summary
      // ======================================================

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
        "Failed to load attendance students:",
        error
      );
    }
  }

// ======================================================
// Load Eligible Make-up Students
//
// M011 Frozen:
//
// Eligible student must have at least one
// makeup_credits record with status = "Available".
//
// IMPORTANT:
// We no longer use students.makeup_credit.
// ======================================================

async function loadEligibleStudents() {
  // ----------------------------------------------------
  // 1. Load Available Make-up Credits
  // ----------------------------------------------------

  const {
    data: availableCredits,
    error: creditError,
  } = await supabase
    .from("makeup_credits")
    .select(`
      id,
      student_id
    `)
    .eq("status", "Available");

  if (creditError) {
    throw creditError;
  }

  const credits =
    availableCredits ?? [];

  if (credits.length === 0) {
    setEligibleStudents([]);
    return;
  }


  // ----------------------------------------------------
  // 2. Build unique Student IDs
  // ----------------------------------------------------

  const studentIds = Array.from(
    new Set(
      credits
        .map(
          (credit) =>
            credit.student_id
        )
        .filter(Boolean)
    )
  );

  if (studentIds.length === 0) {
    setEligibleStudents([]);
    return;
  }


  // ----------------------------------------------------
  // 3. Load Active Students
  //
  // We keep the same student fields currently used
  // by the Make-up dialog.
  // ----------------------------------------------------

  const {
    data: students,
    error: studentError,
  } = await supabase
    .from("students")
    .select(`
      id,
      student_code,
      first_name,
      last_name,
      current_level
    `)
    .in("id", studentIds)
    .eq("status", "Active")
    .order("student_code");

  if (studentError) {
    throw studentError;
  }


  // ----------------------------------------------------
  // 4. Count Available Credits per Student
  //
  // The existing UI still expects:
  //
  // student.makeup_credit
  //
  // We preserve that UI contract for now.
  //
  // The source of truth is now makeup_credits.
  // ----------------------------------------------------

  const creditCount =
    new Map<string, number>();

  for (const credit of credits) {
    if (!credit.student_id) {
      continue;
    }

    creditCount.set(
      credit.student_id,
      (creditCount.get(
        credit.student_id
      ) ?? 0) + 1
    );
  }


  // ----------------------------------------------------
  // 5. Build UI-compatible student list
  // ----------------------------------------------------

  const eligibleStudents =
    (students ?? []).map(
      (student) => ({
        ...student,

        makeup_credit:
          creditCount.get(
            student.id
          ) ?? 0,
      })
    );


  setEligibleStudents(
    eligibleStudents
  );
}

// ======================================================
// Add On-site Make-up Student
//
// M011 Shared Attendance Business Logic
//
// IMPORTANT:
//
// Admin does NOT directly modify Credit.
//
// The shared Make-up Attendance function handles:
//
// Available Credit
//       ↓
// Attendance = Present / Make-up
//       ↓
// Credit = Used
//
// This is the same business logic Coach will use.
// Only the operator / permission scope differs.
// ======================================================

async function addMakeupStudent(
  student: any
) {
  if (!selectedLesson) {
    return;
  }


  // ----------------------------------------------------
  // Shared Make-up Business Action
  // ----------------------------------------------------

  await addOnSiteMakeupAttendance(
    selectedLesson.id,
    student.id,
    "Admin"
  );


  // ----------------------------------------------------
  // Reload Attendance
  // ----------------------------------------------------

  await loadStudents(
    selectedLesson.id
  );


  // ----------------------------------------------------
  // Reload Available Make-up Students
  //
  // The used Credit should immediately disappear
  // from the available list or show the reduced count.
  // ----------------------------------------------------

  await loadEligibleStudents();
}

  // ======================================================
  // Load Lessons
  // ======================================================

  async function loadLessons() {
    setLoading(true);

    try {
      const today =
        new Date().toLocaleDateString(
          "en-CA"
        );

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

      if (error) throw error;

      const lessonIds =
  (data ?? []).map(
    (lesson: any) =>
      lesson.id
  );

const countMap =
  await getAttendanceStudentCounts(
    lessonIds
  );

      const lessonCards:
        LessonCard[] =
        (data ?? []).map(
          (lesson: any) => ({
            id: lesson.id,

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
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // ======================================================
  // Lesson Filter Options
  // ======================================================

  const academicYears =
    Array.from(
      new Set(
        lessons
          .map((lesson) =>
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
          .map((lesson) =>
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
            lesson.term ?? ""
          ) === termFilter;

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

  // ======================================================
  // Render
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
  onAddMakeup={async () => {
    await loadEligibleStudents();
    setShowMakeupDialog(true);
  }}
  isAdmin={isAdmin}
/>

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
            {/* Selected Lesson Attendance */}
            {selectedLesson && (
              <div className="mt-6">
                <AttendanceSummary
                  {...summary}
                />

                <div className="mt-5">
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
                  />
                </div>
              </div>
            )}
 
            {/* Lesson Finder */}
            <div className="mt-6">
              <AttendanceLessonFilters
                search={search}
                academicYear={
                  academicYearFilter
                }
                term={termFilter}
                campus={
                  campusFilter
                }
                coach={
                  coachFilter
                }
                academicYears={
                  academicYears
                }
                terms={terms}
                campuses={campuses}
                coaches={coaches}
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
                  setCoachFilter("");
                }}
              />
            </div>

                                 {/* Lesson List */}
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

 {/* ======================================================
    Shared Make-up Dialog
    ====================================================== */}

<MakeUpStudentDialog
  open={showMakeupDialog}

  students={eligibleStudents.map(
    (student) => ({
      student_id: student.id,

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

    await addMakeupStudent(
      originalStudent
    );

    setShowMakeupDialog(false);
  }}
/>

      {/* Student Quick View */}
      <StudentQuickView
        open={
          quickViewStudent !== null
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