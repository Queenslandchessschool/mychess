"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import CoachForm from "@/components/coaches/CoachForm";
import CoachTable from "@/components/coaches/CoachTable";

import ChessboardBackground from "@/components/layout/ChessboardBackground";

const emptyForm = {
  first_name: "",
  last_name: "",
  display_name: "",
  title: "",
  mobile: "",
  email: "",
  blue_card: "",
  blue_card_expiry: "",
  status: "Active",
  notes: "",
};

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editingCoach, setEditingCoach] = useState<any | null>(null);

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadCoaches();
  }, []);

  async function loadCoaches() {
    const { data, error } = await supabase
      .from("coaches")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCoaches(data);
    }
  }

  function resetForm() {
    setEditingCoach(null);
    setForm(emptyForm);
  }

  async function updateCoach() {
  if (!form.first_name.trim()) {
    alert("Please enter the coach's first name.");
    return;
  }

  if (!form.last_name.trim()) {
    alert("Please enter the coach's last name.");
    return;
  }

  if (!form.display_name.trim()) {
    alert("Please enter the coach's display name.");
    return;
  }

  if (editingCoach) {
    // Update existing coach
    const { error } = await supabase
      .from("coaches")
      .update({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        display_name: form.display_name.trim(),
        title: form.title.trim() || null,
        mobile: form.mobile.trim() || null,
        email: form.email.trim() || null,
        blue_card_expiry:
          form.blue_card_expiry || null,
        status: form.status,
        notes: form.notes.trim() || null,
      })
      .eq("id", editingCoach.id);

    if (error) {
      alert(error.message);
      return;
    }
  } else {
    // Create new coach
    const { error } = await supabase
      .from("coaches")
      .insert({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        display_name: form.display_name.trim(),
        title: form.title.trim() || null,
        mobile: form.mobile.trim() || null,
        email: form.email.trim() || null,
        blue_card_expiry:
          form.blue_card_expiry || null,
        status: "Active",
        notes: form.notes.trim() || null,
      });

    if (error) {
      alert(error.message);
      return;
    }
  }

  resetForm();
  await loadCoaches();
}

  async function toggleCoachStatus(coach: any) {
    const newStatus =
      coach.status === "Active"
        ? "Inactive"
        : "Active";

    const { error } = await supabase
      .from("coaches")
      .update({
        status: newStatus,
      })
      .eq("id", coach.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadCoaches();
  }

  const filteredCoaches = coaches.filter((coach) => {
    const keyword = searchTerm.toLowerCase().trim();

    const matchesSearch =
      !keyword ||
      coach.display_name
        ?.toLowerCase()
        .includes(keyword) ||
      coach.first_name
        ?.toLowerCase()
        .includes(keyword) ||
      coach.last_name
        ?.toLowerCase()
        .includes(keyword) ||
      coach.title
        ?.toLowerCase()
        .includes(keyword) ||
      coach.email
        ?.toLowerCase()
        .includes(keyword) ||
      coach.mobile
        ?.toLowerCase()
        .includes(keyword);

    const matchesStatus =
      statusFilter === "All" ||
      coach.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <ChessboardBackground>
      <main className="min-h-screen">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#D4AF37]">
              COACHES
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#F4F7FB] sm:text-3xl">
              Coach Management
            </h1>

            <p className="mt-1 text-sm text-[#C8D2DF]/75">
              Review and update coach information.
            </p>
          </div>

          {/* Search & Filter */}
          <div className="mb-6 rounded-[18px] border border-[#D4AF37]/30 bg-[#102B4D] p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Search coaches..."
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(e.target.value)
                }
                className="
                  w-full
                  rounded-lg
                  border
                  border-[#D4AF37]/20
                  bg-[#0D2444]
                  px-3
                  py-2.5
                  text-sm
                  text-[#F4F7FB]
                  placeholder:text-[#C8D2DF]/50
                  outline-none
                  transition-colors
                  duration-200
                  focus:border-[#D4AF37]
                  focus:ring-1
                  focus:ring-[#D4AF37]/30
                  sm:flex-1
                "
              />

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
                className="
                  rounded-lg
                  border
                  border-[#D4AF37]/20
                  bg-[#0D2444]
                  px-3
                  py-2.5
                  text-sm
                  text-[#F4F7FB]
                  outline-none
                  transition-colors
                  duration-200
                  focus:border-[#D4AF37]
                  focus:ring-1
                  focus:ring-[#D4AF37]/30
                  sm:w-40
                "
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 lg:gap-8">
            <div>
              <CoachForm
                form={form}
                setForm={setForm}
                onSave={updateCoach}
                editingCoach={editingCoach}
                onCancel={resetForm}
              />
            </div>

            <div className="min-w-0 lg:col-span-3">
              <CoachTable
                coaches={filteredCoaches}
                onEdit={(coach) => {
                  setEditingCoach(coach);

                  setForm({
                    first_name:
                      coach.first_name ?? "",
                    last_name:
                      coach.last_name ?? "",
                    display_name:
                      coach.display_name ?? "",
                    title: coach.title ?? "",
                    mobile: coach.mobile ?? "",
                    email: coach.email ?? "",
                    blue_card:
                      coach.blue_card ?? "",
                    blue_card_expiry:
                      coach.blue_card_expiry ?? "",
                    status:
                      coach.status ?? "Active",
                    notes: coach.notes ?? "",
                  });
                }}
                onToggleStatus={toggleCoachStatus}
              />
            </div>
          </div>
        </div>
      </main>
    </ChessboardBackground>
  );
}