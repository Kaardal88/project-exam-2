/**
 * Peak extraction, shared by the single-file player and the studio lanes.
 *
 * The resolution here is deliberately higher than anything drawn: a lane
 * resamples down to however many bars actually fit its width, so a wide studio
 * shows more detail than a narrow phone instead of both being stuck with the
 * same fixed bar count.
 */
export const RAW_PEAK_COUNT = 400;

/**
 * Peaks from an already-decoded buffer.
 *
 * The studio decodes every stem anyway, to play it. Computing peaks from that
 * same AudioBuffer means the waveform costs one pass over memory we already
 * hold, rather than a second fetch and a second decode of the same file.
 */
export function peaksFromBuffer(
  buffer: AudioBuffer,
  count = RAW_PEAK_COUNT,
): number[] {
  const channel = buffer.getChannelData(0);
  const samplesPerPeak = Math.max(1, Math.floor(channel.length / count));

  const peaks = Array.from({ length: count }, (_, i) => {
    const start = i * samplesPerPeak;
    const end = Math.min(start + samplesPerPeak, channel.length);

    let max = 0;
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channel[j]);
      if (abs > max) max = abs;
    }

    return max;
  });

  // Normalised to the loudest peak, then floored at 20% so a near-silent
  // passage still draws as a line rather than disappearing.
  const loudest = Math.max(...peaks, 0.0001);

  return peaks.map((peak) => 20 + (peak / loudest) * 80);
}

/**
 * Resamples a peak array to a different resolution by taking the max per
 * bucket. Works for downsampling (the common case) and upsampling alike.
 */
export function resampleBars(source: number[], targetCount: number): number[] {
  if (source.length === 0) return [];
  if (source.length === targetCount) return source;

  const bucketSize = source.length / targetCount;

  return Array.from({ length: targetCount }, (_, i) => {
    const start = Math.floor(i * bucketSize);
    const end = Math.max(start + 1, Math.floor((i + 1) * bucketSize));

    let max = 0;
    for (let j = start; j < end && j < source.length; j++) {
      if (source[j] > max) max = source[j];
    }

    return max;
  });
}
