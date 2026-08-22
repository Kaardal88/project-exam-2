"use client";

import { useRef, useState } from "react";
import { Modal } from "@/components/Modal";
import { uploadToR2 } from "@/lib/uploadToR2";
import { UploadProgress } from "./UploadProgress";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "project_file", label: "Project file" },
  { value: "artwork", label: "Artwork" },
  { value: "press_photo", label: "Press photo" },
  { value: "contract", label: "Contract" },
];

const IMAGE_CATEGORIES = ["artwork", "press_photo"];
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const FILE_MAX_BYTES = 10 * 1024 * 1024;

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
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isImageCategory = IMAGE_CATEGORIES.includes(category);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setError(null);
    setSelectedFile(file);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedFile) {
      setError("Choose a file to upload");
      return;
    }

    const lower = selectedFile.name.toLowerCase();

    if (isImageCategory) {
      const validExt =
        lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png");
      const validType =
        selectedFile.type === "image/jpeg" || selectedFile.type === "image/png";

      if (!validExt || !validType) {
        setError("Only .jpg or .png files are allowed for this category");
        return;
      }

      if (selectedFile.size > IMAGE_MAX_BYTES) {
        setError("File too large. Max 10MB");
        return;
      }
    } else if (selectedFile.size > FILE_MAX_BYTES) {
      setError("File too large. Max 10MB");
      return;
    }

    setSubmitting(true);
    setError(null);
    setUploadProgress(0);
    setUploadSuccess(false);

    try {
      const { key } = await uploadToR2({
        songId,
        target: "file",
        file: selectedFile,
        category,
        onProgress: setUploadProgress,
      });

      const response = await fetch(`/api/songs/${songId}/files`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: selectedFile.name,
          category,
          file_url: key,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save file record");
      }

      setUploadSuccess(true);
      setTimeout(() => onCreated(), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add file");
      setSubmitting(false);
      setUploadProgress(null);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-[90vw] max-w-md">
        <h2 className="mb-4 text-xl font-bold text-yellow-100">Add file</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <p className="form-error">{error}</p>}

          <div>
            <label className="mb-2 block text-sm font-semibold text-yellow-100">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setError(null);
              }}
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
              File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept={isImageCategory ? "image/jpeg,image/png,.jpg,.jpeg,.png" : undefined}
              onChange={handleFileChange}
              className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-yellow-100 outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-yellow-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-neutral-950 focus:border-yellow-200"
            />
            <p className="mt-1 text-xs text-neutral-500">
              {isImageCategory
                ? "JPG or PNG, max 10MB."
                : "Max 10MB."}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <UploadProgress progress={uploadProgress} success={uploadSuccess} />

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
              {submitting ? "Uploading..." : "Add file"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
