"use client";

import { OperationalEventRecord } from "./types";

type Props = {
  events: OperationalEventRecord[];
  onEdit: (event: OperationalEventRecord) => void;
  onDelete: (id: string) => void;
};

export default function OperationalEventTable({
  events,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="border rounded-lg">

      <div className="p-4 border-b">
        <h2 className="text-2xl font-bold">
          School Operational Events
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          School-wide operational events used by Lesson Generation.
        </p>
      </div>

      <table className="w-full">

        <thead className="bg-gray-100">
          <tr>

            <th className="text-left p-3">
              Event Date
            </th>

            <th className="text-left p-3">
              Event Name
            </th>

            <th className="text-left p-3">
              Notes
            </th>

            <th className="text-left p-3">
              Actions
            </th>

          </tr>
        </thead>

        <tbody>

          {events.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="text-center text-gray-500 p-8"
              >
                No operational events found.
              </td>
            </tr>
          ) : (
            events.map((event) => (
              <tr
                key={event.id}
                className="border-t hover:bg-gray-50"
              >

                <td className="p-3">
                  {event.event_date}
                </td>

                <td className="p-3">
                  {event.event_name}
                </td>

                <td className="p-3">
                  {event.notes || "-"}
                </td>

                <td className="p-3">

                  <div className="flex gap-2">

                    <button
                      onClick={() => onEdit(event)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => onDelete(event.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded"
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
  );
}