type UploadTarget = "audio" | "artwork" | "file";

type UploadToR2Params = {
  songId: string;
  target: UploadTarget;
  file: File;
  category?: string;
};

export async function uploadToR2({
  songId,
  target,
  file,
  category,
}: UploadToR2Params): Promise<{ key: string }> {
  const token = localStorage.getItem("token");

  const presignResponse = await fetch(`/api/songs/${songId}/presign-upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
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

  const putResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!putResponse.ok) {
    throw new Error("Upload to storage failed. Please try again.");
  }

  return { key };
}
