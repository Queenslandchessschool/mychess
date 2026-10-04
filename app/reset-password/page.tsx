"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function checkInitialSession() {
      const { data } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (data.session) {
        setCheckingSession(false);
      }
    }

    checkInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) {
          return;
        }

        if (event === "PASSWORD_RECOVERY" && session) {
          setError("");
          setCheckingSession(false);
        }
      }
    );

    const timeout = window.setTimeout(() => {
      if (!mounted) {
        return;
      }

      supabase.auth.getSession().then(({ data }) => {
        if (!mounted) {
          return;
        }

        if (data.session) {
          setError("");
          setCheckingSession(false);
        } else {
          setError(
            "This password reset link is invalid or has expired. Please request a new one."
          );
          setCheckingSession(false);
        }
      });
    }, 2000);

    return () => {
      mounted = false;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  async function handleResetPassword(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!password || !confirmPassword) {
      setError(
        "Please enter and confirm your new password."
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "Your password must be at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error: updateError } =
      await supabase.auth.updateUser({
        password,
      });

    if (updateError) {
      console.error(
        "PASSWORD UPDATE ERROR:",
        updateError
      );

      setLoading(false);
      setError(updateError.message);
      return;
    }

    setLoading(false);

    setMessage(
      "Your password has been reset successfully."
    );

    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 1500);
  }

  if (checkingSession) {
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
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D4AF37]/[0.045] blur-3xl"
        />

        <div className="relative flex min-h-screen items-center justify-center px-5 py-10">
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center">
              <div className="absolute h-14 w-14 rounded-full border border-[#D4AF37]/35" />

              <svg
                viewBox="0 0 24 30"
                aria-hidden="true"
                className="h-9 w-9 text-[#D4AF37]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5.5 7.5L7.5 4L10 7L12 3L14 7L16.5 4L18.5 7.5" />
                <path d="M5.5 7.5L8 17.5H16L18.5 7.5L15.2 10L12 6L8.8 10L5.5 7.5Z" />
                <path d="M8 17.5h8" />
                <path d="M7.2 20.5h9.6" />
                <path d="M6.2 23.5h11.6" />
              </svg>
            </div>

            <p className="text-sm text-[#C8D2DF]">
              Checking password reset link...
            </p>
          </div>
        </div>
      </main>
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

          {/* MyCHESS Identity */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center">
              <div
                aria-hidden="true"
                className="absolute h-[70px] w-[70px] rounded-full border border-[#D4AF37]/35 shadow-[0_0_18px_rgba(212,175,55,0.08)]"
              />

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
                <path d="M5.5 7.5L7.5 4L10 7L12 3L14 7L16.5 4L18.5 7.5" />
                <path d="M5.5 7.5L8 17.5H16L18.5 7.5L15.2 10L12 6L8.8 10L5.5 7.5Z" />
                <path d="M8 17.5h8" />
                <path d="M7.2 20.5h9.6" />
                <path d="M6.2 23.5h11.6" />
              </svg>
            </div>

            <h1 className="font-serif text-3xl font-semibold tracking-[0.03em] text-white sm:text-[2rem]">
              MyCHESS
            </h1>

            <p className="mt-1 text-[0.68rem] font-medium tracking-[0.22em] text-[#D4AF37]">
              QUEENSLAND CHESS SCHOOL
            </p>
          </div>

          {/* Reset Password Card */}
          <div className="rounded-[20px] border border-[#D4AF37]/55 bg-[#102B4D] px-6 py-7 shadow-[0_0_35px_rgba(212,175,55,0.08)] sm:px-8 sm:py-8">

            <div className="mb-7 text-center">
              <h2 className="text-xl font-semibold tracking-wide text-white">
                Set a new password
              </h2>
            </div>

            {error ? (
              <div className="space-y-5">
                <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3">
                  <p className="text-center text-xs leading-relaxed text-red-300">
                    {error}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push("/forgot-password")
                  }
                  className="w-full rounded-xl bg-[#D4AF37] py-3 text-sm font-semibold tracking-wide text-[#011029] transition duration-200 hover:-translate-y-0.5 hover:bg-[#E2C45A] hover:shadow-[0_0_20px_rgba(212,175,55,0.22)] active:scale-[0.98]"
                >
                  Request New Reset Link
                </button>
              </div>
            ) : (
              <form
                className="space-y-4"
                onSubmit={handleResetPassword}
              >
                {/* New Password */}
                <div>
                  <label
                    htmlFor="new-password"
                    className="mb-1.5 block text-xs font-medium tracking-wide text-[#C8D2DF]"
                  >
                    New Password
                  </label>

                  <input
                    id="new-password"
                    type="password"
                    placeholder="Enter your new password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-[#C8D2DF]/30 bg-[#011029]/65 px-4 py-3 text-sm text-white outline-none transition duration-200 placeholder:text-[#C8D2DF]/45 focus:border-[#D4AF37] focus:bg-[#011029]/85 focus:shadow-[0_0_14px_rgba(212,175,55,0.12)]"
                  />
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirm-password"
                    className="mb-1.5 block text-xs font-medium tracking-wide text-[#C8D2DF]"
                  >
                    Confirm New Password
                  </label>

                  <input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-[#C8D2DF]/30 bg-[#011029]/65 px-4 py-3 text-sm text-white outline-none transition duration-200 placeholder:text-[#C8D2DF]/45 focus:border-[#D4AF37] focus:bg-[#011029]/85 focus:shadow-[0_0_14px_rgba(212,175,55,0.12)]"
                  />
                </div>

                {/* Reset Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full rounded-xl bg-[#D4AF37] py-3 text-sm font-semibold tracking-wide text-[#011029] transition duration-200 hover:-translate-y-0.5 hover:bg-[#E2C45A] hover:shadow-[0_0_20px_rgba(212,175,55,0.22)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Resetting..."
                    : "Reset Password"}
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

                {!message && (
                  <p className="pt-1 text-center text-[0.68rem] text-[#C8D2DF]/60">
                    Password must be at least 6 characters.
                  </p>
                )}
              </form>
            )}
          </div>

          {/* Footer */}
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