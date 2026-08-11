"use client";

interface Props {
  search: string;

  academicYear: string;

  term: string;

  campus: string;

  coach: string;

  academicYears: string[];

  terms: string[];

  campuses: string[];

  coaches: string[];

  onSearchChange: (value: string) => void;

  onAcademicYearChange: (value: string) => void;

  onTermChange: (value: string) => void;

  onCampusChange: (value: string) => void;

  onCoachChange: (value: string) => void;

  onClear: () => void;
}

export default function AttendanceLessonFilters({
  search,
  academicYear,
  term,
  campus,
  coach,
  academicYears,
  terms,
  campuses,
  coaches,
  onSearchChange,
  onAcademicYearChange,
  onTermChange,
  onCampusChange,
  onCoachChange,
  onClear,
}: Props) {
  const hasFilters =
    search !== "" ||
    academicYear !== "" ||
    term !== "" ||
    campus !== "" ||
    coach !== "";

  return (
    <section
      className="
        relative
        overflow-hidden
        rounded-2xl
        border
        border-[#D4AF37]/30
        bg-[#FFFDF8]
        shadow-sm
      "
    >
      {/* Gold Gradient Top Highlight */}
      <div
        className="
          absolute
          left-0
          right-0
          top-0
          h-[3px]
          bg-gradient-to-r
          from-[#8F6B18]
          via-[#F4D35E]
          to-[#8F6B18]
        "
      />

      <div className="px-4 py-5 sm:px-5">
        {/* Heading */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p
              className="
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.18em]
                text-[#B28A22]
              "
            >
              LESSONS
            </p>

            <p className="mt-1 text-sm text-[#64748B]">
              Find a lesson quickly.
            </p>
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={onClear}
              className="
                shrink-0
                text-xs
                font-medium
                text-[#9A7415]
                transition-colors
                hover:text-[#6F5310]
              "
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Search */}
        <div className="mt-4">
          <div className="relative">
            <span
              className="
                pointer-events-none
                absolute
                left-3.5
                top-1/2
                -translate-y-1/2
                text-sm
                text-[#94A3B8]
              "
            >
              🔍
            </span>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                onSearchChange(event.target.value)
              }
              placeholder="Search campus, class or coach..."
              className="
                h-11
                w-full
                rounded-xl
                border
                border-[#CBD5E1]
                bg-[#F5F9FD]
                pl-10
                pr-4
                text-sm
                text-[#10213A]
                outline-none
                transition-all
                placeholder:text-[#94A3B8]
                focus:border-[#D4AF37]
                focus:bg-white
                focus:ring-2
                focus:ring-[#D4AF37]/15
              "
            />
          </div>
        </div>

        {/* Filters */}
        <div
          className="
            mt-3
            grid
            grid-cols-2
            gap-2
            sm:grid-cols-4
            sm:gap-3
          "
        >
          <FilterSelect
            label="Academic Year"
            value={academicYear}
            options={academicYears}
            onChange={onAcademicYearChange}
          />

          <FilterSelect
            label="Term"
            value={term}
            options={terms}
            onChange={onTermChange}
          />

          <FilterSelect
            label="Campus"
            value={campus}
            options={campuses}
            onChange={onCampusChange}
          />

          <FilterSelect
            label="Coach"
            value={coach}
            options={coaches}
            onChange={onCoachChange}
          />
        </div>
      </div>
    </section>
  );
}


// ======================================================
// Filter Select
// ======================================================

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span
        className="
          mb-1.5
          block
          text-[10px]
          font-semibold
          uppercase
          tracking-[0.12em]
          text-[#64748B]
        "
      >
        {label}
      </span>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="
          h-10
          w-full
          rounded-xl
          border
          border-[#CBD5E1]
          bg-[#F5F9FD]
          px-3
          text-sm
          text-[#10213A]
          outline-none
          transition-all
          focus:border-[#D4AF37]
          focus:bg-white
          focus:ring-2
          focus:ring-[#D4AF37]/15
        "
      >
        <option value="">All</option>

        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}