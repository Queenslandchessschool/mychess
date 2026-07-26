"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
  loadStudents();
}, []);

async function loadStudents() {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .order("created_at", { ascending: false });

  if (!error && data) {
    setStudents(data);
  }
}

  const [form, setForm] = useState({
    student_code: "",
    first_name: "",
    last_name: "",
    school: "",
    current_level: "",
  });

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
      school: form.school,
      current_level: form.current_level,
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
  school: "",
  current_level: "",
});

await loadStudents();
}

  return (
    <div className="p-8 max-w-6xl mx-auto">

      <h1 className="text-3xl font-bold mb-8">
        Student Management
      </h1>

      <div className="grid grid-cols-5 gap-3 mb-6">

        <input
          className="border rounded p-2"
          placeholder="Student Code"
          value={form.student_code}
          onChange={(e) =>
            setForm({ ...form, student_code: e.target.value })
          }
        />

        <input
          className="border rounded p-2"
          placeholder="First Name"
          value={form.first_name}
          onChange={(e) =>
            setForm({ ...form, first_name: e.target.value })
          }
        />

        <input
          className="border rounded p-2"
          placeholder="Last Name"
          value={form.last_name}
          onChange={(e) =>
            setForm({ ...form, last_name: e.target.value })
          }
        />

        <input
          className="border rounded p-2"
          placeholder="School"
          value={form.school}
          onChange={(e) =>
            setForm({ ...form, school: e.target.value })
          }
        />

        <input
          className="border rounded p-2"
          placeholder="Level"
          value={form.current_level}
          onChange={(e) =>
            setForm({ ...form, current_level: e.target.value })
          }
        />

      </div>

      <button
        onClick={addStudent}
        className="bg-blue-600 text-white px-6 py-2 rounded"
      >
        Add Student
      </button>

      <table className="w-full mt-8 border">

        <thead className="bg-slate-100">

          <tr>

            <th className="border p-2">Code</th>
            <th className="border p-2">First Name</th>
            <th className="border p-2">Last Name</th>
            <th className="border p-2">School</th>
            <th className="border p-2">Level</th>

          </tr>

        </thead>

        <tbody>

          {students.map((s, i) => (

            <tr key={i}>

              <td className="border p-2">{s.student_code}</td>
              <td className="border p-2">{s.first_name}</td>
              <td className="border p-2">{s.last_name}</td>
              <td className="border p-2">{s.school}</td>
              <td className="border p-2">{s.current_level}</td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}