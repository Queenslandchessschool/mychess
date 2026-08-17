"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const TEST_COACH_ID =
  "3fef5df8-f438-4258-9c3c-e1cf58a2d0a8";

type MyClass = {
  id: string;
  day: string;
  level: string;
  classSuffix: string;
  campus: string;
  startTime: string;
  endTime: string;
};

type CurrentTerm = {
  academicYear: number;
  term: number;
};

function formatTime(time: string | null) {
  if (!time) return "";

  const [hourString, minute] = time.split(":");
  const hour = Number(hourString);

  if (Number.isNaN(hour)) return time;

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minute} ${suffix}`;
}

function formatDay(day: string) {
  return day || "";
}

export default function MyClassPage() {
  const [currentTerm, setCurrentTerm] =
    useState<CurrentTerm | null>(null);

  const [classes, setClasses] = useState<MyClass[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadMyClasses() {
      setLoading(true);
      setError(null);

      /*
       * 1. Find the current Academic Year / Term
       *    from the configured Academic Calendar.
       */
      const today = new Date()
        .toISOString()
        .split("T")[0];

      const {
        data: calendar,
        error: calendarError,
      } = await supabase
        .from("academic_calendar")
        .select(
          "academic_year, term, start_date, end_date"
        )
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
          "MYCLASS CALENDAR ERROR:",
          calendarError
        );

        setError(calendarError.message);
        setLoading(false);
        return;
      }

      if (!calendar) {
        setError(
          "Current Academic Term could not be determined."
        );
        setLoading(false);
        return;
      }

      const academicYear =
        calendar.academic_year;

      const term = calendar.term;

      setCurrentTerm({
        academicYear,
        term,
      });

      /*
       * 2. Load only classes assigned to this Coach
       *    for the current Academic Year / Term.
       */
    const {
  data: scheduleData,
  error: scheduleError,
} = await supabase
  .from("class_schedule")
  .select(`
    id,
    first_lesson,
    final_lesson,
    class_id,
    classes(
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
        .eq("classes.coach_id", TEST_COACH_ID)
.eq("academic_year", academicYear)
.eq("term", term)
        .order("first_lesson", {
          ascending: true,
        });

      if (scheduleError) {
        console.error(
          "MYCLASS SCHEDULE ERROR:",
          scheduleError
        );

        setError(scheduleError.message);
        setLoading(false);
        return;
      }

      const rows: MyClass[] =
        (scheduleData ?? []).map(
          (item: any) => {
            const classData =
              Array.isArray(item.classes)
                ? item.classes[0]
                : item.classes;

            const campus =
              Array.isArray(classData?.campus)
                ? classData.campus[0]
                    ?.campus_code ?? ""
                : classData?.campus
                    ?.campus_code ?? "";

            return {
              id: item.id,

              day:
                classData?.day ?? "",

              level:
                classData?.level ?? "",

              classSuffix:
                classData?.class_suffix?.trim() ??
                "",

              campus,

startTime:
  formatTime(classData?.start_time),

endTime:
  formatTime(classData?.end_time),
            };
          }
        );

      /*
       * Keep the order of the actual weekly schedule:
       * Monday → Tuesday → Wednesday → Thursday → Friday → ...
       */
      const dayOrder: Record<string, number> = {
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6,
        Sunday: 7,
      };

      rows.sort(
        (a, b) =>
          (dayOrder[a.day] ?? 99) -
          (dayOrder[b.day] ?? 99)
      );

      setClasses(rows);
      setLoading(false);
    }

    loadMyClasses();
  }, []);

  return (
    <div
      className="
        mx-auto
        w-full
        max-w-7xl
        px-4
        py-5
        sm:px-6
        sm:py-8
        lg:px-8
      "
    >
      {/* PAGE HEADER */}
      <section className="mb-6 sm:mb-8">
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
          MYCLASS
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
          My Classes
        </h1>

        <p className="mt-2 text-sm text-[#C8D2DF] sm:text-base">
          Your classes for the current term.
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

      {/* CURRENT TERM */}
      {currentTerm && (
        <section
          className="
            relative
            mb-6
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

          <div className="p-5 sm:p-6">
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
                mt-2
                text-2xl
                font-semibold
                text-[#F4F7FB]
                sm:text-3xl
              "
            >
              {currentTerm.academicYear} · Term{" "}
              {currentTerm.term}
            </p>
          </div>
        </section>
      )}

      {/* MY CLASSES */}
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

        <div
          className="
            border-b
            border-[#C8D2DF]/15
            px-5
            py-4
            sm:px-6
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
            MY CLASSES
          </p>
        </div>

        {loading ? (
          <div className="p-6">
            <p className="text-sm text-[#C8D2DF]">
              Loading your classes...
            </p>
          </div>
        ) : error ? (
          <div className="p-6">
            <p className="font-semibold text-red-300">
              Unable to load classes
            </p>

            <p className="mt-2 text-sm text-[#C8D2DF]">
              {error}
            </p>
          </div>
        ) : classes.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-[#C8D2DF]">
              No classes assigned for this term.
            </p>
          </div>
        ) : (
          <div>
            {classes.map((item) => (
            <Link
  key={item.id}
  href={`/coach/myclass/${item.id}`}
  onClick={() => {
    console.log("MYCLASS CLICK:", item.id);
  }}
  className="
    group
    block
    border-b
    border-[#C8D2DF]/15
    px-5
    py-4
    transition
    duration-200
    last:border-b-0
    hover:bg-[#1A385C]
    active:bg-[#1A385C]
    sm:px-6
  "
>
                <div
                  className="
                    flex
                    flex-col
                    gap-3
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                  "
                >
<div>
  <p
    className="
      text-base
      font-semibold
      text-[#F4F7FB]
    "
  >
    {formatDay(item.day)}
    <span className="mx-2 text-[#D4AF37]/60">
      ·
    </span>
    <span className="font-normal text-[#C8D2DF]">
      {item.startTime} – {item.endTime}
    </span>
  </p>
</div>

                  <div
                    className="
                      text-sm
                      font-semibold
                      text-[#F4F7FB]
                      sm:text-right
                    "
                  >
                    <span>
                      {item.campus}
                    </span>

                    <span className="mx-2 text-[#D4AF37]/60">
                      ·
                    </span>

                    <span>
                      {item.level}
                    </span>

                    {item.classSuffix && (
                      <>
                        <span className="mx-2 text-[#D4AF37]/60">
                          ·
                        </span>

                        <span>
                          {item.classSuffix}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}