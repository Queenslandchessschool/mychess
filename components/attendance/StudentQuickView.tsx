"use client";

import type { AttendanceStudent } from "./types";

interface Props {
  open: boolean;
  student: AttendanceStudent | null;
  onClose: () => void;
}

export default function StudentQuickView({
  open,
  student,
  onClose,
}: Props) {
  if (!open || !student) return null;

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-[#011029]/45
        px-3
        py-3
        sm:px-4
        sm:py-6
        backdrop-blur-[2px]
      "
      onClick={onClose}
    >
      <div
  className="
    relative
    w-full
    max-w-[420px]
    overflow-hidden
    rounded-2xl
    border
          border-[#D9E3ED]
          bg-[#FFFDF8]
          shadow-[0_20px_60px_rgba(1,16,41,0.25)]
        "
        onClick={(e) => e.stopPropagation()}
      >
      {/* Gold Tapered Accent */}
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
    [clip-path:polygon(0_0,100%_42%,100%_58%,0_100%)]
  "
/>

        {/* Header */}
        <div
          className="
            flex
            items-start
            justify-between
            gap-3
            border-b
            border-[#E5EAF0]
            px-4
            py-3.5
            sm:px-6
            sm:py-5
          "
        >
          <div className="min-w-0">
            <p
              className="
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.18em]
                text-[#B18A20]
                sm:text-[11px]
              "
            >
              Student
            </p>

            <h2
              className="
                mt-0.5
                text-lg
                font-bold
                text-[#011029]
                sm:mt-1
                sm:text-xl
              "
            >
              Quick View
            </h2>

            <p
              className="
                mt-0.5
                truncate
                text-sm
                font-medium
                text-[#64748B]
                sm:mt-1
              "
            >
              {student.student_name}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-full
              border
              border-[#D9E3ED]
              bg-white
              text-base
              text-[#64748B]
              transition
              hover:border-[#D4AF37]
              hover:bg-[#FFF8E7]
              hover:text-[#011029]
              active:scale-95
              sm:h-9
              sm:w-9
              sm:text-lg
            "
          >
            ×
          </button>
        </div>

        {/* Information */}
        <div
          className="
            space-y-2.5
            px-4
            py-4
            sm:space-y-4
            sm:px-6
            sm:py-6
          "
        >
          {/* School Class */}
          {student.school_class && (
            <QuickItem
              icon="🏫"
              title="School Class"
              value={student.school_class}
            />
          )}

          {/* Parent Name */}
          {student.parent_name && (
            <QuickItem
              icon="👤"
              title="Parent Name"
              value={student.parent_name}
            />
          )}

          {/* Mobile */}
          {student.parent_mobile && (
            <QuickItem
              icon="📱"
              title="Mobile"
              value={student.parent_mobile}
            />
          )}

          {/* Medical */}
          {student.has_medical && (
            <QuickItem
              icon="⚕️"
              title="Medical"
              value="Medical information available"
              accent="medical"
            />
          )}

          {/* Notes */}
          <QuickItem
            icon="📝"
            title="Notes"
            value={student.notes || "-"}
          />
        </div>

        {/* Footer - desktop only */}
        <div
          className="
            hidden
            border-t
            border-[#E5EAF0]
            px-6
            py-4
            sm:block
          "
        >
          <button
            type="button"
            onClick={onClose}
            className="
              w-full
              rounded-lg
              border
              border-[#D9E3ED]
              bg-white
              px-4
              py-2.5
              text-sm
              font-medium
              text-[#011029]
              transition
              hover:border-[#D4AF37]
              hover:bg-[#FFF8E7]
              active:scale-[0.98]
            "
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface ItemProps {
  icon: string;
  title: string;
  value: string;
  accent?: "medical";
}

function QuickItem({
  icon,
  title,
  value,
  accent,
}: ItemProps) {
  return (
    <div
      className={`
        rounded-xl
        border
        px-3.5
        py-2.5
        sm:px-4
        sm:py-3.5
        ${
          accent === "medical"
            ? "border-red-200 bg-red-50"
            : "border-[#D9E3ED] bg-white"
        }
      `}
    >
      <div className="flex items-center gap-3">
        <span
          className="
            shrink-0
            text-base
            leading-none
            sm:text-base
          "
        >
          {icon}
        </span>

        <div className="min-w-0 flex-1">
          <div
            className={`
              text-[10px]
              font-semibold
              uppercase
              tracking-[0.12em]
              sm:text-[11px]
              ${
                accent === "medical"
                  ? "text-red-600"
                  : "text-[#64748B]"
              }
            `}
          >
            {title}
          </div>

          <div
            className={`
              mt-0.5
              break-words
              text-sm
              font-medium
              sm:mt-1
              ${
                accent === "medical"
                  ? "text-red-700"
                  : "text-[#011029]"
              }
            `}
          >
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}