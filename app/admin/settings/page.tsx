"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/currentUser";

type PaymentSettings = {
  id?: string;
  account_name: string;
  bsb: string;
  account_number: string;
  payment_reference: string;
  payment_reference_instruction: string;
payment_reference_example: string;
status: string;
};

type PopupState = {
  open: boolean;
  title: string;
  message: string;
  type: "info" | "success" | "error";
};

const emptySettings: PaymentSettings = {
  account_name: "",
  bsb: "",
  account_number: "",
  payment_reference: "Campus + Class + Student Name",
  payment_reference_instruction:
  "Please use the following payment reference: Campus + Class + Student Name (e.g. MacG Advanced Jayden X).",
payment_reference_example: "MacG Advanced Jayden X",
status: "Active",
};

export default function PaymentSettingsPage() {
  const [settings, setSettings] =
    useState<PaymentSettings>(emptySettings);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [popup, setPopup] = useState<PopupState>({
    open: false,
    title: "",
    message: "",
    type: "info",
  });

  function showPopup(
    title: string,
    message: string,
    type: PopupState["type"] = "info"
  ) {
    setPopup({
      open: true,
      title,
      message,
      type,
    });
  }

  function closePopup() {
    setPopup((previous) => ({
      ...previous,
      open: false,
    }));
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setErrorMessage("");

    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "admin") {
      setErrorMessage("Admin access is required.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("payment_settings")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    if (data) {
      setSettings({
        ...emptySettings,
        ...data,
      });
    }

    setLoading(false);
  }

  function updateField(
    field: keyof PaymentSettings,
    value: string
  ) {
    setSettings((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function saveSettings() {
    if (!settings.account_name.trim()) {
      showPopup(
        "Validation Required",
        "Please enter Account Name.",
        "error"
      );
      return;
    }

    if (!settings.bsb.trim()) {
      showPopup(
        "Validation Required",
        "Please enter BSB.",
        "error"
      );
      return;
    }

    if (!settings.account_number.trim()) {
      showPopup(
        "Validation Required",
        "Please enter Account Number.",
        "error"
      );
      return;
    }

    setSaving(true);

    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "admin") {
      showPopup(
        "Access Required",
        "Admin access is required.",
        "error"
      );
      setSaving(false);
      return;
    }

    const payload = {
      account_name: settings.account_name.trim(),
      bsb: settings.bsb.trim(),
      account_number: settings.account_number.trim(),
      payment_reference: settings.payment_reference.trim(),
payment_reference_instruction:
  settings.payment_reference_instruction.trim(),
payment_reference_example:
  settings.payment_reference_example.trim(),
status: settings.status,
      updated_at: new Date().toISOString(),
      updated_by: currentUser.userId,
    };

    let error;

    if (settings.id) {
      const result = await supabase
        .from("payment_settings")
        .update(payload)
        .eq("id", settings.id);

      error = result.error;
    } else {
      const result = await supabase
        .from("payment_settings")
        .insert([payload]);

      error = result.error;
    }

    if (error) {
      console.error("PAYMENT SETTINGS SAVE ERROR:", error);

      showPopup(
        "Save Failed",
        error.message,
        "error"
      );

      setSaving(false);
      return;
    }

    await loadSettings();
    setSaving(false);

    showPopup(
      "Saved Successfully",
      "Central Payment Settings have been saved.",
      "success"
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="overflow-hidden rounded-2xl border border-[#D9E0E8] border-t-4 border-t-[#D4AF37] bg-white shadow-sm">
            <div className="p-8">
              <p className="text-sm text-[#10213A]">
                Loading Payment Settings...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="overflow-hidden rounded-2xl border border-[#D9E0E8] border-t-4 border-t-[#D4AF37] bg-white shadow-sm">
            <div className="p-8">
              <h1 className="text-2xl font-bold text-[#10213A]">
                Central Payment Settings
              </h1>

              <p className="mt-4 text-sm text-red-600">
                {errorMessage}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-[#F4F7FB] sm:text-4xl">
              Central Payment Settings
            </h1>

            <p className="mt-2 text-sm text-[#C8D2DF]/70 sm:text-base">
              Manage the payment details used by MyCHESS communications.
            </p>
          </div>

          <div className="max-w-4xl">
            <div className="overflow-hidden rounded-2xl border border-[#D9E0E8] border-t-4 border-t-[#D4AF37] bg-white shadow-sm">
              <div className="border-b border-[#D9E0E8] px-5 py-5 sm:px-6">
                <h2 className="text-lg font-semibold text-[#10213A]">
                  Bank Account Details
                </h2>

                <p className="mt-1 text-sm leading-6 text-[#64748B]">
                  These details will be used dynamically in future payment emails.
                </p>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#10213A]">
                    Account Name
                  </label>

                  <input
                    value={settings.account_name}
                    onChange={(e) =>
                      updateField("account_name", e.target.value)
                    }
                    placeholder="Enter account name"
                    className="min-h-[48px] w-full rounded-xl border border-[#D9E0E8] bg-white px-4 text-sm text-[#10213A] outline-none transition-colors hover:border-[#B9C3D0] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#10213A]">
                    BSB
                  </label>

                  <input
                    value={settings.bsb}
                    onChange={(e) =>
                      updateField("bsb", e.target.value)
                    }
                    placeholder="Enter BSB"
                    className="min-h-[48px] w-full rounded-xl border border-[#D9E0E8] bg-white px-4 text-sm text-[#10213A] outline-none transition-colors hover:border-[#B9C3D0] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#10213A]">
                    Account Number
                  </label>

                  <input
                    value={settings.account_number}
                    onChange={(e) =>
                      updateField("account_number", e.target.value)
                    }
                    placeholder="Enter account number"
                    className="min-h-[48px] w-full rounded-xl border border-[#D9E0E8] bg-white px-4 text-sm text-[#10213A] outline-none transition-colors hover:border-[#B9C3D0] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#10213A]">
                    Status
                  </label>

                  <select
                    value={settings.status}
                    onChange={(e) =>
                      updateField("status", e.target.value)
                    }
                    className="min-h-[48px] w-full rounded-xl border border-[#D9E0E8] bg-white px-4 text-sm text-[#10213A] outline-none transition-colors hover:border-[#B9C3D0] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="border-t border-[#D9E0E8] pt-6">
                  <h2 className="text-lg font-semibold text-[#10213A]">
                    Payment Reference
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-[#64748B]">
                    Define the reference format used for payment instructions.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#10213A]">
                    Reference Format
                  </label>

                  <input
                    value={settings.payment_reference}
                    onChange={(e) =>
                      updateField("payment_reference", e.target.value)
                    }
                    className="min-h-[48px] w-full rounded-xl border border-[#D9E0E8] bg-white px-4 text-sm text-[#10213A] outline-none transition-colors hover:border-[#B9C3D0] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#10213A]">
                    Reference Instruction
                  </label>

                  <textarea
                    value={settings.payment_reference_instruction}
                    onChange={(e) =>
                      updateField(
                        "payment_reference_instruction",
                        e.target.value
                      )
                    }
                    rows={4}
                    className="w-full rounded-xl border border-[#D9E0E8] bg-white px-4 py-3 text-sm leading-6 text-[#10213A] outline-none transition-colors hover:border-[#B9C3D0] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
                  />
                </div>

                <div>
  <label className="mb-2 block text-sm font-medium text-[#10213A]">
    Payment Reference Example
  </label>

  <input
    value={settings.payment_reference_example}
    onChange={(e) =>
      updateField("payment_reference_example", e.target.value)
    }
    placeholder="e.g. MacG Advanced Jayden X"
    className="min-h-[48px] w-full rounded-xl border border-[#D9E0E8] bg-white px-4 text-sm text-[#10213A] outline-none transition-colors hover:border-[#B9C3D0] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30"
  />
</div>

                <div className="pt-1">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={saveSettings}
                    className="min-h-[48px] w-full rounded-xl bg-[#10213A] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1A3154] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[160px]"
                  >
                    {saving ? "Saving..." : "Save Settings"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {popup.open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07172B]/55 px-4 backdrop-blur-[2px]"
          onClick={closePopup}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-popup-title"
            className="w-full max-w-[440px] overflow-hidden rounded-2xl border border-[#D9E0E8] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1 bg-[#D4AF37]" />

            <div className="p-6 sm:p-7">
              <div className="flex items-start gap-4">
                <div
                  className={
                    popup.type === "success"
                      ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700"
                      : popup.type === "error"
                        ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600"
                        : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#10213A]"
                  }
                >
                  {popup.type === "success"
                    ? "✓"
                    : popup.type === "error"
                      ? "!"
                      : "i"}
                </div>

                <div className="min-w-0 flex-1">
                  <h2
                    id="payment-popup-title"
                    className="text-lg font-semibold text-[#10213A]"
                  >
                    {popup.title}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#64748B]">
                    {popup.message}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={closePopup}
                  autoFocus
                  className="min-h-[44px] min-w-[88px] rounded-xl bg-[#10213A] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1A3154] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}