import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getRenderedEmailTemplate } from "@/lib/email/templateService";
import { sendEmail } from "@/lib/email/emailService";
import { logEmailAudit } from "@/lib/email/emailAudit";

const BUSINESS_EVENT = "ENROLMENT_CONFIRMED";

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
          join_date,
          status,
          is_trial,
          standard_tuition,
          redeem_amount,
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
            status,
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

    const { data: lessons, error: lessonsError } = await supabaseServer
      .from("lessons")
      .select(
        `
        id,
        lesson_date,
        status,
        chargeable
      `
      )
      .eq("class_id", enrollment.class_id)
      .eq("academic_year", enrollment.academic_year)
      .eq("term", enrollment.term)
      .in("status", ["Planned", "Completed", "Cancelled"])
      .order("lesson_date", { ascending: true });

    if (lessonsError) {
      throw new Error(
        `Failed to load lessons: ${lessonsError.message}`
      );
    }

    const validLessons = (lessons ?? []).filter(
  (lesson) => lesson.lesson_date
);

const cancelledLessons = validLessons.filter(
  (lesson) => lesson.status === "Cancelled"
);

const chargeableLessons = validLessons.filter(
  (lesson) => lesson.status !== "Cancelled"
);

const firstLessonDate = validLessons[0]?.lesson_date ?? null;

const lastLessonDate =
  validLessons[validLessons.length - 1]?.lesson_date ?? null;

const excludedLessonDate =
  cancelledLessons.length > 0
    ? cancelledLessons
        .map((lesson) => formatDate(lesson.lesson_date))
        .join(", ")
    : "No excluded lessons";

const numberOfLessons = String(chargeableLessons.length);

    const studentName =
      student.preferred_name ||
      `${student.first_name ?? ""} ${student.last_name ?? ""}`.trim();

    const campusName =
      campus?.campus_name ||
      campus?.short_name ||
      campus?.campus_code ||
      "";

    const campusAddress = campus?.address ?? "";

    const campusReferenceMap: Record<string, string> = {
  MacGregor: "MacG",
  Toowong: "TOOW",
  "Warrigal Road State School": "WRSS",
  Online: "ONLINE",
};

const classReferenceMap: Record<string, string> = {
  Advanced: "A",
  Intermediate: "I",
  Novice: "N",
  Beginner: "B",
};

const campusReference =
  campusReferenceMap[campusName] ||
  campus?.campus_code ||
  campus?.short_name ||
  campusName;

const classReference =
  classReferenceMap[String(classData.level ?? "")] ||
  String(classData.level ?? "");

const className = String(classData.level ?? "");

const paymentReference =
  `${campusReference} ${classReference} ${studentName}`.trim();

    const coachName =
      coach?.display_name ||
      `${coach?.first_name ?? ""} ${coach?.last_name ?? ""}`.trim();

    const tuitionFee = `$${Number(
      enrollment.amount_payable ?? 0
    ).toFixed(2)}`;

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

    const variables = {
      "Parent Name": String(parent.parent1_name ?? ""),
      "Student Name": studentName,
      "Class Name": className,
      "Campus Name": campusName,
      "Campus Address": campusAddress,
      "Term Start Date": formatDate(firstLessonDate),
      "Term End Date": formatDate(lastLessonDate),
      "Excluded Lesson Date": excludedLessonDate,
      "Number of Lessons": numberOfLessons,
      "Coach Name": coachName,
      "Tuition Fee": tuitionFee,
      "Payment Reference": paymentReference,
      "Account Name": String(paymentSettings.account_name ?? ""),
      BSB: String(paymentSettings.bsb ?? ""),
      "Account Number": String(paymentSettings.account_number ?? ""),
      "Payment Reference Instruction": String(
        paymentSettings.payment_reference_instruction ?? ""
      ),
      "Payment Reference Example": String(
        paymentSettings.payment_reference_example ?? ""
      ),
      "Parent Email": String(parent.email),
      "Class Day": String(classData.day ?? ""),
      "Class Start Time": formatTime(classData.start_time),
      "Class End Time": formatTime(classData.end_time),
      "Academic Year": String(enrollment.academic_year ?? ""),
      Term: String(enrollment.term ?? ""),
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
      "ENROLMENT CONFIRMATION EMAIL EXCEPTION:",
      error
    );

    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}