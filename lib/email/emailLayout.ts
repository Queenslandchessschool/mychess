
import { buildEmailFooter } from "./emailFooter";

type EmailLayoutOptions = {
  body: string;
  loginUrl?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildLoginButton(loginUrl?: string): string {
  if (!loginUrl) {
    return "";
  }

  const safeUrl = escapeHtml(loginUrl);

  return `
    <table
      role="presentation"
      border="0"
      cellpadding="0"
      cellspacing="0"
      width="100%"
      style="
        width: 100%;
        margin: 22px 0 24px 0;
      "
    >
      <tr>
        <td align="center">
          <a
            href="${safeUrl}"
            target="_blank"
            style="
              display: inline-block;
              padding: 13px 24px;
              color: #102B4D;
              background-color: #D4AF37;
              border: 1px solid #B89220;
              border-radius: 5px;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 14px;
              font-weight: bold;
              line-height: 1.2;
              text-decoration: none;
            "
          >
            Log in to MyCHESS&nbsp; →
          </a>
        </td>
      </tr>
    </table>
  `;
}

function buildGoldTopLine(): string {
  return `
    <table
      role="presentation"
      border="0"
      cellpadding="0"
      cellspacing="0"
      width="100%"
      style="
        width: 100%;
        height: 4px;
        background-color: #D4AF37;
      "
    >
      <tr>
        <td
          style="
            height: 4px;
            background-color: #D4AF37;
            line-height: 4px;
            font-size: 1px;
          "
        >
          &nbsp;
        </td>
      </tr>
    </table>
  `;
}

function renderEmailBody(
  body: string,
  loginUrl?: string
): string {
  const trimmedBody = body.trim();

  if (!trimmedBody) {
    return "";
  }

  const loginButton = buildLoginButton(loginUrl);

  const containsBlockHtml =
    /<(p|div|table|ul|ol|li|h1|h2|h3|blockquote)[\s>]/i.test(
      trimmedBody
    );

  if (containsBlockHtml) {
    if (loginUrl && trimmedBody.includes(loginUrl)) {
      return trimmedBody.replace(loginUrl, loginButton);
    }

    return trimmedBody;
  }

  const paragraphs = trimmedBody
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  let loginButtonInserted = false;

  const renderedParagraphs = paragraphs.map((paragraph) => {
    const containsLoginUrl =
      Boolean(loginUrl) && paragraph.includes(loginUrl as string);

    if (containsLoginUrl && loginUrl) {
      loginButtonInserted = true;

      const remainingText = paragraph
        .replace(loginUrl, "")
        .trim()
        .replace(/\n/g, "<br />");

      return `
        ${
          remainingText
            ? `
              <p
                class="email-body-paragraph"
                style="
                  margin: 0 0 18px 0;
                  color: #102B4D;
                  font-family: Arial, Helvetica, sans-serif;
                  font-size: 15px;
                  line-height: 1.7;
                "
              >
                ${remainingText}
              </p>
            `
            : ""
        }

        ${loginButton}
      `;
    }

    const content = paragraph.replace(/\n/g, "<br />");

    return `
      <p
        class="email-body-paragraph"
        style="
          margin: 0 0 18px 0;
          color: #102B4D;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 15px;
          line-height: 1.7;
        "
      >
        ${content}
      </p>
    `;
  });

  if (loginUrl && !loginButtonInserted) {
    renderedParagraphs.push(loginButton);
  }

  return renderedParagraphs.join("");
}

function buildHeader(): string {
  return `
    <table
      role="presentation"
      border="0"
      cellpadding="0"
      cellspacing="0"
      width="100%"
      class="email-header-table"
      style="
        width: 100%;
        background-color: #FFFFFF;
      "
    >
      <tr>
        <td
          class="header-brand-column"
          width="42%"
          align="center"
          valign="middle"
          style="
            width: 42%;
            padding: 24px 16px;
            vertical-align: middle;
          "
        >
          <div
            class="email-brand"
            style="
              color: #102B4D;
              font-family: Georgia, 'Times New Roman', serif;
              font-size: 30px;
              font-weight: bold;
              line-height: 1.1;
              letter-spacing: 0.5px;
              white-space: nowrap;
            "
          >
            My<span style="color: #D4AF37;">CHESS</span>
          </div>
        </td>

        <td
          class="header-divider-column"
          width="1%"
          valign="middle"
          style="
            width: 1%;
            padding: 0;
            vertical-align: middle;
          "
        >
          <div
            style="
              width: 1px;
              height: 48px;
              margin: 0 auto;
              background-color: #D4AF37;
              line-height: 48px;
              font-size: 1px;
            "
          >
            &nbsp;
          </div>
        </td>

        <td
          class="header-text-column"
          width="57%"
          align="center"
          valign="middle"
          style="
            width: 57%;
            padding: 24px 12px;
            vertical-align: middle;
          "
        >
          <div
            class="email-tagline"
            style="
              color: #A18432;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 11px;
              font-weight: bold;
              letter-spacing: 1.4px;
              line-height: 1.5;
              white-space: nowrap;
            "
          >
            LEARN&nbsp; · &nbsp;GROW&nbsp; · &nbsp;SUCCEED
          </div>

          <div
            class="email-school-name"
            style="
              margin-top: 8px;
              color: #102B4D;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 10px;
              font-weight: bold;
              letter-spacing: 1.8px;
              line-height: 1.5;
            "
          >
            QUEENSLAND CHESS SCHOOL
          </div>
        </td>
      </tr>
    </table>
  `;
}

export function buildEmailLayout({
  body,
  loginUrl,
}: EmailLayoutOptions): string {
  const renderedBody = renderEmailBody(body, loginUrl);
  const footerHtml = buildEmailFooter();
  const headerHtml = buildHeader();

  return `
<!DOCTYPE html>
<html
  lang="en"
  xmlns="http://www.w3.org/1999/xhtml"
>
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <meta
    name="x-apple-disable-message-reformatting"
  />

  <title>MyCHESS</title>

  <style>
    @media only screen and (max-width: 600px) {
      .email-outer-padding {
        padding: 0 !important;
      }

      .email-container {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 0 !important;
      }

      .header-brand-column,
.header-divider-column,
.header-text-column {
  display: block !important;
  width: 100% !important;
  box-sizing: border-box !important;
  border-right: none !important;
}

.header-divider-column {
  display: none !important;
}

      .header-brand-column {
        padding: 24px 16px 12px 16px !important;
      }

      .header-text-column {
        padding: 8px 12px 24px 12px !important;
      }

      .email-brand {
        font-size: 28px !important;
      }

      .email-tagline {
        font-size: 10px !important;
        letter-spacing: 1px !important;
      }

      .email-school-name {
        font-size: 9px !important;
        letter-spacing: 1.3px !important;
      }

      .email-content {
        padding: 28px 22px 24px 22px !important;
      }

      .email-footer {
        padding: 18px 20px 22px 20px !important;
      }

      .email-body-paragraph {
        font-size: 15px !important;
        line-height: 1.7 !important;
      }
    }
  </style>
</head>

<body
  style="
    margin: 0;
    padding: 0;
    width: 100%;
    background-color: #EEF2F6;
  "
>
  <table
    role="presentation"
    border="0"
    cellpadding="0"
    cellspacing="0"
    width="100%"
    style="
      width: 100%;
      background-color: #EEF2F6;
    "
  >
    <tr>
      <td
        align="center"
        class="email-outer-padding"
        style="padding: 24px 12px;"
      >
        <table
          role="presentation"
          border="0"
          cellpadding="0"
          cellspacing="0"
          width="600"
          class="email-container"
          style="
            width: 100%;
            max-width: 600px;
            background-color: #FFFFFF;
            border: 1px solid #DDE3EA;
            border-radius: 10px;
            overflow: hidden;
          "
        >
          <!-- Solid Gold Top Line -->
          <tr>
            <td style="padding: 0;">
              ${buildGoldTopLine()}
            </td>
          </tr>

          <!-- Text Header -->
          <tr>
            <td style="padding: 0;">
              ${headerHtml}
            </td>
          </tr>

          <!-- Header Divider -->
          <tr>
            <td style="padding: 0 28px;">
              <div
                style="
                  height: 1px;
                  background-color: #E5E8EC;
                  line-height: 1px;
                  font-size: 1px;
                "
              >
                &nbsp;
              </div>
            </td>
          </tr>

          <!-- Email Content -->
          <tr>
            <td
              class="email-content"
              style="
                padding: 34px 38px 24px 38px;
                background-color: #FFFFFF;
              "
            >
              <div class="email-body-text">
                ${renderedBody}
              </div>

              ${footerHtml}
            </td>
          </tr>

          <!-- Compact Footer -->
          <tr>
            <td
              align="center"
              class="email-footer"
              style="
                padding: 18px 24px 22px 24px;
                background-color: #F8F9FB;
              "
            >
              <div
  style="
    color: #536579;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
    line-height: 1.7;
    text-align: center;
  "
>
  MyCHESS ·
  <span style="color: #D4AF37; font-weight: bold;">
    Every move matters
  </span>
</div>

<div
  style="
    margin-top: 5px;
    color: #8793A1;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10px;
    line-height: 1.6;
    text-align: center;
  "
>
  A brighter mind for a brighter future.
</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}