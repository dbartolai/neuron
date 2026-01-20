# Neuron Prompt System Architecture Diagrams

## BEFORE REFACTOR

```
┌─────────────────────────────────────────────────────────────────┐
│                     REQUEST FLOW (OLD)                          │
└─────────────────────────────────────────────────────────────────┘

Student Request
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Router Layer (chat.py / course.py)                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 1. Fetch course levels from DB                           │   │
│  │ 2. Call PromptService.get_level(type, idx)              │   │
│  │ 3. Manually prepend GLOBAL_INVARIANTS                   │   │
│  │ 4. String concatenation: invariants + guardrails        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Stage 1: Student Rules Check (ChatService)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ evaluate_student_rules()                                 │   │
│  │ - Send student_rules to gpt-5-nano                       │   │
│  │ - LLM judges if prompt is allowed                        │   │
│  │ - Returns: (passed, violations)                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  IF FAILED:                                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ❌ Generic Error Message:                                │   │
│  │ "Your prompt did not pass rules. Violations: {reasons}"  │   │
│  │ RETURN (stops here)                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Stage 2: Generate Response (ChatService)                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ chat_with_guardrails()                                   │   │
│  │                                                           │   │
│  │ System Prompt (Ad-Hoc):                                  │   │
│  │ "All responses must be Markdown. No HTML. Use code      │   │
│  │  blocks with language tags."                             │   │
│  │ + guardrails (concatenated strings)                      │   │
│  │                                                           │   │
│  │ Send to: gpt-5.1                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Stage 3: Response Rules Check (ChatService)                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ evaluate_response_rules()                                │   │
│  │ - Send response + response_rules to gpt-5-nano           │   │
│  │ - LLM judges if response follows rules                   │   │
│  │ - Returns: (passed, violations)                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  IF FAILED (1 Retry):                                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Corrective Instruction (Vague):                          │   │
│  │ "Follow all response rules strictly. Your previous       │   │
│  │  response violated: {vtext}. Revise."                    │   │
│  │                                                           │   │
│  │ Retry with gpt-5.1 → evaluate again                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  IF STILL FAILED:                                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ❌ Generic Fallback:                                      │   │
│  │ "I couldn't produce a response that met the course       │   │
│  │  guardrails. Please rephrase or contact instructor."     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
Response to Student


┌─────────────────────────────────────────────────────────────────┐
│                  PROBLEMS WITH OLD SYSTEM                        │
└─────────────────────────────────────────────────────────────────┘

1. ❌ FALLBACK IS A SUGGESTION (lines like "FALLBACK: refuse...")
   - Model can ignore fallback instructions
   - No code enforces fallback behavior
   - Generic, unhelpful error messages

2. ❌ TUTOR IDENTITY NOT EXPLICIT
   - System prompt: "Use Markdown. No HTML."
   - Doesn't say WHO the assistant is
   - Doesn't say HOW to teach

3. ❌ PROMPT DRIFT
   - 912 lines of strings in levels.py
   - Same concepts restated 3x per level
   - Inconsistent phrasing across levels

4. ❌ VALIDATION IS SLOW
   - Every response needs 2 LLM calls (stage 1 + 3)
   - Expensive and adds latency
   - LLM judges can be inconsistent

5. ❌ WEAK RETRY
   - Only 1 retry attempt
   - Vague correction: "Follow rules strictly"
   - Doesn't tell model WHAT to fix
```

---

## AFTER REFACTOR (PHASE 1-2)

```
┌─────────────────────────────────────────────────────────────────┐
│                     REQUEST FLOW (NEW)                          │
└─────────────────────────────────────────────────────────────────┘

Student Request
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Router Layer (chat.py / course.py)                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 1. Fetch course levels from DB                           │   │
│  │ 2. Call PromptService.get_level(type, idx)              │   │
│  │ 3. Prepend GLOBAL_INVARIANTS (unchanged)                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Stage 1: Student Rules Check (ChatService)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ evaluate_student_rules()                                 │   │
│  │ - Same as before: gpt-5-nano judges                      │   │
│  │ - Returns: (passed, violations)                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  IF FAILED:                                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ✅ Deterministic Fallback (NEW):                          │   │
│  │                                                           │   │
│  │ violation_type = infer_violation_type(violations)        │   │
│  │ fallback = FallbackService.generate_fallback(            │   │
│  │     violation_type, thread_type, level_idx, prompt)      │   │
│  │                                                           │   │
│  │ Returns pedagogical response:                            │   │
│  │ - Acknowledges request                                   │   │
│  │ - Explains restriction pedagogically                     │   │
│  │ - Offers alternative help                                │   │
│  │ - Suggests 3 concrete next steps                         │   │
│  │                                                           │   │
│  │ RETURN (stops here, no error thrown)                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Stage 2: Generate Response (ChatService)                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ chat_with_guardrails()                                   │   │
│  │                                                           │   │
│  │ System Prompt (NEW - Unified Contract):                  │   │
│  │ ┌────────────────────────────────────────────────────┐   │   │
│  │ │ build_system_prompt(guardrails)                    │   │   │
│  │ │                                                     │   │   │
│  │ │ ✅ TUTOR_IDENTITY:                                  │   │   │
│  │ │    "You are ceria, a Socratic coding tutor..."     │   │   │
│  │ │                                                     │   │   │
│  │ │ ✅ PEDAGOGICAL_FRAMEWORK:                           │   │   │
│  │ │    1. Understand First                             │   │   │
│  │ │    2. Teach, Don't Tell                            │   │   │
│  │ │    3. Guide Discovery                              │   │   │
│  │ │    4. Empower Action                               │   │   │
│  │ │    5. Metacognitive Reflection                     │   │   │
│  │ │                                                     │   │   │
│  │ │ ✅ OUTPUT_SCHEMA_MARKDOWN:                          │   │   │
│  │ │    Required 3-section structure                    │   │   │
│  │ │                                                     │   │   │
│  │ │ ✅ CORE_PRINCIPLES:                                 │   │   │
│  │ │    8 universal rules (all levels)                  │   │   │
│  │ │                                                     │   │   │
│  │ │ ✅ Level-Specific Guardrails:                       │   │   │
│  │ │    (appended at runtime)                           │   │   │
│  │ └────────────────────────────────────────────────────┘   │   │
│  │                                                           │   │
│  │ Send to: gpt-5.1                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Stage 3: Response Rules Check (ChatService)                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ evaluate_response_rules()                                │   │
│  │ - Same as before: gpt-5-nano judges                      │   │
│  │ - Returns: (passed, violations)                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  IF FAILED (1 Retry - unchanged for now):                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Corrective Instruction (still vague):                    │   │
│  │ "Follow all response rules strictly. Revise."            │   │
│  │                                                           │   │
│  │ Retry with gpt-5.1 → evaluate again                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  IF STILL FAILED:                                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ✅ Deterministic Fallback (NEW):                          │   │
│  │                                                           │   │
│  │ violation_type = infer_violation_type(violations)        │   │
│  │ fallback = FallbackService.generate_fallback(...)        │   │
│  │                                                           │   │
│  │ Returns pedagogical response (not generic error)         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
Response to Student


┌─────────────────────────────────────────────────────────────────┐
│               IMPROVEMENTS IN PHASE 1-2                          │
└─────────────────────────────────────────────────────────────────┘

1. ✅ DETERMINISTIC FALLBACKS
   ┌────────────────────────────────────────────────────────────┐
   │ FallbackService (Pure Python, No LLM)                      │
   │ ├── 6 ViolationTypes with specific templates              │
   │ ├── Pedagogical structure (acknowledge + help + steps)    │
   │ ├── 100% coverage (no generic errors)                     │
   │ └── infer_violation_type() from violations list           │
   └────────────────────────────────────────────────────────────┘

2. ✅ UNIFIED PROMPT CONTRACT
   ┌────────────────────────────────────────────────────────────┐
   │ prompt_contract.py (Single Source of Truth)                │
   │ ├── TUTOR_IDENTITY: Explicit role & purpose               │
   │ ├── PEDAGOGICAL_FRAMEWORK: 5-step teaching flow           │
   │ ├── OUTPUT_SCHEMA: Required 3-section structure           │
   │ ├── CORE_PRINCIPLES: 8 universal rules                    │
   │ └── build_system_prompt(guardrails)                       │
   └────────────────────────────────────────────────────────────┘

3. ✅ PEDAGOGY-FIRST BEHAVIOR
   - Tutor identity is now explicit in every prompt
   - Teaching approach is structured and consistent
   - Student agency and conceptual learning emphasized
   - Every response follows pedagogical framework

4. ⏳ VALIDATION STILL SLOW (Phase 3 will fix)
   - Still relies on LLM judges
   - Still only 1 retry
   - Still vague corrections
```

---

## PLANNED: AFTER FULL REFACTOR (PHASE 3-6)

```
┌─────────────────────────────────────────────────────────────────┐
│              FUTURE STATE (PHASE 3-6)                           │
└─────────────────────────────────────────────────────────────────┘

Additional Improvements:

┌─────────────────────────────────────────────────────────────────┐
│  Phase 3: Enhanced Validation                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Multi-Layer Validation:                                  │   │
│  │                                                           │   │
│  │ Layer 1 (Fast, Deterministic):                           │   │
│  │ ├── Regex checks for structure                          │   │
│  │ ├── Code block counting                                 │   │
│  │ └── Prohibited pattern detection                        │   │
│  │                                                           │   │
│  │ Layer 2 (Slow, Context-Aware):                           │   │
│  │ └── LLM judge (only if Layer 1 passes)                  │   │
│  │                                                           │   │
│  │ Retry Logic (3 Attempts):                                │   │
│  │ ├── Attempt 1: Original prompt                          │   │
│  │ ├── Attempt 2: Specific correction with examples        │   │
│  │ ├── Attempt 3: Even more specific guidance              │   │
│  │ └── Fallback: Deterministic pedagogical response        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Phase 4: Data-Driven Policies                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ level_policy.py (Replaces 912 lines of strings)         │   │
│  │                                                           │   │
│  │ @dataclass                                               │   │
│  │ class LevelPolicy:                                       │   │
│  │     code_generation: PolicyAction                        │   │
│  │     code_analysis: PolicyAction                          │   │
│  │     max_code_lines: int | None                           │   │
│  │     max_functions: int | None                            │   │
│  │     requires_verbal_spec: bool                           │   │
│  │     fallback_template: str                               │   │
│  │                                                           │   │
│  │ Benefits:                                                │   │
│  │ ✅ Type-safe (can't typo policy actions)                 │   │
│  │ ✅ Queryable (filter by capability)                      │   │
│  │ ✅ Validated (unit tests ensure consistency)             │   │
│  │ ✅ Compact (19 instances vs 912 lines)                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Phase 5: Structured Outputs                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Option A: OpenAI Structured Outputs                      │   │
│  │ response_format = {                                      │   │
│  │     "type": "json_schema",                               │   │
│  │     "schema": RESPONSE_JSON_SCHEMA                       │   │
│  │ }                                                         │   │
│  │                                                           │   │
│  │ Option B: Markdown Parser                                │   │
│  │ ResponseParser.parse_response(markdown)                  │   │
│  │ → {understanding, teaching_response, next_steps}         │   │
│  │                                                           │   │
│  │ Benefits:                                                │   │
│  │ ✅ Deterministic structure validation                    │   │
│  │ ✅ Fast (no LLM call needed)                             │   │
│  │ ✅ Programmatic access to sections                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Phase 6: Testing & Metrics                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Test Harness:                                            │   │
│  │ ├── 140 automated test cases (7 per level)              │   │
│  │ ├── Boundary tests (should/shouldn't fallback)          │   │
│  │ ├── Adversarial tests (jailbreak attempts)              │   │
│  │ └── Edge case tests (ambiguous requests)                │   │
│  │                                                           │   │
│  │ Metrics Dashboard:                                       │   │
│  │ ├── Fallback rate by level                              │   │
│  │ ├── Retry rate by level                                 │   │
│  │ ├── Validation pass rate (Layer 1 vs 2)                 │   │
│  │ ├── Student satisfaction (thumbs up/down)               │   │
│  │ └── Instructor feedback                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## KEY ARCHITECTURAL PRINCIPLES

### 1. Separation of Concerns
```
┌─────────────────────────────────────────────────────┐
│ BEFORE: Everything mixed together                   │
│ ├── Router builds prompts                           │
│ ├── ChatService has prompt strings                  │
│ └── Levels file has everything                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ AFTER: Clear separation                             │
│ ├── prompt_contract.py: Teaching identity           │
│ ├── fallback_service.py: Deterministic fallbacks    │
│ ├── levels.py: Level data (to be replaced)          │
│ ├── level_policy.py: Policy dataclasses (future)    │
│ └── validation_service.py: Multi-layer checks       │
└─────────────────────────────────────────────────────┘
```

### 2. Determinism Over Hope
```
┌─────────────────────────────────────────────────────┐
│ BEFORE: Hope the model follows instructions         │
│ "FALLBACK: If user asks for code, refuse..."        │
│ ❌ Model can ignore this                             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ AFTER: Code enforces behavior                       │
│ if not passed:                                      │
│     return FallbackService.generate_fallback(...)   │
│ ✅ Guaranteed execution                              │
└─────────────────────────────────────────────────────┘
```

### 3. Single Source of Truth
```
┌─────────────────────────────────────────────────────┐
│ BEFORE: Prompt construction scattered               │
│ ├── chat.py: "Use Markdown..."                      │
│ ├── levels.py: "CAPABILITIES: ..."                  │
│ └── Duplication across files                        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ AFTER: One contract, used everywhere                │
│ prompt_contract.py: build_system_prompt()           │
│ └── All prompts start from this foundation          │
└─────────────────────────────────────────────────────┘
```

### 4. Pedagogy First
```
┌─────────────────────────────────────────────────────┐
│ BEFORE: Formatting rules, then constraints          │
│ "Use Markdown. No HTML. [guardrails]"               │
│ ❌ Doesn't say WHO you are or HOW to teach          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ AFTER: Teaching identity, then techniques           │
│ "You are a Socratic tutor. Your purpose: teach      │
│  through guided discovery. Framework: 5 steps..."   │
│ ✅ Explicit pedagogy, then constraints               │
└─────────────────────────────────────────────────────┘
```

---

## FILE DEPENDENCY GRAPH

### Current Implementation (Phase 1-2)

```
┌──────────────────────────────────────────────────────────┐
│                    Data Layer                            │
├──────────────────────────────────────────────────────────┤
│  levels.py (Legacy)                                      │
│  ├── GLOBAL_INVARIANTS                                   │
│  ├── WRITING_LEVELS[0-7]                                 │
│  ├── TESTING_LEVELS[0-5]                                 │
│  └── DEBUGGING_LEVELS[0-5]                               │
│                                                           │
│  prompt_contract.py (NEW)                                │
│  ├── TUTOR_IDENTITY                                      │
│  ├── PEDAGOGICAL_FRAMEWORK                               │
│  ├── OUTPUT_SCHEMA_MARKDOWN                              │
│  ├── CORE_PRINCIPLES                                     │
│  └── build_system_prompt()                               │
│                                                           │
│  fallback_service.py (NEW)                               │
│  ├── ViolationType enum                                  │
│  ├── TEMPLATES dict                                      │
│  ├── generate_fallback()                                 │
│  └── infer_violation_type()                              │
└──────────────────────────────────────────────────────────┘
                    ▲
                    │
┌──────────────────────────────────────────────────────────┐
│                  Service Layer                           │
├──────────────────────────────────────────────────────────┤
│  prompt_service.py                                       │
│  ├── get_level() → accesses levels.py                   │
│  └── build_prompt() → (deprecated)                      │
│                                                           │
│  chat_service.py                                         │
│  ├── evaluate_student_rules()                           │
│  ├── chat_with_guardrails()                             │
│  │   └── uses: build_system_prompt()                    │
│  ├── chat_with_guardrails_stream()                      │
│  │   └── uses: build_system_prompt()                    │
│  └── evaluate_response_rules()                          │
└──────────────────────────────────────────────────────────┘
                    ▲
                    │
┌──────────────────────────────────────────────────────────┐
│                  Router Layer                            │
├──────────────────────────────────────────────────────────┤
│  chat.py                                                 │
│  ├── send_chat()                                         │
│  │   └── uses: FallbackService.generate_fallback()      │
│  └── send_chat_stream()                                 │
│      └── uses: FallbackService.generate_fallback()      │
│                                                           │
│  course.py                                               │
│  ├── create_course_thread()                             │
│  │   └── uses: FallbackService.generate_fallback()      │
│  └── create_course_thread_stream()                      │
│      └── uses: FallbackService.generate_fallback()      │
└──────────────────────────────────────────────────────────┘
```

---

## METRICS FLOW

```
┌─────────────────────────────────────────────────────────┐
│                 Metric Collection Points                 │
└─────────────────────────────────────────────────────────┘

Request → Stage 1 → Stage 2 → Stage 3 → Response
   │         │         │         │          │
   │         │         │         │          │
   ▼         ▼         ▼         ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ Total  │ │Student │ │Generate│ │Response│ │ Final  │
│Request │ │ Rules  │ │        │ │ Rules  │ │Outcome │
│ Count  │ │ Check  │ │        │ │ Check  │ │        │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘
             │                      │
             ├─ Passed              ├─ Passed (1st try)
             ├─ Failed → Fallback   ├─ Failed → Retry
             └─ Violation Type      ├─ Passed (2nd try)
                                    └─ Failed → Fallback

Metrics Dashboard:
┌─────────────────────────────────────────────────────────┐
│ Level: Writing 0                                        │
│ ├── Requests: 234                                       │
│ ├── Stage 1 Fallbacks: 45 (19.2%) ← Expected high      │
│ ├── Stage 3 Retries: 2 (0.9%) ← Should be low          │
│ ├── Final Fallbacks: 1 (0.4%) ← Should be rare         │
│ └── Student Satisfaction: 4.2/5                         │
│                                                         │
│ Level: Writing 7                                        │
│ ├── Requests: 189                                       │
│ ├── Stage 1 Fallbacks: 5 (2.6%) ← Expected low         │
│ ├── Stage 3 Retries: 8 (4.2%) ← Acceptable             │
│ ├── Final Fallbacks: 1 (0.5%) ← Should be rare         │
│ └── Student Satisfaction: 4.5/5                         │
└─────────────────────────────────────────────────────────┘
```
