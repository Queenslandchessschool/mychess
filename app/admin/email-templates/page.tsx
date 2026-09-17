"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { findVariables } from "@/lib/email/variableRenderer";

import EmailTemplateForm from "@/components/email/EmailTemplateForm";
import EmailTemplateTable from "@/components/email/EmailTemplateTable";

const emptyForm = {
  template_name: "",
  business_event: "",
  status: "Active",
  subject: "",
  body: "",
  available_variables: [] as string[],
  updated_at: "",
  updated_by: null as string | null,
};

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [editingTemplate, setEditingTemplate] =
    useState<any | null>(null);

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .order("updated_at", { ascending: false });

    if (!error && data) {
      setTemplates(data);
    }
  }

  function resetForm() {
    setEditingTemplate(null);
    setForm(emptyForm);
  }

  function startEditing(template: any) {
    setEditingTemplate(template);

    setForm({
      template_name: template.template_name ?? "",
      business_event: template.business_event ?? "",
      status: template.status ?? "Active",
      subject: template.subject ?? "",
      body: template.body ?? "",
      available_variables:
        Array.isArray(template.available_variables)
          ? template.available_variables
          : [],
      updated_at: template.updated_at ?? "",
      updated_by: template.updated_by ?? null,
    });
  }

  async function saveTemplate() {
  if (!form.template_name.trim()) {
    alert("Please enter the template name.");
    return;
  }

  if (!form.business_event.trim()) {
    alert("Please enter the business event.");
    return;
  }

  if (!form.subject.trim()) {
    alert("Please enter the email subject.");
    return;
  }

  if (!form.body.trim()) {
    alert("Please enter the email body.");
    return;
  }

  const availableVariables = Array.from(
  new Set([
    ...findVariables(form.subject),
    ...findVariables(form.body),
  ])
);

  // Get the currently authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    alert("Unable to identify the current user. Please log in again.");
    return;
  }

  if (editingTemplate) {
    // Update existing template
    const { error } = await supabase
      .from("email_templates")
      .update({
  subject: form.subject.trim(),
  body: form.body,
  status: form.status,
  available_variables: availableVariables,
  updated_by: user.id,
})
      .eq("id", editingTemplate.id);

    if (error) {
      alert(error.message);
      return;
    }
  } else {
    // Create new template
    const { error } = await supabase
      .from("email_templates")
      .insert({
  template_name: form.template_name.trim(),
  business_event: form.business_event.trim(),
  status: form.status,
  subject: form.subject.trim(),
  body: form.body,
  available_variables: availableVariables,
  updated_by: user.id,
})

    if (error) {
      alert(error.message);
      return;
    }
  }

  resetForm();
  await loadTemplates();
}

  const filteredTemplates = templates.filter((template) => {
    const keyword = searchTerm.toLowerCase().trim();

    const matchesSearch =
      !keyword ||
      template.template_name
        ?.toLowerCase()
        .includes(keyword) ||
      template.business_event
        ?.toLowerCase()
        .includes(keyword) ||
      template.subject
        ?.toLowerCase()
        .includes(keyword);

    const matchesStatus =
      statusFilter === "All" ||
      template.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <main className="min-h-screen">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">

        {/* Page Header */}
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#D4AF37]">
            EMAIL TEMPLATES
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#F4F7FB] sm:text-3xl">
            Email Template Library
          </h1>

          <p className="mt-1 text-sm text-[#C8D2DF]/75">
            Manage centralised email templates.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="mb-6 rounded-[18px] border border-[#D4AF37]/30 bg-[#102B4D] p-4">
          <div className="flex flex-col gap-3 sm:flex-row">

            <input
              type="text"
              placeholder="Search by template, event or subject..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              className="
                min-w-0
                flex-1
                rounded-lg
                border
                border-white/70
                bg-white
                px-3
                py-2.5
                text-sm
                text-[#10213A]
                placeholder:text-[#64748B]
                outline-none
                transition-colors
                duration-200
                hover:border-[#D4AF37]
                focus:border-[#D4AF37]
                focus:ring-1
                focus:ring-[#D4AF37]/30
              "
            />

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
              className="
                w-full
                rounded-lg
                border
                border-white/70
                bg-white
                px-3
                py-2.5
                text-sm
                text-[#10213A]
                outline-none
                transition-colors
                duration-200
                hover:border-[#D4AF37]
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">

          {/* Email Template Form */}
          <div>
            <EmailTemplateForm
              form={form}
              setForm={setForm}
              onSave={saveTemplate}
              editingTemplate={editingTemplate}
              onCancel={resetForm}
            />
          </div>

          {/* Email Template Table */}
          <div className="min-w-0 lg:col-span-2">
            <EmailTemplateTable
              templates={filteredTemplates}
              onEdit={startEditing}
            />
          </div>

        </div>

      </div>
    </main>
  );
}