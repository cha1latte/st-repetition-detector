# 🧪 **Repetition Detector Test Cases**

This file contains specific test cases designed to trigger each type of repetition pattern detection in the AI Structure Repetition Detector extension.

## **How to Test**
1. **Clear your chat history** to reset the message counter
2. **Send prompts 1-3 for each test case** consecutively  
3. **Watch for toast notifications** after the 3rd AI response
4. **Expected Results:**
   - No alerts on messages 1-2
   - Pattern detection alerts on message 3
   - Multiple notifications if several patterns detected

---

## **1. Sentence Structure Detection (Short-Long-Short Pattern)**

**Goal:** Trigger "Sentence rhythm pattern: S-L-S" alert

**Test Prompts:**
1. `"Please give me a brief yes or no answer, then explain in detail why that's the case, then summarize briefly."`
2. `"Can you provide a short response, followed by a comprehensive analysis of the topic, and then end with a quick conclusion?"`
3. `"Give me a quick answer first, then elaborate extensively on your reasoning, and finish with a brief summary."`

**Expected AI Response Pattern:** Short sentence + Long explanation + Short conclusion  
**Should Trigger:** "Sentence rhythm pattern: S-L-S (3 times)"

---

## **2. Opening Pattern Detection (Repeated Sentence Starters)**

**Goal:** Trigger "Repeated opening word" or "Opening style pattern" alert

**Test Prompts:**
1. `"What do you think about artificial intelligence?"`
2. `"What are your thoughts on machine learning?"`
3. `"What's your opinion on neural networks?"`

**Expected AI Responses:** All starting with "Well, I think..." or similar phrases  
**Should Trigger:** "Repeated opening word: 'well' (3 times)" or "Opening style pattern"

---

## **3. Paragraph Structure Detection (Same Organization)**

**Goal:** Trigger "Paragraph structure: 2 → 4 → 1 sentences" alert

**Test Prompts:**
1. `"Explain the concept of democracy using exactly 3 paragraphs: first paragraph should have 2 sentences, second should have 4 sentences, third should have 1 sentence."`
2. `"Describe climate change in 3 paragraphs with the same structure: 2 sentences in first paragraph, 4 in second, 1 in third."`
3. `"Tell me about quantum physics using 3 paragraphs: first with 2 sentences, second with 4 sentences, last with 1 sentence."`

**Expected Pattern:** 2-4-1 sentence distribution across paragraphs  
**Should Trigger:** "Paragraph structure: 2 → 4 → 1 sentences (3 times)"

---

## **4. Dialogue Pattern Detection (Consistent Dialogue/Narrative Ratio)**

**Goal:** Trigger "Dialogue pattern: dialogue-heavy" alert

**Test Prompts:**
1. `"Write a short story that's mostly dialogue between two characters with minimal description."`
2. `"Create a brief scene that's primarily conversation between people with little narrative text."`
3. `"Tell a quick story that focuses on character dialogue rather than descriptive text."`

**Expected Pattern:** High dialogue-to-narrative ratio in all responses  
**Should Trigger:** "Dialogue pattern: dialogue-heavy (3 times)"

---

## **5. Combined Pattern Test (Multiple Detections)**

**Goal:** Trigger multiple pattern alerts simultaneously

**Test Prompts:**
1. `"Well, can you give me: a short answer, then a detailed explanation, then a brief conclusion? Format it as a dialogue scene."`
2. `"Well, could you provide: a quick response, then comprehensive details, then a short summary? Make it conversational."`
3. `"Well, would you offer: a brief reply, then thorough analysis, then a concise ending? Present it as dialogue."`

**Should Trigger Multiple Alerts:**
- "Repeated opening word: 'well' (3 times)"
- "Sentence rhythm pattern: S-L-S (3 times)"  
- "Dialogue pattern: dialogue-heavy (3 times)"

---

## **6. Sentence Length Consistency Test**

**Goal:** Trigger "Consistent sentence length" alert

**Test Prompts:**
1. `"Give me exactly 8 words per sentence about cats."`
2. `"Provide responses with exactly 8 words per sentence about dogs."`
3. `"Write sentences that are exactly 8 words each about birds."`

**Expected Pattern:** All sentences approximately 8 words long  
**Should Trigger:** "Consistent sentence length: ~8 words (3 times)"

---

## **7. Sensitivity Level Testing**

### **High Sensitivity (Setting = 3)**
- **Threshold:** 2+ repetitions across 4 messages
- **Test:** Use any of the above test cases but expect alerts after just 2 matching patterns

### **Medium Sensitivity (Setting = 2)** [Default]
- **Threshold:** 3+ repetitions across 5 messages  
- **Test:** Standard test cases above

### **Low Sensitivity (Setting = 1)**
- **Threshold:** 4+ repetitions across 7 messages
- **Test:** Need to send 4+ messages with repetitive patterns to trigger alerts

---

## **8. Negative Tests (Should NOT Trigger)**

**Goal:** Verify extension doesn't produce false positives

**Test Prompts (vary structure/style):**
1. `"Tell me about space exploration."`
2. `"How do computers work? Please use technical details."`
3. `"What's your favorite color and why? Write a creative response with metaphors."`

**Expected Result:** No repetition alerts (responses should be varied in structure)

---

## **🔧 Troubleshooting**

**If tests don't trigger as expected:**

1. **Check Console Logs:**
   - Look for "Processing message:" entries
   - Verify "Not enough messages yet, need 3, have: X" appears
   - Ensure actual message content is being processed (not metadata)

2. **Verify Settings:**
   - Extension enabled: ✅
   - Sensitivity: Medium (2)
   - All pattern types enabled: ✅

3. **Clear Chat History:**
   - Reset message counter between test sessions
   - Start fresh conversation for each test case

4. **Message Requirements:**
   - Need at least 3 AI responses before any detection
   - Messages must contain actual content (>10 characters after metadata removal)
   - Only AI messages are analyzed (user messages ignored)

---

## **📊 Test Results Tracking**

**Date Tested:** ___________  
**Extension Version:** ___________  
**Browser:** ___________

| Test Case | Expected Alert | Result | Notes |
|-----------|---------------|--------|-------|
| 1. Sentence Structure | S-L-S pattern | ⬜ Pass ⬜ Fail | |
| 2. Opening Patterns | Repeated words | ⬜ Pass ⬜ Fail | |
| 3. Paragraph Structure | 2→4→1 pattern | ⬜ Pass ⬜ Fail | |
| 4. Dialogue Patterns | dialogue-heavy | ⬜ Pass ⬜ Fail | |
| 5. Combined Patterns | Multiple alerts | ⬜ Pass ⬜ Fail | |
| 6. Sentence Length | Consistent length | ⬜ Pass ⬜ Fail | |
| 7. Sensitivity Test | Varies by setting | ⬜ Pass ⬜ Fail | |
| 8. Negative Test | No false alerts | ⬜ Pass ⬜ Fail | |

**Overall Result:** ⬜ All Tests Pass ⬜ Issues Found

**Issues Found:**
- [ ] Issue 1: ________________________________
- [ ] Issue 2: ________________________________
- [ ] Issue 3: ________________________________