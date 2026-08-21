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
    <section
      className="
        relative
        w-full
        overflow-hidden
        rounded-2xl
        border
        border-[#D9E0E8]
        bg-[#FFFDF8]
        shadow-sm
      "
    >
      {/* Gold tapered top highlight */}
      <div
        className="
          absolute
          left-0
          top-0
          h-[3px]
          w-[42%]
          bg-gradient-to-r
          from-[#8F6B18]
          via-[#F4D35E]
          to-transparent
        "
        style={{
          clipPath:
            "polygon(0 0, 100% 0, 84% 100%, 0 100%)",
        }}
      />

      <div
        className="
          px-5
          py-6
          sm:px-6
          sm:py-7
          lg:px-7
          lg:py-8
        "
      >
        <div>
          <p
            className="
              text-[11px]
              font-semibold
              uppercase
              tracking-[0.22em]
              text-[#B28A22]
              sm:text-xs
            "
          >
            LEAVE RECORDS
          </p>

          <p
            className="
              mt-1.5
              text-sm
              leading-5
              text-[#64748B]
              sm:text-base
            "
          >
            View and manage submitted student leave
            records.
          </p>
        </div>

        {records.length === 0 && (
          <div
            className="
              mt-6
              rounded-xl
              border
              border-[#D9E0E8]
              bg-[#F5F9FD]
              px-5
              py-12
              text-center
              text-sm
              text-[#64748B]
            "
          >
            No leave records.
          </div>
        )}

        {records.length > 0 && (
          <div
            className="
              mt-6
              hidden
              overflow-hidden
              rounded-xl
              border
              border-[#D9E0E8]
              lg:block
            "
          >
            <div className="w-full overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr
                    className="
                      bg-[#F5F9FD]
                      text-[#64748B]
                    "
                  >
                    <th className="h-[52px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em]">
                      Student
                    </th>

                    <th className="h-[52px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em]">
                      Campus
                    </th>

                    <th className="h-[52px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em]">
                      Lesson
                    </th>

                    <th className="h-[52px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em]">
                      Reason
                    </th>

                    <th className="h-[52px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em]">
                      Comments
                    </th>

                    <th className="h-[52px] w-[150px] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em]">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {records.map((record) => (
                    <tr
                      key={record.id}
                      className="
                        border-t
                        border-[#D9E0E8]
                        text-[#10213A]
                        transition-colors
                        odd:bg-white
                        even:bg-[#F8FAFC]
                        hover:bg-[#FFF8E7]
                      "
                    >
                      <td className="px-4 py-4 align-middle text-sm font-medium">
                        {record.student_name}
                      </td>

                      <td className="px-4 py-4 align-middle text-sm">
                        {record.campus || "—"}
                      </td>

                      <td className="px-4 py-4 align-middle text-sm">
                        {record.lesson_date}
                      </td>

                      <td className="px-4 py-4 align-middle text-sm">
                        {record.reason}
                      </td>

                      <td className="max-w-[360px] px-4 py-4 align-middle text-sm text-[#64748B]">
                        <div className="break-words">
                          {record.comments || "—"}
                        </div>
                      </td>

                      <td className="px-4 py-4 align-middle">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              onEdit(record)
                            }
                            className="
                              inline-flex
                              min-h-[36px]
                              items-center
                              justify-center
                              rounded-lg
                              border
                              border-[#D9E0E8]
                              bg-white
                              px-3
                              py-1.5
                              text-xs
                              font-medium
                              text-[#10213A]
                              transition
                              hover:border-[#D4AF37]
                              hover:bg-[#FFF8E7]
                            "
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onDelete(record)
                            }
                            className="
                              inline-flex
                              min-h-[36px]
                              items-center
                              justify-center
                              rounded-lg
                              border
                              border-[#E5B4B4]
                              bg-white
                              px-3
                              py-1.5
                              text-xs
                              font-medium
                              text-[#B42318]
                              transition
                              hover:bg-[#FFF1F1]
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
        )}

        {records.length > 0 && (
          <div
            className="
              mt-6
              w-full
              min-w-0
              space-y-3
              lg:hidden
            "
          >
            {records.map((record) => (
              <div
                key={record.id}
                className="
                  w-full
                  rounded-xl
                  border
                  border-[#D9E0E8]
                  bg-[#F5F9FD]
                  p-4
                "
              >
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
                      Student
                    </p>

                    <p className="mt-1 break-words text-sm font-semibold text-[#10213A]">
                      {record.student_name}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
                        Campus
                      </p>

                      <p className="mt-1 break-words text-sm text-[#10213A]">
                        {record.campus || "—"}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
                        Lesson
                      </p>

                      <p className="mt-1 break-words text-sm text-[#10213A]">
                        {record.lesson_date}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
                      Reason
                    </p>

                    <p className="mt-1 break-words text-sm font-medium text-[#10213A]">
                      {record.reason}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
                      Comments
                    </p>

                    <p className="mt-1 break-words text-sm leading-5 text-[#64748B]">
                      {record.comments || "—"}
                    </p>
                  </div>

                  <div
                    className="
                      flex
                      gap-2
                      border-t
                      border-[#D9E0E8]
                      pt-3
                    "
                  >
                    <button
                      type="button"
                      onClick={() =>
                        onEdit(record)
                      }
                      className="
                        inline-flex
                        min-h-[40px]
                        flex-1
                        items-center
                        justify-center
                        rounded-lg
                        border
                        border-[#D9E0E8]
                        bg-white
                        px-4
                        py-2
                        text-sm
                        font-medium
                        text-[#10213A]
                        transition
                        hover:border-[#D4AF37]
                        hover:bg-[#FFF8E7]
                      "
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onDelete(record)
                      }
                      className="
                        inline-flex
                        min-h-[40px]
                        flex-1
                        items-center
                        justify-center
                        rounded-lg
                        border
                        border-[#E5B4B4]
                        bg-white
                        px-4
                        py-2
                        text-sm
                        font-medium
                        text-[#B42318]
                        transition
                        hover:bg-[#FFF1F1]
                      "
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}