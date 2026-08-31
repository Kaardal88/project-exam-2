"use client";

import countries from "world-countries";
import { SuccessMessage } from "@/components/SuccessMessage";
import { TagCombobox } from "@/components/userProfile/userMusInstTitle";

// Same cca2 list the band pages use, sorted by name because a select is read
// alphabetically and world-countries is not in that order.
const countryOptions = countries
  .map((country) => ({ value: country.cca2, label: country.name.common }))
  .sort((a, b) => a.label.localeCompare(b.label));

type EditUserProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent<HTMLFormElement>) => void;
  saving?: boolean;
  success?: boolean;

  username: string;
  setUsername: (value: string) => void;

  imageUrl: string;
  setImageUrl: (value: string) => void;

  headerImageUrl: string;
  setHeaderImageUrl: (value: string) => void;

  tags: string[];
  setTags: (value: string[]) => void;

  country: string;
  setCountry: (value: string) => void;
};

export function EditUserProfileModal({
  isOpen,
  onClose,
  onSave,
  saving = false,
  success = false,
  username,
  setUsername,
  imageUrl,
  setImageUrl,
  headerImageUrl,
  setHeaderImageUrl,
  tags,
  setTags,
  country,
  setCountry,
}: EditUserProfileModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg h-[calc(90vh-4rem)] overflow-y-auto rounded-[1.5rem] border border-neutral-700 bg-neutral-900 shadow-2xl scrollbar scrollbar-thumb-neutral-800 ">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
          <h2 className="text-xl font-bold text-yellow-100">Edit profile</h2>

          <button
            onClick={onClose}
            className="text-neutral-400 transition hover:text-yellow-100"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSave} className="space-y-5 p-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-yellow-100">
              Username
            </label>

            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-yellow-100">
              Profile image URL
            </label>

            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-yellow-100">
              Header image URL
            </label>

            <input
              type="text"
              value={headerImageUrl}
              onChange={(e) => setHeaderImageUrl(e.target.value)}
              className="w-full border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-yellow-100">
              Where you are
            </label>

            <select
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              className="w-full border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
            >
              {/* Blank is a real answer, not a missing one -- Connect filters
                  on this, and nobody has to publish where they live. */}
              <option value="">Rather not say</option>

              {countryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="text-yellow-100">
            <TagCombobox value={tags} onChange={setTags} />
          </div>
          {/* Buttons */}
          <div className="flex  justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:border-neutral-500"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || success}
              className="border border-yellow-200 bg-yellow-100 px-4 py-2 text-sm font-bold text-neutral-950 transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-80"
            >
              {success ? (
                <SuccessMessage message="Profile saved" tone="dark" />
              ) : saving ? (
                "Saving..."
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
