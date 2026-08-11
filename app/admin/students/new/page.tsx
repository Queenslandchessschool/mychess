"use client";

import RegistrationForm from "@/components/registration/RegistrationForm";
import { activateEnrollment } from "@/lib/registrationService";

export default function NewStudentPage() {
  async function handleSubmit(data: any) {
    try {
      await activateEnrollment(data);

      alert(
        `Thank you for your interest in our chess program!

Your registration has been submitted successfully.

A confirmation email including your class details, tuition fees and payment instructions will be sent to you shortly.

Your place will be secured once payment has been received.

We look forward to welcoming your family to Queensland Chess School.`
      );
    } catch (err) {
      console.error(err);

      alert("Registration failed.");
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
      </div>
    </div>
  );
}