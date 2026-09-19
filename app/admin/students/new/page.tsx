"use client";

import RegistrationForm from "@/components/registration/RegistrationForm";
import { activateEnrollment } from "@/lib/registrationService";
import { useState } from "react";

export default function NewStudentPage() {
    const [successModal, setSuccessModal] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({
    open: false,
    title: "",
    message: "",
  });
  async function handleSubmit(data: any) {
  try {
    const result = await activateEnrollment(data);

    const isTrial = Boolean(result.enrollment.is_trial);

const emailEndpoint = isTrial
  ? "/api/email/trial-confirmation"
  : "/api/email/enrolment-confirmation";

    const response = await fetch(
      emailEndpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enrollmentId: result.enrollment.id,
        }),
      }
    );

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));

      throw new Error(
        payload.error ?? "Confirmation email failed."
      );
    }

    setSuccessModal({
  open: true,
  title: isTrial
    ? "Trial Registration Successful"
    : "Registration Successful",
  message: isTrial
    ? "Your trial lesson registration has been submitted successfully.\n\nA trial lesson confirmation email has been sent to you.\n\nWe look forward to welcoming your family to Queensland Chess School."
    : "Your registration has been submitted successfully.\n\nA confirmation email including your class details, tuition fees and payment instructions has been sent to you.\n\nYour place will be secured once payment has been received.\n\nWe look forward to welcoming your family to Queensland Chess School.",
});

  } catch (err) {
    console.error(err);

    setSuccessModal({
  open: true,
  title: "Registration Failed",
  message:
    err instanceof Error
      ? err.message
      : "Registration failed.",
});
  }
}

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {/* Page Header */}
        <header className="mb-6 sm:mb-8">
          <p
            className="
              mb-2
              text-[11px]
              font-semibold
              uppercase
              tracking-[0.24em]
              text-[#D4AF37]
              sm:text-xs
            "
          >
            QUEENSLAND CHESS SCHOOL
          </p>

          <h1
            className="
              text-2xl
              font-bold
              tracking-tight
              text-[#F7F9FC]
              sm:text-3xl
              lg:text-4xl
            "
          >
            New Student Registration
          </h1>

          <p
            className="
              mt-2
              max-w-2xl
              text-sm
              leading-6
              text-[#B8C6D8]
              sm:text-base
            "
          >
            Please complete the following steps to register your child.
          </p>

          <div
            className="
              mt-4
              h-[2px]
              w-16
              bg-gradient-to-r
              from-[#D4AF37]
              to-[#F4D35E]
            "
          />
        </header>

        {/* Registration */}
        <section
          className="
            relative
            overflow-hidden
            rounded-2xl
            border
            border-[#D4AF37]/45
            bg-[#FFFDF8]
          "
        >
          {/* Gold Gradient Top Highlight */}
          <div
            className="
              absolute
              left-0
              right-0
              top-0
              h-[3px]
              bg-gradient-to-r
              from-[#8F6B18]
              via-[#F4D35E]
              to-[#8F6B18]
            "
          />

          <div className="pt-[3px]">
            <RegistrationForm onSubmit={handleSubmit} />
          </div>
        </section>
                {successModal.open && (
          <div
            className="
              fixed
              inset-0
              z-[200]
              flex
              items-center
              justify-center
              bg-[#10213A]/50
              px-4
              backdrop-blur-[2px]
            "
            role="dialog"
            aria-modal="true"
          >
            <div
              className="
                relative
                w-full
                max-w-md
                overflow-hidden
                rounded-2xl
                border
                border-[#D9E0E8]
                bg-[#FFFDF8]
                shadow-2xl
              "
            >
              <div
                aria-hidden="true"
                className="
                  absolute
                  left-0
                  right-0
                  top-0
                  h-[6px]
                  bg-gradient-to-r
                  from-[#F7D968]
                  via-[#D4AF37]
                  to-transparent
                "
              />

              <div className="px-6 py-7 sm:px-7">
                <p
                  className="
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-[0.22em]
                    text-[#B28A22]
                  "
                >
                  QUEENSLAND CHESS SCHOOL
                </p>

                <h2
                  className="
                    mt-2
                    text-2xl
                    font-bold
                    tracking-tight
                    text-[#10213A]
                  "
                >
                  {successModal.title}
                </h2>

                <p
                  className="
                    mt-3
                    whitespace-pre-line
                    text-sm
                    leading-6
                    text-[#64748B]
                  "
                >
                  {successModal.message}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setSuccessModal((current) => ({
                      ...current,
                      open: false,
                    }))
                  }
                  className="
                    mt-6
                    w-full
                    rounded-xl
                    border
                    border-[#D4AF37]
                    bg-[#D4AF37]
                    px-5
                    py-3
                    text-sm
                    font-semibold
                    text-[#10213A]
                    shadow-sm
                    transition
                    hover:bg-[#F4D35E]
                    active:scale-[0.98]
                  "
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}