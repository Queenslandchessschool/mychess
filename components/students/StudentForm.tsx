"use client";

interface StudentFormProps {
  form: any;
  setForm: (value: any) => void;
  onSave: () => void;
  editingStudent?: any;
  onCancel?: () => void;
}

const inputClass = `
  w-full
  rounded-lg
  border border-[#D9E0E8]
  bg-white
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
  bg-white
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

export default function StudentForm({
  form,
  setForm,
  onSave,
  editingStudent,
  onCancel,
}: StudentFormProps) {
  return (
    <section
      className="
        overflow-hidden
        rounded-[18px]
        border
        border-[#D9E0E8]
        bg-white
        shadow-sm
      "
    >
      {/* Gold gradient top border */}
      <div
        className="
          h-[3px]
          w-full
          bg-gradient-to-r
          from-[#D4AF37]
          via-[#E8C75A]
          to-transparent
        "
      />

      <div className="p-6">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#D4AF37]">
          STUDENT INFORMATION
        </p>

        <div className="mt-6 space-y-4">
          {/* First Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              First Name <span className="text-[#D4AF37]">*</span>
            </label>

            <input
              className={inputClass}
              placeholder="First Name"
              value={form.first_name}
              onChange={(e) =>
                setForm({
                  ...form,
                  first_name: e.target.value,
                })
              }
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Last Name <span className="text-[#D4AF37]">*</span>
            </label>

            <input
              className={inputClass}
              placeholder="Last Name"
              value={form.last_name}
              onChange={(e) =>
                setForm({
                  ...form,
                  last_name: e.target.value,
                })
              }
            />
          </div>

          {/* Gender */}
          <select
            className={selectClass}
            value={form.gender}
            onChange={(e) =>
              setForm({
                ...form,
                gender: e.target.value,
              })
            }
          >
            <option
              value=""
              className="bg-white text-[#64748B]"
            >
              Gender
            </option>

            <option
              value="Male"
              className="bg-white text-[#10213A]"
            >
              Male
            </option>

            <option
              value="Female"
              className="bg-white text-[#10213A]"
            >
              Female
            </option>
          </select>

          {/* Date of Birth */}
          <input
            type="date"
            className={inputClass}
            value={form.date_of_birth}
            onChange={(e) =>
              setForm({
                ...form,
                date_of_birth: e.target.value,
              })
            }
          />

          {/* School */}
          <input
            className={inputClass}
            placeholder="School"
            value={form.school}
            onChange={(e) =>
              setForm({
                ...form,
                school: e.target.value,
              })
            }
          />

          {/* Current Level */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Current Level <span className="text-[#D4AF37]">*</span>
            </label>

            <select
              className={selectClass}
              value={form.current_level}
              onChange={(e) =>
                setForm({
                  ...form,
                  current_level: e.target.value,
                })
              }
            >
              <option
                value=""
                className="bg-white text-[#64748B]"
              >
                Select current level
              </option>

              <option
                value="Beginner"
                className="bg-white text-[#10213A]"
              >
                Beginner
              </option>

              <option
                value="Novice"
                className="bg-white text-[#10213A]"
              >
                Novice
              </option>

              <option
                value="Intermediate"
                className="bg-white text-[#10213A]"
              >
                Intermediate
              </option>

              <option
                value="Advanced"
                className="bg-white text-[#10213A]"
              >
                Advanced
              </option>
            </select>
          </div>

          {/* Student Stage */}
          <select
            className={selectClass}
            value={form.student_stage}
            onChange={(e) =>
              setForm({
                ...form,
                student_stage: e.target.value,
              })
            }
          >
            <option
              value="Regular"
              className="bg-white text-[#10213A]"
            >
              Regular
            </option>

            <option
              value="Trial"
              className="bg-white text-[#10213A]"
            >
              Trial
            </option>
          </select>

          {/* School Program Information */}
          <div className="pt-1">
            <p className="text-sm font-medium text-[#64748B]">
              School Program
            </p>

            <p className="mt-1 text-xs leading-5 text-[#94A3B8]">
              If applicable, complete the School Year and School Class
              fields below.
            </p>
          </div>

          {/* School Year */}
          <input
            className={inputClass}
            placeholder="School Year"
            value={form.school_year}
            onChange={(e) =>
              setForm({
                ...form,
                school_year: e.target.value,
              })
            }
          />

          {/* School Class */}
          <input
            className={inputClass}
            placeholder="School Class"
            value={form.school_class}
            onChange={(e) =>
              setForm({
                ...form,
                school_class: e.target.value,
              })
            }
          />

          {/* Notes */}
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
              Update Student
            </button>

            {editingStudent && onCancel && (
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