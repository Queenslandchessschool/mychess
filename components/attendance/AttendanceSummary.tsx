"use client";

import type { AttendanceSummary as AttendanceSummaryType } from "./types";

interface Props extends AttendanceSummaryType {}

export default function AttendanceSummary({
  totalStudents,
  present,
  absent,
  late,
  leave,
  attendanceRate,
}: Props) {
  return (
    <div
      className="
        relative
        overflow-hidden
        rounded-2xl
        border
        border-[#D9E3ED]
        bg-[#FFFDF8]
        shadow-sm
      "
    >
      {/* Gold Top Accent */}
      <div
        className="
          h-1
          w-full
          bg-gradient-to-r
          from-[#D4AF37]
          via-[#F7E38A]
          to-[#D4AF37]
        "
      />

      <div className="p-5">
        {/* Title */}
        <h2 className="mb-5 text-lg font-semibold text-[#0B2545]">
          Attendance Summary
        </h2>

        {/* Summary Rows */}
        <div className="space-y-3">
          <SummaryRow
            icon="👨‍🎓"
            label="Students"
            value={totalStudents}
            color="text-[#0B2545]"
          />

          <SummaryRow
            icon="✅"
            label="Present"
            value={present}
            color="text-green-600"
          />

          <SummaryRow
            icon="❌"
            label="Absent"
            value={absent}
            color="text-red-600"
          />

          <SummaryRow
            icon="⏰"
            label="Late"
            value={late}
            color="text-orange-500"
          />

          <SummaryRow
            icon="🟡"
            label="Leave"
            value={leave}
            color="text-blue-600"
          />
        </div>

        {/* Attendance Rate */}
        <div className="mt-6 border-t border-[#E5EAF0] pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#35516F]">
              Attendance Rate
            </span>

            <span className="font-bold text-green-600">
              {attendanceRate}%
            </span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E5EAF0]">
            <div
              className="
                h-full
                bg-green-500
                transition-all
                duration-300
              "
              style={{
                width: `${attendanceRate}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface SummaryRowProps {
  icon: string;
  label: string;
  value: number;
  color: string;
}

function SummaryRow({
  icon,
  label,
  value,
  color,
}: SummaryRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span>{icon}</span>

        <span className="text-[#35516F]">
          {label}
        </span>
      </div>

      <span className={`font-semibold ${color}`}>
        {value}
      </span>
    </div>
  );
}