"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "project_file", label: "Project file" },
  { value: "artwork", label: "Artwork" },
  { value: "press_photo", label: "Press photo" },
  { value: "contract", label: "Contract" },
];

type AddFileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  songId: string;
  onCreated: () => void;
};

export function AddFileModal({
  isOpen,
  onClose,
  songId,
  onCreated,
}: AddFileModalProps) {
  const [filename, setFilename] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [fileUrl, setFileUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!filename.trim()) {
      setError("Filename can't be empty");
      return;
    }

    setSubmitting(true);
    setError(null);

    const token = localStorage.getItem("token");

    const response = await fetch(`/api/songs/${songId}/files`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        filename,
        category,
        file_url: fileUrl || undefined,
      }),
    });

    if (!response.ok) {
      setError("Failed to add file");
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onCreated();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-[90vw] max-w-md">
        <h2 className="mb-4 text-xl font-bold text-yellow-100">Add file</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <p className="form-error">{error}</p>}

          <div>
            <label className="mb-2 block text-sm font-semibold text-yellow-100">
              Filename
            </label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="e.g. final_mix_v3.wav"
              className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-yellow-100 outline-none placeholder:text-neutral-600 transition focus:border-yellow-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-yellow-100">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-yellow-100">
              File URL <span className="text-neutral-500">(optional)</span>
            </label>
            <input
              type="text"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-yellow-100 outline-none placeholder:text-neutral-600 transition focus:border-yellow-200"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Paste a link for now — direct uploads are coming once cloud
              storage is connected.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:cursor-pointer hover:border-neutral-500"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="border border-yellow-200 bg-yellow-100 px-4 py-2 text-sm font-bold text-neutral-950 transition hover:cursor-pointer hover:bg-yellow-200 disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add file"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
