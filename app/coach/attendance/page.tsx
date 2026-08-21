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
  calculateAttendanceSummary,
} from "@/lib/attendanceSummary";
import { runAttendanceReconciliation } from "@/lib/attendanceRunner";
import { reconcileAttendance } from "@/lib/attendanceEngine";
import {
  syncLeaveRequests,
  reverseLeaveRequest,
} from "@/lib/leaveAttendanceSync";
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


// ======================================================
// Coach Permission
//
// Frozen Coach test identity already used by MyCLASS.
// ======================================================

const TEST_COACH_ID =
  "3fef5df8-f438-4258-9c3c-e1cf58a2d0a8";


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
// Coach OLEG has:
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

    const {
      students: coachStudents,
    } = await getCoachScope(
      TEST_COACH_ID,
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

      const {
        data: coachClasses,
        error: coachClassError,
      } = await supabase
        .from("classes")
        .select("id")
        .eq(
          "coach_id",
          TEST_COACH_ID
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