"use client";

interface ParentFormProps {
  form: any;
  setForm: (value: any) => void;
  onSave: () => void;
  editingParent?: any;
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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidAustralianMobile(mobile: string) {
  const value = mobile.replace(/\s+/g, "");

  return (
    /^04\d{8}$/.test(value) ||
    /^\+614\d{8}$/.test(value)
  );
}

export default function ParentForm({
  form,
  setForm,
  onSave,
  editingParent,
  onCancel,
}: ParentFormProps) {
  function handleSave() {
    const parentName = form.parent1_name?.trim() || "";
    const email = form.email?.trim() || "";
    const mobile = form.mobile?.trim() || "";

    if (!parentName) {
      alert("Parent Name is required.");
      return;
    }

    if (!email) {
      alert("Email is required.");
      return;
    }

    if (!isValidEmail(email)) {
      alert("Please enter a valid email address.");
      return;
    }

    if (!mobile) {
      alert("Mobile is required.");
      return;
    }

    if (!isValidAustralianMobile(mobile)) {
      alert(
        "Please enter a valid Australian mobile number."
      );
      return;
    }

    setForm({
      ...form,
      parent1_name: parentName,
      email,
      mobile,
    });

    onSave();
  }

  return (
    <section
      className="
        overflow-hidden
        rounded-[18px]
        border
        border-[#D4AF37]/30
        bg-white
      "
    >
      {/* Gold top border */}
      <div className="h-1 bg-gradient-to-r from-[#D4AF37] via-[#F1D36A] to-[#D4AF37]" />

      <div className="p-6">
        {/* Section Label */}
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#D4AF37]">
          PARENT INFORMATION
        </p>

        <div className="mt-6 space-y-4">

          {/* Parent Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Parent Name *
            </label>

            <input
              className={inputClass}
              placeholder="Parent Name"
              value={form.parent1_name ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  parent1_name: e.target.value,
                })
              }
            />
          </div>

          {/* Parent 2 Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Parent 2 Name
            </label>

            <input
              className={inputClass}
              placeholder="Parent 2 Name"
              value={form.parent2_name ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  parent2_name: e.target.value,
                })
              }
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Email *
            </label>

            <input
              type="email"
              className={inputClass}
              placeholder="Email"
              value={form.email ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value,
                })
              }
            />
          </div>

          {/* Mobile */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Mobile *
            </label>

            <input
              type="tel"
              className={inputClass}
              placeholder="04xx xxx xxx"
              value={form.mobile ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  mobile: e.target.value,
                })
              }
            />
          </div>

          {/* Preferred Contact */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Preferred Contact
            </label>

            <select
              className={selectClass}
              value={form.preferred_contact ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  preferred_contact: e.target.value,
                })
              }
            >
              <option value="">
                Select preferred contact
              </option>

              <option value="Email">
                Email
              </option>

              <option value="Mobile">
                Mobile
              </option>
            </select>
          </div>

          {/* Relationship */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Relationship
            </label>

            <input
              className={inputClass}
              placeholder="e.g. Parent, Dad, Mum"
              value={form.relationship ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  relationship: e.target.value,
                })
              }
            />
          </div>

          {/* Address */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Address
            </label>

            <textarea
              rows={3}
              className={inputClass}
              placeholder="Address"
              value={form.address ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  address: e.target.value,
                })
              }
            />
          </div>

          {/* Family ID - Read Only */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
              Family ID
            </label>

            <input
              className="
                w-full
                rounded-lg
                border border-[#E2E8F0]
                bg-[#F8FAFC]
                px-3 py-2.5
                text-sm
                font-medium
                text-[#64748B]
                outline-none
              "
              value={form.family_id ?? ""}
              readOnly
            />

            <p className="mt-1.5 text-xs text-[#94A3B8]">
              Family ID is automatically managed by the system.
            </p>
          </div>

          {/* Update / Cancel */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleSave}
              className="
                flex-1
                rounded-lg
                bg-[#2161F5]
                py-2.5
                text-sm
                font-medium
                text-white
                transition-all
                duration-200
                hover:bg-[#1955DE]
                active:scale-[0.98]
              "
            >
              Update Parent
            </button>

            {editingParent && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="
                  rounded-lg
                  border border-[#D9E0E8]
                  bg-white
                  px-4
                  text-sm
                  font-medium
                  text-[#64748B]
                  transition-all
                  duration-200
                  hover:border-[#D4AF37]
                  hover:bg-[#FFFDF5]
                  hover:text-[#8A6900]
                  active:scale-[0.98]
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