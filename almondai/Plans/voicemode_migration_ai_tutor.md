# AlmondAI Unified Voice Experience Integration

You are a Principal Product Architect, Staff Product Designer, and Senior Full-Stack Engineer.

Your job is NOT to rebuild our Voice Mode.

Our Voice Mode already exists and is fully implemented.

Your responsibility is to think deeply about how to integrate the existing Voice Mode into the AI Tutor experience in the most elegant, scalable, and premium way possible.

Think like the teams behind ChatGPT Advanced Voice, Perplexity Voice, and Pi AI.

---

# Existing Product

AlmondAI currently has two experiences.

## AI Tutor
A ChatGPT-like interface where students can:

- Ask medical questions
- Have conversation history
- Receive streamed responses
- Search
- Deep Explain
- Visualize concepts
- Upload files
- Use voice input (speech-to-text only)

This is the primary learning interface.

---

## Voice Agent
A completely separate page that already exists and already works.

It already supports:

- Real-time voice conversations
- Continuous microphone mode
- Speech-to-text
- AI responses
- Text-to-speech
- Natural back-and-forth conversations
- Session management
- Streaming
- Turn-based conversations

This system is already implemented.

DO NOT redesign or rebuild its core functionality.

Assume the entire voice engine already exists and works correctly.

---

# Problem

Voice Mode currently lives on its own page.

This creates an unnatural product experience because students feel like they are switching products.

We want students to feel like there is only one assistant:

# Dr. Almond

Students should be able to:

- Type
- Speak
- Listen
- Continue conversations

inside the SAME AI Tutor conversation.

No context switching.
No navigation.
No separate sessions.
No duplicate histories.

---

# Goal

Transform Voice Mode from:

A Separate Product

into:

A Capability of AI Tutor.

The student should never think:

"I am leaving the chat."

They should only feel:

"I changed how I am talking to Dr. Almond."

---

# Existing Input Area

AI Tutor currently has:

- Text box
- Attachment button
- Voice Input button (speech-to-text only)
- Send button

The current mic button should remain exactly as it is.

Purpose:

Speech → Text → User edits → Send

This should not change.

---

# New Requirement

Introduce a SECOND button.

This button is NOT voice input.

This button activates:

# Continuous Voice Mode

inside the AI Tutor.

When activated:

- Voice session starts
- Student speaks naturally
- Existing Voice Agent handles STT/TTS/conversation
- User speech appears inside the chat
- Assistant responses appear inside the chat
- Assistant responses are also spoken aloud
- Student can continue talking naturally

Everything remains inside the same conversation thread.

Voice and text should become two ways of interacting with the same assistant and same chat.

---

# Example

User types:

"Explain nephrotic syndrome."

Assistant responds.

Student taps Voice Mode.

Student says:

"Can you simplify that?"

Assistant responds.

Student says:

"Compare it with nephritic syndrome."

Assistant responds.

Student types:

"Give me a mnemonic."

Assistant responds.

Everything appears in one conversation.

One history.
One context.
One assistant.

---

# Your Task

Do NOT rebuild Voice Mode.

Do NOT redesign the STT/TTS engine.

Do NOT create a new voice architecture.

Assume all of that already exists.

Your job is to determine:

## Product Architecture

How should Voice Mode become part of AI Tutor?

Should Voice Mode:

- Open inline?
- Expand above the input?
- Become a docked mini-panel?
- Become an overlay?
- Become a floating voice controller?
- Become a bottom sheet?
- Become a side panel?

Explore multiple approaches.

Provide pros and cons.

Recommend the best solution.

---

## UX Architecture

Design:

### Idle State
### Connecting State
### Listening State
### Thinking State
### Speaking State
### Interrupted State
### Paused State
### Ended State
### Error State

For each state provide:

- UI behavior
- Animations
- Transitions
- User feedback

---

## Chat Integration

Determine:

- How voice messages should appear in chat
- Should they have a microphone badge?
- Should transcripts stream live?
- Should partial transcripts be visible?
- Should assistant responses indicate they were spoken?
- Should voice and text messages look identical or slightly different?

---

## Conversation Continuity

Design how:

- Typed messages
- Voice messages
- Attachments
- Search
- Deep Explain
- Visualize

all coexist in the same conversation.

---

## State Management

Assume:

AI Tutor state already exists.
Voice Agent state already exists.

Design:

- How they should merge
- Shared conversation state
- Shared message history
- Shared session management
- Shared context window
- Shared persistence

---

## Migration Strategy

The Voice Agent page already exists.

Determine:

1. What can be reused?
2. What should move into shared services?
3. What becomes reusable hooks/providers?
4. What should remain isolated?
5. How should the existing page be deprecated?
6. How do we avoid regressions?

---

## Engineering Deliverables

Provide:

### High-Level Product Architecture
### UX Flows
### State Diagrams
### Integration Architecture
### Component Hierarchy
### Event Flows
### Sequence Diagrams
### Migration Plan
### Risks and Mitigations
### Incremental Implementation Plan

Use Mermaid diagrams wherever possible.

---

# Important Constraints

1. Do not rebuild Voice Mode.
2. Do not rewrite the existing voice engine.
3. Reuse as much of the existing implementation as possible.
4. Minimize engineering effort.
5. Preserve existing functionality.
6. Preserve all existing conversations.
7. Make the experience feel like one unified Dr. Almond assistant.

Think like a principal engineer integrating an already-built voice system into a flagship AI chat product used by millions of medical students.