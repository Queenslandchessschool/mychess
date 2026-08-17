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

  const currentStatus =
  student.attendance_status ?? "Present";

const nextStatus =
  currentStatus === "Present"
    ? "Absent"
    : currentStatus === "Absent"
      ? "Late"
      : "Present";

const statusColor =
  currentStatus === "Present"
    ? "green"
    : currentStatus === "Absent"
      ? "red"
      : "orange";

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
      {/* Identity + Current Status */}
<div className="flex min-w-0 items-center justify-between gap-2">
  <div className="min-w-0 flex-1">
    <StudentIdentity
      student={student}
      onStudentClick={onStudentClick}
    />
  </div>

  {!isExcused && !isHoliday && (
    <StatusButton
      active
      color={statusColor}
      compact
      onClick={() =>
        onStatusChange(
          student.student_id,
          nextStatus
        )
      }
    />
  )}

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
  const isTrial = student.isTrial;

  const isExcused =
    student.attendance_type === "Excused";

  const isHoliday =
    student.attendance_type === "Holiday";

  return (
    <div className="flex min-w-0 items-center gap-2">
      {/* Trial / Leave / Holiday / Make-up icon */}
      {isTrial && (
        <span
          title="Trial Student"
          className="shrink-0 text-base leading-none"
        >
          ⭐
        </span>
      )}

      {student.attendance_type === "Make-up" && (
        <span
          title="Make-up Student"
          className="shrink-0 text-base leading-none"
        >
          🔄
        </span>
      )}

      {isExcused && (
        <span
          title="Leave"
          className="shrink-0 text-base leading-none"
        >
          ❌
        </span>
      )}

      {isHoliday && (
        <span
          title="Holiday"
          className="shrink-0 text-base leading-none"
        >
          🏖
        </span>
      )}

      {/* Student Name */}
      <button
        type="button"
        onClick={() => onStudentClick(student)}
        className="
          flex
          min-w-0
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

        {/* Special Requests */}
        {student.classroom_pickup &&
  student.school_class && (
    <span
      title={`Classroom Pickup · ${student.school_class}`}
      className="
        inline-flex
        shrink-0
        items-center
        gap-1
        text-sm
        font-medium
        text-[#64748B]
      "
    >
      <span className="text-base leading-none">
        🏫
      </span>

      <span>
        {student.school_class}
      </span>
    </span>
  )}

        {student.ymca_dropoff && (
          <span
            title="YMCA Drop-off"
            className="
              inline-flex
              shrink-0
              items-center
              justify-center
              text-base
              leading-none
            "
          >
            🚐
          </span>
        )}

        {student.walk_home && (
          <span
            title="Walk Home"
            className="
              inline-flex
              shrink-0
              items-center
              justify-center
              text-base
              leading-none
            "
          >
            🚶
          </span>
        )}

        {/* Medical Badge */}
        {student.has_medical && (
          <span
            title="Medical information"
            className="
              inline-flex
              h-5
              w-5
              shrink-0
              items-center
              justify-center
              rounded-full
              bg-red-600
              text-[11px]
              font-bold
              text-white
            "
          >
            +
          </span>
        )}
      </button>
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