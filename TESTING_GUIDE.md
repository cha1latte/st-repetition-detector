# 🧪 **Repetition Detector Testing System**

Based on analysis of the repetition detector extension, here's a comprehensive testing system to verify each feature works correctly:

## **📋 Core Feature Testing Checklist**

### **1. Extension Loading & Initialization**
**Test:** Extension loads without errors
- **Action**: Restart SillyTavern, check Extensions panel
- **Expected**: "AI Repetition Detector" appears in extensions list
- **Verify**: Check browser console for `"AI Structure Repetition Detector extension loaded"`
- **Debug**: Look for any console errors during startup

### **2. Settings UI Functionality**
**Test:** Settings interface works correctly
- **Action**: Open Extensions → AI Repetition Detector
- **Expected**: 
  - ✅ Drawer expands/collapses properly
  - ✅ "Enable structure repetition detection" checkbox works
  - ✅ Sensitivity slider (Low/Medium/High) responds
  - ✅ All 4 pattern detection checkboxes toggle properly
- **Verify**: Settings persist after refresh

### **3. Settings Persistence**
**Test:** Settings are saved and restored
- **Action**: 
  1. Change settings (disable some patterns, change sensitivity)
  2. Refresh SillyTavern
  3. Check settings panel
- **Expected**: All changes are preserved
- **Debug**: Check `localStorage` for `repetition-detector_settings`

## **🔍 Pattern Detection Testing**

### **4. Sentence Structure Detection**
**Test:** Detects repetitive sentence rhythm patterns

**Test Case A - Short-Long-Short Pattern:**
```
Message 1: "Yes. This is a much longer sentence that explains something in detail. Okay."
Message 2: "No. Here we have another lengthy explanation that goes into specifics. Right."  
Message 3: "Sure. Yet another extended sentence providing comprehensive information. Good."
```
**Expected**: Toast warning about "Sentence rhythm pattern: S-L-S"

**Test Case B - Consistent Length Pattern:**
```
Message 1: "This is about eight words long."
Message 2: "Here are roughly eight words again."
Message 3: "Another sentence with eight words total."
```
**Expected**: Toast about "Consistent sentence length"

### **5. Opening Pattern Detection**
**Test:** Detects repetitive response openings

**Test Case A - Single Word Openings:**
```
Message 1: "Yes. I understand your point..."
Message 2: "No. That's not quite right..."
Message 3: "Perhaps. There's another way..."
```
**Expected**: Toast about "Opening style pattern: single-statement"

**Test Case B - Question Openings:**
```
Message 1: "Are you sure about that? Let me explain..."
Message 2: "Do you think so? I have a different view..."
Message 3: "Is that right? Here's what I know..."
```
**Expected**: Toast about "Opening style pattern: short-question"

### **6. Paragraph Structure Detection**
**Test:** Detects repetitive paragraph organization

**Test Case:**
```
Message 1: "First sentence. Second sentence.

Third sentence here. Fourth sentence. Fifth sentence.

Final sentence."

Message 2: "Opening statement. Another statement.

Three sentences here. Four sentences. Five sentences total.

Closing statement."
```
**Expected**: Toast about "Paragraph structure: 2 → 3 → 1 sentences"

### **7. Dialogue Pattern Detection**
**Test:** Detects repetitive dialogue vs narrative ratios

**Test Case - Dialogue Heavy:**
```
Message 1: "Hello there," she said. "How are you?" "I'm fine," he replied.
Message 2: "What's wrong?" she asked. "Nothing much," he answered. "Are you sure?"
Message 3: "Let's go," she suggested. "Sounds good," he agreed. "Perfect."
```
**Expected**: Toast about "Dialogue pattern: dialogue-heavy"

## **⚙️ Sensitivity Testing**

### **8. Sensitivity Levels**
**Test:** Different sensitivity levels change detection behavior

**Low Sensitivity (1):**
- Needs 4+ repetitions across 7 messages
- **Test**: Repeat pattern only 3 times → Should NOT trigger

**Medium Sensitivity (2):** 
- Needs 3+ repetitions across 5 messages
- **Test**: Repeat pattern 3 times → Should trigger

**High Sensitivity (3):**
- Needs 2+ repetitions across 4 messages  
- **Test**: Repeat pattern 2 times → Should trigger

### **9. Pattern Type Toggles**
**Test:** Individual pattern detection can be disabled
- **Action**: Disable "Opening style patterns"
- **Test**: Send messages with repetitive openings
- **Expected**: No alerts for opening patterns, but other patterns still detected

## **🎯 Advanced Functionality Testing**

### **10. Slash Command**
**Test:** Manual repetition check works
- **Action**: Type `/check-repetition` in chat
- **Expected**: 
  - ✅ Command appears in autocomplete
  - ✅ Analyzes last message immediately
  - ✅ Shows toast if patterns found

### **11. Message History Management**
**Test:** Extension tracks message history properly
- **Action**: Send 10+ messages, check if old messages are forgotten
- **Expected**: Only analyzes recent messages (window size based on sensitivity)

### **12. User Message Filtering**
**Test:** Extension ignores user messages
- **Action**: Send user messages with repetitive patterns
- **Expected**: No alerts triggered (only AI messages analyzed)

## **🚨 Error Handling Testing**

### **13. Toast Notification System**
**Test:** Alerts display correctly
- **Expected Toast Format**:
  ```
  ⚠️ Repetitive AI structure detected:

  • [Pattern description] (X times)
  
  The AI may be falling into repetitive response patterns.
  ```
- **Verify**: Toast appears top-center, stays for 12 seconds

### **14. Edge Cases**
**Test:** Extension handles unusual inputs
- **Empty messages**: Should not crash
- **Very short messages**: Should not trigger false positives  
- **Messages with only punctuation**: Should handle gracefully
- **Mixed language messages**: Should not break analysis

## **📊 Integration Testing**

### **15. SillyTavern Integration**
**Test:** Works with different SillyTavern features
- **Character switching**: Message history should reset appropriately
- **Different AI models**: Should work regardless of backend
- **Chat regeneration**: Should analyze regenerated responses
- **Multiple conversations**: Should maintain separate detection state

## **🔧 Debugging Tools**

### **Console Monitoring:**
Watch for these console messages:
- `"Repetition detector: Starting initialization"`
- `"AI Structure Repetition Detector extension loaded"`
- Any error messages during pattern analysis

### **Settings Verification:**
Check `localStorage.getItem('repetition-detector_settings')` contains:
```json
{
  "enabled": true,
  "sensitivity": 2,
  "checkSentenceStructure": true,
  "checkOpeningPatterns": true,
  "checkParagraphStructure": true,
  "checkDialoguePatterns": true
}
```

## **🎯 Quick Smoke Test**

**5-Minute Verification:**
1. ✅ Extension appears in Extensions panel
2. ✅ Settings UI opens and closes
3. ✅ Send 3 messages starting with "Yes." → Should trigger alert
4. ✅ Disable detection → No more alerts
5. ✅ `/check-repetition` command works

This testing system will help you verify that all features of your repetition detector are working as intended! 🎉

## **🏷️ Test Result Tracking**

**Date Tested:** ___________  
**SillyTavern Version:** ___________  
**Browser:** ___________

| Test # | Feature | Status | Notes |
|--------|---------|--------|-------|
| 1 | Extension Loading | ⬜ Pass ⬜ Fail | |
| 2 | Settings UI | ⬜ Pass ⬜ Fail | |
| 3 | Settings Persistence | ⬜ Pass ⬜ Fail | |
| 4 | Sentence Structure | ⬜ Pass ⬜ Fail | |
| 5 | Opening Patterns | ⬜ Pass ⬜ Fail | |
| 6 | Paragraph Structure | ⬜ Pass ⬜ Fail | |
| 7 | Dialogue Patterns | ⬜ Pass ⬜ Fail | |
| 8 | Sensitivity Levels | ⬜ Pass ⬜ Fail | |
| 9 | Pattern Toggles | ⬜ Pass ⬜ Fail | |
| 10 | Slash Command | ⬜ Pass ⬜ Fail | |
| 11 | Message History | ⬜ Pass ⬜ Fail | |
| 12 | User Message Filter | ⬜ Pass ⬜ Fail | |
| 13 | Toast Notifications | ⬜ Pass ⬜ Fail | |
| 14 | Edge Cases | ⬜ Pass ⬜ Fail | |
| 15 | ST Integration | ⬜ Pass ⬜ Fail | |

**Overall Result:** ⬜ All Tests Pass ⬜ Issues Found

**Issues Found:**
- [ ] Issue 1: ________________________________
- [ ] Issue 2: ________________________________
- [ ] Issue 3: ________________________________