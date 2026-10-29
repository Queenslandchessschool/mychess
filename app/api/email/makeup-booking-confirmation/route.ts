import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabaseServer";
import { getRenderedEmailTemplate } from "@/lib/email/templateService";
import { sendEmail } from "@/lib/email/emailService";
import { logEmailAudit } from "@/lib/email/emailAudit";

export const dynamic = "force-dynamic";

const BUSINESS_EVENT = "MAKEUP_BOOKING_CONFIRMED";
const LOGIN_URL = "https://mychess.queenslandchessschool.com.au/";

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
  const date = new Date(`${value.slice(0, 10)}T12:00:00+10:00`);
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Australia/Brisbane",
  });
}

function formatTime(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 5);
}

export async function POST(request: Request) {
  let recipientEmail = "";
  let studentId = "";
  let parentId = "";
  let bookingId = "";

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

    if (authError || !user || !user.email) {
      return NextResponse.json(
        { error: "Invalid or expired session." },
        { status: 401 }
      );
    }

    let body: { bookingId?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "A valid JSON request body is required." },
        { status: 400 }
      );
    }

    bookingId =
      typeof body.bookingId === "string"
        ? body.bookingId.trim()
        : "";

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        bookingId
      )
    ) {
      return NextResponse.json(
        { error: "A valid bookingId is required." },
        { status: 400 }
      );
    }

    const { data: parentRows, error: parentError } =
      await supabaseServer
        .from("parents")
        .select("id, email, family_id, student_id, parent1_name, first_name, last_name")
        .ilike("email", user.email.trim());

    if (parentError) {
      throw new Error(
        `Unable to verify parent account: ${parentError.message}`
      );
    }

    if (!parentRows?.length) {
      return NextResponse.json(
        { error: "No parent account is associated with this login." },
        { status: 403 }
      );
    }

    const familyIds = Array.from(
      new Set(
        parentRows
          .map((parent) => parent.family_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    const studentIds = new Set(
      parentRows
        .map((parent) => parent.student_id)
        .filter((id): id is string => Boolean(id))
    );

    if (familyIds.length > 0) {
      const { data: familyParents, error: familyError } =
        await supabaseServer
          .from("parents")
          .select("student_id")
          .in("family_id", familyIds);

      if (familyError) {
        throw new Error(
          `Unable to verify family students: ${familyError.message}`
        );
      }

      for (const parent of familyParents ?? []) {
        if (parent.student_id) studentIds.add(parent.student_id);
      }
    }

    const { data: booking, error: bookingError } =
      await supabaseServer
        .from("makeup_bookings")
        .select("id, student_id, lesson_id, status")
        .eq("id", bookingId)
        .maybeSingle();

    if (bookingError) {
      throw new Error(
        `Unable to load booking: ${bookingError.message}`
      );
    }

    if (!booking) {
      return NextResponse.json(
        { error: "Make-up booking not found." },
        { status: 404 }
      );
    }

    if (!studentIds.has(booking.student_id)) {
      return NextResponse.json(
        { error: "This booking is not associated with your family." },
        { status: 403 }
      );
    }

    if (booking.status !== "Booked") {
      return NextResponse.json(
        { error: "Only an active booked lesson can receive a confirmation email." },
        { status: 409 }
      );
    }

    const { data: previousLogs, error: previousLogsError } =
      await supabaseServer
        .from("email_audit_logs")
        .select("id, status")
        .eq("business_event", BUSINESS_EVENT)
        .eq("student_id", booking.student_id)
        .contains("data_used", { "Booking ID": bookingId })
        .eq("status", "Success")
        .limit(1);

    if (previousLogsError) {
      throw new Error(
        `Unable to check previous email records: ${previousLogsError.message}`
      );
    }

    if (previousLogs?.length) {
      return NextResponse.json({
        success: true,
        alreadySent: true,
        bookingId,
      });
    }

    const { data: student, error: studentError } =
      await supabaseServer
        .from("students")
        .select("id, first_name, last_name, preferred_name")
        .eq("id", booking.student_id)
        .maybeSingle();

    if (studentError || !student) {
      throw new Error(
        `Unable to load student: ${studentError?.message ?? "Student not found."}`
      );
    }

    const { data: lesson, error: lessonError } =
      await supabaseServer
        .from("lessons")
        .select(`
          id,
          lesson_date,
          academic_year,
          term,
          classes:class_id (
            level,
            class_suffix,
            start_time,
            end_time,
            campus:campus_id (
              campus_name,
              address
            )
          )
        `)
        .eq("id", booking.lesson_id)
        .maybeSingle();

    if (lessonError || !lesson) {
      throw new Error(
        `Unable to load lesson details: ${lessonError?.message ?? "Lesson not found."}`
      );
    }

    const classData = Array.isArray(lesson.classes)
      ? lesson.classes[0]
      : lesson.classes;

    if (!classData) {
      throw new Error("Class details are unavailable for this lesson.");
    }

    const campus = Array.isArray(classData.campus)
      ? classData.campus[0]
      : classData.campus;

    const parent = parentRows.find(
      (row) => row.email?.trim().toLowerCase() === user.email!.trim().toLowerCase()
    ) ?? parentRows[0];

    recipientEmail = user.email.trim();
    studentId = student.id;
    parentId = parent.id;

    const studentName =
      student.preferred_name?.trim() ||
      [student.first_name, student.last_name].filter(Boolean).join(" ");

    const parentName =
      parent.parent1_name?.trim() ||
      [parent.first_name, parent.last_name].filter(Boolean).join(" ") ||
      "Parent";

    const className = [
      classData.level,
      classData.class_suffix,
    ].filter(Boolean).join(" ");

    const variables: Record<string, string> = {
      "Parent Name": parentName,
      "Student Name": studentName,
      "Lesson Date": formatDate(lesson.lesson_date),
      "Lesson Start Time": formatTime(classData.start_time),
      "Lesson End Time": formatTime(classData.end_time),
      "Class Name": className,
      "Campus Name": campus?.campus_name ?? "",
      "Campus Address": campus?.address ?? "",
      "Academic Year": String(lesson.academic_year ?? ""),
      "Term": String(lesson.term ?? ""),
      "MyCHESS Login URL": LOGIN_URL,
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
        triggeredBy: user.id,
        businessEvent: BUSINESS_EVENT,
        recipientEmail,
        studentId,
        parentId,
        dataUsed: {
          ...variables,
          "Booking ID": bookingId,
        },
        status: "Failed",
        errorMessage,
      });

      return NextResponse.json(
        { error: "The booking was saved, but its confirmation email template could not be loaded." },
        { status: 500 }
      );
    }

    const result = await sendEmail({
      to: recipientEmail,
      subject: email.subject,
      html: email.body,
    });

    const audit = await logEmailAudit({
      triggeredBy: user.id,
      businessEvent: BUSINESS_EVENT,
      templateName: email.templateName,
      recipientEmail,
      studentId,
      parentId,
      dataUsed: {
        ...variables,
        "Booking ID": bookingId,
      },
      status: result.success ? "Success" : "Failed",
      messageId: result.messageId ?? null,
      errorMessage: result.success
        ? null
        : String(result.error ?? "Email sending failed."),
    });

    if (!audit.success) {
      console.error(
        "MAKE-UP BOOKING EMAIL AUDIT WARNING:",
        audit.error
      );
    }

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          emailFailed: true,
          bookingId,
          error: "The booking was saved, but the confirmation email could not be sent.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      bookingId,
      messageId: result.messageId,
      templateName: email.templateName,
    });
  } catch (error) {
    console.error("MAKE-UP BOOKING CONFIRMATION EMAIL ERROR:", error);

    return NextResponse.json(
      {
        error: "Unable to process the make-up booking confirmation email.",
      },
      { status: 500 }
    );
  }
}