/** One layer going into the bounce, at the level it is currently heard. */
export type BounceSource = { buffer: AudioBuffer; gain: number };

const KBPS = 192;

/** How many sample frames to hand the encoder at a time. */
const ENCODE_CHUNK = 1152 * 40;

/**
 * Renders several stems down to one MP3, in the browser.
 *
 * This exists because of one workflow: a musician wants to add a part at home.
 * They need a single file to drop into a DAW and play against — and a song
 * built only from stems has no such file anywhere. Downloading seven stems and
 * lining them up by hand before you can play a note is not a workflow, it is
 * an obstacle.
 *
 * **It is a reference, not a mix.** This sums the stems at whatever level they
 * were exported and does nothing else: no levels, no panning, no processing.
 * For playing along to it is exactly right. For sending out as "the song" it
 * is not, and the UI should not pretend otherwise.
 *
 * Nothing here touches the server. The buffers are already decoded and sitting
 * in memory for playback, so this costs one render pass and some encoding —
 * no upload, no storage, and no bearing on the decision to keep WAV behind a
 * plan later.
 */
export async function bounceToMp3(
  sources: BounceSource[],
  duration: number,
  onProgress?: (fraction: number) => void,
): Promise<Blob> {
  if (sources.length === 0) throw new Error("Nothing to bounce");

  // Follow the material rather than resampling it. Every stem of a song comes
  // out of the same DAW session, so they agree in practice.
  const sampleRate = sources[0].buffer.sampleRate;
  const frames = Math.ceil(duration * sampleRate);

  const context = new OfflineAudioContext(2, frames, sampleRate);

  for (const source of sources) {
    const node = context.createBufferSource();
    node.buffer = source.buffer;

    const gain = context.createGain();
    gain.gain.value = source.gain;

    node.connect(gain);
    gain.connect(context.destination);

    // The same offset for every source, which is the whole reason playback
    // uses one context: separate clocks drift, one clock cannot.
    node.start(0);
  }

  const rendered = await context.startRendering();

  onProgress?.(0.5);

  const left = rendered.getChannelData(0);
  const right =
    rendered.numberOfChannels > 1 ? rendered.getChannelData(1) : left;

  /**
   * Summing layers can exceed full scale even when every stem was fine on its
   * own. Scaled down only when it actually overshoots — never up, because
   * quietly making somebody's reference louder than their mix is its own kind
   * of wrong.
   */
  let peak = 0;
  for (let i = 0; i < left.length; i++) {
    const l = Math.abs(left[i]);
    const r = Math.abs(right[i]);
    if (l > peak) peak = l;
    if (r > peak) peak = r;
  }

  const scale = peak > 1 ? 1 / peak : 1;

  // Imported here rather than at the top of the file: the encoder is about
  // 470kB, and most visits to the studio never bounce anything. This keeps it
  // out of the page and fetches it the first time somebody actually asks.
  const { Mp3Encoder } = await import("@breezystack/lamejs");

  const encoder = new Mp3Encoder(2, sampleRate, KBPS);
  const chunks: Uint8Array[] = [];

  const leftInt = new Int16Array(ENCODE_CHUNK);
  const rightInt = new Int16Array(ENCODE_CHUNK);

  for (let offset = 0; offset < left.length; offset += ENCODE_CHUNK) {
    const size = Math.min(ENCODE_CHUNK, left.length - offset);

    for (let i = 0; i < size; i++) {
      const l = Math.max(-1, Math.min(1, left[offset + i] * scale));
      const r = Math.max(-1, Math.min(1, right[offset + i] * scale));

      leftInt[i] = l < 0 ? l * 0x8000 : l * 0x7fff;
      rightInt[i] = r < 0 ? r * 0x8000 : r * 0x7fff;
    }

    const encoded = encoder.encodeBuffer(
      leftInt.subarray(0, size),
      rightInt.subarray(0, size),
    );

    if (encoded.length > 0) chunks.push(encoded);

    onProgress?.(0.5 + (offset / left.length) * 0.5);

    // Encoding a four-minute song is a few seconds of solid arithmetic. Handing
    // the thread back between chunks keeps the progress readable and the tab
    // responsive, which a worker would do better and a worker is the upgrade
    // if this ever needs one.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const last = encoder.flush();
  if (last.length > 0) chunks.push(last);

  onProgress?.(1);

  return new Blob(chunks as BlobPart[], { type: "audio/mpeg" });
}

/** Hands a finished blob to the browser as a download. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Same-origin blob, so the download attribute is honoured here — unlike the
  // R2 links, which carry their filename in the signature instead.
  URL.revokeObjectURL(url);
}
