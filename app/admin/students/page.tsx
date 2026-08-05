"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import StudentForm from "@/components/students/StudentForm";
import StudentTable from "@/components/students/StudentTable";

export default function StudentsPage() {
const [students, setStudents] = useState<any[]>([]);
const [searchTerm, setSearchTerm] = useState("");
const [statusFilter, setStatusFilter] = useState("All");
const [editingStudent, setEditingStudent] = useState<any | null>(null);

const [form, setForm] = useState({
  student_code: "",

  first_name: "",
  last_name: "",

  gender: "",
  date_of_birth: "",

  school: "",

  current_level: "",
  student_stage: "Regular",

  status: "Active",

  is_school_program: false,

  school_year: "",
  school_class: "",

  notes: "",
});

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
  console.log(data);
  setStudents(data);
}
  }

async function addStudent() {
  if (!form.first_name || !form.last_name) {
    alert("Please enter student name.");
    return;
  }

  const { error } = await supabase.from("students").insert([
    {
      student_code: form.student_code,

      first_name: form.first_name,
      last_name: form.last_name,

      gender: form.gender,
      date_of_birth: form.date_of_birth || null,

      school: form.school,

      current_level: form.current_level,

      student_stage: form.student_stage,

      status: form.status,

      is_school_program: form.is_school_program,

      school_year: form.school_year,
      school_class: form.school_class,

      notes: form.notes,
    },
  ]);

  if (error) {
    alert(error.message);
    return;
  }

  setForm({
    student_code: "",

    first_name: "",
    last_name: "",

    gender: "",
    date_of_birth: "",

    school: "",

    current_level: "",
    student_stage: "Regular",

    status: "Active",

    is_school_program: false,

    school_year: "",
    school_class: "",

    notes: "",
  });

  await loadStudents();
}
async function updateStudent() {
  console.log(editingStudent);
  if (!editingStudent) return;

  const { data, error } = await supabase
    .from("students")
    .update({
      student_code: form.student_code,

      first_name: form.first_name,
      last_name: form.last_name,

      gender: form.gender,
      date_of_birth: form.date_of_birth || null,

      school: form.school,

      current_level: form.current_level,

      student_stage: form.student_stage,
      status: form.status,

      is_school_program: form.is_school_program,

      school_year: form.school_year,
      school_class: form.school_class,

      notes: form.notes,
    })
    .eq("id", editingStudent.id);
console.log("Updated data:", data);
console.log("Update error:", JSON.stringify(error, null, 2));

  if (error) {
    alert(error.message);
    return;
  }

  setEditingStudent(null);

  setForm({
    student_code: "",

    first_name: "",
    last_name: "",

    gender: "",
    date_of_birth: "",

    school: "",

    current_level: "",
    student_stage: "Regular",

    status: "Active",

    is_school_program: false,

    school_year: "",
    school_class: "",

    notes: "",
  });

  await loadStudents();
}
async function toggleStudentStatus(student: any) {
  const newStatus =
    student.status === "Active" ? "Inactive" : "Active";

  const { error } = await supabase
    .from("students")
    .update({
      status: newStatus,
    })
    .eq("id", student.id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadStudents();
}
const filteredStudents = students.filter((student) => {
  const keyword = searchTerm.toLowerCase();

  const matchesSearch =
    student.student_code?.toLowerCase().includes(keyword) ||
    student.first_name?.toLowerCase().includes(keyword) ||
    student.last_name?.toLowerCase().includes(keyword);

  const matchesStatus =
    statusFilter === "All" ||
    student.status === statusFilter;

  return matchesSearch && matchesStatus;
});
return (
  <div className="max-w-7xl mx-auto p-8">

    <h1 className="text-3xl font-bold mb-8">
      Student Management
    </h1>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

      <div>

       <StudentForm
  form={form}
  setForm={setForm}
  onSave={editingStudent ? updateStudent : addStudent}
  editingStudent={editingStudent}
  onCancel={() => {
    setEditingStudent(null);

    setForm({
      student_code: "",

      first_name: "",
      last_name: "",

      gender: "",
      date_of_birth: "",

      school: "",

      current_level: "",
      student_stage: "Regular",

      status: "Active",

      is_school_program: false,

      school_year: "",
      school_class: "",

      notes: "",
    });
  }}
/>

      </div>

  <div className="lg:col-span-2">

<div className="flex gap-3 mb-4">

  <input
    type="text"
    placeholder="Search student..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="flex-1 border rounded-lg p-2"
  />

  <select
  value={statusFilter}
  onChange={(e) => setStatusFilter(e.target.value)}
  className="border rounded-lg p-2"
>
  <option value="All">All Status</option>
  <option value="Active">Active</option>
  <option value="Inactive">Inactive</option>
</select>

</div>

  <StudentTable
  students={filteredStudents}
  onEdit={(student) => {
    setEditingStudent(student);

    setForm({
      student_code: student.student_code ?? "",

      first_name: student.first_name ?? "",
      last_name: student.last_name ?? "",

      gender: student.gender ?? "",
      date_of_birth: student.date_of_birth ?? "",

      school: student.school ?? "",

      current_level: student.current_level ?? "",

      student_stage: student.student_stage ?? "Regular",

      status: student.status ?? "Active",

      is_school_program: student.is_school_program ?? false,

      school_year: student.school_year ?? "",
      school_class: student.school_class ?? "",

      notes: student.notes ?? "",
    });
  }}
  onToggleStatus={toggleStudentStatus}
/>

      </div>

    </div>

  </div>
);
} 