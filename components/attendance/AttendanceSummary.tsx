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
    <div className="rounded-xl border bg-white p-5 shadow-sm">

      <h2 className="text-lg font-semibold mb-5">
        Attendance Summary
      </h2>

      <div className="space-y-3">

        <SummaryRow
          icon="👨‍🎓"
          label="Students"
          value={totalStudents}
          color="text-gray-700"
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

      <div className="mt-6 border-t pt-4">

        <div className="flex justify-between text-sm">

          <span className="text-gray-600">
            Attendance Rate
          </span>

          <span className="font-bold text-green-600">
            {attendanceRate}%
          </span>

        </div>

        <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">

          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{
              width: `${attendanceRate}%`,
            }}
          />

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

        <span className="text-gray-600">
          {label}
        </span>

      </div>

      <span className={`font-semibold ${color}`}>
        {value}
      </span>

    </div>
  );
}