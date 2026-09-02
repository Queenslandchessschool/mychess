import { buildEmailFooter } from "./emailFooter";

export function buildTrialDeclinedEmail({
  parentName,
  studentName,
}: {
  parentName: string;
  studentName: string;
}) {
  return {
    subject: "Thank You for Attending Our Chess Lesson",

    html: `
      <p>Dear ${parentName},</p>

      <p>
        Thank you for taking the time to bring ${studentName}
        to a trial lesson with us.
      </p>

      <p>
        We are sorry that our program may not be the right fit
        for ${studentName} at this time.
      </p>

      <p>
        We hope that in the future we will have the opportunity
        to support ${studentName}'s learning journey and personal
        growth through our chess program.
      </p>

      <p>
        Please keep in touch, and we wish ${studentName} all the very best.
      </p>

      <p>
        Cheers,
      </p>

      <p>
        Admin Team<br />
        Queensland Chess School
      </p>

      ${buildEmailFooter()}
    `,
  };
}