"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setLoading(false);
      setError("Please enter your email address.");
      return;
    }

    const { error: resetError } =
      await supabase.auth.resetPasswordForEmail(
        trimmedEmail,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

    if (resetError) {
      console.error("PASSWORD RESET ERROR:", resetError);
      setLoading(false);
      setError(resetError.message);
      return;
    }

    setLoading(false);

    setMessage(
      "A password reset link has been sent to your email."
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-3">
          Reset Password
        </h1>

        <p className="text-center text-gray-500 mb-8">
          Please enter the email registered with MyCHESS.
        </p>

        <form
          className="space-y-4"
          onSubmit={handleResetRequest}
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border p-3"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? "Sending..."
              : "Send Reset Link"}
          </button>

          {error && (
            <p className="text-center text-sm text-red-600">
              {error}
            </p>
          )}

          {message && (
            <p className="text-center text-sm text-green-600">
              {message}
            </p>
          )}
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </main>
  );
}