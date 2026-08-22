type UploadTarget = "audio" | "artwork" | "file";

type UploadToR2Params = {
  songId: string;
  target: UploadTarget;
  file: File;
  category?: string;
  onProgress?: (percent: number) => void;
};

function putWithProgress(
  url: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress?.(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error("Upload to storage failed. Please try again."));
      }
    };

    xhr.onerror = () =>
      reject(new Error("Upload to storage failed. Please try again."));

    xhr.send(file);
  });
}

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

  await putWithProgress(uploadUrl, file, onProgress);

  return { key };
}
