"use client";

import { useState } from "react";
import { synchroniseStudentStage } from "@/lib/studentSynchronisation";

const STUDENT_ID =
  "f40fa1cf-cbb7-474e-ae84-9684d55c410b";

const ACADEMIC_YEAR = 2026;
const TERM = 3;

export default function TestStudentSynchronisationPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function runTest() {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const syncResult = await synchroniseStudentStage(
        STUDENT_ID,
        ACADEMIC_YEAR,
        TERM
      );

      setResult(syncResult);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Synchronisation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#011029] px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
          MyCHESS Developer Test
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Student Synchronisation
        </h1>

        <div className="mt-6 rounded-2xl border border-[#D4AF37]/40 bg-[#FFFDF8] p-6 text-[#011029]">
          <div className="space-y-2 text-sm">
            <p>
              <strong>Student ID:</strong>{" "}
              {STUDENT_ID}
            </p>

            <p>
              <strong>Academic Year:</strong>{" "}
              {ACADEMIC_YEAR}
            </p>

            <p>
              <strong>Term:</strong> {TERM}
            </p>
          </div>

          <button
            type="button"
            onClick={runTest}
            disabled={loading}
            className="
              mt-6
              rounded-lg
              bg-[#D4AF37]
              px-5
              py-3
              font-semibold
              text-[#011029]
              transition
              hover:bg-[#F4D35E]
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {loading
              ? "Synchronising..."
              : "Run Synchronisation Test"}
          </button>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <strong>Error:</strong>
              <div className="mt-1">
                {error}
              </div>
            </div>
          )}

          {result && (
            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              <p className="font-semibold">
                Synchronisation completed
              </p>

              <div className="mt-3 space-y-1">
                <p>
                  Previous Stage:{" "}
                  <strong>
                    {result.previousStage}
                  </strong>
                </p>

                <p>
                  New Stage:{" "}
                  <strong>
                    {result.newStage}
                  </strong>
                </p>

                <p>
                  Changed:{" "}
                  <strong>
                    {String(result.changed)}
                  </strong>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}