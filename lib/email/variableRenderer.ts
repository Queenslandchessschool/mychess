export type TemplateData = {
  subject: string;
  body: string;
};

export type TemplateVariables = Record<string, string>;

export type RenderedTemplate = {
  subject: string;
  body: string;
};

export function findVariables(text: string): string[] {
  const matches = text.match(/\[[^\]]+\]/g) ?? [];

  return Array.from(
    new Set(
      matches.map((match) => match.slice(1, -1).trim())
    )
  );
}

function validateVariables(
  template: TemplateData,
  variables: TemplateVariables
): void {
  const requiredVariables = Array.from(
    new Set([
      ...findVariables(template.subject),
      ...findVariables(template.body),
    ])
  );

  const missingVariables = requiredVariables.filter(
    (variable) =>
      !Object.prototype.hasOwnProperty.call(variables, variable)
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing template variable: ${missingVariables.join(", ")}`
    );
  }
}

function renderText(
  text: string,
  variables: TemplateVariables
): string {
  return text.replace(/\[([^\]]+)\]/g, (_, variable: string) => {
    const key = variable.trim();

    if (!Object.prototype.hasOwnProperty.call(variables, key)) {
      throw new Error(`Missing template variable: ${key}`);
    }

    return variables[key];
  });
}

export function renderTemplate(
  template: TemplateData,
  variables: TemplateVariables
): RenderedTemplate {
  validateVariables(template, variables);

  return {
    subject: renderText(template.subject, variables),
    body: renderText(template.body, variables),
  };
}