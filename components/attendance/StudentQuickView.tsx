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

  if (!open) return null;

  return (

    <div
      className="
      fixed
      inset-0
      bg-black/30
      flex
      justify-end
      z-50
      "
      onClick={onClose}
    >

      <div
        className="
        w-[360px]
        h-full
        bg-white
        shadow-xl
        p-6
        overflow-y-auto
        "
        onClick={(e) => e.stopPropagation()}
      >

        <div className="flex justify-between items-center mb-6">

          <h2 className="text-xl font-semibold">
            Student Quick View
          </h2>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black"
          >
            ✕
          </button>

        </div>

        <div className="space-y-6">

          {student && (
  <>

    {student.classroom_pickup && (
      <QuickItem
        title="School Class"
        value="Prep A"
      />
    )}

    <QuickItem
      title="Parent Contact"
      value="0412 345 678"
    />

    {student.has_medical && (
      <QuickItem
        title="Medical"
        value="Medical information"
      />
    )}

    <QuickItem
      title="Notes"
      value="-"
    />

  </>
)}

        </div>

      </div>

    </div>

  );

}

interface ItemProps {

  title: string;

  value: string;

}

function QuickItem({

  title,

  value,

}: ItemProps) {

  return (

    <div>

      <div className="text-sm text-gray-500 mb-1">
        {title}
      </div>

      <div className="font-medium">
        {value}
      </div>

    </div>

  );

}