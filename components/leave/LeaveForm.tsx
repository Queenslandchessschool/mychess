"use client";

import { LeaveFormData, LeaveReason, StudentOption, LessonOption } from "./types";

interface Props {
  form: LeaveFormData;
  students: StudentOption[];
  lessons: LessonOption[];

  onChange: (data: LeaveFormData) => void;
  onSave: () => void;
  onCancel: () => void;
}

const reasons: LeaveReason[] = [
  "Sick",
  "Holiday",
  "Family",
  "Other",
];

export default function LeaveForm({
  form,
  students,
  lessons,
  onChange,
  onSave,
  onCancel,
}: Props) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">

      <h2 className="text-xl font-semibold">
        Leave Record
      </h2>

      <div>

        <label className="mb-1 block text-sm font-medium">
          Student
        </label>

        <select
          value={form.student_id}
          onChange={(e) =>
            onChange({
              ...form,
              student_id: e.target.value,
            })
          }
          className="w-full rounded-lg border px-3 py-2"
        >
          <option value="">
            Select Student
          </option>

          {students.map((student) => (
            <option
              key={student.id}
              value={student.id}
            >
              {student.name}
            </option>
          ))}
        </select>

      </div>

      <div>

        <label className="mb-1 block text-sm font-medium">
          Lesson
        </label>

        <select
          value={form.lesson_id}
          onChange={(e) =>
            onChange({
              ...form,
              lesson_id: e.target.value,
            })
          }
          className="w-full rounded-lg border px-3 py-2"
        >
          <option value="">
            Select Lesson
          </option>

          {lessons.map((lesson) => (
            <option
              key={lesson.id}
              value={lesson.id}
            >
              {lesson.lesson_date} | {lesson.class_name}
            </option>
          ))}
        </select>

      </div>

      <div>

        <label className="mb-1 block text-sm font-medium">
          Reason
        </label>

        <select
          value={form.reason}
          onChange={(e) =>
            onChange({
              ...form,
              reason: e.target.value as LeaveReason,
            })
          }
          className="w-full rounded-lg border px-3 py-2"
        >
          {reasons.map((reason) => (
            <option
              key={reason}
              value={reason}
            >
              {reason}
            </option>
          ))}
        </select>

      </div>

      <div>

        <label className="mb-1 block text-sm font-medium">
          Comments
        </label>

        <textarea
          value={form.comments}
          onChange={(e) =>
            onChange({
              ...form,
              comments: e.target.value,
            })
          }
          rows={4}
          className="w-full rounded-lg border px-3 py-2"
        />

      </div>

      <div className="flex justify-end gap-3">

        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border px-4 py-2"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={onSave}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Save
        </button>

      </div>

    </div>
  );
}