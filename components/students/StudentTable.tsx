"use client";

import { useMemo, useState } from "react";

interface StudentTableProps {
  students: any[];
  onEdit: (student: any) => void;
  onToggleStatus: (student: any) => void;
}

type SortKey =
  | "student_code"
  | "student"
  | "school"
  | "current_level"
  | "student_stage";

type SortDirection = "asc" | "desc";

export default function StudentTable({
  students,
  onEdit,
  onToggleStatus,
}: StudentTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((current) =>
        current === "asc" ? "desc" : "asc"
      );
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const sortedStudents = useMemo(() => {
    if (!sortKey) {
      return students;
    }

    return [...students].sort((a, b) => {
      let valueA = "";
      let valueB = "";

      switch (sortKey) {
        case "student_code":
          valueA = a.student_code ?? "";
          valueB = b.student_code ?? "";
          break;

        case "student":
          valueA =
            `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim();
          valueB =
            `${b.first_name ?? ""} ${b.last_name ?? ""}`.trim();
          break;

        case "school":
          valueA = a.school ?? "";
          valueB = b.school ?? "";
          break;

        case "current_level":
          valueA = a.current_level ?? "";
          valueB = b.current_level ?? "";
          break;

        case "student_stage":
          valueA = a.student_stage ?? "";
          valueB = b.student_stage ?? "";
          break;
      }

      const comparison = valueA
        .toString()
        .localeCompare(
          valueB.toString(),
          undefined,
          {
            numeric: true,
            sensitivity: "base",
          }
        );

      return sortDirection === "asc"
        ? comparison
        : -comparison;
    });
  }, [students, sortKey, sortDirection]);

  function SortHeader({
    label,
    sortValue,
    className = "",
  }: {
    label: string;
    sortValue: SortKey;
    className?: string;
  }) {
    const isActive = sortKey === sortValue;

    return (
      <button
        type="button"
        onClick={() => handleSort(sortValue)}
        className={`
          inline-flex
          items-center
          gap-1
          text-left
          text-xs
          uppercase
          tracking-wide
          transition-colors
          duration-200
          ${
            isActive
              ? "text-[#D4AF37]"
              : "text-[#C8D2DF]/70 hover:text-[#D4AF37]"
          }
          ${className}
        `}
      >
        <span>{label}</span>

        {isActive && (
          <span className="text-[11px]">
            {sortDirection === "asc" ? "↑" : "↓"}
          </span>
        )}
      </button>
    );
  }

  return (
    <section className="overflow-hidden rounded-[18px] border border-[#D4AF37]/45 bg-[#102B4D]">
      {/* Gold gradient top border */}
      <div className="h-[2px] bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/55 to-transparent" />

      {/* List Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#D4AF37]">
            STUDENT LIST
          </p>

        </div>

        <span className="text-sm text-[#C8D2DF]/70">
          {students.length} students
        </span>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <div
          className="
            max-h-[calc(100vh-260px)]
            overflow-y-auto
            overflow-x-hidden
            border-t border-[#D4AF37]/15
          "
        >
          <table className="w-full table-fixed border-collapse">
            <thead className="sticky top-0 z-10 bg-[#102B4D]">
              <tr className="border-b border-[#D4AF37]/15">
                <th className="w-[12%] px-4 py-3">
                  <SortHeader
                    label="Code"
                    sortValue="student_code"
                  />
                </th>

                <th className="w-[19%] px-4 py-3">
                  <SortHeader
                    label="Student"
                    sortValue="student"
                  />
                </th>

                <th className="w-[17%] px-4 py-3">
                  <SortHeader
                    label="School"
                    sortValue="school"
                  />
                </th>

                <th className="w-[12%] px-4 py-3">
                  <SortHeader
                    label="Level"
                    sortValue="current_level"
                  />
                </th>

                <th className="w-[11%] px-4 py-3">
                  <SortHeader
                    label="Stage"
                    sortValue="student_stage"
                  />
                </th>

                <th className="w-[11%] px-4 py-3 text-left">
                  <span className="text-xs uppercase tracking-wide text-[#C8D2DF]/70">
                    Status
                  </span>
                </th>

                <th className="w-[18%] px-3 py-3 text-right">
                  <span className="text-xs uppercase tracking-wide text-[#C8D2DF]/70">
                    Actions
                  </span>
                </th>
              </tr>
            </thead>

            <tbody>
              {sortedStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-[#C8D2DF]"
                  >
                    No students found.
                  </td>
                </tr>
              ) : (
                sortedStudents.map((student, index) => {
                  const isInactive =
                    student.status === "Inactive";

                  const isTrial =
                    student.student_stage === "Trial";

                  return (
                    <tr
                      key={student.id}
                      className={`
                        border-b border-[#0D2444]/15
                        text-sm
                        text-[#10213A]
                        transition-colors
                        duration-200
                        ${
                          index % 2 === 0
                            ? "bg-white"
                            : "bg-[#F8F5ED]"
                        }
                      `}
                    >
                      {/* Code */}
                      <td className="px-4 py-3.5">
                        <span className="block truncate font-medium">
                          {student.student_code || "—"}
                        </span>
                      </td>

                      {/* Student */}
                      <td className="px-4 py-3.5">
                        <div className="truncate font-semibold">
                          {student.first_name}{" "}
                          {student.last_name}
                        </div>

                        {student.preferred_name && (
                          <div className="mt-0.5 truncate text-xs text-[#64748B]">
                            {student.preferred_name}
                          </div>
                        )}
                      </td>

                      {/* School */}
                      <td className="px-4 py-3.5">
                        <span className="block truncate">
                          {student.school || "—"}
                        </span>
                      </td>

                      {/* Level */}
                      <td className="px-4 py-3.5">
                        <span className="block truncate">
                          {student.current_level || "—"}
                        </span>
                      </td>

                      {/* Stage */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {isTrial ? "Trial" : "Regular"}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`
                            inline-flex
                            rounded-full
                            px-2.5
                            py-1
                            text-xs
                            font-semibold
                            ${
                              isInactive
                                ? "bg-[#F1F3F5] text-[#64748B]"
                                : "bg-[#EEF7EF] text-[#39734A]"
                            }
                          `}
                        >
                          {student.status || "Active"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              onEdit(student)
                            }
                            className="
                              shrink-0
                              rounded-lg
                              border
                              border-[#0D2444]/20
                              px-2.5
                              py-1.5
                              text-xs
                              font-medium
                              text-[#10213A]
                              transition-colors
                              duration-200
                              hover:border-[#D4AF37]
                              hover:text-[#8A6900]
                              active:border-[#D4AF37]
                            "
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onToggleStatus(student)
                            }
                            className="
                              shrink-0
                              rounded-lg
                              border
                              border-[#0D2444]/15
                              px-2.5
                              py-1.5
                              text-xs
                              font-medium
                              text-[#64748B]
                              transition-colors
                              duration-200
                              hover:border-[#D4AF37]
                              hover:text-[#8A6900]
                              active:border-[#D4AF37]
                            "
                          >
                            {isInactive
                              ? "Activate"
                              : "Deactivate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile List */}
      <div className="md:hidden">
        {sortedStudents.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-[#C8D2DF]">
            No students found.
          </div>
        ) : (
          <div className="max-h-[calc(100vh-240px)] overflow-y-auto border-t border-[#D4AF37]/15">
            {sortedStudents.map((student, index) => {
              const isInactive =
                student.status === "Inactive";

              const isTrial =
                student.student_stage === "Trial";

              return (
                <div
                  key={student.id}
                  className={`
                    border-b
                    border-[#0D2444]/10
                    px-4
                    py-4
                    ${
                      index % 2 === 0
                        ? "bg-white"
                        : "bg-[#F8F5ED]"
                    }
                  `}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#10213A]">
                        {student.first_name}{" "}
                        {student.last_name}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-[#64748B]">
                        {student.student_code || "No code"}
                        {student.current_level
                          ? ` · ${student.current_level}`
                          : ""}
                      </p>
                    </div>

                    <span
                      className={`
                        shrink-0
                        rounded-full
                        px-2.5
                        py-1
                        text-[11px]
                        font-semibold
                        ${
                          isInactive
                            ? "bg-[#F1F3F5] text-[#64748B]"
                            : "bg-[#EEF7EF] text-[#39734A]"
                        }
                      `}
                    >
                      {student.status || "Active"}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[#64748B]">
                    <span className="truncate">
                      {student.school || "No school"}
                    </span>

                    <span className="shrink-0">
                      {isTrial ? "Trial" : "Regular"}
                    </span>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(student)}
                      className="
                        flex-1
                        rounded-lg
                        border
                        border-[#0D2444]/20
                        px-3
                        py-2
                        text-xs
                        font-medium
                        text-[#10213A]
                        transition-colors
                        duration-200
                        hover:border-[#D4AF37]
                        hover:text-[#8A6900]
                        active:border-[#D4AF37]
                      "
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onToggleStatus(student)
                      }
                      className="
                        flex-1
                        rounded-lg
                        border
                        border-[#0D2444]/15
                        px-3
                        py-2
                        text-xs
                        font-medium
                        text-[#64748B]
                        transition-colors
                        duration-200
                        hover:border-[#D4AF37]
                        hover:text-[#8A6900]
                        active:border-[#D4AF37]
                      "
                    >
                      {isInactive
                        ? "Activate"
                        : "Deactivate"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}