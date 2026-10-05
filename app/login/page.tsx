"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/currentUser";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { error: signInError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (signInError) {
      setLoading(false);
      setError(signInError.message);
      return;
    }

    // ====================================================
    // Resolve MyCHESS identity
    // ====================================================

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      await supabase.auth.signOut();

      setLoading(false);
      setError(
        "Your account is not configured for MyCHESS. Please contact the administrator."
      );

      return;
    }

    // ====================================================
    // Universal Portal Routing
    // ====================================================

    if (currentUser.role === "admin") {
      router.push("/admin/dashboard");
    } else if (currentUser.role === "coach") {
      router.push("/coach/dashboard");
    } else if (currentUser.role === "parent") {
      router.push("/parent/dashboard");
    } else {
      await supabase.auth.signOut();

      setLoading(false);
      setError(
        "Your MyCHESS account role could not be determined."
      );

      return;
    }

    router.refresh();
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
      {/* ====================================================
          Subtle ambient gold glow
      ==================================================== */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D4AF37]/[0.045] blur-3xl"
      />

      <div className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-6">
        <div className="w-full max-w-md">

          {/* ====================================================
              MyCHESS Identity
          ==================================================== */}
          <div className="mb-6 text-center">

            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center">

              {/* Gold ring */}
              <div
                aria-hidden="true"
                className="absolute h-[70px] w-[70px] rounded-full border border-[#D4AF37]/35 shadow-[0_0_18px_rgba(212,175,55,0.08)]"
              />

              {/* ==================================================
                  Pawn → Queen
                  Native SVG animation
              ================================================== */}
              <div className="relative h-12 w-12 text-[#D4AF37]">

                <svg
                  viewBox="0 0 24 30"
                  aria-hidden="true"
                  className="h-full w-full"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >

                  {/* ==================================================
                      PAWN
                  ================================================== */}
                  <g>
                    {/* Pawn head */}
                    <circle
                      cx="12"
                      cy="6"
                      r="2.7"
                    />

                    {/* Neck */}
                    <path d="M9.2 10.2h5.6" />

                    {/* Body */}
                    <path d="M10 10.2l-1.2 7.2h6.4L14 10.2" />

                    {/* Upper base */}
                    <path d="M8.2 17.4h7.6" />

                    {/* Lower base */}
                    <path d="M7 20.2h10" />

                    {/* Bottom */}
                    <path d="M6 23h12" />

                    {/* Pawn opacity animation */}
                    <animate
                      attributeName="opacity"
                      dur="6s"
                      repeatCount="indefinite"
                      values="1;1;0;0;1"
                      keyTimes="0;0.42;0.55;0.92;1"
                    />
                  </g>

                  {/* ==================================================
                      QUEEN
                  ================================================== */}
                  <g>

                    {/* High crown / three peaks */}
                    <path
                      d="M5.5 7.5L7.5 4L10 7L12 3L14 7L16.5 4L18.5 7.5"
                    />

                    {/* Crown body */}
                    <path
                      d="M5.5 7.5L8 17.5H16L18.5 7.5L15.2 10L12 6L8.8 10L5.5 7.5Z"
                    />

                    {/* Queen upper base */}
                    <path d="M8 17.5h8" />

                    {/* Queen middle base */}
                    <path d="M7.2 20.5h9.6" />

                    {/* Queen bottom base */}
                    <path d="M6.2 23.5h11.6" />

                    {/* Queen opacity animation */}
                    <animate
                      attributeName="opacity"
                      dur="6s"
                      repeatCount="indefinite"
                      values="0;0;1;1;0"
                      keyTimes="0;0.42;0.55;0.92;1"
                    />
                  </g>

                </svg>
              </div>
            </div>

            {/* MyCHESS */}
            <h1 className="font-serif text-3xl font-semibold tracking-[0.03em] text-white sm:text-[2rem]">
              MyCHESS
            </h1>

            <p className="mt-1 text-[0.68rem] font-medium tracking-[0.22em] text-[#D4AF37]">
              QUEENSLAND CHESS SCHOOL
            </p>
          </div>

          {/* ====================================================
              Login Card
          ==================================================== */}
          <div className="rounded-[20px] border border-[#D4AF37]/55 bg-[#102B4D] px-6 py-7 shadow-[0_0_35px_rgba(212,175,55,0.08)] sm:px-8 sm:py-8">

            <div className="mb-7 text-center">
              <h2 className="text-xl font-semibold tracking-wide text-white">
                Sign in to my portal
              </h2>
            </div>

            <form
              className="space-y-4"
              onSubmit={handleLogin}
            >

              {/* ==================================================
                  Email
              ================================================== */}
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-1.5 block text-xs font-medium tracking-wide text-[#C8D2DF]"
                >
                  Email
                </label>

                <input
                  id="login-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  autoComplete="email"
                  className="w-full rounded-xl border border-[#C8D2DF]/30 bg-[#011029]/65 px-4 py-3 text-sm text-white outline-none transition duration-200 placeholder:text-[#C8D2DF]/45 focus:border-[#D4AF37] focus:bg-[#011029]/85 focus:shadow-[0_0_14px_rgba(212,175,55,0.12)]"
                />
              </div>

              {/* ==================================================
                  Password
              ================================================== */}
              <div>
                <label
                  htmlFor="login-password"
                  className="mb-1.5 block text-xs font-medium tracking-wide text-[#C8D2DF]"
                >
                  Password
                </label>

                <input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-[#C8D2DF]/30 bg-[#011029]/65 px-4 py-3 text-sm text-white outline-none transition duration-200 placeholder:text-[#C8D2DF]/45 focus:border-[#D4AF37] focus:bg-[#011029]/85 focus:shadow-[0_0_14px_rgba(212,175,55,0.12)]"
                />
              </div>

              {/* ==================================================
                  Sign In
              ================================================== */}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-[#D4AF37] py-3 text-sm font-semibold tracking-wide text-[#011029] transition duration-200 hover:-translate-y-0.5 hover:bg-[#E2C45A] hover:shadow-[0_0_20px_rgba(212,175,55,0.22)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Signing In..."
                  : "Sign In"}
              </button>

              {/* ==================================================
                  Forgot Password
              ================================================== */}
              <div className="pt-1 text-right">
                <button
                  type="button"
                  onClick={() =>
                    router.push("/forgot-password")
                  }
                  className="text-xs text-[#D4AF37] transition duration-200 hover:text-white hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {/* ==================================================
                  Error
              ================================================== */}
              {error && (
                <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2">
                  <p className="text-center text-xs leading-relaxed text-red-300">
                    {error}
                  </p>
                </div>
              )}

            </form>
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