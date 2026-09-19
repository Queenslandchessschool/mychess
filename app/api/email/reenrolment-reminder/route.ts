import { NextResponse } from "next/server";

import { getRenderedEmailTemplate } from "@/lib/email/templateService";
import { sendEmail } from "@/lib/email/emailService";
import { logEmailAudit } from "@/lib/email/emailAudit";

const BUSINESS_EVENT = "REENROLMENT_REMINDER";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parentName = String(body.parentName ?? "").trim();
    const parentEmail = String(body.parentEmail ?? "").trim();
    const studentName = String(body.studentName ?? "").trim();

    if (!parentName || !parentEmail || !studentName) {
      return NextResponse.json(
        {
          error:
            "parentName, parentEmail and studentName are required.",
        },
        { status: 400 }
      );
    }

    const variables = {
      "Parent Name": parentName,
      "Student Name": studentName,
      "Re-enrolment / Parent Portal Link":
        "http://localhost:3000/parent/reenrolment",
      "First Lesson Date of Next Term":
        String(body.firstLessonDate ?? "").trim(),
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
        recipientEmail: parentEmail,
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
      to: parentEmail,
      subject: email.subject,
      html: email.body,
    });

    await logEmailAudit({
      businessEvent: BUSINESS_EVENT,
      templateName: email.templateName,
      recipientEmail: parentEmail,
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
          error: String(result.error ?? "Email sending failed"),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      templateName: email.templateName,
    });
  } catch (error) {
    console.error(
      "REENROLMENT REMINDER EMAIL EXCEPTION:",
      error
    );

    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}



