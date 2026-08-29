"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  getAttendanceStudentCounts,
} from "@/lib/attendanceStudentCount";

import {
  calculateAttendanceSummary,
} from "@/lib/attendanceSummary";

import ChessboardBackground from "@/components/layout/ChessboardBackground";
import AttendanceLessonCard from "@/components/attendance/AttendanceLessonCard";
import AttendanceLessonFilters from "@/components/attendance/AttendanceLessonFilters";
import AttendanceSummary from "@/components/attendance/AttendanceSummary";
import AttendanceHeader from "@/components/attendance/AttendanceHeader";

import type {
  LessonCard,
  AttendanceStudent,
  AttendanceHeaderStats,
  AttendanceSummary as AttendanceSummaryType,
} from "@/components/attendance/types";

export default function AdminAttendanceHistoryPage() {
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
  // Load Historical Attendance Students
  //
  // HISTORY IS READ ONLY.
  //
  // This function intentionally performs NO:
  // - attendance generation
  // - reconciliation
  // - leave synchronization
  // - make-up synchronization
  // - attendance updates
  // - make-up creation
  //
  // Historical attendance is display-only.
  // ======================================================

  async function loadStudents(
    lessonId: string
  ) {
    try {
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

      const attendanceStudents:
        AttendanceStudent[] =
        (data ?? []).map(
          (row: any) => {
            return {
              id: row.id,

              student_id:
                row.student_id,

              student_code:
                row.students?.student_code ??
                "",

              first_name:
                row.students?.first_name ??
                "",

              last_name:
                row.students?.last_name ??
                "",

              student_name:
                `${row.students?.first_name ?? ""}${
                  row.students?.preferred_name?.trim()
                    ? ` (${row.students.preferred_name.trim()})`
                    : ""
                } ${
                  row.students?.last_name ?? ""
                }`.trim(),

              parent_name: "",
              parent_mobile: "",

              current_level:
                row.students?.current_level ??
                "",

              school_class:
                row.students?.school_class?.trim() ??
                "",

              attendance_status:
                row.attendance_status,

              attendance_type:
                row.attendance_type,

              leave_status:
                undefined,

              classroom_pickup:
                false,

              ymca_dropoff:
                false,

              walk_home:
                false,

              has_medical:
                false,

              isTrial:
                row.attendance_type ===
                "Trial",

              needsPickup:
                false,

              ymcaDropoff:
                false,
            };
          }
        );

      // ==================================================
      // Frozen historical student ordering
      //
      // Trial
      // Make-up
      // Excused
      // Holiday
      // Normal attendance
      //
      // Alphabetical by student name inside each group.
      // ==================================================

      attendanceStudents.sort(
        (a, b) => {
          const getPriority = (
            student: AttendanceStudent
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
              sensitivity: "base",
            }
          );
        }
      );

      setStudents(
        attendanceStudents
      );

      setSummary(
        calculateAttendanceSummary(
          attendanceStudents
        )
      );

      setHeaderStats(
        (prev) => ({
          ...prev,
          totalStudents:
            attendanceStudents.length,
        })
      );
    } catch (error) {
      console.error(
        "FAILED TO LOAD HISTORICAL ATTENDANCE:",
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
  // Load Past Lessons
  //
  // History = completed lessons only.
  // Cancelled lessons are excluded.
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
        .lt(
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
            ascending: false,
          }
        )
        .limit(20);

      if (error) {
        throw error;
      }

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

      setLessons(
        lessonCards
      );

      setHeaderStats({
        totalLessons:
          lessonCards.length,

        totalStudents:
          0,

        trialCount:
          0,

        pickupCount:
          0,

        ymcaCount:
          0,
      });
    } catch (error) {
      console.error(
        "FAILED TO LOAD ATTENDANCE HISTORY:",
        error
      );

      setLessons([]);
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
  // Helpers
  // ======================================================

  function formatDate(
    value: string
  ) {
    if (!value) {
      return "";
    }

    const date =
      new Date(
        `${value}T00:00:00`
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleDateString(
      "en-AU",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  function formatTime(
    value: string
  ) {
    if (!value) {
      return "";
    }

    const parts =
      value.split(":");

    if (
      parts.length <
      2
    ) {
      return value;
    }

    return `${parts[0]}:${parts[1]}`;
  }

  function getStatusLabel(
  status?: string,
  attendanceType?: string
) {
  if (attendanceType === "Excused") {
    return "Leave";
  }

  switch (status) {
    case "Present":
      return "Present";

    case "Absent":
      return "Absent";

    case "Late":
      return "Late";

    default:
      return status || "—";
  }
}

  function getStatusClasses(
  status?: string,
  attendanceType?: string
) {
  if (attendanceType === "Excused") {
    return `
      bg-[#EFF6FF]
      text-[#1D4ED8]
      border-[#BFDBFE]
    `;
  }

  switch (status) {
    case "Present":
      return `
        bg-[#ECFDF3]
        text-[#15803D]
        border-[#BBF7D0]
      `;

    case "Absent":
      return `
        bg-[#FEF2F2]
        text-[#B91C1C]
        border-[#FECACA]
      `;

    case "Late":
      return `
        bg-[#FFF7ED]
        text-[#C2410C]
        border-[#FED7AA]
      `;

    default:
      return `
        bg-[#F8FAFC]
        text-[#64748B]
        border-[#E2E8F0]
      `;
  }
}

  function getTypeLabel(
    type?: string
  ) {
    switch (type) {
      case "Trial":
        return "Trial";

      case "Make-up":
        return "Make-up";

      case "Excused":
  return "";

      case "Holiday":
        return "Holiday";

      default:
        return "";
    }
  }

  // ======================================================
  // Render
  // ======================================================

  return (
    <ChessboardBackground>
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
  canAddMakeup={false}
  isHistory={true}
/>

          {/* ==================================================
              Loading
             ================================================== */}

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
              {/* ==================================================
                  Selected Historical Lesson
                 ================================================== */}

              {selectedLesson && (
                <div className="mt-6">

                  <AttendanceSummary
                    {...summary}
                  />

                  {/* ==================================================
                      Read-only Student Table
                     ================================================== */}

                  <section
                    className="
                      mt-5
                      overflow-hidden
                      rounded-2xl
                      border
                      border-[#D9E0E8]
                      bg-white
                      shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                    "
                  >

                    {/* Table Header */}

                    <div
                      className="
                        hidden
                        border-b
                        border-[#E6E6E6]
                        bg-[#FFF6E6]
                        px-5
                        py-3
                        text-xs
                        font-semibold
                        uppercase
                        tracking-wide
                        text-[#64748B]
                        md:grid
                        md:grid-cols-[minmax(220px,1.8fr)_120px_140px_120px]
                        md:gap-4
                      "
                    >
                      <div>
                        Student
                      </div>

                      <div>
                        Level
                      </div>

                      <div>
                        Attendance
                      </div>

                      <div>
                        Type
                      </div>
                    </div>

                    <div>
                      {students.length ===
                      0 ? (
                        <div
                          className="
                            px-5
                            py-12
                            text-center
                            text-sm
                            text-[#64748B]
                          "
                        >
                          No attendance
                          records found
                          for this lesson.
                        </div>
                      ) : (
                        students.map(
                          (
                            student,
                            index
                          ) => {
                            const typeLabel =
                              getTypeLabel(
                                student.attendance_type
                              );

                            return (
                              <div
                                key={
                                  student.id ??
                                  student.student_id
                                }
                                className={`
                                  border-b
                                  border-[#E6E6E6]
                                  px-5
                                  py-4
                                  last:border-b-0
                                  ${
                                    index %
                                      2 ===
                                    1
                                      ? "bg-[#FFFDF8]"
                                      : "bg-white"
                                  }
                                `}
                              >

                                {/* Desktop */}

                                <div
                                  className="
                                    hidden
                                    md:grid
                                    md:grid-cols-[minmax(220px,1.8fr)_120px_140px_120px]
                                    md:items-center
                                    md:gap-4
                                  "
                                >
                                  <div
                                    className="
                                      min-w-0
                                    "
                                  >
                                    <div
                                      className="
                                        truncate
                                        text-sm
                                        font-semibold
                                        text-[#102B4D]
                                      "
                                    >
                                      {
                                        student.student_name
                                      }
                                    </div>

                                    {student.school_class && (
                                      <div
                                        className="
                                          mt-0.5
                                          truncate
                                          text-xs
                                          text-[#94A3B8]
                                        "
                                      >
                                        {
                                          student.school_class
                                        }
                                      </div>
                                    )}
                                  </div>

                                  <div
                                    className="
                                      text-sm
                                      text-[#475569]
                                    "
                                  >
                                    {
                                      student.current_level ||
                                      "—"
                                    }
                                  </div>

                                  <div>
                                    <span
                                      className={`
                                        inline-flex
                                        rounded-full
                                        border
                                        px-2.5
                                        py-1
                                        text-xs
                                        font-semibold
                                        ${getStatusClasses
(
  student.
attendance_status,
  student.
attendance_type
)}
                                      `}
                                    >
                                      {
                                        getStatusLabel(
  student.attendance_status,
  student.attendance_type
)
                                      }
                                    </span>
                                  </div>

                                  <div>
                                    {typeLabel ? (
                                      <span
                                        className="
                                          inline-flex
                                          rounded-full
                                          border
                                          border-[#D4AF37]/40
                                          bg-[#D4AF37]/10
                                          px-2.5
                                          py-1
                                          text-xs
                                          font-semibold
                                          text-[#8A6D1D]
                                        "
                                      >
                                        {
                                          typeLabel
                                        }
                                      </span>
                                    ) : (
                                      <span
                                        className="
                                          text-sm
                                          text-[#94A3B8]
                                        "
                                      >
                                        —
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Mobile */}

                                <div
                                  className="
                                    md:hidden
                                  "
                                >
                                  <div
                                    className="
                                      flex
                                      items-start
                                      justify-between
                                      gap-4
                                    "
                                  >
                                    <div
                                      className="
                                        min-w-0
                                        flex-1
                                      "
                                    >
                                      <div
                                        className="
                                          text-sm
                                          font-semibold
                                          text-[#102B4D]
                                        "
                                      >
                                        {
                                          student.student_name
                                        }
                                      </div>

                                      {student.school_class && (
                                        <div
                                          className="
                                            mt-0.5
                                            text-xs
                                            text-[#94A3B8]
                                          "
                                        >
                                          {
                                            student.school_class
                                          }
                                        </div>
                                      )}
                                    </div>

                                    <span
                                      className={`
                                        shrink-0
                                        rounded-full
                                        border
                                        px-2.5
                                        py-1
                                        text-xs
                                        font-semibold
                                        ${getStatusClasses
(
  student.
attendance_status,
  student.
attendance_type
)}
                                      `}
                                    >
                                      {
                                        getStatusLabel(
  student.attendance_status,
  student.attendance_type
)
                                      }
                                    </span>
                                  </div>

                                  <div
                                    className="
                                      mt-3
                                      flex
                                      flex-wrap
                                      gap-x-5
                                      gap-y-2
                                    "
                                  >
                                    <div>
                                      <span
                                        className="
                                          text-xs
                                          text-[#94A3B8]
                                        "
                                      >
                                        Level
                                      </span>

                                      <span
                                        className="
                                          ml-1.5
                                          text-xs
                                          font-medium
                                          text-[#475569]
                                        "
                                      >
                                        {
                                          student.current_level ||
                                          "—"
                                        }
                                      </span>
                                    </div>

                                    {typeLabel && (
                                      <div>
                                        <span
                                          className="
                                            text-xs
                                            text-[#94A3B8]
                                          "
                                        >
                                          Type
                                        </span>

                                        <span
                                          className="
                                            ml-1.5
                                            text-xs
                                            font-medium
                                            text-[#8A6D1D]
                                          "
                                        >
                                          {
                                            typeLabel
                                          }
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                              </div>
                            );
                          }
                        )
                      )}
                    </div>
                  </section>
                </div>
              )}

              {/* ==================================================
                  Lesson Finder
                 ================================================== */}

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

                    setTermFilter(
                      ""
                    );

                    setCampusFilter(
                      ""
                    );

                    setCoachFilter(
                      ""
                    );
                  }}
                />
              </div>

              {/* ==================================================
                  Historical Lesson List
                 ================================================== */}

              <div className="mt-5">
                {filteredLessons.length ===
                0 ? (
                  <div
                    className="
                      rounded-2xl
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
                    No past lessons
                    match your
                    filters.
                  </div>
                ) : (
                  <div
                    className="
                      space-y-3
                    "
                  >
                    {filteredLessons.map(
                      (
                        lesson
                      ) => (
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

                            void loadStudents(
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
      </main>
    </ChessboardBackground>
  );
}