import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getRenderedEmailTemplate } from "@/lib/email/templateService";
import { sendEmail } from "@/lib/email/emailService";
import { logEmailAudit } from "@/lib/email/emailAudit";

const BUSINESS_EVENT = "EIGHT_PM_ATTENDANCE_REMINDER";
const REMINDER_TYPE = "EIGHT_PM";
const LOGIN_URL = "https://mychess.queenslandchessschool.com.au/";

function getBrisbaneDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Brisbane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatTime(time?: string | null): string {
  if (!time) return "";

  const [hourString, minute] = time.split(":");
  const hour = Number(hourString);

  if (Number.isNaN(hour)) return time;

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minute} ${suffix}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    return String(
      (error as { message?: unknown }).message
    );
  }

  return String(error);
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      {
        success: false,
        error: "CRON_SECRET is not configured.",
      },
      { status: 500 }
    );
  }

  if (
    request.headers.get("authorization") !==
    `Bearer ${cronSecret}`
  ) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  const lessonDate = getBrisbaneDate();

  const {
    data: lessons,
    error: lessonError,
  } = await supabaseServer
    .from("lessons")
    .select(`
      id,
      lesson_date,
      status,
      classes:class_id (
        coach_id,
        level,
        class_suffix,
        start_time,
        end_time,
        coaches:coach_id (
          id,
          email,
          title,
          first_name
        )
      )
    `)
    .eq("lesson_date", lessonDate)
    .neq("status", "Cancelled");

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

  const results: any[] = [];
  const lessonRows = lessons ?? [];

  for (const lesson of lessonRows) {
    try {
      const classData = Array.isArray(lesson.classes)
        ? lesson.classes[0]
        : lesson.classes;

      const coachData = classData?.coaches;

      const coach = Array.isArray(coachData)
        ? coachData[0]
        : coachData;

      const coachEmail = coach?.email?.trim();

      const coachName = [
        coach?.title?.trim(),
        coach?.first_name?.trim(),
      ]
        .filter(Boolean)
        .join(" ");

      if (!coach?.id) {
        results.push({
          lessonId: lesson.id,
          skipped: true,
          reason: "Coach not found.",
        });
        continue;
      }

      if (!coachEmail) {
        results.push({
          lessonId: lesson.id,
          skipped: true,
          reason: "Coach email not found.",
        });
        continue;
      }

      // Do not remind if attendance has been submitted.
      const {
        data: submission,
        error: submissionError,
      } = await supabaseServer
        .from("attendance_submissions")
        .select("submitted_at")
        .eq("lesson_id", lesson.id)
        .maybeSingle();

      if (submissionError) throw submissionError;

      if (submission?.submitted_at) {
        results.push({
          lessonId: lesson.id,
          skipped: true,
          reason: "Attendance already submitted.",
        });
        continue;
      }

      // Preserve existing EIGHT_PM duplicate protection.
      const {
        data: existingLog,
        error: logCheckError,
      } = await supabaseServer
        .from("attendance_reminder_logs")
        .select("id")
        .eq("lesson_id", lesson.id)
        .eq("reminder_type", REMINDER_TYPE)
        .maybeSingle();

      if (logCheckError) throw logCheckError;

      if (existingLog) {
        results.push({
          lessonId: lesson.id,
          skipped: true,
          reason: "8PM reminder already sent.",
        });
        continue;
      }

      const className = [
        classData?.level,
        classData?.class_suffix,
      ]
        .filter(Boolean)
        .join(" ") || "Class";

      const startTime = formatTime(classData?.start_time);
      const endTime = formatTime(classData?.end_time);

      const variables: Record<string, string> = {
        "Coach Name": coachName || "Coach",
        "Class Name": className,
        "Start Time": startTime,
        "End Time": endTime,
        "MyCHESS Login URL": LOGIN_URL,
      };

      let email;

      try {
        email = await getRenderedEmailTemplate({
          businessEvent: BUSINESS_EVENT,
          variables,
        });
      } catch (error) {
        const errorMessage = getErrorMessage(error);

        await logEmailAudit({
          businessEvent: BUSINESS_EVENT,
          recipientEmail: coachEmail,
          dataUsed: variables,
          status: "Failed",
          errorMessage,
        });

        results.push({
          lessonId: lesson.id,
          sent: false,
          error: errorMessage,
        });

        continue;
      }

      const sendResult = await sendEmail({
        to: coachEmail,
        subject: email.subject,
        html: email.body,
      });

      await logEmailAudit({
        businessEvent: BUSINESS_EVENT,
        templateName: email.templateName,
        recipientEmail: coachEmail,
        dataUsed: variables,
        status: sendResult.success ? "Success" : "Failed",
        messageId: sendResult.messageId ?? null,
        errorMessage: sendResult.success
          ? null
          : getErrorMessage(sendResult.error ?? "Email sending failed"),
      });

      if (!sendResult.success) {
        results.push({
          lessonId: lesson.id,
          sent: false,
          error: getErrorMessage(
            sendResult.error ?? "Email sending failed"
          ),
        });
        continue;
      }

      // Record only after the central sender reports success.
      const {
        error: insertError,
      } = await supabaseServer
        .from("attendance_reminder_logs")
        .insert({
          lesson_id: lesson.id,
          coach_id: coach.id,
          reminder_type: REMINDER_TYPE,
          sent_at: new Date().toISOString(),
        });

      if (insertError?.code === "23505") {
        results.push({
          lessonId: lesson.id,
          skipped: true,
          reason: "Reminder log already exists.",
        });
        continue;
      }

      if (insertError) throw insertError;

      results.push({
        lessonId: lesson.id,
        sent: true,
        email: coachEmail,
        messageId: sendResult.messageId ?? null,
        templateName: email.templateName,
      });
    } catch (error) {
      const errorMessage = getErrorMessage(error);

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
    reminderType: REMINDER_TYPE,
    lessonCount: lessonRows.length,
    results,
  });
}