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
    <div
      onClick={onClick}
      className={`
        rounded-xl
        border
        p-4
        cursor-pointer
        transition-all
        ${
          selected
            ? "border-blue-600 bg-blue-50 shadow-md"
            : "hover:bg-gray-50 hover:shadow-sm"
        }
      `}
    >
      <div className="flex justify-between items-start">

        <div>

          <h3 className="text-lg font-semibold">
            {lesson.campus}
            {" | "}
            {lesson.level}
          </h3>

          <div className="mt-2 space-y-1 text-sm text-gray-500">

            <div>
              📅 {lesson.lesson_date}
            </div>

            <div>
              🕒 {lesson.start_time}
              {" - "}
              {lesson.end_time}
            </div>

            <div>
              👨‍🏫 {lesson.coach}
            </div>

          </div>

        </div>

        <div className="text-right">

          <div className="text-2xl font-bold text-blue-600">
            {lesson.studentCount}
          </div>

          <div className="text-xs text-gray-500">
            Students
          </div>

          <div className="mt-3">

            <span
              className={`
                inline-block
                rounded-full
                px-3
                py-1
                text-xs
                font-medium
                ${
                  lesson.status === "Completed"
                    ? "bg-green-100 text-green-700"
                    : lesson.status === "Cancelled"
                    ? "bg-red-100 text-red-700"
                    : "bg-yellow-100 text-yellow-700"
                }
              `}
            >
              {lesson.status}
            </span>

          </div>

        </div>

      </div>
    </div>
  );
}