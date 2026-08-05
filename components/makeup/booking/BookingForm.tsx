"use client";

import type {
  BookingFormData,
  LessonOption,
  CreditOption,
} from "./types";

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
    <div className="rounded-xl border bg-white p-6 shadow-sm">

      <h2 className="mb-6 text-2xl font-semibold">
        Book Make-up Lesson
      </h2>

      <div className="space-y-4">

        <div>

  <label className="mb-1 block text-sm font-medium">
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
    className="w-full rounded-lg border px-3 py-2"
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

        <div>

          <label className="mb-1 block text-sm font-medium">
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
            className="w-full rounded-lg border px-3 py-2"
          >

            <option value="">
              Select Lesson
            </option>

            {lessons.map((lesson) => (

              <option
                key={lesson.id}
                value={lesson.id}
              >
                {lesson.name}
              </option>

            ))}

          </select>

        </div>

      </div>

      <div className="mt-6 flex justify-end gap-3">

        <button
          onClick={onCancel}
          className="rounded-lg border px-4 py-2"
        >
          Cancel
        </button>

        <button
          onClick={onSave}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white"
        >
          Book Lesson
        </button>

      </div>

    </div>
  );
}