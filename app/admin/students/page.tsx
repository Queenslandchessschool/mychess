"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import StudentForm from "@/components/students/StudentForm";
import StudentTable from "@/components/students/StudentTable";

import ChessboardBackground from "@/components/layout/ChessboardBackground";

const emptyForm = {
  first_name: "",
  last_name: "",
  gender: "",
  date_of_birth: "",
  school: "",
  current_level: "",
  student_stage: "Regular",
  status: "Active",
  school_year: "",
  school_class: "",
  notes: "",
};

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editingStudent, setEditingStudent] = useState<any | null>(null);

  const [form, setForm] = useState(emptyForm);

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

  function resetForm() {
    setEditingStudent(null);
    setForm(emptyForm);
  }

  async function updateStudent() {
    if (!editingStudent) {
      return;
    }

    if (!form.first_name.trim()) {
      alert("Please enter the student's first name.");
      return;
    }

    if (!form.last_name.trim()) {
      alert("Please enter the student's last name.");
      return;
    }

    if (!form.current_level) {
      alert("Please select the student's current level.");
      return;
    }

    const { error } = await supabase
      .from("students")
      .update({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),

        gender: form.gender,
        date_of_birth: form.date_of_birth || null,

        school: form.school.trim(),

        current_level: form.current_level,

        student_stage: form.student_stage,

        school_year: form.school_year.trim(),
        school_class: form.school_class.trim(),

        notes: form.notes.trim(),
      })
      .eq("id", editingStudent.id);

    if (error) {
      alert(error.message);
      return;
    }

    resetForm();
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
    const keyword = searchTerm.toLowerCase().trim();

    const matchesSearch =
      !keyword ||
      student.student_code
        ?.toLowerCase()
        .includes(keyword) ||
      student.first_name
        ?.toLowerCase()
        .includes(keyword) ||
      student.last_name
        ?.toLowerCase()
        .includes(keyword) ||
      student.school
        ?.toLowerCase()
        .includes(keyword);

    const matchesStatus =
      statusFilter === "All" ||
      student.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <ChessboardBackground>
      <main className="min-h-screen">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">

          {/* Page Header */}
          <div className="mb-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#D4AF37]">
              STUDENTS
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#F4F7FB] sm:text-3xl">
              Student Management
            </h1>

            <p className="mt-1 text-sm text-[#C8D2DF]/75">
              Review and update student information.
            </p>
          </div>

          {/* Search & Filter */}
          <div className="mb-6 rounded-[18px] border border-[#D4AF37]/30 bg-[#102B4D] p-4">
            <div className="flex flex-col gap-3 sm:flex-row">

              <input
                type="text"
                placeholder="Search by name, code or school..."
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
                className="
                  min-w-0
                  flex-1
                  rounded-lg
                  border
                  border-white/70
                  bg-white
                  px-3
                  py-2.5
                  text-sm
                  text-[#10213A]
                  placeholder:text-[#64748B]
                  outline-none
                  transition-colors
                  duration-200
                  hover:border-[#D4AF37]
                  focus:border-[#D4AF37]
                  focus:ring-1
                  focus:ring-[#D4AF37]/30
                "
              />

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
                className="
                  w-full
                  rounded-lg
                  border
                  border-white/70
                  bg-white
                  px-3
                  py-2.5
                  text-sm
                  text-[#10213A]
                  outline-none
                  transition-colors
                  duration-200
                  hover:border-[#D4AF37]
                  focus:border-[#D4AF37]
                  focus:ring-1
                  focus:ring-[#D4AF37]/30
                  sm:w-40
                "
              >
                <option
                  value="All"
                  className="bg-[#102B4D] text-[#F4F7FB]"
                >
                  All Status
                </option>

                <option
                  value="Active"
                  className="bg-[#102B4D] text-[#F4F7FB]"
                >
                  Active
                </option>

                <option
                  value="Inactive"
                  className="bg-[#102B4D] text-[#F4F7FB]"
                >
                  Inactive
                </option>
              </select>

            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">

            {/* Student Form */}
            <div>
              <StudentForm
                form={form}
                setForm={setForm}
                onSave={updateStudent}
                editingStudent={editingStudent}
                onCancel={resetForm}
              />
            </div>

            {/* Student Table */}
            <div className="min-w-0 lg:col-span-2">
              <StudentTable
                students={filteredStudents}
                onEdit={(student) => {
                  setEditingStudent(student);

                  setForm({
                    first_name: student.first_name ?? "",
                    last_name: student.last_name ?? "",

                    gender: student.gender ?? "",
                    date_of_birth:
                      student.date_of_birth ?? "",

                    school: student.school ?? "",

                    current_level:
                      student.current_level ?? "",

                    student_stage:
                      student.student_stage ?? "Regular",

                    status:
                      student.status ?? "Active",

                    school_year:
                      student.school_year ?? "",

                    school_class:
                      student.school_class ?? "",

                    notes:
                      student.notes ?? "",
                  });
                }}
                onToggleStatus={toggleStudentStatus}
              />
            </div>

          </div>

        </div>
      </main>
    </ChessboardBackground>
  );
}