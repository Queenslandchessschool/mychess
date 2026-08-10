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
    <section
      className="
        overflow-hidden
        rounded-[18px]
        border
        border-[#D4AF37]/60
        bg-[#102B4D]
        shadow-sm
      "
    >
      {/* Gold gradient top highlight */}
      <div
        className="
          h-[2px]
          w-full
          bg-gradient-to-r
          from-[#D4AF37]/20
          via-[#F5D76E]
          to-[#D4AF37]/20
        "
      />

      {/* Header */}
      <div
        className="
          flex
          items-center
          justify-between
          px-6
          py-5
        "
      >
        <p
          className="
            text-xs
            font-medium
            uppercase
            tracking-[0.16em]
            text-[#D4AF37]
          "
        >
          STATE SCHOOL CALENDAR
        </p>

        <span className="text-sm text-[#C8D2DF]">
          {calendars.length} records
        </span>
      </div>

      {/* ========================================================= */}
      {/* DESKTOP TABLE                                              */}
      {/* ========================================================= */}

      <div
        className="
          hidden
          max-h-[420px]
          overflow-y-auto
          overflow-x-hidden
          md:block
        "
      >
        <table className="w-full table-fixed border-collapse">
          {/* Sticky Header */}
          <thead className="sticky top-0 z-[5]">
            <tr className="bg-[#102B4D]">
              <th
                className="
                  w-[14%]
                  px-4
                  py-3
                  text-left
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                  text-[#C8D2DF]
                "
              >
                Year
              </th>

              <th
                className="
                  w-[13%]
                  px-4
                  py-3
                  text-left
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                  text-[#C8D2DF]
                "
              >
                Term
              </th>

              <th
                className="
                  w-[19%]
                  px-4
                  py-3
                  text-left
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                  text-[#C8D2DF]
                "
              >
                Start Date
              </th>

              <th
                className="
                  w-[19%]
                  px-4
                  py-3
                  text-left
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                  text-[#C8D2DF]
                "
              >
                End Date
              </th>

              <th
                className="
                  w-[21%]
                  px-4
                  py-3
                  text-left
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                  text-[#C8D2DF]
                "
              >
                Notes
              </th>

              <th
                className="
                  w-[14%]
                  px-4
                  py-3
                  text-center
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                  text-[#C8D2DF]
                "
              >
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {calendars.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="
                    bg-[#FFF6E6]
                    px-4
                    py-10
                    text-center
                    text-sm
                    text-[#64748B]
                  "
                >
                  No academic calendar records found.
                </td>
              </tr>
            ) : (
              calendars.map((calendar, index) => (
                <tr
                  key={calendar.id}
                  className={`
                    border-t
                    border-[#D9E0E8]
                    ${
                      index % 2 === 0
                        ? "bg-white"
                        : "bg-[#FFF6E6]"
                    }
                    hover:bg-[#FFF1CC]
                    transition-colors
                    duration-150
                  `}
                >
                  <td
                    className="
                      px-4
                      py-4
                      text-sm
                      font-medium
                      text-[#10213A]
                    "
                  >
                    {calendar.academic_year}
                  </td>

                  <td
                    className="
                      px-4
                      py-4
                      text-sm
                      text-[#10213A]
                    "
                  >
                    Term {calendar.term}
                  </td>

                  <td
                    className="
                      px-4
                      py-4
                      text-sm
                      text-[#10213A]
                      whitespace-nowrap
                    "
                  >
                    {calendar.start_date}
                  </td>

                  <td
                    className="
                      px-4
                      py-4
                      text-sm
                      text-[#10213A]
                      whitespace-nowrap
                    "
                  >
                    {calendar.end_date}
                  </td>

                  <td
                    className="
                      px-4
                      py-4
                      text-sm
                      text-[#64748B]
                    "
                  >
                    <div
                      className="truncate"
                      title={calendar.notes || ""}
                    >
                      {calendar.notes || "-"}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => onEdit(calendar)}
                      className="
                        inline-flex
                        items-center
                        justify-center
                        rounded-lg
                        bg-[#2161F5]
                        px-3
                        py-1.5
                        text-sm
                        font-medium
                        text-white
                        transition-colors
                        duration-200
                        hover:bg-[#1955DE]
                        active:bg-[#164BC7]
                      "
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

      {/* ========================================================= */}
      {/* MOBILE CARD LIST                                           */}
      {/* ========================================================= */}

      <div
        className="
          block
          h-[420px]
          overflow-y-auto
          overflow-x-hidden
          md:hidden
        "
      >
        {/* Mobile Sticky Header */}
        <div
          className="
            sticky
            top-0
            z-20
            flex
            items-center
            justify-between
            border-b
            border-[#D4AF37]/30
            bg-[#102B4D]
            px-4
            py-3
          "
        >
          <span
            className="
              text-[11px]
              font-semibold
              uppercase
              tracking-[0.16em]
              text-[#C8D2DF]
            "
          >
            Calendar List
          </span>

          <span className="text-xs text-[#C8D2DF]/70">
            {calendars.length} records
          </span>
        </div>

        {calendars.length === 0 ? (
          <div
            className="
              bg-[#FFF6E6]
              px-4
              py-10
              text-center
              text-sm
              text-[#64748B]
            "
          >
            No academic calendar records found.
          </div>
        ) : (
          <div>
            {calendars.map((calendar, index) => (
              <div
                key={calendar.id}
                className={`
                  border-b
                  border-[#D9E0E8]
                  px-4
                  py-4
                  text-[#10213A]
                  transition-colors
                  duration-150
                  ${
                    index % 2 === 0
                      ? "bg-white"
                      : "bg-[#FFF6E6]"
                  }
                  hover:bg-[#FFF1CC]
                `}
              >
                {/* Academic Year / Term */}
                <div className="mb-4">
                  <div
                    className="
                      text-base
                      font-semibold
                    "
                  >
                    {calendar.academic_year}
                  </div>

                  <div
                    className="
                      mt-0.5
                      text-sm
                      text-[#64748B]
                    "
                  >
                    Term {calendar.term}
                  </div>
                </div>

                {/* Information */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <div
                      className="
                        text-[10px]
                        uppercase
                        tracking-wide
                        text-[#64748B]
                      "
                    >
                      Start Date
                    </div>

                    <div
                      className="
                        mt-0.5
                        whitespace-nowrap
                        text-sm
                        font-medium
                      "
                    >
                      {calendar.start_date}
                    </div>
                  </div>

                  <div>
                    <div
                      className="
                        text-[10px]
                        uppercase
                        tracking-wide
                        text-[#64748B]
                      "
                    >
                      End Date
                    </div>

                    <div
                      className="
                        mt-0.5
                        whitespace-nowrap
                        text-sm
                        font-medium
                      "
                    >
                      {calendar.end_date}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <div
                      className="
                        text-[10px]
                        uppercase
                        tracking-wide
                        text-[#64748B]
                      "
                    >
                      Notes
                    </div>

                    <div
                      className="
                        mt-0.5
                        break-words
                        text-sm
                        leading-5
                        text-[#64748B]
                      "
                    >
                      {calendar.notes || "-"}
                    </div>
                  </div>
                </div>

                {/* Action */}
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onEdit(calendar)}
                    className="
                      inline-flex
                      items-center
                      justify-center
                      rounded-lg
                      bg-[#2161F5]
                      px-4
                      py-2
                      text-sm
                      font-medium
                      text-white
                      transition-colors
                      duration-200
                      hover:bg-[#1955DE]
                      active:bg-[#164BC7]
                    "
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}