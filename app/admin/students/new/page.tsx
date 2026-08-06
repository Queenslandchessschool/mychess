"use client";

import RegistrationForm from "@/components/registration/RegistrationForm";
import {
  activateEnrollment,
} from "@/lib/registrationService";

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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        New Student Registration
      </h1>

      <RegistrationForm
        onSubmit={handleSubmit}
      />
    </div>
  );
}