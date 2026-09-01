"use client";

import { useState } from "react";
import { ExternalLink, Pencil } from "lucide-react";
import { ProfileSection } from "@/components/bandProfile/ProfileSection";
import {
  socialPlatforms,
  type SocialColumn,
  type SocialLinkValues,
} from "@/lib/socialPlatforms";

type SocialsProps = {
  band: SocialLinkValues | null;
  /** True for a band leader, who gets the pencil. */
  canEdit?: boolean;
  bandId?: string | null;
  onSaved?: (links: Record<SocialColumn, string>) => void;
};

/**
 * Where the band is, everywhere else -- shown and edited in the same card.
 *
 * The eight links used to be eight copies of the same block here and eight
 * more text inputs in the profile modal. They read from one list now, so a
 * ninth platform is one line rather than two blocks that can disagree.
 */
export function SocialLinks({
  band,
  canEdit = false,
  bandId,
  onSaved,
}: SocialsProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setDraft(
      Object.fromEntries(
        socialPlatforms.map((platform) => [
          platform.column,
          band?.[platform.column] ?? "",
        ]),
      ),
    );
    setError(null);
    setEditing(true);
  }

  async function handleSave() {
    if (!bandId) return;

    setSaving(true);
    setError(null);

    // Only the link columns, so the rest of the band is untouched by a save
    // here.
    const response = await fetch(`/api/bands/${bandId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });

    setSaving(false);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Could not save the links");
      return;
    }

    onSaved?.(draft as Record<SocialColumn, string>);
    setEditing(false);
  }

  const present = socialPlatforms.filter((platform) => band?.[platform.column]);

  return (
    <ProfileSection
      title="Social links"
      forceOpen={editing}
      action={
        canEdit && !editing ? (
          <button
            type="button"
            onClick={startEditing}
            aria-label="Edit social links"
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
          {socialPlatforms.map((platform) => {
            const Icon = platform.icon;

            return (
              <div key={platform.column}>
                <label
                  htmlFor={`social-${platform.column}`}
                  className="mb-1 flex items-center gap-2 text-sm font-semibold text-yellow-100"
                >
                  <Icon className={`h-4 w-4 ${platform.colorClass}`} />
                  {platform.label}
                </label>

                <input
                  id={`social-${platform.column}`}
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  value={draft[platform.column] ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [platform.column]: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
                />
              </div>
            );
          })}

          {error && <p className="text-sm text-red-300">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
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
              {saving ? "Saving…" : "Save links"}
            </button>
          </div>
        </div>
      ) : present.length === 0 ? (
        <p className="text-sm text-neutral-400">No links yet.</p>
      ) : (
        <div className="space-y-3">
          {present.map((platform) => {
            const Icon = platform.icon;

            return (
              <a
                key={platform.column}
                href={band?.[platform.column] ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-950/60 px-4 py-3 transition hover:border-yellow-200 hover:bg-neutral-800"
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${platform.colorClass}`} />
                  <span>{platform.label}</span>
                </div>

                <ExternalLink className="h-4 w-4 text-neutral-500 transition group-hover:text-yellow-100" />
              </a>
            );
          })}
        </div>
      )}
    </ProfileSection>
  );
}
