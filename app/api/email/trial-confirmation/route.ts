
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getRenderedEmailTemplate } from "@/lib/email/templateService";
import { sendEmail } from "@/lib/email/emailService";
import { logEmailAudit } from "@/lib/email/emailAudit";

const BUSINESS_EVENT = "TRIAL_CONFIRMED";

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

function formatDate(value: string | null | undefined): string {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Australia/Brisbane",
  });
}

function formatTime(value: string | null | undefined): string {
  if (!value) return "";
  return String(value).slice(0, 5);
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate the request.
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

    // 2. Verify the Admin role.
    const { data: roleRecord, error: roleError } =
      await supabaseServer
        .from("user_roles")
        .select("role")
        .eq("auth_user_id", user.id)
        .maybeSingle();

    if (roleError) {
      console.error(
        "Trial confirmation role lookup failed:",
        roleError
      );

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

    // 3. Validate the request.
    const body = await request.json();
    const enrollmentId = String(body.enrollmentId ?? "").trim();

    if (!enrollmentId) {
      return NextResponse.json(
        { error: "enrollmentId is required." },
        { status: 400 }
      );
    }

    // 4. Load the Trial enrolment.
    const { data: enrollment, error: enrollmentError } =
      await supabaseServer
        .from("student_enrolments")
        .select(
          `
          id,
          student_id,
          class_id,
          join_date,
          is_trial,
          students:student_id (
            first_name,
            last_name,
            preferred_name
          ),
          classes:class_id (
            level,
            start_time,
            end_time,
            campus:campuses (
              campus_name,
              address,
              campus_code,
              short_name
            ),
            coach:coaches (
              display_name,
              first_name,
              last_name
            )
          )
        `
        )
        .eq("id", enrollmentId)
        .maybeSingle();

    if (enrollmentError) {
      throw new Error(
        `Failed to load trial enrolment: ${enrollmentError.message}`
      );
    }

    if (!enrollment) {
      return NextResponse.json(
        { error: "Enrolment not found." },
        { status: 404 }
      );
    }

    if (!enrollment.is_trial) {
      return NextResponse.json(
        { error: "This enrolment is not a trial enrolment." },
        { status: 400 }
      );
    }

    const student = Array.isArray(enrollment.students)
      ? enrollment.students[0]
      : enrollment.students;

    const classData = Array.isArray(enrollment.classes)
      ? enrollment.classes[0]
      : enrollment.classes;

    if (!student) {
      return NextResponse.json(
        { error: "Student record not found." },
        { status: 500 }
      );
    }

    if (!classData) {
      return NextResponse.json(
        { error: "Class record not found." },
        { status: 500 }
      );
    }

    const campus = Array.isArray(classData.campus)
      ? classData.campus[0]
      : classData.campus;

    const coach = Array.isArray(classData.coach)
      ? classData.coach[0]
      : classData.coach;

    // 5. Load the parent email.
    const { data: parent, error: parentError } =
      await supabaseServer
        .from("parents")
        .select(
          `
          parent1_name,
          email
        `
        )
        .eq("student_id", enrollment.student_id)
        .maybeSingle();

    if (parentError) {
      throw new Error(
        `Failed to load parent: ${parentError.message}`
      );
    }

    if (!parent?.email) {
      return NextResponse.json(
        { error: "Parent email not found." },
        { status: 500 }
      );
    }

    // 6. Prepare the email template variables.
    const studentName =
      student.preferred_name ||
      `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim();

    const campusName =
      campus?.campus_name ||
      campus?.short_name ||
      campus?.campus_code ||
      "";

    const campusAddress = campus?.address ?? "";

    const coachName =
      coach?.display_name ||
      `${coach?.first_name ?? ""} ${coach?.last_name ?? ""}`.trim();

    const className = String(classData.level ?? "");
    const trialDate = formatDate(enrollment.join_date);

    const trialTime = `${formatTime(classData.start_time)}${
      classData.end_time
        ? ` – ${formatTime(classData.end_time)}`
        : ""
    }`;

    const variables = {
      "Parent Name": String(parent.parent1_name ?? ""),
      "Student Name": studentName,
      "Class Name": className,
      "Campus Name": campusName,
      "Campus Address": campusAddress,
      "Trial Date": trialDate,
      "Trial Time": trialTime,
      "Coach Name": coachName,
      "Parent Email": String(parent.email),
    };

    // 7. Render the existing central email template.
    let email;

    try {
      email = await getRenderedEmailTemplate({
        businessEvent: BUSINESS_EVENT,
        variables,
      });
    } catch (error) {
      const errorMessage = String(error);

      await logEmailAudit({
        businessEvent: BUSINESS_EVENT,
        recipientEmail: String(parent.email),
        studentId: enrollment.student_id,
        enrollmentId: enrollment.id,
        dataUsed: variables,
        status: "Failed",
        errorMessage,
      });

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    // 8. Send the email and record the result.
    try {
      const sendResult = await sendEmail({
        to: String(parent.email),
        subject: email.subject,
        html: email.body,
      });

      await logEmailAudit({
        businessEvent: BUSINESS_EVENT,
        recipientEmail: String(parent.email),
        studentId: enrollment.student_id,
        enrollmentId: enrollment.id,
        dataUsed: variables,
        status: "Success",
        messageId: sendResult.messageId ?? null,
      });

      return NextResponse.json({
        success: true,
        message: "Trial confirmation email sent successfully.",
        messageId: sendResult.messageId ?? null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await logEmailAudit({
        businessEvent: BUSINESS_EVENT,
        recipientEmail: String(parent.email),
        studentId: enrollment.student_id,
        enrollmentId: enrollment.id,
        dataUsed: variables,
        status: "Failed",
        errorMessage,
      });

      console.error(
        "TRIAL CONFIRMATION EMAIL ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("TRIAL CONFIRMATION API ERROR:", error);

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
