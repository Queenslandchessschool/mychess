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

/* =========================================================
   Frozen SRS VI — Form Field Style
   Match the soft off-white used by the table.
   ========================================================= */

const inputClass = `
  w-full
  rounded-lg
  border border-[#D9E0E8]
  bg-[#FAF9F5]
  px-3 py-2.5
  text-sm
  text-[#10213A]
  placeholder:text-[#C8D2DF]
  outline-none
  transition-colors duration-200
  hover:border-[#B9C3D0]
  focus:border-[#D4AF37]
  focus:ring-1
  focus:ring-[#D4AF37]/30
`;

const selectClass = `
  w-full
  rounded-lg
  border border-[#D9E0E8]
  bg-[#FAF9F5]
  px-3 py-2.5
  text-sm
  text-[#10213A]
  outline-none
  transition-colors duration-200
  hover:border-[#B9C3D0]
  focus:border-[#D4AF37]
  focus:ring-1
  focus:ring-[#D4AF37]/30
`;

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
    <section
  className="
    relative
    w-full
    min-w-0
    overflow-hidden
    rounded-[18px]
    border
    border-[#D4AF37]/45
    bg-[#102B4D]
  "
>
  {/* Gold top highlight — Frozen VI */}
  <div
    aria-hidden="true"
    className="
      pointer-events-none
      absolute
      inset-x-0
      top-0
      z-20
      h-px
      bg-gradient-to-r
      from-[#D4AF37]
      via-[#D4AF37]/70
      to-transparent
    "
  />
      {/* =====================================================
          Student Table Card Frame Standard
          Gold top highlight — same as StudentTable
          ===================================================== */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          left-0
          right-0
          top-0
          h-[2px]
          bg-gradient-to-r
          from-[#D4AF37]
          via-[#D4AF37]/55
          to-transparent
        "
      />

      <div className="p-6">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#D4AF37]">
          CLASS INFORMATION
        </p>

        <div className="mt-6 space-y-4">

          {/* =================================================
              Campus
              ================================================= */}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Campus <span className="text-[#D4AF37]">*</span>
            </label>

            <select
              className={selectClass}
              value={form.campus_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  campus_id: e.target.value,
                })
              }
            >
              <option
                value=""
                className="bg-[#FAF9F5] text-[#64748B]"
              >
                Select campus
              </option>

              {campuses.map((campus) => (
                <option
                  key={campus.id}
                  value={campus.id}
                  className="bg-[#FAF9F5] text-[#10213A]"
                >
                  {campus.short_name}
                </option>
              ))}
            </select>
          </div>

          {/* =================================================
              Coach
              ================================================= */}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Coach <span className="text-[#D4AF37]">*</span>
            </label>

            <select
              className={selectClass}
              value={form.coach_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  coach_id: e.target.value,
                })
              }
            >
              <option
                value=""
                className="bg-[#FAF9F5] text-[#64748B]"
              >
                Select coach
              </option>

              {coaches.map((coach) => (
                <option
                  key={coach.id}
                  value={coach.id}
                  className="bg-[#FAF9F5] text-[#10213A]"
                >
                  {coach.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* =================================================
              Day
              ================================================= */}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Day <span className="text-[#D4AF37]">*</span>
            </label>

            <select
              className={selectClass}
              value={form.day}
              onChange={(e) =>
                setForm({
                  ...form,
                  day: e.target.value as ClassFormData["day"],
                })
              }
            >
              <option
                value="Monday"
                className="bg-[#FAF9F5] text-[#10213A]"
              >
                Monday
              </option>

              <option
                value="Tuesday"
                className="bg-[#FAF9F5] text-[#10213A]"
              >
                Tuesday
              </option>

              <option
                value="Wednesday"
                className="bg-[#FAF9F5] text-[#10213A]"
              >
                Wednesday
              </option>

              <option
                value="Thursday"
                className="bg-[#FAF9F5] text-[#10213A]"
              >
                Thursday
              </option>

              <option
                value="Friday"
                className="bg-[#FAF9F5] text-[#10213A]"
              >
                Friday
              </option>

              <option
                value="Saturday"
                className="bg-[#FAF9F5] text-[#10213A]"
              >
                Saturday
              </option>

              <option
                value="Sunday"
                className="bg-[#FAF9F5] text-[#10213A]"
              >
                Sunday
              </option>
            </select>
          </div>

          {/* =================================================
              Start Time
              ================================================= */}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Start Time <span className="text-[#D4AF37]">*</span>
            </label>

            <input
              type="time"
              className={inputClass}
              value={form.start_time}
              onChange={(e) =>
                setForm({
                  ...form,
                  start_time: e.target.value,
                })
              }
            />
          </div>

          {/* =================================================
              End Time
              ================================================= */}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              End Time <span className="text-[#D4AF37]">*</span>
            </label>

            <input
              type="time"
              className={inputClass}
              value={form.end_time}
              onChange={(e) =>
                setForm({
                  ...form,
                  end_time: e.target.value,
                })
              }
            />
          </div>

          {/* =================================================
              Level
              ================================================= */}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Level <span className="text-[#D4AF37]">*</span>
            </label>

            <select
              className={selectClass}
              value={form.level}
              onChange={(e) =>
                setForm({
                  ...form,
                  level: e.target.value as ClassFormData["level"],
                })
              }
            >
              <option
                value="Beginner"
                className="bg-[#FAF9F5] text-[#10213A]"
              >
                Beginner
              </option>

              <option
                value="Novice"
                className="bg-[#FAF9F5] text-[#10213A]"
              >
                Novice
              </option>

              <option
                value="Intermediate"
                className="bg-[#FAF9F5] text-[#10213A]"
              >
                Intermediate
              </option>

              <option
                value="Advanced"
                className="bg-[#FAF9F5] text-[#10213A]"
              >
                Advanced
              </option>

              <option
                value="Novice to Intermediate"
                className="bg-[#FAF9F5] text-[#10213A]"
              >
                Novice to Intermediate
              </option>

              <option
                value="Intermediate to Advanced"
                className="bg-[#FAF9F5] text-[#10213A]"
              >
                Intermediate to Advanced
              </option>
            </select>
          </div>

          {/* =================================================
              Class Suffix
              ================================================= */}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Class Suffix
              <span className="ml-1 text-[#94A3B8]">
                (Optional)
              </span>
            </label>

            <input
              className={inputClass}
              placeholder="e.g. A, B, Elite"
              value={form.class_suffix}
              onChange={(e) =>
                setForm({
                  ...form,
                  class_suffix: e.target.value,
                })
              }
            />
          </div>

          {/* =================================================
              Capacity
              ================================================= */}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Capacity <span className="text-[#D4AF37]">*</span>
            </label>

            <input
              type="number"
              min="1"
              className={inputClass}
              placeholder="Capacity"
              value={form.capacity}
              onChange={(e) =>
                setForm({
                  ...form,
                  capacity: Number(e.target.value),
                })
              }
            />
          </div>

          {/* =================================================
              Status
              ================================================= */}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Status
            </label>

            <select
              className={selectClass}
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as ClassFormData["status"],
                })
              }
            >
              <option
                value="Active"
                className="bg-[#FAF9F5] text-[#10213A]"
              >
                Active
              </option>

              <option
                value="Inactive"
                className="bg-[#FAF9F5] text-[#10213A]"
              >
                Inactive
              </option>
            </select>
          </div>

          {/* =================================================
              Notes
              ================================================= */}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Notes
            </label>

            <textarea
              rows={4}
              className={inputClass}
              placeholder="Notes"
              value={form.notes}
              onChange={(e) =>
                setForm({
                  ...form,
                  notes: e.target.value,
                })
              }
            />
          </div>

          {/* =================================================
              Actions
              ================================================= */}

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
              {editingClass ? "Update Class" : "Save Class"}
            </button>

            {editingClass && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="
                  rounded-lg
                  border border-[#D9E0E8]
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