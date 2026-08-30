"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

import {
  getEligibleMakeupLessons,
  createMakeupBooking,
  cancelMakeupBooking,
} from "@/lib/makeupBooking";

import BookingForm from "@/components/makeup/booking/BookingForm";
import BookingTable from "@/components/makeup/booking/BookingTable";

import type {
  MakeupBooking,
  BookingFormData,
  LessonOption,
  CreditOption,
} from "@/components/makeup/booking/types";

export default function MakeupBookingPage() {
  const [credits, setCredits] =
    useState<CreditOption[]>([]);

  const [lessons, setLessons] =
    useState<LessonOption[]>([]);

  const [records, setRecords] =
    useState<MakeupBooking[]>([]);

  const [form, setForm] =
    useState<BookingFormData>({
      credit_id: "",
      lesson_id: "",
    });
    
const [notice, setNotice] = useState<{
  title: string;
  message: string;
} | null>(null);

const [confirmBooking, setConfirmBooking] = useState<{
  credit: CreditOption;
  lesson: LessonOption;
} | null>(null);

const [confirmCancel, setConfirmCancel] =
  useState<MakeupBooking | null>(null);

  /*
   * ============================================================
   * Family → Available Make-up Credits
   * ============================================================
   */

  async function loadFamilyCredits() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (
      userError ||
      !user?.email
    ) {
      console.error(userError);
      return;
    }

    const email =
      user.email
        .trim()
        .toLowerCase();

    /*
     * ----------------------------------------------------------
     * Parent → Family
     * ----------------------------------------------------------
     */

    const {
      data: parentRows,
      error: parentError,
    } = await supabase
      .from("parents")
      .select(
        "family_id, student_id"
      )
      .eq("email", email);

    if (parentError) {
      console.error(parentError);
      return;
    }

    const familyId =
      parentRows?.[0]?.family_id;

    if (!familyId) {
      setCredits([]);
      return;
    }

    /*
     * ----------------------------------------------------------
     * Family → Children
     * ----------------------------------------------------------
     */

    const {
      data: familyParents,
      error: familyError,
    } = await supabase
      .from("parents")
      .select("student_id")
      .eq(
        "family_id",
        familyId
      );

    if (familyError) {
      console.error(familyError);
      return;
    }

    const studentIds =
      Array.from(
        new Set(
          (familyParents ?? [])
            .map(
              (item) =>
                item.student_id
            )
            .filter(Boolean)
        )
      );

    if (
      studentIds.length === 0
    ) {
      setCredits([]);
      return;
    }

    /*
     * ----------------------------------------------------------
     * Family Children → Available Credits
     * ----------------------------------------------------------
     */

    const {
      data,
      error,
    } = await supabase
      .from("makeup_credits")
      .select(`
        id,
        student_id,
        credits,
        students:student_id(
          first_name,
          last_name
        )
      `)
      .in(
        "student_id",
        studentIds
      )
      .eq(
        "status",
        "Available"
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

    if (error) {
      console.error(error);
      return;
    }

    const rows: CreditOption[] =
      (data ?? []).map(
        (item: any) => ({
          id: item.id,

          student_id:
            item.student_id,

          student_name:
            item.students
              ? `${item.students.first_name} ${item.students.last_name}`
              : "",

          credits:
            item.credits,
        })
      );

    setCredits(rows);
  }

  /*
   * ============================================================
   * Part 3C — Family-scoped Booking Records
   * ============================================================
   */

  async function loadFamilyBookingRecords() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (
      userError ||
      !user?.email
    ) {
      console.error(userError);
      setRecords([]);
      return;
    }

    const email =
      user.email
        .trim()
        .toLowerCase();

    /*
     * ----------------------------------------------------------
     * Parent → Family
     * ----------------------------------------------------------
     */

    const {
      data: parentRows,
      error: parentError,
    } = await supabase
      .from("parents")
      .select("family_id")
      .eq(
        "email",
        email
      );

    if (parentError) {
      console.error(parentError);
      setRecords([]);
      return;
    }

    const familyId =
      parentRows?.[0]?.family_id;

    if (!familyId) {
      setRecords([]);
      return;
    }

    /*
     * ----------------------------------------------------------
     * Family → Children
     * ----------------------------------------------------------
     */

    const {
      data: familyParents,
      error: familyError,
    } = await supabase
      .from("parents")
      .select("student_id")
      .eq(
        "family_id",
        familyId
      );

    if (familyError) {
      console.error(familyError);
      setRecords([]);
      return;
    }

    const studentIds =
      Array.from(
        new Set(
          (familyParents ?? [])
            .map(
              (item) =>
                item.student_id
            )
            .filter(Boolean)
        )
      );

    if (
      studentIds.length === 0
    ) {
      setRecords([]);
      return;
    }

    /*
     * ----------------------------------------------------------
     * Family Children → Booking History
     *
     * IMPORTANT:
     * Do not filter status.
     *
     * Cancelled bookings remain visible
     * as booking history.
     * ----------------------------------------------------------
     */

    const {
      data,
      error,
    } = await supabase
      .from("makeup_bookings")
      .select(`
        id,
        credit_id,
        student_id,
        lesson_id,
        attendance_id,
        status,
        created_at,
        completed_at,
        students:student_id(
          first_name,
          last_name
        ),
        lessons:lesson_id(
  lesson_date,
  classes:class_id(
    level,
    class_suffix,
    start_time,
    end_time,
    campus:campus_id(
      campus_name,
      short_name
    )
  )
)
      `)
      .in(
        "student_id",
        studentIds
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (error) {
      console.error(
        "Failed to load family booking records:",
        error
      );

      setRecords([]);
      return;
    }

    const rows: MakeupBooking[] =
      (data ?? []).map(
        (item: any) => ({
          id: item.id,

          credit_id:
            item.credit_id,

          student_id:
            item.student_id,

          student_name:
            item.students
              ? `${item.students.first_name} ${item.students.last_name}`
              : "",

lesson_id: item.lesson_id,

lesson_date:
  item.lessons?.lesson_date ?? "",

start_time:
  item.lessons?.classes?.start_time ?? "",

end_time:
  item.lessons?.classes?.end_time ?? "",

campus_name:
  item.lessons?.classes?.campus?.short_name ||
  item.lessons?.classes?.campus?.campus_name ||
  "",

lesson_name:
  item.lessons
    ? `${item.lessons.lesson_date} - ${item.lessons.classes?.level ?? ""} ${item.lessons.classes?.class_suffix ?? ""}`
    : "",

attendance_id:
            item.attendance_id,

          status:
            item.status,

          created_at:
            item.created_at,

          completed_at:
            item.completed_at,
        })
      );

    setRecords(rows);
  }

  /*
   * ============================================================
   * Lesson Time Formatting
   * ============================================================
   */

  function formatLessonTime(
    startTime: string,
    endTime: string
  ) {
    if (
      !startTime ||
      !endTime
    ) {
      return "";
    }

    const formatTime = (
      value: string
    ) => {
      const [
        hourString,
        minuteString,
      ] = value.split(":");

      const hour =
        Number(hourString);

      const minute =
        Number(minuteString);

      if (
        Number.isNaN(hour) ||
        Number.isNaN(minute)
      ) {
        return value;
      }

      const period =
        hour >= 12
          ? "PM"
          : "AM";

      const displayHour =
        hour % 12 === 0
          ? 12
          : hour % 12;

      return `${displayHour}:${String(
        minute
      ).padStart(
        2,
        "0"
      )} ${period}`;
    };

    const start =
      formatTime(startTime);

    const end =
      formatTime(endTime);

    const startPeriod =
      start.endsWith("AM")
        ? "AM"
        : "PM";

    const endPeriod =
      end.endsWith("AM")
        ? "AM"
        : "PM";

    if (
      startPeriod ===
      endPeriod
    ) {
      return `${start.replace(
        ` ${startPeriod}`,
        ""
      )}–${end}`;
    }

    return `${start}–${end}`;
  }

  /*
   * ============================================================
   * Eligible Lessons
   * ============================================================
   */

  async function loadEligibleLessons(
    studentId: string
  ) {
    const eligibleLessons =
      await getEligibleMakeupLessons({
        studentId,
      });

    const rows: LessonOption[] =
      eligibleLessons.map(
        (lesson) => ({
          id: lesson.id,

          lesson_date:
            lesson.lesson_date,

          start_time:
            lesson.start_time,

          end_time:
            lesson.end_time,

          campus_name:
            lesson.campus_name,

          level:
            lesson.level,
        })
      );

    setLessons(rows);
  }

  /*
   * ============================================================
   * Part 3B — Save / Create Booking
   * ============================================================
   */

  async function handleSave() {
  /*
   * ----------------------------------------------------------
   * Step 1 — Validate Credit
   * ----------------------------------------------------------
   */

  if (!form.credit_id) {
    setNotice({
      title: "Make-up Booking",
      message: "Please select a make-up credit.",
    });

    return;
  }

  /*
   * ----------------------------------------------------------
   * Step 2 — Validate Lesson
   * ----------------------------------------------------------
   */

  if (!form.lesson_id) {
    setNotice({
      title: "Make-up Booking",
      message: "Please select a lesson.",
    });

    return;
  }

  /*
   * ----------------------------------------------------------
   * Step 3 — Resolve selected Credit
   * ----------------------------------------------------------
   */

  const selectedCredit =
    credits.find(
      (credit) =>
        credit.id === form.credit_id
    );

  if (!selectedCredit) {
    setNotice({
      title: "Make-up Booking",
      message:
        "The selected make-up credit is no longer available.",
    });

    return;
  }

  /*
   * ----------------------------------------------------------
   * Step 4 — Resolve selected Lesson
   * ----------------------------------------------------------
   */

  const selectedLesson =
    lessons.find(
      (lesson) =>
        lesson.id === form.lesson_id
    );

  if (!selectedLesson) {
    setNotice({
      title: "Make-up Booking",
      message:
        "The selected lesson is no longer available.",
    });

    return;
  }

  /*
   * ----------------------------------------------------------
   * Step 5 — Frozen Confirmation Dialog
   *
   * Do NOT create the Booking yet.
   * ----------------------------------------------------------
   */

  setConfirmBooking({
    credit: selectedCredit,
    lesson: selectedLesson,
  });
}

async function handleConfirmBooking() {
  if (!confirmBooking) {
    return;
  }

  const {
    credit,
    lesson,
  } = confirmBooking;

  setConfirmBooking(null);

  try {
    /*
     * Shared Booking Engine
     *
     * Final validation is still owned by
     * the shared business layer.
     */
    await createMakeupBooking({
      creditId: credit.id,
      lessonId: lesson.id,
    });

    setForm({
      credit_id: "",
      lesson_id: "",
    });

    setLessons([]);

    await Promise.all([
      loadFamilyCredits(),
      loadFamilyBookingRecords(),
    ]);

    setNotice({
      title: "Booking Confirmed",
      message:
        "Make-up lesson booked successfully.",
    });
  } catch (error: any) {
    console.error(
      "MAKEUP BOOKING SAVE ERROR:",
      error
    );

    setNotice({
      title: "Unable to Book Lesson",
      message:
        error?.message ||
        "Unable to book the make-up lesson.",
    });
  }
}
  /*
   * ============================================================
   * Part 3C — Cancel Booking
   * ============================================================
   *
   * Parent may cancel only before lesson start.
   *
   * The shared cancellation engine is responsible for:
   *
   * - Lesson Start protection
   * - Booking → Cancelled
   * - Credit → Available
   * - Race protection
   * - Keeping the booking history record
   * ============================================================
   */

  function handleBookingCancel(
    record: MakeupBooking
  ) {
    setConfirmCancel(record);
  }

  async function handleConfirmCancel() {
    if (!confirmCancel) {
      return;
    }

    const record = confirmCancel;

    setConfirmCancel(null);

    try {
      await cancelMakeupBooking({
        bookingId: record.id,
      });

      await Promise.all([
        loadFamilyCredits(),
        loadFamilyBookingRecords(),
      ]);

      setNotice({
        title: "Booking Cancelled",
        message:
          "Make-up booking cancelled successfully.",
      });
    } catch (error: any) {
      console.error(
        "MAKEUP BOOKING CANCEL ERROR:",
        error
      );

      setNotice({
        title: "Unable to Cancel Booking",
        message:
          error?.message ||
          "Unable to cancel the make-up booking.",
      });

      /*
       * Refresh anyway.
       *
       * Protects the UI if another process
       * changed the booking state.
       */
      await Promise.all([
        loadFamilyCredits(),
        loadFamilyBookingRecords(),
      ]);
    }
  }
  /*
   * ============================================================
   * Form Cancel
   * ============================================================
   */

  function handleCancel() {
    setForm({
      credit_id: "",
      lesson_id: "",
    });

    setLessons([]);
  }

  /*
   * ============================================================
   * Initial Load
   * ============================================================
   */

  useEffect(() => {
    loadFamilyCredits();
    loadFamilyBookingRecords();
  }, []);

  /*
   * ============================================================
   * Credit → Eligible Lessons
   * ============================================================
   */

  useEffect(() => {
    const selectedCredit =
      credits.find(
        (credit) =>
          credit.id ===
          form.credit_id
      );

    if (!selectedCredit) {
      setLessons([]);
      return;
    }

    /*
     * Clear previously selected lesson
     * whenever the Credit changes.
     */

    setForm(
      (current) => ({
        ...current,
        lesson_id: "",
      })
    );

    loadEligibleLessons(
      selectedCredit.student_id
    );
  }, [
    form.credit_id,
    credits,
  ]);

  /*
   * ============================================================
   * Page
   * ============================================================
   */

  return (
    <div
      className="
        mx-auto
        w-full
        max-w-[1500px]
        px-4
        py-6
        sm:px-6
        sm:py-8
        lg:px-8
        lg:py-10
      "
    >
      {/* Page Header */}

      <div className="mb-6">
        <h1
          className="
            text-3xl
            font-bold
            tracking-tight
            text-white
            sm:text-4xl
          "
        >
          Make-up Booking
        </h1>

        <p
          className="
            mt-1.5
            text-sm
            leading-5
            text-gray-400
            sm:text-base
          "
        >
          Book an eligible make-up
          lesson for my child.
        </p>
      </div>

      {/* Booking Form */}

      <BookingForm
        form={form}
        credits={credits}
        lessons={lessons}
        onChange={setForm}
        onSave={handleSave}
        onCancel={handleCancel}
      />

      {/* Booking Records */}

      <div className="mt-6">
        <BookingTable
  records={records}
  onDelete={
    handleBookingCancel
  }
  actionLabel="Cancel"
/>

{notice && (
  <div
    className="
      fixed
      inset-0
      z-50
      flex
      items-center
      justify-center
      bg-[#071A2F]/65
      px-4
      backdrop-blur-[2px]
    "
    role="dialog"
    aria-modal="true"
    aria-labelledby="notice-title"
  >
    <div
      className="
        relative
        w-full
        max-w-md
        overflow-hidden
        rounded-2xl
        border
        border-[#D4AF37]/30
        bg-[#FFFDF8]
        text-[#10213A]
        shadow-2xl
      "
    >
      {/* Gold tapered accent */}
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

      <div className="p-6 sm:p-7">
        <p
          className="
            text-[11px]
            font-semibold
            uppercase
            tracking-[0.2em]
            text-[#B28A22]
          "
        >
          {notice.title}
        </p>

        <h2
          id="notice-title"
          className="
            mt-2
            text-xl
            font-semibold
            text-[#10213A]
          "
        >
          {notice.message}
        </h2>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => setNotice(null)}
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
            OK
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{confirmBooking && (
  <div
    className="
      fixed
      inset-0
      z-50
      flex
      items-center
      justify-center
      bg-[#071A2F]/65
      px-4
      backdrop-blur-[2px]
    "
    role="dialog"
    aria-modal="true"
  >
    <div
      className="
        relative
        w-full
        max-w-lg
        overflow-hidden
        rounded-2xl
        border
        border-[#D4AF37]/30
        bg-[#FFFDF8]
        text-[#10213A]
        shadow-2xl
      "
    >
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

      <div className="p-6 sm:p-7">
        <p
          className="
            text-[11px]
            font-semibold
            uppercase
            tracking-[0.2em]
            text-[#B28A22]
          "
        >
          MAKE-UP BOOKING
        </p>

        <h2 className="mt-2 text-2xl font-semibold">
          Confirm Make-up Booking
        </h2>

        <p className="mt-4 text-sm leading-6 text-[#64748B]">
          Are you sure{" "}
          <span className="font-semibold text-[#10213A]">
            {confirmBooking.credit.student_name}
          </span>{" "}
          can attend this make-up lesson?
        </p>

        <div
          className="
            mt-5
            rounded-xl
            border
            border-[#D9E3ED]
            bg-[#F5F9FD]
            p-4
          "
        >
          <p className="text-sm font-semibold text-[#10213A]">
            {confirmBooking.lesson.campus_name}
            {" | "}
            {confirmBooking.lesson.level}
          </p>

          <p className="mt-1 text-sm text-[#64748B]">
            {confirmBooking.lesson.lesson_date}
          </p>

          <p className="mt-1 text-sm text-[#64748B]">
            {formatLessonTime(
              confirmBooking.lesson.start_time,
              confirmBooking.lesson.end_time
            )}
          </p>
        </div>

        <div
          className="
            mt-6
            flex
            flex-col-reverse
            gap-3
            sm:flex-row
            sm:justify-end
          "
        >
          <button
            type="button"
            onClick={() =>
              setConfirmBooking(null)
            }
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
              hover:bg-[#F8FAFC]
            "
          >
            No
          </button>

          <button
            type="button"
            onClick={handleConfirmBooking}
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
              hover:bg-[#F4D35E]
            "
          >
            Yes, Book Lesson
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{confirmCancel && (
  <div
    className="
      fixed
      inset-0
      z-50
      flex
      items-center
      justify-center
      bg-[#071A2F]/65
      px-4
      backdrop-blur-[2px]
    "
    role="dialog"
    aria-modal="true"
  >
    <div
      className="
        relative
        w-full
        max-w-md
        overflow-hidden
        rounded-2xl
        border
        border-[#D4AF37]/30
        bg-[#FFFDF8]
        text-[#10213A]
        shadow-2xl
      "
    >
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

      <div className="p-6 sm:p-7">
        <p
          className="
            text-[11px]
            font-semibold
            uppercase
            tracking-[0.2em]
            text-[#B28A22]
          "
        >
          MAKE-UP BOOKING
        </p>

        <h2 className="mt-2 text-2xl font-semibold">
          Cancel this make-up booking?
        </h2>

        <p
          className="
            mt-4
            text-sm
            leading-6
            text-[#64748B]
          "
        >
          The make-up credit will be returned
          because the lesson has not started.
        </p>

        <div
          className="
            mt-6
            flex
            flex-col-reverse
            gap-3
            sm:flex-row
            sm:justify-end
          "
        >
          <button
            type="button"
            onClick={() =>
              setConfirmCancel(null)
            }
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
              hover:bg-[#F8FAFC]
            "
          >
            Keep Booking
          </button>

          <button
            type="button"
            onClick={handleConfirmCancel}
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
              hover:bg-[#F4D35E]
            "
          >
            Yes, Cancel Booking
          </button>
        </div>
      </div>
    </div>
  </div>
)}

      </div>
    </div>
  );
}