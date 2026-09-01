/**
 * Does the R2 access key actually have write permission on each bucket?
 *
 * Read-only apart from one probe object it writes and deletes again, so it is
 * safe to run any time. Nothing here touches the database.
 *
 * This exists because of how the failure presents. A signed upload URL is pure
 * cryptography -- the server will happily sign a PUT for a bucket the key has
 * no rights to, and R2 rejects it only when the browser uses it. That
 * rejection is a 403 with no Access-Control-Allow-Origin header on it, so the
 * browser reports a CORS error, and you go and check the CORS policy, which is
 * fine. On 2026-09-01 that cost an hour: the R2 API token was scoped to
 * bandstructure-media alone and could not write to stemlock-public.
 *
 * Running server-side takes CORS out of the picture entirely:
 *
 *   403 here            -> credentials or token scope
 *   ok here, 403 in the browser -> CORS, or the bucket's public access setting
 *
 * See docs/decisions/profile-editing.md for the two-bucket split.
 */
import "dotenv/config";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function probe(label: string, bucket: string | undefined) {
  console.log(`\n=== ${label}: ${bucket ?? "(not set)"} ===`);

  if (!bucket) {
    console.log("  SKIP - env var is not set");
    return;
  }

  try {
    await r2.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log("  HeadBucket: ok");
  } catch (error) {
    const e = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    console.log(`  HeadBucket: FAILED ${e.name} (${e.$metadata?.httpStatusCode})`);
  }

  const key = `__probe/${Date.now()}.txt`;

  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: "probe",
        ContentType: "text/plain",
      }),
    );
    console.log(`  PutObject: ok (${key})`);

    await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    console.log("  DeleteObject: ok - cleaned up");
  } catch (error) {
    const e = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    console.log(`  PutObject: FAILED ${e.name} (${e.$metadata?.httpStatusCode})`);
  }
}

async function main() {
  console.log("endpoint:", process.env.R2_ENDPOINT);
  console.log("public url:", process.env.R2_STEMLOCK_PUBLIC_URL);

  await probe("private", process.env.R2_BUCKET_NAME);
  await probe("public", process.env.R2_STEMLOCK_PUBLIC_NAME);
}

main();
