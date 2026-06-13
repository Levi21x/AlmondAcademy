---
name: almondai-voice
description: Build AlmondAI's voice pipeline — the WebSocket cascade (Deepgram Nova-3 Medical STT → LLM → streaming TTS) with barge-in, sub-1.2s perceived turn latency, STT failover, TTS caching, hard per-tier minute caps, and the clinical patient voice persona. Use for anything involving voice, speech, audio, STT, TTS, microphones, talking to the tutor or patient, voice latency, or voice costs. Voice is the priciest COGS line — load this before touching any audio feature.
---

# AlmondAI Voice (Phase 7)

A cascade, not end-to-end speech (master plan §3.7): debuggable, reuses the exact text RAG path (same verification!), every stage swappable. Two products on one pipeline: tutor voice (answer questions) and clinical patient voice (role-play with affect — different system prompt + persona controller, same plumbing).

## Pipeline (`modules/voice`)

```
WS /v1/voice/session?context=tutor|clinical
client audio frames (Opus 16kHz) ─► STT stream (Deepgram Nova-3 Medical)
   stt_partial ─► client (live caption)
   end-of-utterance ─► LLM via the SAME module flow (tutor graph / patient agent)
   tokens ─► sentence-boundary chunker ─► TTS stream ─► tts_chunk frames ─► client
barge-in: client voice-activity during playback ─► cancel TTS + LLM gen, flush, new turn
```

- **Latency budget (perceived turn ≤1.2s)**: STT end-of-speech detection ≤300ms; LLM first token ≤700ms (voice defaults to the small/fast route — `latency_sensitive=true`, students can say "explain deeply" to upgrade); first TTS audio ≤200ms after first sentence. Start TTS on the first complete sentence — never wait for the full answer.
- **Verification in voice**: stream audio optimistically; the verifier runs on the buffered text — if a claim is dropped/repaired post-hoc, append a spoken correction ("correction: …") and mark the transcript. Rare by design (groundedness ≥95%), but never silently let audio diverge from the verified transcript.
- **STT failover**: Deepgram circuit-open → Amazon Transcribe Medical (prod) → text-input fallback banner (the product gets simpler, never dark). Provider behind a `Speech` protocol like the gateway's.
- **TTS**: low-latency neural Indian-English voice; clinical personas map to distinct voices + prosody settings. **Cache TTS audio** keyed by (text-hash, voice) in S3/MinIO — definitions, mnemonics, and recall-pack audio repeat constantly (big COGS save).
- Session state in Redis (transcript builds into the normal session → memory extractors work unchanged). Audio itself is NOT retained beyond the session unless `voice_processing` consent includes retention (DPDP).

## Cost controls (this line item can eat the margin — plan §2.7)

- Hard caps via payments skill: free 0–5 min/day (flag-controlled; default 0 until COGS measured), paid capped-generous. Cap hit → graceful switch to text with friendly copy.
- Meter every leg: STT seconds, LLM tokens, TTS characters → `model_call`/`voice_usage` events → COGS dashboard. Per-user anomaly alert (a runaway voice user should page before the invoice does).

## Client (`apps/web/src/lib/voice.ts`, with frontend skill)

AudioWorklet capture → Opus frames; jitter-buffered playback; VAD for barge-in; push-to-talk default on mobile (hostel noise), open-mic opt-in; live partial-caption UI; accessibility: all voice interactions have text equivalents.

## Acceptance criteria

- Local e2e: spoken question → cited verified answer audio, perceived turn ≤1.2s p95 (measure with synthetic audio fixtures); barge-in halts playback ≤250ms and the interrupted answer is marked in transcript. Kill Deepgram container → failover/text-fallback without session drop. TTS cache hit on repeated definition proven. Free-tier cap → text fallback flow. Medical-vocabulary fixture (drug names, eponyms) transcribed correctly — this is why Nova-3 *Medical*; test it, don't assume it.

## Anti-patterns

- End-to-end speech models that bypass the RAG/verification path (you'd be un-verifying your medical answers); waiting for the full LLM answer before TTS; unlimited free voice (the plan calls this the margin killer — §2.7, §18.2); retaining audio without explicit consent; building voice before Phase 7's prerequisites (tutor + clinical flows must exist; voice is a transport, not a module).

References: IMPLEMENTATION.md Phase 7, §7; master plan §3.7, §15.4, §4.3.
