import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  // R2 isn't AWS S3 — the SDK's newer default of always attaching a
  // checksum adds query params/headers to presigned URLs that R2's CORS
  // policy doesn't allow, breaking browser uploads/downloads with a CORS error.
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;

/**
 * The second bucket, and the reason there are two.
 *
 * Everything in BUCKET is private and read through a signed URL that expires:
 * right for stems, which are a band's unreleased material. Profile pictures
 * are the opposite. They render as a bare <img src> in the navbar, in every
 * comment, and on both directory pages -- a page listing twelve bands would
 * have to sign twelve URLs, and each one would rot within the hour.
 *
 * R2 has no per-prefix public access; it is a bucket-level setting. So avatars
 * and header images go in a bucket that is public, and audio stays where it
 * is. Reads never touch this module -- the stored value is already a URL.
 *
 * Note this bucket needs its own CORS policy. It inherits nothing from the
 * private one, and a missing allowed origin fails the browser's PUT while
 * everything else looks fine.
 */
const PUBLIC_BUCKET = process.env.R2_STEMLOCK_PUBLIC_NAME!;

/** The r2.dev address, or a custom domain later. No trailing slash. */
const PUBLIC_BASE_URL = (process.env.R2_STEMLOCK_PUBLIC_URL ?? "").replace(
  /\/+$/,
  "",
);

export const MP3_MAX_BYTES = 25 * 1024 * 1024;
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const FILE_MAX_BYTES = 10 * 1024 * 1024;

export const ALLOWED_AUDIO_TYPES: Record<string, string> = {
  "audio/mpeg": "mp3",
};

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

const UPLOAD_URL_TTL_SECONDS = 5 * 60;
export const AUDIO_DOWNLOAD_TTL_SECONDS = 30 * 60;
export const ARTWORK_DOWNLOAD_TTL_SECONDS = 15 * 60;
export const FILE_DOWNLOAD_TTL_SECONDS = 15 * 60;

export async function getUploadUrl(
  key: string,
  contentType: string,
  bucket: string = BUCKET,
) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(r2, command, { expiresIn: UPLOAD_URL_TTL_SECONDS });
}

/** Where an object in the public bucket can be read, forever and unsigned. */
export function publicUrlFor(key: string) {
  return `${PUBLIC_BASE_URL}/${key}`;
}

export { PUBLIC_BUCKET, PUBLIC_BASE_URL };

/**
 * Strips a filename down to what is safe to put inside a Content-Disposition
 * header.
 *
 * The name reaches this from a stem the band typed and a song title they
 * chose, and it ends up inside a quoted header value. A double quote or a
 * newline in either would break out of that value -- so this keeps letters,
 * digits, spaces and a short list of punctuation, and nothing else.
 */
function safeDownloadName(filename: string) {
  return filename.replace(/[^a-zA-Z0-9 ._-]/g, "_").slice(0, 120) || "download";
}

/**
 * A signed URL for reading an object.
 *
 * Pass `filename` when the browser should save the file rather than open it,
 * and save it under a name a human chose. **Without it the download lands as
 * the R2 key** -- a uuid -- because the object is on another origin and a
 * `download` attribute on the link is ignored cross-origin. That is not a
 * detail: a musician downloading seven stems to overdub against needs to know
 * which one is the drums.
 */
export async function getDownloadUrl(
  key: string,
  ttlSeconds: number,
  filename?: string,
) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ...(filename
      ? {
          ResponseContentDisposition: `attachment; filename="${safeDownloadName(filename)}"`,
        }
      : {}),
  });

  return getSignedUrl(r2, command, { expiresIn: ttlSeconds });
}

export async function deleteObject(key: string, bucket: string = BUCKET) {
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    console.error(`Failed to delete R2 object "${key}":`, error);
    throw error;
  }
}

// A Phase 4 pasted URL looks like "https://..."; a real R2 key never does.
export function isLegacyPastedUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

/**
 * True when this key is one /presign-upload could have handed out for this
 * song.
 *
 * getDownloadUrl signs whatever key it is given, and deleteObject deletes
 * whatever key it is given -- neither asks who owns it. Keys reach the server
 * from a request body, so without this check a caller may name any object in
 * the bucket: pointing their own song at another band's audio key and asking
 * for a download URL reads it, and replacing the file afterwards deletes it.
 * Learning a key is easy, since every presigned URL contains the key it signs,
 * so anyone who ever had legitimate access keeps it forever otherwise.
 *
 * Upload keys are built as songs/<songId>/... in the presign route; this is
 * the same rule read back.
 */
export function isKeyForSong(key: string, songId: string) {
  return key.startsWith(`songs/${songId}/`) && !key.includes("..");
}
