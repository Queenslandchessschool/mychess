"use client";

import { ClassScheduleTableRow } from "./types";

interface ClassScheduleTableProps {
  schedules: ClassScheduleTableRow[];

  onEdit: (schedule: ClassScheduleTableRow) => void;

  onDelete: (id: string) => void;
}

export default function ClassScheduleTable({
  schedules,
  onEdit,
  onDelete,
}: ClassScheduleTableProps) {
  return (
    <div className="bg-white rounded-lg border p-6 shadow-sm">
      <h2 className="text-2xl font-bold mb-6">
        Class Schedule
      </h2>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-3">
                Class
              </th>

              <th className="text-left p-3">
                Academic
              </th>

              <th className="text-left p-3">
                First Lesson
              </th>

              <th className="text-left p-3">
                Final Lesson
              </th>

              <th className="text-left p-3">
                Status
              </th>

              <th className="text-left p-3">
                Notes
              </th>

              <th className="text-center p-3">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {schedules.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center text-gray-500 py-10"
                >
                  No schedules found.
                </td>
              </tr>
            ) : (
              schedules.map((item) => (
                <tr
                  key={item.id}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="p-3 font-medium">
                    {item.display_name}
                  </td>

                  <td className="p-3">
                    {item.academic_year} / Term {item.term}
                  </td>

                  <td className="p-3">
                    {item.first_lesson}
                  </td>

                  <td className="p-3">
                    {item.final_lesson}
                  </td>

                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        item.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : item.status === "Completed"
                          ? "bg-blue-100 text-blue-700"
                          : item.status === "Planned"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>

                  <td className="p-3 max-w-xs">
                    <div
                      className="truncate"
                      title={item.notes}
                    >
                      {item.notes || "-"}
                    </div>
                  </td>

                  <td className="p-3">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => onEdit(item)}
                        className="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => onDelete(item.id)}
                        className="px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}