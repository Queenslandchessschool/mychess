import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getRenderedEmailTemplate } from "@/lib/email/templateService";
import { sendEmail } from "@/lib/email/emailService";
import { logEmailAudit } from "@/lib/email/emailAudit";

const BUSINESS_EVENT = "PENDING_PAYMENT";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const enrollmentId = String(body.enrollmentId ?? "").trim();

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

    if (enrollment.payment_status === "Paid") {
      return NextResponse.json(
        {
          error:
            "This enrolment payment is already marked as Paid.",
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

    const { data: paymentSettings, error: paymentError } =
      await supabaseServer
        .from("payment_settings")
        .select(
          `
          account_name,
          bsb,
          account_number,
          payment_reference_instruction,
          payment_reference_example
        `
        )
        .eq("status", "Active")
        .maybeSingle();

    if (paymentError) {
      throw new Error(
        `Failed to load payment settings: ${paymentError.message}`
      );
    }

    if (!paymentSettings) {
      return NextResponse.json(
        { error: "No active payment settings found." },
        { status: 500 }
      );
    }

    const studentName =
      student.preferred_name ||
      `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim();

    const className = String(classData.level ?? "");

    const campusReference =
      String(
        campus.campus_code ??
          campus.short_name ??
          campus.campus_name ??
          ""
      ).trim();

    const classReference = className;

    const paymentReference =
      `${campusReference} ${classReference} ${studentName}`.trim();

    const tuitionFee = `$${Number(
      enrollment.amount_payable ?? 0
    ).toFixed(2)}`;

    const variables = {
      "Parent Name": String(parent.parent1_name ?? ""),
      "Student Name": studentName,
      "Academic Year": String(enrollment.academic_year ?? ""),
      "Term": String(enrollment.term ?? ""),
      "Class Name": className,
      "Campus Name": String(campus.campus_name ?? ""),
      "Tuition Fee": tuitionFee,
      "Account Name": String(paymentSettings.account_name ?? ""),
      "BSB": String(paymentSettings.bsb ?? ""),
      "Account Number": String(
        paymentSettings.account_number ?? ""
      ),
      "Payment Reference": paymentReference,
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
      "PENDING PAYMENT EMAIL EXCEPTION:",
      error
    );

    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}