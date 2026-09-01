/**
 * PUT a file to a presigned URL, reporting progress.
 *
 * XMLHttpRequest rather than fetch, and that is the whole reason this exists:
 * fetch still cannot report upload progress in any browser. Shared by the song
 * uploader and the profile-picture uploader so a stalled bar means the same
 * thing in both.
 */
export function putWithProgress(
  url: string,
  file: Blob,
  contentType: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);

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
