"use client";

import type { AttendanceStudent } from "./types";

interface Props {
  students: AttendanceStudent[];

  onStatusChange: (
    studentId: string,
    status: AttendanceStudent["attendance_status"]
  ) => void;

  onStudentClick: (
    student: AttendanceStudent
  ) => void;
}

export default function AttendanceStudentTable({
  students,
  onStatusChange,
  onStudentClick,
}: Props) {
  return (
    <section
      className="
        relative
        overflow-hidden
        rounded-2xl
        border
        border-[#D4AF37]/30
        bg-[#FFFDF8]
        shadow-sm
      "
    >
      {/* Gold Tapered Accent */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          left-0
          right-0
          top-0
          h-[6px]
          bg-gradient-to-r
          from-[#F7D968]
          via-[#D4AF37]/75
          to-transparent
          [clip-path:polygon(0_0,100%_42%,100%_58%,0_100%)]
        "
      />

      {/* Desktop */}
      <div className="hidden overflow-x-auto pt-6 md:block">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-[#D9E3ED] bg-[#F5F9FD]">
              <th
                className="
                  px-5
                  py-3
                  text-left
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.14em]
                  text-[#64748B]
                "
              >
                Student
              </th>

              <th
                className="
                  w-[110px]
                  px-2
                  py-3
                  text-center
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.12em]
                  text-[#64748B]
                "
              >
                Present
              </th>

              <th
                className="
                  w-[110px]
                  px-2
                  py-3
                  text-center
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.12em]
                  text-[#64748B]
                "
              >
                Absent
              </th>

              <th
                className="
                  w-[110px]
                  px-2
                  py-3
                  text-center
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.12em]
                  text-[#64748B]
                "
              >
                Late
              </th>

              <th
                className="
                  w-[110px]
                  px-2
                  py-3
                  text-center
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.12em]
                  text-[#64748B]
                "
              >
                Leave
              </th>
            </tr>
          </thead>

          <tbody>
            {students.map((student) => (
              <StudentRow
                key={student.student_id}
                student={student}
                onStatusChange={onStatusChange}
                onStudentClick={onStudentClick}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="space-y-2 px-3 pb-3 pt-6 md:hidden">
        {students.map((student) => (
          <MobileStudentCard
            key={student.student_id}
            student={student}
            onStatusChange={onStatusChange}
            onStudentClick={onStudentClick}
          />
        ))}
      </div>

      {students.length === 0 && (
        <div className="px-5 py-12 text-center">
          <p className="text-sm font-medium text-[#10213A]">
            No students found
          </p>

          <p className="mt-1 text-xs text-[#64748B]">
            Attendance students will appear here.
          </p>
        </div>
      )}
    </section>
  );
}


/* =========================================================
   Desktop Student Row
   ========================================================= */

function StudentRow({
  student,
  onStatusChange,
  onStudentClick,
}: {
  student: AttendanceStudent;

  onStatusChange: (
    studentId: string,
    status: AttendanceStudent["attendance_status"]
  ) => void;

  onStudentClick: (
    student: AttendanceStudent
  ) => void;
}) {
  const isExcused =
    student.attendance_type === "Excused";

  const isHoliday =
    student.attendance_type === "Holiday";

  return (
    <tr
      className="
        border-b
        border-[#E5EAF0]
        last:border-b-0
        transition-colors
        hover:bg-[#F8FBFE]
      "
    >
      {/* Student */}
      <td className="px-5 py-3.5">
        <StudentIdentity
          student={student}
          onStudentClick={onStudentClick}
        />

        {(isExcused || isHoliday) && (
          <SpecialStatus
            type={
              isExcused
                ? "Excused"
                : "Holiday"
            }
          />
        )}
      </td>

      {/* Present */}
      <td className="px-2 py-3.5 text-center">
        <StatusButton
          active={
            student.attendance_status ===
            "Present"
          }
          color="green"
          onClick={() =>
            onStatusChange(
              student.student_id,
              "Present"
            )
          }
        />
      </td>

      {/* Absent */}
      <td className="px-2 py-3.5 text-center">
        <StatusButton
          active={
            student.attendance_status ===
            "Absent"
          }
          color="red"
          onClick={() =>
            onStatusChange(
              student.student_id,
              "Absent"
            )
          }
        />
      </td>

      {/* Late */}
      <td className="px-2 py-3.5 text-center">
        <StatusButton
          active={
            student.attendance_status ===
            "Late"
          }
          color="orange"
          onClick={() =>
            onStatusChange(
              student.student_id,
              "Late"
            )
          }
        />
      </td>

      {/* Leave */}
      <td className="px-2 py-3.5 text-center">
        <StatusButton
          active={isExcused}
          color="blue"
          disabled={isExcused}
          onClick={() => {}}
        />
      </td>
    </tr>
  );
}


/* =========================================================
   Mobile Student Card
   ========================================================= */

function MobileStudentCard({
  student,
  onStatusChange,
  onStudentClick,
}: {
  student: AttendanceStudent;

  onStatusChange: (
    studentId: string,
    status: AttendanceStudent["attendance_status"]
  ) => void;

  onStudentClick: (
    student: AttendanceStudent
  ) => void;
}) {
  const isExcused =
    student.attendance_type === "Excused";

  const isHoliday =
    student.attendance_type === "Holiday";

  return (
    <div
      className="
        rounded-xl
        border
        border-[#D9E3ED]
        bg-white
        px-3
        py-3
      "
    >
      {/* Identity */}
      <div className="flex items-start justify-between gap-3">
        <StudentIdentity
          student={student}
          onStudentClick={onStudentClick}
        />

        {(isExcused || isHoliday) && (
          <SpecialStatus
            type={
              isExcused
                ? "Excused"
                : "Holiday"
            }
          />
        )}
      </div>

      {/* Attendance Controls */}
      <div
        className="
          mt-3
          grid
          grid-cols-4
          gap-1.5
          border-t
          border-[#E5EAF0]
          pt-3
        "
      >
        <StatusButton
          active={
            student.attendance_status ===
            "Present"
          }
          color="green"
          compact
          onClick={() =>
            onStatusChange(
              student.student_id,
              "Present"
            )
          }
        />

        <StatusButton
          active={
            student.attendance_status ===
            "Absent"
          }
          color="red"
          compact
          onClick={() =>
            onStatusChange(
              student.student_id,
              "Absent"
            )
          }
        />

        <StatusButton
          active={
            student.attendance_status ===
            "Late"
          }
          color="orange"
          compact
          onClick={() =>
            onStatusChange(
              student.student_id,
              "Late"
            )
          }
        />

        <StatusButton
          active={isExcused}
          color="blue"
          compact
          disabled={isExcused}
          onClick={() => {}}
        />
      </div>
    </div>
  );
}


/* =========================================================
   Student Identity
   ========================================================= */

function StudentIdentity({
  student,
  onStudentClick,
}: {
  student: AttendanceStudent;

  onStudentClick: (
    student: AttendanceStudent
  ) => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {/* Student Initial */}
      <div
        className="
          flex
          h-9
          w-9
          shrink-0
          items-center
          justify-center
          rounded-full
          bg-[#EAF2FA]
          text-xs
          font-bold
          text-[#102B4D]
        "
      >
        {student.first_name
          ?.charAt(0)
          .toUpperCase()}
      </div>

      <div className="min-w-0">
        <button
          type="button"
          onClick={() =>
            onStudentClick(student)
          }
          className="
            flex
            max-w-full
            items-center
            gap-1.5
            text-left
            font-semibold
            text-[#10213A]
            transition-colors
            hover:text-[#9A7415]
          "
        >
          <span className="truncate">
            {student.student_name}
          </span>

          {/* Trial */}
          {student.isTrial && (
            <span
              title="Trial Student"
              className="
                inline-flex
                h-5
                w-5
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-[#FFF3C7]
                text-[11px]
                text-[#A77B16]
              "
            >
              ★
            </span>
          )}
        </button>

        <div
          className="
            mt-1
            flex
            flex-wrap
            items-center
            gap-1.5
            text-[10px]
            text-[#94A3B8]
          "
        >
          {student.current_level && (
            <span>
              {student.current_level}
            </span>
          )}

          {student.classroom_pickup && (
            <span
              title="School pickup"
              className="
                inline-flex
                items-center
                justify-center
                rounded-full
                bg-[#F5F9FD]
                px-1.5
                py-0.5
              "
            >
              🚗
            </span>
          )}

          {student.ymca_dropoff && (
            <span
              title="YMCA drop-off"
              className="
                inline-flex
                items-center
                justify-center
                rounded-full
                bg-[#F5F9FD]
                px-1.5
                py-0.5
              "
            >
              🚌
            </span>
          )}

          {student.walk_home && (
            <span
              title="Walk home"
              className="
                inline-flex
                items-center
                justify-center
                rounded-full
                bg-[#F5F9FD]
                px-1.5
                py-0.5
              "
            >
              🚶
            </span>
          )}

          {student.has_medical && (
            <span
              title="Medical information"
              className="
                inline-flex
                h-5
                min-w-5
                items-center
                justify-center
                rounded-full
                bg-red-600
                px-1
                text-[10px]
                font-bold
                text-white
              "
            >
              +
            </span>
          )}
        </div>
      </div>
    </div>
  );
}


/* =========================================================
   Special Status
   ========================================================= */

function SpecialStatus({
  type,
}: {
  type: "Excused" | "Holiday";
}) {
  return (
    <span
      className={`
        inline-flex
        shrink-0
        items-center
        rounded-full
        border
        px-2
        py-1
        text-[10px]
        font-semibold
        uppercase
        tracking-[0.06em]
        ${
          type === "Excused"
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : "border-[#D9E3ED] bg-[#F5F9FD] text-[#64748B]"
        }
      `}
    >
      {type === "Excused"
        ? "Leave"
        : "Holiday"}
    </span>
  );
}


/* =========================================================
   Status Button
   ========================================================= */

interface StatusButtonProps {
  active: boolean;

  color:
    | "green"
    | "red"
    | "orange"
    | "blue";

  onClick: () => void;

  disabled?: boolean;

  compact?: boolean;
}

function StatusButton({
  active,
  color,
  onClick,
  disabled = false,
  compact = false,
}: StatusButtonProps) {
  const styles = {
    green: active
      ? "border-green-600 bg-green-600 text-white"
      : "border-[#D9E3ED] bg-[#F5F9FD] text-[#64748B] hover:border-green-300 hover:bg-green-50 hover:text-green-700",

    red: active
      ? "border-red-600 bg-red-600 text-white"
      : "border-[#D9E3ED] bg-[#F5F9FD] text-[#64748B] hover:border-red-300 hover:bg-red-50 hover:text-red-700",

    orange: active
      ? "border-orange-500 bg-orange-500 text-white"
      : "border-[#D9E3ED] bg-[#F5F9FD] text-[#64748B] hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700",

    blue: active
      ? "border-blue-600 bg-blue-600 text-white"
      : "border-[#D9E3ED] bg-[#F5F9FD] text-[#64748B] hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`
        inline-flex
        items-center
        justify-center
        rounded-lg
        border
        font-medium
        transition-all
        duration-150
        ${
          compact
            ? "min-h-[38px] px-1.5 text-[11px]"
            : "min-h-[34px] min-w-[82px] px-3 text-xs"
        }
        ${styles[color]}
        ${
          disabled
            ? "cursor-not-allowed opacity-60"
            : "active:scale-[0.97]"
        }
      `}
    >
      {color === "green" && (
        <>
          <span className="mr-1">
            ✓
          </span>
          Present
        </>
      )}

      {color === "red" && (
        <>
          <span className="mr-1">
            ×
          </span>
          Absent
        </>
      )}

      {color === "orange" && (
        <>
          <span className="mr-1">
            ◷
          </span>
          Late
        </>
      )}

      {color === "blue" && (
        <>
          <span className="mr-1">
            ●
          </span>
          Leave
        </>
      )}
    </button>
  );
}