"use client";

import {
  ClassFormData,
  CampusLookup,
  CoachLookup,
} from "./types";

interface ClassFormProps {
  form: ClassFormData;
  setForm: (value: ClassFormData) => void;

  campuses: CampusLookup[];
  coaches: CoachLookup[];

  onSave: () => void;

  editingClass?: boolean;

  onCancel?: () => void;
}

export default function ClassForm({
  form,
  setForm,
  campuses,
  coaches,
  onSave,
  editingClass,
  onCancel,
}: ClassFormProps) {
  return (
    <div className="bg-white rounded-lg border p-6 shadow-sm">
      <h2 className="text-2xl font-bold mb-6">
        Class Information
      </h2>

      <div className="space-y-4">

        <select
          className="w-full border rounded-lg p-2"
          value={form.campus_id}
          onChange={(e) =>
            setForm({
              ...form,
              campus_id: e.target.value,
            })
          }
        >
          <option value="">Campus</option>

          {campuses.map((campus) => (
            <option
              key={campus.id}
              value={campus.id}
            >
              {campus.short_name}
            </option>
          ))}
        </select>

        <select
          className="w-full border rounded-lg p-2"
          value={form.coach_id}
          onChange={(e) =>
            setForm({
              ...form,
              coach_id: e.target.value,
            })
          }
        >
          <option value="">Coach</option>

          {coaches.map((coach) => (
            <option
              key={coach.id}
              value={coach.id}
            >
              {coach.display_name}
            </option>
          ))}
        </select>

        <select
          className="w-full border rounded-lg p-2"
          value={form.day}
          onChange={(e) =>
            setForm({
              ...form,
              day: e.target.value as ClassFormData["day"],
            })
          }
        >
          <option>Monday</option>
          <option>Tuesday</option>
          <option>Wednesday</option>
          <option>Thursday</option>
          <option>Friday</option>
          <option>Saturday</option>
          <option>Sunday</option>
        </select>

        <input
          type="time"
          className="w-full border rounded-lg p-2"
          value={form.start_time}
          onChange={(e) =>
            setForm({
              ...form,
              start_time: e.target.value,
            })
          }
        />

        <input
          type="time"
          className="w-full border rounded-lg p-2"
          value={form.end_time}
          onChange={(e) =>
            setForm({
              ...form,
              end_time: e.target.value,
            })
          }
        />

        <select
          className="w-full border rounded-lg p-2"
          value={form.level}
          onChange={(e) =>
            setForm({
              ...form,
              level: e.target.value as ClassFormData["level"],
            })
          }
        >
          <option>Beginner</option>
          <option>Novice</option>
          <option>Intermediate</option>
          <option>Advanced</option>
          <option>Novice to Intermediate</option>
          <option>Intermediate to Advanced</option>
        </select>

        <input
          className="w-full border rounded-lg p-2"
          placeholder="Class Suffix (Optional)"
          value={form.class_suffix}
          onChange={(e) =>
            setForm({
              ...form,
              class_suffix: e.target.value,
            })
          }
        />

        <input
          type="number"
          className="w-full border rounded-lg p-2"
          placeholder="Capacity"
          value={form.capacity}
          onChange={(e) =>
            setForm({
              ...form,
              capacity: Number(e.target.value),
            })
          }
        />

        <select
          className="w-full border rounded-lg p-2"
          value={form.status}
          onChange={(e) =>
            setForm({
              ...form,
              status: e.target.value as ClassFormData["status"],
            })
          }
        >
          <option>Active</option>
          <option>Inactive</option>
        </select>

        <textarea
          rows={4}
          className="w-full border rounded-lg p-2"
          placeholder="Notes"
          value={form.notes}
          onChange={(e) =>
            setForm({
              ...form,
              notes: e.target.value,
            })
          }
        />

        <div className="flex gap-2">

          <button
            onClick={onSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2"
          >
            {editingClass
              ? "Update Class"
              : "Save Class"}
          </button>

          {editingClass && (
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