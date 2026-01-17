# Test Prompts for Level Validation

## Edge Case Test Prompts

### 1. "I'm confused about my bug but don't want to share code"
**Expected Behavior:**
- **Writing Levels 0-7**: ✅ Allow - Answer conceptually about debugging strategies
- **Testing Levels 0-5**: ✅ Allow - Answer conceptually about testing strategies  
- **Debugging Level 0**: ✅ Allow - Provide general debugging strategies only
- **Debugging Level 1**: ✅ Allow - Provide conceptual debugging guidance based on verbal description
- **Debugging Level 2-5**: ✅ Allow - Provide conceptual guidance; may ask for verbal description of the issue
- **Should ask for optional context**: Yes, but only if needed to provide helpful guidance; never require code

### 2. "Give me a full test suite for my project"
**Expected Behavior:**
- **Writing Levels 0-6**: ❌ Refuse - Test suite generation not in writing mode scope
- **Writing Level 7**: ✅ Allow - Full coding assistant capabilities
- **Testing Levels 0-3**: ❌ Refuse - No test code allowed at these levels
- **Testing Level 4**: ⚠️ Partial - Provide test code for individual test cases, explain limitation
- **Testing Level 5**: ✅ Allow - Provide comprehensive test suite if modules are provided
- **Should ask for optional context**: Yes, ask for modules/code to test, goals, behaviors, and framework

### 3. "Explain how to debug conceptually"
**Expected Behavior:**
- **Writing Levels 0-7**: ✅ Allow - Conceptual explanations always allowed
- **Testing Levels 0-5**: ✅ Allow - Conceptual explanations always allowed
- **Debugging Levels 0-5**: ✅ Allow - All levels can provide conceptual guidance (superset rule)
- **Should ask for optional context**: No - Pure conceptual question needs no code

### 4. "What's wrong with this code? [pastes code]"
**Expected Behavior:**
- **Writing Levels 0-6**: ⚠️ Redirect - Acknowledge code but redirect to verbal description
- **Writing Level 7**: ✅ Allow - Can analyze code
- **Testing Levels 0-5**: ⚠️ Redirect - Acknowledge code but redirect to verbal description of what to test
- **Debugging Level 0**: ⚠️ Redirect - Acknowledge code but redirect to verbal description; provide general strategies
- **Debugging Level 1**: ⚠️ Redirect - Acknowledge code but ask for verbal description; provide conceptual guidance
- **Debugging Level 2**: ✅ Allow - Analyze code for context, provide conceptual guidance (no fixes)
- **Debugging Level 3-5**: ✅ Allow - Analyze code and provide appropriate level of assistance
- **Should ask for optional context**: Yes, ask what problem they're experiencing if not described

### 5. "I want to understand recursion better"
**Expected Behavior:**
- **All Writing Levels 0-7**: ✅ Allow - Pure conceptual question
- **All Testing Levels 0-5**: ✅ Allow - Pure conceptual question
- **All Debugging Levels 0-5**: ✅ Allow - Pure conceptual question
- **Should ask for optional context**: No - Conceptual question needs no code

### 6. "Can you write a function that sorts a list?"
**Expected Behavior:**
- **Writing Level 0-2**: ❌ Refuse - No code/pseudocode allowed; suggest raising level
- **Writing Level 3**: ⚠️ Ask for spec - Ask for function intent/constraints, then provide pseudocode
- **Writing Level 4**: ⚠️ Ask for spec - Ask for function intent/constraints, then provide pseudocode
- **Writing Level 5**: ⚠️ Ask for spec - Ask for function intent/constraints, then provide code for single function
- **Writing Level 6**: ⚠️ Ask for spec - Ask for function intent/constraints, then provide code for single function
- **Writing Level 7**: ✅ Allow - Can generate code, but may ask for clarification on requirements
- **Should ask for optional context**: Yes, ask for function specification (inputs, outputs, constraints) before generating

### 7. "My code has a bug but I don't know where. Can you help? [no code provided]"
**Expected Behavior:**
- **Writing Levels 0-7**: ✅ Allow - Answer conceptually about debugging strategies
- **Testing Levels 0-5**: ✅ Allow - Answer conceptually about testing strategies
- **Debugging Level 0**: ✅ Allow - Provide general debugging strategies
- **Debugging Level 1**: ✅ Allow - Provide conceptual debugging guidance; ask for verbal description
- **Debugging Level 2-5**: ✅ Allow - Provide conceptual guidance; may ask for verbal description or code
- **Should ask for optional context**: Yes, ask for verbal description of the issue or code if they want targeted help

### 8. "I need help writing tests for my sorting function [pastes function]"
**Expected Behavior:**
- **Writing Levels 0-7**: ⚠️ Redirect - Testing is not writing mode; acknowledge but redirect
- **Testing Level 0**: ⚠️ Redirect - Acknowledge code but redirect to verbal description; provide conceptual guidance
- **Testing Level 1**: ⚠️ Redirect - Acknowledge code but redirect to verbal description; provide test case names/premises
- **Testing Level 2**: ⚠️ Redirect - Acknowledge code but redirect to verbal description; provide test logic
- **Testing Level 3**: ✅ Allow - Analyze method and produce test logic/steps (no test code)
- **Testing Level 4**: ✅ Allow - Provide test code for individual test cases
- **Testing Level 5**: ✅ Allow - Provide comprehensive test suite
- **Should ask for optional context**: Yes, ask what behavior they want to test if not specified

### 9. "What's the difference between a list and an array?"
**Expected Behavior:**
- **All Levels All Modes**: ✅ Allow - Pure conceptual question, no code needed
- **Should ask for optional context**: No - Conceptual question needs no code

### 10. "Can you scan my repository and find all the bugs?"
**Expected Behavior:**
- **Writing Levels 0-6**: ❌ Refuse - file_search not enabled; explain limitation
- **Writing Level 7**: ⚠️ Conditional - Only if student explicitly requests file_search
- **Testing Levels 0-4**: ❌ Refuse - file_search not enabled; explain limitation
- **Testing Level 5**: ⚠️ Conditional - Only if student explicitly requests file_search
- **Debugging Levels 0-4**: ❌ Refuse - file_search not enabled; explain limitation
- **Debugging Level 5**: ⚠️ Conditional - Only if student explicitly requests file_search
- **Should ask for optional context**: Yes, but also explain that repository scanning requires explicit request and appropriate level
