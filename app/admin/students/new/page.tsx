"use client";

import RegistrationForm from "@/components/registration/RegistrationForm";
import {
  activateEnrollment,
} from "@/lib/registrationService";

export default function NewStudentPage() {
  async function handleSubmit(data: any) {
    try {
      await activateEnrollment(data);

      alert("Student activated successfully.");
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