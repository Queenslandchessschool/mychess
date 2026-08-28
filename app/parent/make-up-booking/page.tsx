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
    end_time
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

          lesson_id:
            item.lesson_id,

          lesson_name:
            item.lessons
              ? `${item.lessons.lesson_date} - ${item.lessons.classes?.level ?? ""} ${item.lessons.classes?.class_suffix ?? ""}`.trim()
              : "",

           start_time:
  item.lessons?.classes?.start_time ?? "",

end_time:
  item.lessons?.classes?.end_time ?? "",

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
      window.alert(
        "Please select a make-up credit."
      );

      return;
    }

    /*
     * ----------------------------------------------------------
     * Step 2 — Validate Lesson
     * ----------------------------------------------------------
     */

    if (!form.lesson_id) {
      window.alert(
        "Please select a lesson."
      );

      return;
    }

    /*
     * ----------------------------------------------------------
     * Step 3 — Confirm selected Credit
     * ----------------------------------------------------------
     */

    const selectedCredit =
      credits.find(
        (credit) =>
          credit.id ===
          form.credit_id
      );

    if (!selectedCredit) {
      window.alert(
        "The selected make-up credit is no longer available."
      );

      return;
    }

    try {
      /*
       * Shared Booking Engine
       */

      await createMakeupBooking({
        creditId:
          form.credit_id,

        lessonId:
          form.lesson_id,
      });

      /*
       * Clear current selection
       */

      setForm({
        credit_id: "",
        lesson_id: "",
      });

      setLessons([]);

      /*
       * Refresh both sides of the UI.
       *
       * Credit:
       * Available → Booked
       *
       * Booking History:
       * new Booked record appears immediately
       */

      await Promise.all([
        loadFamilyCredits(),
        loadFamilyBookingRecords(),
      ]);

      window.alert(
        "Make-up lesson booked successfully."
      );
    } catch (error: any) {
      console.error(
        "MAKEUP BOOKING SAVE ERROR:",
        error
      );

      window.alert(
        error?.message ||
          "Unable to book the make-up lesson."
      );
    }
  }

  /*
   * ============================================================
   * Part 3C — Cancel Booking
   * ============================================================
   *
   * Parent may cancel only before lesson start.
   *
   * The shared cancellation engine is responsible
   * for:
   *
   * - Lesson Start protection
   * - Booking → Cancelled
   * - Credit → Available
   * - Race protection
   * - Keeping the booking history record
   * ============================================================
   */

  async function handleBookingCancel(
    record: MakeupBooking
  ) {
    const confirmed =
      window.confirm(
        "Cancel this make-up booking?\n\nThe make-up credit will be returned because the lesson has not started."
      );

    if (!confirmed) {
      return;
    }

    try {
      await cancelMakeupBooking({
        bookingId:
          record.id,
      });

      /*
       * Refresh:
       *
       * 1. Available Credits
       * 2. Booking History
       */

      await Promise.all([
        loadFamilyCredits(),
        loadFamilyBookingRecords(),
      ]);

      window.alert(
        "Make-up booking cancelled successfully."
      );
    } catch (error: any) {
      console.error(
        "MAKEUP BOOKING CANCEL ERROR:",
        error
      );

      window.alert(
        error?.message ||
          "Unable to cancel the make-up booking."
      );

      /*
       * Refresh anyway.
       *
       * This protects the UI if another
       * process changed the booking state.
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
          lesson for your child.
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
      </div>
    </div>
  );
}