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

export async function getUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(r2, command, { expiresIn: UPLOAD_URL_TTL_SECONDS });
}

export async function getDownloadUrl(key: string, ttlSeconds: number) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(r2, command, { expiresIn: ttlSeconds });
}

export async function deleteObject(key: string) {
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
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
