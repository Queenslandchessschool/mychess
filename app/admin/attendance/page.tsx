"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

import { runAttendanceReconciliation } from "@/lib/attendanceRunner";

import AttendanceHeader from "@/components/attendance/AttendanceHeader";
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

    console.log("ATTENDANCE SESSION:", session);
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

await runAttendanceReconciliation(lessonId);


// ======================================================
// 3. Sync submitted leave requests
// ======================================================

await syncLeaveRequests(lessonId);

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

      const totalStudents =
        attendanceStudents.length;

      const present =
        attendanceStudents.filter(
          (s) =>
            s.attendance_status === "Present"
        ).length;

      const absent =
        attendanceStudents.filter(
          (s) =>
            s.attendance_status === "Absent"
        ).length;

      const late =
        attendanceStudents.filter(
          (s) =>
            s.attendance_status === "Late"
        ).length;

      const leave =
        attendanceStudents.filter(
          (s) =>
            s.attendance_type === "Excused"
        ).length;

      const attendanceRate =
        totalStudents === 0
          ? 0
          : Math.round(
              (
                attendanceStudents.filter(
                  (s) =>
                    s.attendance_status ===
                      "Present" ||
                    s.attendance_status ===
                      "Late"
                ).length *
                100
              ) /
                totalStudents
            );

      setSummary({
        totalStudents,
        present,
        absent,
        late,
        leave,
        attendanceRate,
      });

      setHeaderStats((prev) => ({
        ...prev,
        totalStudents,
      }));

    } catch (error) {
      console.error(
        "Failed to load attendance students:",
        error
      );
    }
  }

  // ======================================================
  // Leave Sync
  // ======================================================

  async function syncLeaveRequests(
    lessonId: string
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("leave_records")
      .select("*")
      .eq("lesson_id", lessonId)
      .eq("status", "Submitted");

    if (error) {
      console.error(error);
      return;
    }

    for (const leave of data ?? []) {
      await supabase
        .from("attendance")
        .update({
          attendance_status: "Excused",
        })
        .eq("lesson_id", lessonId)
        .eq("student_id", leave.student_id);
    }
  }

  // ======================================================
  // Load Eligible Make-up Students
  // ======================================================

  async function loadEligibleStudents() {
    const {
      data,
      error,
    } = await supabase
      .from("students")
      .select(`
        id,
        student_code,
        first_name,
        last_name,
        current_level,
        makeup_credit
      `)
      .gt("makeup_credit", 0)
      .eq("status", "Active")
      .order("student_code");

    if (error) throw error;

    setEligibleStudents(
      data ?? []
    );
  }

  // ======================================================
  // Add Make-up Student
  // ======================================================

  async function addMakeupStudent(
    student: any
  ) {
    if (!selectedLesson) return;

    const { error } =
      await supabase
        .from("attendance")
        .insert({
          lesson_id:
            selectedLesson.id,

          student_id:
            student.id,

          attendance_status:
            "Present",

          attendance_type:
            "Make-up",

          attendance_source:
            "Coach",
        });

    if (error) throw error;

    const {
      error: creditError,
    } = await supabase
      .from("students")
      .update({
        makeup_credit:
          Math.max(
            0,
            student.makeup_credit - 1
          ),
      })
      .eq("id", student.id);

    if (creditError)
      throw creditError;

    await loadStudents(
      selectedLesson.id
    );

    const {
      data: attendanceRecord,
    } = await supabase
      .from("attendance")
      .select("id")
      .eq(
        "lesson_id",
        selectedLesson.id
      )
      .eq(
        "student_id",
        student.id
      )
      .single();

    if (attendanceRecord) {
      await supabase
        .from("attendance_logs")
        .insert({
          attendance_id:
            attendanceRecord.id,

          action:
            "Add Make-up",

          new_status:
            "Present",

          operator:
            "Coach",

          remarks:
            "Make-up lesson added",
        });
    }

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

      const {
        data: attendanceCounts,
      } = await supabase
        .from("attendance")
        .select("lesson_id");

      const countMap:
        Record<string, number> =
        {};

      (attendanceCounts ?? [])
        .forEach((row: any) => {
          countMap[row.lesson_id] =
            (countMap[
              row.lesson_id
            ] ?? 0) + 1;
        });

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

      {/* Add Make-up Dialog */}
      {showMakeupDialog && (
        <div
          className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-black/40
            p-4
          "
        >
          <div
            className="
              w-full
              max-w-[700px]
              rounded-2xl
              bg-white
              p-5
              shadow-xl
              sm:p-6
            "
          >
            <div
              className="
                mb-4
                flex
                items-center
                justify-between
              "
            >
              <h2
                className="
                  text-xl
                  font-semibold
                  text-[#10213A]
                "
              >
                Add Make-up
              </h2>

              <button
                type="button"
                onClick={() =>
                  setShowMakeupDialog(
                    false
                  )
                }
                className="
                  text-[#64748B]
                  transition-colors
                  hover:text-[#10213A]
                "
              >
                ✕
              </button>
            </div>

            <div
              className="
                max-h-[400px]
                overflow-y-auto
              "
            >
              {eligibleStudents.length ===
              0 ? (
                <p className="text-sm text-[#64748B]">
                  No students have available
                  make-up credits.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-[#D9E0E8]">
                      <tr>
                        <th className="py-2 text-left">
                          Code
                        </th>

                        <th className="py-2 text-left">
                          Student
                        </th>

                        <th className="py-2 text-left">
                          Level
                        </th>

                        <th className="py-2 text-center">
                          Credits
                        </th>

                        <th className="py-2 text-center">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {eligibleStudents.map(
                        (student) => (
                          <tr
                            key={
                              student.id
                            }
                            className="
                              border-b
                              border-[#E5EAF0]
                            "
                          >
                            <td className="py-2">
                              {
                                student.student_code
                              }
                            </td>

                            <td className="py-2">
                              {
                                student.first_name
                              }{" "}
                              {
                                student.last_name
                              }
                            </td>

                            <td className="py-2">
                              {
                                student.current_level
                              }
                            </td>

                            <td className="py-2 text-center font-semibold">
                              {
                                student.makeup_credit
                              }
                            </td>

                            <td className="py-2 text-center">
                              <button
                                type="button"
                                onClick={async () => {
                                  await addMakeupStudent(
                                    student
                                  );

                                  setShowMakeupDialog(
                                    false
                                  );
                                }}
                                className="
                                  rounded-lg
                                  bg-[#2161F5]
                                  px-3
                                  py-1.5
                                  text-xs
                                  font-medium
                                  text-white
                                  transition-colors
                                  hover:bg-[#1955DE]
                                "
                              >
                                Add
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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