"use client";

import type { LessonCard } from "./types";

interface Props {
  lesson: LessonCard;
  selected: boolean;
  onClick: () => void;
}

export default function AttendanceLessonCard({
  lesson,
  selected,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group
        relative
        w-full
        overflow-hidden
        rounded-2xl
        border
        text-left
        transition-all
        duration-200
        focus:outline-none
        focus-visible:ring-2
        focus-visible:ring-[#D4AF37]/60
        ${
          selected
            ? "border-[#D4AF37]/70 bg-[#FFF8E7] shadow-[0_8px_30px_rgba(212,175,55,0.12)]"
            : "border-[#D4AF37]/30 bg-[#FFFDF8] shadow-sm hover:border-[#D4AF37]/55 hover:shadow-md"
        }
      `}
    >
      {/* Gold Tapered Accent
          Thick + bright on the left
          Gradually thinner + softer toward the right
      */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          left-0
          right-0
          top-0
          h-[6px]
          bg-gradient-to-r
          from-[#F7D968]
          via-[#D4AF37]/75
          to-transparent
          [clip-path:polygon(0_0,100%_42%,100%_58%,0_100%)]
        "
      />

      {/* Selected Accent */}
      {selected && (
        <div
          aria-hidden="true"
          className="
            absolute
            bottom-0
            left-0
            top-0
            w-[3px]
            bg-[#D4AF37]
          "
        />
      )}

      <div className="px-4 pb-4 pt-6 sm:px-5 sm:pb-5 sm:pt-6">
        {/* Main Row */}
        <div
          className="
            flex
            flex-col
            gap-4
            sm:flex-row
            sm:items-start
            sm:justify-between
          "
        >
          {/* Lesson Information */}
          <div className="min-w-0 flex-1">
            <h3
              className="
                text-base
                font-semibold
                leading-6
                text-[#10213A]
                sm:text-lg
              "
            >
              {lesson.campus}

              <span className="mx-1.5 text-[#B8C6D8]">
                |
              </span>

              {lesson.level}
            </h3>

            {/* Lesson Details */}
            <div
              className="
                mt-3
                grid
                grid-cols-1
                gap-2
                text-sm
                text-[#64748B]
                sm:grid-cols-3
                sm:gap-x-5
              "
            >
              <Detail
                label="DATE"
                value={lesson.lesson_date}
              />

              <Detail
                label="TIME"
                value={`${lesson.start_time} – ${lesson.end_time}`}
              />

              <Detail
                label="COACH"
                value={lesson.coach}
              />
            </div>
          </div>

          {/* Student Count / Status */}
          <div
            className="
              flex
              items-center
              justify-between
              gap-4
              sm:min-w-[130px]
              sm:flex-col
              sm:items-end
            "
          >
            <div className="sm:text-right">
              <div
                className="
                  text-2xl
                  font-bold
                  leading-none
                  text-[#102B4D]
                "
              >
                {lesson.studentCount}
              </div>

              <div
                className="
                  mt-1
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.14em]
                  text-[#64748B]
                "
              >
                Students
              </div>
            </div>

            <StatusBadge status={lesson.status} />
          </div>
        </div>

        {/* Bottom Row */}
        <div
          className="
            mt-4
            flex
            items-center
            justify-between
            border-t
            border-[#D9E3ED]
            pt-3
          "
        >
          <StatusLabel status={lesson.status} />

          <span
            className="
              text-xs
              font-medium
              text-[#64748B]
              transition-colors
              group-hover:text-[#10213A]
            "
          >
            {selected
              ? "Selected"
              : "View attendance"}
          </span>
        </div>
      </div>
    </button>
  );
}


/* =========================================================
   Detail
   ========================================================= */

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <span
        className="
          mr-2
          text-[10px]
          font-semibold
          uppercase
          tracking-[0.12em]
          text-[#B28A22]
        "
      >
        {label}
      </span>

      <span className="text-[#64748B]">
        {value || "—"}
      </span>
    </div>
  );
}


/* =========================================================
   Status Badge
   ========================================================= */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const styles =
    status === "Completed"
      ? "border-green-200 bg-green-50 text-green-700"
      : status === "Cancelled"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-[#E5D39A] bg-[#FFF8E7] text-[#9A7415]";

  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        border
        px-2.5
        py-1
        text-[11px]
        font-semibold
        whitespace-nowrap
        ${styles}
      `}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />

      {status}
    </span>
  );
}


/* =========================================================
   Status Label
   ========================================================= */

function StatusLabel({
  status,
}: {
  status: string;
}) {
  const styles =
    status === "Completed"
      ? "border-green-200 bg-green-50 text-green-700"
      : status === "Cancelled"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-[#E5D39A] bg-[#FFF8E7] text-[#9A7415]";

  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        border
        px-2.5
        py-1
        text-[10px]
        font-semibold
        uppercase
        tracking-[0.08em]
        ${styles}
      `}
    >
      {status === "Completed"
        ? "Completed"
        : status === "Cancelled"
        ? "Cancelled"
        : "Scheduled"}
    </span>
  );
}