import { NextResponse } from "next/server";

import { getRenderedEmailTemplate } from "@/lib/email/templateService";
import { sendEmail } from "@/lib/email/emailService";
import { logEmailAudit } from "@/lib/email/emailAudit";

const BUSINESS_EVENT = "CLASS_REMINDER";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parentName = String(body.parentName ?? "").trim();
    const parentEmail = String(body.parentEmail ?? "").trim();
    const studentName = String(body.studentName ?? "").trim();
    const firstLessonDate = String(body.firstLessonDate ?? "").trim();
    const academicTerm = String(body.academicTerm ?? "").trim();
    const reenrolmentCompleted = body.reenrolmentCompleted === true;

    if (
      !parentName ||
      !parentEmail ||
      !studentName ||
      !firstLessonDate ||
      !academicTerm
    ) {
      return NextResponse.json(
        {
          error:
            "parentName, parentEmail, studentName, firstLessonDate and academicTerm are required.",
        },
        { status: 400 }
      );
    }

    const specialRequests = body.specialRequests ?? {};

    const requestLabels: Record<string, string> = {
      classroom_pickup: "Classroom pickup",
      ymca_dropoff: "YMCA drop-off",
      walk_home: "Walk home",
    };

    const selectedRequests = Object.entries(requestLabels)
      .filter(([key]) => specialRequests[key] === true)
      .map(([, label]) => `- ${label}`);

    const specialRequestConfirmation =
      selectedRequests.length > 0
        ? [
            "Your special request(s) have been arranged as below:",
            "",
            ...selectedRequests,
          ].join("\n")
        : "";

    const reenrolmentReminder = reenrolmentCompleted
      ? ""
      : [
          `If you have not yet completed ${studentName}'s re-enrolment, please visit the MyCHESS Parent Portal:`,
          "",
          "http://localhost:3000/parent/reenrolment",
          "",
          "We encourage you to complete the re-enrolment process as soon as possible.",
        ].join("\n");

    const variables = {
      "Parent Name": parentName,
      "Academic Term": academicTerm,
      "Student Name": studentName,
      "First Lesson Date of Next Term": firstLessonDate,
      "Special Request Confirmation": specialRequestConfirmation,
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
    console.error("CLASS REMINDER EMAIL EXCEPTION:", error);

    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}