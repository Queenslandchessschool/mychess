
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabaseServer";
import { getRenderedEmailTemplate } from "@/lib/email/templateService";
import { sendEmail } from "@/lib/email/emailService";
import { logEmailAudit } from "@/lib/email/emailAudit";

export const dynamic = "force-dynamic";

const BUSINESS_EVENT = "PAYMENT_RECEIVED_PLACE_CONFIRMED";

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

    // 2. Verify administrator role.
    const { data: roleRecord, error: roleError } =
      await supabaseServer
        .from("user_roles")
        .select("role")
        .eq("auth_user_id", user.id)
        .maybeSingle();

    if (roleError) {
      console.error(
        "Payment confirmation email role lookup failed:",
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

    // 3. Read and validate the request body.
    let body: { enrollmentId?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "A valid JSON request body is required." },
        { status: 400 }
      );
    }

    const enrollmentId =
      typeof body.enrollmentId === "string"
        ? body.enrollmentId.trim()
        : "";

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        enrollmentId
      )
    ) {
      return NextResponse.json(
        { error: "A valid enrollmentId is required." },
        { status: 400 }
      );
    }

    // 4. Load the existing enrollment.
    const { data: enrollment, error: enrollmentError } =
      await supabaseServer
        .from("student_enrolments")
        .select(
          `
          id,
          student_id,
          class_id,
          academic_year,
          term,
          payment_status,
          amount_payable,
          students:student_id (
            id,
            first_name,
            last_name,
            preferred_name
          ),
          classes:class_id (
            id,
            campus_id,
            level,
            class_suffix,
            day,
            start_time,
            end_time,
            campus:campuses (
              campus_name,
              campus_code,
              short_name
            )
          )
        `
        )
        .eq("id", enrollmentId)
        .maybeSingle();

    if (enrollmentError) {
      throw new Error(
        `Failed to load enrolment: ${enrollmentError.message}`
      );
    }

    if (!enrollment) {
      return NextResponse.json(
        { error: "Enrolment not found." },
        { status: 404 }
      );
    }

    if (enrollment.payment_status !== "Paid") {
      return NextResponse.json(
        {
          error:
            "This enrolment payment has not been marked as Paid.",
        },
        { status: 409 }
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

    if (!campus) {
      return NextResponse.json(
        { error: "Campus record not found." },
        { status: 500 }
      );
    }

    // 5. Load the parent recipient.
    const { data: parent, error: parentError } =
      await supabaseServer
        .from("parents")
        .select(
          `
          id,
          parent1_name,
          parent2_name,
          email,
          mobile
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

    const studentName =
      student.preferred_name ||
      `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim();

    const className = String(classData.level ?? "");

    const tuitionFee = `$${Number(
      enrollment.amount_payable ?? 0
    ).toFixed(2)}`;

    const variables = {
      "Parent Name": String(parent.parent1_name ?? ""),
      "Student Name": studentName,
      "Academic Year": String(enrollment.academic_year ?? ""),
      "Term": String(enrollment.term ?? ""),
      "Class Name": className,
      "Class Day": String(classData.day ?? ""),
      "Class Start Time": formatTime(classData.start_time),
      "Class End Time": formatTime(classData.end_time),
      "Campus Name": String(campus.campus_name ?? ""),
      "Tuition Fee": tuitionFee,
    };

    // 6. Render the existing email template.
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

    // 7. Send the email and record the audit result.
    const result = await sendEmail({
      to: String(parent.email),
      subject: email.subject,
      html: email.body,
    });

    await logEmailAudit({
      businessEvent: BUSINESS_EVENT,
      templateName: email.templateName,
      recipientEmail: String(parent.email),
      studentId: enrollment.student_id,
      enrollmentId: enrollment.id,
      dataUsed: variables,
      status: result.success ? "Success" : "Failed",
      messageId: result.messageId ?? null,
      errorMessage: result.success
        ? null
        : String(result.error ?? "Email sending failed"),
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: String(
            result.error ?? "Email sending failed"
          ),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      templateName: email.templateName,
      enrollmentId: enrollment.id,
    });
  } catch (error) {
    console.error(
      "PAYMENT RECEIVED PLACE CONFIRMED EMAIL EXCEPTION:",
      error
    );

    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
