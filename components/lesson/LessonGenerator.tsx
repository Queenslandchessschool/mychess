"use client";

import {
  LessonGenerationScope,
  LessonClassOption,
} from "./types";

type Props = {
  scope: LessonGenerationScope;
  setScope: (scope: LessonGenerationScope) => void;

  academicYear: number;
  setAcademicYear: (year: number) => void;

  term: number | null;
  setTerm: (term: number | null) => void;

  classId: string | null;
  setClassId: (classId: string | null) => void;

  classes: LessonClassOption[];

  onGenerate: () => void;

  generating: boolean;
};

export default function LessonGenerator({
  scope,
  setScope,
  academicYear,
  setAcademicYear,
  term,
  setTerm,
  classId,
  setClassId,
  classes,
  onGenerate,
  generating,
}: Props) {

  function getClassLabel(classItem: LessonClassOption) {
    const parts: string[] = [];

    if (classItem.level) {
      parts.push(classItem.level);
    }

    if (classItem.class_suffix) {
      parts.push(classItem.class_suffix);
    }

    const scheduleParts: string[] = [];

    if (classItem.day) {
      scheduleParts.push(classItem.day);
    }

    if (
      classItem.start_time &&
      classItem.end_time
    ) {
      scheduleParts.push(
        `${classItem.start_time}–${classItem.end_time}`
      );
    }

    if (scheduleParts.length > 0) {
      parts.push(scheduleParts.join(" "));
    }

    return parts.join(" — ") || classItem.id;
  }

  const inputClass = `
    w-full
    rounded-lg
    border
    border-[#D9E0E8]
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

  return (
    <div
      className="
        relative
        overflow-hidden
        rounded-[18px]
        border
        border-[#D4AF37]/70
        bg-[#102B4D]
      "
    >

      {/* Gold Gradient Top Highlight */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          h-[2px]
          w-full
          bg-gradient-to-r
          from-[#D4AF37]
          via-[#E7CF72]
          to-[#D4AF37]/20
        "
      />

      {/* Header */}

      <div
        className="
          border-b
          border-[#D4AF37]/20
          px-5
          py-5
        "
      >
        <p
          className="
            text-xs
            font-medium
            uppercase
            tracking-[0.16em]
            text-[#D4AF37]
          "
        >
          LESSON GENERATOR
        </p>

        <h2
          className="
            mt-2
            text-2xl
            font-bold
            text-[#F4F7FB]
          "
        >
          Generate Lessons
        </h2>

        <p
          className="
            mt-1
            text-sm
            text-[#C8D2DF]
          "
        >
          Generate or reconcile lessons from Class Schedule
          and School Operational Events.
        </p>
      </div>


      {/* Form */}

      <div className="space-y-4 p-5">

        {/* Generation Scope */}

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
            Generation Scope
          </label>

          <select
            value={scope}
            onChange={(e) => {
              const newScope =
                e.target.value as LessonGenerationScope;

              setScope(newScope);

              if (newScope !== "Class") {
                setClassId(null);
              }

              if (newScope === "Academic Year") {
                setTerm(null);
              }
            }}
            className={inputClass}
          >
            <option
              value="Class"
              className="bg-white text-[#10213A]"
            >
              Individual Class
            </option>

            <option
              value="Term"
              className="bg-white text-[#10213A]"
            >
              Academic Term
            </option>

            <option
              value="Academic Year"
              className="bg-white text-[#10213A]"
            >
              Academic Year
            </option>
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

          <input
            type="number"
            value={academicYear}
            onChange={(e) =>
              setAcademicYear(
                Number(e.target.value)
              )
            }
            className={inputClass}
          />
        </div>


        {/* Term */}

        {scope !== "Academic Year" && (
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
              value={term ?? ""}
              onChange={(e) =>
                setTerm(
                  e.target.value
                    ? Number(e.target.value)
                    : null
                )
              }
              className={inputClass}
            >
              <option
                value=""
                className="bg-white text-[#64748B]"
              >
                Select Term
              </option>

              <option
                value="1"
                className="bg-white text-[#10213A]"
              >
                Term 1
              </option>

              <option
                value="2"
                className="bg-white text-[#10213A]"
              >
                Term 2
              </option>

              <option
                value="3"
                className="bg-white text-[#10213A]"
              >
                Term 3
              </option>

              <option
                value="4"
                className="bg-white text-[#10213A]"
              >
                Term 4
              </option>
            </select>
          </div>
        )}


        {/* Individual Class */}

        {scope === "Class" && (
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
              Class
            </label>

            <select
              value={classId ?? ""}
              onChange={(e) =>
                setClassId(
                  e.target.value || null
                )
              }
              className={inputClass}
            >
              <option
                value=""
                className="bg-white text-[#64748B]"
              >
                Select Class
              </option>

              {classes.map((classItem) => (
                <option
                  key={classItem.id}
                  value={classItem.id}
                  className="bg-white text-[#10213A]"
                >
                  {getClassLabel(classItem)}
                </option>
              ))}
            </select>
          </div>
        )}


        {/* Generate */}

        <div className="pt-1">

          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="
              w-full
              rounded-lg
              bg-[#2161F5]
              px-4
              py-2.5
              text-sm
              font-medium
              text-white
              transition-colors
              duration-200
              hover:bg-[#1955DE]
              active:bg-[#164BC7]
              disabled:cursor-not-allowed
              disabled:bg-[#64748B]
            "
          >
            {generating
              ? "Generating..."
              : "Generate / Reconcile Lessons"}
          </button>

        </div>

      </div>

    </div>
  );
}