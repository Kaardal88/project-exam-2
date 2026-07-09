"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";

type ProjectType = "album" | "single";

type NewProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  bandId: string;
};

export function NewProjectModal({
  isOpen,
  onClose,
  bandId,
}: NewProjectModalProps) {
  const router = useRouter();
  const [type, setType] = useState<ProjectType>("album");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
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

    const response = await fetch(`/api/bands/${bandId}/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ type, title, description }),
    });

    setSubmitting(false);

    if (!response.ok) {
      setError("Failed to create project");
      return;
    }

    const project = await response.json();
    onClose();
    router.push(`/pages/projectDetails/${project.id}`);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-[90vw] max-w-md">
        <h2 className="mb-4 text-xl font-bold text-yellow-100">
          New project
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-yellow-100">
              Type
            </label>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setType("album")}
                className={`flex-1 rounded-md border px-4 py-2 text-sm font-semibold transition ${
                  type === "album"
                    ? "border-yellow-100 bg-yellow-100 text-black"
                    : "border-neutral-700 text-yellow-100 hover:border-yellow-200"
                }`}
              >
                Album
              </button>

              <button
                type="button"
                onClick={() => setType("single")}
                className={`flex-1 rounded-md border px-4 py-2 text-sm font-semibold transition ${
                  type === "single"
                    ? "border-yellow-100 bg-yellow-100 text-black"
                    : "border-neutral-700 text-yellow-100 hover:border-yellow-200"
                }`}
              >
                Single
              </button>
            </div>

            <p className="mt-2 text-xs text-neutral-400">
              {type === "album"
                ? "You'll be able to add songs one by one afterwards."
                : "A single song will be created for you automatically."}
            </p>
          </div>

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

          <div>
            <label className="mb-2 block text-sm font-semibold text-yellow-100">
              Description
            </label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              {submitting ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
