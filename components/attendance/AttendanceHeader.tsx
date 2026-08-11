"use client";

import type { AttendanceHeaderStats } from "./types";

interface Props {
  stats: AttendanceHeaderStats;
  onRefresh: () => void;
  isAdmin?: boolean;
}

export default function AttendanceHeader({
  stats,
  onRefresh,
  isAdmin = true,
}: Props) {
  const {
    totalLessons,
    totalStudents,
    trialCount,
    pickupCount,
    ymcaCount,
  } = stats;

  return (
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
      {/* Gold Gradient Top Highlight */}
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

      <div className="px-5 py-5 sm:px-6 sm:py-6">
        {/* Header */}
        <div
          className="
            flex
            flex-col
            gap-5
            lg:flex-row
            lg:items-start
            lg:justify-between
          "
        >
          {/* Title */}
          <div className="min-w-0">
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
              ATTENDANCE
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
              Attendance Management
            </h1>

            <p
              className="
                mt-1.5
                text-sm
                leading-5
                text-[#64748B]
              "
            >
              Record and manage lesson attendance.
            </p>
          </div>

          {/* Actions */}
          <div
            className="
              flex
              w-full
              flex-wrap
              items-center
              gap-2
              sm:gap-3
              lg:w-auto
              lg:justify-end
            "
          >
            {isAdmin && (
              <button
                type="button"
                className="
                  inline-flex
                  min-h-[40px]
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-[#D4AF37]
                  bg-[#102B4D]
                  px-4
                  py-2
                  text-sm
                  font-semibold
                  text-[#F4D35E]
                  shadow-sm
                  transition-all
                  duration-200
                  hover:bg-[#17385F]
                  active:scale-[0.98]
                "
              >
                <span className="mr-1.5 text-base leading-none">
                  +
                </span>
                Add Make-up
              </button>
            )}

            <button
              type="button"
              onClick={onRefresh}
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
        </div>

        {/* Summary */}
        <div
          className="
            mt-6
            grid
            grid-cols-2
            gap-2
            sm:grid-cols-3
            lg:grid-cols-5
            lg:gap-3
          "
        >
          <SummaryCard
            label="Lessons"
            value={totalLessons}
          />

          <SummaryCard
            label="Students"
            value={totalStudents}
          />

          {trialCount > 0 && (
            <SummaryCard
              label="Trial"
              value={trialCount}
              highlight
            />
          )}

          {pickupCount > 0 && (
            <SummaryCard
              label="Pickup"
              value={pickupCount}
            />
          )}

          {ymcaCount > 0 && (
            <SummaryCard
              label="YMCA"
              value={ymcaCount}
            />
          )}
        </div>
      </div>
    </section>
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
  highlight?: boolean;
}

function SummaryCard({
  label,
  value,
  highlight = false,
}: SummaryCardProps) {
  return (
    <div
      className={`
        flex
        min-h-[72px]
        items-center
        justify-between
        rounded-xl
        border
        px-4
        py-3
        transition-colors
        duration-150
        ${
          highlight
            ? "border-[#D4AF37]/50 bg-[#FFF8E7]"
            : "border-[#D9E0E8] bg-[#F5F9FD]"
        }
      `}
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
          className={`
            mt-1
            text-xl
            font-bold
            leading-none
            ${
              highlight
                ? "text-[#A77B16]"
                : "text-[#10213A]"
            }
          `}
        >
          {value}
        </p>
      </div>

      {highlight && (
        <span
          className="
            flex
            h-7
            w-7
            items-center
            justify-center
            rounded-full
            bg-[#D4AF37]
            text-sm
            font-bold
            text-white
          "
          aria-label="Trial students"
        >
          ★
        </span>
      )}
    </div>
  );
}