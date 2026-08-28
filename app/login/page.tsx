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
    router.push("/parent/family");
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
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-6">
          MyChess Admin
        </h1>

        <p className="text-center text-gray-500 mb-8">
          Sign in to continue
        </p>

        <form className="space-y-4" onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border p-3"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border p-3"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>

          <div className="text-right">
  <button
    type="button"
    onClick={() => router.push("/forgot-password")}
    className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
  >
    Forgot password?
  </button>
</div>

          {error && (
            <p className="text-center text-sm text-red-600">
              {error}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}