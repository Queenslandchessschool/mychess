import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function GET() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is missing" },
      { status: 500 }
    );
  }

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: "MyCHESS <noreply@queenslandchessschool.com.au>",
      to: ["kqchessclub@gmail.com"],
      subject: "MyCHESS Resend Test",
      html: `
        <h2>MyCHESS Resend Test</h2>
        <p>This is a test email from the MyCHESS system.</p>
        <p>If you received this email, Resend is working correctly.</p>
      `,
    });

    if (error) {
      console.error("RESEND TEST ERROR:", error);

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
    console.error("RESEND TEST EXCEPTION:", error);

    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}