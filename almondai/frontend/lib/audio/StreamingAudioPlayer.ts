// Gapless streaming audio player for voice mode.
//
// The backend streams TTS audio one sentence at a time (each an MP3 blob).
// This player decodes each chunk and schedules it on the Web Audio clock so
// sentences play back-to-back without gaps, while the rest of the response is
// still being generated. It supports instant stop() for barge-in.

type PlaybackState = "idle" | "playing";

export class StreamingAudioPlayer {
  private ctx: AudioContext | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private nextStartTime = 0;
  private pending = 0;            // chunks queued but not yet finished
  private decodeChain: Promise<void> = Promise.resolve();
  private generation = 0;        // bumped on stop() to invalidate in-flight decodes
  private state: PlaybackState = "idle";

  onStart?: () => void;
  onEnded?: () => void;          // fires when the queue fully drains

  /** Must be called from a user gesture (session start) so the context isn't suspended. */
  async init(): Promise<void> {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  get isPlaying(): boolean {
    return this.state === "playing";
  }

  /** Queue a decoded MP3 chunk for gapless playback. Order is preserved. */
  enqueue(mp3: ArrayBuffer): void {
    const gen = this.generation;
    // Serialize decoding so chunks schedule in arrival order
    this.pending++;
    this.decodeChain = this.decodeChain.then(async () => {
      if (gen !== this.generation || !this.ctx) { this.pending--; return; }
      let buffer: AudioBuffer;
      try {
        buffer = await this.ctx.decodeAudioData(mp3.slice(0));
      } catch {
        this.pending--;
        return;
      }
      if (gen !== this.generation || !this.ctx) { this.pending--; return; }
      this.scheduleBuffer(buffer);
      this.pending--;
    });
  }

  private scheduleBuffer(buffer: AudioBuffer): void {
    if (!this.ctx) return;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.ctx.destination);

    const now = this.ctx.currentTime;
    // Small lead-in on the very first chunk avoids a clipped start
    const startAt = Math.max(now + 0.02, this.nextStartTime);
    src.start(startAt);
    this.nextStartTime = startAt + buffer.duration;

    if (this.state !== "playing") {
      this.state = "playing";
      this.onStart?.();
    }

    this.sources.add(src);
    src.onended = () => {
      this.sources.delete(src);
      // Queue fully drained (no playing sources, nothing decoding)
      if (this.sources.size === 0 && this.pending === 0 && this.state === "playing") {
        this.state = "idle";
        this.onEnded?.();
      }
    };
  }

  /** Stop everything immediately (barge-in) and invalidate pending decodes. */
  stop(): void {
    this.generation++;
    this.pending = 0;
    this.decodeChain = Promise.resolve();
    for (const src of this.sources) {
      try { src.onended = null; src.stop(); } catch { /* already stopped */ }
    }
    this.sources.clear();
    this.nextStartTime = this.ctx ? this.ctx.currentTime : 0;
    this.state = "idle";
  }

  async close(): Promise<void> {
    this.stop();
    if (this.ctx) {
      try { await this.ctx.close(); } catch { /* ignore */ }
      this.ctx = null;
    }
  }
}
