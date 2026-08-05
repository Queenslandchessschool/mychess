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

    if (classItem.start_time && classItem.end_time) {
      scheduleParts.push(
        `${classItem.start_time}–${classItem.end_time}`
      );
    }

    if (scheduleParts.length > 0) {
      parts.push(scheduleParts.join(" "));
    }

    return parts.join(" — ") || classItem.id;
  }

  return (
    <div className="border rounded-lg bg-white shadow-sm">

      <div className="p-4 border-b">
        <h2 className="text-2xl font-bold">
          Lesson Generator
        </h2>

        <p className="text-sm text-gray-500 mt-1">
          Generate or reconcile lessons from Class Schedule and
          School Operational Events.
        </p>
      </div>

      <div className="p-4 space-y-4">

        {/* Generation Scope */}
        <div>
          <label className="block text-sm font-medium mb-1">
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
            className="w-full border rounded-lg p-2"
          >
            <option value="Class">
              Individual Class
            </option>

            <option value="Term">
              Academic Term
            </option>

            <option value="Academic Year">
              Academic Year
            </option>
          </select>
        </div>

        {/* Academic Year */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Academic Year
          </label>

          <input
            type="number"
            value={academicYear}
            onChange={(e) =>
              setAcademicYear(Number(e.target.value))
            }
            className="w-full border rounded-lg p-2"
          />
        </div>

        {/* Term */}
        {scope !== "Academic Year" && (
          <div>
            <label className="block text-sm font-medium mb-1">
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
              className="w-full border rounded-lg p-2"
            >
              <option value="">
                Select Term
              </option>

              <option value="1">
                Term 1
              </option>

              <option value="2">
                Term 2
              </option>

              <option value="3">
                Term 3
              </option>

              <option value="4">
                Term 4
              </option>
            </select>
          </div>
        )}

        {/* Individual Class */}
        {scope === "Class" && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Class
            </label>

            <select
              value={classId ?? ""}
              onChange={(e) =>
                setClassId(
                  e.target.value || null
                )
              }
              className="w-full border rounded-lg p-2"
            >
              <option value="">
                Select Class
              </option>

              {classes.map((classItem) => (
                <option
                  key={classItem.id}
                  value={classItem.id}
                >
                  {getClassLabel(classItem)}
                </option>
              ))}

            </select>
          </div>
        )}

        {/* Generate */}
        <div>
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded"
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