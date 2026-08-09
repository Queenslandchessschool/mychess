"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import ParentForm from "@/components/parents/ParentForm";
import ParentTable from "@/components/parents/ParentTable";

import ChessboardBackground from "@/components/layout/ChessboardBackground";

const emptyForm = {
  parent1_name: "",
  parent2_name: "",
  email: "",
  mobile: "",
  preferred_contact: "",
  relationship: "",
  address: "",
  family_id: "",
};

export default function ParentsPage() {
  const [parents, setParents] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingParent, setEditingParent] =
    useState<any | null>(null);

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [parentsResult, studentsResult] =
      await Promise.all([
        supabase
          .from("parents")
          .select("*")
          .not("family_id", "is", null)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("students")
          .select(
            "id, student_code, first_name, last_name, current_level, status"
          )
          .order("created_at", {
            ascending: false,
          }),
      ]);

    if (parentsResult.error) {
      alert(parentsResult.error.message);
      return;
    }

    if (studentsResult.error) {
      alert(studentsResult.error.message);
      return;
    }

    setParents(parentsResult.data ?? []);
    setStudents(studentsResult.data ?? []);
  }

  function resetForm() {
    setEditingParent(null);
    setForm(emptyForm);
  }

  async function updateParent() {
    if (!editingParent) return;

    const familyId = editingParent.family_id;

    if (!familyId) {
      alert("Family ID is missing.");
      return;
    }

    const { error } = await supabase
      .from("parents")
      .update({
        parent1_name:
          form.parent1_name.trim(),

        parent2_name:
          form.parent2_name.trim(),

        email:
          form.email.trim(),

        mobile:
          form.mobile.trim(),

        preferred_contact:
          form.preferred_contact || null,

        relationship:
          form.relationship.trim() || null,

        address:
          form.address.trim() || null,
      })
      .eq("family_id", familyId);

    if (error) {
      alert(error.message);
      return;
    }

    resetForm();
    await loadData();
  }

  /*
   * Build one Family record from multiple
   * parent records.
   *
   * One Family = one family_id
   */
  const familyMap = new Map<
    string,
    any
  >();

  parents.forEach((parent) => {
    const familyId = parent.family_id;

    if (!familyId) return;

    if (!familyMap.has(familyId)) {
      familyMap.set(familyId, {
        ...parent,
        students: [],
      });
    }
  });

  /*
   * Attach students to their Family through
   * parents.student_id -> students.id
   */
  parents.forEach((parent) => {
    const familyId = parent.family_id;

    if (!familyId) return;

    const family = familyMap.get(familyId);

    if (!family) return;

    const student = students.find(
      (item) =>
        item.id === parent.student_id
    );

    if (!student) return;

    const alreadyExists =
      family.students.some(
        (item: any) =>
          item.id === student.id
      );

    if (!alreadyExists) {
      family.students.push(student);
    }
  });

  const families = Array.from(
    familyMap.values()
  );

  /*
   * Search Family information
   */
  const filteredFamilies = families.filter(
    (family) => {
      const keyword =
        searchTerm
          .toLowerCase()
          .trim();

      if (!keyword) return true;

      const matchesFamily =
        family.family_id
          ?.toLowerCase()
          .includes(keyword);

      const matchesParent1 =
        family.parent1_name
          ?.toLowerCase()
          .includes(keyword);

      const matchesParent2 =
        family.parent2_name
          ?.toLowerCase()
          .includes(keyword);

      const matchesEmail =
        family.email
          ?.toLowerCase()
          .includes(keyword);

      const matchesMobile =
        family.mobile
          ?.toLowerCase()
          .includes(keyword);

      const matchesStudent =
        family.students.some(
          (student: any) =>
            student.first_name
              ?.toLowerCase()
              .includes(keyword) ||
            student.last_name
              ?.toLowerCase()
              .includes(keyword) ||
            student.student_code
              ?.toLowerCase()
              .includes(keyword)
        );

      return (
        matchesFamily ||
        matchesParent1 ||
        matchesParent2 ||
        matchesEmail ||
        matchesMobile ||
        matchesStudent
      );
    }
  );

  /*
   * Overall statistics
   */
  const familyCount =
    families.length;

  const studentCount =
    students.filter((student) =>
      parents.some(
        (parent) =>
          parent.student_id ===
          student.id
      )
    ).length;

  function handleEdit(family: any) {
    setEditingParent(family);

    setForm({
      parent1_name:
        family.parent1_name ?? "",

      parent2_name:
        family.parent2_name ?? "",

      email:
        family.email ?? "",

      mobile:
        family.mobile ?? "",

      preferred_contact:
        family.preferred_contact ?? "",

      relationship:
        family.relationship ?? "",

      address:
        family.address ?? "",

      family_id:
        family.family_id ?? "",
    });
  }

  return (
    <ChessboardBackground>
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px]">

          {/* Page Header */}
          <div className="mb-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#D4AF37]">
              FAMILIES
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#F4F7FB] sm:text-3xl">
              Family Management
            </h1>

            <p className="mt-1 text-sm text-[#C8D2DF]/75">
              Review and update family contact information.
            </p>
          </div>

          {/* Search */}
          <div className="mb-6 rounded-[18px] border border-[#D4AF37]/30 bg-[#102B4D] p-4">
            <input
              type="text"
              placeholder="Search by family, parent, student, email or mobile..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              className="
                w-full
                min-w-0
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
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">

            {/* Information Panel */}
            <div>
              <ParentForm
                form={form}
                setForm={setForm}
                onSave={updateParent}
                editingParent={editingParent}
                onCancel={resetForm}
              />
            </div>

            {/* Family Table */}
            <div className="min-w-0 lg:col-span-2">
              <ParentTable
                families={filteredFamilies}
                familyCount={familyCount}
                studentCount={studentCount}
                onEdit={handleEdit}
              />
            </div>

          </div>

        </div>
      </main>
    </ChessboardBackground>
  );
}