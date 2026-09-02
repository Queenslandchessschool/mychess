import { NextResponse } from "next/server";
import { Resend } from "resend";
import { buildTrialDeclinedEmail } from "@/lib/trialEmailTemplates";

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is missing" },
      { status: 500 }
    );
  }

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

    const email = buildTrialDeclinedEmail({
      parentName,
      studentName,
    });

    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: "MyCHESS <noreply@queenslandchessschool.com.au>",
      to: [parentEmail],
      subject: email.subject,
      html: email.html,
    });

    if (error) {
      console.error(
        "TRIAL DECLINED EMAIL ERROR:",
        error
      );

      return NextResponse.json(
        { error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: data?.id,
    });
  } catch (error) {
    console.error(
      "TRIAL DECLINED EMAIL EXCEPTION:",
      error
    );

    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}