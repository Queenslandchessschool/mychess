"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import AcademicCalendarForm from "@/components/academicCalendar/AcademicCalendarForm";
import AcademicCalendarTable from "@/components/academicCalendar/AcademicCalendarTable";
import OperationalEventForm from "@/components/academicCalendar/OperationalEventForm";
import OperationalEventTable from "@/components/academicCalendar/OperationalEventTable";

import {
  AcademicCalendarRecord,
  AcademicCalendarFormData,
  OperationalEventRecord,
  OperationalEventFormData,
} from "@/components/academicCalendar/types";

const emptyForm: AcademicCalendarFormData = {
  academic_year: new Date().getFullYear(),

  term: 1,

  start_date: "",

  end_date: "",

  notes: "",
};

const emptyEventForm: OperationalEventFormData = {
  event_date: "",

  event_name: "",

  notes: "",
};

type ScheduleSummary = {
  id: string;

  className: string;

  campus: string;

  coach: string;

  firstLesson: string;

  secondLastLesson: string;

  finalLesson: string;

  lessonCount: number;

  currentWeek: number;

  remainingLessons: number;

  reenrolmentOpens: string;

  overrideStatus: string;
};

export default function AcademicCalendarPage() {
  const [calendars, setCalendars] = useState<
    AcademicCalendarRecord[]
  >([]);

  const [scheduleSummary, setScheduleSummary] =
    useState<ScheduleSummary[]>([]);

  const [editingCalendar, setEditingCalendar] =
    useState<AcademicCalendarRecord | null>(null);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [form, setForm] =
    useState<AcademicCalendarFormData>(emptyForm);
  
  const [events, setEvents] =
  useState<OperationalEventRecord[]>([]);

  const [editingEvent, setEditingEvent] =
  useState<OperationalEventRecord | null>(null);

  const [eventForm, setEventForm] =
  useState<OperationalEventFormData>(emptyEventForm);

  useEffect(() => {
  loadCalendars();
  loadEvents();
  loadScheduleSummary();
}, []);

  function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

  function calculateSecondLastLesson(
    finalLesson: string
  ) {
    if (!finalLesson) return "";

    const date = new Date(finalLesson);

    date.setDate(date.getDate() - 7);

    return formatDate(date);
  }
function calculateReenrolmentOpens(
  finalLesson: string
) {
  if (!finalLesson) return "";

  const date = new Date(finalLesson);

  date.setDate(date.getDate() + 1);

  date.setHours(8, 0, 0, 0);

  return formatDate(date) + " 08:00";
}
  function calculateLessonCount(
    firstLesson: string,
    finalLesson: string
  ) {
    if (!firstLesson || !finalLesson) return 0;

    const first = new Date(firstLesson);

    const last = new Date(finalLesson);

    const diff =
      (last.getTime() - first.getTime()) /
      (1000 * 60 * 60 * 24);

    return Math.floor(diff / 7) + 1;
  }

  function calculateCurrentWeek(
    firstLesson: string,
    finalLesson: string
  ) {
    if (!firstLesson || !finalLesson) return 0;

    const today = new Date();

    const first = new Date(firstLesson);

    const last = new Date(finalLesson);

    if (today < first) return 0;

    if (today > last) {
      return calculateLessonCount(
        firstLesson,
        finalLesson
      );
    }

    const diff =
      (today.getTime() - first.getTime()) /
      (1000 * 60 * 60 * 24);

    return Math.floor(diff / 7) + 1;
  }

  function calculateRemainingLessons(
    firstLesson: string,
    finalLesson: string
  ) {
    const total =
      calculateLessonCount(
        firstLesson,
        finalLesson
      );

    const current =
      calculateCurrentWeek(
        firstLesson,
        finalLesson
      );

    return Math.max(total - current, 0);
  }

  async function loadCalendars() {
    const { data, error } = await supabase
      .from("academic_calendar")
      .select("*")
      .order("academic_year", {
        ascending: false,
      })
      .order("term");

    if (error || !data) {
      console.error(error);
      return;
    }

    setCalendars(
      data as AcademicCalendarRecord[]
    );
  }

async function loadEvents() {
  const { data, error } = await supabase
    .from("academic_calendar_events")
    .select("*")
    .order("event_date");

  if (error || !data) {
    console.error(error);
    return;
  }

  setEvents(data as OperationalEventRecord[]);
}

  async function loadScheduleSummary() {
    const { data, error } = await supabase
      .from("class_schedule")
      .select(`
        id,
        first_lesson,
        final_lesson,
        class:classes(
          day,
          level,
          class_suffix,
          campus:campuses(
            campus_code
          ),
          coach:coaches(
            display_name
          )
        )
      `);
          if (error || !data) {
      console.error(error);
      return;
    }

    const rows: ScheduleSummary[] = data.map((item: any) => {
      const campus =
        item.class?.campus?.campus_code ?? "";

      const day =
        item.class?.day?.substring(0, 3) ?? "";

      const level =
        item.class?.level ?? "";

      const suffix =
        item.class?.class_suffix?.trim() ?? "";

      const className = suffix
        ? `${campus} | ${day} | ${level} | ${suffix}`
        : `${campus} | ${day} | ${level}`;

      return {
        id: item.id,

        className,

        campus,

        coach:
          item.class?.coach?.display_name ??
          "",

        firstLesson:
          item.first_lesson,

        finalLesson:
          item.final_lesson,

        secondLastLesson:
          calculateSecondLastLesson(
            item.final_lesson
          ),

        lessonCount:
          calculateLessonCount(
            item.first_lesson,
            item.final_lesson
          ),

        currentWeek:
          calculateCurrentWeek(
            item.first_lesson,
            item.final_lesson
          ),

        remainingLessons:
  calculateRemainingLessons(
    item.first_lesson,
    item.final_lesson
  ),

reenrolmentOpens:
  calculateReenrolmentOpens(
    item.final_lesson
  ),

overrideStatus: "Default",
      };
    });

    setScheduleSummary(rows);
  }

  async function addCalendar() {
    if (!form.start_date) {
  alert("Please select Start Date.");
  return;
}

if (!form.end_date) {
  alert("Please select End Date.");
  return;
}

    const duplicate = calendars.find(
      (item) =>
        item.academic_year ===
          form.academic_year &&
        item.term === form.term
    );

    if (duplicate) {
      alert(
        "This Academic Calendar already exists."
      );
      return;
    }

    const { error } = await supabase
      .from("academic_calendar")
      .insert([
  {
    academic_year: form.academic_year,

    term: form.term,

    start_date: form.start_date,

    end_date: form.end_date,

    notes: form.notes,
  },
]);

    if (error) {
      alert(error.message);
      return;
    }
    

setEditingEvent(null);

setEventForm(emptyEventForm);

await loadEvents();

    setForm(emptyForm);

    await loadCalendars();
  }

  async function updateCalendar() {
    if (!editingCalendar) return;

    const { error } = await supabase
      .from("academic_calendar")
      .update({
  academic_year: form.academic_year,

  term: form.term,

  start_date: form.start_date,

  end_date: form.end_date,

  notes: form.notes,
})
      .eq("id", editingCalendar.id);

    if (error) {
      alert(error.message);
      return;
    }

    setEditingCalendar(null);

    setForm(emptyForm);

    await loadCalendars();
  }

async function addEvent() {

  if (!eventForm.event_date) {
    alert("Please select Event Date.");
    return;
  }

  if (!eventForm.event_name.trim()) {
    alert("Please enter Event Name.");
    return;
  }

  const { error } = await supabase
    .from("academic_calendar_events")
    .insert([
  {
    event_date: eventForm.event_date,

    event_name: eventForm.event_name,

    notes: eventForm.notes,
  },
]);

  if (error) {
    alert(error.message);
    return;
  }

  setEventForm(emptyEventForm);

  await loadEvents();
}

async function updateEvent() {

  if (!editingEvent) return;

  const { error } = await supabase
    .from("academic_calendar_events")
    .update({
      event_date: eventForm.event_date,

      event_name: eventForm.event_name,

      notes: eventForm.notes,
    })
    .eq("id", editingEvent.id);

if (error) {
  alert(error.message);
  return;
}

setEditingEvent(null);

setEventForm(emptyEventForm);

await loadEvents();

}

async function deleteEvent(id: string) {

  if (!confirm("Delete this operational event?")) {
    return;
  }

  const { error } = await supabase
    .from("academic_calendar_events")
    .delete()
    .eq("id", id);
if (error) {
  alert(error.message);
  return;
}
await loadEvents();
}

  const filteredCalendars =
    calendars.filter((item) => {
      if (!searchTerm) return true;

      const keyword =
        searchTerm.toLowerCase();

      return (
        item.academic_year
          .toString()
          .includes(keyword) ||
        (`term ${item.term}`)
          .toLowerCase()
          .includes(keyword) ||
        (item.notes ?? "")
          .toLowerCase()
          .includes(keyword)
      );
    });
      return (
    <div className="max-w-7xl mx-auto p-8">

      <h1 className="text-3xl font-bold mb-8">
        State School Calendar
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

      <div className="space-y-8">

  <AcademicCalendarForm
    form={form}
    setForm={setForm}
    onSave={
      editingCalendar
        ? updateCalendar
        : addCalendar
    }
    editingCalendar={
      !!editingCalendar
    }
    onCancel={() => {
      setEditingCalendar(null);

      setForm(emptyForm);
    }}
  />

  <OperationalEventForm
    form={eventForm}
    setForm={setEventForm}
    onSave={
      editingEvent
        ? updateEvent
        : addEvent
    }
    editingEvent={
      !!editingEvent
    }
    onCancel={() => {
      setEditingEvent(null);

      setEventForm(emptyEventForm);
    }}
  />

</div>

        <div className="lg:col-span-2">

          <div className="flex gap-3 mb-4">

            <input
              type="text"
              placeholder="Search Academic Calendar..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(
                  e.target.value
                )
              }
              className="flex-1 border rounded-lg p-2"
            />

          </div>

          <div className="space-y-8">

  <AcademicCalendarTable
    calendars={filteredCalendars}
    onEdit={(calendar) => {

      setEditingCalendar(calendar);

      setForm({
        academic_year: calendar.academic_year,
        term: calendar.term,
        start_date: calendar.start_date,
        end_date: calendar.end_date,
        notes: calendar.notes ?? "",
      });

    }}
  />

  <OperationalEventTable
  events={events}
  onEdit={(event) => {

    setEditingEvent(event);

    setEventForm({
      event_date: event.event_date,
      event_name: event.event_name,
      notes: event.notes ?? "",
    });

  }}
  onDelete={deleteEvent}
/>

</div>

        </div>

        </div>

          <div className="mt-8 border rounded-lg bg-white shadow-sm">

            <div className="p-4 border-b">

              <h2 className="text-2xl font-bold">
                Class Schedule Summary
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Read-only information from Class Schedule.
              </p>

            </div>

            <div className="overflow-x-auto">

              <table className="w-full">

                <thead className="bg-gray-100">

                  <tr>

                    <th className="text-left p-3">
                      Class
                    </th>

                    <th className="text-left p-3">
                      Coach
                    </th>

                    <th className="text-left p-3">
                      First Lesson
                    </th>

                    <th className="text-left p-3">
                      Second Last Lesson
                    </th>

                    <th className="text-left p-3">
                      Final Lesson
                    </th>

                    <th className="text-center p-3">
  Planned Lessons
</th>

                    <th className="text-center p-3">
                      Week
                    </th>

                    <th className="text-center p-3">
                      Remaining
                    </th>
                    <th className="text-left p-3">
  Re-enrolment Opens
</th>

<th className="text-center p-3">
  Override
</th>

                  </tr>

                </thead>

                <tbody>

                  {scheduleSummary.length === 0 ? (

                    <tr>

                      <td
                        colSpan={10}
                        className="text-center text-gray-500 p-8"
                      >
                        No class schedule found.
                      </td>

                    </tr>

                  ) : (

                    scheduleSummary.map((row) => (                      <tr
                        key={row.id}
                        className="border-t hover:bg-gray-50"
                      >

                        <td className="p-3 whitespace-nowrap">
                          {row.className}
                        </td>

                        <td className="p-3">
                          {row.coach}
                        </td>

                        <td className="p-3">
                          {row.firstLesson}
                        </td>

                        <td className="p-3">
                          {row.secondLastLesson}
                        </td>

                        <td className="p-3">
                          {row.finalLesson}
                        </td>

                        <td className="p-3 text-center">
                          {row.lessonCount}
                        </td>

                        <td className="p-3 text-center">
                          {row.currentWeek}
                        </td>

                        <td className="p-3 text-center">
                          {row.remainingLessons}
                        </td>

                        <td className="p-3 whitespace-nowrap">
  {row.reenrolmentOpens}
</td>

<td className="p-3 text-center">
  {row.overrideStatus}
</td>

                      </tr>
                    ))

                  )}

                </tbody>

              </table>

            </div>

          </div>
      </div>

  );
}