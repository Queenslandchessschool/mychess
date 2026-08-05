"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import ClassForm from "@/components/classes/ClassForm";
import ClassTable from "@/components/classes/ClassTable";

import {
  ClassRecord,
  ClassFormData,
  ClassTableRow,
  CampusLookup,
  CoachLookup,
} from "@/components/classes/types";

const emptyForm: ClassFormData = {
  campus_id: "",
  coach_id: "",

  day: "Saturday",

  start_time: "",
  end_time: "",

  level: "Beginner",

  class_suffix: "",

  capacity: 12,

  status: "Active",

  notes: "",
};

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassRecord[]>([]);

  const [tableData, setTableData] = useState<
    ClassTableRow[]
  >([]);

  const [campuses, setCampuses] = useState<
    CampusLookup[]
  >([]);

  const [coaches, setCoaches] = useState<
    CoachLookup[]
  >([]);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [editingClass, setEditingClass] =
    useState<ClassRecord | null>(null);

  const [form, setForm] =
    useState<ClassFormData>(emptyForm);

  useEffect(() => {
    loadLookups();
    loadClasses();
  }, []);

  async function loadLookups() {
    const [
      campusResult,
      coachResult,
    ] = await Promise.all([
      supabase
        .from("campuses")
        .select(
          `
            id,
            campus_code,
            campus_name,
            short_name,
            address,
            type,
            status,
            notes
          `
        )
        .order("short_name"),

      supabase
        .from("coaches")
        .select(`
  id,
  first_name,
  last_name,
  display_name,
  title,
  mobile,
  email,
  status,
  notes
`)
        .eq("status", "Active")
        .order("display_name"),
    ]);
console.log("Campus Data:", campusResult.data);
console.log("Campus Error:", campusResult.error);

console.log("Coach Data:", coachResult.data);
console.log("Coach Error:", coachResult.error);
    if (
      !campusResult.error &&
      campusResult.data
    ) {
      setCampuses(
        campusResult.data as CampusLookup[]
      );
    }

    if (
      !coachResult.error &&
      coachResult.data
    ) {
      setCoaches(
        coachResult.data as CoachLookup[]
      );
    }
  }

  async function loadClasses() {
    const { data, error } = await supabase
      .from("classes")
      .select(
        `
          id,
          campus_id,
          coach_id,
          day,
          start_time,
          end_time,
          level,
          class_suffix,
          capacity,
          status,
          notes,
          created_at,
          campus:campuses(
          campus_code,
          short_name
          ),
          coach:coaches(
            display_name
          )
        `
      )
      .order("day")
      .order("start_time");

    if (error || !data) {
      console.error(error);
      return;
    }

  setClasses(data as ClassRecord[]);

    const rows: ClassTableRow[] =
      data.map((item: any) => {
       const campus =
  item.campus?.campus_code ?? "";

const day =
  item.day?.substring(0, 3) ?? "";

const level =
  item.level ?? "";

const suffix =
  item.class_suffix?.trim() ?? "";

const className = suffix
  ? `${campus} | ${day} | ${level} | ${suffix}`
  : `${campus} | ${day} | ${level}`;

        return {
          id: item.id,

          class_name: className,

          coach_name:
            item.coach?.display_name ?? "",

          student_count: 0,

          capacity: item.capacity,

          start_time: item.start_time,

          end_time: item.end_time,

          status: item.status,
        };
      });

    setTableData(rows);
  }

  async function addClass() {
    const validation = validateClassForm();

if (validation) {
  alert(validation);
  return;
}

    const { error } = await supabase
      .from("classes")
      .insert([
        {
          campus_id: form.campus_id,

          coach_id: form.coach_id,

          day: form.day,

          start_time: form.start_time,

          end_time: form.end_time,

          level: form.level,

          class_suffix: form.class_suffix,

          capacity: form.capacity,

          status: form.status,

          notes: form.notes,
        },
      ]);

    if (error) {
      alert(error.message);
      return;
    }
    setForm(emptyForm);

    await loadClasses();
  }

  async function updateClass() {
    if (!editingClass) return;
    const validation = validateClassForm();

if (validation) {
  alert(validation);
  return;
}

    const { error } = await supabase
      .from("classes")
      .update({
        campus_id: form.campus_id,

        coach_id: form.coach_id,

        day: form.day,

        start_time: form.start_time,

        end_time: form.end_time,

        level: form.level,

        class_suffix: form.class_suffix,

        capacity: form.capacity,

        status: form.status,

        notes: form.notes,
      })
      .eq("id", editingClass.id);

    if (error) {
      alert(error.message);
      return;
    }

    setEditingClass(null);

    setForm(emptyForm);

    await loadClasses();
  }
  function isTimeOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
) {
  return start1 < end2 && end1 > start2;
}
function validateClassForm(): string | null {
  // Required
  if (!form.campus_id) {
    return "Please select a campus.";
  }

  if (!form.coach_id) {
    return "Please select a coach.";
  }

  if (!form.start_time || !form.end_time) {
    return "Please select both Start Time and End Time.";
  }

  // Start Time < End Time
  if (form.start_time >= form.end_time) {
    return "End Time must be later than Start Time.";
  }

  // Duration
  const [sh, sm] = form.start_time.split(":").map(Number);
  const [eh, em] = form.end_time.split(":").map(Number);

  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  const duration = endMinutes - startMinutes;

  if (duration < 30) {
    return "Class duration must be at least 30 minutes.";
  }

  if (duration > 240) {
    return "Class duration cannot exceed 4 hours.";
  }

  // Capacity
  if (form.capacity <= 0) {
    return "Capacity must be greater than zero.";
  }
// Duplicate Class
const duplicate = classes.find((item) => {
  // 编辑时忽略自己
  if (editingClass && item.id === editingClass.id) {
    return false;
  }

  return (
    item.campus_id === form.campus_id &&
    item.day === form.day &&
    item.level === form.level &&
    (item.class_suffix ?? "").trim() ===
      (form.class_suffix ?? "").trim()
  );
});

if (duplicate) {
  return "This class already exists.";
}

  return null;
}
  async function deleteClass(id: string) {
    const confirmed = window.confirm(
      "Delete this class?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("classes")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadClasses();
  }

  const filteredClasses = tableData.filter(
    (item) => {
      const keyword =
        searchTerm.toLowerCase();

      const matchesSearch =
        item.class_name
          .toLowerCase()
          .includes(keyword) ||
        item.coach_name
          .toLowerCase()
          .includes(keyword);

      const matchesStatus =
        statusFilter === "All" ||
        item.status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    }
  );

  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">
        Class Management
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div>
          <ClassForm
            form={form}
            setForm={setForm}
            campuses={campuses}
            coaches={coaches}
            onSave={
              editingClass
                ? updateClass
                : addClass
            }
            editingClass={
              !!editingClass
            }
            onCancel={() => {
              setEditingClass(null);

              setForm(emptyForm);
            }}
          />
        </div>

        <div className="lg:col-span-2">
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              placeholder="Search class..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(
                  e.target.value
                )
              }
              className="flex-1 border rounded-lg p-2"
            />

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value
                )
              }
              className="border rounded-lg p-2"
            >
              <option value="All">
                All Status
              </option>

              <option value="Active">
                Active
              </option>

              <option value="Inactive">
                Inactive
              </option>
            </select>
          </div>
          <ClassTable
            classes={filteredClasses}
            onEdit={(item: ClassTableRow) => {
              const record = classes.find(
                (c) => c.id === item.id
              );

              if (!record) return;

              setEditingClass(record);

              setForm({
                campus_id:
                  record.campus_id,

                coach_id:
                  record.coach_id,

                day: record.day,

                start_time:
                  record.start_time,

                end_time:
                  record.end_time,

                level:
                  record.level,

                class_suffix:
                  record.class_suffix,

                capacity:
                  record.capacity,

                status:
                  record.status,

                notes:
                  record.notes ?? "",
              });
            }}
            onDelete={deleteClass}
          />
        </div>
      </div>
    </div>
  );
}