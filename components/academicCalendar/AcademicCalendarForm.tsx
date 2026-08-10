"use client";

import { AcademicCalendarFormData } from "./types";

interface AcademicCalendarFormProps {
  form: AcademicCalendarFormData;
  setForm: (value: AcademicCalendarFormData) => void;

  onSave: () => void;

  editingCalendar?: boolean;

  onCancel?: () => void;
}

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

const selectClass = `
  w-full
  rounded-lg
  border border-[#D9E0E8]
  bg-[#FFF6E6]
  px-3
  py-2.5
  text-sm
  text-[#10213A]
  outline-none
  transition-colors
  duration-200
  hover:border-[#B9C3D0]
  focus:border-[#D4AF37]
  focus:ring-1
  focus:ring-[#D4AF37]/30
`;

export default function AcademicCalendarForm({
  form,
  setForm,
  onSave,
  editingCalendar,
  onCancel,
}: AcademicCalendarFormProps) {
  return (
    <section
      className="
        relative
        overflow-hidden
        rounded-[18px]
        border
        border-[#D4AF37]/70
        bg-[#102B4D]
      "
    >
      {/* Gold gradient top highlight */}
      <div
        className="
          absolute
          left-0
          right-0
          top-0
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
          STATE SCHOOL CALENDAR
        </p>

        <div className="mt-6 space-y-4">
          {/* Academic Year */}
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
              Academic Year
            </label>

            <select
              className={selectClass}
              value={form.academic_year}
              onChange={(e) =>
                setForm({
                  ...form,
                  academic_year: Number(e.target.value),
                })
              }
            >
              {Array.from({ length: 7 }, (_, i) => {
                const year =
                  new Date().getFullYear() - 1 + i;

                return (
                  <option
                    key={year}
                    value={year}
                    className="bg-[#FFF6E6] text-[#10213A]"
                  >
                    {year}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Term */}
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
              Term
            </label>

            <select
              className={selectClass}
              value={form.term}
              onChange={(e) =>
                setForm({
                  ...form,
                  term: Number(e.target.value),
                })
              }
            >
              <option
                value={1}
                className="bg-[#FFF6E6] text-[#10213A]"
              >
                Term 1
              </option>

              <option
                value={2}
                className="bg-[#FFF6E6] text-[#10213A]"
              >
                Term 2
              </option>

              <option
                value={3}
                className="bg-[#FFF6E6] text-[#10213A]"
              >
                Term 3
              </option>

              <option
                value={4}
                className="bg-[#FFF6E6] text-[#10213A]"
              >
                Term 4
              </option>
            </select>
          </div>

          {/* Start Date */}
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
              Start Date
            </label>

            <input
              type="date"
              className={inputClass}
              value={form.start_date}
              onChange={(e) =>
                setForm({
                  ...form,
                  start_date: e.target.value,
                })
              }
            />
          </div>

          {/* End Date */}
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
              End Date
            </label>

            <input
              type="date"
              className={inputClass}
              value={form.end_date}
              onChange={(e) =>
                setForm({
                  ...form,
                  end_date: e.target.value,
                })
              }
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
              className={inputClass}
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
              {editingCalendar
                ? "Update Calendar"
                : "Save Calendar"}
            </button>

            {editingCalendar && onCancel && (
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