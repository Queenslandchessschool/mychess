"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CoachProfile = {
  first_name: string;
  last_name: string;
  display_name: string | null;
  title: string | null;
  email: string | null;
  mobile: string | null;
  blue_card: string | null;
  blue_card_expiry: string | null;
  status: string;
};

function displayValue(value: string | null | undefined): string {
  return value?.trim() || "Not provided";
}

function formatDate(value: string | null): string {
  if (!value) return "Not provided";

  const date = new Date(value + "T00:00:00");

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Australia/Brisbane",
  }).format(date);
}

export default function CoachProfilePage() {
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error("Please sign in to view your Coach Profile.");
        }

        const { data, error: profileError } = await supabase
          .from("coaches")
          .select(
            "first_name, last_name, display_name, title, email, mobile, blue_card, blue_card_expiry, status"
          )
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("COACH PROFILE LOAD ERROR:", profileError);
          throw new Error(
            "Unable to load your Coach Profile. Please try again later."
          );
        }

        if (!data) {
          throw new Error(
            "No Coach record is linked to the signed-in account."
          );
        }

        if (!cancelled) {
          setProfile(data as CoachProfile);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "An unexpected error occurred while loading your profile."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[50dvh] w-full max-w-[1500px] items-center justify-center px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <div className="text-center">
          <div
            aria-label="Loading"
            className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#D4AF37]/25 border-t-[#D4AF37]"
          />
          <p className="mt-4 text-sm text-[#C8D2DF]">
            Loading Coach Profile...
          </p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <section className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/35 bg-[#152F50]">
          <div className="absolute left-0 right-0 top-0 h-[3px] bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/55 to-transparent" />

          <div className="p-5 sm:p-6">
            <h1 className="text-3xl font-bold tracking-tight text-[#F4F7FB] sm:text-4xl">
              My Profile
            </h1>

            <p className="mt-3 break-words text-sm leading-6 text-red-300">
              {error || "Coach profile could not be found."}
            </p>
          </div>
        </section>
      </div>
    );
  }

  const fullName = [
    profile.title,
    profile.first_name,
    profile.last_name,
  ]
    .filter((part) => Boolean(part?.trim()))
    .join(" ");

  const isActive = profile.status?.toLowerCase() === "active";

  const fields = [
    {
      label: "Title",
      value: displayValue(profile.title),
      icon: "♟",
    },
    {
      label: "First Name",
      value: displayValue(profile.first_name),
      icon: "♙",
    },
    {
      label: "Last Name",
      value: displayValue(profile.last_name),
      icon: "♙",
    },
    {
      label: "Display Name",
      value: displayValue(profile.display_name),
      icon: "♔",
    },
    {
      label: "Email Address",
      value: displayValue(profile.email),
      icon: "✉",
    },
    {
      label: "Mobile Number",
      value: displayValue(profile.mobile),
      icon: "☎",
    },
    {
      label: "Blue Card Number",
      value: displayValue(profile.blue_card),
      icon: "▤",
    },
    {
      label: "Blue Card Expiry",
      value: formatDate(profile.blue_card_expiry),
      icon: "▦",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      {/* PAGE HEADER — aligned with MyClass */}
      <section className="mb-6 sm:mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[#F4F7FB] sm:text-4xl">
          My Profile
        </h1>

        <p className="mt-2 text-sm text-[#C8D2DF] sm:text-base">
          View your registered coach details and Blue Card information.
        </p>

        <div className="mt-5 h-[2px] w-24 bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/60 to-transparent" />
      </section>

      {/* PROFILE SUMMARY */}
      <section className="relative mb-6 overflow-hidden rounded-2xl border border-[#D4AF37]/35 bg-[#152F50]">
        <div className="absolute left-0 right-0 top-0 h-[3px] bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/55 to-transparent" />

        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/30 bg-[#011029] text-3xl text-[#D4AF37] sm:h-16 sm:w-16">
              ♚
            </div>

            <div className="min-w-0">
              <h2 className="break-words text-xl font-semibold text-[#F4F7FB] sm:text-2xl">
                {fullName || "Coach"}
              </h2>

              <p className="mt-2 text-xs text-[#A9B8CA]">
                Registered Coach
              </p>
            </div>
          </div>

          <span
            className={
              "inline-flex w-fit shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold " +
              (isActive
                ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-300"
                : "border-[#D9E3ED]/20 bg-[#011029]/60 text-[#C8D2DF]")
            }
          >
            <span
              className={
                "h-1.5 w-1.5 rounded-full " +
                (isActive ? "bg-emerald-300" : "bg-[#A9B8CA]")
              }
            />
            {displayValue(profile.status)}
          </span>
        </div>
      </section>

      {/* PROFILE DETAILS — matches MyClass card styling */}
      <section className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/35 bg-[#152F50]">
        <div className="absolute left-0 right-0 top-0 h-[3px] bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/55 to-transparent" />

        <div className="border-b border-[#C8D2DF]/15 px-5 py-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">
            PROFILE DETAILS
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px bg-[#C8D2DF]/15 sm:grid-cols-2">
          {fields.map((field) => (
            <div
              key={field.label}
              className="flex min-w-0 items-start gap-3 bg-[#152F50] px-5 py-4 transition-colors duration-200 hover:bg-[#1A385C] sm:px-6"
            >
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#D4AF37]/20 bg-[#011029]/60 text-base text-[#D4AF37]"
              >
                {field.icon}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#D4AF37]">
                  {field.label}
                </p>

                <p className="mt-1 break-words text-sm leading-6 text-[#F4F7FB] sm:text-base">
                  {field.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-[#C8D2DF]/15 px-5 py-4 sm:px-6">
          <p className="text-xs leading-5 text-[#C8D2DF] sm:text-sm">
            These details are read from your registered Coach record. To
            request a correction, please contact the administrator.
          </p>
        </div>
      </section>
    </div>
  );
}