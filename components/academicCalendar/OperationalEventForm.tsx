"use client";

import { OperationalEventFormData } from "./types";

type Props = {
  form: OperationalEventFormData;
  setForm: React.Dispatch<
    React.SetStateAction<OperationalEventFormData>
  >;
  onSave: () => void;
  editingEvent: boolean;
  onCancel: () => void;
};

export default function OperationalEventForm({
  form,
  setForm,
  onSave,
  editingEvent,
  onCancel,
}: Props) {
  return (
    <div className="border rounded-lg bg-white shadow-sm">

      <div className="p-4 border-b">
        <h2 className="text-2xl font-bold">
          School Operational Event
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          School-wide operational events used by Lesson Generation.
        </p>
      </div>

      <div className="p-4 space-y-4">

        <div>
          <label className="block text-sm font-medium mb-1">
            Event Date
          </label>

          <input
            type="date"
            value={form.event_date}
            onChange={(e) =>
              setForm({
                ...form,
                event_date: e.target.value,
              })
            }
            className="w-full border rounded-lg p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Event Name
          </label>

          <input
            type="text"
            value={form.event_name}
            onChange={(e) =>
              setForm({
                ...form,
                event_name: e.target.value,
              })
            }
            className="w-full border rounded-lg p-2"
            placeholder="e.g. Australia Day"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Notes
          </label>

          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) =>
              setForm({
                ...form,
                notes: e.target.value,
              })
            }
            className="w-full border rounded-lg p-2"
            placeholder="Optional notes..."
          />
        </div>

        <div className="flex gap-2">

          <button
            onClick={onSave}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            {editingEvent ? "Update Event" : "Add Event"}
          </button>

          {editingEvent && (
            <button
              onClick={onCancel}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
          )}

        </div>

      </div>

    </div>
  );
}