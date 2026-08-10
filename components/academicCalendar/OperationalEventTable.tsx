"use client";

import { OperationalEventRecord } from "./types";

type Props = {
  events: OperationalEventRecord[];
  onEdit: (event: OperationalEventRecord) => void;
  onDelete: (id: string) => void;
};

export default function OperationalEventTable({
  events,
  onEdit,
  onDelete,
}: Props) {
  return (
    <section
      className="
        overflow-hidden
        rounded-[18px]
        border
        border-[#D4AF37]/60
        bg-[#102B4D]
        shadow-sm
      "
    >
      {/* Gold gradient top highlight */}
      <div
        className="
          h-[2px]
          w-full
          bg-gradient-to-r
          from-[#D4AF37]/20
          via-[#F5D76E]
          to-[#D4AF37]/20
        "
      />

      {/* ========================================================= */}
      {/* CARD HEADER                                                 */}
      {/* ========================================================= */}

      <div
        className="
          border-b
          border-[#D4AF37]/20
          bg-[#102B4D]
          px-5
          py-4
        "
      >
        <h2
          className="
            text-2xl
            font-bold
            text-[#F4F7FB]
          "
        >
          School Operational Events
        </h2>

        <p
          className="
            mt-1
            text-sm
            text-[#C8D2DF]
          "
        >
          School-wide operational events used by Lesson Generation.
        </p>
      </div>

      {/* ========================================================= */}
      {/* DESKTOP TABLE                                               */}
      {/* ========================================================= */}

      <div
        className="
          hidden
          max-h-[390px]
          overflow-y-auto
          overflow-x-hidden
          md:block
        "
      >
        <table className="w-full table-fixed border-collapse">
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
              <th
                className="
                  w-[18%]
                  whitespace-nowrap
                  px-4
                  py-3
                  text-left
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                  text-[#E7CF72]
                "
              >
                Event Date
              </th>

              <th
                className="
                  w-[25%]
                  px-4
                  py-3
                  text-left
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                  text-[#E7CF72]
                "
              >
                Event Name
              </th>

              <th
                className="
                  w-[37%]
                  px-4
                  py-3
                  text-left
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                  text-[#E7CF72]
                "
              >
                Notes
              </th>

              <th
                className="
                  w-[20%]
                  whitespace-nowrap
                  px-4
                  py-3
                  text-left
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                  text-[#E7CF72]
                "
              >
                Actions
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="
                    bg-white
                    p-8
                    text-center
                    text-sm
                    text-[#64748B]
                  "
                >
                  No operational events found.
                </td>
              </tr>
            ) : (
              events.map((event, index) => (
                <tr
                  key={event.id}
                  className={`
                    border-t
                    border-[#E5D7BD]
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
                  <td
                    className="
                      whitespace-nowrap
                      px-4
                      py-3
                      text-sm
                      text-[#10213A]
                    "
                  >
                    {event.event_date}
                  </td>

                  <td
                    className="
                      break-words
                      px-4
                      py-3
                      text-sm
                      font-medium
                      text-[#10213A]
                    "
                  >
                    {event.event_name}
                  </td>

                  <td
                    className="
                      px-4
                      py-3
                      text-sm
                      text-[#475569]
                    "
                  >
                    <div
                      className="
                        overflow-hidden
                        break-words
                        leading-5
                      "
                      title={event.notes || ""}
                    >
                      {event.notes || "-"}
                    </div>
                  </td>

                  <td
                    className="
                      px-4
                      py-3
                    "
                  >
                    <div
                      className="
                        flex
                        items-center
                        gap-2
                        whitespace-nowrap
                      "
                    >
                      <button
                        type="button"
                        onClick={() => onEdit(event)}
                        className="
                          rounded
                          bg-[#2161F5]
                          px-4
                          py-1.5
                          text-sm
                          font-medium
                          text-white
                          transition-colors
                          duration-150
                          hover:bg-[#1955DE]
                        "
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(event.id)}
                        className="
                          rounded
                          bg-[#EF233C]
                          px-4
                          py-1.5
                          text-sm
                          font-medium
                          text-white
                          transition-colors
                          duration-150
                          hover:bg-[#D91E36]
                        "
                      >
                        Delete
                      </button>
                    </div>
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
          h-[390px]
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
            Event List
          </span>

          <span className="text-xs text-[#C8D2DF]/70">
            {events.length} events
          </span>
        </div>

        {events.length === 0 ? (
          <div
            className="
              bg-white
              px-4
              py-10
              text-center
              text-sm
              text-[#64748B]
            "
          >
            No operational events found.
          </div>
        ) : (
          <div>
            {events.map((event, index) => (
              <div
                key={event.id}
                className={`
                  border-b
                  border-[#E5D7BD]
                  px-4
                  py-4
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
                {/* Event Date */}
                <div>
                  <div
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-wide
                      text-[#64748B]
                    "
                  >
                    Event Date
                  </div>

                  <div
                    className="
                      mt-1
                      whitespace-nowrap
                      text-sm
                      font-medium
                      text-[#10213A]
                    "
                  >
                    {event.event_date}
                  </div>
                </div>

                {/* Event Name */}
                <div className="mt-3">
                  <div
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-wide
                      text-[#64748B]
                    "
                  >
                    Event Name
                  </div>

                  <div
                    className="
                      mt-1
                      break-words
                      text-base
                      font-semibold
                      leading-5
                      text-[#10213A]
                    "
                  >
                    {event.event_name}
                  </div>
                </div>

                {/* Notes */}
                <div className="mt-3">
                  <div
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-wide
                      text-[#64748B]
                    "
                  >
                    Notes
                  </div>

                  <div
                    className="
                      mt-1
                      break-words
                      text-sm
                      leading-5
                      text-[#475569]
                    "
                  >
                    {event.notes || "-"}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(event)}
                    className="
                      flex-1
                      rounded-lg
                      bg-[#2161F5]
                      px-4
                      py-2
                      text-sm
                      font-medium
                      text-white
                      transition-colors
                      duration-150
                      hover:bg-[#1955DE]
                      active:bg-[#164BC7]
                    "
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(event.id)}
                    className="
                      flex-1
                      rounded-lg
                      bg-[#EF233C]
                      px-4
                      py-2
                      text-sm
                      font-medium
                      text-white
                      transition-colors
                      duration-150
                      hover:bg-[#D91E36]
                      active:bg-[#C91F30]
                    "
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}