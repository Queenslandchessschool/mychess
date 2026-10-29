
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";
import { getRenderedEmailTemplate } from "@/lib/email/templateService";
import { sendEmail } from "@/lib/email/emailService";
import { logEmailAudit } from "@/lib/email/emailAudit";

const BUSINESS_EVENT = "BLUE_CARD_RENEWAL_REMINDER";

function getBrisbaneDateKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Brisbane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addMonths(dateKey: string, months: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const targetMonthIndex = month - 1 + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;

  const lastDay = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0)
  ).getUTCDate();

  return [
    String(targetYear),
    String(targetMonth + 1).padStart(2, "0"),
    String(Math.min(day, lastDay)).padStart(2, "0"),
  ].join("-");
}

async function runReminder(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 500 }
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const today = getBrisbaneDateKey();
  const cutoffDate = addMonths(today, 6);

  const { data: coaches, error: coachError } = await supabaseServer
    .from("coaches")
    .select("id, display_name, email, blue_card_expiry")
    .gte("blue_card_expiry", today)
    .lte("blue_card_expiry", cutoffDate)
    .not("email", "is", null)
    .order("blue_card_expiry");

  if (coachError) {
    return NextResponse.json(
      { error: `Failed to load coaches: ${coachError.message}` },
      { status: 500 }
    );
  }

  let processed = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  const results: Array<Record<string, unknown>> = [];

  for (const coach of coaches ?? []) {
    processed += 1;

    const email = String(coach.email ?? "").trim();
    const expiryDate = String(coach.blue_card_expiry ?? "").slice(0, 10);

    if (!email || !expiryDate) {
      skipped += 1;
      results.push({
        coachId: coach.id,
        status: "Skipped",
        reason: "Coach email or expiry date is missing.",
      });
      continue;
    }

    const variables = {
      "Coach Display Name": String(coach.display_name || "Coach"),
      "Expiry Date": expiryDate,
    };

    const { data: existingAudit, error: auditQueryError } =
      await supabaseServer
        .from("email_audit_logs")
        .select("id")
        .eq("business_event", BUSINESS_EVENT)
        .eq("recipient_email", email)
        .eq("status", "Success")
        .contains("data_used", { "Expiry Date": expiryDate })
        .limit(1);

    if (auditQueryError) {
      failed += 1;
      results.push({
        coachId: coach.id,
        status: "Failed",
        reason: `Audit lookup failed: ${auditQueryError.message}`,
      });
      continue;
    }

    if (existingAudit?.length) {
      skipped += 1;
      results.push({
        coachId: coach.id,
        status: "Skipped",
        reason: "Reminder already sent for this expiry date.",
      });
      continue;
    }

    let emailTemplate;

    try {
      emailTemplate = await getRenderedEmailTemplate({
        businessEvent: BUSINESS_EVENT,
        variables,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      const audit = await logEmailAudit({
        businessEvent: BUSINESS_EVENT,
        recipientEmail: email,
        dataUsed: variables,
        status: "Failed",
        errorMessage: message,
      });

      failed += 1;
      results.push({
        coachId: coach.id,
        status: "Failed",
        reason: message,
        auditLogged: audit.success,
      });
      continue;
    }

    const sendResult = await sendEmail({
      to: email,
      subject: emailTemplate.subject,
      html: emailTemplate.body,
    });

    const audit = await logEmailAudit({
      businessEvent: BUSINESS_EVENT,
      templateName: emailTemplate.templateName,
      recipientEmail: email,
      dataUsed: variables,
      status: sendResult.success ? "Success" : "Failed",
      messageId: sendResult.messageId ?? null,
      errorMessage: sendResult.success
        ? null
        : String(sendResult.error ?? "Email sending failed"),
    });

    if (!sendResult.success || !audit.success) {
      failed += 1;
      results.push({
        coachId: coach.id,
        status: sendResult.success ? "SentButAuditFailed" : "Failed",
        reason: !sendResult.success
          ? String(sendResult.error ?? "Email sending failed")
          : "Email sent, but the audit log could not be saved.",
        auditLogged: audit.success,
      });
      continue;
    }

    sent += 1;
    results.push({
      coachId: coach.id,
      status: "Sent",
      expiryDate,
    });
  }

  return NextResponse.json({
    success: failed === 0,
    businessEvent: BUSINESS_EVENT,
    today,
    cutoffDate,
    processed,
    sent,
    skipped,
    failed,
    results,
  });
}

export async function GET(request: Request) {
  try {
    return await runReminder(request);
  } catch (error) {
    console.error("BLUE CARD RENEWAL REMINDER ERROR:", error);

    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
