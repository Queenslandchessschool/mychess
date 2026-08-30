"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/currentUser";

import { getAttendanceStudentCounts } from "@/lib/attendanceStudentCount";
import { calculateAttendanceSummary } from "@/lib/attendanceSummary";
import {
  syncLeaveRequests,
  reverseLeaveRequest,
} from "@/lib/leaveAttendanceSync";

import AttendanceLessonCard from "@/components/attendance/AttendanceLessonCard";
import AttendanceLessonFilters from "@/components/attendance/AttendanceLessonFilters";
import AttendanceSummary from "@/components/attendance/AttendanceSummary";
import AttendanceStudentTable from "@/components/attendance/AttendanceStudentTable";
import StudentQuickView from "@/components/attendance/StudentQuickView";

import type {
  LessonCard,
  AttendanceStudent,
  AttendanceHeaderStats,
  AttendanceSummary as AttendanceSummaryType,
} from "@/components/attendance/types";

/* =========================================================
   Admin Attendance History V2
   =========================================================

   Frozen:
   - Admin scope = ALL classes
   - History = ended lessons only
   - Historical attendance is read-only by default
   - No lazy attendance creation
   - No attendance submission
   - No reminders
   - No automatic reconciliation
   - No leave synchronization
   - Same Attendance UI / VI architecture
   - Same Attendance Student Table
   - locked = true
   - Admin Modify / Override will be added on top of
     this locked historical state
   - Admin Download Excel will be added on top of
     this historical lesson detail

   ========================================================= */

export default function AdminAttendanceHistoryPage() {
  /* =======================================================
     States
     ======================================================= */

  const [loading, setLoading] =
    useState(true);

  const [authorized, setAuthorized] =
    useState(false);

  const [lessons, setLessons] =
    useState<LessonCard[]>([]);

  const [loadingMore, setLoadingMore] =
  useState(false);

const [hasMore, setHasMore] =
  useState(true);

  const [lessonOffset, setLessonOffset] =
  useState(0);

  const [students, setStudents] =
    useState<AttendanceStudent[]>([]);

  const [selectedLesson, setSelectedLesson] =
    useState<LessonCard | null>(null);

  const [isModifying, setIsModifying] =
  useState(false);

const [showModifyDialog, setShowModifyDialog] =
  useState(false);

  const [quickViewStudent, setQuickViewStudent] =
    useState<AttendanceStudent | null>(null);

  const [summary, setSummary] =
    useState<AttendanceSummaryType>({
      totalStudents: 0,
      present: 0,
      absent: 0,
      late: 0,
      leave: 0,
      attendanceRate: 0,
    });

  const [headerStats, setHeaderStats] =
    useState<AttendanceHeaderStats>({
      totalLessons: 0,
      totalStudents: 0,
      trialCount: 0,
      pickupCount: 0,
      ymcaCount: 0,
    });

  /* =======================================================
     Filters
     ======================================================= */

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

  /* =======================================================
     Brisbane Date / Time
     ======================================================= */

  function getBrisbaneNow() {
    return new Date(
      new Date().toLocaleString(
        "en-US",
        {
          timeZone:
            "Australia/Brisbane",
        }
      )
    );
  }

  /* =======================================================
     Lesson End Time
     ======================================================= */

  function getLessonEndTimestamp(
    lessonDate: string,
    endTime: string
  ) {
    const [hours, minutes] =
      endTime
        .slice(0, 5)
        .split(":")
        .map(Number);

    const date =
      new Date(
        `${lessonDate}T00:00:00`
      );

    date.setHours(
      hours || 0,
      minutes || 0,
      0,
      0
    );

    return date.getTime();
  }

  /* =======================================================
     Load Admin History Lessons
     =======================================================

     Admin scope:
       ALL classes

     History:
       ended lessons only

     IMPORTANT:
       We intentionally load a broad range first and then
       determine whether each lesson has ended using the
       lesson's Brisbane-local end time.

     ======================================================= */

async function loadLessons(
  loadMore = false
) {
  if (loadMore) {
    if (
      loadingMore ||
      !hasMore
    ) {
      return;
    }

    setLoadingMore(true);
  } else {
    setLoading(true);
    setLessonOffset(0);
    setHasMore(true);
  }

  try {
    /* ---------------------------------------------------
       1. Admin authentication
       --------------------------------------------------- */

    const currentUser =
      await getCurrentUser();

    if (
      !currentUser ||
      currentUser.role !== "admin"
    ) {
      setAuthorized(false);
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

    setAuthorized(true);

    /* ---------------------------------------------------
       2. Pagination
       --------------------------------------------------- */

    const currentOffset =
      loadMore
        ? lessonOffset
        : 0;

    const pageSize = 15;

    /* ---------------------------------------------------
       3. Load lessons
       --------------------------------------------------- */

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
      .neq(
        "status",
        "Cancelled"
      )

.lte(
  "lesson_date",
  new Date().toLocaleDateString("en-CA")
)
      .order(
        "lesson_date",
        {
          ascending: false,
        }
      )
      .range(
        currentOffset,
        currentOffset +
          pageSize -
          1
      );

    if (error) {
      throw error;
    }

    /* ---------------------------------------------------
       4. Determine whether more records exist
       --------------------------------------------------- */

    setHasMore(
      (data ?? []).length ===
        pageSize
    );

    /* ---------------------------------------------------
       5. History = ended lessons only
       --------------------------------------------------- */

    const now =
      getBrisbaneNow().getTime();

    const endedLessons =
      (data ?? []).filter(
        (lesson: any) => {
          const endTime =
            lesson.classes
              ?.end_time;

          if (
            !lesson.lesson_date ||
            !endTime
          ) {
            return false;
          }

          return (
            getLessonEndTimestamp(
              lesson.lesson_date,
              endTime
            ) < now
          );
        }
      );

    /* ---------------------------------------------------
       6. Attendance counts
       --------------------------------------------------- */

    const lessonIds =
      endedLessons.map(
        (lesson: any) =>
          lesson.id
      );

    const countMap =
      await getAttendanceStudentCounts(
        lessonIds
      );

    /* ---------------------------------------------------
       7. Build lesson cards
       --------------------------------------------------- */

    const newLessonCards:
      LessonCard[] =
      endedLessons.map(
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
              ?.campus_name ??
            "",

          level:
            lesson.classes
              ?.level ??
            "",

          coach:
            lesson.classes
              ?.coaches
              ?.display_name ??
            "",

          start_time:
            lesson.classes
              ?.start_time ??
            "",

          end_time:
            lesson.classes
              ?.end_time ??
            "",

          studentCount:
            countMap[
              lesson.id
            ] ?? 0,

          status:
            "Completed",
        })
      );

    /* ---------------------------------------------------
       8. Append / replace
       --------------------------------------------------- */

    setLessons(
      (previous) =>
        loadMore
          ? [
              ...previous,
              ...newLessonCards,
            ]
          : newLessonCards
    );

    /* ---------------------------------------------------
       9. Advance pagination
       --------------------------------------------------- */

    setLessonOffset(
      currentOffset +
        pageSize
    );

    /* ---------------------------------------------------
       10. Header stats
       --------------------------------------------------- */

    setHeaderStats(
      (previous) => ({
        ...previous,

        totalLessons:
          loadMore
            ? previous.totalLessons +
              newLessonCards.length
            : newLessonCards.length,
      })
    );
  } catch (error) {
    console.error(
      "ADMIN ATTENDANCE HISTORY LESSON ERROR:",
      error
    );

    if (!loadMore) {
      setLessons([]);

      setHeaderStats({
        totalLessons: 0,
        totalStudents: 0,
        trialCount: 0,
        pickupCount: 0,
        ymcaCount: 0,
      });
    }
  } finally {
    if (loadMore) {
      setLoadingMore(false);
    } else {
      setLoading(false);
    }
  }
}

  /* =======================================================
     Load Historical Attendance
     =======================================================

     IMPORTANT:

     History does NOT run:

       - attendanceRunner
       - reconcileAttendance
       - lazy attendance creation
       - leave synchronization
       - make-up synchronization

     It reads the final historical state only.

     ======================================================= */

  function handleModifyClick() {
  if (!selectedLesson) {
    return;
  }

  setShowModifyDialog(true);
}

function handleModifyCancel() {
  setShowModifyDialog(false);
}

function handleModifyConfirm() {
  setShowModifyDialog(false);
  setIsModifying(true);
}
 
// ======================================================
// Admin Attendance History — Override Status Change
//
// Frozen Rule:
// - Historical Attendance is locked by default.
// - Admin may explicitly Override historical Attendance.
// - Coach cannot modify historical Attendance.
//
// Reference:
// - Same Attendance business logic as Coach Attendance.
// - Admin operator is recorded in attendance_logs.
// ======================================================

async function handleAdminStatusChange(
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
  // Reverse submitted Leave first.
  // Same business logic as Coach Attendance.
  // ----------------------------------------------------

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
        "ADMIN HISTORY LEAVE REVERSE LOOKUP ERROR:",
        leaveLookupError
      );

      await loadStudents(
        selectedLesson.id
      );

      return;
    }

    if (!leaveRecord) {
      console.error(
        "ADMIN HISTORY LEAVE REVERSE ERROR: Submitted Leave record not found."
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
        "ADMIN HISTORY LEAVE REVERSE ERROR:",
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
      "ADMIN HISTORY ATTENDANCE UPDATE ERROR:",
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
      "ADMIN HISTORY ATTENDANCE RECORD ERROR:",
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
          "Admin Override",

        new_status:
          status,

        operator:
          "Admin",

        remarks:
          "Attendance overridden from Admin Attendance History page",
      });

    if (logError) {
      console.error(
        "ADMIN HISTORY ATTENDANCE LOG ERROR:",
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

     async function loadStudents(
    lessonId: string
  ) {
    try {
      /* ---------------------------------------------------
         1. Lesson context
         --------------------------------------------------- */

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

      if (lessonError) {
        throw lessonError;
      }

      if (!lesson) {
        throw new Error(
          "Lesson not found."
        );
      }

      /* ---------------------------------------------------
         2. Historical attendance
         --------------------------------------------------- */

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

      if (error) {
        throw error;
      }

      /* ---------------------------------------------------
         3. Student IDs
         --------------------------------------------------- */

      const studentIds =
        (data ?? [])
          .map(
            (row: any) =>
              row.student_id
          )
          .filter(Boolean);

      /* ---------------------------------------------------
         4. Enrollment snapshots
         --------------------------------------------------- */

      const enrollmentMap =
        new Map<
          string,
          any
        >();

      if (
        studentIds.length > 0
      ) {
        const {
          data: enrolments,
          error: enrolmentError,
        } = await supabase
          .from(
            "student_enrolments"
          )
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

        if (enrolmentError) {
          throw enrolmentError;
        }

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

      /* ---------------------------------------------------
         5. Parent contact
         --------------------------------------------------- */

      const parentMap =
        new Map<
          string,
          any
        >();

      if (
        studentIds.length > 0
      ) {
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

        if (parentError) {
          throw parentError;
        }

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

      /* ---------------------------------------------------
         6. Historical Leave Records
         ---------------------------------------------------

         Read only.

         We do NOT synchronize or alter Attendance.

         Submitted Leave remains represented by the
         existing Attendance state and is only read here.
         --------------------------------------------------- */

      const leaveMap =
        new Map<
          string,
          "Submitted"
        >();

      if (
        studentIds.length > 0
      ) {
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

        for (
          const leave
          of leaveRecords ?? []
        ) {
          leaveMap.set(
            leave.student_id,
            "Submitted"
          );
        }
      }

      /* ---------------------------------------------------
         7. Build Attendance Students
         --------------------------------------------------- */

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
                  ?.student_code ??
                "",

              first_name:
                row.students
                  ?.first_name ??
                "",

              preferred_name:
                row.students
                  ?.preferred_name ??
                "",

              last_name:
                row.students
                  ?.last_name ??
                "",

              student_name:
                `${row.students?.first_name ?? ""}${
                  row.students?.preferred_name?.trim()
                    ? ` (${row.students.preferred_name.trim()})`
                    : ""
                } ${
                  row.students?.last_name ??
                  ""
                }`.trim(),

              parent_name:
                parent?.parent1_name ??
                "",

              parent_mobile:
                parent?.mobile ??
                "",

              current_level:
                row.students
                  ?.current_level ??
                "",

              school_class:
                row.students
                  ?.school_class
                  ?.trim() ??
                "",

              attendance_status:
                row.attendance_status,

              attendance_type:
                row.attendance_type,

              leave_status:
                leaveMap.get(
                  row.student_id
                ),

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

      /* ---------------------------------------------------
         8. Frozen Student Priority
         --------------------------------------------------- */

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

      /* ---------------------------------------------------
         9. Students
         --------------------------------------------------- */

      setStudents(
        attendanceStudents
      );

      /* ---------------------------------------------------
         10. Summary
         --------------------------------------------------- */

      const nextSummary =
        calculateAttendanceSummary(
          attendanceStudents
        );

      setSummary(
        nextSummary
      );

      setHeaderStats(
        (prev) => ({
          ...prev,

          totalStudents:
            nextSummary.totalStudents,
        })
      );
    } catch (error) {
      console.error(
        "ADMIN ATTENDANCE HISTORY STUDENT ERROR:",
        error
      );

      setStudents([]);

      setSummary({
        totalStudents: 0,
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
        attendanceRate: 0,
      });
    }
  }

  // ======================================================
  // Admin Attendance History — Download Excel
  // ======================================================

  function handleDownloadExcel() {
  if (!selectedLesson) return;

  const lessonDate =
    selectedLesson.lesson_date ?? "";

  const startTime =
    selectedLesson.start_time?.slice(0, 5) ?? "";

  const endTime =
    selectedLesson.end_time?.slice(0, 5) ?? "";

  const exportRows = students.map((student) => ({
    "Student ID": student.student_id,
    Student: student.student_name,
    "Attendance Status":
      student.attendance_status ?? "",
    "Attendance Type":
      student.attendance_type ?? "",
  }));

  const worksheetData = [
    [
      "Campus",
      selectedLesson.campus ?? "",
    ],
    [
      "Level",
      selectedLesson.level ?? "",
    ],
    [
      "Date",
      lessonDate,
    ],
    [
      "Time",
      `${startTime} - ${endTime}`,
    ],
    [
      "Coach",
      selectedLesson.coach ?? "",
    ],
    [
      "Academic Year",
      selectedLesson.academic_year ?? "",
    ],
    [
      "Term",
      selectedLesson.term ?? "",
    ],
    [],
    [
      "No.",
      "Student ID",
      "Student",
      "Attendance Status",
      "Attendance Type",
    ],
    ...exportRows.map((row, index) => [
      index + 1,
      row["Student ID"],
      row.Student,
      row["Attendance Status"],
      row["Attendance Type"],
    ]),
  ];

  const worksheet =
    XLSX.utils.aoa_to_sheet(worksheetData);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Attendance"
  );

  XLSX.writeFile(
    workbook,
    `Attendance_${lessonDate || "lesson"}.xlsx`
  );
}

  /* =======================================================
     Filter Options
     ======================================================= */

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
              lesson.term !=
              null
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

  /* =======================================================
     Filtered Lessons
     ======================================================= */

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

  /* =======================================================
     Initial Load
     ======================================================= */

  useEffect(() => {
    async function initialise() {
      try {
        const currentUser =
          await getCurrentUser();

        if (
          !currentUser ||
          currentUser.role !==
            "admin"
        ) {
          setAuthorized(false);
          setLoading(false);
          return;
        }

        setAuthorized(true);

        await loadLessons();
      } catch (error) {
        console.error(
          "ADMIN ATTENDANCE HISTORY INITIALIZATION ERROR:",
          error
        );

        setAuthorized(false);
        setLoading(false);
      }
    }

    void initialise();
  }, []);

  /* =======================================================
     Unauthorized
     ======================================================= */

  if (
    !authorized &&
    !loading
  ) {
    return (
      <main className="w-full">
        <div
          className="
            mx-auto
            flex
            min-h-[60vh]
            w-full
            max-w-[1500px]
            items-center
            justify-center
            px-4
            py-10
            sm:px-6
            lg:px-8
          "
        >
          <div
            className="
              rounded-2xl
              border
              border-[#D9E0E8]
              bg-[#FFFDF8]
              px-6
              py-10
              text-center
              shadow-sm
            "
          >
            <p
              className="
                text-sm
                font-semibold
                text-[#10213A]
              "
            >
              Access denied
            </p>

            <p
              className="
                mt-1
                text-sm
                text-[#64748B]
              "
            >
              Admin access is required.
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* =======================================================
     Render
     ======================================================= */

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

        {/* =================================================
            History Header
           ================================================= */}

        <section
          className="
            relative
            overflow-hidden
            rounded-2xl
            border
            border-[#D4AF37]/35
            bg-[#FFFDF8]
            shadow-sm
          "
        >
          <div
            className="
              absolute
              left-0
              right-0
              top-0
              h-[3px]
              bg-gradient-to-r
              from-[#8F6B18]
              via-[#F4D35E]
              to-[#8F6B18]
            "
          />

          <div
            className="
              flex
              flex-col
              gap-5
              px-5
              py-5
              sm:px-6
              sm:py-6
              lg:flex-row
              lg:items-start
              lg:justify-between
            "
          >
            <div>
              <p
                className="
                  text-[11px]
                  font-semibold
                  uppercase
                  tracking-[0.22em]
                  text-[#B28A22]
                  sm:text-xs
                "
              >
                ATTENDANCE HISTORY
              </p>

              <h1
                className="
                  mt-1
                  text-2xl
                  font-bold
                  tracking-tight
                  text-[#10213A]
                  sm:text-3xl
                "
              >
                Past Attendances
              </h1>

              <p
                className="
                  mt-1.5
                  text-sm
                  leading-5
                  text-[#64748B]
                "
              >
                View attendance records from completed lessons.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
  void loadLessons()
}
              className="
                inline-flex
                min-h-[40px]
                items-center
                justify-center
                rounded-xl
                border
                border-[#CBD5E1]
                bg-white
                px-4
                py-2
                text-sm
                font-medium
                text-[#10213A]
                shadow-sm
                transition-all
                duration-200
                hover:border-[#94A3B8]
                hover:bg-[#F8FAFC]
                active:scale-[0.98]
              "
            >
              <span className="mr-1.5 text-base leading-none">
                ↻
              </span>

              Refresh
            </button>
          </div>

          <div
            className="
              grid
              grid-cols-2
              gap-2
              px-5
              pb-5
              sm:px-6
              sm:pb-6
              sm:grid-cols-3
              lg:grid-cols-5
              lg:gap-3
            "
          >
            <HistorySummaryCard
              label="Lessons"
              value={
                headerStats.totalLessons
              }
            />

            <HistorySummaryCard
              label="Students"
              value={
                headerStats.totalStudents
              }
            />
          </div>
        </section>

        {/* =================================================
            Loading
           ================================================= */}

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
            Loading attendance history...
          </div>
        ) : (
          <>
            {/* =============================================
                Selected Historical Lesson
               ============================================= */}

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
                        Attendance History
                      </div>

                      <div
                        className="
                          mt-1
                          text-sm
                          text-[#64748B]
                        "
                      >
                        Attendance is locked for historical records.
                      </div>
                    </div>

<button
  type="button"
  onClick={handleDownloadExcel}
  className="
    inline-flex
    min-h-[40px]
    items-center
    justify-center
    rounded-xl
    border
    border-[#CBD5E1]
    bg-white
    px-4
    py-2
    text-sm
    font-medium
    text-[#10213A]
    shadow-sm
    transition-all
    duration-200
    hover:border-[#94A3B8]
    hover:bg-[#F8FAFC]
    active:scale-[0.98]
  "
>
  <span className="mr-1.5 text-base leading-none">
    ↓
  </span>
  Download
</button>

                   <button
  type="button"
  onClick={handleModifyClick}
  className="
    inline-flex
    min-h-[40px]
    items-center
    justify-center
    rounded-xl
    border
    border-[#D4AF37]
    bg-[#071B36]
    px-4
    py-2
    text-sm
    font-semibold
    text-[#F4C542]
    shadow-sm
    transition
    hover:opacity-90
    active:scale-[0.98]
  "
>
  Modify
</button>
                  </div>

  <AttendanceStudentTable
  students=
{students}
  onStatusChange=
{handleAdminStatusChange}
  onStudentClick={(student
) =>
    setQuickViewStudent(student
)
  }
  locked={!isModifying
}
/>

                </div>
              </div>
            )}

            {/* =============================================
                Lesson Finder
               ============================================= */}

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
                  setAcademicYearFilter("");
                  setTermFilter("");
                  setCampusFilter("");
                  setCoachFilter("");
                }}
              />

            </div>

            {/* =============================================
                Lesson List
               ============================================= */}

            <div className="mt-5">

              {filteredLessons.length ===
              0 ? (
                <div
                  className="
                    rounded-xl
                    border
                    border-[#D9E0E8]
                    bg-white
                    px-5
                    py-12
                    text-center
                    text-sm
                    text-[#64748B]
                  "
                >
                  No historical lessons match your filters.
                </div>
              ) : (
<div className="space-y-3">
  {filteredLessons.map(
    (lesson) => (
      <AttendanceLessonCard
        key={lesson.id}
        lesson={lesson}
        selected={
          selectedLesson?.id === lesson.id
        }
        onClick={() => {
          setSelectedLesson(lesson);
          void loadStudents(lesson.id);
        }}
      />
    )
  )}

  {hasMore && (
    <div className="mt-5 flex justify-center">
      <button
        type="button"
        onClick={() => void loadLessons(true)}
        disabled={loadingMore}
        className="
          inline-flex
          min-h-[40px]
          items-center
          justify-center
          rounded-xl
          border
          border-[#D4AF37]
          bg-[#FFFDF8]
          px-5
          py-2
          text-sm
          font-semibold
          text-[#8A6D1D]
          shadow-sm
          transition-all
          duration-200
          hover:bg-[#FFF8E7]
          disabled:cursor-not-allowed
          disabled:opacity-60
        "
      >
        {loadingMore
          ? "Loading more..."
          : "Load more"}
      </button>
    </div>
   )}
</div>
)}
</div>

{showModifyDialog && (
  <div
    className="
      fixed
      inset-0
      z-50
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
        border-[#D4AF37]/40
        bg-[#FFFDF8]
        p-6
        shadow-2xl
      "
    >
      <h2
        className="
          text-lg
          font-bold
          text-[#10213A]
        "
      >
        Modify Attendance?
      </h2>

      <p
        className="
          mt-2
          text-sm
          leading-6
          text-[#64748B]
        "
      >
        This attendance record is locked.
        Do you want to modify it?
      </p>

      <div
        className="
          mt-6
          flex
          justify-end
          gap-3
        "
      >
        <button
          type="button"
          onClick={handleModifyCancel}
          className="
            inline-flex
            min-h-[40px]
            items-center
            justify-center
            rounded-xl
            border
            border-[#CBD5E1]
            bg-white
            px-5
            py-2
            text-sm
            font-semibold
            text-[#10213A]
            transition
            hover:bg-[#F8FAFC]
          "
        >
          No
        </button>

        <button
          type="button"
          onClick={handleModifyConfirm}
          className="
            inline-flex
            min-h-[40px]
            items-center
            justify-center
            rounded-xl
            border
            border-[#D4AF37]
            bg-[#071B36]
            px-5
            py-2
            text-sm
            font-semibold
            text-[#F4C542]
            transition
            hover:opacity-90
          "
        >
          Yes
        </button>
      </div>
    </div>
  </div>
)}

</>
)}
      </div>

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

/* =========================================================
   History Summary Card
   ========================================================= */

function HistorySummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div
      className="
        flex
        min-h-[72px]
        items-center
        justify-between
        rounded-xl
        border
        border-[#D9E0E8]
        bg-[#F5F9FD]
        px-4
        py-3
      "
    >
      <div>

        <p
          className="
            text-[10px]
            font-semibold
            uppercase
            tracking-[0.14em]
            text-[#64748B]
          "
        >
          {label}
        </p>

        <p
          className="
            mt-1
            text-xl
            font-bold
            leading-none
            text-[#10213A]
          "
        >
          {value}
        </p>

      </div>
    </div>
  );
}