"use client";

import { useEffect, useState } from "react";
import MakeupForm from "@/components/makeup/MakeupForm";
import MakeupTable from "@/components/makeup/MakeupTable";

import BookingForm from "@/components/makeup/booking/BookingForm";
import BookingTable from "@/components/makeup/booking/BookingTable";

import type {
  MakeupBooking,
  BookingFormData,
  LessonOption,
  CreditOption,
} from "@/components/makeup/booking/types";

import { supabase } from "@/lib/supabase";

import {
  getEligibleMakeupLessons,
  createMakeupBooking,
  cancelMakeupBooking,
  completeMakeupBooking,
} from "@/lib/makeupBooking";

import type {
  MakeupCredit,
  MakeupFormData,
  StudentOption,
} from "@/components/makeup/types";

export default function MakeupPage() {
  const [records, setRecords] =
    useState<MakeupCredit[]>([]);

  const [students, setStudents] =
    useState<StudentOption[]>([]);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [form, setForm] =
    useState<MakeupFormData>({
      student_id: "",
      credits: 1,
      reason: "",
    });

  const [bookingRecords, setBookingRecords] =
    useState<MakeupBooking[]>([]);

  const [bookingCredits, setBookingCredits] =
    useState<CreditOption[]>([]);

  const [bookingLessons, setBookingLessons] =
    useState<LessonOption[]>([]);

  const [bookingForm, setBookingForm] =
    useState<BookingFormData>({
      credit_id: "",
      lesson_id: "",
    });

  /*
   * ============================================================
   * MyCHESS Notice Modal
   * ============================================================
   */

  const [notice, setNotice] = useState<{
    title: string;
    message: string;
  } | null>(null);

  /*
   * ============================================================
   * MyCHESS Confirmation Modal
   * ============================================================
   */

  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  function showNotice(
    title: string,
    message: string
  ) {
    setNotice({
      title,
      message,
    });
  }

  function showConfirm(
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>
  ) {
    setConfirmAction({
      title,
      message,
      onConfirm,
    });
  }

  async function handleConfirmAction() {
    if (!confirmAction) {
      return;
    }

    const action = confirmAction.onConfirm;

    setConfirmAction(null);

    await action();
  }

  async function loadStudents() {
    const { data, error } = await supabase
      .from("students")
      .select("id, first_name, last_name")
      .eq("status", "Active")
      .order("first_name");

    if (error) {
      console.error(error);
      return;
    }

    const options: StudentOption[] =
      (data ?? []).map((student: any) => ({
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
      }));

    setStudents(options);
  }

  async function handleSave() {
    if (!form.student_id) {
      showNotice(
        "MAKE-UP CREDIT",
        "Please select a student."
      );
      return;
    }

    if (!form.reason.trim()) {
      showNotice(
        "MAKE-UP CREDIT",
        "Please enter a reason."
      );
      return;
    }

    const wasEditing = editingId !== null;

    let error = null;

    if (editingId) {
      const result = await supabase
        .from("makeup_credits")
        .update({
          student_id: form.student_id,
          credits: form.credits,
          reason: form.reason,
        })
        .eq("id", editingId);

      error = result.error;
    } else {
      const records = [];

      for (let i = 0; i < form.credits; i++) {
        records.push({
          student_id: form.student_id,
          credits: 1,
          status: "Available",
          reason: form.reason,
        });
      }

      const result = await supabase
        .from("makeup_credits")
        .insert(records);

      error = result.error;
    }

    if (error) {
      console.error(error);

      showNotice(
        "MAKE-UP CREDIT",
        wasEditing
          ? "Failed to update make-up credit."
          : "Failed to grant make-up credit."
      );

      return;
    }

    await loadCredits();
    await loadBookingCredits();

    setEditingId(null);

    setForm({
      student_id: "",
      credits: 1,
      reason: "",
    });

    showNotice(
      "MAKE-UP CREDIT",
      wasEditing
        ? "Make-up credit updated."
        : "Make-up credit granted."
    );
  }

  function handleDelete(record: MakeupCredit) {
    /*
     * Frozen Make-up Credit lifecycle:
     *
     * Available → Delete
     * Booked    → Cancel Booking → Available → Delete
     * Used      → No Delete
     */

    if (record.status === "Booked") {
      showNotice(
        "MAKE-UP CREDIT",
        "This make-up credit is currently Booked. Please cancel the booking before deleting the credit."
      );

      return;
    }

    if (record.status === "Used") {
      showNotice(
        "MAKE-UP CREDIT",
        "This make-up credit has already been Used and cannot be deleted."
      );

      return;
    }

    if (record.status !== "Available") {
      showNotice(
        "MAKE-UP CREDIT",
        "This make-up credit cannot be deleted in its current status."
      );

      return;
    }

    showConfirm(
      "MAKE-UP CREDIT",
      "Delete this make-up credit?",
      async () => {
        const { error } = await supabase
          .from("makeup_credits")
          .delete()
          .eq("id", record.id);

        if (error) {
          console.error(error);

          showNotice(
            "MAKE-UP CREDIT",
            "Unable to delete this make-up credit."
          );

          return;
        }

        await loadCredits();
        await loadBookingCredits();

        showNotice(
          "MAKE-UP CREDIT",
          "Make-up credit deleted."
        );
      }
    );
  }

  function handleCancel() {
    setEditingId(null);

    setForm({
      student_id: "",
      credits: 1,
      reason: "",
    });
  }

  async function handleBookingSave() {
    if (!bookingForm.credit_id) {
      showNotice(
        "MAKE-UP BOOKING",
        "Please select a credit."
      );

      return;
    }

    if (!bookingForm.lesson_id) {
      showNotice(
        "MAKE-UP BOOKING",
        "Please select a lesson."
      );

      return;
    }

    const credit =
      bookingCredits.find(
        (c) => c.id === bookingForm.credit_id
      );

    if (!credit) {
      showNotice(
        "MAKE-UP BOOKING",
        "Credit not found."
      );

      return;
    }

    try {
      await createMakeupBooking({
        creditId: bookingForm.credit_id,
        lessonId: bookingForm.lesson_id,
      });

      await loadBookings();
      await loadCredits();
      await loadBookingCredits();

      setBookingForm({
        credit_id: "",
        lesson_id: "",
      });

      showNotice(
        "MAKE-UP BOOKING",
        "Booking created."
      );
    } catch (error: any) {
      console.error(
        "MAKEUP BOOKING SAVE ERROR:",
        error
      );

      showNotice(
        "MAKE-UP BOOKING",
        error?.message ||
          "Booking failed."
      );
    }
  }

  function handleBookingCancel() {
    setBookingForm({
      credit_id: "",
      lesson_id: "",
    });
  }

  function handleBookingDelete(
    record: MakeupBooking
  ) {
    showConfirm(
      "MAKE-UP BOOKING",
      "Cancel this make-up booking?",
      async () => {
        try {
          await cancelMakeupBooking({
            bookingId: record.id,
          });

          await loadBookings();
          await loadCredits();
          await loadBookingCredits();

          showNotice(
            "MAKE-UP BOOKING",
            "Booking cancelled."
          );
        } catch (error: any) {
          console.error(
            "MAKEUP BOOKING CANCEL ERROR:",
            error
          );

          showNotice(
            "MAKE-UP BOOKING",
            error?.message ||
              "Unable to cancel the booking."
          );
        }
      }
    );
  }
async function handleBookingComplete(
  record: MakeupBooking
) {
  showConfirm(
    "MAKE-UP BOOKING",
    "Complete this make-up booking?",
    async () => {
      try {
        await completeMakeupBooking({
          bookingId: record.id,
        });

        await loadBookings();
        await loadCredits();
        await loadBookingCredits();

        showNotice(
          "MAKE-UP BOOKING",
          "Make-up booking completed."
        );
      } catch (error: any) {
        console.error(
          "MAKEUP BOOKING COMPLETE ERROR:",
          error
        );

        showNotice(
          "MAKE-UP BOOKING",
          error?.message ||
            "Unable to complete the booking."
        );
      }
    }
  );
}
  useEffect(() => {
    loadStudents();
    loadCredits();
    loadBookingCredits();
    loadBookings();
  }, []);

  useEffect(() => {
    if (!bookingForm.credit_id) {
      setBookingLessons([]);
      return;
    }

    const credit = bookingCredits.find(
      (c) => c.id === bookingForm.credit_id
    );

    if (!credit) {
      return;
    }

    loadBookingLessons();
  }, [
    bookingForm.credit_id,
    bookingCredits,
  ]);

  async function loadCredits() {
    const { data, error } = await supabase
      .from("makeup_credits")
      .select(`
        *,
        students:student_id(
          first_name,
          last_name
        )
      `)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      return;
    }

    const rows: MakeupCredit[] =
      (data ?? []).map((item: any) => ({
        id: item.id,

        student_id: item.student_id,

        student_name:
          item.students
            ? `${item.students.first_name} ${item.students.last_name}`
            : "",

        leave_record_id: item.leave_record_id,

        attendance_id: item.attendance_id,

        credits: item.credits,

        reason: item.reason ?? "",

        status: item.status,

        created_at: item.created_at,

        used_at: item.used_at,
      }));

    setRecords(rows);
  }

  async function loadBookingCredits() {
    const { data, error } = await supabase
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
      .eq("status", "Available")
      .order("created_at");

    if (error) {
      console.error(error);
      return;
    }

    const grouped =
      new Map<string, CreditOption>();

    (data ?? []).forEach((item: any) => {
      if (!grouped.has(item.student_id)) {
        grouped.set(item.student_id, {
          id: item.id,
          student_id: item.student_id,
          student_name: item.students
            ? `${item.students.first_name} ${item.students.last_name}`
            : "",
          credits: 1,
        });
      } else {
        grouped.get(
          item.student_id
        )!.credits++;
      }
    });

    setBookingCredits(
      Array.from(grouped.values())
    );
  }

  async function loadBookingLessons() {
    const credit = bookingCredits.find(
      (item) =>
        item.id === bookingForm.credit_id
    );

    if (!credit) {
      setBookingLessons([]);
      return;
    }

    const eligibleLessons =
      await getEligibleMakeupLessons({
        studentId: credit.student_id,
        includePrivate: true,
      });

    const rows: LessonOption[] =
      eligibleLessons.map((lesson) => ({
        id: lesson.id,
        lesson_date: lesson.lesson_date,
        start_time: lesson.start_time,
        end_time: lesson.end_time,
        class_id: lesson.class_id,
        class_name: lesson.class_name,
        level: lesson.level,
        campus_name: lesson.campus_name,
      }));

    setBookingLessons(rows);
  }

  async function loadBookings() {
    const { data, error } = await supabase
      .from("makeup_bookings")
      .select(`
        *,
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
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      return;
    }

    const rows: MakeupBooking[] =
      (data ?? []).map((item: any) => ({
        id: item.id,

        credit_id: item.credit_id,

        student_id: item.student_id,

        student_name:
          item.students
            ? `${item.students.first_name} ${item.students.last_name}`
            : "",

        lesson_id: item.lesson_id,

        lesson_date:
          item.lessons?.lesson_date ?? "",

        campus_name:
          item.lessons?.classes?.campus?.short_name ||
          item.lessons?.classes?.campus?.campus_name ||
          "",

        lesson_name:
          item.lessons
            ? `${item.lessons.lesson_date} - ${
                item.lessons.classes?.level ?? ""
              } ${
                item.lessons.classes?.class_suffix ?? ""
              }`
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
      }));

    setBookingRecords(rows);
  }

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
          Make-up Management
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
          Manage make-up credits.
        </p>

      </div>

      {/* Make-up Credit Form */}
      <MakeupForm
        form={form}
        students={students}
        editing={editingId !== null}
        onChange={setForm}
        onSave={handleSave}
        onCancel={handleCancel}
      />

      {/* Make-up Credit Records */}
      <div className="mt-6">

        <MakeupTable
          records={records}
          onEdit={(record) => {
            setForm({
              student_id: record.student_id,
              credits: record.credits,
              reason: record.reason,
            });

            setEditingId(record.id);
          }}
          onDelete={handleDelete}
        />

      </div>

      {/* Make-up Booking Form */}
      <div className="mt-6">

        <BookingForm
          form={bookingForm}
          credits={bookingCredits}
          lessons={bookingLessons}
          onChange={setBookingForm}
          onSave={handleBookingSave}
          onCancel={handleBookingCancel}
        />

      </div>

      {/* Make-up Booking Records */}
      <div className="mt-6">

        <BookingTable
  records={bookingRecords}
  onDelete={handleBookingDelete}
  onComplete={handleBookingComplete}
/>

      </div>

      {/* ======================================================
          MyCHESS Notice Modal
          ====================================================== */}

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
                  onClick={() =>
                    setNotice(null)
                  }
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

      {/* ======================================================
          MyCHESS Confirmation Modal
          ====================================================== */}

      {confirmAction && (
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
          aria-labelledby="confirm-title"
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
                {confirmAction.title}
              </p>

              <h2
                id="confirm-title"
                className="
                  mt-2
                  text-xl
                  font-semibold
                  text-[#10213A]
                "
              >
                {confirmAction.message}
              </h2>

              <div
                className="
                  mt-6
                  flex
                  flex-col-reverse
                  gap-2.5
                  sm:flex-row
                  sm:justify-end
                "
              >

                <button
                  type="button"
                  onClick={() =>
                    setConfirmAction(null)
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
                    duration-200
                    hover:border-[#94A3B8]
                    hover:bg-[#F8FAFC]
                    active:scale-[0.98]
                    focus:outline-none
                    focus:ring-2
                    focus:ring-[#D4AF37]/20
                  "
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmAction}
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
                  Confirm
                </button>

              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}