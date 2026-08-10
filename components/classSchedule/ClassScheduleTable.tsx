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
      {/* Gold top highlight */}
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

      {/* Table Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <p
          className="
            text-xs
            font-medium
            uppercase
            tracking-[0.18em]
            text-[#D4AF37]
          "
        >
          CLASS SCHEDULE
        </p>

        <span className="text-sm text-[#C8D2DF]/80">
          {schedules.length} schedules
        </span>
      </div>

      {/* ========================================================= */}
      {/* DESKTOP TABLE                                              */}
      {/* ========================================================= */}

      <div
        className="
          hidden
          md:block
          h-[520px]
          overflow-y-auto
          overflow-x-hidden
          scrollbar-thin
          scrollbar-thumb-[#64748B]/60
          scrollbar-track-transparent
        "
      >
        <table className="w-full table-fixed border-collapse">
          {/* Sticky Header */}
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#102B4D]">
              <th
                className="
                  w-[21%]
                  px-4 py-4
                  text-left
                  text-xs font-semibold
                  uppercase tracking-wide
                  text-[#C8D2DF]
                "
              >
                Class
              </th>

              <th
                className="
                  w-[13%]
                  px-4 py-4
                  text-left
                  text-xs font-semibold
                  uppercase tracking-wide
                  text-[#C8D2DF]
                "
              >
                Academic
              </th>

              <th
                className="
                  w-[14%]
                  px-4 py-4
                  text-left
                  text-xs font-semibold
                  uppercase tracking-wide
                  text-[#C8D2DF]
                "
              >
                First
                <br />
                Lesson
              </th>

              <th
                className="
                  w-[14%]
                  px-4 py-4
                  text-left
                  text-xs font-semibold
                  uppercase tracking-wide
                  text-[#C8D2DF]
                "
              >
                Final
                <br />
                Lesson
              </th>

              <th
                className="
                  w-[10%]
                  px-4 py-4
                  text-left
                  text-xs font-semibold
                  uppercase tracking-wide
                  text-[#C8D2DF]
                "
              >
                Status
              </th>

              <th
                className="
                  w-[12%]
                  px-4 py-4
                  text-left
                  text-xs font-semibold
                  uppercase tracking-wide
                  text-[#C8D2DF]
                "
              >
                Notes
              </th>

              <th
                className="
                  w-[16%]
                  px-4 py-4
                  text-center
                  text-xs font-semibold
                  uppercase tracking-wide
                  text-[#C8D2DF]
                "
              >
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {schedules.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="
                    px-4 py-10
                    text-center
                    text-sm
                    text-[#64748B]
                    bg-[#FFF6E6]
                  "
                >
                  No schedules found.
                </td>
              </tr>
            ) : (
              schedules.map((item, index) => (
                <tr
                  key={item.id}
                  className={`
                    border-b
                    border-[#D9E0E8]
                    text-sm
                    text-[#10213A]
                    ${
                      index % 2 === 0
                        ? "bg-[#FFFFFF]"
                        : "bg-[#FFF6E6]"
                    }
                    hover:bg-[#F4EBD9]
                  `}
                >
                  {/* Class */}
                  <td className="px-4 py-3 align-middle">
                    <div className="break-words font-medium leading-5">
                      {item.display_name}
                    </div>
                  </td>

                  {/* Academic */}
                  <td className="px-4 py-3 align-middle">
                    <div className="leading-5">
                      <div>{item.academic_year}</div>

                      <div className="text-xs text-[#64748B]">
                        Term {item.term}
                      </div>
                    </div>
                  </td>

                  {/* First Lesson */}
                  <td className="px-4 py-3 align-middle whitespace-nowrap">
                    {item.first_lesson}
                  </td>

                  {/* Final Lesson */}
                  <td className="px-4 py-3 align-middle whitespace-nowrap">
                    {item.final_lesson}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 align-middle">
                    <span
                      className={`
                        inline-flex
                        items-center
                        whitespace-nowrap
                        rounded-full
                        px-2.5 py-1
                        text-xs font-medium
                        ${
                          item.status === "Active"
                            ? "bg-green-100 text-green-700"
                            : item.status === "Completed"
                            ? "bg-blue-100 text-blue-700"
                            : item.status === "Planned"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }
                      `}
                    >
                      {item.status}
                    </span>
                  </td>

                  {/* Notes */}
                  <td className="px-4 py-3 align-middle">
                    <div
                      className="
                        overflow-hidden
                        text-ellipsis
                        break-words
                        leading-5
                        text-[#64748B]
                      "
                      title={item.notes}
                    >
                      {item.notes || "-"}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="
                          rounded-lg
                          bg-[#2161F5]
                          px-3 py-2
                          text-xs font-medium
                          text-white
                          transition-colors
                          duration-200
                          hover:bg-[#1955DE]
                          active:bg-[#164BC7]
                        "
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        className="
                          rounded-lg
                          bg-[#F43F4F]
                          px-3 py-2
                          text-xs font-medium
                          text-white
                          transition-colors
                          duration-200
                          hover:bg-[#DC2638]
                          active:bg-[#C91F30]
                        "
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

      {/* ========================================================= */}
      {/* MOBILE CARD LIST                                           */}
      {/* ========================================================= */}

      <div
        className="
          block
          md:hidden
          h-[520px]
          overflow-y-auto
          overflow-x-hidden
          scrollbar-thin
          scrollbar-thumb-[#64748B]/60
          scrollbar-track-transparent
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
            Schedule List
          </span>

          <span className="text-xs text-[#C8D2DF]/70">
            {schedules.length} schedules
          </span>
        </div>

        {schedules.length === 0 ? (
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
            No schedules found.
          </div>
        ) : (
          <div>
            {schedules.map((item, index) => (
              <div
                key={item.id}
                className={`
                  border-b
                  border-[#D9E0E8]
                  px-4
                  py-4
                  text-[#10213A]
                  transition-colors
                  duration-200
                  ${
                    index % 2 === 0
                      ? "bg-[#FFFFFF]"
                      : "bg-[#FFF6E6]"
                  }
                  hover:bg-[#F4EBD9]
                `}
              >
                {/* Class Name */}
                <div
                  className="
                    mb-3
                    break-words
                    text-base
                    font-semibold
                    leading-5
                  "
                >
                  {item.display_name}
                </div>

                {/* Information Grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-[#64748B]">
                      Academic
                    </div>

                    <div className="mt-0.5 font-medium">
                      {item.academic_year}
                    </div>

                    <div className="text-xs text-[#64748B]">
                      Term {item.term}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-[#64748B]">
                      Status
                    </div>

                    <div className="mt-1">
                      <span
                        className={`
                          inline-flex
                          items-center
                          whitespace-nowrap
                          rounded-full
                          px-2.5
                          py-1
                          text-xs
                          font-medium
                          ${
                            item.status === "Active"
                              ? "bg-green-100 text-green-700"
                              : item.status === "Completed"
                              ? "bg-blue-100 text-blue-700"
                              : item.status === "Planned"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }
                        `}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-[#64748B]">
                      First Lesson
                    </div>

                    <div className="mt-0.5 whitespace-nowrap font-medium">
                      {item.first_lesson}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-[#64748B]">
                      Final Lesson
                    </div>

                    <div className="mt-0.5 whitespace-nowrap font-medium">
                      {item.final_lesson}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <div className="text-[10px] uppercase tracking-wide text-[#64748B]">
                      Notes
                    </div>

                    <div
                      className="
                        mt-0.5
                        break-words
                        leading-5
                        text-[#64748B]
                      "
                    >
                      {item.notes || "-"}
                    </div>
                  </div>
                </div>

                {/* Mobile Actions */}
                <div
                  className="
                    mt-4
                    flex
                    items-center
                    justify-end
                    gap-2
                  "
                >
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="
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

                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    className="
                      rounded-lg
                      bg-[#F43F4F]
                      px-4
                      py-2
                      text-sm
                      font-medium
                      text-white
                      transition-colors
                      duration-200
                      hover:bg-[#DC2638]
                      active:bg-[#C91F30]
                    "
                  >
                    Delete
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