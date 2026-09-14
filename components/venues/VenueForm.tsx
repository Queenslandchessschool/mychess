"use client";

interface VenueFormProps {
  form: any;
  setForm: (value: any) => void;
  onSave: () => void;
  editingVenue?: any;
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

export default function VenueForm({
  form,
  setForm,
  onSave,
  editingVenue,
  onCancel,
}: VenueFormProps) {
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
          VENUE INFORMATION
        </p>

        <div className="mt-6 space-y-4">
          {/* Campus Code */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Campus Code <span className="text-[#D4AF37]">*</span>
            </label>

            <input
              className={inputClass}
              placeholder="Campus Code"
              value={form.campus_code}
              onChange={(e) =>
                setForm({
                  ...form,
                  campus_code: e.target.value,
                })
              }
            />
          </div>

          {/* Campus Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Campus Name <span className="text-[#D4AF37]">*</span>
            </label>

            <input
              className={inputClass}
              placeholder="Campus Name"
              value={form.campus_name}
              onChange={(e) =>
                setForm({
                  ...form,
                  campus_name: e.target.value,
                })
              }
            />
          </div>

          {/* Short Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Short Name <span className="text-[#D4AF37]">*</span>
            </label>

            <input
              className={inputClass}
              placeholder="Short Name"
              value={form.short_name}
              onChange={(e) =>
                setForm({
                  ...form,
                  short_name: e.target.value,
                })
              }
            />
          </div>

          {/* Address */}
          <input
            className={inputClass}
            placeholder="Address"
            value={form.address}
            onChange={(e) =>
              setForm({
                ...form,
                address: e.target.value,
              })
            }
          />

          {/* Type */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Type
            </label>

            <select
              className={selectClass}
              value={form.type}
              onChange={(e) =>
                setForm({
                  ...form,
                  type: e.target.value,
                })
              }
            >
              <option value="">Select type</option>

              <option value="Main Campus">
                Main Campus
              </option>

              <option value="Branch Campus">
                Branch Campus
              </option>

              <option value="School Program">
                School Program
              </option>

              <option value="ONLINE">
                ONLINE
              </option>
            </select>
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
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Notes */}
          <textarea
            rows={4}
            className={inputClass}
            placeholder="Notes"
            value={form.notes}
            onChange={(e) =>
              setForm({
                ...form,
                notes: e.target.value,
              })
            }
          />

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
                active:border-[#D4AF37]
                active:bg-[#102B4D]
              "
            >
              {editingVenue
                ? "Update Venue"
                : "Create Venue"}
            </button>

            {editingVenue && onCancel && (
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