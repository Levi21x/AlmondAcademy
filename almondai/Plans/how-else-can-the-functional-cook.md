# AlmondAI Tutor: Beyond RAG — Anti-Hallucination Architecture

## Context

The core problem: generic LLMs (ChatGPT, etc.) hallucinate medical facts. They can't guarantee that "the normal serum potassium is 3.5–5.0 mEq/L" traces to Harrison's page 312 or that "metformin dose is 500–2000 mg/day" matches the Indian drug reference. RAG solves the "grounding" problem but is not sufficient alone. This plan describes the full layered defense.

**Already planned (do not rebuild):** hybrid BM25+dense retrieval → BGE reranker → LLM generation → groundedness verifier, Qwen3-Embedding, semantic cache in Redis, per-student misconception graph, eval harness (Langfuse/Ragas), multimodal (Netter plates, X-rays).

**The organizing principle:** No single technique eliminates hallucination. Build layers so that a wrong answer must defeat multiple independent checkpoints to reach a student. Make each layer cheap enough to run on every query.

---

## The 6-Layer Defense Stack (additive to existing RAG)

```
Layer 0  RAG pipeline (already planned)
Layer 1  Smarter retrieval          — HyDE, contrastive pairs, multi-hop
Layer 2  Deterministic lookup tools — pharmacology, lab ranges, staging, anatomy
Layer 3  Structured output forcing  — subject templates where every slot = citation
Layer 4  Generation-time critique   — constitutional self-critique + two-model verifier
Layer 5  Per-claim NLI verification — atomic claim decomposition + MedNLI entailment
Layer 6  Confidence surface         — verbalized tiers, "I don't know" path, escalation
```

---

## Layer 1 — Smarter Retrieval

### 1a. HyDE (Hypothetical Document Embeddings)
Before retrieval, prompt the fast model (Nemotron-9B) to generate a *hypothetical ideal answer* from weights alone — never shown to the student. Embed that hypothetical answer and use it as the retrieval query instead of the raw student question.

**Why it helps:** Student queries are noisy ("what's the heart preload thing?"). The hypothetical answer is in textbook vocabulary and retrieves the right passage even when the query is malformed. The hypothetical answer does not need to be correct — it just needs the right terminology to pull the right chunk.

**Cost:** One cheap model call + ~200ms. Run in parallel with metadata pre-filtering. Skip for voice mode (tight latency budget). **Q1.**

### 1b. Contrastive / Differential Retrieval
Maintain a lookup table of ~300 high-frequency confusion pairs derived from PYQ distractors (pre-load vs afterload, Type I vs Type II error, Gram+ vs Gram− cell wall). When a query involves either concept in a pair, always retrieve passages for BOTH entities and instruct the generator to compare them explicitly.

**Integration:** When the per-student misconception graph marks that this student confuses X and Y, trigger contrastive retrieval proactively without waiting for the student to ask "X vs Y." The misconception graph becomes an active retrieval governor. **Q1 seed list; Q2 dynamic expansion from misconception graph.**

### 1c. Multi-Hop Question Decomposition
For integrative questions ("why are beta-blockers used in heart failure but contraindicated in cardiogenic shock?"), decompose into 2–4 atomic sub-questions via the fast model, retrieve for each in parallel, then synthesize. Trigger only when query contains: "why," "how does X relate to Y," "compare," "mechanism," or spans two subject areas.

**Cost:** 2–4x retrieval per triggered query. Skip for single-concept factual lookups. **Q2.**

---

## Layer 2 — Deterministic Lookup Tools (MCP)

The highest-ROI section. For a large class of medical facts, bypass the LLM entirely. A lookup table cannot hallucinate.

**Every tool returns a citation-ready structured object:**
```json
{
  "fact_type": "drug_dose",
  "drug": "Metformin",
  "dose_range": "500mg–2000mg/day",
  "source": "CIMS India 2026",
  "confidence": "deterministic",
  "citation": "CIMS India 2026, p. 712"
}
```
The generator is instructed to inline-cite this object verbatim — it cannot deviate from the returned value.

### Tools to build (in priority order):

| Tool | Covers | Data Source | Complexity | Timeline |
|---|---|---|---|---|
| **Pharmacology lookup** | Drug doses, mechanisms, contraindications, pregnancy categories | CIMS India / MIMS India (license required — non-negotiable) | Medium | Q1 |
| **Lab reference ranges** | Normal ranges incl. pediatric, pregnancy-adjusted | Harrison's appendix (manual extraction, ~1 engineer-week) | Low | Q1 |
| **Staging/classification** | TNM, NYHA, Child-Pugh, GOLD, CHA₂DS₂-VASc, ~200 systems | Manual structured table (~2 engineer-weeks content) | Low | Q1–Q2 |
| **Anatomical landmarks** | Muscle origin/insertion/nerve supply/action | BD Chaurasia (structured extraction — content project) | Medium | Q2 |
| **PYQ match → direct anchor** | Past exam questions with verified correct answers | Existing PYQ database | Low | Q1 |

**PYQ match detail:** Embed the student query, retrieve top-5 PYQs by cosine similarity. If similarity >0.92, treat the PYQ correct answer as a hard ground truth, inject it verbatim, and instruct the generator: "This matches a past exam question — cite this answer exactly." The distractor options from matched PYQs are automatically added to the contrastive pairs table (Layer 1b). **Q1.**

**UMLS query normalization (Q2):** Run queries through QuickUMLS to normalize synonyms before BM25 search. Fixes: "heart attack" → "myocardial infarction," Indian-English abbreviations, colloquial student language. Dense retrieval handles synonymy implicitly; BM25 does not. Applies to the BM25 component only.

---

## Layer 3 — Structured Output Forcing

Structure is verification. If the generator must fill a template where every slot requires a citation, it cannot hallucinate a slot without citing a missing source — and the missing citation is itself detectable.

**Subject-specific Pydantic schemas (examples):**

```
Anatomy:     origin, insertion, nerve_supply, action, blood_supply, clinical_note
             → each field: {value: str, citation: {source, page}}

Pharmacology: drug_class, mechanism, indications, dose, side_effects, contraindications
             → dose field MUST be filled from deterministic lookup tool, not generated

Pathology:   definition, etiology, pathogenesis, morphology, clinical_features,
             investigations, management
             → each field: {value: str, citation: {source, page}}
```

**Why this beats free-form:** Verification is slot-by-slot. Run the deterministic tool on the `dose` field. Run NLI on each `mechanism` claim. Any field with a missing citation is flagged immediately without reading prose.

**Differential diagnosis template (for clinical questions):**
```
Differential 1: {diagnosis, supporting_features: [{claim, citation}], against: [{claim, citation}]}
Differential 2: ...
Key distinguishing test: {test, expected_finding_d1, expected_finding_d2}
PYQ note: {appeared_in_pyq: bool, expected_format: str}
```

**Implementation:** Pydantic structured generation. Most modern LLMs follow JSON schemas reliably when the schema is in the system prompt. **Q1.**

---

## Layer 4 — Generation-Time Critique

### 4a. Constitutional AI Self-Critique (Q1 — prompt only, zero infra cost)
After generation, before returning the answer, the generator critiques its own output against a medical-accuracy "constitution":
- Is every numerical value cited from a source?
- Is every drug dose within the standard reference range?
- Are any claims made with more confidence than the retrieved evidence warrants?
- Does any claim contradict the retrieved passages?

The model then revises the flagged portions. This is not generic self-critique ("is this correct?") — it is adversarially targeted at the specific failure modes of medical LLMs. **Q1 as a prompt change.**

### 4b. Two-Model Verifier (Q2 — async, non-blocking)
A separate model call (mid-tier, adversarial prompt) reads the draft answer + retrieved context and is specifically instructed to find factual errors. It runs asynchronously after the generator streams the answer to the student. If it finds a contradiction, it appends a correction note rather than blocking the stream.

**Why async matters:** This adds one model call but does not increase perceived latency because the student is already reading the streamed answer while the verifier runs.

---

## Layer 5 — Per-Claim NLI Verification (Q2)

**Claim decomposition:** After generation, decompose the answer into atomic claims using the fast model (structured output: list of claims). Example: "The QRS complex is widened in bundle branch block" is one atomic claim.

**Per-claim verification:**
1. Embed each claim, retrieve its top-1 supporting passage
2. Run **MedNLI** (BERT-class model fine-tuned on MIMIC, runs in-process, ~50ms) to classify: ENTAILED / NEUTRAL / CONTRADICTED
3. Tag each claim with a confidence tier: HIGH (entailed) / MEDIUM (neutral, some support) / LOW (neutral, weak support) / FLAGGED (contradicted)

**On contradiction:** Attempt targeted re-retrieval for the flagged claim. If a supporting passage is found, regenerate that section. If not, replace with the refusal template (Layer 6).

**Why this beats answer-level groundedness:** A single groundedness score of 0.85 hides the one wrong claim — which is often the most precise-seeming one (a specific number, an eponym) and the one the student is most likely to memorize. Per-claim catches the exact failure.

---

## Layer 6 — Confidence Surface and Escalation

### 6a. Verbalized per-claim confidence (Q1 — prompt change)
Tag each field in the structured output with a confidence tier derived from Layers 2–5:
- **HIGH:** came from a deterministic lookup tool or MedNLI-entailed from corpus
- **MEDIUM:** well-supported by retrieved passage, not deterministic
- **LOW:** inference from context, not directly stated
- **UNVERIFIED:** could not verify from corpus

UI rendering: HIGH = normal display. MEDIUM = citation shown inline. LOW = "verify with textbook" note. UNVERIFIED = suppressed, replaced with refusal.

### 6b. "I Don't Know" Refusal Path (Q1)
When overall confidence falls below threshold (fewer than N HIGH/MEDIUM claims, or any FLAGGED contradiction), serve the refusal template instead of the low-confidence answer:

```
AlmondAI could not find a verified answer for "[specific claim]" in the textbook corpus.

What I do know:
- [verified fact 1, citation]
- [verified fact 2, citation]

Check: [Textbook, Chapter, Page range]
This topic [has/has not] appeared in PYQs at your university.
```

A product that refuses when it can't answer safely is more trustworthy than one that always produces fluent output. The refusal is a feature.

### 6c. Human Escalation Queue (Q2)
Questions that escape the confidence threshold go to a faculty review queue (not shown to student; student gets the refusal template). Every escalated question is a corpus gap signal — the most-escaped topics are the content-acquisition roadmap. Faculty reviews feed into the golden set for the eval harness.

---

## Priority Matrix

| Technique | Layer | Impact | Complexity | Timeline |
|---|---|---|---|---|
| Subject-specific structured templates | 3 | Very High | Low | Q1 |
| Pharmacology deterministic tool | 2 | Very High | Medium | Q1 |
| Lab reference ranges tool | 2 | High | Low | Q1 |
| PYQ match → direct answer anchor | 2 | High | Low | Q1 |
| Constitutional self-critique | 4a | High | Low (prompt) | Q1 |
| "I don't know" refusal path | 6b | High | Low | Q1 |
| HyDE query reformulation | 1a | Medium-High | Low | Q1 |
| Contrastive pairs seed table | 1b | High | Low-Medium | Q1 |
| Verbalized confidence (per-claim) | 6a | Medium | Low | Q1 |
| Staging/classification lookup tool | 2 | High | Low | Q1–Q2 |
| Claim decomposition + MedNLI | 5 | Very High | Medium | Q2 |
| Two-model async verifier | 4b | High | Medium | Q2 |
| Multi-hop decomposition | 1c | High | Medium | Q2 |
| UMLS normalization for BM25 | 1 | Medium | Medium | Q2 |
| Anatomical landmarks table | 2 | High | Medium (content) | Q2 |
| Contrastive pairs dynamic expansion | 1b | High | Medium | Q2 |
| Human escalation + faculty queue | 6c | Medium | Medium | Q2 |
| UI confidence tier visualization | 6a | Medium | Medium | Q3 |
| Medical PEFT/LoRA fine-tuning | — | Low (marginal over good RAG) | High | Q3+ only after eval proves gap |

**Fine-tuning caveat:** Do not pursue until the eval harness proves RAG quality has plateaued. Fine-tuning increases fluency but can silently decrease groundedness. For a medical product, a less fluent grounded answer is strictly better than a fluent hallucination.

---

## Q1 Sprint Allocation (4 engineers)

| Engineer | Focus |
|---|---|
| AI/ML lead | HyDE, constitutional critique prompt, verbalized confidence schema, contrastive pairs seed, PYQ match pipeline |
| Backend 1 | Pharmacology lookup tool (license + API), lab reference table, staging/classification tool seed, structured Pydantic schemas |
| Backend 2 | Reranker + pgvector migration (already in plan), "I don't know" refusal path, human escalation queue stub |
| Full-stack | Eval harness (Langfuse golden sets, groundedness gate in CI) — without this, you cannot measure whether any of the above worked |

---

## Architecture Flow (complete, Q1 state)

```
Student Query
  │
  ├─► PYQ Match Check (>0.92 cosine sim → serve cached PYQ answer + cite)
  │
  ├─► Intent Classifier
  │     ├── subject type → select Pydantic template
  │     ├── "X vs Y" → flag contrastive retrieval
  │     └── integrative → flag multi-hop (Q2)
  │
  ├─► HyDE: fast model → hypothetical answer → embed
  │
  ├─► Deterministic Tool Lookup (parallel with retrieval)
  │     ├── pharmacology tool (drug name detected)
  │     ├── lab reference tool (lab value detected)
  │     └── staging tool (classification system detected)
  │
  ├─► Hybrid Retrieval (BM25 + HyDE dense embedding)
  │     └── if "X vs Y": dual retrieval for both entities
  │
  ├─► BGE Reranker → top-5 passages
  │
  ├─► Structured Generator (Qwen3-80B)
  │     ├── system: subject template + constitutional critique rules
  │     ├── context: reranked passages + deterministic tool outputs
  │     └── output: structured JSON, per-field citations
  │
  ├─► Per-claim confidence tagging + refusal gate
  │     └── below threshold → serve refusal template, log to escalation queue
  │
  └─► Stream to student
        + async: two-model verifier appends correction note if contradiction found (Q2)
```

---

## Verification

After Q1 build, run the eval harness against the golden set:
- Groundedness >95% (target: >97% by Q2)
- Citation correctness >90% (every citation traces to a real page)
- Pharmacology dose accuracy: 100% (deterministic tool — any failure is a data error, not a model error)
- Retrieval recall@10 measurably higher than pre-HyDE baseline
- "I don't know" trigger rate: monitor weekly — declining rate = corpus gap is being closed

The eval gate in CI is what distinguishes whether any of this actually worked from whether it sounds plausible.
