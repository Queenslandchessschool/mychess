"use client";

interface StudentTableProps {
  students: any[];
  onEdit: (student: any) => void;
  onToggleStatus: (student: any) => void;
}

export default function StudentTable({
  students,
  onEdit,
  onToggleStatus,
}: StudentTableProps) {
  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">

      <div className="px-5 py-4 border-b">
        <h2 className="text-xl font-semibold">
          Student List
        </h2>
      </div>

      <table className="w-full">

        <thead className="bg-slate-100">

          <tr className="text-left">

            <th className="p-3 border-b">Code</th>
            <th className="p-3 border-b">First Name</th>
            <th className="p-3 border-b">Last Name</th>
            <th className="p-3 border-b">School</th>
            <th className="p-3 border-b">Level</th>
            <th className="p-3 border-b">Stage</th>
            <th className="p-3 border-b">Status</th>
            <th className="p-3 border-b text-center">Actions</th>

          </tr>

        </thead>

        <tbody>

          {students.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                className="text-center text-gray-500 py-8"
              >
                No students found.
              </td>
            </tr>
          ) : (
            students.map((student) => (
              <tr
                key={student.id}
                className="hover:bg-slate-50"
              >
                <td className="p-3 border-b">
                  {student.student_code}
                </td>

                <td className="p-3 border-b">
                  {student.first_name}
                </td>

                <td className="p-3 border-b">
                  {student.last_name}
                </td>

                <td className="p-3 border-b">
                  {student.school}
                </td>

                <td className="p-3 border-b">
                  {student.current_level}
                </td>
                <td className="p-3 border-b">
  {student.student_stage === "Trial" ? (
    <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
      Trial
    </span>
  ) : (
    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
      Regular
    </span>
  )}
</td>
<td className="p-3 border-b">
  {student.status === "Inactive" ? (
    <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700">
      Inactive
    </span>
  ) : (
    <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
      Active
    </span>
  )}
</td>
                <td className="p-3 border-b text-center">
<div className="flex justify-center gap-2">
  <button
    onClick={() => onEdit(student)}
    className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
  >
    Edit
  </button>

  <button
    onClick={() => onToggleStatus(student)}
    className={`rounded px-3 py-1 text-sm text-white ${
      student.status === "Inactive"
        ? "bg-green-600 hover:bg-green-700"
        : "bg-gray-600 hover:bg-gray-700"
    }`}
  >
    {student.status === "Inactive" ? "Activate" : "Deactivate"}
  </button>
</div>
</td>
              </tr>
            ))
          )}

        </tbody>

      </table>
    </div>
  );
}