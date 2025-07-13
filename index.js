// Sentence-Opener Match Detection for SillyTavern
console.log('Sentence-Opener Detector: Loading...');

// Configuration
const CONFIG = {
    WINDOW: 5,     // Keep last 5 sentences
    TOKENS: 3,     // Check first 3 words
    THRESHOLD: 3   // Flag if 3+ sentences have same opener
};

let sentenceHistory = [];

// Core opener detection function
function openerFlag(sentences) {
    const recent = sentences.slice(-CONFIG.WINDOW);
    const stems = recent.map(sentence => {
        return sentence
            .toLowerCase()
            .replace(/^[^\w]+|[^\w]+$/g, '')  // Strip leading/trailing punctuation
            .split(/\s+/)
            .slice(0, CONFIG.TOKENS)
            .join(' ');
    });
    
    const counts = {};
    stems.forEach(stem => {
        if (stem.length > 0) {  // Only count non-empty stems
            counts[stem] = (counts[stem] || 0) + 1;
        }
    });
    
    // Check if any opener appears THRESHOLD+ times
    const maxCount = Math.max(...Object.values(counts));
    const repeatedStem = Object.entries(counts).find(([stem, count]) => count >= CONFIG.THRESHOLD);
    
    return {
        hasRepetition: maxCount >= CONFIG.THRESHOLD,
        repeatedStem: repeatedStem ? repeatedStem[0] : null,
        count: maxCount,
        allCounts: counts
    };
}

// Process new message
function processMessage(messageText) {
    console.log('Processing message:', messageText.substring(0, 50) + '...');
    
    // Split into sentences
    const sentences = messageText
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 5);  // Filter out very short fragments
    
    console.log(`Found ${sentences.length} sentences`);
    
    // Add new sentences to history
    sentenceHistory.push(...sentences);
    
    // Keep sliding window
    if (sentenceHistory.length > CONFIG.WINDOW * 3) {  // Keep more history for context
        sentenceHistory = sentenceHistory.slice(-CONFIG.WINDOW * 2);
    }
    
    console.log(`Sentence history now contains ${sentenceHistory.length} sentences`);
    
    // Check for opener repetition
    const result = openerFlag(sentenceHistory);
    
    if (result.hasRepetition) {
        console.log('🚨 OPENER REPETITION DETECTED!');
        console.log(`Repeated opener: "${result.repeatedStem}" (${result.count} times)`);
        console.log('All opener counts:', result.allCounts);
        
        // Show notification if available
        if (typeof toastr !== 'undefined') {
            toastr.warning(
                `Repeated sentence opener: "${result.repeatedStem}" (${result.count} times)`,
                '⚠️ Repetitive sentence structure detected',
                { timeOut: 5000, closeButton: true }
            );
        }
        
        return result;
    } else {
        console.log('✅ No opener repetition detected');
        console.log('Current opener counts:', result.allCounts);
        return null;
    }
}

// Test function
window.testOpenerDetection = function() {
    console.log('Testing opener detection...');
    
    const testMessage = `
        He walked to the store. He bought some milk. He returned home quickly.
        It was a sunny day. It was perfect for walking. It was exactly what he needed.
        The cat sat quietly. The dog barked loudly. The birds sang sweetly.
    `;
    
    sentenceHistory = [];  // Clear history
    const result = processMessage(testMessage);
    
    console.log('Test result:', result);
    return result;
};

// Manual message processor
window.addMessage = function(text) {
    return processMessage(text);
};

// Clear history function
window.clearHistory = function() {
    sentenceHistory = [];
    console.log('Sentence history cleared');
};

console.log('✅ Sentence-Opener Detector loaded!');
console.log('📝 Test with: testOpenerDetection()');
console.log('➕ Add message: addMessage("your message text")');
console.log('🗑️ Clear history: clearHistory()');
console.log('Function available:', typeof window.testOpenerDetection);