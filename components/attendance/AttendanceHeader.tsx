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
    <div className="mb-6">

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-3xl font-bold">
            Attendance Management
          </h1>

          <p className="text-gray-500 mt-1">
            Record and manage lesson attendance.
          </p>

        </div>

        <div className="flex items-center gap-3">

          <SummaryCard icon="📚" value={totalLessons} />

          <SummaryCard icon="👨‍🎓" value={totalStudents} />

          {trialCount > 0 && (
            <SummaryCard icon="🧪" value={trialCount} />
          )}

          {pickupCount > 0 && (
            <SummaryCard icon="🚗" value={pickupCount} />
          )}

          {ymcaCount > 0 && (
            <SummaryCard icon="🚌" value={ymcaCount} />
          )}

          {isAdmin && (
  <button
    type="button"
    className="rounded-xl bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 transition"
  >
    + Add Make-up
  </button>
)}

          <button
            onClick={onRefresh}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Refresh
          </button>

        </div>

      </div>

    </div>
  );
}

interface SummaryCardProps {
  icon: string;
  value: number;
}

function SummaryCard({
  icon,
  value,
}: SummaryCardProps) {
  return (
    <div className="w-16 h-16 rounded-xl border bg-white shadow-sm flex flex-col items-center justify-center">

      <div className="text-xl">
        {icon}
      </div>

      <div className="font-bold">
        {value}
      </div>

    </div>
  );
}