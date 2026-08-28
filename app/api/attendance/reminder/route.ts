import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is missing" },
      { status: 500 }
    );
  }

  const resend = new Resend(apiKey);

  try {
    const body = await request.json();

    const {
      to,
      coachGreetingName,
      reminderType,
    } = body;

    if (
      !to ||
      !coachGreetingName ||
      !reminderType
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const message =
      reminderType === "LESSON_START"
        ? `Hi ${coachGreetingName}, you can start marking roll call now.`
        : `Hi ${coachGreetingName}, don't forget to make a roll call.`;

    const { data, error } =
      await resend.emails.send({
        from:
          "MyCHESS <noreply@queenslandchessschool.com.au>",
        to: [to],
        subject: "MyCHESS Attendance Reminder",
        html: `
          <p>${message}</p>
        `,
      });

    if (error) {
      console.error(
        "RESEND ATTENDANCE REMINDER ERROR:",
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
      "RESEND ATTENDANCE REMINDER EXCEPTION:",
      error
    );

    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}