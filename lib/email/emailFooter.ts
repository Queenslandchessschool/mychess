export function buildEmailFooter() {
  return `
    <div style="
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #dddddd;
      font-family: Arial, sans-serif;
      font-size: 14px;
      line-height: 1.8;
      color: #333333;
    ">

      <div style="margin-bottom: 4px;">
        <span style="
          display: inline-block;
          width: 22px;
          font-weight: 600;
        ">
          &#9993;
        </span>
        Email:
        <a
          href="mailto:kqchessclub@gmail.com"
          style="color: #1a73e8; text-decoration: underline;"
        >
          kqchessclub@gmail.com
        </a>
      </div>

      <div style="margin-bottom: 4px;">
        <span style="
          display: inline-block;
          width: 22px;
          font-weight: 600;
        ">
          &#9742;
        </span>
        WhatsApp:
        <a
          href="tel:+61422663518"
          style="color: #1a73e8; text-decoration: underline;"
        >
          0422 663 518
        </a>
      </div>

      <div>
        <span style="
          display: inline-block;
          width: 22px;
          font-weight: 600;
        ">
          &#127760;
        </span>
        Website:
        <a
          href="https://queenslandchessschool.com.au/"
          style="color: #1a73e8; text-decoration: underline;"
        >
          queenslandchessschool.com.au
        </a>
      </div>

    </div>
  `;
}