"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * ============================================================
 * MyCHESS — Parent Portal — Dashboard
 * ============================================================
 *
 * Parent Dashboard rules:
 *
 * 1. Academic Calendar determines which Term the Dashboard
 *    should currently display.
 *
 * 2. If today is inside a configured Term:
 *      → display that Term.
 *
 * 3. If there is a gap between Terms:
 *      → display the next Term.
 *
 * 4. Current Term family dates:
 *      → use current-term Active Enrolment schedule first.
 *      → if the child has not enrolled in the target Term,
 *        use the previous Term class and find that class's
 *        schedule in the target Term.
 *
 * 5. Upcoming Lessons:
 *      → only actual Active Enrolments.
 *      → all future enrolled lessons are displayed.
 *
 * 6. Class schedule dates are always sourced from:
 *      class_schedule.first_lesson
 *      class_schedule.final_lesson
 *
 * 7. Business timezone:
 *      Australia/Brisbane
 *
 * 8. Mobile first.
 * 9. No horizontal scrolling.
 * 10. Upcoming Lessons uses vertical scrolling.
 *
 * ============================================================
 */

type AcademicCalendar = {
  academic_year: number;
  term: number;
  start_date: string;
  end_date: string;
};

type Student = {
  id: string;
  first_name: string | null;
  preferred_name: string | null;
  last_name: string | null;
};

type Enrollment = {
  id: string;
  student_id: string;
  class_id: string | null;
  academic_year: number | string | null;
  term: number | string | null;
  status: string | null;
  created_at: string | null;
};

type ClassInfo = {
  id: string;
  day: string | null;
  start_time: string | null;
  end_time: string | null;
  level: string | null;
  class_suffix: string | null;
  campus:
    | {
        campus_code: string | null;
      }
    | {
        campus_code: string | null;
      }[]
    | null;
};

type ClassSchedule = {
  id: string;
  class_id: string;
  academic_year: number | string;
  term: number | string;
  first_lesson: string | null;
  final_lesson: string | null;
};

type FamilyChild = {
  student: Student;
  currentEnrollment: Enrollment | null;
  currentClassInfo: ClassInfo | null;
  currentSchedule: ClassSchedule | null;
};

type UpcomingLesson = {
  id: string;
  studentId: string;
  academicYear: number;
  term: number;
  lessonDate: string;
  startTime: string;
  endTime: string;
  campus: string;
  level: string;
  suffix: string;
  weekday: string;
};

type ChildUpcoming = {
  child: FamilyChild;
  lessons: UpcomingLesson[];
};

export default function ParentDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] =
    useState<string | null>(null);

  const [parentName, setParentName] =
    useState("");

  const [currentTerm, setCurrentTerm] =
    useState<AcademicCalendar | null>(null);

  const [familyChildren, setFamilyChildren] =
    useState<FamilyChild[]>([]);

  const [familyStartDate, setFamilyStartDate] =
    useState<string | null>(null);

  const [familyEndDate, setFamilyEndDate] =
    useState<string | null>(null);

  const [upcomingByChild, setUpcomingByChild] =
    useState<ChildUpcoming[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  /**
   * ==========================================================
   * LOAD DASHBOARD
   * ==========================================================
   */

  async function loadDashboard() {
    setLoading(true);
    setError(null);

    try {
      /**
       * ------------------------------------------------------
       * 1. Authenticated Parent
       * ------------------------------------------------------
       */

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error(
          "You must be signed in to access the Parent Dashboard."
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
       * 2. Parent / Family
       * ------------------------------------------------------
       */

      const {
        data: parentRecords,
        error: parentError,
      } = await supabase
        .from("parents")
        .select(
          `
            family_id,
            student_id,
            parent1_name
          `
        )
        .ilike("email", email);

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

      const parentRecord =
        parentRecords.find(
          (row) => row.family_id
        );

      setParentName(
        parentRecord?.parent1_name?.trim() ?? ""
      );

      const familyId =
        parentRecord?.family_id ?? null;

      if (!familyId) {
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
        .select("student_id")
        .eq("family_id", familyId);

      if (familyError) {
        throw familyError;
      }

      const studentIds = Array.from(
        new Set(
          (familyParents ?? [])
            .map((row) => row.student_id)
            .filter(Boolean)
        )
      );

      if (studentIds.length === 0) {
        setCurrentTerm(null);
        setFamilyChildren([]);
        setFamilyStartDate(null);
        setFamilyEndDate(null);
        setUpcomingByChild([]);
        return;
      }

      /**
       * ------------------------------------------------------
       * 4. Student Master
       * ------------------------------------------------------
       */

      const {
        data: studentData,
        error: studentError,
      } = await supabase
        .from("students")
        .select(
          `
            id,
            first_name,
            preferred_name,
            last_name
          `
        )
        .in("id", studentIds)
        .order("student_code");

      if (studentError) {
        throw studentError;
      }

      const students =
        (studentData ?? []) as Student[];

      /**
       * ------------------------------------------------------
       * 5. Academic Calendar
       *
       * Determine the Dashboard target Term:
       *
       * A. Today inside a Term
       *    → that Term
       *
       * B. Between Terms
       *    → next Term
       *
       * This prevents the Dashboard from showing the previous
       * Term during a school holiday gap.
       * ------------------------------------------------------
       */

      const today =
        getBrisbaneToday();

      const {
        data: calendarData,
        error: calendarError,
      } = await supabase
        .from("academic_calendar")
        .select(
          `
            academic_year,
            term,
            start_date,
            end_date
          `
        )
        .order("academic_year", {
          ascending: true,
        })
        .order("term", {
          ascending: true,
        });

      if (calendarError) {
        throw calendarError;
      }

      const calendars =
        (calendarData ?? []) as AcademicCalendar[];

      const targetTermIndex =
        resolveTargetTermIndex(
          calendars,
          today
        );

      const targetTerm =
        targetTermIndex >= 0
          ? calendars[targetTermIndex]
          : null;

      const previousTerm =
        targetTermIndex > 0
          ? calendars[targetTermIndex - 1]
          : null;

      setCurrentTerm(targetTerm);

      /**
       * ------------------------------------------------------
       * 6. ALL Family Enrolments
       *
       * We intentionally load historical enrolments as well.
       *
       * Why?
       *
       * If a child has NOT enrolled in the target Term,
       * we need the previous Term's class so that we can find
       * the corresponding target-Term class schedule.
       *
       * Active enrolments are separately used for actual
       * Upcoming Lessons.
       * ------------------------------------------------------
       */

      const {
        data: enrollmentData,
        error: enrollmentError,
      } = await supabase
        .from("student_enrolments")
        .select(
          `
            id,
            student_id,
            class_id,
            academic_year,
            term,
            status,
            created_at
          `
        )
        .in("student_id", studentIds)
        .order("created_at", {
          ascending: false,
        });

      if (enrollmentError) {
        throw enrollmentError;
      }

      const allEnrollments =
        (enrollmentData ?? []) as Enrollment[];

      const activeEnrollments =
        allEnrollments.filter(
          (item) =>
            item.status === "Active"
        );

      /**
       * ------------------------------------------------------
       * 7. Class IDs
       *
       * Include:
       * - all Active Enrolment classes
       * - target-term selected classes
       * - previous-term fallback classes
       * ------------------------------------------------------
       */

      const targetActiveEnrollments =
        targetTerm
          ? activeEnrollments.filter(
              (item) =>
                Number(item.academic_year) ===
                  targetTerm.academic_year &&
                Number(item.term) ===
                  targetTerm.term
            )
          : [];

      const previousEnrollments =
        targetTerm && previousTerm
          ? allEnrollments.filter(
              (item) =>
                Number(item.academic_year) ===
                  previousTerm.academic_year &&
                Number(item.term) ===
                  previousTerm.term
            )
          : [];

      const classIds = Array.from(
        new Set(
          [
            ...activeEnrollments.map(
              (item) => item.class_id
            ),
            ...targetActiveEnrollments.map(
              (item) => item.class_id
            ),
            ...previousEnrollments.map(
              (item) => item.class_id
            ),
          ].filter(Boolean)
        )
      ) as string[];

      /**
       * ------------------------------------------------------
       * 8. Classes
       * ------------------------------------------------------
       */

      const classMap =
        new Map<string, ClassInfo>();

      if (classIds.length > 0) {
        const {
          data: classData,
          error: classError,
        } = await supabase
          .from("classes")
          .select(
            `
              id,
              day,
              start_time,
              end_time,
              level,
              class_suffix,
              campus:campuses(
                campus_code
              )
            `
          )
          .in("id", classIds);

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
       * 9. Class Schedules
       *
       * We load schedules for all relevant classes and terms.
       *
       * Schedule is the authoritative source for:
       * - first_lesson
       * - final_lesson
       * ------------------------------------------------------
       */

      const scheduleMap =
        new Map<string, ClassSchedule>();

      if (classIds.length > 0) {
        const {
          data: scheduleData,
          error: scheduleError,
        } = await supabase
          .from("class_schedule")
          .select(
            `
              id,
              class_id,
              academic_year,
              term,
              first_lesson,
              final_lesson
            `
          )
          .in("class_id", classIds);

        if (scheduleError) {
          throw scheduleError;
        }

        for (const item of scheduleData ?? []) {
          const schedule =
            item as ClassSchedule;

          scheduleMap.set(
            buildScheduleKey(
              schedule.class_id,
              schedule.academic_year,
              schedule.term
            ),
            schedule
          );
        }
      }

      /**
       * ------------------------------------------------------
       * 10. Resolve Current Dashboard Class / Schedule
       *
       * Priority:
       *
       * 1. Target Term Active Enrolment
       * 2. Previous Term Enrolment's Class
       *    → target Term schedule
       *
       * This is ONLY for the Current Term card.
       *
       * It does NOT create Upcoming Lessons for an
       * unregistered child.
       * ------------------------------------------------------
       */

      const result: FamilyChild[] =
        students.map((student) => {
          const targetEnrollment =
            targetTerm
              ? getLatestEnrollment(
                  targetActiveEnrollments,
                  student.id,
                  targetTerm
                )
              : null;

          let currentEnrollment =
            targetEnrollment;

          let currentClassInfo:
            | ClassInfo
            | null = null;

          let currentSchedule:
            | ClassSchedule
            | null = null;

          if (
            targetEnrollment?.class_id &&
            targetTerm
          ) {
            currentClassInfo =
              classMap.get(
                targetEnrollment.class_id
              ) ?? null;

            currentSchedule =
              scheduleMap.get(
                buildScheduleKey(
                  targetEnrollment.class_id,
                  targetTerm.academic_year,
                  targetTerm.term
                )
              ) ?? null;
          }

          /**
           * No target-term enrolment:
           *
           * Find the latest previous-term enrolment
           * for this child.
           */

          if (
            !currentEnrollment &&
            previousTerm
          ) {
            const previousEnrollment =
              getLatestEnrollment(
                previousEnrollments,
                student.id,
                previousTerm
              );

            if (
              previousEnrollment?.class_id &&
              targetTerm
            ) {
              currentEnrollment =
                previousEnrollment;

              currentClassInfo =
                classMap.get(
                  previousEnrollment.class_id
                ) ?? null;

              currentSchedule =
                scheduleMap.get(
                  buildScheduleKey(
                    previousEnrollment.class_id,
                    targetTerm.academic_year,
                    targetTerm.term
                  )
                ) ?? null;
            }
          }

          return {
            student,
            currentEnrollment:
              targetEnrollment,
            currentClassInfo,
            currentSchedule,
          };
        });

      setFamilyChildren(result);

      /**
       * ------------------------------------------------------
       * 11. Current Term Family Course Range
       *
       * IMPORTANT:
       *
       * Dates come from the actual target-term class
       * schedules resolved above.
       *
       * This prevents mixing Term 3 and Term 4 dates.
       * ------------------------------------------------------
       */

      const currentSchedules =
        result
          .map(
            (item) =>
              item.currentSchedule
          )
          .filter(
            (
              item
            ): item is ClassSchedule =>
              !!item?.first_lesson &&
              !!item?.final_lesson
          );

      if (currentSchedules.length > 0) {
        const starts =
          currentSchedules.map(
            (item) =>
              item.first_lesson as string
          );

        const ends =
          currentSchedules.map(
            (item) =>
              item.final_lesson as string
          );

        setFamilyStartDate(
          [...starts].sort()[0] ?? null
        );

        setFamilyEndDate(
          [...ends].sort().at(-1) ?? null
        );
      } else {
        setFamilyStartDate(null);
        setFamilyEndDate(null);
      }

      /**
       * ------------------------------------------------------
       * 12. UPCOMING LESSONS
       *
       * Actual Active Enrolments only.
       *
       * Every future enrolled class schedule is included.
       *
       * There is NO 2-lesson or 4-lesson limit.
       * ------------------------------------------------------
       */

      const latestActiveByStudentTerm =
        new Map<string, Enrollment>();

      for (const enrollment of activeEnrollments) {
        if (
          enrollment.academic_year == null ||
          enrollment.term == null
        ) {
          continue;
        }

        const key =
          `${enrollment.student_id}|` +
          `${enrollment.academic_year}|` +
          `${enrollment.term}`;

        const existing =
          latestActiveByStudentTerm.get(key);

        if (
          !existing ||
          compareCreatedAt(
            enrollment.created_at,
            existing.created_at
          ) > 0
        ) {
          latestActiveByStudentTerm.set(
            key,
            enrollment
          );
        }
      }
      const lessonsByStudent =
        new Map<string, UpcomingLesson[]>();

      // Deduplicate by student ID + actual lesson ID.
      const seenLessonKeys = new Set<string>();

      const addUpcomingLesson = (
        studentId: string,
        lesson: any,
        classInfo: any
      ) => {
        if (
          !lesson?.id ||
          !lesson?.lesson_date ||
          lesson.lesson_date < today ||
          lesson.status === "Cancelled" ||
          !classInfo
        ) {
          return;
        }

        const uniqueKey =
          `${studentId}|${lesson.id}`;

        if (seenLessonKeys.has(uniqueKey)) {
          return;
        }

        seenLessonKeys.add(uniqueKey);

        const campusValue = classInfo.campus;
        const campus = Array.isArray(campusValue)
          ? campusValue[0]?.campus_code ?? ""
          : campusValue?.campus_code ?? "";

        const lessons =
          lessonsByStudent.get(studentId) ?? [];

        lessons.push({
          id: lesson.id,
          studentId,
          academicYear: Number(lesson.academic_year),
          term: Number(lesson.term),
          lessonDate: lesson.lesson_date,
          startTime: formatTime(classInfo.start_time),
          endTime: formatTime(classInfo.end_time),
          campus,
          level: classInfo.level ?? "",
          suffix: classInfo.class_suffix?.trim() ?? "",
          weekday: formatWeekday(
            parseLocalDate(lesson.lesson_date)
          ),
        });

        lessonsByStudent.set(studentId, lessons);
      };

      // Build the active enrolment lookup.
      const enrollmentsByClassTerm =
        new Map<string, Enrollment[]>();

      for (
        const enrollment of
        latestActiveByStudentTerm.values()
      ) {
        if (
          !enrollment.class_id ||
          enrollment.academic_year == null ||
          enrollment.term == null
        ) {
          continue;
        }

        const key = buildScheduleKey(
          enrollment.class_id,
          enrollment.academic_year,
          enrollment.term
        );

        const matching =
          enrollmentsByClassTerm.get(key) ?? [];

        matching.push(enrollment);
        enrollmentsByClassTerm.set(key, matching);
      }

      // 1. Load actual lessons for active enrolments.
      const enrolledClassIds = Array.from(
        new Set(
          Array.from(latestActiveByStudentTerm.values())
            .map((item) => item.class_id)
            .filter((id): id is string => !!id)
        )
      );

      if (enrolledClassIds.length > 0) {
        const {
          data: actualLessonData,
          error: actualLessonError,
        } = await supabase
          .from("lessons")
          .select(`
            id,
            class_id,
            lesson_date,
            academic_year,
            term,
            status,
            classes:class_id (
              id,
              start_time,
              end_time,
              level,
              class_suffix,
              campus:campuses (
                campus_code
              )
            )
          `)
          .in("class_id", enrolledClassIds)
          .gte("lesson_date", today)
          .neq("status", "Cancelled")
          .order("lesson_date", { ascending: true });

        if (actualLessonError) {
          throw actualLessonError;
        }

        for (const lesson of actualLessonData ?? []) {
          if (
            !lesson.class_id ||
            lesson.academic_year == null ||
            lesson.term == null
          ) {
            continue;
          }

          const key = buildScheduleKey(
            lesson.class_id,
            lesson.academic_year,
            lesson.term
          );

          const matchingEnrollments =
            enrollmentsByClassTerm.get(key) ?? [];

          const classValue: any = lesson.classes;
          const classInfo = Array.isArray(classValue)
            ? classValue[0]
            : classValue;

          for (const enrollment of matchingEnrollments) {
            addUpcomingLesson(
              enrollment.student_id,
              lesson,
              classInfo
            );
          }
        }
      }

      // 2. Load successfully booked make-up lessons.
      const {
        data: makeupBookingData,
        error: makeupBookingError,
      } = await supabase
        .from("makeup_bookings")
        .select(`
          id,
          student_id,
          lesson_id,
          status,
          lessons:lesson_id (
            id,
            lesson_date,
            academic_year,
            term,
            status,
            class_id,
            classes:class_id (
              id,
              start_time,
              end_time,
              level,
              class_suffix,
              campus:campuses (
                campus_code
              )
            )
          )
        `)
        .in("student_id", studentIds)
        .eq("status", "Booked");

      if (makeupBookingError) {
        throw makeupBookingError;
      }

      for (const booking of makeupBookingData ?? []) {
        if (
          booking.status !== "Booked" ||
          !booking.student_id
        ) {
          continue;
        }

        const lessonValue: any = booking.lessons;
        const lesson = Array.isArray(lessonValue)
          ? lessonValue[0]
          : lessonValue;

        if (
          !lesson ||
          lesson.status === "Cancelled" ||
          !lesson.lesson_date ||
          lesson.lesson_date < today
        ) {
          continue;
        }

        const classValue: any = lesson.classes;
        const classInfo = Array.isArray(classValue)
          ? classValue[0]
          : classValue;

        addUpcomingLesson(
          booking.student_id,
          lesson,
          classInfo
        );
      }

      /**
       * ------------------------------------------------------
       * 13. Build Upcoming Groups
       * ------------------------------------------------------
       */

      const upcomingGroups =
        students
          .map((student) => {
            const lessons =
              (
                lessonsByStudent.get(
                  student.id
                ) ?? []
              ).sort((a, b) => {
                if (
                  a.lessonDate !==
                  b.lessonDate
                ) {
                  return a.lessonDate.localeCompare(
                    b.lessonDate
                  );
                }

                return a.startTime.localeCompare(
                  b.startTime
                );
              });

            const familyChild =
              result.find(
                (item) =>
                  item.student.id ===
                  student.id
              );

            if (!familyChild) {
              return null;
            }

            return {
              child: familyChild,
              lessons,
            };
          })
          .filter(
            (
              item
            ): item is ChildUpcoming =>
              !!item &&
              item.lessons.length > 0
          );

      /**
       * Sort children by their first upcoming lesson.
       */
      upcomingGroups.sort(
        (a, b) => {
          const aDate =
            a.lessons[0]?.lessonDate ??
            "9999-12-31";

          const bDate =
            b.lessons[0]?.lessonDate ??
            "9999-12-31";

          return (
            aDate.localeCompare(bDate)
          );
        }
      );

      setUpcomingByChild(
        upcomingGroups
      );
    } catch (loadError: any) {
      console.error(
        "PARENT DASHBOARD LOAD ERROR:",
        loadError
      );

      setError(
        loadError?.message ??
          "Unable to load your Parent Dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (loading) {
    return (
      <main className="min-h-screen w-full overflow-x-hidden text-[#10213A]">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
          <section className="overflow-hidden rounded-2xl border border-[#D4AF37]/35 bg-[#152F50]">
            <div className="h-[3px] bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/55 to-transparent" />

            <div className="p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">
                MYCHESS
              </p>

              <p className="mt-3 text-sm text-[#C8D2DF]">
                Loading your dashboard…
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  /**
   * ==========================================================
   * ERROR
   * ==========================================================
   */

  if (error) {
    return (
      <main className="min-h-screen w-full overflow-x-hidden text-[#10213A]">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
          <section className="overflow-hidden rounded-2xl border border-[#D4AF37]/35 bg-[#152F50]">
            <div className="h-[3px] bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/55 to-transparent" />

            <div className="p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">
                MYCHESS
              </p>

              <h1 className="mt-3 text-2xl font-semibold text-[#F4F7FB]">
                Unable to load your dashboard
              </h1>

              <p className="mt-2 text-sm leading-6 text-[#C8D2DF]">
                {error}
              </p>

              <button
                type="button"
                onClick={loadDashboard}
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-[#D4AF37] bg-[#D4AF37] px-5 py-2.5 text-sm font-semibold text-[#011029] transition hover:bg-[#E2C35B] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
              >
                Try Again
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const childCount =
    familyChildren.length;

  const hasMultipleChildren =
    childCount > 1;

  const hasActiveEnrolment =
    upcomingByChild.length > 0;

  const showLinglongCupNews =
    getBrisbaneToday() <= "2026-11-08";

  /**
   * ==========================================================
   * DASHBOARD
   * ==========================================================
   */

  return (
    <main className="min-h-screen w-full overflow-x-hidden text-[#10213A]">
      <div className="mx-auto w-full max-w-[1500px] min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <section className="mb-6 min-w-0 sm:mb-8">
          <h1 className="break-words text-3xl font-bold tracking-tight text-[#F4F7FB] sm:text-4xl">
            Welcome back
            {parentName
              ? `, ${parentName}`
              : ""}
            !
          </h1>

          <div
            aria-hidden="true"
            className="mt-5 h-[2px] w-24 bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/60 to-transparent"
          />
        </section>

        {/* ====================================================
            CURRENT TERM
        ==================================================== */}

        <section className="relative min-w-0 overflow-hidden rounded-2xl border border-[#D4AF37]/35 bg-[#152F50]">
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 top-0 h-[3px] bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/55 to-transparent"
          />

          <div className="min-w-0 p-5 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">
              CURRENT TERM
            </p>

            <div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <p className="break-words text-2xl font-semibold text-[#F4F7FB] sm:text-3xl">
                {currentTerm
                  ? `${currentTerm.academic_year} · Term ${currentTerm.term}`
                  : "No upcoming term"}
              </p>

              {familyStartDate &&
                familyEndDate && (
                  <p className="break-words text-sm font-medium text-[#C8D2DF] sm:text-right">
                    {formatDisplayDate(
                      familyStartDate
                    )}{" "}
                    –{" "}
                    {formatDisplayDate(
                      familyEndDate
                    )}
                  </p>
                )}
            </div>

            {!familyStartDate &&
              !familyEndDate &&
              currentTerm && (
                <p className="mt-2 text-sm text-[#8FA3B8]">
                  No course schedule is currently available for this family.
                </p>
              )}
          </div>
        </section>

        {/* ====================================================
            UPCOMING LESSONS
        ==================================================== */}

        <section className="relative mt-6 min-w-0 overflow-hidden rounded-2xl border border-[#D4AF37]/35 bg-[#152F50] sm:mt-7">
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 top-0 h-[3px] bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/55 to-transparent"
          />

          <div className="h-[320px] min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain">

            {/* Sticky section header */}

            <div className="sticky top-0 z-20 min-w-0 border-b border-[#D9E3ED]/15 bg-[#152F50] px-5 py-5 sm:px-7">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">
                UPCOMING LESSONS
              </p>
            </div>

            {upcomingByChild.length === 0 ? (
              <div className="px-5 py-8 sm:px-7">
                {hasActiveEnrolment ? (
                  <p className="text-sm text-[#C8D2DF]">
                    No upcoming lessons.
                  </p>
                ) : (
                  <p className="text-sm text-[#C8D2DF]">
                    No active enrolments with future lessons.
                  </p>
                )}
              </div>
            ) : (
              <div className="min-w-0">

                {upcomingByChild.map(
                  (group, index) => {
                    const studentName =
                      getStudentDisplayName(
                        group.child.student
                      );

                    return (
                      <div
                        key={
                          group.child.student.id
                        }
                        className="min-w-0 border-b border-[#D9E3ED]/15 last:border-b-0"
                      >

                        {/* Child header */}

                        <div className="min-w-0 border-b border-[#D9E3ED]/10 bg-[#102A49] px-5 py-4 sm:px-7">
                          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">

                            {hasMultipleChildren && (
                              <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.20em] text-[#D4AF37]">
                                CHILD {index + 1}
                              </span>
                            )}

                            <span className="min-w-0 break-words text-lg font-semibold text-[#F4F7FB]">
                              {studentName ||
                                "Student"}
                            </span>
                          </div>
                        </div>

                        {/* Lessons */}

                        {group.lessons.map(
                          (lesson) => {
                            const classLabel =
                              lesson.suffix
                                ? `${lesson.campus} · ${lesson.level} · ${lesson.suffix}`
                                : `${lesson.campus} · ${lesson.level}`;

                            return (
                              <div
                                key={
                                  lesson.id
                                }
                                className="min-w-0 border-b border-[#D9E3ED]/10 px-5 py-5 last:border-b-0 sm:px-7"
                              >
                                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">

                                  <div className="min-w-0 flex-1">
                                    <p className="break-words text-sm font-semibold text-[#F4F7FB]">
                                      {formatDisplayDate(
                                        lesson.lessonDate
                                      )}
                                    </p>

                                    <p className="mt-1 break-words text-sm text-[#C8D2DF]">
                                      {lesson.startTime}
                                      {" – "}
                                      {lesson.endTime}
                                    </p>
                                  </div>

                                  <p className="min-w-0 break-words text-sm font-semibold text-[#F4F7FB] sm:max-w-[48%] sm:text-right">
                                    {classLabel}
                                  </p>
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    );
                  }
                )}

              </div>
            )}
          </div>
        </section>

{/* ====================================================
    LATEST NEWS
==================================================== */}

<section className="relative mt-6 min-w-0 overflow-hidden rounded-2xl border border-[#D4AF37]/35 bg-[#152F50] sm:mt-7">
  <div
    aria-hidden="true"
    className="absolute left-0 right-0 top-0 h-[3px] bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/55 to-transparent"
  />

  <div className="border-b border-[#D9E3ED]/15 px-5 py-5 sm:px-7">
    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">
      LATEST NEWS
    </p>
  </div>

  <div className="space-y-0 divide-y divide-[#D9E3ED]/15">

    {/* Parent User Manual */}
    <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
      <div className="min-w-0">
        <p className="text-base font-semibold text-[#D4AF37]">
          MyCHESS Parent User Manual V1.0
        </p>
        <p className="mt-1 text-sm leading-6 text-[#C8D2DF]">
          A practical guide to using MyCHESS, including attendance,
          Leave, make-up credits, make-up bookings and re-enrolment.
        </p>
        <p className="mt-2 text-xs text-[#AAB8CA]">
          Queensland Chess School · Updated Parent Guide · PDF
        </p>
      </div>

      <a
        href="/documents/parent-user-manual-v1.0.pdf"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#D4AF37]/60 bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-[#011029] transition-colors hover:bg-[#E5C65A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
      >
        <span>View Parent User Manual</span>
        <span aria-hidden="true">↗</span>
      </a>
    </div>

    {/* LINGLONG CUP — automatically hidden after 8 Nov 2026 */}
    {showLinglongCupNews && (
      <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8 sm:px-7 sm:py-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
            2026 TERM 4 · LINGLONG CUP
          </p>

          <h3 className="mt-2 text-xl font-semibold leading-snug text-[#F4F7FB]">
            Junior Chess Championship Registration
          </h3>

          <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-[#C8D2DF] sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="mt-0.5 h-5 w-5 shrink-0 text-[#D4AF37]"
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M16 3v4M8 3v4M3 10h18" />
              </svg>
              <span>Sunday 8 Nov 2026</span>
            </div>

            <div className="flex items-start gap-2">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="mt-0.5 h-5 w-5 shrink-0 text-[#D4AF37]"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              <span>9:30 am – 3:30 pm</span>
            </div>

            <div className="flex items-start gap-2">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="mt-0.5 h-5 w-5 shrink-0 text-[#D4AF37]"
              >
                <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              <span>MacGregor, QLD</span>
            </div>

            <div className="flex items-start gap-2">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="mt-0.5 h-5 w-5 shrink-0 text-[#D4AF37]"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="10" cy="7" r="4" />
                <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>All Juniors Welcome</span>
            </div>
          </div>
        </div>

        <div className="sm:self-start">
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLScrbtLLRqDbXKAeOkrugXQzOuijTRV3nkJws9OoScemM8F9FA/viewform"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#D4AF37] bg-[#D4AF37] px-5 py-3 text-sm font-bold text-[#011029] transition-colors hover:bg-[#E5C65A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] sm:w-auto"
          >
            Register Now
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    )}

  </div>
</section>

      </div>
    </main>
  );
}

/**
 * ==========================================================
 * TERM RESOLUTION
 * ==========================================================
 *
 * Today inside a Term:
 *      → that Term
 *
 * Between Terms:
 *      → next Term
 *
 * This is deliberately based on Academic Calendar.
 */

function resolveTargetTermIndex(
  calendars: AcademicCalendar[],
  today: string
): number {
  if (calendars.length === 0) {
    return -1;
  }

  const currentIndex =
    calendars.findIndex(
      (term) =>
        today >= term.start_date &&
        today <= term.end_date
    );

  if (currentIndex >= 0) {
    return currentIndex;
  }

  const nextIndex =
    calendars.findIndex(
      (term) =>
        term.start_date > today
    );

  return nextIndex;
}

/**
 * ==========================================================
 * LATEST ENROLMENT
 * ==========================================================
 *
 * Re-enrolment creates a new enrolment record.
 * created_at is therefore the reliable ordering field for
 * determining the latest enrolment within the same term.
 */

function getLatestEnrollment(
  enrollments: Enrollment[],
  studentId: string,
  term: AcademicCalendar
): Enrollment | null {
  const matches =
    enrollments
      .filter(
        (item) =>
          item.student_id ===
            studentId &&
          Number(item.academic_year) ===
            term.academic_year &&
          Number(item.term) ===
            term.term
      )
      .sort((a, b) =>
        compareCreatedAt(
          b.created_at,
          a.created_at
        )
      );

  return matches[0] ?? null;
}

function compareCreatedAt(
  a: string | null,
  b: string | null
): number {
  if (a === b) {
    return 0;
  }

  if (!a) {
    return -1;
  }

  if (!b) {
    return 1;
  }

  return (
    new Date(a).getTime() -
    new Date(b).getTime()
  );
}

/**
 * ==========================================================
 * SCHEDULE KEY
 * ==========================================================
 */

function buildScheduleKey(
  classId: string,
  academicYear: number | string,
  term: number | string
): string {
  return `${classId}|${academicYear}|${term}`;
}

/**
 * ==========================================================
 * BRISBANE DATE
 * ==========================================================
 */

function getBrisbaneToday(): string {
  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Australia/Brisbane",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    );

  return formatter.format(
    new Date()
  );
}

/**
 * ==========================================================
 * DATE HELPERS
 * ==========================================================
 */

function parseLocalDate(
  value: string
): Date {
  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  return new Date(
    year,
    month - 1,
    day
  );
}

function formatISODate(
  date: Date
): string {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(
  value: string
): string {
  return new Intl.DateTimeFormat(
    "en-AU",
    {
      weekday: "long",
      day: "numeric",
      month: "short",
    }
  ).format(
    parseLocalDate(value)
  );
}

function formatWeekday(
  date: Date
): string {
  return new Intl.DateTimeFormat(
    "en-AU",
    {
      weekday: "long",
    }
  ).format(date);
}

/**
 * ==========================================================
 * TIME
 * ==========================================================
 */

function formatTime(
  value: string | null
): string {
  if (!value) {
    return "—";
  }

  const [
    hourString,
    minute,
  ] = value.split(":");

  const hour =
    Number(hourString);

  if (
    Number.isNaN(hour) ||
    !minute
  ) {
    return value;
  }

  const suffix =
    hour >= 12
      ? "PM"
      : "AM";

  const displayHour =
    hour % 12 || 12;

  return `${displayHour}:${minute} ${suffix}`;
}

/**
 * ==========================================================
 * STUDENT NAME
 * ==========================================================
 */

function getStudentDisplayName(
  student: Student
): string {
  const preferred =
    student.preferred_name?.trim();

  const first =
    student.first_name?.trim();

  const last =
    student.last_name?.trim();

  return `${preferred || first || ""} ${
    last || ""
  }`.trim();
}