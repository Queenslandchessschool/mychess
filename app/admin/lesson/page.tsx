"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import LessonGenerator from "@/components/lesson/LessonGenerator";

import {
  LessonGenerationScope,
  LessonClassOption,
} from "@/components/lesson/types";

export default function LessonPage() {

  // ======================================================
  // Lesson Generator State
  // ======================================================

  const [scope, setScope] =
    useState<LessonGenerationScope>("Term");

  const [academicYear, setAcademicYear] =
    useState<number>(new Date().getFullYear());

  const [term, setTerm] =
    useState<number | null>(null);

  const [classId, setClassId] =
    useState<string | null>(null);

  const [classes, setClasses] =
    useState<LessonClassOption[]>([]);

  const [generating, setGenerating] =
    useState(false);

  const [lessons, setLessons] = useState<any[]>([]);
const [loadingLessons, setLoadingLessons] = useState(false);
const [filterYear, setFilterYear] = useState<number | null>(null);
const [filterTerm, setFilterTerm] = useState<number | null>(null);
const [filterClassId, setFilterClassId] = useState<string>("");
const [filterStatus, setFilterStatus] = useState<string>("");

const [selectedLesson, setSelectedLesson] = useState<any | null>(null);

const [cancellationReason, setCancellationReason] = useState("");
  // ======================================================
  // Initial Load
  // ======================================================

  useEffect(() => {
  loadClasses();
  loadLessons();
}, []);


  // ======================================================
  // Load Classes
  // ======================================================

  async function loadClasses() {

    const { data, error } = await supabase
      .from("classes")
      .select(`
        id,
        class_suffix,
        day,
        start_time,
        end_time,
        level
      `)
      .order("day")
      .order("start_time");

    if (error) {
      alert(error.message);
      return;
    }

    setClasses(
      (data ?? []) as LessonClassOption[]
    );
  }

  async function loadLessons() {

  setLoadingLessons(true);

  try {

    const { data, error } = await supabase
      .from("lessons")
      .select("*");

    if (error) {
      alert(error.message);
      return;
    }

    setLessons(data ?? []);

  } finally {

    setLoadingLessons(false);

  }
}
async function cancelLesson() {

  if (!selectedLesson) {
    return;
  }

  if (selectedLesson.operational_event_id) {
  alert(
    "This lesson is controlled by a School Operational Event and cannot be manually cancelled."
  );
  return;
}

if (selectedLesson.status === "Completed") {
  alert("Completed lessons cannot be cancelled.");
  return;
}

const lessonDate = new Date(
  `${selectedLesson.lesson_date}T00:00:00`
);

const today = new Date();
today.setHours(0, 0, 0, 0);

if (lessonDate < today) {
  alert("Past lessons cannot be cancelled.");
  return;
}
if (
  selectedLesson.status === "Cancelled" &&
  selectedLesson.cancellation_reason
) {
  alert("This lesson has already been manually cancelled.");
  return;
}

  if (!cancellationReason) {
    alert("Please select a cancellation reason.");
    return;
  }

  const { error } = await supabase
    .from("lessons")
    .update({
      status: "Cancelled",
      chargeable: false,
      cancellation_reason: cancellationReason,
      operational_event_id: null,
    })
    .eq("id", selectedLesson.id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadLessons();

  alert("Lesson cancelled successfully.");
}

  // ======================================================
  // Generate Lessons
  // ======================================================

async function generateLessons() {

  // ======================================================
  // Validation
  // ======================================================

  if (!academicYear) {
    alert("Please select an Academic Year.");
    return;
  }

  if (scope !== "Academic Year" && !term) {
    alert("Please select a Term.");
    return;
  }

  if (scope === "Class" && !classId) {
    alert("Please select a Class.");
    return;
  }


  setGenerating(true);

  try {

    // ======================================================
    // 1. Build Class Schedule Query
    // ======================================================

    let query = supabase
      .from("class_schedule")
      .select(`
        id,
        class_id,
        academic_year,
        term,
        first_lesson,
        final_lesson,
        status,
        notes
      `)
      .eq("academic_year", academicYear);


    if (scope !== "Academic Year" && term) {
      query = query.eq("term", term);
    }


    if (scope === "Class" && classId) {
      query = query.eq("class_id", classId);
    }


    // ======================================================
    // 2. Load Class Schedules
    // ======================================================

    const {
      data: schedules,
      error: schedulesError,
    } = await query
      .order("term")
      .order("first_lesson");


    if (schedulesError) {
      alert(schedulesError.message);
      return;
    }


    if (!schedules || schedules.length === 0) {
      alert(
        "No Class Schedule found for the selected scope."
      );
      return;
    }

    // ======================================================
    // 3. Determine Generation Date Range
    // ======================================================

    const firstDates = schedules.map(
      (schedule) => schedule.first_lesson
    );

    const finalDates = schedules.map(
      (schedule) => schedule.final_lesson
    );


    const generationStart =
      [...firstDates].sort()[0];

    const generationEnd =
      [...finalDates].sort().reverse()[0];


    // ======================================================
    // 4. Load Active School Operational Events
    // ======================================================

    const {
      data: operationalEvents,
      error: operationalEventsError,
    } = await supabase
      .from("academic_calendar_events")
      .select(`
        id,
        event_date,
        event_name,
        notes,
        active
      `)
      .eq("active", true)
      .gte("event_date", generationStart)
      .lte("event_date", generationEnd)
      .order("event_date");


    if (operationalEventsError) {
      alert(operationalEventsError.message);
      return;
    }

    // ======================================================
    // 5. Weekday Map
    // ======================================================

    const dayMap: Record<string, number> = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };


    // ======================================================
    // 6. Build Candidate Lessons
    // ======================================================

    const candidateLessons: {
      class_id: string;
      class_schedule_id: string;

      academic_year: number;
      term: number;

      lesson_date: string;

      status: "Planned" | "Cancelled";
      chargeable: boolean;

      operational_event_id: string | null;
      cancellation_reason: null;

      notes: string | null;
    }[] = [];


    for (const schedule of schedules) {

      // ----------------------------------------------------
      // Find Class
      // ----------------------------------------------------

      const classItem = classes.find(
        (item) =>
          item.id === schedule.class_id
      );


      if (!classItem?.day) {

        console.log(
          "Cannot generate schedule - class day missing:",
          schedule.id
        );

        continue;
      }


      const targetDay =
        dayMap[classItem.day];


      if (targetDay === undefined) {

        console.log(
          "Invalid class day:",
          classItem.day
        );

        continue;
      }


      // ----------------------------------------------------
      // Schedule Date Range
      // ----------------------------------------------------

      const startDate = new Date(
        `${schedule.first_lesson}T00:00:00`
      );

      const endDate = new Date(
        `${schedule.final_lesson}T00:00:00`
      );

      const currentDate =
        new Date(startDate);


      // ----------------------------------------------------
      // Find First Matching Weekday
      // ----------------------------------------------------

      while (
        currentDate.getDay() !== targetDay
      ) {

        currentDate.setDate(
          currentDate.getDate() + 1
        );
      }


      // ----------------------------------------------------
      // Generate Weekly Lessons
      // ----------------------------------------------------

      while (currentDate <= endDate) {

        const year =
          currentDate.getFullYear();

        const month = String(
          currentDate.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
          currentDate.getDate()
        ).padStart(2, "0");


        const lessonDate =
          `${year}-${month}-${day}`;


        // --------------------------------------------------
        // Match School Operational Event
        // --------------------------------------------------

        const operationalEvent =
          operationalEvents?.find(
            (event) =>
              event.event_date === lessonDate
          ) ?? null;


        // --------------------------------------------------
        // Build Candidate Lesson
        // --------------------------------------------------

        candidateLessons.push({

          class_id:
            schedule.class_id,

          class_schedule_id:
            schedule.id,

          academic_year:
            schedule.academic_year,

          term:
            schedule.term,

          lesson_date:
            lessonDate,


          // Operational Event
          // automatically cancels the Lesson

          status:
            operationalEvent
              ? "Cancelled"
              : "Planned",

          chargeable:
            operationalEvent
              ? false
              : true,

          operational_event_id:
            operationalEvent
              ? operationalEvent.id
              : null,

          cancellation_reason:
            null,

          notes:
            operationalEvent
              ? operationalEvent.event_name
              : null,
        });


        // Next week

        currentDate.setDate(
          currentDate.getDate() + 7
        );
      }
    }

// ======================================================
// 7. Load Existing Lessons
// ======================================================

const scheduleIds = schedules.map(
  (schedule) => schedule.id
);

const {
  data: existingLessons,
  error: existingLessonsError,
} = await supabase
  .from("lessons")
  .select(`
    id,
    class_id,
    class_schedule_id,
    academic_year,
    term,
    lesson_date,
    status,
    chargeable,
    operational_event_id,
    cancellation_reason,
    notes,
    generated_at,
    created_at,
    updated_at
  `)
  .in("class_schedule_id", scheduleIds);


if (existingLessonsError) {
  alert(existingLessonsError.message);
  return;
}


// ======================================================
// 8. Reconciliation Dry Run
// ======================================================

let created = 0;
let updated = 0;
let unchanged = 0;
let protectedCount = 0;

const lessonsToCreate: typeof candidateLessons = [];

const lessonsToUpdate: {
  id: string;
  candidate: (typeof candidateLessons)[number];
}[] = [];

const today = new Date();

today.setHours(0, 0, 0, 0);


for (const candidate of candidateLessons) {

  // ----------------------------------------------------
  // Find Existing Lesson
  // ----------------------------------------------------

  const existing = existingLessons?.find(
    (lesson) =>
      lesson.class_schedule_id ===
        candidate.class_schedule_id &&
      lesson.lesson_date ===
        candidate.lesson_date
  );


  // ----------------------------------------------------
  // CREATE
  // ----------------------------------------------------

  if (!existing) {

  created++;

  lessonsToCreate.push(candidate);

  continue;
}


  // ----------------------------------------------------
  // PROTECTED
  // ----------------------------------------------------

  const lessonDate = new Date(
    `${existing.lesson_date}T00:00:00`
  );


  const isCompleted =
    existing.status === "Completed";


  const isPast =
    lessonDate < today;


  const isManualCancellation =
    existing.status === "Cancelled" &&
    existing.cancellation_reason !== null;


  if (
    isCompleted ||
    isPast ||
    isManualCancellation
  ) {

    protectedCount++;

    continue;
  }


  // ----------------------------------------------------
  // Compare Generator-Controlled Fields
  // ----------------------------------------------------

  const sameStatus =
    existing.status === candidate.status;


  const sameChargeable =
    existing.chargeable ===
      candidate.chargeable;


  const sameOperationalEvent =
    existing.operational_event_id ===
      candidate.operational_event_id;


  // ----------------------------------------------------
  // UNCHANGED / UPDATE
  // ----------------------------------------------------

  if (
  sameStatus &&
  sameChargeable &&
  sameOperationalEvent
) {

  unchanged++;

} else {

  updated++;

  lessonsToUpdate.push({
    id: existing.id,
    candidate,
  });

}
}


// ======================================================
// 9. Reconciliation Result
// ======================================================

const reconciliationResult = {
  created,
  updated,
  unchanged,
  protected: protectedCount,
};


// ======================================================
// 10. Apply Reconciliation
// ======================================================

// ------------------------------------------------------
// CREATE
// ------------------------------------------------------

if (lessonsToCreate.length > 0) {

  const { error: createError } = await supabase
    .from("lessons")
    .insert(lessonsToCreate);


  if (createError) {
    alert(
      `Failed to create Lessons: ${createError.message}`
    );
    return;
  }
}


// ------------------------------------------------------
// UPDATE
// ------------------------------------------------------

for (const item of lessonsToUpdate) {

  const { error: updateError } = await supabase
    .from("lessons")
    .update({
      status:
        item.candidate.status,

      chargeable:
        item.candidate.chargeable,

      operational_event_id:
        item.candidate.operational_event_id,

      cancellation_reason:
        item.candidate.cancellation_reason,

      notes:
        item.candidate.notes,
    })
    .eq("id", item.id);


  if (updateError) {
    alert(
      `Failed to update Lesson: ${updateError.message}`
    );
    return;
  }
}

    // ======================================================
    // 7. Test Results
    // ======================================================


    // ======================================================
    // 8. Summary
    // ======================================================

    const plannedCount =
      candidateLessons.filter(
        (lesson) =>
          lesson.status === "Planned"
      ).length;


    const cancelledCount =
      candidateLessons.filter(
        (lesson) =>
          lesson.status === "Cancelled"
      ).length;


    alert(
  [
    "Lesson Reconciliation completed.",
    "",
    `Candidate Lessons: ${candidateLessons.length}`,
    "",
    `Created: ${created}`,
    `Updated: ${updated}`,
    `Unchanged: ${unchanged}`,
    `Protected: ${protectedCount}`,
    "",
    "Database changes have been saved."
  ].join("\n")
);

  } finally {

    setGenerating(false);

  }
}

const filteredLessons = lessons.filter((lesson) => {

  if (
    filterYear !== null &&
    lesson.academic_year !== filterYear
  ) {
    return false;
  }

  if (
    filterTerm !== null &&
    lesson.term !== filterTerm
  ) {
    return false;
  }

  if (
    filterClassId &&
    lesson.class_id !== filterClassId
  ) {
    return false;
  }

  if (
    filterStatus &&
    lesson.status !== filterStatus
  ) {
    return false;
  }

  return true;
});
  // ======================================================
  // Page
  // ======================================================

  return (
    <main className="p-6">

      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          Lesson Management
        </h1>

        <p className="text-gray-500 mt-1">
          Generate and manage operational lessons.
        </p>
      </div>


      <div className="max-w-xl">

        <LessonGenerator
          scope={scope}
          setScope={setScope}

          academicYear={academicYear}
          setAcademicYear={setAcademicYear}

          term={term}
          setTerm={setTerm}

          classId={classId}
          setClassId={setClassId}

          classes={classes}

          onGenerate={generateLessons}

          generating={generating}
        />

        <div
  style={{
    marginTop: "24px",
    border: "1px solid #222",
    borderRadius: "8px",
    padding: "20px",
  }}
>
  <h2 style={{ marginTop: 0 }}>
    Lesson List
  </h2>

  <p>
  Showing Lessons:{" "}
  <strong>{filteredLessons.length}</strong>
  {" "}of{" "}
  <strong>{lessons.length}</strong>
</p>
<div style={{ marginTop: "16px", marginBottom: "16px" }}>
  <label>
    Academic Year
  </label>

  <select
    value={filterYear ?? ""}
    onChange={(e) => {
  setFilterYear(
    e.target.value ? Number(e.target.value) : null
  );
  setSelectedLesson(null);
}}
    style={{
      display: "block",
      marginTop: "6px",
      padding: "8px",
      minWidth: "180px",
    }}
  >
    <option value="">All Years</option>
    <option value="2026">2026</option>
  </select>
</div><div style={{ marginBottom: "16px" }}>
  <label>
    Term
  </label>

  <select
    value={filterTerm ?? ""}
    onChange={(e) => {
  setFilterTerm(
    e.target.value ? Number(e.target.value) : null
  );
  setSelectedLesson(null);
}}
    style={{
      display: "block",
      marginTop: "6px",
      padding: "8px",
      minWidth: "180px",
    }}
  >
    <option value="">All Terms</option>
    <option value="1">Term 1</option>
    <option value="2">Term 2</option>
    <option value="3">Term 3</option>
    <option value="4">Term 4</option>
  </select>
</div>
<div style={{ marginBottom: "16px" }}>
  <label>
    Class
  </label>

  <select
    value={filterClassId}
   onChange={(e) => {
  setFilterClassId(e.target.value);
  setSelectedLesson(null);
}}
    style={{
      display: "block",
      marginTop: "6px",
      padding: "8px",
      minWidth: "260px",
    }}
  >
    <option value="">
      All Classes
    </option>

    {classes.map((item) => (
      <option
        key={item.id}
        value={item.id}
      >
        {item.level ?? "Class"}
        {item.day ? ` | ${item.day}` : ""}
        {item.start_time ? ` | ${item.start_time}` : ""}
      </option>
    ))}
  </select>
</div>
<div style={{ marginBottom: "16px" }}>
  <label>
    Status
  </label>

  <select
    value={filterStatus}
    onChange={(e) => {
  setFilterStatus(e.target.value);
  setSelectedLesson(null);
}}
    style={{
      display: "block",
      marginTop: "6px",
      padding: "8px",
      minWidth: "180px",
    }}
  >
    <option value="">All Statuses</option>
    <option value="Planned">Planned</option>
    <option value="Cancelled">Cancelled</option>
    <option value="Completed">Completed</option>
  </select>
</div>
<button
  type="button"
  onClick={() => {
    setFilterYear(null);
    setFilterTerm(null);
    setFilterClassId("");
    setFilterStatus("");
    setSelectedLesson(null);
  }}
  style={{
    marginBottom: "16px",
    padding: "8px 14px",
  }}
>
  Clear Filters
</button>
<table
  style={{
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "16px",
  }}
>
  <thead
  style={{
    backgroundColor: "#f3f4f6",
    borderBottom: "1px solid #222",
  }}
>
    <tr>
      <th style={{ padding: "10px 8px", textAlign: "left" }}>
  Date
</th>

<th style={{ padding: "10px 8px", textAlign: "left" }}>
  Class
</th>

<th style={{ padding: "10px 8px", textAlign: "left" }}>
  Status
</th>

<th style={{ padding: "10px 8px", textAlign: "left" }}>
  Chargeable
</th>

<th style={{ padding: "10px 8px", textAlign: "left" }}>
  Actions
</th>
    </tr>
  </thead>
  <tbody>
  {filteredLessons.map((lesson) => {

    const lessonClass = classes.find(
      (item) => item.id === lesson.class_id
    );

    return (
      <tr
  key={lesson.id}
  style={{
    borderBottom: "1px solid #ddd",
  }}
>
        <td style={{ padding: "10px 8px" }}>{lesson.lesson_date}</td>

        <td style={{ padding: "10px 8px" }}>
          {lessonClass
            ? `${lessonClass.level ?? ""}${lessonClass.day ? ` | ${lessonClass.day}` : ""}${lessonClass.start_time ? ` | ${lessonClass.start_time}` : ""}`
            : "Unknown Class"}
        </td>

        <td style={{ padding: "10px 8px" }}>{lesson.status}</td>

        <td style={{ padding: "10px 8px" }}>
          {lesson.chargeable
            ? "Chargeable"
            : "Non-chargeable"}
        </td>

        <td style={{ padding: "10px 8px" }}>
  <button
  type="button"
  onClick={() => {
    setSelectedLesson(lesson);

  }}
>
  Manage
</button>
</td>

      </tr>
    );
  })}
</tbody>
</table>
{selectedLesson && (
  <div
    style={{
      marginTop: "20px",
      border: "1px solid #222",
      borderRadius: "8px",
      padding: "20px",
    }}
  >
    <h2 style={{ marginTop: 0 }}>
      Manage Lesson
    </h2>

    <p>
      Selected Lesson: <strong>{selectedLesson.lesson_date}</strong>
    </p>
    <p>
  Status: <strong>{selectedLesson.status}</strong>
</p>
<p>
  Chargeable:{" "}
  <strong>
    {selectedLesson.chargeable ? "Yes" : "No"}
  </strong>
</p>
<p>
  Notes:{" "}
  <strong>
    {selectedLesson.notes || "-"}
  </strong>
</p>
{selectedLesson.status === "Cancelled" &&
  selectedLesson.cancellation_reason && (
    <p>
      Cancellation Reason:{" "}
      <strong>
        {selectedLesson.cancellation_reason}
      </strong>
    </p>
)}
{selectedLesson.status !== "Cancelled" && (
  <>
<div style={{ marginBottom: "16px" }}>
  <label>
    Cancellation Reason
  </label>

  <select
    value={cancellationReason}
    onChange={(e) =>
      setCancellationReason(e.target.value)
    }
    style={{
      display: "block",
      marginTop: "6px",
      padding: "8px",
      minWidth: "240px",
    }}
  >
    <option value="">
      Select Reason
    </option>

    <option value="Teacher Unavailable">
      Teacher Unavailable
    </option>

    <option value="Venue Closure">
      Venue Closure
    </option>

    <option value="School Cancellation">
      School Cancellation
    </option>

    <option value="Other">
      Other
    </option>
  </select>
</div>
<button
  type="button"
  onClick={cancelLesson}
>
  Cancel Lesson
</button>
  </>
)}
  </div>
)}
</div>

      </div>

    </main>
  );
}