# CONTEXT

You are the CTO, Principal AI Architect, Voice AI Engineer, Backend Lead, Frontend Lead, Agentic AI Expert, and Product Architect for AlmondAI.

Your job is NOT to provide generic suggestions.

Your job is to deeply inspect the ENTIRE codebase and behave exactly like the engineer who is responsible for shipping AlmondAI's voice mode to production.

Assume this product will be used by hundreds of thousands of MBBS students and every engineering decision must be production-grade.

Do not make assumptions.

Read the entire codebase first.

Trace every relevant file, service, API, websocket, frontend component, backend handler, state manager, agent, model integration, streaming implementation, and audio processing pipeline before making conclusions.

Think step-by-step like a senior engineer debugging a critical production issue.

---

# CURRENT VOICE ARCHITECTURE

Current expected flow:

User clicks microphone button

↓

Microphone captures audio

↓

Audio streamed to Sarvam STT

↓

Sarvam returns transcription

↓

Transcription sent to Groq LLM

↓

Groq generates response

↓

Response streamed to Cartesia TTS

↓

Cartesia generates audio

↓

Audio streamed back to user

↓

User hears spoken response

---

# CURRENT PROBLEM

The microphone button appears to activate.

However the system does not seem to capture voice properly.

The expected flow is breaking before a meaningful transcription is generated.

Observed behavior:

* Clicking microphone does not result in reliable speech capture.
* No visible indication that STT is receiving audio.
* No meaningful response generated.
* No proper voice conversation occurs.

I need you to identify exactly where the pipeline breaks.

Do not guess.

Trace every step.

---

# PRIMARY TASK

Perform a complete Voice Mode Investigation.

I want a detailed report containing:

## 1. End-to-End Flow Analysis

Show:

Frontend microphone flow

↓

Audio processing

↓

Streaming layer

↓

STT layer

↓

Backend routing

↓

Groq inference

↓

TTS generation

↓

Audio playback

For every step explain:

* Which files are involved
* Which functions are involved
* Which APIs are involved
* Which events trigger the next step

---

## 2. Root Cause Analysis

Identify:

* Why voice capture is failing
* Why STT is not receiving audio
* Why audio is not being streamed properly
* Why transcription is failing
* Why LLM response generation is failing (if applicable)
* Why TTS is not being triggered (if applicable)

Show actual code-level reasons.

Not assumptions.

---

## 3. Fix Plan

For every issue:

Provide:

* Exact file
* Exact function
* Exact code section
* Exact fix required
* Why the fix works
* Side effects
* Production considerations

---

## 4. Voice Pipeline Architecture Review

Evaluate whether the current architecture is optimal.

Review:

* Sarvam STT
* Groq LLM
* Cartesia TTS
* WebSocket implementation
* Streaming implementation
* Frontend audio handling
* Backend orchestration

Explain:

* What should remain
* What should be replaced
* What should be redesigned

---

## 5. Latency Audit

Voice mode should feel conversational.

Measure and identify latency sources:

* Mic capture latency
* STT latency
* Backend latency
* Groq latency
* TTS latency
* Playback latency

For every bottleneck:

* Explain why it exists
* Explain how to reduce it

Target:

Less than 1.5 second perceived response time.

---

# PRODUCT REQUIREMENT

Voice Mode is NOT a voice chatbot.

Voice Mode is a Medical Mentor.

The experience should feel like:

A brilliant senior doctor sitting beside a student and helping them understand concepts.

Not a robotic assistant.

Not a search engine.

Not a text answer being read aloud.

---

# RESPONSE BEHAVIOR DESIGN

Review the current prompting strategy.

Then redesign the Voice Mentor personality.

The mentor should:

* Speak naturally
* Speak conversationally
* Speak like a human teacher
* Avoid robotic wording
* Avoid long monologues
* Avoid textbook language
* Avoid excessive jargon

The mentor should:

* Give concise answers first
* Expand only when needed
* Ask clarification questions when appropriate
* Break concepts into chunks
* Use analogies frequently
* Use memory of prior conversation
* Adapt to student knowledge level

---

# EXAMPLES

Bad Response:

"Photosynthesis is a biochemical process by which plants convert sunlight into energy."

Good Response:

"Think of a plant like a tiny solar-powered food factory. It captures sunlight and uses it to make its own food."

---

Bad Response:

5 minute lecture.

Good Response:

30 second explanation.

Then:

"Want me to go deeper?"

---

# VOICE RESPONSE RULES

Default voice response length:

15–45 seconds

Default word count:

40–120 words

Maximum:

Only when student explicitly asks for detailed explanation.

Otherwise:

Keep answers concise.

---

# MEMORY DESIGN

Review the current memory implementation.

Determine whether voice mode should remember:

* Weak subjects
* Learning patterns
* Frequently asked concepts
* Language preference
* Explanation preference
* Difficulty preference

Design the ideal memory system for voice conversations.

---

# STUDENT EXPERIENCE REVIEW

Pretend you are:

* First year MBBS student
* Final year MBBS student
* NEET PG aspirant
* Student with exam tomorrow
* Student with weak fundamentals

Evaluate voice mode for all personas.

Identify missing features.

Generate improvements.

---

# PRODUCTION-GRADE ENHANCEMENTS

Generate additional features that would dramatically improve voice mode:

Examples:

* Interruptible speech
* Barge-in support
* Streaming TTS
* Adaptive explanation depth
* Voice memory
* Follow-up suggestions
* Exam panic mode
* Clinical viva mode
* Rapid revision mode
* Socratic teaching mode

Provide at least 50 high-impact improvements.

---

# FINAL OUTPUT

Produce the following sections:

1. Current Architecture Analysis
2. Voice Pipeline Trace
3. Root Cause Findings
4. Exact Bugs Found
5. Exact Fixes Required
6. Refactored Architecture
7. Latency Optimization Plan
8. Mentor Personality Design
9. Prompt Engineering Improvements
10. Memory System Design
11. Student Experience Improvements
12. 50+ Voice Mode Enhancements
13. Production Readiness Checklist
14. CTO Recommendations
15. Step-by-Step Execution Plan

Do not stop at identifying issues.

Think and operate like the CTO responsible for shipping this feature to production.
