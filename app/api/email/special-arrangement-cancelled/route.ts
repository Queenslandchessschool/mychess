
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";
import { getRenderedEmailTemplate } from "@/lib/email/templateService";
import { sendEmail } from "@/lib/email/emailService";
import { logEmailAudit } from "@/lib/email/emailAudit";

const BUSINESS_EVENT = "SPECIAL_ARRANGEMENT_CANCELLED";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const enrollmentId = String(body.enrollmentId ?? "").trim();
    const myChessLoginUrl = String(body.myChessLoginUrl ?? "/login");

    if (!enrollmentId) {
      return NextResponse.json(
        { error: "enrollmentId is required." },
        { status: 400 }
      );
    }

    const { data: enrollment, error: enrollmentError } =
      await supabaseServer
        .from("student_enrolments")
        .select(
          `
          id,
          student_id,
          students:student_id (
            id,
            first_name,
            last_name,
            preferred_name
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

    const student = Array.isArray(enrollment.students)
      ? enrollment.students[0]
      : enrollment.students;

    if (!student) {
      return NextResponse.json(
        { error: "Student record not found." },
        { status: 500 }
      );
    }

    const { data: parent, error: parentError } = await supabaseServer
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

    const parentName =
      parent.parent1_name ||
      parent.parent2_name ||
      "Parent";

    const variables = {
      "Parent Name": String(parentName),
      "Student Name": String(studentName),
      "MyCHESS Login URL": myChessLoginUrl,
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
      "SPECIAL ARRANGEMENT CANCELLED EMAIL EXCEPTION:",
      error
    );

    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}