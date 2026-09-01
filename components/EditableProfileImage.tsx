"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import {
  uploadProfileImage,
  type ImageOwner,
  type ImageTarget,
} from "@/lib/uploadProfileImage";

type EditableProfileImageProps = {
  /** False for a visitor, which renders the children and nothing else. */
  canEdit: boolean;
  owner: ImageOwner;
  ownerId: string;
  target: ImageTarget;
  /** Called with the new URL once it is uploaded and saved. */
  onSaved: (url: string) => void;
  /** For the button's accessible name, e.g. "header image". */
  label: string;
  /** Matches the corner rounding of whatever it wraps, so the overlay lines up. */
  overlayClassName?: string;
  children: React.ReactNode;
};

/**
 * Wraps a picture on a profile and makes it replaceable in place.
 *
 * It wraps rather than renders, so the avatar and header keep the exact markup
 * and styling the profile already gave them and this adds only the overlay.
 *
 * It saves on its own the moment the upload finishes, rather than setting a
 * value some surrounding form still has to submit. That is the point of
 * editing here: there is no form around a header image, and asking someone to
 * find a Save button after they have already watched the picture change would
 * be the odd part.
 */
export function EditableProfileImage({
  canEdit,
  owner,
  ownerId,
  target,
  onSaved,
  label,
  overlayClassName = "",
  children,
}: EditableProfileImageProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setError(null);
    setBusy(true);

    try {
      const { url } = await uploadProfileImage({
        owner,
        ownerId,
        target,
        file,
      });

      const field = target === "avatar" ? "image_url" : "header_image_url";
      const endpoint =
        owner === "user" ? `/api/users/${ownerId}` : `/api/bands/${ownerId}`;

      // One field only, so nothing else on the profile is touched by changing
      // a picture.
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: url }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not save the picture");
      }

      onSaved(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  // After the hooks, so the rules of hooks hold for a visitor too.
  if (!canEdit) return <>{children}</>;

  return (
    <div className="group relative h-full w-full">
      {children}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={`Change ${label}`}
        className={`absolute inset-0 flex items-center justify-center bg-black/60 text-yellow-100 opacity-0 transition hover:cursor-pointer group-hover:opacity-100 focus-visible:opacity-100 disabled:cursor-wait ${
          busy ? "opacity-100" : ""
        } ${overlayClassName}`}
      >
        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <Camera className="h-6 w-6" />
        )}
      </button>

      {error && (
        <p className="absolute inset-x-0 -bottom-6 text-center text-xs text-red-300">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
