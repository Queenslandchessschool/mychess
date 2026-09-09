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
  editing: boolean;
}

export default function MakeupForm({
  form,
  students,
  onChange,
    onSave,
  onCancel,
  editing,
}: Props) {
  return (
    <section
      className="
        relative
        w-full
        overflow-hidden
        rounded-2xl
        border
        border-[#D9E0E8]
        bg-[#FFFDF8]
        shadow-sm
      "
    >
      {/* Gold tapered top highlight — MyCHESS standard */}
      <div
        className="
          absolute
          left-0
          top-0
          h-[3px]
          w-[46%]
          bg-gradient-to-r
          from-[#8F6B18]
          via-[#F4D35E]
          to-transparent
        "
        style={{
          clipPath:
            "polygon(0 0, 100% 0, 84% 100%, 0 100%)",
        }}
      />

      <div
        className="
          px-5
          py-6
          sm:px-6
          sm:py-7
          lg:px-7
          lg:py-8
        "
      >
        {/* Header */}
        <div className="space-y-1">

          <p
            className="
              text-[11px]
              font-semibold
              uppercase
              tracking-[0.22em]
              text-[#B28A22]
              sm:text-xs
            "
          >
            MAKE-UP
          </p>

          <h2
            className="
              mt-1
              text-2xl
              font-bold
              tracking-tight
              text-[#10213A]
              sm:text-3xl
            "
          >
                      {editing
              ? "Edit Make-up Credit"
              : "Grant Make-up Credit"}
          </h2>

        </div>

        {/* Form */}
        <div className="mt-7 space-y-5">

          {/* Student */}
          <div className="min-w-0">

            <label
              className="
                mb-2
                block
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.16em]
                text-[#64748B]
              "
            >
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
              className="
                block
                min-h-[48px]
                w-full
                min-w-0
                rounded-xl
                border
                border-[#D9E0E8]
                bg-[#F5F9FD]
                px-4
                py-3
                text-sm
                text-[#10213A]
                outline-none
                transition
                focus:border-[#D4AF37]
                focus:ring-2
                focus:ring-[#D4AF37]/20
                sm:text-base
              "
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

          {/* Credits */}
          <div className="min-w-0">

            <label
              className="
                mb-2
                block
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.16em]
                text-[#64748B]
              "
            >
              Credits
            </label>

            <input
              type="number"
              min={1}
              value={form.credits}
              onChange={(e) =>
                onChange({
                  ...form,
                  credits: Number(e.target.value),
                })
              }
              className="
                block
                min-h-[48px]
                w-full
                min-w-0
                rounded-xl
                border
                border-[#D9E0E8]
                bg-[#F5F9FD]
                px-4
                py-3
                text-sm
                text-[#10213A]
                outline-none
                transition
                focus:border-[#D4AF37]
                focus:ring-2
                focus:ring-[#D4AF37]/20
                sm:text-base
              "
            />

          </div>

          {/* Reason */}
          <div className="min-w-0">

            <label
              className="
                mb-2
                block
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.16em]
                text-[#64748B]
              "
            >
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
              rows={5}
              className="
                block
                min-h-[120px]
                w-full
                min-w-0
                resize-y
                rounded-xl
                border
                border-[#D9E0E8]
                bg-[#F5F9FD]
                px-4
                py-3
                text-sm
                text-[#10213A]
                outline-none
                transition
                placeholder:text-[#94A3B8]
                focus:border-[#D4AF37]
                focus:ring-2
                focus:ring-[#D4AF37]/20
                sm:text-base
              "
            />

          </div>

          {/* Actions */}
          <div
            className="
              flex
              flex-col-reverse
              gap-2.5
              pt-2
              sm:flex-row
              sm:justify-end
            "
          >

            <button
              type="button"
              onClick={onCancel}
              className="
                inline-flex
                min-h-[44px]
                items-center
                justify-center
                rounded-xl
                border
                border-[#D9E0E8]
                bg-white
                px-5
                py-2.5
                text-sm
                font-medium
                text-[#10213A]
                shadow-sm
                transition-all
                duration-200
                hover:border-[#94A3B8]
                hover:bg-[#F8FAFC]
                active:scale-[0.98]
              "
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onSave}
              className="
                inline-flex
                min-h-[44px]
                items-center
                justify-center
                rounded-xl
                border
                border-[#D4AF37]
                bg-[#D4AF37]
                px-6
                py-2.5
                text-sm
                font-semibold
                text-[#10213A]
                shadow-sm
                transition-all
                duration-200
                hover:bg-[#F4D35E]
                active:scale-[0.98]
                focus:outline-none
                focus:ring-2
                focus:ring-[#D4AF37]/30
              "
            >
            {editing ? "Save Changes" : "Grant Credit"}
            </button>

          </div>

        </div>
      </div>
    </section>
  );
}