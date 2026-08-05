"use client";

import { formatBrisbaneDateTime } from "@/lib/date";

import type { MakeupBooking } from "./types";

interface Props {
  records: MakeupBooking[];

  onDelete: (
    record: MakeupBooking
  ) => void;
}

export default function BookingTable({
  records,
  onDelete,
}: Props) {
  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">

      <table className="w-full">

        <thead className="bg-gray-50">

          <tr className="text-left text-sm">

            <th className="px-4 py-3">
              Student
            </th>

            <th className="px-4 py-3">
              Lesson
            </th>

            <th className="px-4 py-3">
              Status
            </th>

            <th className="px-4 py-3">
              Created
            </th>

            <th className="px-4 py-3">
              Completed
            </th>

            <th className="px-4 py-3 w-24">
              Action
            </th>
          </tr>

        </thead>

        <tbody>

          {records.length === 0 && (

            <tr>

              <td
                colSpan={6}
                className="px-4 py-8 text-center text-gray-500"
              >
                No bookings.
              </td>

            </tr>

          )}

          {records.map((record) => (

            <tr
              key={record.id}
              className="border-t"
            >

              <td className="px-4 py-3">
                {record.student_name}
              </td>

              <td className="px-4 py-3">
                {record.lesson_name}
              </td>

              <td className="px-4 py-3">
                {record.status}
              </td>

              <td className="px-4 py-3">
  {formatBrisbaneDateTime(record.created_at)}
</td>

              <td className="px-4 py-3">
  {formatBrisbaneDateTime(record.completed_at)}
</td>

              <td className="px-4 py-3">

  <button
    onClick={() => onDelete(record)}
    className="rounded-lg border border-red-500 px-3 py-1 text-red-600 hover:bg-red-50"
  >
    Delete
  </button>

</td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}