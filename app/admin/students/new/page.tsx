
"use client";
import { supabase } from "@/lib/supabase";
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
    // Step 1: Create the registration.
    // If this fails, report registration failure and let the form handle the error.
    let result: Awaited<ReturnType<typeof activateEnrollment>>;

    try {
      result = await activateEnrollment(data);
    } catch (err) {
      console.error("Registration creation failed:", err);

      setSuccessModal({
        open: true,
        title: "Registration Failed",
        message:
          err instanceof Error
            ? err.message
            : "Registration failed. Please try again.",
      });

      throw err;
    }
    // Step 2: Automatically provision a parent account for formal enrolments.
    // Account provisioning must never undo a saved registration or block its confirmation email.
    const isTrial = Boolean(result.enrollment.is_trial);
    let parentAccountFailed = false;

    if (!isTrial) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          parentAccountFailed = true;
        } else {
          const provisionResponse = await fetch(
            "/api/admin/parent-accounts/provision",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                enrollmentId: result.enrollment.id,
              }),
            }
          );

          const provisionPayload = await provisionResponse
            .json()
            .catch(() => ({}));

          if (
            !provisionResponse.ok ||
            !["CREATED", "EXISTING_PARENT_ACCOUNT"].includes(
              provisionPayload.status
            )
          ) {
            parentAccountFailed = true;
            console.error(
              "Parent account provisioning needs administrator review.",
              {
                enrollmentId: result.enrollment.id,
                status: provisionPayload.status ?? "UNKNOWN",
              }
            );
          }
        }
      } catch (accountError) {
        parentAccountFailed = true;
        console.error(
          "Registration saved, but parent account provisioning failed:",
          accountError
        );
      }
    }

    // Step 2: Send the appropriate confirmation email.
    // The registration already exists at this point.

    const emailEndpoint = isTrial
      ? "/api/email/trial-confirmation"
      : "/api/email/enrolment-confirmation";

    try {
      const response = await fetch(emailEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enrollmentId: result.enrollment.id,
        }),
      });

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
  : parentAccountFailed
    ? "Your registration has been submitted successfully.\n\nA confirmation email has been sent to you.\n\nHowever, automatic parent account setup needs administrator review. Please do not submit the registration again."
    : "Your registration has been submitted successfully.\n\nA confirmation email including your class details, tuition fees and payment instructions has been sent to you.\n\nYour place will be secured once payment has been received.\n\nWe look forward to welcoming your family to Queensland Chess School.",
      });
    } catch (err) {
      // The registration was created, but the email failed.
      // Do not throw here, because that could make the form appear
      // to have failed and encourage the user to submit it again.
      console.error(
        "Registration created, but confirmation email failed:",
        err
      );

      setSuccessModal({
        open: true,
        title: "Registration Saved — Email Failed",
        message:
          `The registration was created successfully, but the confirmation email could not be sent.\n\n` +
          `Enrollment ID: ${result.enrollment.id}\n\n` +
          `Please do not submit the registration again. Contact the administrator to check the email delivery issue and resend the confirmation email separately.`,
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
