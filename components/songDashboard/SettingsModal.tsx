"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { Trash2 } from "lucide-react";

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  songId: string;
  projectId: string;
  role: string | null;
};

export function SettingsModal({
  isOpen,
  onClose,
  songId,
  projectId,
  role,
}: SettingsModalProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLeader = role === "band_leader";

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    const token = localStorage.getItem("token");

    const response = await fetch(`/api/songs/${songId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      setError("Failed to delete song");
      setDeleting(false);
      return;
    }

    router.push(`/pages/projectDetails/${projectId}`);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setConfirming(false);
        onClose();
      }}
    >
      <div className="w-[90vw] max-w-md">
        <h2 className="mb-4 text-xl font-bold text-yellow-100">Settings</h2>

        <div className="rounded-md border border-red-900/60 bg-red-950/20 p-4">
          <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-red-300">
            Danger zone
          </h3>

          {!isLeader && (
            <p className="mb-3 text-xs text-neutral-400">
              Only the band leader can delete this song.
            </p>
          )}

          {error && <p className="form-error mb-3">{error}</p>}

          {!confirming ? (
            <button
              disabled={!isLeader}
              onClick={() => setConfirming(true)}
              title={
                isLeader ? undefined : "Only the band leader can delete this song"
              }
              className="flex items-center gap-2 rounded-md border border-red-800 px-4 py-2 text-sm font-semibold text-red-300 transition hover:cursor-pointer hover:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <Trash2 className="h-4 w-4" />
              Delete song
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-300">
                Delete this song permanently?
              </span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md border border-red-700 bg-red-900/60 px-3 py-1.5 text-sm font-semibold text-red-100 transition hover:cursor-pointer hover:bg-red-800 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Confirm"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 transition hover:cursor-pointer hover:border-neutral-500"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:cursor-pointer hover:border-neutral-500"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
