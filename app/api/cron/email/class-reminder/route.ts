import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";
import { getRenderedEmailTemplate } from "@/lib/email/templateService";
import { sendEmail } from "@/lib/email/emailService";
import { logEmailAudit } from "@/lib/email/emailAudit";

const BUSINESS_EVENT = "CLASS_REMINDER";
const PORTAL_LINK =
  "https://queenslandchessschool.com.au/parent/reenrolment";

type Student = {
  first_name: string | null;
  last_name: string | null;
};

type Enrolment = {
  id: string;
  student_id: string;
  class_id: string;
  academic_year: number;
  term: number;
  status: string;
  is_trial: boolean;
  students: Student | Student[] | null;
};

type Parent = {
  student_id: string;
  parent1_name: string | null;
  parent2_name: string | null;
  email: string | null;
};

type Schedule = {
  class_id: string;
  first_lesson: string | null;
  final_lesson: string | null;
};

type Submission = {
  student_id: string;
  status: string | null;
};

function getBrisbaneDateKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Brisbane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getBrisbaneHour(): number {
  const hour = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Brisbane",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(new Date());

  return Number(hour);
}

function addDays(dateKey: string, days: number): string | null {
  const parts = dateKey.split("-").map(Number);

  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return null;
  }

  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return date.toISOString().slice(0, 10);
}

function getStudentName(
  student: Student | Student[] | null
): string {
  const item = Array.isArray(student) ? student[0] : student;

  return (
    [item?.first_name, item?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || "Student"
  );
}

function getParentName(parent: Parent): string {
  return (
    parent.parent1_name ||
    parent.parent2_name ||
    "Parent"
  );
}

function getSpecialRequestConfirmation(
  specialRequests: unknown
): string {
  if (
    !specialRequests ||
    typeof specialRequests !== "object" ||
    Array.isArray(specialRequests)
  ) {
    return "";
  }

  const requests = specialRequests as Record<string, unknown>;

  const requestLabels: Record<string, string> = {
    classroom_pickup: "Classroom pickup",
    ymca_dropoff: "YMCA drop-off",
    walk_home: "Walk home",
  };

  const selectedRequests = Object.entries(requestLabels)
    .filter(([key]) => requests[key] === true)
    .map(([, label]) => `- ${label}`);

  if (selectedRequests.length === 0) {
    return "";
  }

  return [
    "Your special request(s) have been arranged as below:",
    "",
    ...selectedRequests,
  ].join("\n");
}

function getReenrolmentReminder(
  studentName: string,
  completed: boolean
): string {
  if (completed) {
    return "";
  }

  return [
    `If you have not yet completed ${studentName}'s re-enrolment, please visit the MyCHESS Parent Portal:`,
    "",
    PORTAL_LINK,
    "",
    "We encourage you to complete the re-enrolment process as soon as possible.",
  ].join("\n");
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

    const currentDateKey = getBrisbaneDateKey();
    const currentHour = getBrisbaneHour();

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
            last_name
          )
        `)
        .eq("academic_year", academicYear)
        .eq("term", term)
        .eq("status", "Active")
        .eq("is_trial", false)
        .order("class_id")
        .order("student_id");

    if (enrolmentError) {
      return NextResponse.json(
        {
          error:
            `Failed to load target enrolments: ${enrolmentError.message}`,
        },
        { status: 500 }
      );
    }

    const activeEnrolments = (enrolments ?? []) as Enrolment[];

    if (activeEnrolments.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active formal enrolments found.",
        academicYear,
        term,
        currentDateKey,
        currentHour,
        processed: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
      });
    }

    const studentIds = activeEnrolments.map(
      (enrolment) => enrolment.student_id
    );

    const classIds = Array.from(
      new Set(
        activeEnrolments
          .map((enrolment) => enrolment.class_id)
          .filter(Boolean)
      )
    );

    const [
      scheduleResult,
      parentResult,
      submissionResult,
    ] = await Promise.all([
      supabaseServer
        .from("class_schedule")
        .select(`
          class_id,
          first_lesson,
          final_lesson
        `)
        .in("class_id", classIds)
        .eq("academic_year", academicYear)
        .eq("term", term)
        .eq("status", "Active"),

      supabaseServer
        .from("parents")
        .select(`
          student_id,
          parent1_name,
          parent2_name,
          email
        `)
        .in("student_id", studentIds),

      supabaseServer
        .from("re_enrolment_submissions")
        .select(`
          student_id,
          status
        `)
        .in("student_id", studentIds)
        .eq("academic_year", academicYear)
        .eq("term", term)
        .neq("status", "Cancelled"),
    ]);

    if (scheduleResult.error) {
      return NextResponse.json(
        {
          error:
            `Failed to load class schedules: ${scheduleResult.error.message}`,
        },
        { status: 500 }
      );
    }

    if (parentResult.error) {
      return NextResponse.json(
        {
          error:
            `Failed to load parents: ${parentResult.error.message}`,
        },
        { status: 500 }
      );
    }

    if (submissionResult.error) {
      return NextResponse.json(
        {
          error:
            `Failed to load submissions: ${submissionResult.error.message}`,
        },
        { status: 500 }
      );
    }

    const schedules = (scheduleResult.data ?? []) as Schedule[];
    const parents = (parentResult.data ?? []) as Parent[];
    const submissions = (submissionResult.data ?? []) as Submission[];

    const scheduleMap = new Map<string, Schedule>();

    for (const schedule of schedules) {
      scheduleMap.set(schedule.class_id, schedule);
    }

    const parentMap = new Map<string, Parent>();

    for (const parent of parents) {
      parentMap.set(parent.student_id, parent);
    }

    const completedStudentIds = new Set(
      submissions
        .filter(
          (submission) =>
            submission.status === "Submitted" ||
            submission.status === "Completed"
        )
        .map((submission) => submission.student_id)
    );

    const auditBusinessEvent =
      `${BUSINESS_EVENT}_${academicYear}_T${term}`;

    let processed = 0;
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    const results: Array<Record<string, unknown>> = [];

    for (const enrolment of activeEnrolments) {
      processed += 1;

      const studentId = enrolment.student_id;
      const studentName = getStudentName(enrolment.students);

      if (completedStudentIds.has(studentId)) {
        skipped += 1;

        results.push({
          studentId,
          studentName,
          status: "Skipped",
          reason: "Re-enrolment already submitted or completed",
        });

        continue;
      }

      const parent = parentMap.get(studentId);

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

      const schedule = scheduleMap.get(enrolment.class_id);
      const firstLesson = schedule?.first_lesson ?? null;
      const firstLessonDate = firstLesson
        ? firstLesson.slice(0, 10)
        : null;

      if (!firstLessonDate) {
        skipped += 1;

        results.push({
          studentId,
          studentName,
          status: "Skipped",
          reason: "First lesson date not found",
        });

        continue;
      }

      const reminderDate = addDays(firstLessonDate, -1);

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

      if (
        currentDateKey !== reminderDate ||
        currentHour < 12
      ) {
        skipped += 1;

        results.push({
          studentId,
          studentName,
          status: "Skipped",
          reason: "Class reminder time not reached",
          firstLessonDate,
          reminderDate,
          currentDateKey,
          currentHour,
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
          reason:
            `Audit lookup failed: ${auditQueryError.message}`,
        });

        continue;
      }

      if (existingAudit && existingAudit.length > 0) {
        skipped += 1;

        results.push({
          studentId,
          studentName,
          status: "Skipped",
          reason: "Class reminder already sent",
        });

        continue;
      }

      const specialRequests = {};
      const specialRequestConfirmation =
        getSpecialRequestConfirmation(specialRequests);

      const reenrolmentReminder = getReenrolmentReminder(
        studentName,
        completedStudentIds.has(studentId)
      );

      const variables = {
        "Parent Name": getParentName(parent),
        "Academic Term": `Term ${term}, ${academicYear}`,
        "Student Name": studentName,
        "First Lesson Date of Next Term": firstLessonDate,
        "Special Request Confirmation":
          specialRequestConfirmation,
        "Re-enrolment Reminder": reenrolmentReminder,
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
          reason: String(
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
      currentDateKey,
      currentHour,
      processed,
      sent,
      skipped,
      failed,
      results,
    });
  } catch (error) {
    console.error(
      "CLASS REMINDER CRON EXCEPTION:",
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