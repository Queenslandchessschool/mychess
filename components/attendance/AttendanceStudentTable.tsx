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
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">

      <table className="w-full">

        <thead className="bg-gray-100">

          <tr>

            <th className="text-left px-4 py-3">
              Student
            </th>

            <th className="text-center w-24">
              Present
            </th>

            <th className="text-center w-24">
              Absent
            </th>

            <th className="text-center w-24">
              Late
            </th>

            <th className="text-center w-24">
              Leave
            </th>

          </tr>

        </thead>

        <tbody>

          {students.map((student) => (

            <tr
              key={student.student_id}
              className="border-t hover:bg-gray-50 transition-colors"
            >

              <td className="px-4 py-3">

                <div className="flex items-center gap-2">

                <div>

  <button
  type="button"
  onClick={() => onStudentClick(student)}
  className="font-medium text-left hover:text-blue-600 transition"
>
  {student.student_name}
</button>

  <div className="text-xs text-gray-500">
  {student.student_code}
  {" • "}
  {student.current_level}
</div>

</div>

                  {student.isTrial && (
                    <span title="Trial Student">
                      🧪
                    </span>
                  )}

                 {student.classroom_pickup && (
  <span title="Classroom Pickup">
    🏫
  </span>
)}

{student.ymca_dropoff && (
  <span title="YMCA Drop-off">
    🚐
  </span>
)}

{student.walk_home && (
  <span title="Walk Home">
    🚶
  </span>
)}

{student.has_medical && (
  <span
    title="Medical Information"
    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-600 text-white text-xs font-bold border border-white"
  >
    +
  </span>
)}

                </div>

              </td>

              <StatusButton
                active={student.attendance_status === "Present"}
                color="green"
                onClick={() =>
                  onStatusChange(student.student_id, "Present")
                }
              />

              <StatusButton
                active={student.attendance_status === "Absent"}
                color="red"
                onClick={() =>
                  onStatusChange(student.student_id, "Absent")
                }
              />

              <StatusButton
                active={student.attendance_status === "Late"}
                color="orange"
                onClick={() =>
                  onStatusChange(student.student_id, "Late")
                }
              />

             <StatusButton
  active={student.attendance_type === "Excused"}
  color="blue"
  disabled={student.attendance_type === "Excused"}
  onClick={() => {}}
/>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}

interface StatusButtonProps {
  active: boolean;

  color:
    | "green"
    | "red"
    | "orange"
    | "blue";

  onClick: () => void;

  disabled?: boolean;
}

function StatusButton({
  active,
  color,
  onClick,
  disabled = false,
}: StatusButtonProps) {

  const styles = {
    green: active
      ? "bg-green-600 text-white"
      : "bg-gray-100 hover:bg-green-100",

    red: active
      ? "bg-red-600 text-white"
      : "bg-gray-100 hover:bg-red-100",

    orange: active
      ? "bg-orange-500 text-white"
      : "bg-gray-100 hover:bg-orange-100",

    blue: active
      ? "bg-blue-600 text-white"
      : "bg-gray-100 hover:bg-blue-100",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`
        px-3
        py-1
        rounded-lg
        text-sm
        font-medium
        transition
        ${styles[color]}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      {color === "green" && "Present"}
      {color === "red" && "Absent"}
      {color === "orange" && "Late"}
      {color === "blue" && "Excused"}
    </button>
  );
}