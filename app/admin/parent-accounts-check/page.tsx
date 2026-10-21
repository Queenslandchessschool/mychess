
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const CONFIRM_PHRASE = "CREATE_PARENT_ACCOUNTS";

export default function ParentAccountsCheckPage() {
  const [result, setResult] = useState("Ready to check.");
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  async function sendRequest(mode: "preflight" | "create") {
    if (loading) return;

    if (mode === "create" && confirmation !== CONFIRM_PHRASE) {
      setResult(`To enable creation, enter exactly: ${CONFIRM_PHRASE}`);
      return;
    }

    if (
      mode === "create" &&
      !window.confirm(
        "Create up to 10 parent accounts? Existing accounts will not be changed. No emails will be sent."
      )
    ) {
      return;
    }

    setLoading(true);
    setResult(
      mode === "create"
        ? "Creating up to 10 accounts..."
        : "Checking..."
    );

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setResult("No active session. Please log in again.");
        return;
      }

      const response = await fetch("/api/admin/parent-accounts", {
        method: mode === "preflight" ? "GET" : "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          ...(mode === "create"
            ? { "Content-Type": "application/json" }
            : {}),
        },
        ...(mode === "create"
          ? {
              body: JSON.stringify({
                mode: "create",
                confirmPhrase: CONFIRM_PHRASE,
                limit: 10,
              }),
            }
          : {}),
        cache: "no-store",
      });

      const payload = await response.json();

      setResult(
        JSON.stringify(
          {
            httpStatus: response.status,
            result: payload,
          },
          null,
          2
        )
      );

      if (response.ok && mode === "create") {
        setConfirmation("");
      }
    } catch (error) {
      setResult(
        error instanceof Error ? error.message : "Unexpected error."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen text-[#F4F7FB]">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <header className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
            MyCHESS · ADMIN
          </p>

          <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
            Parent Account Management
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#C8D2DF] sm:text-base">
            Review existing parent accounts and safely create missing
            accounts. Read-only checks do not change accounts or send emails.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <section className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-[#152D4D] p-5 sm:p-6">
            <div className="absolute left-0 top-0 h-[3px] w-2/5 bg-gradient-to-r from-[#D4AF37] to-transparent" />

            <h2 className="text-lg font-bold sm:text-xl">
              Read-only Check
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#C8D2DF]">
              Inspect account coverage before taking any action. This check
              does not create accounts, change passwords or send emails.
            </p>

            <button
              type="button"
              onClick={() => sendRequest("preflight")}
              disabled={loading}
              className="mt-5 rounded-xl border border-[#D4AF37]/50 bg-[#0B1D35] px-4 py-3 text-sm font-semibold text-[#F4F7FB] transition-colors hover:border-[#D4AF37] hover:bg-[#1A3558] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Please wait..." : "Run Read-only Check"}
            </button>
          </section>

          <section className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/50 bg-[#152D4D] p-5 sm:p-6">
            <div className="absolute left-0 top-0 h-[3px] w-2/5 bg-gradient-to-r from-[#D4AF37] to-transparent" />

            <h2 className="text-lg font-bold sm:text-xl">
              Batch Account Creation
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#C8D2DF]">
              Create up to 10 missing parent accounts per batch. Existing
              accounts and the two excluded test emails are protected.
              Initial passwords use the last four digits of the registered
              mobile number. Passwords are never displayed here, and no
              emails are sent.
            </p>

            <div className="mt-5">
              <label
                htmlFor="confirmation"
                className="mb-2 block text-sm font-medium text-[#F4F7FB]"
              >
                Enter the confirmation phrase:
              </label>

              <input
                id="confirmation"
                type="text"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder={CONFIRM_PHRASE}
                disabled={loading}
                className="w-full rounded-xl border border-white/25 bg-[#0B1D35] px-4 py-3 text-sm text-[#F4F7FB] outline-none placeholder:text-[#91A2B8] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] disabled:opacity-50"
              />

              <p className="mt-2 text-xs leading-5 text-[#C8D2DF]">
                Review the read-only results before creating any accounts.
                Creation requires the exact phrase.
              </p>
            </div>

            <button
              type="button"
              onClick={() => sendRequest("create")}
              disabled={loading || confirmation !== CONFIRM_PHRASE}
              className="mt-4 rounded-xl border border-[#D4AF37]/60 bg-[#8B5E18] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#A87520] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Processing..." : "Create Next 10 Accounts"}
            </button>
          </section>
        </div>

        <section className="mt-6 overflow-hidden rounded-2xl border border-white/15 bg-[#0B1D35]">
          <div className="border-b border-white/10 px-5 py-4 sm:px-6">
            <h2 className="text-base font-bold sm:text-lg">
              Operation Results
            </h2>
            <p className="mt-1 text-sm text-[#C8D2DF]">
              Results from the most recent check or creation request.
            </p>
          </div>

          <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-xs leading-6 text-[#DCE6F2] sm:p-6 sm:text-sm">
            {result}
          </pre>
        </section>
      </div>
    </main>
  );
}
