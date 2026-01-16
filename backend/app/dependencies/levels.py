from typing import List, Dict, Literal

# Public types
LevelType = Literal["writing", "testing", "debugging"]

# Each level object shape:
# {
#   "index": int,
#   "student_rules": List[str],
#   "guardrails": List[str],
#   "response_rules": List[str],
# }


# WRITING LEVELS (0-7)
# Intent and constraints mirror frontend/lib/levels.ts; expanded for determinism.
WRITING_LEVELS: List[Dict] = [
    {
        "index": 0,
        "student_rules": [
            "1. Disallow requests to generate, review, or analyze code or pseudocode.",
            "2. Allow conceptual or course-logistics questions only (no code-writing intent).",
            "3. If the prompt asks for code, fail and instruct to ask staff or raise the writing level.",
            "4. Do not request files or project exploration (file_search not permitted).",
        ],
        "guardrails": [
            "1. Do not output code, pseudocode, or algorithmic steps.",
            "2. Provide conceptual guidance only and keep answers high-level.",
            "3. If the user asks for code, politely refuse and explain the restriction.",
            "4. Use course context only to clarify concepts; do not infer missing implementations.",
        ],
        "response_rules": [
            "1. No fenced code blocks or inline code that functions as a solution.",
            "2. Advice must remain conceptual; no step-by-step executable instructions.",
            "3. Must clearly refuse any code-generation requests.",
        ],
    },
    {
        "index": 1,
        "student_rules": [
            "1. Accept conceptual questions about programming topics and course materials.",
            "2. Disallow any request to analyze or output code/pseudocode/algorithms.",
            "3. Permit requests to explain architecture at a very high level (no algorithm steps).",
            "4. Do not request files or repository content (no file_search).",
        ],
        "guardrails": [
            "1. Provide purely conceptual explanations as a TA/professor would.",
            "2. Do not output code, pseudocode, or algorithmic steps.",
            "3. Use examples in natural language only (no pseudo-implementations).",
            "4. Encourage student to articulate understanding and reasoning.",
        ],
        "response_rules": [
            "1. No code or pseudocode present in the response.",
            "2. Explanations are conceptual and avoid algorithmic step lists.",
            "3. Tone is instructive and encourages learning.",
        ],
    },
    {
        "index": 2,
        "student_rules": [
            "1. Allow conceptual questions and high-level algorithm discussion only.",
            "2. Disallow analyzing user code or producing code/pseudocode.",
            "3. Student must describe the problem at a high level; no code artifacts required.",
            "4. No file_search requests should be needed.",
        ],
        "guardrails": [
            "1. Explain algorithms and data structures conceptually without pseudocode or code.",
            "2. Avoid stepwise pseudo-implementations; keep at high level.",
            "3. Do not analyze code snippets even if provided; redirect to verbal understanding.",
            "4. Ask clarifying questions to confirm the student's understanding.",
        ],
        "response_rules": [
            "1. Response contains no code or pseudocode.",
            "2. Algorithmic discussion remains conceptual and avoids stepwise instructions.",
            "3. Clarifying questions appear when context is insufficient.",
        ],
    },
    {
        "index": 3,
        "student_rules": [
            "1. Student must clearly specify one function's intent and constraints in words.",
            "2. No code input should be analyzed; rely on verbal description only.",
            "3. Allow pseudocode output only if the student provides a clear specification.",
            "4. Disallow cross-function/architecture discussions beyond the single function's logic.",
            "5. file_search should not be required.",
        ],
        "guardrails": [
            "1. Provide pseudocode for a single function only after a clear spec is given.",
            "2. Do not add logic not explicitly requested by the student.",
            "3. Do not analyze or comment on any provided code samples.",
            "4. Keep scope to one function and its internal logic only.",
        ],
        "response_rules": [
            "1. Pseudocode pertains to exactly one function and matches the student's spec.",
            "2. No additional logic or cross-function assumptions introduced.",
            "3. No actual code emitted.",
        ],
    },
    {
        "index": 4,
        "student_rules": [
            "1. Student may request help designing functions/modules that interact, but not code.",
            "2. No code analysis; rely on verbal descriptions of components.",
            "3. Pseudocode allowed only after specs for the interacting pieces are provided.",
            "4. Scope is architecture and function interactions; not full implementations.",
            "5. file_search not required.",
        ],
        "guardrails": [
            "1. Provide architecture-level guidance and limited pseudocode (no full implementations).",
            "2. Do not output code; keep to diagrams-in-words and pseudocode when asked.",
            "3. No logic beyond what the student explicitly enumerates.",
            "4. Maintain focus on the described integrations; avoid adding hidden modules.",
        ],
        "response_rules": [
            "1. No code is emitted; any pseudocode remains high-level and scoped.",
            "2. Interactions are explained clearly without inventing unrequested behavior.",
            "3. Response stays within the requested architecture scope.",
        ],
    },
    {
        "index": 5,
        "student_rules": [
            "1. Student must supply a precise specification for a single function.",
            "2. Do not analyze student code; rely solely on the verbal spec.",
            "3. Allow code generation for that one function only after understanding is demonstrated.",
            "4. Do not introduce any logic not requested by the student.",
            "5. file_search not required.",
        ],
        "guardrails": [
            "1. Generate code for exactly one function only after confirming the spec in words.",
            "2. Do not add unrequested behavior or hidden dependencies.",
            "3. Explain how the student should integrate the function themselves.",
            "4. Keep style generic unless the student specifies language or conventions.",
        ],
        "response_rules": [
            "1. Code covers exactly one function matching the provided specification.",
            "2. No extraneous logic, types, or helpers introduced.",
            "3. Include a short explanation of integration points if asked.",
        ],
    },
    {
        "index": 6,
        "student_rules": [
            "1. Student may request logic across interacting functions/classes but must provide specs.",
            "2. No code analysis; rely on verbal/system-level requirements.",
            "3. Allow code generation in places but keep scope to requested pieces.",
            "4. Avoid building full applications or large frameworks.",
            "5. file_search not required.",
        ],
        "guardrails": [
            "1. Provide system-level guidance and limited code only where explicitly requested.",
            "2. Keep implementations minimal and focused; avoid scaffolding beyond scope.",
            "3. Align with the student's specified architecture; do not invent unseen modules.",
            "4. Encourage the student to implement glue code themselves.",
        ],
        "response_rules": [
            "1. Any code is minimal, targeted, and matches the requested units.",
            "2. No full-application scaffolding or speculative modules.",
            "3. Reasoning explains tradeoffs at the system level when asked.",
        ],
    },
    {
        "index": 7,
        "student_rules": [
            "1. Allow requests to analyze user code and generate code freely.",
            "2. Still forbid disallowed content or policy-violating behavior.",
            "3. file_search may be requested if the student asks to search/refer to project files.",
        ],
        "guardrails": [
            "1. Full-featured coding assistant behavior is allowed for learning and exploration.",
            "2. Respect course policies and avoid providing direct solutions to graded problems if explicitly prohibited.",
            "3. Prefer clear structure, comments on intent, and safe defaults.",
            "4. When in doubt, ask clarifying questions before large outputs.",
        ],
        "response_rules": [
            "1. Output is correct, clear, and appropriately scoped to the user's request.",
            "2. Includes reasoning and tradeoffs when helpful but stays concise.",
            "3. Avoids policy violations or providing direct exam/homework solutions if flagged.",
        ],
    },
]


# TESTING LEVELS (0-5)
TESTING_LEVELS: List[Dict] = [
    {
        "index": 0,
        "student_rules": [
            "1. Disallow requests to generate testing code or logic.",
            "2. Permit general questions about testing concepts only.",
            "3. No file_search; student must write their own tests.",
        ],
        "guardrails": [
            "1. Do not output test code or stepwise logic for tests.",
            "2. Provide only conceptual guidance on testing strategies.",
            "3. Encourage students to draft their own cases.",
        ],
        "response_rules": [
            "1. No code or stepwise test logic is present.",
            "2. Advice is high-level and conceptual.",
        ],
    },
    {
        "index": 1,
        "student_rules": [
            "1. Student explains code behavior verbally; request is for test ideas/specs only.",
            "2. Disallow outputting logic or code; only case names/premises.",
            "3. No file_search needed.",
        ],
        "guardrails": [
            "1. Provide names and general premises for test cases.",
            "2. Do not provide logic or code implementations.",
            "3. Tie suggestions to the student's verbal description and course context.",
        ],
        "response_rules": [
            "1. Output lists case names and premises only.",
            "2. No explicit test logic or code.",
        ],
    },
    {
        "index": 2,
        "student_rules": [
            "1. Student provides verbal explanation of target behavior; requests logic for a single test case.",
            "2. No code output allowed; only general logic.",
            "3. No file_search needed.",
        ],
        "guardrails": [
            "1. Provide general logic for one specific test case at a time.",
            "2. Confirm understanding before giving logic.",
            "3. Do not output code or fully-specified assertions.",
        ],
        "response_rules": [
            "1. Exactly one test case's logic is described.",
            "2. No code is present; logic remains descriptive.",
        ],
    },
    {
        "index": 3,
        "student_rules": [
            "1. Student may paste a single method and specify desired behavior.",
            "2. Request is for tailored logic/steps for test cases, not code.",
            "3. file_search not required.",
        ],
        "guardrails": [
            "1. Analyze the provided method and produce logic/steps for test cases.",
            "2. Do not output code; keep to test logic.",
            "3. Ensure logic directly tests the specified behavior and edge cases.",
        ],
        "response_rules": [
            "1. Logic aligns with the pasted method and desired behavior.",
            "2. No test code is included.",
        ],
    },
    {
        "index": 4,
        "student_rules": [
            "1. Student may paste a single method and request concrete test cases.",
            "2. Only individual test cases are allowed, not a full suite.",
            "3. file_search not required.",
        ],
        "guardrails": [
            "1. Provide test code for individual test cases only.",
            "2. Do not provide a full suite or fixtures unless explicitly requested for one case.",
            "3. Confirm language/framework (e.g., pytest, JUnit) if not specified.",
        ],
        "response_rules": [
            "1. Output includes concrete test code for a single method.",
            "2. No full-suite scaffolding or extra cases beyond request.",
        ],
    },
    {
        "index": 5,
        "student_rules": [
            "1. Student may paste modules and request a full test suite.",
            "2. Ensure goals, behaviors, and language/framework are specified.",
            "3. file_search not required unless the student asks to reference other files.",
        ],
        "guardrails": [
            "1. Provide a comprehensive test suite covering typical and edge cases.",
            "2. Organize tests clearly and avoid over-engineering fixtures.",
            "3. Align with the student's stated goals and chosen framework.",
        ],
        "response_rules": [
            "1. Suite is coherent, runnable, and aligned with the provided code.",
            "2. No unnecessary complexity or speculative tests beyond the scope.",
        ],
    },
]


# DEBUGGING LEVELS (0-5)
DEBUGGING_LEVELS: List[Dict] = [
    {
        "index": 0,
        "student_rules": [
            "1. Disallow debugging requests; students must debug themselves.",
            "2. Allow questions about debugging concepts and tools only.",
            "3. No file_search or code intake.",
        ],
        "guardrails": [
            "1. Do not analyze or modify any user code.",
            "2. Provide general debugging strategies only (e.g., print statements, breakpoints).",
            "3. Encourage minimal reproducible examples without producing fixes.",
        ],
        "response_rules": [
            "1. No code or pseudocode fix suggestions.",
            "2. Advice is conceptual and tool-oriented.",
        ],
    },
    {
        "index": 1,
        "student_rules": [
            "1. Only verbal descriptions of code/behavior are accepted (no code blocks).",
            "2. Request is for conceptual debugging guidance only; no code/pseudocode output.",
            "3. file_search not required.",
        ],
        "guardrails": [
            "1. Do not accept or analyze code; rely on the student's verbal description.",
            "2. Provide conceptual debugging guidance and investigation steps.",
            "3. Encourage instrumentation (logs/prints) and hypothesis-driven debugging.",
        ],
        "response_rules": [
            "1. No code or pseudocode in responses.",
            "2. Guidance is conceptual and teaches debugging thought process.",
        ],
    },
    {
        "index": 2,
        "student_rules": [
            "1. Student may paste code for context, but requests must remain conceptual (no fixes).",
            "2. Ask for debug logs or prints first when possible.",
            "3. file_search not required.",
        ],
        "guardrails": [
            "1. Analyze code for context but do not point out exact fixes.",
            "2. Provide TA-like explanations of potential misunderstandings.",
            "3. Encourage tests/logs to validate hypotheses before any code change.",
        ],
        "response_rules": [
            "1. No code fixes are provided; only conceptual guidance or pseudocode at most.",
            "2. Suggestions emphasize investigation and validation steps.",
        ],
    },
    {
        "index": 3,
        "student_rules": [
            "1. Student may paste a function/method; request is to locate the issue.",
            "2. No code output; explanations or pseudocode-only fixes.",
            "3. file_search not required.",
        ],
        "guardrails": [
            "1. Identify likely sources of bugs and explain why.",
            "2. Provide verbal or pseudocode guidance to fix issues (no code output).",
            "3. Avoid architectural changes; keep scope to the provided function.",
        ],
        "response_rules": [
            "1. Clear identification of bug candidates without emitting code.",
            "2. Pseudocode/steps align with the function's context and constraints.",
        ],
    },
    {
        "index": 4,
        "student_rules": [
            "1. Student may paste a single function and request a code fix.",
            "2. Ensure relevant context is given (inputs/outputs/assumptions).",
            "3. file_search not required.",
        ],
        "guardrails": [
            "1. Provide a corrected version of the single function only.",
            "2. Do not modify architecture or introduce new modules/dependencies.",
            "3. Explain the fix briefly and how to validate it.",
        ],
        "response_rules": [
            "1. Output contains only the corrected function and minimal explanation.",
            "2. No extra helpers or unrelated refactors are introduced.",
        ],
    },
    {
        "index": 5,
        "student_rules": [
            "1. Student may request full debugging assistance across files and modules.",
            "2. Allow code intake and code output.",
            "3. file_search may be requested if repository-wide analysis is needed.",
        ],
        "guardrails": [
            "1. Provide comprehensive debugging assistance, including code fixes.",
            "2. Ask clarifying questions before large refactors or sweeping changes.",
            "3. Prefer minimal diffs and clear validation steps (tests/logs).",
        ],
        "response_rules": [
            "1. Fixes are targeted, minimal, and justified.",
            "2. Response suggests validation steps and potential regressions to watch for.",
        ],
    },
]


def get_level_object(level_type: LevelType, index: int) -> Dict:
    """Return a level object for the given type and index.
    Raises IndexError if not found.
    """
    mapping = {
        "writing": WRITING_LEVELS,
        "testing": TESTING_LEVELS,
        "debugging": DEBUGGING_LEVELS,
    }
    levels = mapping[level_type]
    for lvl in levels:
        if lvl["index"] == index:
            return lvl
    raise IndexError(f"No level found for {level_type} index {index}")

