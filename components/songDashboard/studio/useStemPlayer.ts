"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { peaksFromBuffer } from "@/lib/waveform";
import type { BounceSource } from "@/lib/bounce";

export type PlayerLane = {
  /** stem id — what mute, solo and colour are keyed on */
  id: string;
  /** take id — what the decoded buffer is cached under */
  takeId: string;
  url: string;
};

type LoadState = "idle" | "loading" | "ready" | "error";

/**
 * Plays several stems as one song.
 *
 * Not several <audio> elements. Each element keeps its own clock, and clocks
 * that start together drift apart: by the second chorus the drums and the
 * vocal are audibly not the same performance. One AudioContext gives every
 * source a single sample-accurate clock, which is the only way separate files
 * stay in time with each other.
 *
 * The shape that follows from that:
 *
 * - **Every stem is decoded up front.** decodeAudioData wants the whole file,
 *   so there is no streaming and no partial start. Decoded PCM is duration x
 *   sample rate x channels x 4 bytes -- the mp3 compression is gone the moment
 *   decoding finishes -- so a four-minute stereo stem is about 40MB in memory
 *   whichever size the file was. MAX_STEMS_PER_VERSION exists for this, and
 *   raising it is a decision about memory, not about upload size.
 *
 * - **Seeking stops and restarts everything.** An AudioBufferSourceNode cannot
 *   be sought and cannot be restarted once stopped; each seek builds a fresh
 *   set of sources at the new offset. That is why position is tracked against
 *   the context clock rather than read back off a node.
 *
 * - **Mute and solo are gain nodes**, one per lane, so they take effect
 *   between buffer and destination without disturbing playback at all.
 *
 * Buffers are cached by take id, so switching between versions that share a
 * take -- which is most of them, since a version usually changes one slot --
 * decodes nothing again.
 *
 * `enabled` exists because the dashboard is a landing page. Decoding ten stems
 * is several hundred megabytes, and paying that just because somebody opened a
 * song is not a trade worth making -- so on the dashboard nothing loads until
 * the listener actually presses play. The studio, which you have to navigate
 * to, loads straight away.
 */
export function useStemPlayer(
  lanes: PlayerLane[],
  { enabled = true }: { enabled?: boolean } = {},
) {
  const contextRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const gainsRef = useRef<Map<string, GainNode>>(new Map());

  /** Context time when playback started, and the song position it started at. */
  const startedAtRef = useRef(0);
  const offsetRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  const [loadState, setState] = useState<LoadState>("idle");
  const [loadedCount, setLoadedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [peaks, setPeaks] = useState<Record<string, number[]>>({});
  const [loadedDuration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [muted, setMuted] = useState<Set<string>>(new Set());
  const [soloed, setSoloed] = useState<Set<string>>(new Set());
  const [masterVolume, setMasterVolume] = useState(1);

  // A stable key for "is this the same set of lanes": lane identity is the
  // stem *and* the take, because swapping a take has to reload that lane.
  const laneKey = lanes.map((lane) => `${lane.id}:${lane.takeId}`).join("|");

  function getContext() {
    if (!contextRef.current) contextRef.current = new AudioContext();
    return contextRef.current;
  }

  const stopSources = useCallback(() => {
    for (const source of sourcesRef.current) {
      try {
        source.stop();
      } catch {
        // Already stopped, or never started. Nothing to undo either way.
      }
      source.disconnect();
    }
    sourcesRef.current = [];
  }, []);

  /* ------------------------------------------------------------ loading */

  // Derived, not synchronised: with no lanes there is nothing to load, and
  // that is knowable during render. Setting it from an effect instead would be
  // a second source of truth for a fact already in hand.
  const state: LoadState = lanes.length === 0 ? "idle" : loadState;
  const duration = lanes.length === 0 ? 0 : loadedDuration;

  useEffect(() => {
    if (lanes.length === 0 || !enabled) return;

    let cancelled = false;

    async function load() {
      // Yields before the first setState so the effect does not set state
      // synchronously and cascade an extra render on every lane change.
      await Promise.resolve();

      if (cancelled) return;

      setState("loading");
      setError(null);
      setLoadedCount(0);

      const context = getContext();
      const nextPeaks: Record<string, number[]> = {};
      let longest = 0;
      let done = 0;

      try {
        await Promise.all(
          lanes.map(async (lane) => {
            let buffer = buffersRef.current.get(lane.takeId);

            if (!buffer) {
              // no-store for the same reason the single-file waveform uses it:
              // a revalidated 304 carries no CORS headers and fails the
              // cors-mode fetch.
              const response = await fetch(lane.url, { cache: "no-store" });

              if (!response.ok) throw new Error(`Could not load a stem`);

              const bytes = await response.arrayBuffer();
              buffer = await context.decodeAudioData(bytes);
              buffersRef.current.set(lane.takeId, buffer);
            }

            if (cancelled) return;

            nextPeaks[lane.id] = peaksFromBuffer(buffer);
            longest = Math.max(longest, buffer.duration);

            done++;
            setLoadedCount(done);
          }),
        );

        if (cancelled) return;

        setPeaks(nextPeaks);
        // The song is as long as its longest layer: a two-bar tambourine
        // overdub must not truncate the timeline to two bars.
        setDuration(longest);
        setState("ready");
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load stems:", err);
        setError("Couldn't load every stem. Try refreshing the page.");
        setState("error");
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
    // laneKey, not lanes: the array is rebuilt on every render of the parent,
    // and depending on it directly would re-decode the whole song each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laneKey, enabled]);

  /* ----------------------------------------------------------- playback */

  const applyGains = useCallback(() => {
    const anySoloed = soloed.size > 0;

    for (const lane of lanes) {
      const gain = gainsRef.current.get(lane.id);
      if (!gain) continue;

      // Solo wins over mute: soloing the guitar means the guitar, whatever
      // the mute buttons said a moment ago.
      const audible = anySoloed ? soloed.has(lane.id) : !muted.has(lane.id);

      gain.gain.value = audible ? 1 : 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laneKey, muted, soloed]);

  useEffect(() => {
    applyGains();
  }, [applyGains]);

  const start = useCallback(
    (from: number) => {
      const context = getContext();

      stopSources();

      const master = context.destination;

      for (const lane of lanes) {
        const buffer = buffersRef.current.get(lane.takeId);
        if (!buffer) continue;

        let gain = gainsRef.current.get(lane.id);

        if (!gain) {
          gain = context.createGain();
          gainsRef.current.set(lane.id, gain);
        }

        gain.disconnect();
        gain.connect(master);
        gain.gain.value = masterVolume;

        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(gain);

        // Every source starts against the same context time. Starting them in
        // a loop with `context.currentTime` read fresh each iteration would
        // scatter them by however long the loop took.
        source.start(context.currentTime, Math.min(from, buffer.duration));

        sourcesRef.current.push(source);
      }

      startedAtRef.current = context.currentTime;
      offsetRef.current = from;

      applyGains();
    },
    [laneKey, masterVolume, stopSources, applyGains], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const pause = useCallback(() => {
    const context = contextRef.current;

    if (context && isPlaying) {
      offsetRef.current += context.currentTime - startedAtRef.current;
    }

    stopSources();
    setIsPlaying(false);
    setPosition(Math.min(offsetRef.current, duration));
  }, [isPlaying, duration, stopSources]);

  const play = useCallback(async () => {
    if (state !== "ready") return;

    const context = getContext();

    // Browsers hand back a suspended context until a user gesture resumes it.
    if (context.state === "suspended") await context.resume();

    const from = offsetRef.current >= duration ? 0 : offsetRef.current;

    start(from);
    setIsPlaying(true);
  }, [state, duration, start]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      void play();
    }
  }, [isPlaying, pause, play]);

  const seek = useCallback(
    (seconds: number) => {
      const target = Math.max(0, Math.min(seconds, duration));

      offsetRef.current = target;
      setPosition(target);

      // Buffer sources cannot be sought, so a seek during playback is a full
      // stop and restart at the new offset.
      if (isPlaying) start(target);
    },
    [duration, isPlaying, start],
  );

  /* --------------------------------------------------------- the clock */

  useEffect(() => {
    if (!isPlaying) return;

    function tick() {
      const context = contextRef.current;

      if (context) {
        const elapsed = context.currentTime - startedAtRef.current;
        const at = offsetRef.current + elapsed;

        if (at >= duration) {
          stopSources();
          offsetRef.current = duration;
          setPosition(duration);
          setIsPlaying(false);
          return;
        }

        setPosition(at);
      }

      frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [isPlaying, duration, stopSources]);

  /* ------------------------------------------------------------ volume */

  useEffect(() => {
    for (const gain of gainsRef.current.values()) {
      // Only the lanes that should be heard carry the master level; the rest
      // are held at zero by applyGains and must stay there.
      if (gain.gain.value > 0) gain.gain.value = masterVolume;
    }
  }, [masterVolume]);

  /* ----------------------------------------------------------- teardown */

  useEffect(() => {
    // Captured at setup rather than read in the cleanup. The Map objects are
    // created once and only ever mutated, so these are the same maps either
    // way -- but reading a ref inside a cleanup is the pattern that bites when
    // that stops being true.
    const buffers = buffersRef.current;
    const gains = gainsRef.current;

    return () => {
      stopSources();
      // Closing the context releases the decoded buffers with it -- several
      // hundred megabytes, on a page the listener may well navigate away from
      // without pausing first.
      void contextRef.current?.close();
      contextRef.current = null;
      buffers.clear();
      gains.clear();
    };
  }, [stopSources]);

  /**
   * The decoded buffers, at the levels currently being heard.
   *
   * Mute and solo are honoured deliberately: muting your own guitar and
   * bouncing gives you a backing track to record that guitar against, which is
   * the reason somebody wants a single file in the first place.
   *
   * Reads the buffers already in memory for playback, so a bounce costs a
   * render pass and no fetching.
   */
  const bounceSources = useCallback((): BounceSource[] => {
    const anySoloed = soloed.size > 0;

    return lanes.flatMap((lane) => {
      const buffer = buffersRef.current.get(lane.takeId);
      if (!buffer) return [];

      const audible = anySoloed ? soloed.has(lane.id) : !muted.has(lane.id);
      if (!audible) return [];

      return [{ buffer, gain: 1 }];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laneKey, muted, soloed]);

  const toggleMute = useCallback((stemId: string) => {
    setMuted((current) => {
      const next = new Set(current);
      if (next.has(stemId)) next.delete(stemId);
      else next.add(stemId);
      return next;
    });
  }, []);

  const toggleSolo = useCallback((stemId: string) => {
    setSoloed((current) => {
      const next = new Set(current);
      if (next.has(stemId)) next.delete(stemId);
      else next.add(stemId);
      return next;
    });
  }, []);

  return {
    state,
    error,
    loadedCount,
    laneCount: lanes.length,
    peaks,
    duration,
    position,
    isPlaying,
    play,
    pause,
    toggle,
    seek,
    muted,
    soloed,
    toggleMute,
    toggleSolo,
    masterVolume,
    setMasterVolume,
    bounceSources,
  };
}
