"use client";

import type {
  MakeupFormData,
  StudentOption,
} from "./types";

interface Props {
  form: MakeupFormData;

  students: StudentOption[];

  onChange: (
    form: MakeupFormData
  ) => void;

  onSave: () => void;

  onCancel: () => void;
}

export default function MakeupForm({
  form,
  students,
  onChange,
  onSave,
  onCancel,
}: Props) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">

      <h2 className="mb-6 text-2xl font-semibold">
        Grant Make-up Credit
      </h2>

      <div className="space-y-4">

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
            Credits
          </label>

          <input
            type="number"
            value={form.credits}
            min={1}
            onChange={(e) =>
              onChange({
                ...form,
                credits: Number(e.target.value),
              })
            }
            className="w-full rounded-lg border px-3 py-2"
          />

        </div>

        <div>

          <label className="mb-1 block text-sm font-medium">
            Reason
          </label>

          <textarea
            value={form.reason}
            onChange={(e) =>
              onChange({
                ...form,
                reason: e.target.value,
              })
            }
            className="w-full rounded-lg border px-3 py-2"
            rows={4}
          />

        </div>

      </div>

      <div className="mt-6 flex justify-end gap-3">

        <button
          onClick={onCancel}
          className="rounded-lg border px-4 py-2"
        >
          Cancel
        </button>

        <button
          onClick={onSave}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white"
        >
          Grant Credit
        </button>

      </div>

    </div>
  );
}