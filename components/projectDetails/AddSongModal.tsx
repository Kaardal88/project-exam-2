"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";

type AddSongModalProps = {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onCreated: () => void;
};

export function AddSongModal({
  isOpen,
  onClose,
  projectId,
  onCreated,
}: AddSongModalProps) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Unauthorized");
      return;
    }

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setSubmitting(true);

    const response = await fetch(`/api/projects/${projectId}/songs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title }),
    });

    setSubmitting(false);

    if (!response.ok) {
      setError("Failed to add song");
      return;
    }

    setTitle("");
    onCreated();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-[90vw] max-w-md">
        <h2 className="mb-4 text-xl font-bold text-yellow-100">Add song</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-yellow-100">
              Title
            </label>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
            />
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:border-neutral-500"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-md border border-yellow-200 bg-yellow-100 px-4 py-2 text-sm font-bold text-neutral-950 transition hover:bg-yellow-200 disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
