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
const [reconciliationResult, setReconciliationResult] =
  useState<{
    candidate: number;
    created: number;
    updated: number;
    unchanged: number;
    protected: number;
  } | null>(null);

const [selectedLesson, setSelectedLesson] = useState<any | null>(null);

const [cancellationReason, setCancellationReason] = useState("");

const [modal, setModal] = useState<{
  open: boolean;
  type: "confirm" | "success" | "error";
  title: string;
  message: string;
  onConfirm?: () => void;
}>({
  open: false,
  type: "success",
  title: "",
  message: "",
});
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
    setModal({
      open: true,
      type: "error",
      title: "Cannot Cancel Lesson",
      message:
        "This lesson is controlled by a School Operational Event and cannot be manually cancelled.",
    });
    return;
  }

  if (selectedLesson.status === "Completed") {
    setModal({
      open: true,
      type: "error",
      title: "Cannot Cancel Lesson",
      message: "Completed lessons cannot be cancelled.",
    });
    return;
  }

  const lessonDate = new Date(
    `${selectedLesson.lesson_date}T00:00:00`
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (lessonDate < today) {
    setModal({
      open: true,
      type: "error",
      title: "Cannot Cancel Lesson",
      message: "Past lessons cannot be cancelled.",
    });
    return;
  }

  if (
    selectedLesson.status === "Cancelled" &&
    selectedLesson.cancellation_reason
  ) {
    setModal({
      open: true,
      type: "error",
      title: "Lesson Already Cancelled",
      message:
        "This lesson has already been manually cancelled.",
    });
    return;
  }

  if (!cancellationReason) {
    setModal({
      open: true,
      type: "error",
      title: "Cancellation Reason Required",
      message:
        "Please select a cancellation reason.",
    });
    return;
  }

  setModal({
    open: true,
    type: "confirm",
    title: "Cancel Lesson?",
    message:
      "This will mark the lesson as cancelled and non-chargeable. Do you want to continue?",
    onConfirm: async () => {
      setModal((current) => ({
        ...current,
        open: false,
      }));

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
        setModal({
          open: true,
          type: "error",
          title: "Unable to Cancel Lesson",
          message: error.message,
        });
        return;
      }

      await loadLessons();

      setModal({
        open: true,
        type: "success",
        title: "Lesson Cancelled",
        message:
          "The lesson has been cancelled successfully.",
      });
    },
  });
}
async function restoreLesson() {
  if (!selectedLesson) {
    return;
  }

  if (selectedLesson.status !== "Cancelled") {
    setModal({
      open: true,
      type: "error",
      title: "Cannot Restore Lesson",
      message:
        "Only cancelled lessons can be restored.",
    });
    return;
  }

  if (selectedLesson.operational_event_id) {
    setModal({
      open: true,
      type: "error",
      title: "Cannot Restore Lesson",
      message:
        "This lesson is controlled by a School Operational Event and cannot be manually restored.",
    });
    return;
  }

  if (!selectedLesson.cancellation_reason) {
    setModal({
      open: true,
      type: "error",
      title: "Cannot Restore Lesson",
      message:
        "This lesson was not manually cancelled and cannot be restored here.",
    });
    return;
  }

  setModal({
    open: true,
    type: "confirm",
    title: "Restore Lesson?",
    message:
      "This will restore the lesson to Planned and Chargeable. Do you want to continue?",
    onConfirm: async () => {
      setModal((current) => ({
        ...current,
        open: false,
      }));

      const { error } = await supabase
        .from("lessons")
        .update({
          status: "Planned",
          chargeable: true,
          cancellation_reason: null,
          operational_event_id: null,
        })
        .eq("id", selectedLesson.id);

      if (error) {
        setModal({
          open: true,
          type: "error",
          title: "Unable to Restore Lesson",
          message: error.message,
        });
        return;
      }

      setSelectedLesson(null);
      await loadLessons();

      setModal({
        open: true,
        type: "success",
        title: "Lesson Restored",
        message:
          "The lesson has been restored successfully.",
      });
    },
  });
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

const classMismatch =
  existing !== undefined &&
  existing.class_id !== candidate.class_id;


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
  !classMismatch &&
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
      class_id:
        item.candidate.class_id,

      class_schedule_id:
        item.candidate.class_schedule_id,

      academic_year:
        item.candidate.academic_year,

      term:
        item.candidate.term,

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


    setReconciliationResult({
      candidate: candidateLessons.length,
      created,
      updated,
      unchanged,
      protected: protectedCount,
    });

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
    <main className="w-full px-4 py-5 sm:px-6 lg:px-8">

      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          Lesson Management
        </h1>

        <p className="mt-1 text-gray-500">
          Generate and manage operational lessons.
        </p>
      </div>

      {/*
        Responsive page shell:
        - Full width on desktop
        - Comfortable padding on tablet/mobile
        - No fixed max-width that forces the page into a narrow column
      */}
      <div className="w-full max-w-none">

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
          className="mt-6 w-full rounded-lg border p-4 sm:p-5"
          style={{
            borderColor: "#b79a3b",
            background:
              "linear-gradient(180deg, rgba(183,154,59,0.18) 0px, rgba(183,154,59,0.04) 3px, rgba(9,35,66,0.72) 18px)",
          }}
        >
          <div className="mb-5">
            <h2 className="text-xl font-semibold">
              Lesson List
            </h2>

            <p className="mt-1 text-sm text-gray-300">
              Showing Lessons:{" "}
              <strong>{filteredLessons.length}</strong>
              {" "}of{" "}
              <strong>{lessons.length}</strong>
            </p>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-300">
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
                className="mt-1 block w-full rounded-md border border-[#b79a3b] px-3 py-2 text-sm text-[#0b2a4a] focus:outline-none focus:ring-2 focus:ring-[#b79a3b]/40"
                style={{
                  backgroundColor: "#fff7e8",
                  color: "#0b2a4a",
                }}
              >
                <option value="">All Years</option>
                <option value="2026">2026</option>
              </select>
            </div>

            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-300">
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
                className="mt-1 block w-full rounded-md border border-[#b79a3b] px-3 py-2 text-sm text-[#0b2a4a] focus:outline-none focus:ring-2 focus:ring-[#b79a3b]/40"
                style={{
                  backgroundColor: "#fff7e8",
                  color: "#0b2a4a",
                }}
              >
                <option value="">All Terms</option>
                <option value="1">Term 1</option>
                <option value="2">Term 2</option>
                <option value="3">Term 3</option>
                <option value="4">Term 4</option>
              </select>
            </div>

            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-300">
                Class
              </label>

              <select
                value={filterClassId}
                onChange={(e) => {
                  setFilterClassId(e.target.value);
                  setSelectedLesson(null);
                }}
                className="mt-1 block w-full rounded-md border border-[#b79a3b] px-3 py-2 text-sm text-[#0b2a4a] focus:outline-none focus:ring-2 focus:ring-[#b79a3b]/40"
                style={{
                  backgroundColor: "#fff7e8",
                  color: "#0b2a4a",
                }}
              >
                <option value="">All Classes</option>

                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.level ?? "Class"}
                    {item.day ? ` | ${item.day}` : ""}
                    {item.start_time ? ` | ${item.start_time}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-300">
                Status
              </label>

              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setSelectedLesson(null);
                }}
                className="mt-1 block w-full rounded-md border border-[#b79a3b] px-3 py-2 text-sm text-[#0b2a4a] focus:outline-none focus:ring-2 focus:ring-[#b79a3b]/40"
                style={{
                  backgroundColor: "#fff7e8",
                  color: "#0b2a4a",
                }}
              >
                <option value="">All Statuses</option>
                <option value="Planned">Planned</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
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
            className="mt-4 rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-[#b79a3b]/10"
            style={{
              borderColor: "#b79a3b",
              color: "#fff7e8",
            }}
          >
            Clear Filters
          </button>

          {/* ================================================== */}
          {/* Lesson List Table                                  */}
          {/* Desktop / tablet: sticky header + 7-row viewport   */}
          {/* ================================================== */}

          <div className="mt-5 overflow-hidden rounded-md border border-[#b79a3b]/60">
            <div className="max-h-[460px] overflow-y-auto overflow-x-hidden">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="sticky top-0 z-20 bg-[#15375d] text-[#fff7e8] shadow-[0_2px_6px_rgba(0,0,0,0.25)]">
                    <th className="h-[52px] px-3 py-3 text-left text-sm font-semibold">
                      Date
                    </th>
                    <th className="h-[52px] px-3 py-3 text-left text-sm font-semibold">
                      Class
                    </th>
                    <th className="h-[52px] px-3 py-3 text-left text-sm font-semibold">
                      Status
                    </th>
                    <th className="h-[52px] px-3 py-3 text-left text-sm font-semibold">
                      Chargeable
                    </th>
                    <th className="h-[52px] px-3 py-3 text-left text-sm font-semibold">
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
                        className="h-[56px] border-b border-[#b79a3b]/25 text-[#0b2a4a] transition-colors odd:bg-[#fff7e8] even:bg-[#fff0cf] hover:bg-[#f3df9f]"
                      >
                        <td className="px-3 py-3 align-middle text-sm font-medium">
                          {lesson.lesson_date}
                        </td>

                        <td className="px-3 py-3 align-middle text-sm font-medium">
                          {lessonClass
                            ? `${lessonClass.level ?? ""}${
                                lessonClass.day ? ` | ${lessonClass.day}` : ""
                              }${
                                lessonClass.start_time
                                  ? ` | ${lessonClass.start_time}`
                                  : ""
                              }`
                            : "Unknown Class"}
                        </td>

                        <td className="px-3 py-3 align-middle text-sm font-medium">
                          {lesson.status}
                        </td>

                        <td className="px-3 py-3 align-middle text-sm font-medium">
                          {lesson.chargeable
                            ? "Chargeable"
                            : "Non-chargeable"}
                        </td>

                        <td className="px-3 py-3 align-middle text-sm">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedLesson(lesson);
                            }}
                            className="rounded-md border px-3 py-1.5 text-sm font-medium text-[#fff7e8] transition hover:bg-[#b79a3b]/20"
                            style={{
                              borderColor: "#b79a3b",
                              backgroundColor: "#0b2a4a",
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
            </div>
          </div>

          {/* Mobile lesson cards */}
          <div className="mt-5 space-y-3 md:hidden">
            {filteredLessons.map((lesson) => {
              const lessonClass = classes.find(
                (item) => item.id === lesson.class_id
              );

              return (
                <div
                  key={lesson.id}
                  className="rounded-lg border p-4 transition-colors hover:bg-[#16375d]"
                  style={{
                    borderColor: "rgba(183, 154, 59, 0.65)",
                    background: "rgba(5, 25, 48, 0.82)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base font-semibold">
                        {lesson.lesson_date}
                      </div>
                      <div className="mt-1 break-words text-sm text-gray-300">
                        {lessonClass
                          ? `${lessonClass.level ?? ""}${lessonClass.day ? ` | ${lessonClass.day}` : ""}${lessonClass.start_time ? ` | ${lessonClass.start_time}` : ""}`
                          : "Unknown Class"}
                      </div>
                    </div>

                    <span className="shrink-0 text-sm font-medium">
                      {lesson.status}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-col gap-2 text-sm text-gray-300 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      {lesson.chargeable
                        ? "Chargeable"
                        : "Non-chargeable"}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLesson(lesson);
                      }}
                      className="w-full rounded-md border px-3 py-2 text-sm font-medium sm:w-auto"
                      style={{ borderColor: "#b79a3b" }}
                    >
                      Manage
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredLessons.length === 0 && (
            <div className="mt-5 rounded-lg border border-dashed border-gray-600 p-6 text-center text-sm text-gray-400">
              No lessons match the selected filters.
            </div>
          )}

          {selectedLesson && (
            <div
              className="mt-5 rounded-lg border p-4 sm:p-5"
              style={{
                borderColor: "#b79a3b",
                background: "rgba(5, 25, 48, 0.72)",
              }}
            >
              <h2 className="text-xl font-semibold">
                Manage Lesson
              </h2>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <p className="break-words">
                  Selected Lesson:{" "}
                  <strong>{selectedLesson.lesson_date}</strong>
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

                <p className="break-words">
                  Notes:{" "}
                  <strong>{selectedLesson.notes || "-"}</strong>
                </p>

                {selectedLesson.status === "Cancelled" &&
                  selectedLesson.cancellation_reason && (
                    <p className="break-words sm:col-span-2">
                      Cancellation Reason:{" "}
                      <strong>
                        {selectedLesson.cancellation_reason}
                      </strong>
                    </p>
                  )}
              </div>

              {selectedLesson.status !== "Cancelled" && (
                <>
                  <div className="mt-5">
                    <label className="block text-sm font-medium text-gray-300">
                      Cancellation Reason
                    </label>

                    <select
                      value={cancellationReason}
                      onChange={(e) =>
                        setCancellationReason(e.target.value)
                      }
                      className="mt-1 block w-full max-w-md rounded-md border border-[#b79a3b] px-3 py-2 text-sm text-[#0b2a4a] focus:outline-none focus:ring-2 focus:ring-[#b79a3b]/40"
                      style={{
                        backgroundColor: "#fff7e8",
                        color: "#0b2a4a",
                      }}
                    >
                      <option value="">Select Reason</option>
                      <option value="Teacher Unavailable">
                        Teacher Unavailable
                      </option>
                      <option value="Venue Closure">
                        Venue Closure
                      </option>
                      <option value="School Cancellation">
                        School Cancellation
                      </option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={cancelLesson}
                    className="mt-4 w-full rounded-md border px-4 py-2 font-medium sm:w-auto"
                    style={{ borderColor: "#b79a3b" }}
                  >
                    Cancel Lesson
                  </button>
                </>
              )}

              {selectedLesson.status === "Cancelled" &&
                selectedLesson.cancellation_reason &&
                !selectedLesson.operational_event_id && (
                  <button
                    type="button"
                    onClick={restoreLesson}
                    className="mt-4 w-full rounded-md border px-4 py-2 font-medium sm:w-auto"
                    style={{ borderColor: "#b79a3b" }}
                  >
                    Restore Lesson
                  </button>
                )}
            </div>
          )}
        </div>
      </div>
      {reconciliationResult && (
  <div
    className="
      fixed
      inset-0
      z-[100]
      flex
      items-center
      justify-center
      bg-[#10213A]/50
      px-4
      backdrop-blur-[2px]
    "
  >
    <div
      className="
        relative
        w-full
        max-w-md
        overflow-hidden
        rounded-2xl
        border
        border-[#D9E0E8]
        bg-[#FFFDF8]
        shadow-2xl
      "
    >
      {/* Gold Accent */}
      <div
        aria-hidden="true"
        className="
          absolute
          left-0
          right-0
          top-0
          h-[6px]
          bg-gradient-to-r
          from-[#F7D968]
          via-[#D4AF37]
          to-transparent
        "
      />

      <div className="px-6 py-7 sm:px-7">
        <p
          className="
            text-[11px]
            font-semibold
            uppercase
            tracking-[0.22em]
            text-[#B28A22]
          "
        >
          LESSON GENERATOR
        </p>

        <h2
          className="
            mt-2
            text-2xl
            font-bold
            tracking-tight
            text-[#10213A]
          "
        >
          Reconciliation Completed
        </h2>

        <p
          className="
            mt-2
            text-sm
            text-[#64748B]
          "
        >
          Database changes have been saved successfully.
        </p>

        <div
          className="
            mt-6
            grid
            grid-cols-2
            gap-3
          "
        >
          <div className="rounded-xl bg-[#F5F9FD] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
              Candidate
            </p>
            <p className="mt-1 text-2xl font-bold text-[#10213A]">
              {reconciliationResult.candidate}
            </p>
          </div>

          <div className="rounded-xl bg-[#FFF8DF] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
              Created
            </p>
            <p className="mt-1 text-2xl font-bold text-[#10213A]">
              {reconciliationResult.created}
            </p>
          </div>

          <div className="rounded-xl bg-[#F5F9FD] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
              Updated
            </p>
            <p className="mt-1 text-2xl font-bold text-[#10213A]">
              {reconciliationResult.updated}
            </p>
          </div>

          <div className="rounded-xl bg-[#F5F9FD] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
              Unchanged
            </p>
            <p className="mt-1 text-2xl font-bold text-[#10213A]">
              {reconciliationResult.unchanged}
            </p>
          </div>

          <div className="col-span-2 rounded-xl bg-[#F5F9FD] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">
              Protected
            </p>
            <p className="mt-1 text-2xl font-bold text-[#10213A]">
              {reconciliationResult.protected}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setReconciliationResult(null)
          }
          className="
            mt-6
            w-full
            rounded-xl
            border
            border-[#D4AF37]
            bg-[#D4AF37]
            px-5
            py-3
            text-sm
            font-semibold
            text-[#10213A]
            shadow-sm
            transition
            hover:bg-[#F4D35E]
            active:scale-[0.98]
          "
        >
          Done
        </button>
      </div>
    </div>
  </div>
)}

{modal.open && (
  <div
    className="
      fixed
      inset-0
      z-[200]
      flex
      items-center
      justify-center
      bg-[#10213A]/50
      px-4
      backdrop-blur-[2px]
    "
    role="dialog"
    aria-modal="true"
  >
    <div
      className="
        relative
        w-full
        max-w-md
        overflow-hidden
        rounded-2xl
        border
        border-[#D9E0E8]
        bg-[#FFFDF8]
        shadow-2xl
      "
    >
      <div
        aria-hidden="true"
        className="
          absolute
          left-0
          right-0
          top-0
          h-[6px]
          bg-gradient-to-r
          from-[#F7D968]
          via-[#D4AF37]
          to-transparent
        "
      />

      <div className="px-6 py-7 sm:px-7">
        <p
          className="
            text-[11px]
            font-semibold
            uppercase
            tracking-[0.22em]
            text-[#B28A22]
          "
        >
          LESSON MANAGEMENT
        </p>

        <h2
          className="
            mt-2
            text-2xl
            font-bold
            tracking-tight
            text-[#10213A]
          "
        >
          {modal.title}
        </h2>

        <p className="mt-3 text-sm leading-6 text-[#64748B]">
          {modal.message}
        </p>

        {modal.type === "confirm" ? (
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() =>
                setModal((current) => ({
                  ...current,
                  open: false,
                }))
              }
              className="
                rounded-xl
                border
                border-[#D4AF37]
                bg-white
                px-5
                py-3
                text-sm
                font-semibold
                text-[#10213A]
                transition
                hover:bg-[#FFF8DF]
              "
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => modal.onConfirm?.()}
              className="
                rounded-xl
                border
                border-[#D4AF37]
                bg-[#D4AF37]
                px-5
                py-3
                text-sm
                font-semibold
                text-[#10213A]
                shadow-sm
                transition
                hover:bg-[#F4D35E]
                active:scale-[0.98]
              "
            >
              Confirm
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() =>
              setModal((current) => ({
                ...current,
                open: false,
              }))
            }
            className="
              mt-6
              w-full
              rounded-xl
              border
              border-[#D4AF37]
              bg-[#D4AF37]
              px-5
              py-3
              text-sm
              font-semibold
              text-[#10213A]
              shadow-sm
              transition
              hover:bg-[#F4D35E]
              active:scale-[0.98]
            "
          >
            Done
          </button>
        )}
      </div>
    </div>
  </div>
)}
    </main>
  );
}
