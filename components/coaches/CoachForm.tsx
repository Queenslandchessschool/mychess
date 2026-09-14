"use client";

interface CoachFormProps {
  form: any;
  setForm: (value: any) => void;
  onSave: () => void;
  editingCoach?: any;
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

export default function CoachForm({
  form,
  setForm,
  onSave,
  editingCoach,
  onCancel,
}: CoachFormProps) {
  const getBlueCardStatus = () => {
    if (!form.blue_card_expiry) {
      return "";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(`${form.blue_card_expiry}T00:00:00`);

    return expiry >= today ? "Active" : "Expired";
  };

  const blueCardStatus = getBlueCardStatus();

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
          COACH INFORMATION
        </p>

        <div className="mt-6 space-y-4">
          {/* First Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              First Name <span className="text-[#D4AF37]">*</span>
            </label>

            <input
              className={inputClass}
              placeholder="First Name"
              value={form.first_name}
              onChange={(e) =>
                setForm({
                  ...form,
                  first_name: e.target.value,
                })
              }
            />
          </div>

          {/* Last Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Last Name <span className="text-[#D4AF37]">*</span>
            </label>

            <input
              className={inputClass}
              placeholder="Last Name"
              value={form.last_name}
              onChange={(e) =>
                setForm({
                  ...form,
                  last_name: e.target.value,
                })
              }
            />
          </div>

          {/* Display Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Display Name <span className="text-[#D4AF37]">*</span>
            </label>

            <input
              className={inputClass}
              placeholder="Display Name"
              value={form.display_name}
              onChange={(e) =>
                setForm({
                  ...form,
                  display_name: e.target.value,
                })
              }
            />
          </div>

          {/* Title */}
          <input
            className={inputClass}
            placeholder="Title"
            value={form.title}
            onChange={(e) =>
              setForm({
                ...form,
                title: e.target.value,
              })
            }
          />

          {/* Mobile */}
          <input
            className={inputClass}
            placeholder="Mobile"
            value={form.mobile}
            onChange={(e) =>
              setForm({
                ...form,
                mobile: e.target.value,
              })
            }
          />

          {/* Email */}
          <input
            type="email"
            className={inputClass}
            placeholder="Email"
            value={form.email}
            onChange={(e) =>
              setForm({
                ...form,
                email: e.target.value,
              })
            }
          />

          {/* Blue Card Status */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Blue Card
            </label>

            <div
              className={`
                flex
                min-h-[42px]
                w-full
                items-center
                rounded-lg
                border
                border-[#D9E0E8]
                bg-[#F8FAFC]
                px-3
                py-2.5
                text-sm
                ${
                  blueCardStatus === "Expired"
                    ? "text-[#64748B]"
                    : blueCardStatus === "Active"
                    ? "text-[#39734A]"
                    : "text-[#94A3B8]"
                }
              `}
            >
              {blueCardStatus || "—"}
            </div>
          </div>

          {/* Blue Card Expiry */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Expiry
            </label>

            <input
              type="date"
              className={inputClass}
              value={form.blue_card_expiry}
              onChange={(e) =>
                setForm({
                  ...form,
                  blue_card_expiry: e.target.value,
                })
              }
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
  {editingCoach ? "Update Coach" : "Create Coach"}
</button>

            {editingCoach && onCancel && (
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