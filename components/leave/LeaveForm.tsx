"use client";

import {
  LeaveFormData,
  LeaveReason,
  StudentOption,
  LessonOption,
} from "./types";

interface Props {
  form: LeaveFormData;
  students: StudentOption[];
  lessons: LessonOption[];

  onChange: (data: LeaveFormData) => void;
  onSave: () => void;
  onCancel: () => void;
}

const reasons: LeaveReason[] = [
  "Sick",
  "Holiday",
  "Family",
  "Other",
];

export default function LeaveForm({
  form,
  students,
  lessons,
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
      {/* Gold tapered top highlight */}
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
            LEAVE
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
            Leave Record
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

            <select
              value={form.lesson_id}
              onChange={(e) =>
                onChange({
                  ...form,
                  lesson_id: e.target.value,
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
                Select Lesson
              </option>

              {lessons.map((lesson) => (
                <option
                  key={lesson.id}
                  value={lesson.id}
                >
                  {lesson.lesson_date} |{" "}
                  {lesson.class_name}
                </option>
              ))}
            </select>
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

            <select
              value={form.reason}
              onChange={(e) =>
                onChange({
                  ...form,
                  reason:
                    e.target.value as LeaveReason,
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
              {reasons.map((reason) => (
                <option
                  key={reason}
                  value={reason}
                >
                  {reason}
                </option>
              ))}
            </select>
          </div>

          {/* Comments */}
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
              Comments
            </label>

            <textarea
              value={form.comments}
              onChange={(e) =>
                onChange({
                  ...form,
                  comments: e.target.value,
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
              Save
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}