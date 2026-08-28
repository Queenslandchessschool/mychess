"use client";

import { formatBrisbaneDateTime } from "@/lib/date";

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
    <>
      {/* ==================================================
          Desktop
          Full-width table
          6–9 visible rows
          Internal vertical scroll
          Sticky header
         ================================================== */}
      <div
        className="
          hidden
          overflow-hidden
          rounded-2xl
          border
          border-[#D9E0E8]
          bg-[#FFFDF8]
          shadow-sm
          lg:block
        "
      >
        <div className="max-h-[560px] overflow-y-auto">

          <table className="w-full border-collapse">

            <thead
              className="
                sticky
                top-0
                z-10
                bg-[#F5F9FD]
              "
            >
              <tr
                className="
                  border-b
                  border-[#D9E0E8]
                  text-left
                  text-[11px]
                  font-semibold
                  uppercase
                  tracking-[0.16em]
                  text-[#64748B]
                "
              >
                <th className="px-4 py-4">
                  Student
                </th>

                <th className="w-24 px-4 py-4">
                  Credits
                </th>

                <th className="px-4 py-4">
                  Reason
                </th>

                <th className="w-32 px-4 py-4">
                  Status
                </th>

                <th className="w-44 px-4 py-4">
                  Created
                </th>

                <th className="w-44 px-4 py-4">
                  Used
                </th>

                <th className="w-40 px-4 py-4">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>

              {records.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="
                      px-4
                      py-10
                      text-center
                      text-sm
                      text-[#64748B]
                    "
                  >
                    No make-up credits.
                  </td>
                </tr>
              )}

              {records.map((record) => (
                <tr
                  key={record.id}
                  className="
                    border-b
                    border-[#E2E8F0]
                    last:border-b-0
                    hover:bg-[#F8FAFC]
                  "
                >
                  <td className="px-4 py-4 text-sm text-[#10213A]">
                    {record.student_name}
                  </td>

                  <td className="px-4 py-4 text-sm font-semibold text-[#10213A]">
                    {record.credits}
                  </td>

                  <td className="px-4 py-4 text-sm text-[#475569]">
                    <div className="max-w-[320px] whitespace-normal break-words">
                      {record.reason || "-"}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-sm text-[#10213A]">
                    {record.status}
                  </td>

                  <td className="px-4 py-4 text-sm text-[#475569]">
                    {formatBrisbaneDateTime(record.created_at)}
                  </td>

                  <td className="px-4 py-4 text-sm text-[#475569]">
                    {formatBrisbaneDateTime(record.used_at)}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">

                      <button
                        type="button"
                        onClick={() => onEdit(record)}
                        className="
                          inline-flex
                          min-h-[40px]
                          items-center
                          justify-center
                          rounded-xl
                          border
                          border-[#D9E0E8]
                          bg-white
                          px-3
                          py-2
                          text-sm
                          font-medium
                          text-[#10213A]
                          shadow-sm
                          transition-all
                          duration-200
                          hover:border-[#94A3B8]
                          hover:bg-[#F8FAFC]
                          active:scale-[0.98]
                        "
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(record)}
                        className="
                          inline-flex
                          min-h-[40px]
                          items-center
                          justify-center
                          rounded-xl
                          border
                          border-red-500
                          bg-white
                          px-3
                          py-2
                          text-sm
                          font-medium
                          text-red-600
                          transition-all
                          duration-200
                          hover:bg-red-50
                          active:scale-[0.98]
                        "
                      >
                        Delete
                      </button>

                    </div>
                  </td>
                </tr>
              ))}

            </tbody>

          </table>
        </div>
      </div>


      {/* ==================================================
          Mobile
          Card list
          Normal page scrolling
         ================================================== */}
      <div className="space-y-3 lg:hidden">

        {records.length === 0 && (
          <div
            className="
              rounded-2xl
              border
              border-[#D9E0E8]
              bg-[#FFFDF8]
              px-5
              py-10
              text-center
              text-sm
              text-[#64748B]
              shadow-sm
            "
          >
            No make-up credits.
          </div>
        )}

        {records.map((record) => (
          <article
            key={record.id}
            className="
              rounded-2xl
              border
              border-[#D9E0E8]
              bg-[#FFFDF8]
              shadow-sm
            "
          >
            <div className="p-5">

              {/* Student / Status */}
              <div
                className="
                  flex
                  items-start
                  justify-between
                  gap-4
                "
              >
                <div className="min-w-0">

                  <p
                    className="
                      text-[11px]
                      font-semibold
                      uppercase
                      tracking-[0.16em]
                      text-[#64748B]
                    "
                  >
                    Student
                  </p>

                  <p
                    className="
                      mt-1
                      truncate
                      text-base
                      font-semibold
                      text-[#10213A]
                    "
                  >
                    {record.student_name}
                  </p>

                </div>

                <div className="shrink-0 text-right">

                  <p
                    className="
                      text-[11px]
                      font-semibold
                      uppercase
                      tracking-[0.16em]
                      text-[#64748B]
                    "
                  >
                    Status
                  </p>

                  <p
                    className="
                      mt-1
                      text-sm
                      font-medium
                      text-[#10213A]
                    "
                  >
                    {record.status}
                  </p>

                </div>
              </div>


              {/* Credit */}
              <div className="mt-4">

                <p
                  className="
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-[0.16em]
                    text-[#64748B]
                  "
                >
                  Credits
                </p>

                <p
                  className="
                    mt-1
                    text-base
                    font-semibold
                    text-[#10213A]
                  "
                >
                  {record.credits}
                </p>

              </div>


              {/* Reason */}
              <div className="mt-4">

                <p
                  className="
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-[0.16em]
                    text-[#64748B]
                  "
                >
                  Reason
                </p>

                <p
                  className="
                    mt-1
                    whitespace-pre-wrap
                    break-words
                    text-sm
                    leading-5
                    text-[#475569]
                  "
                >
                  {record.reason || "-"}
                </p>

              </div>


              {/* Dates */}
              <div
                className="
                  mt-4
                  grid
                  grid-cols-1
                  gap-3
                  sm:grid-cols-2
                "
              >

                <div>
                  <p
                    className="
                      text-[11px]
                      font-semibold
                      uppercase
                      tracking-[0.16em]
                      text-[#64748B]
                    "
                  >
                    Created
                  </p>

                  <p
                    className="
                      mt-1
                      text-sm
                      text-[#475569]
                    "
                  >
                    {formatBrisbaneDateTime(record.created_at)}
                  </p>
                </div>

                <div>
                  <p
                    className="
                      text-[11px]
                      font-semibold
                      uppercase
                      tracking-[0.16em]
                      text-[#64748B]
                    "
                  >
                    Used
                  </p>

                  <p
                    className="
                      mt-1
                      text-sm
                      text-[#475569]
                    "
                  >
                    {formatBrisbaneDateTime(record.used_at)}
                  </p>
                </div>

              </div>


              {/* Actions */}
              <div
                className="
                  mt-5
                  grid
                  grid-cols-1
                  gap-2.5
                  sm:grid-cols-2
                "
              >

                <button
                  type="button"
                  onClick={() => onEdit(record)}
                  className="
                    inline-flex
                    min-h-[44px]
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-[#D9E0E8]
                    bg-white
                    px-5
                    py-2.5
                    text-sm
                    font-medium
                    text-[#10213A]
                    shadow-sm
                    transition-all
                    duration-200
                    hover:border-[#94A3B8]
                    hover:bg-[#F8FAFC]
                    active:scale-[0.98]
                  "
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(record)}
                  className="
                    inline-flex
                    min-h-[44px]
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-red-500
                    bg-white
                    px-5
                    py-2.5
                    text-sm
                    font-medium
                    text-red-600
                    transition-all
                    duration-200
                    hover:bg-red-50
                    active:scale-[0.98]
                  "
                >
                  Delete
                </button>

              </div>

            </div>
          </article>
        ))}

      </div>
    </>
  );
}