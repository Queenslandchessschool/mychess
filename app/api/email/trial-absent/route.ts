
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabaseServer";
import { getRenderedEmailTemplate } from "@/lib/email/templateService";
import { sendEmail } from "@/lib/email/emailService";
import { logEmailAudit } from "@/lib/email/emailAudit";

export const dynamic = "force-dynamic";

const BUSINESS_EVENT = "TRIAL_ABSENT";
const ATTEMPT_STARTED = "SEND_ATTEMPT_STARTED:";
const OUTCOME_UNKNOWN = "SEND_ATTEMPT_OUTCOME_UNKNOWN:";

const authClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

function formatTrialDate(
  value: string | null | undefined
): string {
  if (!value) return "";

  const date = new Date(`${value}T12:00:00+10:00`);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Australia/Brisbane",
  });
}

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired session." },
        { status: 401 }
      );
    }

    const { data: roleRecord, error: roleError } =
      await supabaseServer
        .from("user_roles")
        .select("role")
        .eq("auth_user_id", user.id)
        .maybeSingle();

    if (roleError) {
      console.error("Trial Absent role lookup failed:", roleError);
      return NextResponse.json(
        { error: "Unable to verify administrator access." },
        { status: 500 }
      );
    }

    if (roleRecord?.role !== "admin") {
      return NextResponse.json(
        { error: "Administrator access required." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const enrollmentId =
      typeof body?.enrollmentId === "string"
        ? body.enrollmentId.trim()
        : "";
    const attendanceId =
      typeof body?.attendanceId === "string"
        ? body.attendanceId.trim()
        : "";

    if (!enrollmentId || !attendanceId) {
      return NextResponse.json(
        { error: "enrollmentId and attendanceId are required." },
        { status: 400 }
      );
    }

    const { data: enrollment, error: enrollmentError } =
      await supabaseServer
        .from("student_enrolments")
        .select(
          "id, student_id, class_id, academic_year, term, is_trial, status"
        )
        .eq("id", enrollmentId)
        .maybeSingle();

    if (enrollmentError) throw enrollmentError;

    if (!enrollment || enrollment.is_trial !== true) {
      return NextResponse.json(
        { error: "Trial enrolment not found." },
        { status: 404 }
      );
    }

    if (enrollment.status !== "Active") {
      return NextResponse.json(
        { error: "This Trial enrolment is not active." },
        { status: 409 }
      );
    }

    const { data: attendance, error: attendanceError } =
      await supabaseServer
        .from("attendance")
        .select(
          "id, student_id, attendance_status, attendance_type, lesson_id"
        )
        .eq("id", attendanceId)
        .eq("student_id", enrollment.student_id)
        .maybeSingle();

    if (attendanceError) throw attendanceError;

    if (
      !attendance ||
      attendance.attendance_status !== "Absent" ||
      attendance.attendance_type !== "Trial"
    ) {
      return NextResponse.json(
        {
          error:
            "The selected attendance record is not an Absent Trial record for this student.",
        },
        { status: 409 }
      );
    }

    if (!attendance.lesson_id) {
      return NextResponse.json(
        { error: "The attendance record has no linked lesson." },
        { status: 409 }
      );
    }

    const { data: lesson, error: lessonError } =
      await supabaseServer
        .from("lessons")
        .select("id, lesson_date, class_id, academic_year, term")
        .eq("id", attendance.lesson_id)
        .maybeSingle();

    if (lessonError) throw lessonError;

    if (!lesson || !lesson.lesson_date) {
      return NextResponse.json(
        { error: "The linked lesson or its date was not found." },
        { status: 409 }
      );
    }

    if (
      lesson.class_id !== enrollment.class_id ||
      Number(lesson.academic_year) !== Number(enrollment.academic_year) ||
      String(lesson.term) !== String(enrollment.term)
    ) {
      return NextResponse.json(
        {
          error:
            "The absent lesson does not match this enrolment's class, academic year and term.",
        },
        { status: 409 }
      );
    }

    const auditEvent = `${BUSINESS_EVENT}_${attendance.id}`;

    const { data: previousLogs, error: auditLookupError } =
      await supabaseServer
        .from("email_audit_logs")
        .select("id, status, error_message")
        .eq("business_event", auditEvent);

    if (auditLookupError) throw auditLookupError;

    const logs = previousLogs ?? [];

    if (logs.some((entry) => entry.status === "Success")) {
      return NextResponse.json(
        {
          error:
            "An Absent Reminder has already been recorded as successful for this attendance record.",
        },
        { status: 409 }
      );
    }

    if (
      logs.some(
        (entry) =>
          typeof entry.error_message === "string" &&
          (entry.error_message.startsWith(ATTEMPT_STARTED) ||
            entry.error_message.startsWith(OUTCOME_UNKNOWN))
      )
    ) {
      return NextResponse.json(
        {
          error:
            "A previous send attempt may have delivered the email. Check Email Audit Log before trying again.",
        },
        { status: 409 }
      );
    }

    const { data: student, error: studentError } =
      await supabaseServer
        .from("students")
        .select("first_name, preferred_name, last_name")
        .eq("id", enrollment.student_id)
        .maybeSingle();

    if (studentError) throw studentError;

    if (!student) {
      return NextResponse.json(
        { error: "Student record not found." },
        { status: 404 }
      );
    }

    const { data: parent, error: parentError } =
      await supabaseServer
        .from("parents")
        .select("parent1_name, email")
        .eq("student_id", enrollment.student_id)
        .maybeSingle();

    if (parentError) throw parentError;

    if (!parent?.email) {
      return NextResponse.json(
        { error: "Parent email address not found." },
        { status: 409 }
      );
    }

    const studentName =
      String(student.preferred_name ?? "").trim() ||
      `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim();

    if (!studentName) {
      return NextResponse.json(
        { error: "Student name is missing." },
        { status: 409 }
      );
    }

    const variables = {
      "Parent Name": String(parent.parent1_name ?? "Parent"),
      "Student Name": studentName,
      "Trial Date": formatTrialDate(lesson.lesson_date),
    };

    const email = await getRenderedEmailTemplate({
      businessEvent: BUSINESS_EVENT,
      variables,
    });

    const attempt = await logEmailAudit({
      businessEvent: auditEvent,
      triggeredBy: user.id,
      recipientEmail: String(parent.email),
      studentId: enrollment.student_id,
      parentId: null,
      enrollmentId: enrollment.id,
      dataUsed: variables,
      status: "Failed",
      errorMessage:
        `${ATTEMPT_STARTED} delivery outcome not yet confirmed`,
    });

    if (!attempt.success || !attempt.auditId) {
      return NextResponse.json(
        {
          error:
            "Could not record the send attempt. No email was sent.",
        },
        { status: 500 }
      );
    }

    try {
      await sendEmail({
        to: String(parent.email),
        subject: email.subject,
        html: email.body,
      });
    } catch (sendError) {
      const message =
        sendError instanceof Error
          ? sendError.message
          : String(sendError);

      const { error: updateError } = await supabaseServer
        .from("email_audit_logs")
        .update({
          error_message: `${OUTCOME_UNKNOWN} ${message}`,
        })
        .eq("id", attempt.auditId);

      if (updateError) {
        console.error(
          "Unable to update Trial Absent audit after send error:",
          updateError
        );
      }

      return NextResponse.json(
        {
          error:
            "Email delivery could not be confirmed. Check Email Audit Log before trying again.",
        },
        { status: 502 }
      );
    }

    const { error: finalizeError } = await supabaseServer
      .from("email_audit_logs")
      .update({
        status: "Success",
        error_message: null,
      })
      .eq("id", attempt.auditId);

    if (finalizeError) {
      console.error(
        "Trial Absent email sent, but audit finalization failed:",
        finalizeError
      );

      return NextResponse.json(
        {
          error:
            "The email may have been sent, but its audit record could not be finalized. Check Email Audit Log before trying again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Trial Absent Reminder sent successfully.",
    });
  } catch (error) {
    console.error("Trial Absent email error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      { status: 500 }
    );
  }
}
