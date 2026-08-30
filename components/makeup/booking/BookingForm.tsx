"use client";

import type {
  BookingFormData,
  LessonOption,
  CreditOption,
} from "./types";
import LessonSelect from "./LessonSelect";

interface Props {
  form: BookingFormData;

  lessons: LessonOption[];

  credits: CreditOption[];

  onChange: (
    form: BookingFormData
  ) => void;

  onSave: () => void;

  onCancel: () => void;
}

export default function BookingForm({
  form,
  lessons,
  credits,
  onChange,
  onSave,
  onCancel,
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
      {/* Frozen MyCHESS Gold Tapered Accent */}
<div
  aria-hidden="true"
  className="
    pointer-events-none
    absolute
    left-0
    right-0
    top-0
    h-[6px]
    bg-gradient-to-r
    from-[#F7D968]
    via-[#D4AF37]/75
    to-transparent
  "
  style={{
    clipPath:
      "polygon(0 0, 100% 42%, 100% 58%, 0 100%)",
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
            MAKE-UP BOOKING
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
            Book Make-up Lesson
          </h2>

        </div>


        {/* Form */}
        <div className="mt-7 space-y-5">

          {/* Available Credit */}
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
              Available Credit
            </label>

            <select
              value={form.credit_id}
              onChange={(e) =>
                onChange({
                  ...form,
                  credit_id: e.target.value,
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
                Select Credit
              </option>

              {credits.map((credit) => (
                <option
                  key={credit.id}
                  value={credit.id}
                >
                  {credit.student_name} (+{credit.credits})
                </option>
              ))}
            </select>

          </div>


          {/* Lesson */}
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
              Lesson
            </label>

            <LessonSelect
  value={form.lesson_id}
  lessons={lessons}
  onChange={(lessonId) =>
    onChange({
      ...form,
      lesson_id: lessonId,
    })
  }
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
              Book Lesson
            </button>

          </div>

        </div>
      </div>
    </section>
  );
}