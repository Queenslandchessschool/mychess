"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ParentProfile = {
  first_name: string | null;
  last_name: string | null;
  mobile: string | null;
  email: string | null;
  relationship: string | null;
  parent1_name: string | null;
  parent2_name: string | null;
  preferred_contact: string | null;
  address: string | null;
  family_id: string | null;
};

function displayValue(value: string | null | undefined): string {
  return value?.trim() || "Not provided";
}

export default function ParentProfilePage() {
  const [profile, setProfile] = useState<ParentProfile | null>(null);
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
          throw new Error("Please sign in to view your Parent Profile.");
        }

        const email = user.email?.trim().toLowerCase();

        if (!email) {
          throw new Error(
            "Your account does not have an email address."
          );
        }

        const { data, error: profileError } = await supabase
          .from("parents")
          .select(
            "first_name, last_name, mobile, email, relationship, parent1_name, parent2_name, preferred_contact, address, family_id"
          )
          .ilike("email", email);

        if (profileError) {
          console.error("PARENT PROFILE LOAD ERROR:", profileError);
          throw new Error(
            "Unable to load your Parent Profile. Please try again later."
          );
        }

        if (!data || data.length === 0) {
          throw new Error(
            "No Parent record is linked to this account."
          );
        }

        const parentRecord =
          data.find((row) => row.family_id) ?? data[0];

        if (!cancelled) {
          setProfile(parentRecord as ParentProfile);
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

    void loadProfile();

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
            Loading Parent Profile...
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
              {error || "Parent profile could not be found."}
            </p>
          </div>
        </section>
      </div>
    );
  }

  const fullName =
    [profile.first_name, profile.last_name]
      .filter((part) => Boolean(part?.trim()))
      .join(" ") ||
    profile.parent1_name?.trim() ||
    "Parent";

  const fields = [
    { label: "First Name", value: displayValue(profile.first_name), icon: "♙" },
    { label: "Last Name", value: displayValue(profile.last_name), icon: "♙" },
    { label: "Email Address", value: displayValue(profile.email), icon: "✉" },
    { label: "Mobile Number", value: displayValue(profile.mobile), icon: "☎" },
    { label: "Relationship", value: displayValue(profile.relationship), icon: "♔" },
    { label: "Preferred Contact", value: displayValue(profile.preferred_contact), icon: "✉" },
    { label: "Address", value: displayValue(profile.address), icon: "⌂" },
    { label: "Family ID", value: displayValue(profile.family_id), icon: "♟" },
    { label: "Parent 1 Name", value: displayValue(profile.parent1_name), icon: "♙" },
    { label: "Parent 2 Name", value: displayValue(profile.parent2_name), icon: "♙" },
  ];

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <section className="mb-6 sm:mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[#F4F7FB] sm:text-4xl">
          My Profile
        </h1>

        <p className="mt-2 text-sm text-[#C8D2DF] sm:text-base">
          View my registered parent and contact details.
        </p>

        <div className="mt-5 h-[2px] w-24 bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/60 to-transparent" />
      </section>

      <section className="relative mb-6 overflow-hidden rounded-2xl border border-[#D4AF37]/35 bg-[#152F50]">
        <div className="absolute left-0 right-0 top-0 h-[3px] bg-gradient-to-r from-[#D4AF37] via-[#D4AF37]/55 to-transparent" />

        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#D4AF37]/30 bg-[#011029] text-3xl text-[#D4AF37] sm:h-16 sm:w-16">
              ♚
            </div>

            <div className="min-w-0">
              <h2 className="break-words text-xl font-semibold text-[#F4F7FB] sm:text-2xl">
                {fullName}
              </h2>

              <p className="mt-2 text-xs text-[#A9B8CA]">
                Registered Parent
              </p>
            </div>
          </div>

          <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-[#D9E3ED]/20 bg-[#011029]/60 px-3 py-1.5 text-xs font-semibold text-[#C8D2DF]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#A9B8CA]" />
            Read only
          </span>
        </div>
      </section>

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
            These details are read from your registered Parent record. To
            request a correction, please contact the administrator.
          </p>
        </div>
      </section>
    </div>
  );
}