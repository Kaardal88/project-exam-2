"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { ProfileSection } from "@/components/bandProfile/ProfileSection";

type Band = {
  bio?: string | null;
  band_name: string;
};

type BioProps = {
  band: Band | null;
  /** True for a band leader, who gets the pencil. */
  canEdit?: boolean;
  bandId?: string | null;
  onSaved?: (bio: string) => void;
};

/**
 * The bio, edited where it is read.
 *
 * It used to be one field among sixteen in a modal that also held the band's
 * name, its address and its delete button. Writing a paragraph about your band
 * is a different act from renaming it, and this is the half you want to see
 * rendered while you work on it.
 */
export function Bio({ band, canEdit = false, bandId, onSaved }: BioProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setDraft(band?.bio ?? "");
    setError(null);
    setEditing(true);
  }

  async function handleSave() {
    if (!bandId) return;

    setSaving(true);
    setError(null);

    // Only the bio, so saving here cannot disturb anything else on the band.
    const response = await fetch(`/api/bands/${bandId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio: draft }),
    });

    setSaving(false);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Could not save the bio");
      return;
    }

    onSaved?.(draft);
    setEditing(false);
  }

  return (
    <ProfileSection
      title="Bio"
      forceOpen={editing}
      action={
        canEdit && !editing ? (
          <button
            type="button"
            onClick={startEditing}
            aria-label="Edit bio"
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-neutral-300 transition hover:cursor-pointer hover:bg-neutral-800 hover:text-yellow-100"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        ) : null
      }
    >
      {editing ? (
        <div className="space-y-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={8}
            autoFocus
            placeholder="Who is the band, and what should someone landing here know first?"
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
          />

          {error && <p className="text-sm text-red-300">{error}</p>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:cursor-pointer hover:border-neutral-500"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-full border border-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:cursor-pointer hover:bg-yellow-50 hover:text-black! disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save bio"}
            </button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm text-neutral-300">
          {band?.bio || "No bio yet."}
        </p>
      )}
    </ProfileSection>
  );
}
