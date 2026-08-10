"use client";

export interface ClassScheduleSummaryRow {
  id: string;
  className: string;
  campus: string;
  coach: string;
  firstLesson: string;
  secondLastLesson: string;
  finalLesson: string;
  lessonCount: number;
  currentWeek: number;
  remainingLessons: number;
  reenrolmentOpens: string;
  overrideStatus: string;
}

interface ClassScheduleSummaryProps {
  scheduleSummary: ClassScheduleSummaryRow[];
}

export default function ClassScheduleSummary({
  scheduleSummary,
}: ClassScheduleSummaryProps) {
  return (
    <section
      className="
        mt-8
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

      {/* Summary Header */}
      <div
        className="
          border-b
          border-[#D4AF37]/20
          bg-[#102B4D]
          px-6
          py-5
        "
      >
        <h2
          className="
            text-2xl
            font-bold
            text-[#F4F7FB]
          "
        >
          Class Schedule Summary
        </h2>

        <p
          className="
            mt-1
            text-sm
            text-[#C8D2DF]
          "
        >
          Read-only information from Class Schedule.
        </p>
      </div>

      {/* ========================================================= */}
      {/* DESKTOP TABLE                                               */}
      {/* ========================================================= */}

      <div
        className="
          hidden
          max-h-[520px]
          overflow-y-auto
          overflow-x-hidden
          md:block
        "
      >
        <table
          className="
            w-full
            table-fixed
            border-collapse
          "
        >
          {/* Sticky Header */}
          <thead
            className="
              sticky
              top-0
              z-10
              bg-[#102B4D]
            "
          >
            <tr>
              <th className="w-[18%] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#C8D2DF]">
                Class
              </th>

              <th className="w-[9%] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#C8D2DF]">
                Coach
              </th>

              <th className="w-[9%] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#C8D2DF]">
                First
                <br />
                Lesson
              </th>

              <th className="w-[10%] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#C8D2DF]">
                Second Last
                <br />
                Lesson
              </th>

              <th className="w-[9%] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#C8D2DF]">
                Final
                <br />
                Lesson
              </th>

              <th className="w-[8%] px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#C8D2DF]">
                Planned
                <br />
                Lessons
              </th>

              <th className="w-[7%] px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#C8D2DF]">
                Week
              </th>

              <th className="w-[8%] px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#C8D2DF]">
                Remaining
              </th>

              <th className="w-[13%] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#C8D2DF]">
                Re-enrolment
                <br />
                Opens
              </th>

              <th className="w-[9%] px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#C8D2DF]">
                Override
              </th>
            </tr>
          </thead>

          {/* Summary Body */}
          <tbody>
            {scheduleSummary.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="
                    bg-[#FFF6E6]
                    p-8
                    text-center
                    text-sm
                    text-[#64748B]
                  "
                >
                  No class schedule found.
                </td>
              </tr>
            ) : (
              scheduleSummary.map((row, index) => (
                <tr
                  key={row.id}
                  className={`
                    border-t
                    border-[#E5D7BD]
                    ${
                      index % 2 === 0
                        ? "bg-white"
                        : "bg-[#FFF6E6]"
                    }
                    hover:bg-[#FFF1CC]
                    transition-colors
                    duration-150
                  `}
                >
                  <td className="break-words p-3 text-sm text-[#10213A]">
                    {row.className}
                  </td>

                  <td className="break-words p-3 text-sm text-[#10213A]">
                    {row.coach}
                  </td>

                  <td className="break-words p-3 text-sm text-[#10213A]">
                    {row.firstLesson}
                  </td>

                  <td className="break-words p-3 text-sm text-[#10213A]">
                    {row.secondLastLesson}
                  </td>

                  <td className="break-words p-3 text-sm text-[#10213A]">
                    {row.finalLesson}
                  </td>

                  <td className="p-3 text-center text-sm text-[#10213A]">
                    {row.lessonCount}
                  </td>

                  <td className="p-3 text-center text-sm text-[#10213A]">
                    {row.currentWeek}
                  </td>

                  <td className="p-3 text-center text-sm text-[#10213A]">
                    {row.remainingLessons}
                  </td>

                  <td className="break-words p-3 text-sm text-[#10213A]">
                    {row.reenrolmentOpens}
                  </td>

                  <td className="break-words p-3 text-center text-sm text-[#10213A]">
                    {row.overrideStatus}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================= */}
      {/* MOBILE CARD LIST                                            */}
      {/* ========================================================= */}

      <div
        className="
          block
          h-[520px]
          overflow-y-auto
          overflow-x-hidden
          md:hidden
        "
      >
        {/* Mobile Sticky Header */}
        <div
          className="
            sticky
            top-0
            z-20
            flex
            items-center
            justify-between
            border-b
            border-[#D4AF37]/30
            bg-[#102B4D]
            px-4
            py-3
          "
        >
          <span
            className="
              text-[11px]
              font-semibold
              uppercase
              tracking-[0.16em]
              text-[#C8D2DF]
            "
          >
            Schedule Summary
          </span>

          <span className="text-xs text-[#C8D2DF]/70">
            {scheduleSummary.length} classes
          </span>
        </div>

        {scheduleSummary.length === 0 ? (
          <div
            className="
              bg-[#FFF6E6]
              px-4
              py-10
              text-center
              text-sm
              text-[#64748B]
            "
          >
            No class schedule found.
          </div>
        ) : (
          <div>
            {scheduleSummary.map((row, index) => (
              <div
                key={row.id}
                className={`
                  border-b
                  border-[#E5D7BD]
                  px-4
                  py-4
                  text-[#10213A]
                  transition-colors
                  duration-150
                  ${
                    index % 2 === 0
                      ? "bg-white"
                      : "bg-[#FFF6E6]"
                  }
                  hover:bg-[#FFF1CC]
                `}
              >
                {/* Class */}
                <div className="mb-4">
                  <div
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-wide
                      text-[#64748B]
                    "
                  >
                    Class
                  </div>

                  <div
                    className="
                      mt-1
                      break-words
                      text-base
                      font-semibold
                      leading-5
                    "
                  >
                    {row.className}
                  </div>
                </div>

                {/* Coach */}
                <div className="mb-4">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                    Coach
                  </div>

                  <div className="mt-1 break-words text-sm font-medium">
                    {row.coach}
                  </div>
                </div>

                {/* Lesson Dates */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                      First Lesson
                    </div>

                    <div className="mt-1 break-words text-sm font-medium">
                      {row.firstLesson}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                      Second Last Lesson
                    </div>

                    <div className="mt-1 break-words text-sm font-medium">
                      {row.secondLastLesson}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                      Final Lesson
                    </div>

                    <div className="mt-1 break-words text-sm font-medium">
                      {row.finalLesson}
                    </div>
                  </div>
                </div>

                {/* Lesson Statistics */}
                <div
                  className="
                    mt-4
                    grid
                    grid-cols-3
                    gap-2
                  "
                >
                  <div
                    className="
                      rounded-lg
                      border
                      border-[#D9E0E8]
                      bg-[#F8FAFC]
                      px-2
                      py-2
                      text-center
                    "
                  >
                    <div className="text-[9px] uppercase tracking-wide text-[#64748B]">
                      Planned
                    </div>

                    <div className="mt-1 text-sm font-semibold text-[#10213A]">
                      {row.lessonCount}
                    </div>
                  </div>

                  <div
                    className="
                      rounded-lg
                      border
                      border-[#D9E0E8]
                      bg-[#F8FAFC]
                      px-2
                      py-2
                      text-center
                    "
                  >
                    <div className="text-[9px] uppercase tracking-wide text-[#64748B]">
                      Week
                    </div>

                    <div className="mt-1 text-sm font-semibold text-[#10213A]">
                      {row.currentWeek}
                    </div>
                  </div>

                  <div
                    className="
                      rounded-lg
                      border
                      border-[#D9E0E8]
                      bg-[#F8FAFC]
                      px-2
                      py-2
                      text-center
                    "
                  >
                    <div className="text-[9px] uppercase tracking-wide text-[#64748B]">
                      Remaining
                    </div>

                    <div className="mt-1 text-sm font-semibold text-[#10213A]">
                      {row.remainingLessons}
                    </div>
                  </div>
                </div>

                {/* Re-enrolment / Override */}
                <div
                  className="
                    mt-4
                    grid
                    grid-cols-1
                    gap-3
                    sm:grid-cols-2
                  "
                >
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                      Re-enrolment Opens
                    </div>

                    <div className="mt-1 break-words text-sm font-medium">
                      {row.reenrolmentOpens}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                      Override
                    </div>

                    <div className="mt-1">
                      <span
                        className="
                          inline-flex
                          items-center
                          rounded-full
                          border
                          border-[#D4AF37]/50
                          bg-[#FFF6E6]
                          px-2.5
                          py-1
                          text-xs
                          font-medium
                          text-[#8A6D1D]
                        "
                      >
                        {row.overrideStatus}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
