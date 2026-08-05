"use client";

import { ClassTableRow } from "./types";

interface ClassTableProps {
  classes: ClassTableRow[];

  onEdit: (classRecord: ClassTableRow) => void;

  onDelete: (id: string) => void;
}

export default function ClassTable({
  classes,
  onEdit,
  onDelete,
}: ClassTableProps) {
  return (
    <div className="bg-white rounded-lg border p-6 shadow-sm">
      <h2 className="text-2xl font-bold mb-6">
        Class List
      </h2>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-3">
                Class
              </th>

              <th className="text-left p-3">
                Students
              </th>

              <th className="text-left p-3">
                Coach
              </th>

              <th className="text-left p-3">
                Time
              </th>

              <th className="text-left p-3">
                Status
              </th>

              <th className="text-center p-3">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {classes.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center text-gray-500 py-10"
                >
                  No classes found.
                </td>
              </tr>
            ) : (
              classes.map((item) => (
                <tr
                  key={item.id}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="p-3 font-medium">
                    {item.class_name}
                  </td>

                  <td className="p-3">
                    {item.student_count} / {item.capacity}
                  </td>

                  <td className="p-3">
                    {item.coach_name}
                  </td>

                  <td className="p-3">
                    {item.start_time} – {item.end_time}
                  </td>

                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        item.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {item.status}
                    </span>
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