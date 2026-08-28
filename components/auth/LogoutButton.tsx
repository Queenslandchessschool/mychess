"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LogoutButton() {
  const router = useRouter();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("LOGOUT ERROR:", error);
      setLoggingOut(false);
      return;
    }

    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* ======================================================
          Logout
         ====================================================== */}

      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={loggingOut}
        className="
          flex
          w-full
          items-center
          gap-3
          px-3
          py-3
          text-sm
          font-medium
          text-[#C8D2DF]
          transition-colors
          duration-200
          hover:text-[#D4AF37]
          disabled:cursor-not-allowed
          disabled:opacity-50
        "
      >
        <span
          className="
            flex
            h-7
            w-7
            shrink-0
            items-center
            justify-center
            text-base
          "
        >
          ↪
        </span>

        <span>
          Log out
        </span>
      </button>

      {/* ======================================================
          Confirm Sign Out Modal
         ====================================================== */}

      {confirmOpen && (
        <div
  className="
    fixed
    inset-0
    z-[999]
    flex
    items-start
    justify-center
    bg-[#011029]/75
    px-4
    pt-20
    backdrop-blur-sm
    sm:items-center
    sm:pt-0
  "
>
          <div
  className="
    w-full
    max-w-md
    max-h-[calc(100vh-10rem)]
    overflow-y-auto
    rounded-2xl
    border
    border-[#D4AF37]/40
    bg-[#FFFDF8]
    text-[#10213A]
    shadow-2xl
  "
>
            <div
              className="
                h-[5px]
                bg-[#D4AF37]
              "
            />

            <div className="p-6 sm:p-7">
              <div className="mb-6">
                <div
                  className="
                    text-xs
                    font-semibold
                    uppercase
                    tracking-[0.18em]
                    text-[#A78312]
                  "
                >
                  Confirm Sign Out
                </div>

                <h2
                  className="
                    mt-2
                    text-2xl
                    font-semibold
                    text-[#10213A]
                  "
                >
                  Sign out of MyCHESS?
                </h2>

                <p
                  className="
                    mt-2
                    text-sm
                    leading-6
                    text-[#64748B]
                  "
                >
                  Are you sure you want to sign out?
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  disabled={loggingOut}
                  className="
                    rounded-lg
                    border
                    border-[#D4AF37]/35
                    bg-transparent
                    px-4
                    py-2.5
                    text-sm
                    font-medium
                    text-[#52657A]
                    transition-colors
                    duration-200
                    hover:border-[#D4AF37]/70
                    hover:text-[#10213A]
                  "
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="
                    rounded-lg
                    border
                    border-[#D4AF37]
                    bg-[#D4AF37]
                    px-4
                    py-2.5
                    text-sm
                    font-semibold
                    text-[#10213A]
                    transition-colors
                    duration-200
                    hover:bg-[#F0C94A]
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >
                  {loggingOut ? "Signing Out..." : "Sign Out"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}