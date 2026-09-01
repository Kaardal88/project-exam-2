import { putWithProgress } from "@/lib/putWithProgress";

export type ImageOwner = "user" | "band";
export type ImageTarget = "avatar" | "header";

/**
 * How big the stored image is allowed to be, in pixels.
 *
 * An avatar renders at 128px at its largest -- next to a comment it is 32px --
 * so 512 covers a retina profile header and nothing beyond it. The header is a
 * full-bleed banner, hence the wider bound.
 */
const MAX_DIMENSIONS: Record<ImageTarget, { width: number; height: number }> = {
  avatar: { width: 512, height: 512 },
  header: { width: 1600, height: 900 },
};

const QUALITY = 0.85;

/**
 * Shrink and re-encode a picked file before it ever leaves the browser.
 *
 * The server would accept 10MB, and a photo straight off a phone is about
 * that. Uploading it unchanged would mean every visitor to the Connect
 * directory downloads twelve of them -- the picture is 40px wide on screen.
 * So the file is drawn to a canvas at a sane size and re-encoded, which turns
 * a 9MB JPEG into roughly 40KB.
 *
 * WebP rather than JPEG because it keeps the alpha channel: an avatar cut out
 * of a PNG would otherwise get a black box behind it. Browsers that cannot
 * encode WebP return null from toBlob, and fall through to JPEG.
 */
async function downscale(
  file: File,
  target: ImageTarget,
): Promise<{ blob: Blob; contentType: string; extension: string }> {
  const bitmap = await createImageBitmap(file);
  const limit = MAX_DIMENSIONS[target];

  // Fit inside the box without distorting, and never scale a small image up.
  const scale = Math.min(
    limit.width / bitmap.width,
    limit.height / bitmap.height,
    1,
  );

  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not process this image. Please try another file.");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const encode = (type: string) =>
    new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, QUALITY),
    );

  const webp = await encode("image/webp");

  if (webp && webp.type === "image/webp") {
    return { blob: webp, contentType: "image/webp", extension: "webp" };
  }

  const jpeg = await encode("image/jpeg");

  if (!jpeg) {
    throw new Error("Could not process this image. Please try another file.");
  }

  return { blob: jpeg, contentType: "image/jpeg", extension: "jpg" };
}

type UploadProfileImageParams = {
  owner: ImageOwner;
  ownerId: string;
  target: ImageTarget;
  file: File;
  onProgress?: (percent: number) => void;
};

/**
 * Put one avatar or header in the public bucket and return the URL to store.
 *
 * The returned URL is what goes in image_url / header_image_url -- a plain
 * permanent address, not a key, so every <img src> that already reads those
 * columns keeps working untouched, alongside the URLs pasted in by hand before
 * this existed.
 */
export async function uploadProfileImage({
  owner,
  ownerId,
  target,
  file,
  onProgress,
}: UploadProfileImageParams): Promise<{ url: string }> {
  if (!file.type.startsWith("image/")) {
    throw new Error("That file is not an image");
  }

  const { blob, contentType, extension } = await downscale(file, target);

  const presignResponse = await fetch("/api/uploads/presign-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      owner,
      ownerId,
      target,
      filename: `${target}.${extension}`,
      contentType,
      size: blob.size,
    }),
  });

  if (!presignResponse.ok) {
    const body = await presignResponse.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to prepare upload");
  }

  const { uploadUrl, publicUrl } = await presignResponse.json();

  await putWithProgress(uploadUrl, blob, contentType, onProgress);

  return { url: publicUrl };
}
