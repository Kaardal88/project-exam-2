/**
 * Downloads the original files of one version -- its full mix, or every stem.
 *
 * Out of VersionBar so the studio's transport can offer the same download for
 * a song that is one file: there it is the only download there is, and it sits
 * where the bounce sits for a song built from stems.
 *
 * Filenames come from the server inside the signed URL. Setting `download` on
 * the link does nothing here -- the object is on another origin.
 */
export async function downloadVersion(
  songId: string,
  versionId: string,
  what: "mix" | "stems",
) {
  const response = await fetch(
    `/api/songs/${songId}/versions/${versionId}/download`,
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Could not prepare the download");
  }

  const manifest: {
    mix: { filename: string; url: string } | null;
    files: { filename: string; url: string }[];
  } = await response.json();

  const wanted =
    what === "mix" ? (manifest.mix ? [manifest.mix] : []) : manifest.files;

  if (wanted.length === 0) {
    throw new Error("There is no single mixdown in this version.");
  }

  for (const file of wanted) {
    const link = document.createElement("a");
    link.href = file.url;
    link.download = file.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    // Browsers throttle or drop a burst of downloads fired in one tick.
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
}
