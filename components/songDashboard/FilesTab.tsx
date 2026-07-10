"use client";

import { useState } from "react";
import { FileText, ExternalLink, Trash2, Upload } from "lucide-react";
import { AddFileModal } from "./AddFileModal";

type SongFile = {
  id: string;
  filename: string;
  category: string;
  file_url: string | null;
  created_at: string | null;
  uploader: { id: string; username: string } | null;
};

type FilesTabProps = {
  songId: string;
  files: SongFile[];
  role: string | null;
  currentUserId: string | null;
  onFilesChanged: () => void;
};

const CATEGORY_LABELS: Record<string, string> = {
  project_file: "Project file",
  artwork: "Artwork",
  press_photo: "Press photo",
  contract: "Contract",
};

export function FilesTab({
  songId,
  files,
  role,
  currentUserId,
  onFilesChanged,
}: FilesTabProps) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(fileId: string) {
    setDeletingId(fileId);
    setDeleteError(null);

    const token = localStorage.getItem("token");

    const response = await fetch(`/api/songs/${songId}/files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      onFilesChanged();
    } else {
      const body = await response.json().catch(() => ({}));
      setDeleteError(body.error ?? "Failed to delete file");
    }

    setDeletingId(null);
  }

  async function handleOpen(fileId: string) {
    setOpeningId(fileId);
    setOpenError(null);

    const token = localStorage.getItem("token");

    const response = await fetch(
      `/api/songs/${songId}/files/${fileId}/download-url`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (response.ok) {
      const { url } = await response.json();
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      setOpenError("Failed to open file. Try again.");
    }

    setOpeningId(null);
  }

  return (
    <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-4 shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-yellow-100">Files</h2>
        <button
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-2 rounded-md border border-yellow-100 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:cursor-pointer hover:bg-yellow-50 hover:text-black!"
        >
          <Upload className="h-4 w-4" />
          Upload file
        </button>
      </div>

      {openError && <p className="form-error mb-3">{openError}</p>}
      {deleteError && <p className="form-error mb-3">{deleteError}</p>}

      {files.length === 0 ? (
        <p className="text-sm text-neutral-500">No files yet</p>
      ) : (
        <ul className="space-y-2">
          {files.map((file) => {
            const canDelete =
              currentUserId === file.uploader?.id || role === "band_leader";

            return (
              <li
                key={file.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-neutral-800 bg-neutral-950/40 p-3 text-sm"
              >
                <FileText className="h-4 w-4 shrink-0 text-neutral-400" />

                <span className="font-semibold text-yellow-100">
                  {file.filename}
                </span>

                <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-400">
                  {CATEGORY_LABELS[file.category] ?? file.category}
                </span>

                <span className="text-xs text-neutral-500">
                  {file.uploader?.username ?? "Unknown"}
                  {file.created_at
                    ? ` · ${new Date(file.created_at).toLocaleDateString("no-NO")}`
                    : ""}
                </span>

                {file.file_url && (
                  <button
                    onClick={() => handleOpen(file.id)}
                    disabled={openingId === file.id}
                    className="flex items-center gap-1 text-xs text-yellow-200 transition hover:cursor-pointer hover:text-yellow-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {openingId === file.id ? "Opening…" : "Open"}
                  </button>
                )}

                <button
                  onClick={() => handleDelete(file.id)}
                  disabled={!canDelete || deletingId === file.id}
                  title={
                    canDelete
                      ? undefined
                      : "Only the uploader or band leader can delete this file"
                  }
                  className="ml-auto flex items-center gap-1 rounded-md border border-red-800 px-2 py-1 text-xs text-red-300 transition hover:cursor-pointer hover:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <Trash2 className="h-3 w-3" />
                  {deletingId === file.id ? "Deleting..." : "Delete"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {uploadOpen && (
        <AddFileModal
          isOpen
          onClose={() => setUploadOpen(false)}
          songId={songId}
          onCreated={() => {
            setUploadOpen(false);
            onFilesChanged();
          }}
        />
      )}
    </section>
  );
}
