import { supabaseServer } from "@/lib/supabaseServer";
import {
  renderTemplate,
  type RenderedTemplate,
} from "./variableRenderer";
import { buildEmailLayout } from "./emailLayout";

export type GetRenderedTemplateInput = {
  businessEvent: string;
  variables: Record<string, string>;
};

export type RenderedCentralEmailTemplate = RenderedTemplate & {
  templateName: string;
};

export async function getRenderedEmailTemplate({
  businessEvent,
  variables,
}: GetRenderedTemplateInput): Promise<RenderedCentralEmailTemplate> {
  const { data: template, error } = await supabaseServer
    .from("email_templates")
    .select(
      "template_name, subject, body, status, business_event"
    )
    .eq("business_event", businessEvent)
    .eq("status", "Active")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load email template: ${error.message}`
    );
  }

  if (!template) {
    throw new Error(
      `No active email template found for business event: ${businessEvent}`
    );
  }

  const rendered = renderTemplate(
    {
      subject: template.subject,
      body: template.body,
    },
    variables
  );

  const loginUrl =
    variables["MyCHESS Login URL"] || undefined;

  const formattedBody = buildEmailLayout({
    body: rendered.body,
    loginUrl,
  });

  return {
    templateName: template.template_name,
    subject: rendered.subject,
    body: formattedBody,
  };
}