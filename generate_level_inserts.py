#!/usr/bin/env python3
"""
Generate SQL INSERT statements for level_defaults from levels.py
"""

import json
import sys
from pathlib import Path

# Import the levels module
sys.path.insert(0, str(Path(__file__).parent / "backend"))
from app.dependencies.levels import (
    WRITING_LEVELS,
    TESTING_LEVELS,
    DEBUGGING_LEVELS,
    GLOBAL_INVARIANTS
)

def escape_sql_string(s):
    """Escape single quotes for SQL"""
    return s.replace("'", "''")

def generate_inserts():
    """Generate SQL INSERT statements for all levels"""
    inserts = []
    
    # Helper function to create INSERT statement
    def make_insert(mode, level_index, student_rules, guardrails, response_rules):
        student_rules_json = json.dumps(student_rules)
        guardrails_json = json.dumps(guardrails)
        response_rules_json = json.dumps(response_rules)
        
        # Default fallback and tool policies
        fallback_json = json.dumps({
            "violation_types": ["code_generation_denied", "code_analysis_denied"]
        })
        tool_json = json.dumps({
            "file_search": {"enabled": True, "requires_explicit_request": True}
        })
        
        return f"""    INSERT INTO level_defaults (mode, level_index, student_rules, guardrails, response_rules, fallback_policy_json, tool_policy_json)
    VALUES ('{mode}', {level_index}, '{student_rules_json}'::JSONB, '{guardrails_json}'::JSONB, '{response_rules_json}'::JSONB, '{fallback_json}'::JSONB, '{tool_json}'::JSONB)
    ON CONFLICT (mode, level_index) DO NOTHING;"""
    
    # Writing levels (0-7)
    for level in WRITING_LEVELS:
        inserts.append(make_insert(
            'writing',
            level['index'],
            level['student_rules'],
            level['guardrails'],
            level['response_rules']
        ))
    
    # Testing levels (0-5)
    for level in TESTING_LEVELS:
        inserts.append(make_insert(
            'testing',
            level['index'],
            level['student_rules'],
            level['guardrails'],
            level['response_rules']
        ))
    
    # Debugging levels (0-5)
    for level in DEBUGGING_LEVELS:
        inserts.append(make_insert(
            'debugging',
            level['index'],
            level['student_rules'],
            level['guardrails'],
            level['response_rules']
        ))
    
    # Theory levels (0-1) - New, conceptual only
    theory_level_0 = {
        'student_rules': [
            'CAPABILITIES: Answer conceptual questions about programming theory, algorithms, data structures, and computer science concepts.',
            'CAPABILITIES: Explain theoretical concepts using natural language, diagrams, and examples.',
            'CAPABILITIES: Discuss computational complexity, algorithm analysis, and design patterns at a theoretical level.',
            'PROHIBITIONS: Do not accept requests to generate, review, analyze, or discuss code, pseudocode, or implementations.',
            'PROHIBITIONS: Do not accept requests that require code analysis or code generation.',
            'REQUIRED BEHAVIORS: Provide only theoretical and conceptual guidance.',
            'REQUIRED BEHAVIORS: Focus on understanding principles, not implementation details.',
            'OUTPUT CONSTRAINTS: No code blocks, pseudocode, or implementation details.',
            'OUTPUT CONSTRAINTS: Responses must be purely theoretical and conceptual.'
        ],
        'guardrails': [
            'CAPABILITIES: Provide theoretical explanations as a computer science educator would.',
            'CAPABILITIES: Discuss algorithms, data structures, and computational theory conceptually.',
            'PROHIBITIONS: Do not output code, pseudocode, or implementation details.',
            'PROHIBITIONS: Do not analyze code snippets even if provided.',
            'REQUIRED BEHAVIORS: Keep all answers theoretical and conceptual.',
            'OUTPUT CONSTRAINTS: No code blocks, pseudocode, or implementation examples.'
        ],
        'response_rules': [
            'CAPABILITIES: Provide theoretical guidance only.',
            'PROHIBITIONS: No code, pseudocode, or implementation details in responses.',
            'OUTPUT CONSTRAINTS: Responses must remain purely theoretical.'
        ]
    }
    
    theory_level_1 = {
        'student_rules': [
            'CAPABILITIES: Answer conceptual questions about programming theory, algorithms, data structures, and computer science concepts.',
            'CAPABILITIES: Explain theoretical concepts using natural language, diagrams, and examples.',
            'CAPABILITIES: Discuss computational complexity, algorithm analysis, and design patterns at a theoretical level.',
            'CAPABILITIES: Provide high-level algorithmic descriptions and theoretical analysis.',
            'PROHIBITIONS: Do not accept requests to generate, review, analyze, or discuss actual code or implementations.',
            'PROHIBITIONS: Do not accept requests that require code analysis or code generation.',
            'REQUIRED BEHAVIORS: Provide only theoretical and conceptual guidance.',
            'REQUIRED BEHAVIORS: Focus on understanding principles, not implementation details.',
            'OUTPUT CONSTRAINTS: No code blocks, pseudocode, or implementation details.',
            'OUTPUT CONSTRAINTS: Responses must be purely theoretical and conceptual.'
        ],
        'guardrails': [
            'CAPABILITIES: Provide theoretical explanations as a computer science educator would.',
            'CAPABILITIES: Discuss algorithms, data structures, and computational theory conceptually.',
            'CAPABILITIES: Provide algorithmic descriptions at a high theoretical level.',
            'PROHIBITIONS: Do not output code, pseudocode, or implementation details.',
            'PROHIBITIONS: Do not analyze code snippets even if provided.',
            'REQUIRED BEHAVIORS: Keep all answers theoretical and conceptual.',
            'OUTPUT CONSTRAINTS: No code blocks, pseudocode, or implementation examples.'
        ],
        'response_rules': [
            'CAPABILITIES: Provide theoretical guidance and high-level algorithmic descriptions.',
            'PROHIBITIONS: No code, pseudocode, or implementation details in responses.',
            'OUTPUT CONSTRAINTS: Responses must remain purely theoretical.'
        ]
    }
    
    inserts.append(make_insert('theory', 0, theory_level_0['student_rules'], theory_level_0['guardrails'], theory_level_0['response_rules']))
    inserts.append(make_insert('theory', 1, theory_level_1['student_rules'], theory_level_1['guardrails'], theory_level_1['response_rules']))
    
    return '\n\n'.join(inserts)

if __name__ == '__main__':
    print(generate_inserts())
