"use client";

import { Fragment, useState } from "react";

interface ParentTableProps {
  families: any[];
  familyCount: number;
  studentCount: number;
  onEdit: (family: any) => void;
}

export default function ParentTable({
  families,
  familyCount,
  studentCount,
  onEdit,
}: ParentTableProps) {
  const [expandedFamilyId, setExpandedFamilyId] =
    useState<string | null>(null);

  function toggleStudents(familyId: string) {
    setExpandedFamilyId((current) =>
      current === familyId ? null : familyId
    );
  }

  return (
    <section
      className="
        relative
        overflow-hidden
        rounded-[18px]
        border
        border-[#D4AF37]/30
        bg-[#102B4D]
      "
    >
      {/* Gold gradient top line */}
      <div
        className="
          absolute
          left-0
          right-0
          top-0
          h-[3px]
          bg-gradient-to-r
          from-[#D4AF37]
          via-[#D4AF37]/70
          to-transparent
        "
      />

      {/* Records Header */}
      <div
        className="
          flex
          flex-col
          gap-2
          border-b
          border-white/10
          px-5
          py-5
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >
        <div>
          <p
            className="
              text-xs
              font-medium
              uppercase
              tracking-[0.16em]
              text-[#D4AF37]
            "
          >
            FAMILY LIST
          </p>

        
        </div>

        <div
          className="
            text-sm
            text-[#C8D2DF]/75
            sm:text-right
          "
        >
          <span>{familyCount} Families</span>

          <span className="mx-2 text-[#D4AF37]/60">
            ·
          </span>

          <span>{studentCount} Students</span>
        </div>
      </div>

                {/* Desktop Table */}
      <div
        className="
          hidden
          overflow-auto
          md:block
          max-h-[calc(100vh-330px)]
        "
      >
        <table
          className="
            w-full
            table-fixed
            border-collapse
            text-sm
          "
        >
          <thead
            className="
              sticky
              top-0
              z-20
              bg-[#102B4D]
            "
          >
            <tr
              className="
                border-b
                border-[#D4AF37]/40
                text-left
                text-xs
                uppercase
                tracking-wide
                text-[#9FB0C5]
              "
            >
              <th className="w-[14.63%] px-5 py-3 font-medium">
                Parent
              </th>

              <th className="w-[12.80%] px-5 py-3 font-medium">
                Parent 2
              </th>

              <th className="w-[24.39%] px-5 py-3 font-medium">
                Email
              </th>

              <th className="w-[15.85%] px-5 py-3 font-medium">
                Mobile
              </th>

              <th className="w-[14.63%] px-5 py-3 font-medium">
                Relationship
              </th>

              <th className="w-[8.54%] px-5 py-3 font-medium">
                Students
              </th>

              <th className="w-[9.16%] px-5 py-3 text-right font-medium">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {families.map((family, index) => {
              const students =
                family.students ?? [];

              const isExpanded =
                expandedFamilyId ===
                family.family_id;

              return (
                <Fragment
                  key={family.family_id}
                >
                  <tr
                    className={
                      index % 2 === 0
                        ? "bg-white"
                        : "bg-[#FFFCF3]"
                    }
                  >
                    {/* Parent */}
                    <td
                      className="
                        px-5
                        py-3.5
                        font-semibold
                        text-[#10213A]
                      "
                    >
                      {family.parent1_name || "—"}
                    </td>

                    {/* Parent 2 */}
                    <td
                      className="
                        px-5
                        py-3.5
                        text-[#10213A]
                      "
                    >
                      {family.parent2_name || "—"}
                    </td>

                    {/* Email */}
                    <td
                      className="
                        min-w-0
                        truncate
                        px-5
                        py-3.5
                        text-[#10213A]
                      "
                      title={family.email || ""}
                    >
                      {family.email || "—"}
                    </td>

                    {/* Mobile */}
                    <td
                      className="
                        px-5
                        py-3.5
                        text-[#10213A]
                      "
                    >
                      {family.mobile || "—"}
                    </td>

                    {/* Relationship */}
                    <td
                      className="
                        px-5
                        py-3.5
                        text-[#10213A]
                      "
                    >
                      {family.relationship || "—"}
                    </td>

                    {/* Students */}
                    <td className="px-5 py-3.5">
                      {students.length > 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            toggleStudents(
                              family.family_id
                            )
                          }
                          className="
                            inline-flex
                            min-w-[36px]
                            items-center
                            justify-center
                            rounded-lg
                            border
                            border-[#D9E0E8]
                            bg-white
                            px-2.5
                            py-1.5
                            text-xs
                            font-medium
                            text-[#10213A]
                            transition-all
                            duration-200
                            hover:border-[#D4AF37]
                            hover:bg-[#FFFDF5]
                            hover:text-[#8A6900]
                            active:scale-[0.98]
                          "
                        >
                          {students.length}
                        </button>
                      ) : (
                        <span className="text-[#64748B]">
                          —
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td
                      className="
                        px-5
                        py-3.5
                        text-right
                      "
                    >
                      <button
                        type="button"
                        onClick={() =>
                          onEdit(family)
                        }
                        className="
                          rounded-lg
                          border
                          border-[#D9E0E8]
                          bg-white
                          px-3
                          py-1.5
                          text-xs
                          font-medium
                          text-[#10213A]
                          transition-all
                          duration-200
                          hover:border-[#D4AF37]
                          hover:bg-[#FFFDF5]
                          hover:text-[#8A6900]
                          active:scale-[0.98]
                        "
                      >
                        Edit
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Students */}
                  {isExpanded && (
                    <tr>
                      <td
                        colSpan={7}
                        className="
                          border-b
                          border-[#D9E0E8]
                          bg-[#F8FAFC]
                          px-5
                          py-4
                        "
                      >
                        <div
                          className="
                            mb-3
                            text-xs
                            font-medium
                            uppercase
                            tracking-[0.14em]
                            text-[#64748B]
                          "
                        >
                          Students in {family.family_id}
                        </div>

                        <div
                          className="
                            overflow-hidden
                            rounded-lg
                            border
                            border-[#D9E0E8]
                            bg-white
                          "
                        >
                          {students.map(
                            (
                              student: any,
                              studentIndex: number
                            ) => (
                              <div
                                key={student.id}
                                className={`
                                  grid
                                  grid-cols-[1fr_1.4fr_1fr_0.8fr]
                                  items-center
                                  px-4
                                  py-3
                                  text-sm
                                  ${
                                    studentIndex %
                                      2 ===
                                    0
                                      ? "bg-white"
                                      : "bg-[#FFFCF3]"
                                  }
                                  ${
                                    studentIndex <
                                    students.length - 1
                                      ? "border-b border-[#D9E0E8]"
                                      : ""
                                  }
                                `}
                              >
                                <div className="text-[#64748B]">
                                  {student.student_code ||
                                    "—"}
                                </div>

                                <div
                                  className="
                                    font-semibold
                                    text-[#10213A]
                                  "
                                >
                                  {student.first_name}{" "}
                                  {student.last_name}
                                </div>

                                <div className="text-[#10213A]">
                                  {student.current_level ||
                                    "—"}
                                </div>

                                <div>
                                  <span
                                    className={`
                                      inline-flex
                                      rounded-full
                                      px-2.5
                                      py-1
                                      text-xs
                                      font-medium
                                      ${
                                        student.status ===
                                        "Active"
                                          ? "bg-[#EAF7EE] text-[#16834A]"
                                          : "bg-[#F1F5F9] text-[#64748B]"
                                      }
                                    `}
                                  >
                                    {student.status ||
                                      "—"}
                                  </span>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}

            {families.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="
                    bg-white
                    px-5
                    py-12
                    text-center
                    text-sm
                    text-[#64748B]
                  "
                >
                  No family records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Family Cards */}
      <div
        className="
          divide-y
          divide-[#D9E0E8]
          md:hidden
          max-h-[calc(100vh-300px)]
          overflow-y-auto
        "
      >
        {families.map((family, index) => {
          const students =
            family.students ?? [];

          const isExpanded =
            expandedFamilyId ===
            family.family_id;

          return (
            <div
              key={family.family_id}
              className={
                index % 2 === 0
                  ? "bg-white"
                  : "bg-[#FFFCF3]"
              }
            >
              {/* Family Summary */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className="
                        text-xs
                        font-medium
                        uppercase
                        tracking-[0.12em]
                        text-[#64748B]
                      "
                    >
                      {family.family_id}
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
                      {family.parent1_name || "—"}
                    </p>

                    {family.parent2_name && (
                      <p
                        className="
                          mt-0.5
                          truncate
                          text-sm
                          text-[#64748B]
                        "
                      >
                        {family.parent2_name}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onEdit(family)
                    }
                    className="
                      shrink-0
                      rounded-lg
                      border
                      border-[#D9E0E8]
                      bg-white
                      px-3
                      py-1.5
                      text-xs
                      font-medium
                      text-[#10213A]
                      transition-all
                      duration-200
                      hover:border-[#D4AF37]
                      hover:bg-[#FFFDF5]
                      hover:text-[#8A6900]
                      active:scale-[0.98]
                    "
                  >
                    Edit
                  </button>
                </div>

                <div
                  className="
                    mt-3
                    grid
                    grid-cols-1
                    gap-2
                    text-sm
                  "
                >
                  <div className="truncate text-[#10213A]">
                    <span className="text-[#64748B]">
                      Email:
                    </span>{" "}
                    {family.email || "—"}
                  </div>

                  <div className="text-[#10213A]">
                    <span className="text-[#64748B]">
                      Mobile:
                    </span>{" "}
                    {family.mobile || "—"}
                  </div>

                  <div className="text-[#10213A]">
                    <span className="text-[#64748B]">
                      Relationship:
                    </span>{" "}
                    {family.relationship || "—"}
                  </div>
                </div>

                <div className="mt-4">
                  {students.length > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        toggleStudents(
                          family.family_id
                        )
                      }
                      className="
                        w-full
                        rounded-lg
                        border
                        border-[#D9E0E8]
                        bg-white
                        px-3
                        py-2
                        text-sm
                        font-medium
                        text-[#10213A]
                        transition-all
                        duration-200
                        hover:border-[#D4AF37]
                        hover:bg-[#FFFDF5]
                        hover:text-[#8A6900]
                      "
                    >
                      {isExpanded
                        ? "Hide Students"
                        : `View ${students.length} ${
                            students.length === 1
                              ? "Student"
                              : "Students"
                          }`}
                    </button>
                  ) : (
                    <div
                      className="
                        rounded-lg
                        border
                        border-[#D9E0E8]
                        bg-white
                        px-3
                        py-2
                        text-center
                        text-sm
                        text-[#64748B]
                      "
                    >
                      No students linked
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Expanded Students */}
              {isExpanded && (
                <div
                  className="
                    border-t
                    border-[#D9E0E8]
                    bg-[#F8FAFC]
                    px-4
                    py-4
                  "
                >
                  <p
                    className="
                      mb-3
                      text-xs
                      font-medium
                      uppercase
                      tracking-[0.12em]
                      text-[#64748B]
                    "
                  >
                    Students
                  </p>

                  <div className="space-y-2">
                    {students.map(
                      (student: any) => (
                        <div
                          key={student.id}
                          className="
                            rounded-lg
                            border
                            border-[#D9E0E8]
                            bg-white
                            p-3
                          "
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p
                                className="
                                  truncate
                                  font-semibold
                                  text-[#10213A]
                                "
                              >
                                {student.first_name}{" "}
                                {student.last_name}
                              </p>

                              <p
                                className="
                                  mt-1
                                  text-xs
                                  text-[#64748B]
                                "
                              >
                                {student.student_code ||
                                  "—"}
                                {" · "}
                                {student.current_level ||
                                  "—"}
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
                                  student.status ===
                                  "Active"
                                    ? "bg-[#EAF7EE] text-[#16834A]"
                                    : "bg-[#F1F5F9] text-[#64748B]"
                                }
                              `}
                            >
                              {student.status ||
                                "—"}
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {families.length === 0 && (
          <div
            className="
              bg-white
              px-5
              py-12
              text-center
              text-sm
              text-[#64748B]
            "
          >
            No family records found.
          </div>
        )}
      </div>
    </section>
  );
}