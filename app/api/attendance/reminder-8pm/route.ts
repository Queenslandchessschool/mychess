import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseServer } from "@/lib/supabaseServer";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

const REMINDER_TYPE = "EIGHT_PM";

function getBrisbaneDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Brisbane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function POST(request: Request) {
  // ======================================================
  // Security
  // ======================================================

  const cronSecret =
    process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      {
        success: false,
        error:
          "CRON_SECRET is not configured.",
      },
      { status: 500 }
    );
  }

  const authorization =
    request.headers.get("authorization");

  if (
    authorization !==
    `Bearer ${cronSecret}`
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized.",
      },
      { status: 401 }
    );
  }

  // ======================================================
  // Brisbane Business Date
  // ======================================================

  const lessonDate =
    getBrisbaneDate();

  // ======================================================
  // Load today's lessons
  //
  // Coach comes from:
  // lessons → classes → coaches
  //
  // Email MUST come from coaches.email.
  // ======================================================

  const {
    data: lessons,
    error: lessonError,
  } = await supabaseServer
    .from("lessons")
    .select(`
  id,
  lesson_date,
  start_time,
  end_time,
  status,
  classes:class_id (
    coach_id,
    level,
    class_suffix,
    coaches:coach_id (
          id,
          email,
          title,
          first_name
        )
      )
    `)
    .eq(
      "lesson_date",
      lessonDate
    )
    .neq(
      "status",
      "Cancelled"
    );

  if (lessonError) {
    console.error(
      "8PM ATTENDANCE REMINDER LESSON LOAD ERROR:",
      lessonError
    );

    return NextResponse.json(
      {
        success: false,
        error: lessonError.message,
      },
      { status: 500 }
    );
  }

  const lessonRows =
    lessons ?? [];

  const results: any[] = [];

  // ======================================================
  // Process each lesson
  // ======================================================

  for (const lesson of lessonRows) {
    try {
      const classData =
        Array.isArray(lesson.classes)
          ? lesson.classes[0]
          : lesson.classes;

      const coachData =
        classData?.coaches;

      const coach =
        Array.isArray(coachData)
          ? coachData[0]
          : coachData;

      const coachEmail =
        coach?.email?.trim();

      const firstName =
        coach?.first_name?.trim() ?? "";

      const title =
        coach?.title?.trim() ?? "";

      if (!coach?.id) {
        results.push({
          lessonId: lesson.id,
          skipped: true,
          reason:
            "Coach not found.",
        });

        continue;
      }

      if (!coachEmail) {
        results.push({
          lessonId: lesson.id,
          skipped: true,
          reason:
            "Coach email not found.",
        });

        continue;
      }

      // ==================================================
      // Check Submission
      // ==================================================

      const {
        data: submission,
        error:
          submissionError,
      } = await supabaseServer
        .from(
          "attendance_submissions"
        )
        .select("submitted_at")
        .eq(
          "lesson_id",
          lesson.id
        )
        .maybeSingle();

      if (submissionError) {
        throw submissionError;
      }

      // Already submitted
      // → NO reminder
      if (
        submission?.submitted_at
      ) {
        results.push({
          lessonId: lesson.id,
          skipped: true,
          reason:
            "Attendance already submitted.",
        });

        continue;
      }

      // ==================================================
      // Duplicate Protection
      // ==================================================

      const {
        data: existingLog,
        error: logCheckError,
      } = await supabaseServer
        .from(
          "attendance_reminder_logs"
        )
        .select("id")
        .eq(
          "lesson_id",
          lesson.id
        )
        .eq(
          "reminder_type",
          REMINDER_TYPE
        )
        .maybeSingle();

      if (logCheckError) {
        throw logCheckError;
      }

      if (existingLog) {
        results.push({
          lessonId: lesson.id,
          skipped: true,
          reason:
            "8PM reminder already sent.",
        });

        continue;
      }

      // ==================================================
      // Greeting
      // ==================================================

      const coachGreeting =
  `${title ? `${title} ` : ""}${firstName}`
    .trim();

const className =
  [
    classData?.level,
    classData?.class_suffix,
  ]
    .filter(Boolean)
    .join(" ") || "Class";

function formatTime(time?: string | null) {
  if (!time) return "";

  const [hourString, minute] =
    time.split(":");

  const hour = Number(hourString);

  if (Number.isNaN(hour)) {
    return time;
  }

  const suffix =
    hour >= 12 ? "PM" : "AM";

  const displayHour =
    hour % 12 || 12;

  return `${displayHour}:${minute} ${suffix}`;
}

const startTime =
  formatTime(lesson.start_time);

const endTime =
  formatTime(lesson.end_time);

const lessonLabel =
  `${startTime} – ${endTime} — ${className}`;

const message =
  `Hi ${coachGreeting},

The attendance for the following lesson has not been submitted yet:

Today's Lesson

${lessonLabel}

Please complete the attendance before 11:59 PM, when attendance will be locked.

Cheers,
Admin Team
Queensland Chess School`;

      // ==================================================
      // Send Email
      // ==================================================

      const {
        data: emailData,
        error: emailError,
      } = await resend.emails.send({
        from:
          "MyCHESS <noreply@queenslandchessschool.com.au>",
        to: [coachEmail],
        subject:
  `MyCHESS Attendance Reminder — ${className}`,
        text: message,
        html: `
          <p>${message}</p>
        `,
      });

      if (emailError) {
        throw emailError;
      }

      // ==================================================
      // Record Reminder
      // ==================================================

      const {
        error: insertError,
      } = await supabaseServer
        .from(
          "attendance_reminder_logs"
        )
        .insert({
          lesson_id:
            lesson.id,
          coach_id:
            coach.id,
          reminder_type:
            REMINDER_TYPE,
          sent_at:
            new Date().toISOString(),
        });

      // Unique constraint protection
      if (
        insertError &&
        insertError.code === "23505"
      ) {
        results.push({
          lessonId: lesson.id,
          skipped: true,
          reason:
            "Reminder log already exists.",
        });

        continue;
      }

      if (insertError) {
        throw insertError;
      }

      results.push({
        lessonId: lesson.id,
        sent: true,
        email: coachEmail,
        messageId:
          emailData?.id ?? null,
      });
    } catch (error) {
  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
        error !== null &&
        "message" in error
      ? String(
          (error as { message?: unknown }).message
        )
      : JSON.stringify(error);

  console.error(
    "8PM ATTENDANCE REMINDER ERROR:",
    {
      lessonId: lesson.id,
      error,
      errorMessage,
    }
  );

  results.push({
    lessonId: lesson.id,
    sent: false,
    error: errorMessage,
  });
}
  }

  return NextResponse.json({
    success: true,
    lessonDate,
    reminderType:
      REMINDER_TYPE,
    lessonCount:
      lessonRows.length,
    results,
  });
}