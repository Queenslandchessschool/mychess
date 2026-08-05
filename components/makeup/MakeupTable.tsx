"use client";

import type { MakeupCredit } from "./types";

interface Props {
  records: MakeupCredit[];

  onEdit: (
    record: MakeupCredit
  ) => void;

  onDelete: (
    record: MakeupCredit
  ) => void;
}

export default function MakeupTable({
  records,
  onEdit,
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
              Credits
            </th>

            <th className="px-4 py-3">
              Reason
            </th>

            <th className="px-4 py-3">
              Status
            </th>

            <th className="px-4 py-3">
              Created
            </th>

            <th className="px-4 py-3">
              Used
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
                colSpan={7}
                className="px-4 py-8 text-center text-gray-500"
              >
                No make-up credits.
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
                {record.credits}
              </td>

              <td className="px-4 py-3">
  {record.reason}
</td>

              <td className="px-4 py-3">
                {record.status}
              </td>

              <td className="px-4 py-3">
                {new Date(record.created_at).toLocaleString(
  "en-AU",
  {
    timeZone: "Australia/Brisbane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }
)}
              </td>

              <td className="px-4 py-3">
                {record.used_at ?? "-"}
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