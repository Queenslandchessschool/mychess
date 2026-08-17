"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const TEST_COACH_ID =
  "3fef5df8-f438-4258-9c3c-e1cf58a2d0a8";

type Coach = {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  status: string;
  display_name: string | null;
};

type AcademicCalendar = {
  academic_year: number;
  term: number;
  start_date: string;
  end_date: string;
};

type UpcomingLesson = {
  id: string;
  lessonDate: string;
  startTime: string;
  endTime: string;
  campus: string;
  level: string;
  suffix: string;
};

export default function CoachDashboard() {
  const [coach, setCoach] = useState<Coach | null>(null);
  const [currentTerm, setCurrentTerm] =
    useState<AcademicCalendar | null>(null);

  const [lessons, setLessons] = useState<
    UpcomingLesson[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(
    null
  );

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError(null);

      /*
       * ==========================================
       * 1. Load Coach
       * ==========================================
       */

      const {
        data: coachData,
        error: coachError,
      } = await supabase
        .from("coaches")
        .select(`
          id,
          first_name,
          last_name,
          title,
          status,
          display_name
        `)
        .eq("id", TEST_COACH_ID)
        .single();

      if (coachError || !coachData) {
        console.error(
          "COACH LOAD ERROR:",
          coachError
        );

        setError(
          coachError?.message ??
            "Coach record could not be found."
        );

        setLoading(false);
        return;
      }

      setCoach(coachData);

      /*
       * ==========================================
       * 2. Current Academic Term
       * ==========================================
       */

      const today =
        new Date().toISOString().split("T")[0];

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
        console.error(
          "ACADEMIC CALENDAR ERROR:",
          calendarError
        );
      }

      setCurrentTerm(calendarData ?? null);

      /*
       * ==========================================
       * 3. Find Classes assigned to this Coach
       * ==========================================
       */

      const {
        data: classData,
        error: classError,
      } = await supabase
        .from("classes")
        .select("id")
        .eq("coach_id", TEST_COACH_ID);

      if (classError) {
        console.error(
          "COACH CLASS LOAD ERROR:",
          classError
        );

        setLessons([]);
        setLoading(false);
        return;
      }

      const coachClassIds =
        (classData ?? []).map(
          (item) => item.id
        );

      if (coachClassIds.length === 0) {
        setLessons([]);
        setLoading(false);
        return;
      }

      /*
       * ==========================================
       * 4. Load Class Schedules
       * ==========================================
       */

      const {
        data: scheduleData,
        error: scheduleError,
      } = await supabase
        .from("class_schedule")
        .select(`
          id,
          class_id,
          first_lesson,
          final_lesson,
class:classes(
  day,
  level,
  class_suffix,
  start_time,
  end_time,
  campus:campuses(
    campus_code
  )
)
        `)
        .in("class_id", coachClassIds);

      if (scheduleError) {
        console.error(
          "SCHEDULE LOAD ERROR:",
          scheduleError
        );

        setLessons([]);
        setLoading(false);
        return;
      }

      /*
       * ==========================================
       * 5. Calculate next actual lesson
       *
       * We do NOT use School Week.
       * Chess lessons can start from any school week.
       * ==========================================
       */

      const upcoming: UpcomingLesson[] = [];

      for (const item of scheduleData ?? []) {
        if (!item.first_lesson || !item.final_lesson) {
          continue;
        }

        const classData = Array.isArray(item.class)
          ? item.class[0]
          : item.class;

        if (!classData) {
          continue;
        }

        const firstDate = parseLocalDate(
          item.first_lesson
        );

        const finalDate = parseLocalDate(
          item.final_lesson
        );

        let nextDate = firstDate;

        /*
         * Move forward by one week until the next
         * actual lesson date is today or later.
         */
        while (
          nextDate < parseLocalDate(today) &&
          nextDate <= finalDate
        ) {
          nextDate = new Date(nextDate);
          nextDate.setDate(
            nextDate.getDate() + 7
          );
        }

        if (nextDate > finalDate) {
          continue;
        }

      const campusValue: any = classData.campus;

const campus = Array.isArray(campusValue)
  ? campusValue[0]?.campus_code ?? ""
  : campusValue?.campus_code ?? "";

        const level =
          classData.level ?? "";

        const suffix =
          classData.class_suffix?.trim() ?? "";

        upcoming.push({
  id: item.id,

  // Keep the real ISO date for sorting.
  lessonDate: formatISODate(nextDate),

startTime: formatTime(
  classData.start_time
),

endTime: formatTime(
  classData.end_time
),

  campus,
  level,
  suffix,
});
      }

      /*
       * Sort by actual lesson date.
       */
     upcoming.sort((a, b) => {
  return (
    parseLocalDate(
      a.lessonDate
    ).getTime() -
    parseLocalDate(
      b.lessonDate
    ).getTime()
  );
});

      /*
       * Only show the next 4 classes.
       */
      setLessons(upcoming.slice(0, 4));

      setLoading(false);
    }

    loadDashboard();
  }, []);

  /*
   * ==========================================
   * Loading
   * ==========================================
   */

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-sm text-[#C8D2DF]">
          Loading Coach Portal...
        </p>
      </div>
    );
  }

  /*
   * ==========================================
   * Error
   * ==========================================
   */

  if (error || !coach) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div
          className="
            rounded-2xl
            border
            border-red-300/40
            bg-[#152F50]
            p-6
          "
        >
          <p className="font-semibold text-red-300">
            Unable to load Coach
          </p>

          <p className="mt-2 text-sm text-[#C8D2DF]">
            {error ??
              "Coach record could not be found."}
          </p>
        </div>
      </div>
    );
  }

  /*
   * ==========================================
   * Dashboard
   * ==========================================
   */

  return (
    <div
      className="
        mx-auto
        w-full
        max-w-7xl
        px-4
        py-8
        sm:px-6
        lg:px-5
      "
    >
      {/* ======================================
          HEADER
      ====================================== */}

      <section className="mb-8">
        <p
          className="
            mb-3
            text-xs
            font-semibold
            uppercase
            tracking-[0.28em]
            text-[#D4AF37]
          "
        >
          MyCHESS
        </p>

        <h1
          className="
            text-3xl
            font-bold
            tracking-tight
            text-[#F4F7FB]
            sm:text-4xl
          "
        >
          Welcome back, {coach.first_name}!
        </h1>

        <p
          className="
            mt-2
            text-sm
            text-[#C8D2DF]
            sm:text-base
          "
        >
          Coach Portal
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
      </section>

      {/* ======================================
          CURRENT TERM
      ====================================== */}

      <section
        className="
          relative
          overflow-hidden
          rounded-2xl
          border
          border-[#D4AF37]/35
          bg-[#152F50]
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

          <p
            className="
              mt-3
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
        </div>
      </section>

      {/* ======================================
          UPCOMING CLASSES
      ====================================== */}

      <section
        className="
          relative
          mt-7
          overflow-hidden
          rounded-2xl
          border
          border-[#D4AF37]/35
          bg-[#152F50]
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
            UPCOMING CLASSES
          </p>
        </div>

        {lessons.length === 0 ? (
          <div className="px-6 py-8 text-sm text-[#C8D2DF]">
            No upcoming classes.
          </div>
        ) : (
          <div>
            {lessons.map((lesson) => {
              const classLabel = lesson.suffix
                ? `${lesson.campus} · ${lesson.level} · ${lesson.suffix}`
                : `${lesson.campus} · ${lesson.level}`;

              return (
                <div
                  key={lesson.id}
                  className="
                    group
                    border-b
                    border-[#D9E3ED]/15
                    px-6
                    py-6
                    transition-all
                    duration-200
                    ease-out

                    hover:bg-[#183555]
                    hover:border-[#D4AF37]/45

                    active:scale-[0.995]
                    active:bg-[#183555]
                    active:border-[#D4AF37]/60

                    last:border-b-0

                    sm:px-7
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
                    "
                  >
                    <div className="min-w-0">
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
        transition-colors
        duration-200
        group-hover:text-white
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
      {lesson.startTime} –{" "}
      {lesson.endTime}
    </p>
  </div>
</div>

                    <p
                      className="
                        text-sm
                        font-semibold
                        text-[#F4F7FB]

                        sm:text-right
                      "
                    >
                      {classLabel}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/*
 * ==========================================
 * Helpers
 * ==========================================
 */

function parseLocalDate(
  value: string
): Date {
  const [year, month, day] =
    value.split("-").map(Number);

  return new Date(
    year,
    month - 1,
    day
  );
}
function formatISODate(
  date: Date
): string {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
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
function formatDate(
  date: Date
): string {
  return new Intl.DateTimeFormat(
    "en-AU",
    {
      weekday: "long",
      day: "numeric",
      month: "short",
    }
  ).format(date);
}

function getScheduleTime(
  classData: any,
  scheduleData: any,
  type: "start" | "end"
): string {
  /*
   * class_schedule currently contains the lesson
   * schedule information. We first use the schedule
   * record if available, then fall back to classes.
   */

  const value =
    type === "start"
      ? scheduleData.start_time ??
        classData.start_time
      : scheduleData.end_time ??
        classData.end_time;

  if (!value) {
    return "—";
  }

  return formatTime(value);
}

function formatTime(
  value: string
): string {
  const [hourString, minute] =
    value.split(":");

  const hour = Number(hourString);

  if (
    Number.isNaN(hour) ||
    !minute
  ) {
    return value;
  }

  const suffix =
    hour >= 12 ? "PM" : "AM";

  const displayHour =
    hour % 12 || 12;

  return `${displayHour}:${minute} ${suffix}`;
}