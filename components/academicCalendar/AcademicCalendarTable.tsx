"use client";

import { AcademicCalendarRecord } from "./types";

type Props = {
  calendars: AcademicCalendarRecord[];
  onEdit: (calendar: AcademicCalendarRecord) => void;
};

export default function AcademicCalendarTable({
  calendars,
  onEdit,
}: Props) {
  return (
    <div className="border rounded-lg">

      <div className="p-4 border-b">
        <h2 className="text-2xl font-bold">
          State School Calendar
        </h2>
      </div>

      <table className="w-full">

        <thead className="bg-gray-100">
          <tr>

            <th className="text-left p-3">
              Year
            </th>

            <th className="text-left p-3">
              Term
            </th>

            <th className="text-left p-3">
              Start Date
            </th>

            <th className="text-left p-3">
              End Date
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

          {calendars.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="text-center text-gray-500 p-8"
              >
                No academic calendar records found.
              </td>
            </tr>
          ) : (
            calendars.map((calendar) => (
              <tr
                key={calendar.id}
                className="border-t hover:bg-gray-50"
              >

                <td className="p-3">
                  {calendar.academic_year}
                </td>

                <td className="p-3">
                  Term {calendar.term}
                </td>

                <td className="p-3">
                  {calendar.start_date}
                </td>

                <td className="p-3">
                  {calendar.end_date}
                </td>

                <td className="p-3">
                  {calendar.notes || "-"}
                </td>

                <td className="p-3">

                  <button
                    onClick={() => onEdit(calendar)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded"
                  >
                    Edit
                  </button>

                </td>

              </tr>
            ))
          )}

        </tbody>

      </table>

    </div>
  );
}