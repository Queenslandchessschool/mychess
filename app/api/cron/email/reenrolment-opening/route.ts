import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";
import { getRenderedEmailTemplate } from "@/lib/email/templateService";
import { sendEmail } from "@/lib/email/emailService";
import { logEmailAudit } from "@/lib/email/emailAudit";

const BUSINESS_EVENT = "REENROLMENT_OPENING";

export async function POST(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        { error: "CRON_SECRET is not configured." },
        { status: 500 }
      );
    }

    const authorization = request.headers.get("authorization");

    if (authorization !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const academicYear = Number(body.academicYear);
    const term = Number(body.term);
    const confirm = String(body.confirm ?? "");

    if (
      !Number.isInteger(academicYear) ||
      !Number.isInteger(term) ||
      !["1", "2", "3", "4"].includes(String(term))
    ) {
      return NextResponse.json(
        {
          error:
            "Valid academicYear and term are required.",
        },
        { status: 400 }
      );
    }

    if (confirm !== "SEND") {
      return NextResponse.json(
        {
          error:
            'Confirmation required. Set confirm to "SEND".',
        },
        { status: 400 }
      );
    }

    const { data: enrolments, error: enrolmentError } =
      await supabaseServer
        .from("student_enrolments")
        .select(`
          id,
          student_id,
class_id,
          academic_year,
          term,
          status,
          is_trial,
          students:student_id (
            first_name,
            last_name,
            preferred_name
          )
        `)
        .eq("academic_year", academicYear)
        .eq("term", term)
        .eq("status", "Active")
        .eq("is_trial", false)
        .order("student_id");

    if (enrolmentError) {
      throw new Error(
        `Failed to load enrolments: ${enrolmentError.message}`
      );
    }

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    const results: Array<Record<string, unknown>> = [];

    for (const enrolment of enrolments ?? []) {
      const studentId = enrolment.student_id;
const { data: schedule, error: scheduleError } =
  await supabaseServer
    .from("class_schedule")
    .select("final_lesson")
    .eq("class_id", enrolment.class_id)
    .eq("academic_year", academicYear)
    .eq("term", term)
    .maybeSingle();

if (scheduleError || !schedule?.final_lesson) {
  failed += 1;

  results.push({
    studentId,
    status: "Failed",
    error:
      scheduleError?.message ??
      "Class schedule or final lesson not found.",
  });

  continue;
}

      const student = Array.isArray(enrolment.students)
        ? enrolment.students[0]
        : enrolment.students;

      const studentName =
        student?.preferred_name ||
        `${student?.first_name ?? ""} ${
          student?.last_name ?? ""
        }`.trim();

      if (!studentId || !studentName) {
        failed += 1;

        results.push({
          studentId,
          status: "Failed",
          error: "Student information is incomplete.",
        });

        continue;
      }

      const finalLessonDate = schedule.final_lesson.slice(0, 10);
      const [finalYear, finalMonth, finalDay] =
        finalLessonDate.split("-").map(Number);

      const openingDate = new Date(
        Date.UTC(finalYear, finalMonth - 1, finalDay + 1)
      );

      const openingDateKey = openingDate
        .toISOString()
        .slice(0, 10);

      const brisbaneParts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Australia/Brisbane",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        hourCycle: "h23",
      }).formatToParts(new Date());

      const getPart = (type: string) =>
        brisbaneParts.find((part) => part.type === type)?.value ?? "";

      const brisbaneDateKey =
        `${getPart("year")}-${getPart("month")}-${getPart("day")}`;

      const brisbaneHour = Number(getPart("hour"));

      const openingNotReached =
        brisbaneDateKey < openingDateKey ||
        (brisbaneDateKey === openingDateKey && brisbaneHour < 8);

      if (openingNotReached) {
        skipped += 1;

        results.push({
          studentId,
          studentName,
          status: "Skipped",
          reason:
            "Re-enrolment opening time has not been reached.",
        });

        continue;
      }

      const { data: parent, error: parentError } =
        await supabaseServer
          .from("parents")
          .select(`
            parent1_name,
            parent2_name,
            email
          `)
          .eq("student_id", studentId)
          .maybeSingle();

      if (parentError || !parent?.email) {
        failed += 1;

        results.push({
          studentId,
          studentName,
          status: "Failed",
          error:
            parentError?.message ??
            "Parent email not found.",
        });

        continue;
      }

      const auditBusinessEvent =
        `${BUSINESS_EVENT}_${academicYear}_T${term}`;

      const { data: existingAudit, error: auditQueryError } =
        await supabaseServer
          .from("email_audit_logs")
          .select("id")
          .eq("business_event", auditBusinessEvent)
          .eq("student_id", studentId)
          .eq("status", "Success")
          .limit(1);

      if (auditQueryError) {
        failed += 1;

        results.push({
          studentId,
          studentName,
          status: "Failed",
          error: auditQueryError.message,
        });

        continue;
      }

      if (existingAudit && existingAudit.length > 0) {
        skipped += 1;

        results.push({
          studentId,
          studentName,
          status: "Skipped",
          reason: "Already sent.",
        });

        continue;
      }

      const variables = {
        "Parent Name":
          parent.parent1_name ||
          parent.parent2_name ||
          "Parent",
        "Student Name": studentName,
        "Re-enrolment / Parent Portal Link":
          "https://queenslandchessschool.com.au/parent/reenrolment",
        "Holiday Training Camp Registration Link":
          "https://docs.google.com/forms/d/e/1FAIpQLSeJdcgIU9Q2aqaIw3hrFb9NQWPbY_KoSBWbfcBGgyP4NKknDg/viewform",
      };

      try {
        const email = await getRenderedEmailTemplate({
          businessEvent: BUSINESS_EVENT,
          variables,
        });

        const result = await sendEmail({
          to: parent.email,
          subject: email.subject,
          html: email.body,
        });

        await logEmailAudit({
          businessEvent: auditBusinessEvent,
          templateName: email.templateName,
          recipientEmail: parent.email,
          studentId,
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
            studentId,
            studentName,
            status: "Failed",
            error: String(
              result.error ?? "Email sending failed"
            ),
          });

          continue;
        }

        sent += 1;

        results.push({
          studentId,
          studentName,
          status: "Sent",
        });
      } catch (error) {
        failed += 1;

        await logEmailAudit({
          businessEvent: auditBusinessEvent,
          recipientEmail: parent.email,
          studentId,
          dataUsed: variables,
          status: "Failed",
          errorMessage: String(error),
        });

        results.push({
          studentId,
          studentName,
          status: "Failed",
          error: String(error),
        });
      }
    }

    return NextResponse.json({
      success: true,
      academicYear,
      term,
      total: enrolments?.length ?? 0,
      sent,
      skipped,
      failed,
      results,
    });
  } catch (error) {
    console.error(
      "REENROLMENT OPENING CRON EXCEPTION:",
      error
    );

    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 500 }
    );
  }

  const authorization = request.headers.get("authorization");

  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  const academicYear = Number(
    process.env.REENROLMENT_ACADEMIC_YEAR
  );

  const term = Number(process.env.REENROLMENT_TERM);

  if (
    !Number.isInteger(academicYear) ||
    !Number.isInteger(term) ||
    !["1", "2", "3", "4"].includes(String(term))
  ) {
    return NextResponse.json(
      {
        error:
          "Valid REENROLMENT_ACADEMIC_YEAR and REENROLMENT_TERM are required.",
      },
      { status: 500 }
    );
  }

  const internalRequest = new Request(request.url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${cronSecret}`,
    },
    body: JSON.stringify({
      academicYear,
      term,
      confirm: "SEND",
    }),
  });

  return POST(internalRequest);
}