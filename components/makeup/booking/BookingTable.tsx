"use client";

import { formatBrisbaneDateTime } from "@/lib/date";
import { getLessonStartTimestamp } from "@/lib/attendanceTime";

import type { MakeupBooking } from "./types";

interface Props {
  records: MakeupBooking[];

  onDelete: (
    record: MakeupBooking
  ) => void;

  actionLabel?: string;
}

export default function BookingTable({
  records,
  onDelete,
  actionLabel = "Delete",
}: Props) {
  return (
    <>
      {/* ==================================================
          Desktop
          Full-width table
          Internal vertical scroll
          Sticky header
         ================================================== */}

      <div
        className="
          hidden
          overflow-hidden
          rounded-2xl
          border
          border-[#D9E0E8]
          bg-[#FFFDF8]
          shadow-sm
          lg:block
        "
      >
        <div className="max-h-[560px] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead
              className="
                sticky
                top-0
                z-10
                bg-[#F5F9FD]
              "
            >
              <tr
                className="
                  border-b
                  border-[#D9E0E8]
                  text-left
                  text-[11px]
                  font-semibold
                  uppercase
                  tracking-[0.16em]
                  text-[#64748B]
                "
              >
                <th className="px-4 py-4">
                  Student
                </th>

                <th className="px-4 py-4">
                  Lesson
                </th>

                <th className="w-32 px-4 py-4">
                  Status
                </th>

                <th className="w-44 px-4 py-4">
                  Created
                </th>

                <th className="w-44 px-4 py-4">
                  Completed
                </th>

                <th className="w-28 px-4 py-4">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {records.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="
                      px-4
                      py-10
                      text-center
                      text-sm
                      text-[#64748B]
                    "
                  >
                    No bookings.
                  </td>
                </tr>
              )}

              {records.map((record) => {
                /*
                 * Cancel is available only when:
                 *
                 * 1. Booking status is Booked
                 * 2. Lesson has NOT started
                 * 3. Lesson is NOT locked
                 *
                 * Once the lesson starts, or once the lesson
                 * date has passed and becomes LOCKED, Cancel
                 * must not be available.
                 */

                const canCancel =
  record.status === "Booked" &&
  Date.now() <
    getLessonStartTimestamp(
      record.lesson_date,
      record.start_time
    );

                return (
                  <tr
                    key={record.id}
                    className="
                      border-b
                      border-[#E2E8F0]
                      last:border-b-0
                      hover:bg-[#F8FAFC]
                    "
                  >
                    {/* Student */}
                    <td className="px-4 py-4 text-sm text-[#10213A]">
                      {record.student_name}
                    </td>

                    {/* Lesson */}
<td className="px-4 py-4 text-sm text-[#475569]">
  <div className="max-w-[420px] whitespace-normal break-words">
    {record.lesson_name}
  </div>

  <div className="mt-1 text-sm text-[#64748B]">
    {record.campus_name || "—"}
    {" · "}
    {record.start_time &&
    record.end_time
      ? `${record.start_time.slice(
          0,
          5
        )} – ${record.end_time.slice(
          0,
          5
        )}`
      : "—"}
  </div>
</td>

                    {/* Status */}
                    <td className="px-4 py-4 text-sm text-[#10213A]">
                      {record.status}
                    </td>

                    {/* Created */}
                    <td className="px-4 py-4 text-sm text-[#475569]">
                      {formatBrisbaneDateTime(
                        record.created_at
                      )}
                    </td>

                    {/* Completed */}
                    <td className="px-4 py-4 text-sm text-[#475569]">
                      {formatBrisbaneDateTime(
                        record.completed_at
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-4">
                      {canCancel && (
                        <button
                          type="button"
                          onClick={() =>
                            onDelete(record)
                          }
                          className="
                            inline-flex
                            min-h-[40px]
                            items-center
                            justify-center
                            rounded-xl
                            border
                            border-red-500
                            bg-white
                            px-3
                            py-2
                            text-sm
                            font-medium
                            text-red-600
                            transition-all
                            duration-200
                            hover:bg-red-50
                            active:scale-[0.98]
                          "
                        >
                          {actionLabel}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================================
          Mobile
          Card list
          Normal page scrolling
         ================================================== */}

      <div className="space-y-3 lg:hidden">
        {records.length === 0 && (
          <div
            className="
              rounded-2xl
              border
              border-[#D9E0E8]
              bg-[#FFFDF8]
              px-5
              py-10
              text-center
              text-sm
              text-[#64748B]
              shadow-sm
            "
          >
            No bookings.
          </div>
        )}

        {records.map((record) => {
          /*
           * Same cancellation rule as Desktop.
           */

          const canCancel =
  record.status === "Booked" &&
  Date.now() <
    getLessonStartTimestamp(
      record.lesson_date,
      record.start_time
    );

          return (
            <article
              key={record.id}
              className="
                rounded-2xl
                border
                border-[#D9E0E8]
                bg-[#FFFDF8]
                shadow-sm
              "
            >
              <div className="p-5">
                {/* Student / Status */}

                <div
                  className="
                    flex
                    items-start
                    justify-between
                    gap-4
                  "
                >
                  {/* Student */}

                  <div className="min-w-0">
                    <p
                      className="
                        text-[11px]
                        font-semibold
                        uppercase
                        tracking-[0.16em]
                        text-[#64748B]
                      "
                    >
                      Student
                    </p>

                    <p
                      className="
                        mt-1
                        truncate
                        text-base
                        font-semibold
                        text-[#10213A]
                      "
                    >
                      {record.student_name}
                    </p>
                  </div>

                  {/* Status */}

                  <div className="shrink-0 text-right">
                    <p
                      className="
                        text-[11px]
                        font-semibold
                        uppercase
                        tracking-[0.16em]
                        text-[#64748B]
                      "
                    >
                      Status
                    </p>

                    <p
                      className="
                        mt-1
                        text-sm
                        font-medium
                        text-[#10213A]
                      "
                    >
                      {record.status}
                    </p>
                  </div>
                </div>

                {/* Lesson */}

                <div className="mt-4">
                  <p
                    className="
                      text-[11px]
                      font-semibold
                      uppercase
                      tracking-[0.16em]
                      text-[#64748B]
                    "
                  >
                    Lesson
                  </p>

                  <div
                    className="
                      mt-1
                      break-words
                      text-sm
                      leading-5
                      text-[#475569]
                    "
                  >
                    {/* Lesson */}
<div>
  {record.lesson_name}
</div>

<div className="mt-1 text-sm text-[#64748B]">
  {record.campus_name || "—"}
  {" · "}
  {record.start_time &&
  record.end_time
    ? `${record.start_time.slice(
        0,
        5
      )} – ${record.end_time.slice(
        0,
        5
      )}`
    : "—"}
</div>
                  </div>
                </div>

                {/* Dates */}

                <div
                  className="
                    mt-4
                    grid
                    grid-cols-1
                    gap-3
                    sm:grid-cols-2
                  "
                >
                  {/* Created */}

                  <div>
                    <p
                      className="
                        text-[11px]
                        font-semibold
                        uppercase
                        tracking-[0.16em]
                        text-[#64748B]
                      "
                    >
                      Created
                    </p>

                    <p
                      className="
                        mt-1
                        text-sm
                        text-[#475569]
                      "
                    >
                      {formatBrisbaneDateTime(
                        record.created_at
                      )}
                    </p>
                  </div>

                  {/* Completed */}

                  <div>
                    <p
                      className="
                        text-[11px]
                        font-semibold
                        uppercase
                        tracking-[0.16em]
                        text-[#64748B]
                      "
                    >
                      Completed
                    </p>

                    <p
                      className="
                        mt-1
                        text-sm
                        text-[#475569]
                      "
                    >
                      {formatBrisbaneDateTime(
                        record.completed_at
                      )}
                    </p>
                  </div>
                </div>

                {/* Action */}

                {canCancel && (
                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={() =>
                        onDelete(record)
                      }
                      className="
                        inline-flex
                        min-h-[44px]
                        w-full
                        items-center
                        justify-center
                        rounded-xl
                        border
                        border-red-500
                        bg-white
                        px-5
                        py-2.5
                        text-sm
                        font-medium
                        text-red-600
                        transition-all
                        duration-200
                        hover:bg-red-50
                        active:scale-[0.98]
                      "
                    >
                      {actionLabel}
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}