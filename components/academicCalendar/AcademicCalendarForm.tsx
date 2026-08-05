"use client";

import { AcademicCalendarFormData } from "./types";

interface AcademicCalendarFormProps {
  form: AcademicCalendarFormData;
  setForm: (value: AcademicCalendarFormData) => void;

  onSave: () => void;

  editingCalendar?: boolean;

  onCancel?: () => void;
}

export default function AcademicCalendarForm({
  form,
  setForm,
  onSave,
  editingCalendar,
  onCancel,
}: AcademicCalendarFormProps) {
  return (
    <div className="bg-white rounded-lg border p-6 shadow-sm">
      <h2 className="text-2xl font-bold mb-6">
        State School Calendar
      </h2>

      <div className="space-y-4">

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
    Start Date
  </label>

  <input
    type="date"
    className="w-full border rounded-lg p-2"
    value={form.start_date}
    onChange={(e) =>
      setForm({
        ...form,
        start_date: e.target.value,
      })
    }
  />
</div>
<div>
  <label className="block text-sm text-gray-600 mb-1">
    End Date
  </label>

  <input
    type="date"
    className="w-full border rounded-lg p-2"
    value={form.end_date}
    onChange={(e) =>
      setForm({
        ...form,
        end_date: e.target.value,
      })
    }
  />
</div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Notes
          </label>

          <textarea
            className="w-full border rounded-lg p-2 min-h-[100px]"
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
            {editingCalendar
              ? "Update Calendar"
              : "Save Calendar"}
          </button>

          {editingCalendar && (
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