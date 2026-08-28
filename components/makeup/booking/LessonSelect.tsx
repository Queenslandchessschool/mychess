"use client";

import { useEffect, useRef, useState } from "react";

import type { LessonOption } from "./types";

interface Props {
  value: string;

  lessons: LessonOption[];

  onChange: (lessonId: string) => void;
}

/*
 * ============================================================
 * Date
 * ============================================================
 *
 * 2026-08-27
 * →
 * 27 Aug
 *
 * ============================================================
 */

function formatLessonDate(
  value: string
): string {
  if (!value) {
    return "";
  }

  const parts = value.split("-");

  if (parts.length !== 3) {
    return value;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day)
  ) {
    return value;
  }

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return `${day} ${
    monthNames[month - 1] ?? ""
  }`;
}

/*
 * ============================================================
 * Time
 * ============================================================
 */

interface FormattedTime {
  time: string;
  period: "AM" | "PM";
}

function formatTime(
  value: string
): FormattedTime {
  const [
    hourString,
    minuteString,
  ] = value.split(":");

  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    /*
     * Keep the type consistent even for
     * unexpected time values.
     */
    return {
      time: value,
      period: "AM",
    };
  }

  const period: "AM" | "PM" =
    hour >= 12 ? "PM" : "AM";

  const displayHour =
    hour % 12 === 0
      ? 12
      : hour % 12;

  return {
    time: `${displayHour}:${String(
      minute
    ).padStart(2, "0")}`,
    period,
  };
}

/*
 * ============================================================
 * Lesson Time
 * ============================================================
 *
 * Same period:
 *
 * 4:35–5:35 PM
 *
 * Different period:
 *
 * 11:30 AM–12:30 PM
 *
 * ============================================================
 */

function formatLessonTime(
  startTime: string,
  endTime: string
): string {
  if (
    !startTime ||
    !endTime
  ) {
    return "";
  }

  const start =
    formatTime(startTime);

  const end =
    formatTime(endTime);

  if (
    start.period ===
    end.period
  ) {
    return `${start.time}–${end.time} ${end.period}`;
  }

  return `${start.time} ${start.period}–${end.time} ${end.period}`;
}

/*
 * ============================================================
 * Lesson Label
 * ============================================================
 *
 * Example:
 *
 * 27 Aug · 4:35–5:35 PM · Toowong · Advanced
 *
 * ============================================================
 */

function getLessonLabel(
  lesson: LessonOption
): string {
  const date =
    formatLessonDate(
      lesson.lesson_date
    );

  const time =
    formatLessonTime(
      lesson.start_time,
      lesson.end_time
    );

  const parts = [
    date,
    time,
    lesson.campus_name,
    lesson.level,
  ].filter(Boolean);

  return parts.join(" · ");
}

export default function LessonSelect({
  value,
  lessons,
  onChange,
}: Props) {
  const [open, setOpen] =
    useState(false);

  const containerRef =
    useRef<HTMLDivElement>(null);

  const selectedLesson =
    lessons.find(
      (lesson) =>
        lesson.id === value
    );

  /*
   * ============================================================
   * Close when clicking outside
   * ============================================================
   */

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent
    ) {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  /*
   * ============================================================
   * Select Lesson
   * ============================================================
   */

  function handleSelect(
    lesson: LessonOption
  ) {
    onChange(lesson.id);
    setOpen(false);
  }

  /*
   * ============================================================
   * Render
   * ============================================================
   */

  return (
    <div
      ref={containerRef}
      className="
        relative
        w-full
      "
    >
      {/* ======================================================
          Trigger
          ====================================================== */}

      <button
        type="button"
        onClick={() =>
          setOpen(
            (current) => !current
          )
        }
        className={`
          flex
          min-h-[48px]
          w-full
          items-center
          justify-between
          gap-3
          rounded-xl
          border
          bg-[#F5F9FD]
          px-4
          py-3
          text-left
          text-sm
          text-[#10213A]
          outline-none
          transition
          sm:text-base

          ${
            open
              ? "border-[#D4AF37] ring-2 ring-[#D4AF37]/20"
              : "border-[#D9E0E8]"
          }
        `}
      >
        <span
          className="
            min-w-0
            flex-1
            overflow-hidden
            text-ellipsis
            whitespace-nowrap

            max-sm:whitespace-normal
            max-sm:line-clamp-2
          "
        >
          {selectedLesson
            ? getLessonLabel(
                selectedLesson
              )
            : "Select Lesson"}
        </span>

        <span
          className={`
            shrink-0
            text-[#10213A]
            transition-transform
            duration-200
            ${open ? "rotate-180" : ""}
          `}
        >
          ▾
        </span>
      </button>

      {/* ======================================================
          Dropdown
          ====================================================== */}

      {open && (
        <div
          className="
            absolute
            left-0
            right-0
            z-50
            mt-2
            max-h-[220px]
            overflow-y-auto
            rounded-xl
            border
            border-[#D9E0E8]
            bg-white
            shadow-lg
          "
        >
          {lessons.length === 0 ? (
            <div
              className="
                px-4
                py-4
                text-sm
                text-[#64748B]
              "
            >
              No eligible lessons
              available.
            </div>
          ) : (
            <div className="py-1">
              {lessons.map(
                (lesson) => {
                  const label =
                    getLessonLabel(
                      lesson
                    );

                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() =>
                        handleSelect(
                          lesson
                        )
                      }
                      className={`
                        w-full
                        border-b
                        border-[#EEF2F6]
                        px-4
                        py-3
                        text-left
                        transition
                        last:border-b-0
                        hover:bg-[#F5F9FD]

                        ${
                          lesson.id ===
                          value
                            ? "bg-[#FFF8DF]"
                            : "bg-white"
                        }
                      `}
                    >
                      <span
                        className="
                          block
                          min-w-0
                          overflow-hidden
                          text-sm
                          font-medium
                          leading-5
                          text-[#10213A]

                          sm:truncate
                          sm:text-base

                          max-sm:line-clamp-2
                        "
                      >
                        {label}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}