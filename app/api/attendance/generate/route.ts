// ======================================================
// MyCHESS Attendance Generation Scheduler
//
// Purpose:
// - Scheduler entry point for 04:00 Brisbane generation
// - Find all Lessons for today's Brisbane date
// - Generate missing Attendance through the existing
//   Attendance Engine
//
// IMPORTANT:
// - Does NOT modify Attendance Engine
// - Does NOT use Attendance Runner
// - Does NOT perform Reconciliation time gating
// - Existing Attendance remains untouched
// - Safe to run repeatedly
//
// Business Timezone:
// Australia/Brisbane
// ======================================================

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { reconcileAttendance } from "@/lib/attendanceEngine";

// ======================================================
// Brisbane Date
//
// Lessons use a local calendar date.
// Do NOT use the server's UTC date directly.
// ======================================================

function getBrisbaneDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Brisbane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// ======================================================
// POST
//
// Called by Scheduler / Cron.
//
// Security:
// - Requires CRON_SECRET
// - CRON_SECRET must NOT use NEXT_PUBLIC_
// ======================================================

export async function POST(request: Request) {
  // ====================================================
  // 1. Verify Scheduler Secret
  // ====================================================

  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error(
      "ATTENDANCE GENERATION: CRON_SECRET is not configured."
    );

    return NextResponse.json(
      {
        success: false,
        error: "Scheduler secret is not configured.",
      },
      { status: 500 }
    );
  }

  const authorization = request.headers.get("authorization");

  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized.",
      },
      { status: 401 }
    );
  }

  // ====================================================
  // 2. Determine Today's Brisbane Date
  // ====================================================

  const lessonDate = getBrisbaneDate();

  // ====================================================
  // 3. Load Today's Lessons
  //
  // Scheduler responsibility:
  // - Find today's Lessons only.
  //
  // Attendance Engine responsibility:
  // - Determine eligible enrolments
  // - Determine Trial eligibility
  // - Determine Booked Make-up students
  // - Preserve existing Attendance
  // - Insert only missing Attendance
  //
  // We intentionally do NOT duplicate those rules here.
  // ====================================================

  const {
    data: lessons,
    error: lessonError,
  } = await supabaseServer
    .from("lessons")
    .select("id, lesson_date")
    .eq("lesson_date", lessonDate);

  if (lessonError) {
    console.error(
      "ATTENDANCE GENERATION: LESSON LOAD ERROR",
      lessonError
    );

    return NextResponse.json(
      {
        success: false,
        lessonDate,
        error: lessonError.message,
      },
      { status: 500 }
    );
  }

  const lessonRows = lessons ?? [];

  // ====================================================
  // 4. Generate Attendance for Each Lesson
  //
  // IMPORTANT:
  // - We call the existing Attendance Engine directly.
  // - reconcileAttendance() already performs the required
  //   missing-record generation.
  // - Existing Attendance is never overwritten.
  // - New Attendance starts as Present.
  // - Regular / Trial / Make-up rules remain centralized
  //   inside Attendance Engine.
  // ====================================================

  const results: Array<Record<string, unknown>> = [];

  for (const lesson of lessonRows) {
    try {
      const result = await reconcileAttendance(
        lesson.id,
        supabaseServer
      );

      results.push({
        lessonId: lesson.id,
        lessonDate: lesson.lesson_date,
        success: true,
        existingCount: result.existingCount,
        eligibleEnrollmentCount:
          result.eligibleEnrollmentCount,
        insertedCount: result.insertedCount,
        skippedCount: result.skippedCount,
      });
    } catch (error) {
      console.error(
        "ATTENDANCE GENERATION: LESSON ERROR",
        {
          lessonId: lesson.id,
          error,
        }
      );

      results.push({
        lessonId: lesson.id,
        lessonDate: lesson.lesson_date,
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      });
    }
  }

  // ====================================================
  // 5. Summary
  // ====================================================

  const successfulLessons = results.filter(
    (result) => result.success === true
  ).length;

  const failedLessons = results.filter(
    (result) => result.success === false
  ).length;

  const insertedCount = results.reduce(
    (total, result) =>
      total +
      (typeof result.insertedCount === "number"
        ? result.insertedCount
        : 0),
    0
  );

  // ====================================================
  // 6. Return Scheduler Result
  // ====================================================

  return NextResponse.json({
    success: failedLessons === 0,
    lessonDate,
    lessonCount: lessonRows.length,
    successfulLessons,
    failedLessons,
    insertedCount,
    results,
  });
}