"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import VenueForm from "@/components/venues/VenueForm";
import VenueTable from "@/components/venues/VenueTable";

import ChessboardBackground from "@/components/layout/ChessboardBackground";

const emptyForm = {
  campus_code: "",
  campus_name: "",
  short_name: "",
  address: "",
  type: "",
  status: "Active",
  notes: "",
};

export default function VenuesPage() {
  const [venues, setVenues] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editingVenue, setEditingVenue] = useState<any | null>(null);

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadVenues();
  }, []);

  async function loadVenues() {
    const { data, error } = await supabase
      .from("campuses")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setVenues(data);
    }
  }

  function resetForm() {
    setEditingVenue(null);
    setForm(emptyForm);
  }

  async function saveVenue() {
    if (!form.campus_code.trim()) {
      alert("Please enter the campus code.");
      return;
    }

    if (!form.campus_name.trim()) {
      alert("Please enter the campus name.");
      return;
    }

    if (!form.short_name.trim()) {
      alert("Please enter the short name.");
      return;
    }

    if (editingVenue) {
      // Update existing venue
      const { error } = await supabase
        .from("campuses")
        .update({
          campus_code: form.campus_code.trim(),
          campus_name: form.campus_name.trim(),
          short_name: form.short_name.trim(),
          address: form.address.trim() || null,
          type: form.type || null,
          status: form.status,
          notes: form.notes.trim() || null,
        })
        .eq("id", editingVenue.id);

      if (error) {
        alert(error.message);
        return;
      }
    } else {
      // Create new venue
      const { error } = await supabase
        .from("campuses")
        .insert({
          campus_code: form.campus_code.trim(),
          campus_name: form.campus_name.trim(),
          short_name: form.short_name.trim(),
          address: form.address.trim() || null,
          type: form.type || null,
          status: "Active",
          notes: form.notes.trim() || null,
        });

      if (error) {
        alert(error.message);
        return;
      }
    }

    resetForm();
    await loadVenues();
  }

  async function toggleVenueStatus(venue: any) {
    const newStatus =
      venue.status === "Active"
        ? "Inactive"
        : "Active";

    const { error } = await supabase
      .from("campuses")
      .update({
        status: newStatus,
      })
      .eq("id", venue.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadVenues();
  }

  const filteredVenues = venues.filter((venue) => {
    const keyword = searchTerm.toLowerCase().trim();

    const matchesSearch =
      !keyword ||
      venue.campus_code
        ?.toLowerCase()
        .includes(keyword) ||
      venue.campus_name
        ?.toLowerCase()
        .includes(keyword) ||
      venue.short_name
        ?.toLowerCase()
        .includes(keyword) ||
      venue.address
        ?.toLowerCase()
        .includes(keyword) ||
      venue.type
        ?.toLowerCase()
        .includes(keyword);

    const matchesStatus =
      statusFilter === "All" ||
      venue.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <ChessboardBackground>
      <main className="min-h-screen">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#D4AF37]">
              VENUES
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#F4F7FB] sm:text-3xl">
              Venue Management
            </h1>

            <p className="mt-1 text-sm text-[#C8D2DF]/75">
              Review and update venue information.
            </p>
          </div>

          {/* Search & Filter */}
          <div className="mb-6 rounded-[18px] border border-[#D4AF37]/30 bg-[#102B4D] p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Search venues..."
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
              <VenueForm
                form={form}
                setForm={setForm}
                onSave={saveVenue}
                editingVenue={editingVenue}
                onCancel={resetForm}
              />
            </div>

            <div className="min-w-0 lg:col-span-3">
              <VenueTable
                venues={filteredVenues}
                onEdit={(venue) => {
                  setEditingVenue(venue);

                  setForm({
                    campus_code:
                      venue.campus_code ?? "",
                    campus_name:
                      venue.campus_name ?? "",
                    short_name:
                      venue.short_name ?? "",
                    address:
                      venue.address ?? "",
                    type:
                      venue.type ?? "",
                    status:
                      venue.status ?? "Active",
                    notes:
                      venue.notes ?? "",
                  });
                }}
                onToggleStatus={toggleVenueStatus}
              />
            </div>
          </div>
        </div>
      </main>
    </ChessboardBackground>
  );
}