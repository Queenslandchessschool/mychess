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
    <section className="overflow-hidden">
      {/* Gold gradient top border */}
      <div className="h-[2px] bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/55 to-transparent" />

      {/* Header */}
      <div className="px-6 py-5">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#D4AF37]">
          CLASS LIST
        </p>
      </div>

      {/* Scrollable list area */}
      <div className="hidden max-h-[560px] overflow-y-auto md:block">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-[27%]" />
            <col className="w-[12%]" />
            <col className="w-[15%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
            <col className="w-[20%]" />
          </colgroup>

          {/* Sticky Header */}
          <thead className="sticky top-0 z-20">
            <tr className="border-b border-[#D9E0E8] bg-[#F8F5ED]">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                Class
              </th>

              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                Students
              </th>

              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                Coach
              </th>

              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                Time
              </th>

              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                Status
              </th>

              <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {classes.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-sm text-[#94A3B8]"
                >
                  No classes found.
                </td>
              </tr>
            ) : (
              classes.map((item, index) => (
                <tr
                  key={item.id}
                  className={`
                    border-b border-[#E6EAF0]
                    transition-colors duration-150
                    hover:bg-[#FFFDF7]
                    ${
                      index % 2 === 0
                        ? "bg-white"
                        : "bg-[#FCFBF7]"
                    }
                  `}
                >
                  {/* Class */}
                  <td className="px-4 py-3.5 align-middle">
                    <div className="break-words text-sm font-medium leading-5 text-[#10213A]">
                      {item.class_name}
                    </div>
                  </td>

                  {/* Students */}
                  <td className="px-3 py-3.5 align-middle text-sm text-[#475569]">
                    {item.student_count} / {item.capacity}
                  </td>

                  {/* Coach */}
                  <td className="px-3 py-3.5 align-middle">
                    <div className="break-words text-sm leading-5 text-[#475569]">
                      {item.coach_name}
                    </div>
                  </td>

                  {/* Time */}
                  <td className="px-3 py-3.5 align-middle text-sm text-[#475569]">
                    <span className="whitespace-nowrap">
                      {item.start_time} – {item.end_time}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3.5 align-middle">
                    <span
                      className={`
                        inline-flex
                        whitespace-nowrap
                        rounded-full
                        px-2.5
                        py-1
                        text-xs
                        font-medium
                        ${
                          item.status === "Active"
                            ? "bg-[#E8F5EC] text-[#267A43]"
                            : "bg-[#EEF1F4] text-[#64748B]"
                        }
                      `}
                    >
                      {item.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-2 py-3.5 align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="
                          rounded-lg
                          border border-[#D9E0E8]
                          bg-white
                          px-3
                          py-1.5
                          text-xs
                          font-medium
                          text-[#475569]
                          transition-colors
                          duration-200
                          hover:border-[#D4AF37]
                          hover:text-[#8A6900]
                        "
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        className="
                          rounded-lg
                          border border-[#E2C4C4]
                          bg-white
                          px-3
                          py-1.5
                          text-xs
                          font-medium
                          text-[#A64B4B]
                          transition-colors
                          duration-200
                          hover:border-[#C96A6A]
                          hover:bg-[#FFF7F7]
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

      {/* Mobile */}
      <div className="space-y-3 px-4 pb-4 md:hidden">
        {classes.length === 0 ? (
          <div className="py-10 text-center text-sm text-[#94A3B8]">
            No classes found.
          </div>
        ) : (
          classes.map((item) => (
            <div
              key={item.id}
              className="
                rounded-xl
                border
                border-[#D9E0E8]
                bg-white
                p-4
                shadow-sm
              "
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#10213A]">
                    {item.class_name}
                  </p>

                  <p className="mt-1 text-xs text-[#64748B]">
                    {item.coach_name}
                  </p>
                </div>

                <span
                  className={`
                    shrink-0
                    rounded-full
                    px-2.5
                    py-1
                    text-xs
                    font-medium
                    ${
                      item.status === "Active"
                        ? "bg-[#E8F5EC] text-[#267A43]"
                        : "bg-[#EEF1F4] text-[#64748B]"
                    }
                  `}
                >
                  {item.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#E6EAF0] pt-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#94A3B8]">
                    Students
                  </p>

                  <p className="mt-1 text-sm text-[#475569]">
                    {item.student_count} / {item.capacity}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#94A3B8]">
                    Time
                  </p>

                  <p className="mt-1 text-sm text-[#475569]">
                    {item.start_time} – {item.end_time}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="
                    flex-1
                    rounded-lg
                    border border-[#D9E0E8]
                    bg-white
                    py-2
                    text-xs
                    font-medium
                    text-[#475569]
                    transition-colors
                    duration-200
                    hover:border-[#D4AF37]
                    hover:text-[#8A6900]
                  "
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="
                    flex-1
                    rounded-lg
                    border border-[#E2C4C4]
                    bg-white
                    py-2
                    text-xs
                    font-medium
                    text-[#A64B4B]
                    transition-colors
                    duration-200
                    hover:border-[#C96A6A]
                    hover:bg-[#FFF7F7]
                  "
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}