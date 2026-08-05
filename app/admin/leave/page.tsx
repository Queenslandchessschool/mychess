"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

import LeaveForm from "@/components/leave/LeaveForm";
import LeaveTable from "@/components/leave/LeaveTable";

import type {
  LeaveFormData,
  LeaveRecord,
  StudentOption,
  LessonOption,
} from "@/components/leave/types";

export default function LeavePage() {
  const [records, setRecords] =
  useState<LeaveRecord[]>([]);

  const [students, setStudents] =
  useState<StudentOption[]>([]);

  const [lessons, setLessons] =
  useState<LessonOption[]>([]);

  const [selectedStudentId, setSelectedStudentId] =
  useState("");

  const [form, setForm] =
    useState<LeaveFormData>({
      student_id: "",
      lesson_id: "",
      reason: "Sick",
      comments: "",
    });

const [editingId, setEditingId] =
  useState<string | null>(null);

async function loadLeaveRecords() {
  const { data, error } = await supabase
    .from("leave_records")
    .select(`
  *,
  students:student_id (
    first_name,
    last_name
  ),
  lessons:lesson_id (
    lesson_date
  )
`)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(error);
    return;
  }

  const rows: LeaveRecord[] =
    (data ?? []).map((item: any) => ({
      id: item.id,

      student_id: item.student_id,
      lesson_id: item.lesson_id,

      student_name:
  item.students
    ? `${item.students.first_name} ${item.students.last_name}`
    : "",
      lesson_date:
  item.lessons?.lesson_date ?? "",

      reason: item.reason,
      comments: item.comments ?? "",

      created_at: item.created_at,
    }));

  setRecords(rows);
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

async function loadLessons() {

  const today = new Date().toLocaleDateString("en-CA");

  const { data, error } = await supabase
    .from("lessons")
    .select(`
      id,
      lesson_date,
      classes:class_id (
        level,
        class_suffix
      )
    `)
    .gte("lesson_date", today)
    .neq("status", "Cancelled")
    .order("lesson_date");

  if (error) {
    console.error(error);
    return;
  }

  const options: LessonOption[] =
    (data ?? []).map((lesson: any) => ({
      id: lesson.id,
      lesson_date: lesson.lesson_date,
      class_name:
        `${lesson.classes?.level ?? ""} ${lesson.classes?.class_suffix ?? ""}`.trim(),
    }));

  setLessons(options);
}

async function handleSave() {
  if (!form.student_id) {
    alert("Please select a student.");
    return;
  }

  if (!form.lesson_id) {
    alert("Please select a lesson.");
    return;
  }

  if (!form.reason) {
    alert("Please select a leave reason.");
    return;
  }

let error = null;

if (editingId) {
  const result = await supabase
    .from("leave_records")
    .update({
      student_id: form.student_id,
      lesson_id: form.lesson_id,
      reason: form.reason,
      comments: form.comments,
    })
    .eq("id", editingId);

  error = result.error;
} else {
  const result = await supabase
    .from("leave_records")
    .insert({
      student_id: form.student_id,
      lesson_id: form.lesson_id,
      reason: form.reason,
      comments: form.comments,
    });

  error = result.error;
}

  if (error) {
    console.error(error);
    alert("Failed to save leave record.");
    return;
  }


await loadLeaveRecords();

setEditingId(null);

setForm({
  student_id: "",
  lesson_id: "",
  reason: "Sick",
  comments: "",
});

alert("Leave record saved.");
}

  function handleCancel() {
    setForm({
      student_id: "",
      lesson_id: "",
      reason: "Sick",
      comments: "",
    });
  }

useEffect(() => {
  loadLeaveRecords();
  loadStudents();
  loadLessons();
}, []);

async function handleDelete(record: LeaveRecord) {
  const confirmed = window.confirm(
    "Are you sure you want to delete this leave record?"
  );

  if (!confirmed) {
    return;
  }

  const { error } = await supabase
    .from("leave_records")
    .delete()
    .eq("id", record.id);

  if (error) {
    console.error(error);
    alert("Failed to delete leave record.");
    return;
  }

  await loadLeaveRecords();

  alert("Leave record deleted.");
}
  return (
    <div className="space-y-6">

      <div>

        <h1 className="text-3xl font-bold">
          Leave Management
        </h1>

        <p className="mt-1 text-gray-500">
          Manage student leave records.
        </p>

      </div>

      <LeaveForm
        form={form}
        students={students}
        lessons={lessons}
        onChange={(newForm) => {
  setForm(newForm);

  if (newForm.student_id !== selectedStudentId) {
    setSelectedStudentId(newForm.student_id);
  }
}}
        onSave={handleSave}
        onCancel={handleCancel}
      />

    <LeaveTable
  records={records}
  onEdit={(record) => {
    setForm({
      student_id: record.student_id,
      lesson_id: record.lesson_id,
      reason: record.reason,
      comments: record.comments,
    });

    setEditingId(record.id);
  }}

  onDelete={handleDelete}
/>

    </div>
  );
}