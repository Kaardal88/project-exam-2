"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { Trash2, Eye, EyeOff } from "lucide-react";

type DeleteBandModalProps = {
  isOpen: boolean;
  onClose: () => void;
  bandId: string;
  bandName: string;
  projectCount: number;
};

/**
 * Mirrors DeleteAccountModal: typing the name proves intent, but the password
 * is the real check, because a session cookie rides along with every request
 * from this browser and UI friction alone protects nothing on an unlocked
 * laptop.
 */
export function DeleteBandModal({
  isOpen,
  onClose,
  bandId,
  bandName,
  projectCount,
}: DeleteBandModalProps) {
  const router = useRouter();

  const [typedName, setTypedName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const nameMatches = typedName === bandName;
  const canSubmit = nameMatches && password !== "" && !deleting;

  async function handleDelete() {
    setError(null);
    setDeleting(true);

    try {
      const response = await fetch(`/api/bands/${bandId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ band_name: typedName, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not delete band");
        setDeleting(false);
        return;
      }

      router.push("/user");
    } catch {
      setError("Could not delete band");
      setDeleting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-[90vw] max-w-lg">
        <div className="mb-4 flex items-center gap-3">
          <Trash2 className="h-5 w-5 text-red-300" />
          <h2 className="text-xl font-bold text-yellow-100">Delete band</h2>
        </div>

        <div className="mb-6 rounded-md border border-red-900/60 bg-red-950/20 p-4 text-sm">
          <p className="mb-3 font-semibold text-red-300">
            This cannot be undone.
          </p>

          <ul className="list-inside list-disc space-y-1 text-neutral-300">
            <li>
              <span className="font-semibold text-yellow-100">{bandName}</span>{" "}
              is deleted permanently
            </li>
            <li>
              {projectCount === 0
                ? "No projects are attached"
                : `${projectCount} project${projectCount === 1 ? "" : "s"}, with every song, comment, task, note and file`}
            </li>
            <li>Every member loses access, including you</li>
            <li>The calendar and all its events</li>
          </ul>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-900/60 bg-red-950/20 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="mb-4">
          <label className="mb-2 block text-sm font-semibold text-yellow-100">
            Type <span className="font-mono">{bandName}</span> to confirm
          </label>

          <input
            type="text"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            autoComplete="off"
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
          />
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold text-yellow-100">
            Your password
          </label>

          <div className="flex items-center rounded-md border border-neutral-700 bg-neutral-950 focus-within:border-yellow-200">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full bg-transparent px-4 py-3 text-sm text-yellow-100 outline-none"
            />

            <button
              type="button"
              onClick={() => setShowPassword((shown) => !shown)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="px-3 text-neutral-400 transition hover:text-yellow-100"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-neutral-600 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:border-yellow-200 hover:bg-neutral-800"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={!canSubmit}
            className="rounded-full border border-red-900/60 bg-red-950/40 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-950/70 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deleting ? "Deleting…" : "Delete this band"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
