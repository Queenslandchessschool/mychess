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

      if (
        event === "PASSWORD_RECOVERY" &&
        session
      ) {
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
      setError("Please enter and confirm your new password.");
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
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">
          Checking password reset link...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-3">
          Set New Password
        </h1>

        <p className="text-center text-gray-500 mb-8">
          Enter your new password below.
        </p>

        {error ? (
          <div className="space-y-6">
            <p className="text-center text-sm text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                router.push("/forgot-password")
              }
              className="w-full rounded-lg bg-blue-600 py-3 text-white font-semibold hover:bg-blue-700"
            >
              Request New Reset Link
            </button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={handleResetPassword}
          >
            <input
              type="password"
              placeholder="New Password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              className="w-full rounded-lg border p-3"
            />

            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              className="w-full rounded-lg border p-3"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading
                ? "Resetting..."
                : "Reset Password"}
            </button>

            {message && (
              <p className="text-center text-sm text-green-600">
                {message}
              </p>
            )}
          </form>
        )}

        {!error && !message && (
          <div className="mt-4 text-center text-xs text-gray-500">
            Password must be at least 6 characters.
          </div>
        )}
      </div>
    </main>
  );
}