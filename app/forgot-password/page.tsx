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
    <main
      className="relative min-h-screen w-full overflow-hidden bg-[#011029] text-[#F4F7FB]"
      style={{
        backgroundImage: `
          conic-gradient(
            #102A4A 25%,
            #0D2444 0 50%,
            #102A4A 0 75%,
            #0D2444 0
          )
        `,
        backgroundSize: "50px 50px",
      }}
    >
      {/* Ambient gold glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D4AF37]/[0.045] blur-3xl"
      />

      <div className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-6">
        <div className="w-full max-w-md">

          {/* ====================================================
              MyCHESS Identity — Pawn
          ==================================================== */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center">

              <div
                aria-hidden="true"
                className="absolute h-[70px] w-[70px] rounded-full border border-[#D4AF37]/35 shadow-[0_0_18px_rgba(212,175,55,0.08)]"
              />

              {/* Pawn */}
              <svg
                viewBox="0 0 24 30"
                aria-hidden="true"
                className="h-12 w-12 text-[#D4AF37]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle
                  cx="12"
                  cy="6"
                  r="2.7"
                />

                <path d="M9.2 10.2h5.6" />

                <path d="M10 10.2l-1.2 7.2h6.4L14 10.2" />

                <path d="M8.2 17.4h7.6" />

                <path d="M7 20.2h10" />

                <path d="M6 23h12" />
              </svg>
            </div>

            <h1 className="font-serif text-3xl font-semibold tracking-[0.03em] text-white sm:text-[2rem]">
              MyCHESS
            </h1>

            <p className="mt-1 text-[0.68rem] font-medium tracking-[0.22em] text-[#D4AF37]">
              QUEENSLAND CHESS SCHOOL
            </p>
          </div>

          {/* ====================================================
              Forgot Password Card
          ==================================================== */}
          <div className="rounded-[20px] border border-[#D4AF37]/55 bg-[#102B4D] px-6 py-7 shadow-[0_0_35px_rgba(212,175,55,0.08)] sm:px-8 sm:py-8">

            <div className="mb-7 text-center">
              <h2 className="text-xl font-semibold tracking-wide text-white">
                Reset your password
              </h2>
            </div>

            <form
              className="space-y-4"
              onSubmit={handleResetRequest}
            >

              {/* Email */}
              <div>
                <label
                  htmlFor="reset-email"
                  className="mb-1.5 block text-xs font-medium tracking-wide text-[#C8D2DF]"
                >
                  Email
                </label>

                <input
                  id="reset-email"
                  type="email"
                  placeholder="Enter your email registered with us"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  autoComplete="email"
                  className="w-full rounded-xl border border-[#C8D2DF]/30 bg-[#011029]/65 px-4 py-3 text-sm text-white outline-none transition duration-200 placeholder:text-[#C8D2DF]/45 focus:border-[#D4AF37] focus:bg-[#011029]/85 focus:shadow-[0_0_14px_rgba(212,175,55,0.12)]"
                />
              </div>

              {/* Send Reset Link */}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-[#D4AF37] py-3 text-sm font-semibold tracking-wide text-[#011029] transition duration-200 hover:-translate-y-0.5 hover:bg-[#E2C45A] hover:shadow-[0_0_20px_rgba(212,175,55,0.22)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Sending..."
                  : "Send Reset Link"}
              </button>

              {/* Error */}
              {error && (
                <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2">
                  <p className="text-center text-xs leading-relaxed text-red-300">
                    {error}
                  </p>
                </div>
              )}

              {/* Success */}
              {message && (
                <div className="rounded-lg border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-3 py-2">
                  <p className="text-center text-xs leading-relaxed text-[#F4D97A]">
                    {message}
                  </p>
                </div>
              )}
            </form>

            {/* Back to Login */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="text-xs text-[#D4AF37] transition duration-200 hover:text-white hover:underline"
              >
                Back to Sign In
              </button>
            </div>
          </div>

          {/* ====================================================
              Footer
          ==================================================== */}
          <div className="mt-6 text-center">
            <p className="text-[0.62rem] font-medium tracking-[0.08em] text-[#C8D2DF]/60">
              Developed by Peter with AI assistance
            </p>

            <p className="mt-1 text-[0.58rem] tracking-[0.06em] text-[#C8D2DF]/45">
              © Queensland Chess School. All rights reserved.
            </p>
          </div>

        </div>
      </div>
    </main>
  );
}