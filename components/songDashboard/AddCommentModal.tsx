"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { formatSongTime } from "@/lib/utils";

type BandMember = {
  user_id: string;
  user: { id: string; username: string };
};

type AddCommentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  songId: string;
  timestampSeconds: number;
  bandMembers: BandMember[];
  onCreated: () => void;
};

export function AddCommentModal({
  isOpen,
  onClose,
  songId,
  timestampSeconds,
  bandMembers,
  onCreated,
}: AddCommentModalProps) {
  const [body, setBody] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!body.trim()) {
      setError("Comment can't be empty");
      return;
    }

    setSubmitting(true);
    setError(null);

    const response = await fetch(`/api/songs/${songId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timestamp_seconds: timestampSeconds,
        body,
        assignee_id: assigneeId || undefined,
      }),
    });

    if (!response.ok) {
      setError("Failed to add comment");
      setSubmitting(false);
      return;
    }

    setBody("");
    setAssigneeId("");
    setSubmitting(false);
    onCreated();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-[90vw] max-w-md">
        <h2 className="mb-4 text-xl font-bold text-yellow-100">Add comment</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <p className="form-error">{error}</p>}

          <div>
            <label className="mb-2 block text-sm font-semibold text-yellow-100">
              Timestamp
            </label>
            <input
              type="text"
              value={formatSongTime(timestampSeconds)}
              readOnly
              className="w-full rounded-md border border-neutral-800 bg-neutral-950/60 px-4 py-2 text-sm text-neutral-400 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-yellow-100">
              Comment
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-yellow-100">
              Assign to
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-yellow-100 outline-none transition focus:border-yellow-200"
            >
              <option value="">Unassigned</option>
              {bandMembers.map((member) => (
                <option key={member.user_id} value={member.user.id}>
                  {member.user.username}
                </option>
              ))}
            </select>
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
              {submitting ? "Adding..." : "Add comment"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
