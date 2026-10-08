import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";
import { getRenderedEmailTemplate } from "@/lib/email/templateService";
import { sendEmail } from "@/lib/email/emailService";
import { logEmailAudit } from "@/lib/email/emailAudit";

const BUSINESS_EVENT = "TRIAL_FEEDBACK_REMINDER";

const PORTAL_LINK =
  "https://mychess.queenslandchessschool.com.au/";

function getBrisbaneDateKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Brisbane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function subtractDays(
  dateKey: string,
  days: number
): string | null {
  const parts = dateKey.split("-").map(Number);

  if (
    parts.length !== 3 ||
    parts.some(Number.isNaN)
  ) {
    return null;
  }

  const [year, month, day] = parts;

  const date = new Date(
    Date.UTC(year, month - 1, day - days)
  );

  return date.toISOString().slice(0, 10);
}

function getStudentName(student: {
  first_name?: string | null;
  last_name?: string | null;
} | null): string {
  return (
    [
      student?.first_name,
      student?.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() || "Student"
  );
}

function getCoachName(coach: {
  first_name?: string | null;
  last_name?: string | null;
} | null): string {
  return (
    [
      coach?.first_name,
      coach?.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() || "Coach"
  );
}

export async function POST(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        {
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
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const currentDateKey =
      getBrisbaneDateKey();

    const previousDateKey =
      subtractDays(currentDateKey, 1);

    if (!previousDateKey) {
      return NextResponse.json(
        {
          error:
            "Unable to determine previous Brisbane date.",
        },
        { status: 500 }
      );
    }
    const { data: pendingTrials, error: trialError } =
      await supabaseServer
        .from("attendance")
        .select(`
          id,
          student_id,
          attendance_status,
          attendance_type,
          lesson_id,
          students:student_id (
            first_name,
            last_name
          ),
          lessons:lesson_id (
            id,
            lesson_date,
            class_id,
            classes:class_id (
              level,
              class_suffix,
              coach_id,
              coaches:coach_id (
                first_name,
                last_name,
                email,
                status
              )
            )
          ),
          trial_feedback (
            id
          )
        `)
        .eq("attendance_status", "Present")
        .eq("attendance_type", "Trial")
        .eq("trial_feedback.id", null)
        .eq("lessons.lesson_date", previousDateKey);

    if (trialError) {
      return NextResponse.json(
        {
          error:
            `Failed to load pending Trial Feedback: ${trialError.message}`,
        },
        { status: 500 }
      );
    }

    const pendingFeedback = (pendingTrials ?? [])
      .filter((attendance: any) => {
        const lesson = Array.isArray(attendance.lessons)
          ? attendance.lessons[0]
          : attendance.lessons;

        const classData = Array.isArray(lesson?.classes)
          ? lesson.classes[0]
          : lesson?.classes;

        const coach = Array.isArray(classData?.coaches)
          ? classData.coaches[0]
          : classData?.coaches;

        return (
          lesson?.lesson_date === previousDateKey &&
          coach?.status === "Active" &&
          Boolean(coach?.email)
        );
      })
      .map((attendance: any) => {
        const lesson = Array.isArray(attendance.lessons)
          ? attendance.lessons[0]
          : attendance.lessons;

        const classData = Array.isArray(lesson?.classes)
          ? lesson.classes[0]
          : lesson?.classes;

        const coach = Array.isArray(classData?.coaches)
          ? classData.coaches[0]
          : classData?.coaches;

        const student = Array.isArray(attendance.students)
          ? attendance.students[0]
          : attendance.students;

        return {
          attendanceId: attendance.id,
          lessonId: attendance.lesson_id,
          studentId: attendance.student_id,
          studentName: getStudentName(student),
          coachId: classData?.coach_id ?? null,
          coachName: getCoachName(coach),
          coachEmail: coach?.email ?? null,
          trialDate: previousDateKey,
          className: [
            classData?.level,
            classData?.class_suffix,
          ]
            .filter(Boolean)
            .join(" ")
            .trim(),
        };
      });

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    const results: Array<Record<string, unknown>> = [];

    for (const trial of pendingFeedback) {
      if (!trial.coachEmail) {
        skipped += 1;

        results.push({
          attendanceId: trial.attendanceId,
          studentName: trial.studentName,
          status: "Skipped",
          reason: "Coach email not found",
        });

        continue;
      }

      const auditBusinessEvent =
        `${BUSINESS_EVENT}_${trial.attendanceId}`;

      const { data: existingAudit, error: auditQueryError } =
        await supabaseServer
          .from("email_audit_logs")
          .select("id")
          .eq("business_event", auditBusinessEvent)
          .eq("status", "Success")
          .limit(1);

      if (auditQueryError) {
        failed += 1;

        results.push({
          attendanceId: trial.attendanceId,
          studentName: trial.studentName,
          status: "Failed",
          reason:
            `Audit lookup failed: ${auditQueryError.message}`,
        });

        continue;
      }

      if (existingAudit && existingAudit.length > 0) {
        skipped += 1;

        results.push({
          attendanceId: trial.attendanceId,
          studentName: trial.studentName,
          status: "Skipped",
          reason: "Reminder already sent",
        });

        continue;
      }

      const variables = {
        "Coach Name": trial.coachName,
        "Student Name": trial.studentName,
        "Trial Date": trial.trialDate,
        "Class Name": trial.className || "Chess Class",
        "MyCHESS Login URL": PORTAL_LINK,
      };

      let email;

      try {
        email = await getRenderedEmailTemplate({
          businessEvent: BUSINESS_EVENT,
          variables,
        });
      } catch (error) {
        const errorMessage = String(error);

        await logEmailAudit({
          businessEvent: auditBusinessEvent,
          recipientEmail: trial.coachEmail,
          studentId: trial.studentId,
          dataUsed: variables,
          status: "Failed",
          errorMessage,
        });

        failed += 1;

        results.push({
          attendanceId: trial.attendanceId,
          studentName: trial.studentName,
          status: "Failed",
          reason: errorMessage,
        });

        continue;
      }

      const result = await sendEmail({
        to: trial.coachEmail,
        subject: email.subject,
        html: email.body,
      });

      await logEmailAudit({
        businessEvent: auditBusinessEvent,
        templateName: email.templateName,
        recipientEmail: trial.coachEmail,
        studentId: trial.studentId,
        dataUsed: variables,
        status: result.success ? "Success" : "Failed",
        messageId: result.messageId ?? null,
        errorMessage: result.success
          ? null
          : String(result.error ?? "Email sending failed"),
      });

      if (!result.success) {
        failed += 1;

        results.push({
          attendanceId: trial.attendanceId,
          studentName: trial.studentName,
          status: "Failed",
          reason:
            String(
              result.error ??
                "Email sending failed"
            ),
        });

        continue;
      }

      sent += 1;

      results.push({
        attendanceId: trial.attendanceId,
        studentName: trial.studentName,
        coachEmail: trial.coachEmail,
        status: "Sent",
      });
    }

    return NextResponse.json({
      success: true,
      businessEvent: BUSINESS_EVENT,
      currentDateKey,
      previousDateKey,
      portalLink: PORTAL_LINK,
      processed: pendingFeedback.length,
      sent,
      skipped,
      failed,
      results,
      message:
        "Trial Feedback Reminder candidates loaded successfully.",
    });
  } catch (error) {
    console.error(
      "TRIAL FEEDBACK REMINDER CRON EXCEPTION:",
      error
    );

    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}