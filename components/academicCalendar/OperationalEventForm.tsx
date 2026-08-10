"use client";

import { OperationalEventFormData } from "./types";

type Props = {
  form: OperationalEventFormData;
  setForm: React.Dispatch<React.SetStateAction<OperationalEventFormData>>;
  onSave: () => void;
  editingEvent: boolean;
  onCancel: () => void;
};

const inputClass = `
  w-full
  rounded-lg
  border border-[#D9E0E8]
  bg-[#FFF6E6]
  px-3
  py-2.5
  text-sm
  text-[#10213A]
  placeholder:text-[#C8D2DF]
  outline-none
  transition-colors
  duration-200
  hover:border-[#B9C3D0]
  focus:border-[#D4AF37]
  focus:ring-1
  focus:ring-[#D4AF37]/30
`;

export default function OperationalEventForm({
  form,
  setForm,
  onSave,
  editingEvent,
  onCancel,
}: Props) {
  return (
    <section
      className="
        relative
        w-full
        min-w-0
        overflow-hidden
        rounded-[18px]
        border
        border-[#D4AF37]/70
        bg-[#102B4D]
      "
    >
      {/* Gold gradient top highlight */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-x-0
          top-0
          z-20
          h-[2px]
          bg-gradient-to-r
          from-[#D4AF37]
          via-[#E7CF72]
          to-[#D4AF37]/20
        "
      />

      <div className="p-6">
        {/* Section Title */}
        <p
          className="
            text-xs
            font-medium
            uppercase
            tracking-[0.16em]
            text-[#D4AF37]
          "
        >
          SCHOOL OPERATIONAL EVENT
        </p>

        <p
          className="
            mt-2
            text-sm
            leading-5
            text-[#C8D2DF]/75
          "
        >
          School-wide operational events used by Lesson Generation.
        </p>

        <div className="mt-6 space-y-4">

          {/* Event Date */}
          <div>
            <label
              className="
                mb-1.5
                block
                text-xs
                font-medium
                text-[#64748B]
              "
            >
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
              className={inputClass}
            />
          </div>

          {/* Event Name */}
          <div>
            <label
              className="
                mb-1.5
                block
                text-xs
                font-medium
                text-[#64748B]
              "
            >
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
              className={inputClass}
              placeholder="e.g. Australia Day"
            />
          </div>

          {/* Notes */}
          <div>
            <label
              className="
                mb-1.5
                block
                text-xs
                font-medium
                text-[#64748B]
              "
            >
              Notes
            </label>

            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) =>
                setForm({
                  ...form,
                  notes: e.target.value,
                })
              }
              className={inputClass}
              placeholder="Optional notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onSave}
              className="
                flex-1
                rounded-lg
                bg-[#2161F5]
                py-2.5
                text-sm
                font-medium
                text-white
                transition-colors
                duration-200
                hover:bg-[#1955DE]
                active:bg-[#164BC7]
              "
            >
              {editingEvent ? "Update Event" : "Add Event"}
            </button>

            {editingEvent && (
              <button
                type="button"
                onClick={onCancel}
                className="
                  rounded-lg
                  border
                  border-[#D9E0E8]
                  px-4
                  text-sm
                  font-medium
                  text-[#64748B]
                  transition-colors
                  duration-200
                  hover:border-[#D4AF37]
                  hover:text-[#8A6900]
                "
              >
                Cancel
              </button>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}