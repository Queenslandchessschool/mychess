import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/currentUser";

type EnrolmentAuditInput = {
  studentEnrolmentId: string;
  studentId: string;
  action: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  reason: string;
};

export async function logEnrolmentAudit(
  input: EnrolmentAuditInput
): Promise<void> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    throw new Error("Unable to resolve current user.");
  }

  if (currentUser.role !== "admin") {
    throw new Error("Only Admin users can create enrolment audit logs.");
  }

  const reason = input.reason.trim();

  if (!reason) {
    throw new Error("Audit reason is required.");
  }

  const { error } = await supabase
    .from("enrolment_audit_logs")
    .insert({
      student_enrolment_id: input.studentEnrolmentId,
      student_id: input.studentId,
      action: input.action,
      field: input.field,
      old_value: input.oldValue,
      new_value: input.newValue,
      reason,
      changed_by: currentUser.userId,
    });

  if (error) {
    throw new Error(
      `Failed to create enrolment audit log: ${error.message}`
    );
  }
}