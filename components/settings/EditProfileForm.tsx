"use client";

import { useState } from "react";
import countries from "world-countries";
import { TagCombobox } from "@/components/userProfile/userMusInstTitle";

const countryOptions = countries
  .map((country) => ({ value: country.cca2, label: country.name.common }))
  .sort((a, b) => a.label.localeCompare(b.label));

type EditProfileFormProps = {
  userId: string;
  initialUsername: string;
  initialCountry: string;
  initialTags: string[];
};

/**
 * The text half of a profile, edited beside the password rather than in a
 * modal over the profile page.
 *
 * The pictures are deliberately not here. They are changed on the profile
 * itself, where you can see the crop against the header you are choosing it
 * for -- see docs/decisions/profile-editing.md.
 */
export function EditProfileForm({
  userId,
  initialUsername,
  initialCountry,
  initialTags,
}: EditProfileFormProps) {
  const [username, setUsername] = useState(initialUsername);
  const [country, setCountry] = useState(initialCountry);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    setError(null);
    setSuccess(false);
    setSaving(true);

    // Only the fields this form owns -- image_url and header_image_url are
    // absent, so the update leaves whatever the profile page set.
    const response = await fetch(`/api/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        country: country === "" ? null : country,
        tags,
      }),
    });

    setSaving(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Could not save your profile");
      return;
    }

    setSuccess(true);
  }

  const inputClass =
    "w-full rounded-md border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-yellow-100 outline-none transition focus:border-yellow-200";

  return (
    <section className="mb-8 rounded-md border border-neutral-700 bg-neutral-900/80 p-6">
      <h2 className="mb-1 text-lg font-bold text-yellow-100">Profile</h2>

      <p className="mb-4 text-sm text-neutral-400">
        Your pictures are changed on your profile page.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="profile-username"
            className="mb-2 block text-sm font-semibold text-yellow-100"
          >
            Username
          </label>

          <input
            id="profile-username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className={inputClass}
          />

          <p className="mt-1 text-xs text-neutral-500">
            This is your handle — people find you at /user/{username || "…"}.
          </p>
        </div>

        <div>
          <label
            htmlFor="profile-country"
            className="mb-2 block text-sm font-semibold text-yellow-100"
          >
            Where you are
          </label>

          <select
            id="profile-country"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            className={inputClass}
          >
            {/* Blank is a real answer, not a missing one -- Connect filters on
                this, and nobody has to publish where they live. */}
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

        {error && <p className="form-error">{error}</p>}

        {success && <p className="text-sm text-green-300">Profile saved.</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || username.trim().length < 2}
            className="rounded-full border border-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:cursor-pointer hover:bg-yellow-50 hover:text-black! disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>
    </section>
  );
}
