"use client";

import {
  ClassOption,
  ClassScheduleFormData,
} from "./types";

interface ClassScheduleFormProps {
  form: ClassScheduleFormData;
  setForm: (value: ClassScheduleFormData) => void;

  classes: ClassOption[];

  onSave: () => void;

  editingSchedule?: boolean;

  onCancel?: () => void;
}

export default function ClassScheduleForm({
  form,
  setForm,
  classes,
  onSave,
  editingSchedule,
  onCancel,
}: ClassScheduleFormProps) {
  return (
    <div className="bg-white rounded-lg border p-6 shadow-sm">
      <h2 className="text-2xl font-bold mb-6">
        CLASS SCHEDULE
      </h2>

      <div className="space-y-4">

        <select
          className="w-full border rounded-lg p-2"
          value={form.class_id}
          onChange={(e) =>
            setForm({
              ...form,
              class_id: e.target.value,
            })
          }
        >
          <option value="">Select Class</option>

          {classes.map((cls) => (
            <option
              key={cls.id}
              value={cls.id}
            >
              {cls.display_name}
            </option>
          ))}
        </select>

        <select
  className="w-full border rounded-lg p-2"
  value={form.academic_year}
  onChange={(e) =>
    setForm({
      ...form,
      academic_year: Number(e.target.value),
    })
  }
>
  {Array.from({ length: 7 }, (_, i) => {
    const year = new Date().getFullYear() - 1 + i;

    return (
      <option
        key={year}
        value={year}
      >
        {year}
      </option>
    );
  })}
</select>

        <select
          className="w-full border rounded-lg p-2"
          value={form.term}
          onChange={(e) =>
            setForm({
              ...form,
              term: Number(e.target.value),
            })
          }
        >
          <option value={1}>Term 1</option>
          <option value={2}>Term 2</option>
          <option value={3}>Term 3</option>
          <option value={4}>Term 4</option>
        </select>

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            First Lesson
          </label>

          <input
            type="date"
            className="w-full border rounded-lg p-2"
            value={form.first_lesson}
            onChange={(e) =>
              setForm({
                ...form,
                first_lesson: e.target.value,
              })
            }
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Final Lesson
          </label>

          <input
            type="date"
            className="w-full border rounded-lg p-2"
            value={form.final_lesson}
            onChange={(e) =>
              setForm({
                ...form,
                final_lesson: e.target.value,
              })
            }
          />
        </div>

        <select
          className="w-full border rounded-lg p-2"
          value={form.status}
          onChange={(e) =>
            setForm({
              ...form,
              status: e.target.value as ClassScheduleFormData["status"],
            })
          }
        >
          <option>Planned</option>
          <option>Active</option>
          <option>Completed</option>
          <option>Cancelled</option>
        </select>
        <div>
  <label className="block text-sm text-gray-600 mb-1">
    Notes
  </label>

  <textarea
    className="w-full border rounded-lg p-2 min-h-[90px]"
    placeholder="Optional administrative notes..."
    value={form.notes}
    onChange={(e) =>
      setForm({
        ...form,
        notes: e.target.value,
      })
    }
  />
</div>
        <div className="flex gap-2">

          <button
            onClick={onSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2"
          >
            {editingSchedule
              ? "Update Schedule"
              : "Save Schedule"}
          </button>

          {editingSchedule && (
            <button
              onClick={onCancel}
              className="px-5 bg-gray-300 hover:bg-gray-400 rounded-lg"
            >
              Cancel
            </button>
          )}

        </div>

      </div>
    </div>
  );
}