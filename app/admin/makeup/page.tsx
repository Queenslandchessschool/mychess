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
    alert("Please select a student.");
    return;
  }

  if (!form.reason.trim()) {
    alert("Please enter a reason.");
    return;
  }

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
    alert("Failed to grant credit.");
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

  alert("Make-up credit granted.");

}

async function handleDelete(record: MakeupCredit) {

  if (!confirm("Delete this make-up credit?")) {
    return;
  }

  const { error } = await supabase
    .from("makeup_credits")
    .delete()
    .eq("id", record.id);

  if (error) {
    console.error(error);
    alert("Delete failed.");
    return;
  }

  await loadCredits();

}

  function handleCancel() {
    setForm({
      student_id: "",
      credits: 1,
      reason: "",
    });
  }

async function handleBookingSave() {

  if (!bookingForm.credit_id) {
    alert("Please select a credit.");
    return;
  }

  if (!bookingForm.lesson_id) {
    alert("Please select a lesson.");
    return;
  }

  const credit =
    bookingCredits.find(
      (c) => c.id === bookingForm.credit_id
    );

  if (!credit) {
    alert("Credit not found.");
    return;
  }

const { data: existingBooking } = await supabase
  .from("makeup_bookings")
  .select("id")
  .eq("student_id", credit.student_id)
  .eq("lesson_id", bookingForm.lesson_id)
  .neq("status", "Cancelled")
  .maybeSingle();

if (existingBooking) {
  alert(
    "This student already has a booking for this lesson."
  );
  return;
}

  const { error } = await supabase
    .from("makeup_bookings")
    .insert({
      credit_id: bookingForm.credit_id,
      student_id: credit.student_id,
      lesson_id: bookingForm.lesson_id,
      status: "Booked",
    });

  if (error) {
    console.error(error);
    alert("Booking failed.");
    return;
  }

  await supabase
  .from("makeup_credits")
  .update({
    status: "Booked",
  })
  .eq("id", bookingForm.credit_id);

  alert("Booking created.");

await loadBookings();
await loadCredits();
await loadBookingCredits();

setBookingForm({
  credit_id: "",
  lesson_id: "",
});

}

function handleBookingCancel() {
  setBookingForm({
    credit_id: "",
    lesson_id: "",
  });
}

async function handleBookingDelete(
  record: MakeupBooking
) {

  if (
    !confirm(
      "Delete this booking?"
    )
  ) {
    return;
  }

  const { error } = await supabase
    .from("makeup_bookings")
    .delete()
    .eq("id", record.id);

  if (error) {
    console.error(error);
    alert("Delete failed.");
    return;
  }

  await supabase
  .from("makeup_credits")
  .update({
    status: "Available",
  })
  .eq("id", record.credit_id);

  await loadBookings();
await loadCredits();
await loadBookingCredits();

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

const grouped = new Map<string, CreditOption>();

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

    grouped.get(item.student_id)!.credits++;

  }

});

setBookingCredits(
  Array.from(grouped.values())
);

}

async function loadBookingLessons() {
  const today =
    new Date().toLocaleDateString("en-CA");

  const { data, error } =
    await supabase
      .from("lessons")
      .select(`
        id,
        lesson_date,
        start_time,
        end_time,
        status,
        class_id,
        classes:class_id(
          id,
          level,
          class_suffix,
          campus:campus_id(
            campus_name,
            short_name
          )
        )
      `)
      .gte("lesson_date", today)
      .neq("status", "Cancelled")
      .order("lesson_date", {
        ascending: true,
      })
      .order("start_time", {
        ascending: true,
      });

  if (error) {
    console.error(error);
    return;
  }

  const rows: LessonOption[] =
    (data ?? []).map((lesson: any) => {
      const classData = lesson.classes;

      const level =
        classData?.level ?? "";

      const suffix =
        classData?.class_suffix ?? "";

      const className =
        `${level} ${suffix}`.trim();

      const campus =
        classData?.campus;

      const campusName =
        campus?.short_name ||
        campus?.campus_name ||
        "";

      return {
        id: lesson.id,
        lesson_date: lesson.lesson_date,
        start_time: lesson.start_time ?? "",
        end_time: lesson.end_time ?? "",
        class_id: lesson.class_id,
        class_name: className,
        level,
        campus_name: campusName,
      };
    });

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
          credits={bookingCredits}  // 临时占位
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
        />
      </div>

    </div>
  );
}