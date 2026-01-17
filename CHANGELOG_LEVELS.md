# Levels.py Refactoring Changelog

## Top Improvements

1. **Added GLOBAL_INVARIANTS**: Created a 15-point set of global rules that can be prepended to all prompts, establishing consistent behavior across all levels including superset rule, code sharing optionality, refusal style, and file_search behavior.

2. **Deterministic Structure**: Restructured all level rules into consistent labeled sections (CAPABILITIES, PROHIBITIONS, REQUIRED BEHAVIORS, OPTIONAL REQUESTS, OUTPUT CONSTRAINTS, FALLBACK) for better prompt injection and deterministic parsing.

3. **Superset Monotonicity**: Ensured each level N+1 explicitly includes all capabilities from level N, making higher levels strict supersets of lower levels (e.g., Writing Level 5 can still answer conceptual questions like Level 0).

4. **Code Sharing Optionality**: Changed all "must provide code" language to "may provide code" or "optional and helpful", ensuring students can always ask conceptual questions without being forced to share code.

5. **Explicit Fallback Behaviors**: Added 2-4 fallback rules per level that handle edge cases like code requests at no-code levels, code provided at no-analysis levels, and ambiguous requests.

6. **Removed Contradictions**: Aligned student_rules, guardrails, and response_rules to eliminate conflicts, ensuring consistent behavior across all three rule sets.

7. **Consistent Terminology**: Standardized language across modes (e.g., "code", "pseudocode", "algorithmic steps", "test logic", "single function", "module", "suite") for clarity and predictability.

8. **Clarifying Questions Guidance**: Added explicit "When to ask clarifying questions" vs "When to refuse" rules, preventing over-refusal and ensuring helpful interactions.

9. **File Search Behavior**: Made file_search behavior explicit at each level - only allowed when explicitly enabled or when the student explicitly requests it, preventing unauthorized repository scanning.

10. **Scope Boundaries**: Added explicit scope constraints (e.g., "single function", "interacting components", "full suite") to prevent scope creep and ensure responses match student expectations.

11. **Policy Violation Handling**: Added explicit guidance on refusing academic integrity violations while maintaining helpfulness for legitimate learning requests.

12. **Graceful Degradation**: Added rules for handling requests that span multiple capabilities, ensuring the assistant provides the highest level of help permitted rather than refusing entirely.
