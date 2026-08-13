"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { Trash2 } from "lucide-react";
import AmpLoader from "@/components/AmpLoader";

type BandOutcome = {
  band_id: string;
  band_name: string;
  outcome: "deleted" | "transferred" | "kept";
  successor: { id: string; username: string } | null;
};

type DeleteAccountModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username: string;
};

function BandConsequence({ band }: { band: BandOutcome }) {
  if (band.outcome === "deleted") {
    return (
      <li className="text-red-300">
        <span className="font-semibold">{band.band_name}</span> is deleted
        permanently — you are its only member.
      </li>
    );
  }

  if (band.outcome === "transferred") {
    return (
      <li className="text-neutral-300">
        <span className="font-semibold text-yellow-100">{band.band_name}</span>{" "}
        carries on without you.{" "}
        <span className="font-semibold text-yellow-100">
          {band.successor?.username}
        </span>{" "}
        becomes band leader.
      </li>
    );
  }

  return (
    <li className="text-neutral-300">
      <span className="font-semibold text-yellow-100">{band.band_name}</span>{" "}
      carries on without you. You are removed as a member.
    </li>
  );
}

export function DeleteAccountModal({
  isOpen,
  onClose,
  userId,
  username,
}: DeleteAccountModalProps) {
  const router = useRouter();

  const [bands, setBands] = useState<BandOutcome[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [confirmName, setConfirmName] = useState("");
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    async function loadPreview() {
      setLoadingPreview(true);
      setError(null);

      const token = localStorage.getItem("token");

      const response = await fetch("/api/users/me/deletion-preview", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not load what deletion would affect");
        setLoadingPreview(false);
        return;
      }

      setBands(data.bands ?? []);
      setLoadingPreview(false);
    }

    loadPreview();
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setConfirmName("");
    setPassword("");
    setError(null);
    onClose();
  }, [onClose]);

  const canSubmit =
    confirmName === username && password.length > 0 && !deleting;

  async function handleDelete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) return;

    setDeleting(true);
    setError(null);

    const token = localStorage.getItem("token");

    const response = await fetch(`/api/users/${userId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ username: confirmName, password }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Could not delete account");
      setDeleting(false);
      return;
    }

    localStorage.removeItem("token");
    router.push("/");
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="max-h-[85vh] w-[90vw] max-w-lg overflow-y-auto">
        <h2 className="mb-1 text-xl font-bold text-yellow-100">
          Delete account
        </h2>
        <p className="mb-4 text-sm text-neutral-400">
          This cannot be undone. Read what happens before you confirm.
        </p>

        <div className="rounded-md border border-red-900/60 bg-red-950/20 p-4">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-red-300">
            What gets deleted
          </h3>

          <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-neutral-300">
            <li>Your profile, avatar and roles.</li>
            <li>Your private calendar and every event only you can see.</li>
            <li>
              Your access to every band — you lose it immediately, and getting
              back in means a new invite.
            </li>
          </ul>

          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-yellow-200">
            What stays
          </h3>

          <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-neutral-300">
            <li>
              Songs, comments, notes and files you added to a band stay with
              that band, credited to a deleted user.
            </li>
          </ul>

          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-yellow-200">
            Your bands
          </h3>

          {loadingPreview ? (
            <div className="flex justify-center py-4">
              <AmpLoader />
            </div>
          ) : bands.length === 0 ? (
            <p className="mb-2 text-sm text-neutral-400">
              You are not a member of any band.
            </p>
          ) : (
            <ul className="mb-2 list-disc space-y-1 pl-5 text-sm">
              {bands.map((band) => (
                <BandConsequence key={band.band_id} band={band} />
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={handleDelete} className="mt-4 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-yellow-100">
              Type your username{" "}
              <span className="font-mono text-neutral-400">({username})</span>{" "}
              to confirm
            </label>

            <input
              type="text"
              value={confirmName}
              onChange={(event) => setConfirmName(event.target.value)}
              autoComplete="off"
              className="w-full border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-yellow-100">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="w-full border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:cursor-pointer hover:border-neutral-500"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!canSubmit}
              className="flex items-center gap-2 rounded-md border border-red-700 bg-red-900/60 px-4 py-2 text-sm font-semibold text-red-100 transition hover:cursor-pointer hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-red-900/60"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Deleting..." : "Delete my account"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
