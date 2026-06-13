# CONTEXT

You are the Principal Voice AI Architect, CTO, Staff Backend Engineer, Staff Frontend Engineer, Real-Time Systems Engineer, AI Infrastructure Engineer, and Product Architect responsible for shipping AlmondAI Voice Mode to production.

This is NOT a code review.

This is a production-critical architecture review and implementation task.

Your objective is to transform the current voice mode into a world-class real-time conversational AI mentor experience comparable to ChatGPT Voice, while remaining optimized for MBBS students.

You must inspect the ENTIRE codebase before making conclusions.

Trace every file, component, API, websocket, hook, service, backend route, agent, model integration, audio processor, state manager, streaming handler, and playback component.

Do not assume anything.

Verify everything.

---

# CURRENT STACK

STT:
Sarvam AI

LLM:
Groq

TTS:
Cartesia

NEW VAD:
Silero VAD (MANDATORY)

---

# OBSERVED PROBLEMS

Problem 1:

Audio is currently being sent as a complete recording.

Observed behavior:

User speaks
↓
Audio recording finishes
↓
Entire file gets sent
↓
STT starts

This is unacceptable.

The audio must stream continuously while the user is speaking.

---

Problem 2:

After transcription, there is noticeable delay before the user hears a response.

Potential causes:

* STT latency
* LLM latency
* Response buffering
* TTS waiting for full response
* Streaming architecture problems

Determine the exact cause.

---

Problem 3:

The LLM response may not be streamed to TTS.

Current suspicion:

LLM generates complete answer
↓
Backend waits
↓
TTS receives full answer
↓
Playback begins

This creates massive latency.

Investigate.

---

Problem 4:

Current voice activation is poor.

Small environmental sounds trigger microphone activity.

Examples:

* Fan noise
* Keyboard typing
* Chair movement
* Background voices
* Room noise

This must be fixed.

Silero VAD should become the primary speech gate.

---

# TARGET EXPERIENCE

The user should feel like they are speaking with an intelligent senior medical mentor.

NOT a chatbot.

NOT a robotic assistant.

NOT a text answer being read aloud.

The interaction should feel natural, responsive, and conversational.

---

# TARGET REAL-TIME PIPELINE

Desired architecture:

Microphone
↓
WebRTC Audio Processing

* Noise Suppression
* Echo Cancellation
* Auto Gain Control
  ↓
  Silero VAD
  ↓
  Audio Chunk Streaming
  ↓
  Sarvam Streaming STT
  ↓
  Partial Transcripts
  ↓
  Groq Streaming LLM
  ↓
  Sentence Chunker
  ↓
  Cartesia Streaming TTS
  ↓
  Audio Playback
  ↓
  User Hears Response

The system should NEVER wait for an entire recording.

The system should NEVER wait for an entire LLM response.

Everything must stream.

---

# PRIMARY TASK

Perform a complete voice architecture investigation.

---

## PHASE 1

VOICE FLOW TRACE

Trace the complete flow.

Show:

Frontend Components
↓
Audio Capture
↓
Audio Processing
↓
WebSockets
↓
Backend Services
↓
STT
↓
LLM
↓
TTS
↓
Playback

For each stage identify:

* Files involved
* Functions involved
* State management involved
* Events involved
* API calls involved
* Current behavior
* Expected behavior

---

## PHASE 2

ROOT CAUSE ANALYSIS

Identify exactly:

1. Why audio is not streaming
2. Whether MediaRecorder is buffering entire recordings
3. Whether WebSockets are implemented correctly
4. Whether Sarvam is being used in streaming mode
5. Whether Sarvam supports streaming in current implementation
6. Whether STT returns partial transcripts
7. Whether Groq streaming is enabled
8. Whether stream=True is configured
9. Whether backend buffers responses
10. Whether Cartesia receives streamed chunks
11. Whether playback starts immediately
12. Whether TTS waits for full completion

Provide evidence.

Do not speculate.

---

## PHASE 3

SILERO VAD IMPLEMENTATION REVIEW

Implement and validate Silero VAD.

Investigate:

* Where VAD should live
* Browser side
* Backend side
* Hybrid architecture

Recommend the optimal approach.

Design:

Speech Start Threshold

Speech End Threshold

Minimum Speech Duration

Minimum Silence Duration

Debounce Logic

Hysteresis Logic

False Positive Prevention

Noise Handling

Background Conversation Handling

Hospital Environment Handling

Hostel Environment Handling

Classroom Environment Handling

---

## PHASE 4

LATENCY ANALYSIS

Measure every stage.

Determine latency introduced by:

* Mic capture
* VAD
* STT
* Backend
* Groq
* TTS
* Playback

Generate:

Current latency estimate

Target latency estimate

Optimization opportunities

Target:

First audio response < 1 second

Total conversational latency < 1.5 seconds

---

## PHASE 5

STREAMING ARCHITECTURE REDESIGN

If architecture is suboptimal:

Redesign it.

Create the ideal implementation.

Show:

Current Architecture

↓

Problems

↓

Improved Architecture

↓

Expected Performance Gains

---

## PHASE 6

MENTOR PERSONALITY SYSTEM

The voice assistant should behave like a mentor.

Not a lecturer.

Not a textbook.

Not a search engine.

Design the complete prompting system.

---

### Default Behavior

Answer quickly.

Answer conversationally.

Use natural language.

Avoid giant explanations.

Avoid robotic phrasing.

Avoid reading textbook definitions.

---

### Explanation Strategy

Level 1:

Quick Answer

10-20 seconds

---

Level 2:

Concept Explanation

30-60 seconds

---

Level 3:

Deep Dive

Only when requested

---

Level 4:

Exam Preparation Mode

MBBS focused

---

Level 5:

Analogy Mode

Explain using relatable examples

---

### Response Rules

Never produce giant paragraphs by default.

Never dump textbook information.

Never sound like ChatGPT.

Always sound like a helpful senior medical mentor.

---

## PHASE 7

BARGE-IN SUPPORT

Investigate whether users can interrupt.

Desired behavior:

AI speaking

↓

User starts speaking

↓

Current TTS stops

↓

Current generation cancels

↓

New speech captured

↓

New conversation begins

Determine if current architecture supports this.

If not:

Design implementation.

---

## PHASE 8

MEMORY FOR VOICE

Design memory specifically for voice mode.

Track:

Weak subjects

Repeated mistakes

Learning preferences

Explanation preferences

Language preferences

Exam schedules

Revision history

Confidence levels

Stress indicators

Conversation context

Explain:

Storage

Retrieval

Update strategy

Expiration strategy

Cost optimization

---

## PHASE 9

PRODUCTION HARDENING

Review:

Failure handling

Reconnect logic

Dropped WebSockets

Audio corruption

Network instability

STT failures

TTS failures

Groq failures

Fallback strategies

Observability

Monitoring

Logging

Metrics

Tracing

Error recovery

---

## PHASE 10

FEATURE EXPANSION

Generate at least 50 production-grade improvements.

Examples:

Interruptible speech

Adaptive explanations

Exam panic mode

Rapid revision mode

Clinical viva mode

Ward simulation

Memory-enhanced teaching

Confidence scoring

Follow-up suggestions

Topic mastery tracking

Voice-based flashcards

Socratic questioning

Diagnostic reasoning mode

And many more.

---

# FINAL OUTPUT

Provide the following sections:

1. Current Voice Architecture
2. Voice Pipeline Trace
3. Root Cause Findings
4. Audio Streaming Findings
5. Silero VAD Integration Plan
6. Exact Bugs Identified
7. Exact Fixes Required
8. Latency Breakdown
9. Streaming Architecture Redesign
10. Mentor Personality Design
11. Prompt Engineering Design
12. Barge-In Design
13. Memory Architecture
14. Production Hardening Plan
15. 50+ Feature Improvements
16. Production Readiness Checklist
17. CTO Recommendations
18. Step-by-Step Engineering Execution Plan

Think like the CTO responsible for shipping AlmondAI Voice Mode to hundreds of thousands of medical students.

Do not provide generic recommendations.

Provide implementation-grade decisions.
