import { supabaseServer } from "@/lib/supabaseServer";

export type EmailAuditStatus = "Success" | "Failed";

export type EmailAuditInput = {
  triggeredBy?: string | null;
  triggeredAt?: string;
  businessEvent: string;
  templateName?: string | null;
  recipientEmail: string;

  studentId?: string | null;
  parentId?: string | null;
  enrollmentId?: string | null;
  trialId?: string | null;

  dataUsed?: Record<string, string> | null;

  status: EmailAuditStatus;
  messageId?: string | null;
  errorMessage?: string | null;
};

export type EmailAuditResult = {
  success: boolean;
  auditId?: string;
  error?: unknown;
};

export async function logEmailAudit(
  input: EmailAuditInput
): Promise<EmailAuditResult> {
  try {
    const { data, error } = await supabaseServer
      .from("email_audit_logs")
      .insert({
        triggered_by: input.triggeredBy ?? null,
        triggered_at: input.triggeredAt ?? new Date().toISOString(),
        business_event: input.businessEvent,
        template_name: input.templateName ?? null,
        recipient_email: input.recipientEmail,

        student_id: input.studentId ?? null,
        parent_id: input.parentId ?? null,
        enrollment_id: input.enrollmentId ?? null,
        trial_id: input.trialId ?? null,

        data_used: input.dataUsed ?? null,

        status: input.status,
        message_id: input.messageId ?? null,
        error_message: input.errorMessage ?? null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("EMAIL AUDIT LOG ERROR:", error);

      return {
        success: false,
        error,
      };
    }

    return {
      success: true,
      auditId: data?.id,
    };
  } catch (error) {
    console.error("EMAIL AUDIT LOG EXCEPTION:", error);

    return {
      success: false,
      error,
    };
  }
}