"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * ============================================================
 * MyCHESS — Parent Portal — Dashboard v1.0
 * ============================================================
 *
 * Frozen architecture:
 *
 * Authenticated Parent
 *        ↓
 * Parent Email
 *        ↓
 * Family ID
 *        ↓
 * Family Children
 *        ↓
 * Active Current-Term Enrolment
 *        ↓
 * Current Class
 *        ↓
 * class_schedule
 *
 * IMPORTANT:
 * - Academic Calendar determines the current Year / Term only.
 * - Family displayed Start / End dates come from the actual
 *   class schedules of all current-term children.
 * - Family Start = earliest First Lesson.
 * - Family End   = latest Final Lesson.
 *
 * Child label rule:
 * - One child  → do NOT display "Child 1"
 * - 2+ children → display "Child 1", "Child 2", etc.
 *
 * Upcoming lesson rule:
 * - Each child is calculated independently.
 * - Uses actual class_schedule first_lesson / final_lesson.
 * - Lessons repeat weekly.
 * - Does NOT use School Week.
 *
 * Time / date interpretation:
 * - Australia/Brisbane
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
  enrollment: Enrollment | null;
  classInfo: ClassInfo | null;
  schedule: ClassSchedule | null;
};

type UpcomingLesson = {
  id: string;
  studentId: string;
  lessonDate: string;
  startTime: string;
  endTime: string;
  campus: string;
  level: string;
  suffix: string;
};

type ChildUpcoming = {
  child: FamilyChild;
  lessons: UpcomingLesson[];
};

export default function ParentDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [parentEmail, setParentEmail] = useState("");
  const [parentName, setParentName] = useState("");
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
   * Load Parent Dashboard
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

      setParentEmail(email);

      /**
       * ------------------------------------------------------
       * 2. Current Academic Term
       *
       * Academic Calendar determines:
       * - Academic Year
       * - Term
       *
       * It does NOT determine the Family displayed dates.
       * ------------------------------------------------------
       */

      const today = getBrisbaneToday();

      const {
        data: calendarData,
        error: calendarError,
      } = await supabase
        .from("academic_calendar")
        .select(`
          academic_year,
          term,
          start_date,
          end_date
        `)
        .lte("start_date", today)
        .gte("end_date", today)
        .order("academic_year", {
          ascending: false,
        })
        .order("term", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (calendarError) {
        throw calendarError;
      }

      if (!calendarData) {
        setCurrentTerm(null);
        setFamilyChildren([]);
        setUpcomingByChild([]);
        setFamilyStartDate(null);
        setFamilyEndDate(null);
        return;
      }

      const termData =
        calendarData as AcademicCalendar;

      setCurrentTerm(termData);

      /**
       * ------------------------------------------------------
       * 3. Resolve Family
       *
       * Same Family Scope architecture as MyFAMILY.
       * ------------------------------------------------------
       */

      const {
  data: parentRecords,
  error: parentError,
} = await supabase
  .from("parents")
  .select(`
    family_id,
    student_id,
    parent1_name
  `)
  .eq("email", email);

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

      const parentRecord = parentRecords.find(
  (row) => row.family_id
);

setParentName(
  parentRecord?.parent1_name?.trim() ?? ""
);

      const familyId =
        parentRecords.find(
          (row) => row.family_id
        )?.family_id ?? null;

      if (!familyId) {
        throw new Error(
          "Your Parent record does not have a Family ID."
        );
      }

      /**
       * ------------------------------------------------------
       * 4. Family Children
       * ------------------------------------------------------
       */

      const {
        data: familyParents,
        error: familyError,
      } = await supabase
        .from("parents")
        .select(`
          student_id
        `)
        .eq("family_id", familyId);

      if (familyError) {
        throw familyError;
      }

      const studentIds =
        Array.from(
          new Set(
            (familyParents ?? [])
              .map(
                (row) => row.student_id
              )
              .filter(Boolean)
          )
        );

      if (studentIds.length === 0) {
        setFamilyChildren([]);
        setUpcomingByChild([]);
        setFamilyStartDate(null);
        setFamilyEndDate(null);
        return;
      }

      /**
       * ------------------------------------------------------
       * 5. Student Master
       * ------------------------------------------------------
       */

      const {
        data: studentData,
        error: studentError,
      } = await supabase
        .from("students")
        .select(`
          id,
          first_name,
          preferred_name,
          last_name
        `)
        .in("id", studentIds)
        .order("student_code");

      if (studentError) {
        throw studentError;
      }

      const students =
        (studentData ?? []) as Student[];

      /**
       * ------------------------------------------------------
       * 6. Current-Term Active Enrolment
       *
       * Important:
       * We only use the current Academic Year / Term.
       * ------------------------------------------------------
       */

      const {
        data: enrollmentData,
        error: enrollmentError,
      } = await supabase
        .from("student_enrolments")
        .select(`
          id,
          student_id,
          class_id,
          academic_year,
          term,
          status
        `)
        .in("student_id", studentIds)
        .eq("academic_year", termData.academic_year)
        .eq("term", termData.term)
        .eq("status", "Active");

      if (enrollmentError) {
        throw enrollmentError;
      }

      const enrollments =
        (enrollmentData ?? []) as Enrollment[];

      /**
       * ------------------------------------------------------
       * 7. Current Classes
       * ------------------------------------------------------
       */

      const classIds =
        Array.from(
          new Set(
            enrollments
              .map(
                (item) => item.class_id
              )
              .filter(Boolean)
          )
        ) as string[];

      let classMap =
        new Map<string, ClassInfo>();

      if (classIds.length > 0) {
        const {
          data: classData,
          error: classError,
        } = await supabase
          .from("classes")
          .select(`
            id,
            day,
            start_time,
            end_time,
            level,
            class_suffix,
            campus:campuses(
              campus_code
            )
          `)
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
       * 8. Actual Class Schedules
       *
       * THIS is the source for:
       * - Family Start
       * - Family End
       * - Upcoming Lessons
       *
       * NOT academic_calendar.start_date/end_date.
       * ------------------------------------------------------
       */

      let scheduleMap =
        new Map<string, ClassSchedule>();

      if (classIds.length > 0) {
        const {
          data: scheduleData,
          error: scheduleError,
        } = await supabase
          .from("class_schedule")
          .select(`
            id,
            class_id,
            academic_year,
            term,
            first_lesson,
            final_lesson
          `)
          .in("class_id", classIds)
          .eq(
            "academic_year",
            termData.academic_year
          )
          .eq("term", termData.term);

        if (scheduleError) {
          throw scheduleError;
        }

        for (const item of scheduleData ?? []) {
          scheduleMap.set(
            item.class_id,
            item as ClassSchedule
          );
        }
      }

      /**
       * ------------------------------------------------------
       * 9. Build Family View
       * ------------------------------------------------------
       */

      const result: FamilyChild[] =
        students.map((student) => {
          const enrollment =
            enrollments.find(
              (item) =>
                item.student_id === student.id
            ) ?? null;

          const classInfo =
            enrollment?.class_id
              ? classMap.get(
                  enrollment.class_id
                ) ?? null
              : null;

          const schedule =
            enrollment?.class_id
              ? scheduleMap.get(
                  enrollment.class_id
                ) ?? null
              : null;

          return {
            student,
            enrollment,
            classInfo,
            schedule,
          };
        });

      setFamilyChildren(result);

      /**
       * ------------------------------------------------------
       * 10. Family Start / End
       *
       * Earliest actual First Lesson
       * +
       * Latest actual Final Lesson
       * ------------------------------------------------------
       */

      const validSchedules =
        result
          .map((item) => item.schedule)
          .filter(
            (
              item
            ): item is ClassSchedule =>
              !!item?.first_lesson &&
              !!item?.final_lesson
          );

      if (validSchedules.length > 0) {
        const starts =
          validSchedules.map(
            (item) =>
              item.first_lesson as string
          );

        const ends =
          validSchedules.map(
            (item) =>
              item.final_lesson as string
          );

        setFamilyStartDate(
          starts.sort()[0] ?? null
        );

        setFamilyEndDate(
          ends.sort().at(-1) ?? null
        );
      } else {
        setFamilyStartDate(null);
        setFamilyEndDate(null);
      }

      /**
       * ------------------------------------------------------
       * 11. Upcoming Lessons
       *
       * Calculate independently for every child.
       * ------------------------------------------------------
       */

      const upcomingGroups: ChildUpcoming[] =
        result.map((child) => {
          const schedule =
            child.schedule;

          const classInfo =
            child.classInfo;

          if (
            !schedule?.first_lesson ||
            !schedule?.final_lesson ||
            !classInfo
          ) {
            return {
              child,
              lessons: [],
            };
          }

          const firstDate =
            parseLocalDate(
              schedule.first_lesson
            );

          const finalDate =
            parseLocalDate(
              schedule.final_lesson
            );

          let nextDate =
            new Date(firstDate);

          const todayDate =
            parseLocalDate(today);

          while (
            nextDate < todayDate &&
            nextDate <= finalDate
          ) {
            nextDate = new Date(nextDate);
            nextDate.setDate(
              nextDate.getDate() + 7
            );
          }

          const lessons: UpcomingLesson[] = [];

          for (
            let date = new Date(nextDate);
            date <= finalDate &&
            lessons.length < 4;
            date.setDate(
              date.getDate() + 7
            )
          ) {
            const campusValue: any =
              classInfo.campus;

            const campus =
              Array.isArray(campusValue)
                ? campusValue[0]
                    ?.campus_code ?? ""
                : campusValue?.campus_code ??
                  "";

            lessons.push({
              id: `${schedule.id}-${formatISODate(
                date
              )}`,
              studentId:
                child.student.id,
              lessonDate:
                formatISODate(date),
              startTime:
                formatTime(
                  classInfo.start_time
                ),
              endTime:
                formatTime(
                  classInfo.end_time
                ),
              campus,
              level:
                classInfo.level ?? "",
              suffix:
                classInfo.class_suffix?.trim() ??
                "",
            });
          }

          return {
            child,
            lessons,
          };
        });

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
          "Unable to load the Parent Dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  /**
   * ==========================================================
   * Error
   * ==========================================================
   */

  if (error) {
    return (
      <main className="min-h-screen text-[#10213A]">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
          <div
            className="
              overflow-hidden
              rounded-2xl
              border
              border-red-300/30
              bg-[#152F50]
              shadow-xl
            "
          >
            <div className="h-[4px] bg-red-400/70" />

            <div className="p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-300">
                PARENT PORTAL
              </p>

              <h1 className="mt-3 text-2xl font-semibold text-[#F4F7FB]">
                Unable to load Dashboard
              </h1>

              <p className="mt-2 text-sm leading-6 text-[#C8D2DF]">
                {error}
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const childCount =
    familyChildren.length;

  const hasMultipleChildren =
    childCount > 1;

  /**
   * ==========================================================
   * Dashboard
   * ==========================================================
   */

  return (
    <main className="min-h-screen text-[#10213A]">
      <div
        className="
          mx-auto
          w-full
          max-w-[1500px]
          px-4
          py-8
          sm:px-6
          lg:px-8
        "
      >
        {/* ==================================================
            HEADER
        ================================================== */}

        <section className="mb-8">
          <h1
            className="
              text-3xl
              font-bold
              tracking-tight
              text-[#F4F7FB]
              sm:text-4xl
            "
          >
            Welcome back{parentName ? `, ${parentName}` : ""}!
          </h1>

          <p
            className="
              mt-2
              text-sm
              text-[#C8D2DF]
              sm:text-base
            "
          >
            Parent Portal
          </p>

          <div
            className="
              mt-5
              h-[2px]
              w-24
              bg-gradient-to-r
              from-[#D4AF37]
              via-[#D4AF37]/60
              to-transparent
            "
          />

          {parentEmail && (
            <p className="mt-4 text-xs text-[#64748B]">
              Signed in as {parentEmail}
            </p>
          )}
        </section>

        {/* ==================================================
            CURRENT TERM
        ================================================== */}

        <section
          className="
            relative
            overflow-hidden
            rounded-2xl
            border
            border-[#D4AF37]/35
            bg-[#152F50]
            shadow-xl
          "
        >
          <div
            aria-hidden="true"
            className="
              absolute
              left-0
              right-0
              top-0
              h-[3px]
              bg-gradient-to-r
              from-[#D4AF37]
              via-[#D4AF37]/55
              to-transparent
            "
          />

          <div className="p-6 sm:p-7">
            <p
              className="
                text-xs
                font-semibold
                uppercase
                tracking-[0.24em]
                text-[#D4AF37]
              "
            >
              CURRENT TERM
            </p>

            <div
              className="
                mt-3
                flex
                flex-col
                gap-2
                sm:flex-row
                sm:items-end
                sm:justify-between
              "
            >
              <p
                className="
                  text-2xl
                  font-semibold
                  text-[#F4F7FB]
                  sm:text-3xl
                "
              >
                {currentTerm
                  ? `${currentTerm.academic_year} · Term ${currentTerm.term}`
                  : "No current term"}
              </p>

              {familyStartDate &&
                familyEndDate && (
                  <p
                    className="
                      text-sm
                      font-medium
                      text-[#C8D2DF]
                      sm:text-right
                    "
                  >
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
          </div>
        </section>

        {/* ==================================================
            UPCOMING LESSONS
        ================================================== */}

        <section
          className="
            relative
            mt-7
            overflow-hidden
            rounded-2xl
            border
            border-[#D4AF37]/35
            bg-[#152F50]
            shadow-xl
          "
        >
          <div
            aria-hidden="true"
            className="
              absolute
              left-0
              right-0
              top-0
              h-[3px]
              bg-gradient-to-r
              from-[#D4AF37]
              via-[#D4AF37]/55
              to-transparent
            "
          />

          <div
            className="
              border-b
              border-[#D9E3ED]/15
              px-6
              py-5
              sm:px-7
            "
          >
            <p
              className="
                text-xs
                font-semibold
                uppercase
                tracking-[0.24em]
                text-[#D4AF37]
              "
            >
              UPCOMING LESSONS
            </p>
          </div>

          {upcomingByChild.length === 0 ? (
            <div className="px-6 py-8 text-sm text-[#C8D2DF]">
              No children are currently enrolled
              for this term.
            </div>
          ) : (
            <div>
              {upcomingByChild.map(
                (
                  group,
                  index
                ) => {
                  const studentName =
                    getStudentDisplayName(
                      group.child.student
                    );

                  const hasLessons =
                    group.lessons.length >
                    0;

                  return (
                    <div
                      key={
                        group.child.student.id
                      }
                      className="
                        border-b
                        border-[#D9E3ED]/15
                        last:border-b-0
                      "
                    >
                     {/* Child heading */}

<div
  className="
    border-b
    border-[#D9E3ED]/10
    bg-[#102A49]
    px-6
    py-4
    sm:px-7
  "
>
  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
    <span
      className="
        text-xs
        font-semibold
        uppercase
        tracking-[0.20em]
        text-[#D4AF37]
      "
    >
      {hasMultipleChildren
        ? `CHILD ${index + 1}`
        : "CHILD"}
    </span>

    <span
      className="
        text-lg
        font-semibold
        text-[#F4F7FB]
      "
    >
      : {studentName || "Student"}
    </span>
  </div>
</div>

                      {!hasLessons ? (
                        <div className="px-6 py-6 text-sm text-[#C8D2DF] sm:px-7">
                          No upcoming lessons.
                        </div>
                      ) : (
                        <div className="px-6 py-2 sm:px-7">
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
                                  className="
                                    group
                                    border-b
                                    border-[#D9E3ED]/10
                                    py-5
                                    last:border-b-0
                                    transition
                                    duration-200
                                    hover:bg-[#183555]/60
                                    sm:px-2
                                  "
                                >
                                  <div
                                    className="
                                      flex
                                      flex-col
                                      gap-2
                                      sm:flex-row
                                      sm:items-center
                                      sm:justify-between
                                      sm:gap-6
                                    "
                                  >
                                    {/* Date / Time */}

                                    <div
                                      className="
                                        min-w-0
                                        sm:flex-1
                                      "
                                    >
                                      <div
                                        className="
                                          flex
                                          flex-wrap
                                          items-center
                                          gap-x-4
                                          gap-y-1
                                        "
                                      >
                                        <p
                                          className="
                                            text-sm
                                            font-semibold
                                            text-[#F4F7FB]
                                          "
                                        >
                                          {formatDisplayDate(
                                            lesson.lessonDate
                                          )}
                                        </p>

                                        <p
                                          className="
                                            text-sm
                                            text-[#C8D2DF]
                                          "
                                        >
                                          {
                                            lesson.startTime
                                          }{" "}
                                          –{" "}
                                          {
                                            lesson.endTime
                                          }
                                        </p>
                                      </div>
                                    </div>

                                    {/* Class */}

                                    <p
                                      className="
                                        text-sm
                                        font-semibold
                                        text-[#F4F7FB]
                                        sm:text-right
                                      "
                                    >
                                      {
                                        classLabel
                                      }
                                    </p>
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* ==================================================
            LATEST NEWS
        ================================================== */}

        <section
          className="
            relative
            mt-7
            overflow-hidden
            rounded-2xl
            border
            border-[#D4AF37]/35
            bg-[#152F50]
            shadow-xl
          "
        >
          <div
            aria-hidden="true"
            className="
              absolute
              left-0
              right-0
              top-0
              h-[3px]
              bg-gradient-to-r
              from-[#D4AF37]
              via-[#D4AF37]/55
              to-transparent
            "
          />

          <div
            className="
              border-b
              border-[#D9E3ED]/15
              px-6
              py-5
              sm:px-7
            "
          >
            <p
              className="
                text-xs
                font-semibold
                uppercase
                tracking-[0.24em]
                text-[#D4AF37]
              "
            >
              LATEST NEWS
            </p>
          </div>

          <div className="px-6 py-8 sm:px-7">
            <p className="text-sm text-[#C8D2DF]">
              No news available.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

/*
 * ==========================================================
 * Helpers
 * ==========================================================
 */

/**
 * Return today's date in Australia/Brisbane
 * as YYYY-MM-DD.
 *
 * This avoids using UTC midnight as the business date.
 */
function getBrisbaneToday(): string {
  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Australia/Brisbane",
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
 * Parse a date-only database value as a
 * local date without UTC conversion.
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