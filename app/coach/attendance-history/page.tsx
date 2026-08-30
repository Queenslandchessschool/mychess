"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

import { getAttendanceStudentCounts } from "@/lib/attendanceStudentCount";
import { getCurrentUser } from "@/lib/currentUser";

import { calculateAttendanceSummary } from "@/lib/attendanceSummary";

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
   Coach Attendance History
   =========================================================
   Frozen:
   - Coach scope = own classes
   - History = ended lessons only
   - Read-only
   - No lazy attendance creation
   - No attendance submission
   - No reminders
   - No make-up
   - Same Attendance UI / VI
   - Same Student Table
   - locked = true
   ========================================================= */

export default function CoachAttendanceHistoryPage() {

  /* =======================================================
     States
     ======================================================= */

  const [loading, setLoading] =
    useState(true);

  const [lessons, setLessons] =
    useState<LessonCard[]>([]);

  const [students, setStudents] =
    useState<AttendanceStudent[]>([]);

  const [selectedLesson, setSelectedLesson] =
    useState<LessonCard | null>(null);

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
          timeZone: "Australia/Brisbane",
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
     Load Coach History Lessons
     ======================================================= */

  async function loadLessons() {

    setLoading(true);

    try {

      /* ---------------------------------------------------
         1. Current Coach
         --------------------------------------------------- */

      const currentUser =
        await getCurrentUser();

      if (
        !currentUser ||
        currentUser.role !== "coach" ||
        !currentUser.coachId
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


      /* ---------------------------------------------------
         2. Coach Classes
         --------------------------------------------------- */

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


      if (coachClassError) {
        throw coachClassError;
      }


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


      /* ---------------------------------------------------
         3. Load Lessons
         ---------------------------------------------------
         We intentionally load a sufficiently broad range
         and determine "ended" using Brisbane lesson time.
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
        .in(
          "class_id",
          coachClassIds
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
        .limit(100);


      if (error) {
        throw error;
      }


      /* ---------------------------------------------------
         4. History = Ended Lessons Only
         --------------------------------------------------- */

      const now =
        getBrisbaneNow().getTime();


      const endedLessons =
        (data ?? []).filter(
          (lesson: any) => {

            const endTime =
              lesson.classes?.end_time;

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
         5. Attendance Counts
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
         6. Build Lesson Cards
         --------------------------------------------------- */

      const lessonCards:
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
              "Completed",
          })
        );


      setLessons(
        lessonCards
      );


      setHeaderStats({
        totalLessons:
          lessonCards.length,

        totalStudents: 0,

        trialCount: 0,

        pickupCount: 0,

        ymcaCount: 0,
      });

    } catch (error) {

      console.error(
        "COACH ATTENDANCE HISTORY LESSON ERROR:",
        error
      );

      setLessons([]);

    } finally {

      setLoading(false);
    }
  }


  /* =======================================================
     Load Historical Attendance
     =======================================================
     IMPORTANT:
     History does NOT run:
       - attendanceRunner
       - reconcileAttendance
       - lazy load
       - leave sync

     It reads the final historical attendance state.
     ======================================================= */

  async function loadStudents(
    lessonId: string
  ) {

    try {

      /* ---------------------------------------------------
         1. Lesson Context
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
         2. Historical Attendance
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
         4. Enrollment Snapshots
         --------------------------------------------------- */

      let enrollmentMap =
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
         5. Parent Contact
         --------------------------------------------------- */

      let parentMap =
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
         6. Leave Records
         ---------------------------------------------------
         Read only.

         IMPORTANT:
         We do not alter Attendance here.
         We only read historical Leave state.
         --------------------------------------------------- */

      let leaveMap =
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
        "COACH ATTENDANCE HISTORY STUDENT ERROR:",
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


  /* =======================================================
     Filter Options
     ======================================================= */

  const academicYears =
    Array.from(
      new Set(
        lessons
          .map(
            (lesson) =>
              lesson.academic_year != null
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
    loadLessons();
  }, []);


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
              onClick={loadLessons}
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


          {/* History Summary */}

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
              value={headerStats.totalLessons}
            />

            <HistorySummaryCard
              label="Students"
              value={headerStats.totalStudents}
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
                        Attendance is locked for Coach editing.
                      </div>

                    </div>


                    <div
                      className="
                        inline-flex
                        min-h-[40px]
                        items-center
                        justify-center
                        rounded-xl
                        border
                        border-[#16A34A]
                        bg-[#DCFCE7]
                        px-4
                        py-2
                        text-sm
                        font-semibold
                        text-[#15803D]
                      "
                    >
                      🔒 Attendance Locked
                    </div>

                  </div>


                  <AttendanceStudentTable
                    students={
                      students
                    }

                    onStatusChange={() => {
                      // Coach History is permanently read-only.
                    }}

                    onStudentClick={(
                      student
                    ) =>
                      setQuickViewStudent(
                        student
                      )
                    }

                    locked={
                      true
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

              {filteredLessons.length === 0 ? (

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
                  No historical lessons match your filters.
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