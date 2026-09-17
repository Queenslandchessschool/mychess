"use client";
import { findVariables } from "@/lib/email/variableRenderer";

interface EmailTemplateFormProps {
  form: {
    template_name: string;
    business_event: string;
    status: string;
    subject: string;
    body: string;
    available_variables: string[];
    updated_at: string;
    updated_by: string | null;
  };
  setForm: (value: EmailTemplateFormProps["form"]) => void;
  onSave: () => void;
  editingTemplate?: any;
  onCancel?: () => void;
}

const inputClass = `
  w-full
  rounded-lg
  border border-[#D9E0E8]
  bg-white
  px-3 py-2.5
  text-sm
  text-[#10213A]
  placeholder:text-[#C8D2DF]
  outline-none
  transition-colors duration-200
  hover:border-[#B9C3D0]
  focus:border-[#D4AF37]
  focus:ring-1
  focus:ring-[#D4AF37]/30
`;

const readOnlyClass = `
  w-full
  rounded-lg
  border border-[#D9E0E8]
  bg-[#F8F5ED]
  px-3 py-2.5
  text-sm
  text-[#64748B]
`;

const selectClass = `
  w-full
  rounded-lg
  border border-[#D9E0E8]
  bg-white
  px-3 py-2.5
  text-sm
  text-[#10213A]
  outline-none
  transition-colors duration-200
  hover:border-[#B9C3D0]
  focus:border-[#D4AF37]
  focus:ring-1
  focus:ring-[#D4AF37]/30
`;

export default function EmailTemplateForm({
  form,
  setForm,
  onSave,
  editingTemplate,
  onCancel,
}: EmailTemplateFormProps) {

  const displayVariables = Array.from(
  new Set([
    ...findVariables(form.subject),
    ...findVariables(form.body),
  ])
);
  return (
    <section
      className="
        overflow-hidden
        rounded-[18px]
        border
        border-[#D9E0E8]
        bg-white
        shadow-sm
      "
    >
      {/* Gold gradient top border */}
      <div
        className="
          h-[3px]
          w-full
          bg-gradient-to-r
          from-[#D4AF37]
          via-[#E8C75A]
          to-transparent
        "
      />

      <div className="p-6">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#D4AF37]">
          EMAIL TEMPLATE INFORMATION
        </p>

        <div className="mt-6 space-y-4">
          {/* Template Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Template Name
            </label>

            <input
  className={editingTemplate ? readOnlyClass : inputClass}
  value={form.template_name}
  readOnly={!!editingTemplate}
  onChange={(e) =>
    setForm({
      ...form,
      template_name: e.target.value,
    })
  }
  placeholder="Template Name"
/>
          </div>

          {/* Business Event */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Business Event
            </label>

            <input
  className={editingTemplate ? readOnlyClass : inputClass}
  value={form.business_event}
  readOnly={!!editingTemplate}
  onChange={(e) =>
    setForm({
      ...form,
      business_event: e.target.value,
    })
  }
  placeholder="Business Event"
/>
          </div>

          {/* Status */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Status
            </label>

            <select
              className={selectClass}
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value,
                })
              }
            >
              <option
                value="Active"
                className="bg-white text-[#10213A]"
              >
                Active
              </option>

              <option
                value="Inactive"
                className="bg-white text-[#10213A]"
              >
                Inactive
              </option>
            </select>
          </div>

          {/* Email Subject */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Email Subject
            </label>

            <input
              className={inputClass}
              placeholder="Email Subject"
              value={form.subject}
              onChange={(e) =>
                setForm({
                  ...form,
                  subject: e.target.value,
                })
              }
            />
          </div>

          {/* Email Body */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Email Body
            </label>

            <textarea
              rows={12}
              className={`${inputClass} resize-y font-mono text-xs leading-5`}
              placeholder="Email Body"
              value={form.body}
              onChange={(e) =>
                setForm({
                  ...form,
                  body: e.target.value,
                })
              }
            />
          </div>

          {/* Available Variables */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Available Variables
            </label>

            <div className="rounded-lg border border-[#D9E0E8] bg-[#F8F5ED] p-3">
              <div className="flex flex-wrap gap-2">
                {displayVariables.length === 0 ? (
  <span className="text-xs text-[#94A3B8]">
    No variables
  </span>
) : (
  displayVariables.map((variable) => (
                    <span
                      key={variable}
                      className="
                        rounded-full
                        border
                        border-[#D4AF37]/35
                        bg-white
                        px-2.5
                        py-1
                        text-xs
                        font-medium
                        text-[#64748B]
                      "
                    >
                      [{variable}]
                    </span>
                  ))
                )}
              </div>
            </div>

            <p className="mt-1.5 text-xs leading-5 text-[#94A3B8]">
              Variables are system-defined and cannot be edited here.
            </p>
          </div>

          {/* Last Updated */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Last Updated
            </label>

            <input
              className={readOnlyClass}
              value={form.updated_at}
              readOnly
            />
          </div>

          {/* Updated By */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Updated By
            </label>

            <input
              className={readOnlyClass}
              value={form.updated_by ?? "—"}
              readOnly
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
  <button
    type="button"
    onClick={onSave}
    className="
      flex-1
      rounded-lg
      border
      border-[#D4AF37]
      bg-[#0D2444]
      py-2.5
      text-sm
      font-medium
      text-[#D4AF37]
      transition-colors
      duration-200
      hover:border-[#E8C75A]
      hover:bg-[#152D4D]
      active:bg-[#102B4D]
    "
  >
    {editingTemplate ? "Save Changes" : "Create Template"}
  </button>

  {editingTemplate && onCancel && (
    <button
      type="button"
      onClick={onCancel}
      className="
        rounded-lg
        border border-[#D9E0E8]
        px-4
        text-sm
        font-medium
        text-[#64748B]
        transition-colors
        duration-200
        hover:border-[#D4AF37]
        hover:text-[#8A6900]
      "
    >
      Cancel
    </button>
  )}
</div>
        </div>
      </div>
    </section>
  );
}