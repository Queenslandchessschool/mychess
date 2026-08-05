"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import ClassScheduleForm from "@/components/classSchedule/ClassScheduleForm";
import ClassScheduleTable from "@/components/classSchedule/ClassScheduleTable";

import {
  ClassOption,
  ClassScheduleRecord,
  ClassScheduleTableRow,
  ClassScheduleFormData,
} from "@/components/classSchedule/types";

const emptyForm: ClassScheduleFormData = {
  class_id: "",

  academic_year: new Date().getFullYear(),

  term: 1,

  first_lesson: "",

  final_lesson: "",

  status: "Planned",

  notes: "",
};

export default function ClassSchedulePage() {
  const [schedules, setSchedules] = useState<
    ClassScheduleRecord[]
  >([]);

  const [tableData, setTableData] = useState<
    ClassScheduleTableRow[]
  >([]);

  const [classes, setClasses] = useState<
    ClassOption[]
  >([]);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [editingSchedule, setEditingSchedule] =
    useState<ClassScheduleRecord | null>(null);

  const [form, setForm] =
    useState<ClassScheduleFormData>(emptyForm);

  useEffect(() => {
    loadLookups();
    loadSchedules();
  }, []);

  async function loadLookups() {
    const { data, error } = await supabase
      .from("classes")
      .select(`
        id,
        day,
        level,
        class_suffix,
        campus:campuses(
          campus_code
        )
      `)
      .eq("status", "Active")
      .order("day")
      .order("level");

    if (error || !data) {
      console.error(error);
      return;
    }

    const lookup: ClassOption[] =
      data.map((item: any) => {
        const campus =
          item.campus?.campus_code ?? "";

        const day =
          item.day?.substring(0, 3) ?? "";

        const level =
          item.level ?? "";

        const suffix =
          item.class_suffix?.trim() ?? "";

        return {
  id: item.id,

  day: item.day,

  display_name: suffix
    ? `${campus} | ${day} | ${level} | ${suffix}`
    : `${campus} | ${day} | ${level}`,
};
      });

    setClasses(lookup);
  }

  async function loadSchedules() {
    const { data, error } = await supabase
      .from("class_schedule")
      .select(`
    id,
    class_id,
    academic_year,
    term,
    first_lesson,
    final_lesson,
    status,
    notes,
        created_at,
        updated_at,
        class:classes(
          id,
          day,
          level,
          class_suffix,
          campus:campuses(
            campus_code
          )
        )
      `)
      .order("academic_year", {
        ascending: false,
      })
      .order("term")
      .order("first_lesson");

    if (error || !data) {
      console.error(error);
      return;
    }

    setSchedules(data as ClassScheduleRecord[]);

    const rows: ClassScheduleTableRow[] =
      data.map((item: any) => {
        const campus =
          item.class?.campus?.campus_code ??
          "";

        const day =
          item.class?.day?.substring(0, 3) ??
          "";

        const level =
          item.class?.level ?? "";

        const suffix =
          item.class?.class_suffix?.trim() ??
          "";

        const displayName = suffix
          ? `${campus} | ${day} | ${level} | ${suffix}`
          : `${campus} | ${day} | ${level}`;

        return {
          id: item.id,

          class_id: item.class_id,

          academic_year:
            item.academic_year,

          term: item.term,

          first_lesson:
            item.first_lesson,

          final_lesson:
            item.final_lesson,

          status: item.status,

notes: item.notes ?? "",

created_at: item.created_at,

          updated_at:
            item.updated_at,

          display_name:
            displayName,
        };
      });

    setTableData(rows);
  }

  async function addSchedule() {
    const validation = await validateScheduleForm();

if (validation) {
  alert(validation);
  return;
}

    const { error } = await supabase
      .from("class_schedule")
      .insert([
        {
          class_id: form.class_id,

          academic_year:
            form.academic_year,

          term: form.term,

          first_lesson:
            form.first_lesson,

          final_lesson:
            form.final_lesson,

          status: form.status,

notes: form.notes,
        },
      ]);

    if (error) {
      alert(error.message);
      return;
    }

    setForm(emptyForm);

    await loadSchedules();
  }
  async function updateSchedule() {
    if (!editingSchedule) return;
const validation = await validateScheduleForm();

if (validation) {
  alert(validation);
  return;
}
    const { error } = await supabase
      .from("class_schedule")
      .update({
        class_id: form.class_id,

        academic_year: form.academic_year,

        term: form.term,

        first_lesson: form.first_lesson,

        final_lesson: form.final_lesson,

        status: form.status,
        notes: form.notes,
      })
      .eq("id", editingSchedule.id);

    if (error) {
      alert(error.message);
      return;
    }

    setEditingSchedule(null);

    setForm(emptyForm);

    await loadSchedules();
  }
async function validateScheduleForm(): Promise<string | null> {
  // Required
  if (!form.class_id) {
    return "Please select a class.";
  }

  if (!form.first_lesson || !form.final_lesson) {
    return "Please select both First Lesson and Final Lesson.";
  }

  // Final >= First
// Find selected class
const selectedClass = classes.find(
  (c) => c.id === form.class_id
);

if (!selectedClass) {
  return "Please select a valid class.";
}

// Convert JS weekday
const weekDays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const firstDay =
  weekDays[new Date(form.first_lesson).getDay()];

if (firstDay !== selectedClass.day) {
  return "First Lesson must match the class teaching day.";
}
// Final Lesson weekday
const finalDay =
  weekDays[new Date(form.final_lesson).getDay()];

if (finalDay !== selectedClass.day) {
  return "Final Lesson must match the class teaching day.";
}
// Weekly Cycle
const firstDate = new Date(form.first_lesson);
const finalDate = new Date(form.final_lesson);

const diffDays =
  (finalDate.getTime() - firstDate.getTime()) /
  (1000 * 60 * 60 * 24);

if (diffDays % 7 !== 0) {
  return "The teaching schedule must follow a weekly cycle.";
}
// Academic Year
const firstYear =
  new Date(form.first_lesson).getFullYear();

if (firstYear !== form.academic_year) {
  return "First Lesson must belong to the selected Academic Year.";
}
  if (form.final_lesson < form.first_lesson) {
    return "Final Lesson must be on or after the First Lesson.";
  }
// State School Calendar
const { data: calendar, error: calendarError } =
  await supabase
    .from("academic_calendar")
    .select("start_date, end_date")
    .eq("academic_year", form.academic_year)
    .eq("term", form.term)
    .single();

if (calendarError || !calendar) {
  return "State School Calendar is not configured for the selected Academic Year and Term.";
}
if (form.first_lesson < calendar.start_date) {
  return "First Lesson must fall within the configured State School Calendar.";
}
if (form.final_lesson > calendar.end_date) {
  return "Final Lesson must fall within the configured State School Calendar.";
}
  // Duplicate Schedule
const duplicate = schedules.find((item) => {
  if (
    editingSchedule &&
    item.id === editingSchedule.id
  ) {
    return false;
  }

  return (
    item.class_id === form.class_id &&
    item.academic_year === form.academic_year &&
    item.term === form.term
  );
});

if (duplicate) {
  return "A schedule already exists for this class in the selected Academic Year and Term.";
}
  return null;
}
  async function deleteSchedule(id: string) {
    const confirmed = window.confirm(
      "Delete this schedule?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("class_schedule")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadSchedules();
  }

  const filteredSchedules = tableData.filter(
    (item) => {
      const keyword =
        searchTerm.toLowerCase();

      const matchesSearch =
        item.display_name
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
        Class Schedule
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div>
          <ClassScheduleForm
            form={form}
            setForm={setForm}
            classes={classes}
            onSave={
              editingSchedule
                ? updateSchedule
                : addSchedule
            }
            editingSchedule={
              !!editingSchedule
            }
            onCancel={() => {
              setEditingSchedule(null);

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

             <option value="Planned">
                Planned
             </option>

              <option value="Active">
                Active
              </option>

              <option value="Completed">
                Completed
              </option>

              <option value="Cancelled">
                Cancelled
              </option>
            </select>
          </div>

          <ClassScheduleTable
            schedules={filteredSchedules}
            onEdit={(item: ClassScheduleTableRow) => {
              const record = schedules.find(
                (s) => s.id === item.id
              );

              if (!record) return;

              setEditingSchedule(record);

              setForm({

    class_id: record.class_id,

    academic_year: record.academic_year,

    term: record.term,

    first_lesson: record.first_lesson,

    final_lesson: record.final_lesson,

    status: record.status,

    notes: record.notes ?? "",
});
            }}
            onDelete={deleteSchedule}
          />
        </div>
      </div>
    </div>
  );
}