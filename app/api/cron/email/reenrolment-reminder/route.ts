import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";
import { getRenderedEmailTemplate } from "@/lib/email/templateService";
import { sendEmail } from "@/lib/email/emailService";
import { logEmailAudit } from "@/lib/email/emailAudit";

const BUSINESS_EVENT = "REENROLMENT_REMINDER";
const PORTAL_LINK =
  "https://queenslandchessschool.com.au/parent/reenrolment";

function getBrisbaneDateKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Brisbane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function subtractDays(dateKey: string, days: number): string | null {
  const parts = dateKey.split("-").map(Number);

  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return null;
  }

  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year, month - 1, day - days));

  return date.toISOString().slice(0, 10);
}

function getStudentName(student: {
  first_name?: string | null;
  last_name?: string | null;
} | null): string {
  return [student?.first_name, student?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim() || "Student";
}

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
      term < 1 ||
      term > 4
    ) {
      return NextResponse.json(
        {
          error:
            "academicYear must be an integer and term must be between 1 and 4.",
        },
        { status: 400 }
      );
    }

    if (confirm !== "SEND") {
      return NextResponse.json(
        {
          error:
            'Confirmation required. Set confirm to "SEND" to process emails.',
        },
        { status: 400 }
      );
    }

    const currentAcademicYear = term === 1
      ? academicYear - 1
      : academicYear;

    const currentTerm = term === 1 ? 4 : term - 1;

    const currentDateKey = getBrisbaneDateKey();

    const { data: currentEnrolments, error: enrolmentError } =
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
            last_name
          )
        `)
        .eq("academic_year", currentAcademicYear)
        .eq("term", currentTerm)
        .eq("status", "Active")
        .eq("is_trial", false)
        .order("student_id");

    if (enrolmentError) {
      return NextResponse.json(
        {
          error: `Failed to load current enrolments: ${enrolmentError.message}`,
        },
        { status: 500 }
      );
    }

    if (!currentEnrolments || currentEnrolments.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No current enrolments found.",
        academicYear,
        term,
        currentDateKey,
        processed: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
      });
    }

    const studentIds = currentEnrolments.map(
      (enrolment) => enrolment.student_id
    );

    const { data: recommendations, error: recommendationError } =
      await supabaseServer
        .from("re_enrolment_recommendations")
        .select(`
          student_id,
          academic_year,
          term,
          recommended_class_id
        `)
        .in("student_id", studentIds)
        .eq("academic_year", academicYear)
        .eq("term", term);

    if (recommendationError) {
      return NextResponse.json(
        {
          error:
            `Failed to load recommendations: ${recommendationError.message}`,
        },
        { status: 500 }
      );
    }

    const recommendationMap = new Map<string, string>();

    for (const recommendation of recommendations ?? []) {
      if (recommendation.recommended_class_id) {
        recommendationMap.set(
          recommendation.student_id,
          recommendation.recommended_class_id
        );
      }
    }

    const targetClassIds = Array.from(
      new Set(
        currentEnrolments
          .map(
            (enrolment) =>
              recommendationMap.get(enrolment.student_id) ??
              enrolment.class_id
          )
          .filter(Boolean)
      )
    );

    const { data: targetSchedules, error: scheduleError } =
      await supabaseServer
        .from("class_schedule")
        .select(`
          class_id,
          academic_year,
          term,
          first_lesson,
          final_lesson,
          status
        `)
        .in("class_id", targetClassIds)
        .eq("academic_year", academicYear)
        .eq("term", term)
        .eq("status", "Active");

    if (scheduleError) {
      return NextResponse.json(
        {
          error: `Failed to load target schedules: ${scheduleError.message}`,
        },
        { status: 500 }
      );
    }

    const scheduleMap = new Map<string, {
      first_lesson: string | null;
      final_lesson: string | null;
    }>();

    for (const schedule of targetSchedules ?? []) {
      scheduleMap.set(schedule.class_id, {
        first_lesson: schedule.first_lesson,
        final_lesson: schedule.final_lesson,
      });
    }

    const { data: submissions, error: submissionError } =
      await supabaseServer
        .from("re_enrolment_submissions")
        .select(`
          student_id,
          academic_year,
          term,
          status
        `)
        .in("student_id", studentIds)
        .eq("academic_year", academicYear)
        .eq("term", term)
        .neq("status", "Cancelled");

    if (submissionError) {
      return NextResponse.json(
        {
          error:
            `Failed to load re-enrolment submissions: ${submissionError.message}`,
        },
        { status: 500 }
      );
    }

    const completedStudentIds = new Set(
      (submissions ?? [])
        .filter(
          (submission) =>
            submission.status === "Completed" ||
            submission.status === "Submitted"
        )
        .map((submission) => submission.student_id)
    );

    const { data: targetEnrolments, error: targetEnrolmentError } =
      await supabaseServer
        .from("student_enrolments")
        .select(`
          student_id,
          academic_year,
          term,
          status,
          is_trial
        `)
        .in("student_id", studentIds)
        .eq("academic_year", academicYear)
        .eq("term", term)
        .eq("status", "Active")
        .eq("is_trial", false);

    if (targetEnrolmentError) {
      return NextResponse.json(
        {
          error:
            `Failed to load target enrolments: ${targetEnrolmentError.message}`,
        },
        { status: 500 }
      );
    }

    const enrolledStudentIds = new Set(
      (targetEnrolments ?? []).map(
        (enrolment) => enrolment.student_id
      )
    );

    const { data: parents, error: parentError } = await supabaseServer
      .from("parents")
      .select(`
        student_id,
        parent1_name,
        parent2_name,
        email
      `)
      .in("student_id", studentIds);

    if (parentError) {
      return NextResponse.json(
        {
          error: `Failed to load parents: ${parentError.message}`,
        },
        { status: 500 }
      );
    }

    const parentMap = new Map<string, {
      parent1_name: string | null;
      parent2_name: string | null;
      email: string | null;
    }>();

    for (const parent of parents ?? []) {
      parentMap.set(parent.student_id, {
        parent1_name: parent.parent1_name,
        parent2_name: parent.parent2_name,
        email: parent.email,
      });
    }

    const auditBusinessEvent =
      `${BUSINESS_EVENT}_${academicYear}_T${term}`;

    let processed = 0;
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    const results: Array<Record<string, unknown>> = [];

    for (const enrolment of currentEnrolments) {
      processed += 1;

      const studentId = enrolment.student_id;
      const student = Array.isArray(enrolment.students)
        ? enrolment.students[0]
        : enrolment.students;

      const studentName = getStudentName(student);
      const parent = parentMap.get(studentId);

      if (completedStudentIds.has(studentId)) {
        skipped += 1;
        results.push({
          studentId,
          studentName,
          status: "Skipped",
          reason: "Already submitted or completed",
        });
        continue;
      }

      if (enrolledStudentIds.has(studentId)) {
        skipped += 1;
        results.push({
          studentId,
          studentName,
          status: "Skipped",
          reason: "Already enrolled in target term",
        });
        continue;
      }

      if (!parent?.email) {
        skipped += 1;
        results.push({
          studentId,
          studentName,
          status: "Skipped",
          reason: "Parent email not found",
        });
        continue;
      }

      const targetClassId =
        recommendationMap.get(studentId) ?? enrolment.class_id;

      const targetSchedule = targetClassId
        ? scheduleMap.get(targetClassId)
        : null;

      const firstLesson = targetSchedule?.first_lesson ?? null;
      const firstLessonDate = firstLesson
        ? firstLesson.slice(0, 10)
        : null;

      if (!firstLessonDate) {
        skipped += 1;
        results.push({
          studentId,
          studentName,
          status: "Skipped",
          reason: "Target first lesson date not found",
        });
        continue;
      }

      const reminderDate = subtractDays(firstLessonDate, 7);

      if (!reminderDate) {
        skipped += 1;
        results.push({
          studentId,
          studentName,
          status: "Skipped",
          reason: "Invalid first lesson date",
        });
        continue;
      }

      if (currentDateKey !== reminderDate) {
        skipped += 1;
        results.push({
          studentId,
          studentName,
          status: "Skipped",
          reason: "Reminder date not reached",
          reminderDate,
          currentDateKey,
        });
        continue;
      }

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
          reason: `Audit lookup failed: ${auditQueryError.message}`,
        });
        continue;
      }

      if (existingAudit && existingAudit.length > 0) {
        skipped += 1;
        results.push({
          studentId,
          studentName,
          status: "Skipped",
          reason: "Reminder already sent",
        });
        continue;
      }

      const variables = {
        "Parent Name":
          parent.parent1_name ||
          parent.parent2_name ||
          "Parent",
        "Student Name": studentName,
        "Re-enrolment / Parent Portal Link": PORTAL_LINK,
        "First Lesson Date of Next Term": firstLessonDate,
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
          recipientEmail: parent.email,
          studentId,
          dataUsed: variables,
          status: "Failed",
          errorMessage,
        });

        failed += 1;
        results.push({
          studentId,
          studentName,
          status: "Failed",
          reason: errorMessage,
        });
        continue;
      }

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
          reason: String(result.error ?? "Email sending failed"),
        });
        continue;
      }

      sent += 1;
      results.push({
        studentId,
        studentName,
        status: "Sent",
        email: parent.email,
        firstLessonDate,
        reminderDate,
      });
    }

    return NextResponse.json({
      success: true,
      businessEvent: auditBusinessEvent,
      academicYear,
      term,
      currentAcademicYear,
      currentTerm,
      currentDateKey,
      processed,
      sent,
      skipped,
      failed,
      results,
    });
  } catch (error) {
    console.error(
      "REENROLMENT REMINDER CRON EXCEPTION:",
      error
    );

    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}