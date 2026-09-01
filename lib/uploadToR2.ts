import { putWithProgress } from "@/lib/putWithProgress";

// "stem" is one layer of a song, "audio" the whole-song take the older
// version log uses. Both are mp3 and validated the same server-side; they
// differ only in the key prefix they land under.
type UploadTarget = "audio" | "stem" | "artwork" | "file";

type UploadToR2Params = {
  songId: string;
  target: UploadTarget;
  file: File;
  category?: string;
  onProgress?: (percent: number) => void;
};

export async function uploadToR2({
  songId,
  target,
  file,
  category,
  onProgress,
}: UploadToR2Params): Promise<{ key: string }> {
  const presignResponse = await fetch(`/api/songs/${songId}/presign-upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target,
      filename: file.name,
      contentType: file.type,
      size: file.size,
      category,
    }),
  });

  if (!presignResponse.ok) {
    const body = await presignResponse.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to prepare upload");
  }

  const { uploadUrl, key } = await presignResponse.json();

  await putWithProgress(uploadUrl, file, file.type, onProgress);

  return { key };
}
