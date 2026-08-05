"use client";

import type { LeaveRecord } from "./types";

interface Props {
  records: LeaveRecord[];
  onEdit: (record: LeaveRecord) => void;

onDelete: (record: LeaveRecord) => void;
}

export default function LeaveTable({
  records,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">

      <table className="w-full">

        <thead className="bg-gray-50">

          <tr className="text-left text-sm">

            <th className="px-4 py-3">Student</th>

            <th className="px-4 py-3">Lesson</th>

            <th className="px-4 py-3">Reason</th>

            <th className="px-4 py-3">Comments</th>

            <th className="px-4 py-3 w-24">Action</th>

          </tr>

        </thead>

        <tbody>

          {records.length === 0 && (

            <tr>

              <td
                colSpan={5}
                className="px-4 py-8 text-center text-gray-500"
              >
                No leave records.
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
                {record.lesson_date}
              </td>

              <td className="px-4 py-3">
                {record.reason}
              </td>

              <td className="px-4 py-3">
                {record.comments}
              </td>

              <td className="px-4 py-3">

                <button
                  onClick={() => onEdit(record)}
                  className="rounded-lg border px-3 py-1 hover:bg-gray-100"
                >
                  Edit
                </button>

<button
  onClick={() => onDelete(record)}
  className="ml-2 rounded-lg border border-red-500 px-3 py-1 text-red-600 hover:bg-red-50"
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