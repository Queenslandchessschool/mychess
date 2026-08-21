// ======================================================
// MyCHESS Attendance Reconciliation Scheduler
//
// Scheduler Entry Point
//
// Purpose:
// - Receive trusted Scheduler / Cron request
// - Load today's Lessons
// - Execute the shared Attendance Runner
// - Use Server Supabase Client
//
// IMPORTANT:
// - Does NOT contain Attendance business logic
// - Does NOT create Attendance directly
// - Does NOT implement Trial / Regular rules
// - Does NOT implement Leave / Make-up / Registration rules
//
// Shared Business Flow:
//
// Scheduler
//     ↓
// runAttendanceReconciliation()
//     ↓
// Attendance Time Engine
//     ↓
// Attendance Engine
//
// Business Timezone:
// Australia/Brisbane
// ======================================================

import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";

import {
  runAttendanceReconciliation,
} from "@/lib/attendanceRunner";


// ======================================================
// Brisbane Date
//
// Lessons use a local calendar date.
// We therefore determine "today" in the
// Australia/Brisbane timezone.
//
// IMPORTANT:
// Do NOT use server UTC date directly.
// ======================================================

function getBrisbaneDate(): string {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Australia/Brisbane",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(new Date());
}


// ======================================================
// POST
//
// Called by the Scheduler / Cron.
//
// Security:
// - Requires CRON_SECRET
// - CRON_SECRET must NOT use NEXT_PUBLIC_
// ======================================================

export async function POST(
  request: Request
) {

  // ====================================================
  // 1. Verify Scheduler Secret
  // ====================================================

  const cronSecret =
    process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error(
      "ATTENDANCE RECONCILIATION: CRON_SECRET is not configured."
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Scheduler secret is not configured.",
      },
      {
        status: 500,
      }
    );
  }


  const authorization =
    request.headers.get(
      "authorization"
    );


  if (
    authorization !==
    `Bearer ${cronSecret}`
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized.",
      },
      {
        status: 401,
      }
    );
  }


  // ====================================================
  // 2. Determine today's Brisbane date
  // ====================================================

  const lessonDate =
    getBrisbaneDate();


  // ====================================================
  // 3. Load today's Lessons
  //
  // IMPORTANT:
  // Scheduler does NOT determine eligibility.
  //
  // It simply finds today's lessons.
  //
  // Attendance Runner / Time Engine remains responsible
  // for deciding whether reconciliation is currently
  // allowed for each lesson.
  // ====================================================

  const {
    data: lessons,
    error: lessonError,
  } = await supabaseServer
    .from("lessons")
    .select(`
      id,
      lesson_date
    `)
    .eq(
      "lesson_date",
      lessonDate
    );


  if (lessonError) {

    console.error(
      "ATTENDANCE RECONCILIATION: LESSON LOAD ERROR",
      lessonError
    );

    return NextResponse.json(
      {
        success: false,

        lessonDate,

        error:
          lessonError.message,
      },
      {
        status: 500,
      }
    );
  }


  const lessonRows =
    lessons ?? [];


  // ====================================================
  // 4. Run shared Attendance Runner
  //
  // IMPORTANT:
  // The Scheduler passes supabaseServer into the
  // SAME Runner already used by Admin / Coach.
  //
  // No duplicate Attendance business logic exists here.
  // ====================================================

  const results = [];

  for (
    const lesson of lessonRows
  ) {

    try {

      const result =
        await runAttendanceReconciliation(
          lesson.id,
          supabaseServer
        );

      results.push(
        result
      );

    } catch (error) {

      console.error(
        "ATTENDANCE RECONCILIATION: LESSON ERROR",
        {
          lessonId:
            lesson.id,

          error,
        }
      );

      results.push({
        lessonId:
          lesson.id,

        executed:
          false,

        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      });
    }
  }


  // ====================================================
  // 5. Return Scheduler Result
  // ====================================================

  return NextResponse.json(
    {
      success: true,

      lessonDate,

      lessonCount:
        lessonRows.length,

      results,
    }
  );
}