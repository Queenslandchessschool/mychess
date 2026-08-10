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

const inputClass = `
  w-full
  rounded-lg
  border border-[#D9E0E8]
  bg-[#FFF6E6]
  px-3 py-2.5
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
  px-3 py-2.5
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

export default function ClassScheduleForm({
  form,
  setForm,
  classes,
  onSave,
  editingSchedule,
  onCancel,
}: ClassScheduleFormProps) {
  return (
    <section
      className="
        relative
        overflow-hidden
        rounded-[18px]
        border
        border-[#D4AF37]/45
        bg-[#102B4D]
      "
    >
      {/* Gold top highlight */}
      <div
        className="
          pointer-events-none
          absolute
          inset-x-0
          top-0
          h-px
          bg-gradient-to-r
          from-[#D4AF37]
          via-[#D4AF37]/70
          to-transparent
        "
      />

      <div className="p-6">
        {/* Heading */}
        <p
          className="
            text-xs
            font-medium
            uppercase
            tracking-[0.16em]
            text-[#D4AF37]
          "
        >
          CLASS SCHEDULE
        </p>

        <div className="mt-6 space-y-4">

          {/* Class */}
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
              Class <span className="text-[#D4AF37]">*</span>
            </label>

            <select
              className={selectClass}
              value={form.class_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  class_id: e.target.value,
                })
              }
            >
              <option
                value=""
                className="bg-white text-[#64748B]"
              >
                Select Class
              </option>

              {classes.map((cls) => (
                <option
                  key={cls.id}
                  value={cls.id}
                  className="bg-white text-[#10213A]"
                >
                  {cls.display_name}
                </option>
              ))}
            </select>
          </div>

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
                    className="bg-white text-[#10213A]"
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
                className="bg-white text-[#10213A]"
              >
                Term 1
              </option>

              <option
                value={2}
                className="bg-white text-[#10213A]"
              >
                Term 2
              </option>

              <option
                value={3}
                className="bg-white text-[#10213A]"
              >
                Term 3
              </option>

              <option
                value={4}
                className="bg-white text-[#10213A]"
              >
                Term 4
              </option>
            </select>
          </div>

          {/* First Lesson */}
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
              First Lesson{" "}
              <span className="text-[#D4AF37]">*</span>
            </label>

            <input
              type="date"
              className={inputClass}
              value={form.first_lesson}
              onChange={(e) =>
                setForm({
                  ...form,
                  first_lesson: e.target.value,
                })
              }
            />
          </div>

          {/* Final Lesson */}
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
              Final Lesson{" "}
              <span className="text-[#D4AF37]">*</span>
            </label>

            <input
              type="date"
              className={inputClass}
              value={form.final_lesson}
              onChange={(e) =>
                setForm({
                  ...form,
                  final_lesson: e.target.value,
                })
              }
            />
          </div>

          {/* Status */}
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
              Status
            </label>

            <select
              className={selectClass}
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status:
                    e.target.value as ClassScheduleFormData["status"],
                })
              }
            >
              <option
                value="Planned"
                className="bg-white text-[#10213A]"
              >
                Planned
              </option>

              <option
                value="Active"
                className="bg-white text-[#10213A]"
              >
                Active
              </option>

              <option
                value="Completed"
                className="bg-white text-[#10213A]"
              >
                Completed
              </option>

              <option
                value="Cancelled"
                className="bg-white text-[#10213A]"
              >
                Cancelled
              </option>
            </select>
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
              {editingSchedule
                ? "Update Schedule"
                : "Save Schedule"}
            </button>

            {editingSchedule && onCancel && (
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