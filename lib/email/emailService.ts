import { Resend } from "resend";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
};

export type SendEmailResult = {
  success: boolean;
  messageId?: string;
  error?: unknown;
};

const FROM_EMAIL = "MyCHESS <noreply@queenslandchessschool.com.au>";

export async function sendEmail(
  input: SendEmailInput
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: new Error("RESEND_API_KEY is missing"),
    };
  }

  try {
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(input.to) ? input.to : [input.to],
      subject: input.subject,
      html: input.html,
    });

    if (error) {
      console.error("CENTRAL EMAIL SERVICE ERROR:", error);

      return {
        success: false,
        error,
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error("CENTRAL EMAIL SERVICE EXCEPTION:", error);

    return {
      success: false,
      error,
    };
  }
}