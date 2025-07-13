// Minimal AI Repetition Detector for SillyTavern
(async () => {
    console.log('Repetition Detector: Starting fresh...');
    
    let messageHistory = [];
    
    // Simple pattern detection function
    function detectPatterns(messages) {
        if (messages.length < 3) return [];
        
        const patterns = [];
        
        // Check for repeated opening words
        const openings = messages.map(msg => {
            const firstWord = msg.trim().split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
            return firstWord;
        });
        
        const wordCounts = {};
        openings.forEach(word => {
            if (word.length > 2) {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
            }
        });
        
        Object.entries(wordCounts).forEach(([word, count]) => {
            if (count >= 3) {
                patterns.push(`Repeated opening word: "${word}" (${count} times)`);
            }
        });
        
        // Check for sentence structure patterns
        const structures = messages.map(msg => {
            const sentences = msg.split(/[.!?]+/).filter(s => s.trim().length > 5);
            return sentences.map(s => {
                const words = s.trim().split(/\s+/).length;
                if (words <= 5) return 'S';
                if (words <= 15) return 'M';
                return 'L';
            }).join('-');
        });
        
        const structCounts = {};
        structures.forEach(struct => {
            if (struct.length > 0) {
                structCounts[struct] = (structCounts[struct] || 0) + 1;
            }
        });
        
        Object.entries(structCounts).forEach(([struct, count]) => {
            if (count >= 3) {
                patterns.push(`Sentence structure: ${struct} (${count} times)`);
            }
        });
        
        return patterns;
    }
    
    // Process a new message
    function processMessage(text) {
        if (!text || text.length < 20) return;
        
        // Skip UI elements
        if (text.includes('Bambi') || text.includes('Please give me') || 
            text.includes('Manual Check') || text.includes('Analyzing')) {
            return;
        }
        
        messageHistory.push(text.trim());
        
        // Keep only last 5 messages
        if (messageHistory.length > 5) {
            messageHistory.shift();
        }
        
        console.log(`Repetition Detector: Now tracking ${messageHistory.length} messages`);
        
        // Check for patterns
        const patterns = detectPatterns(messageHistory);
        
        if (patterns.length > 0) {
            console.log('🚨 PATTERNS DETECTED:', patterns);
            
            // Show toast notification
            if (typeof toastr !== 'undefined') {
                toastr.warning(patterns.join('\n• '), '⚠️ Repetitive AI patterns detected', {
                    timeOut: 6000,
                    closeButton: true
                });
            }
        }
    }
    
    // Create test function
    window.testRepetition = function() {
        console.log('Testing pattern detection...');
        
        const testMessages = [
            "Well, this is a short response followed by a much longer detailed explanation, then brief.",
            "Well, here's a quick answer then an extensive comprehensive analysis, finishing short.",
            "Well, I'll give a brief reply followed by thorough detailed examination, ending concisely."
        ];
        
        messageHistory = [];
        testMessages.forEach((msg, i) => {
            console.log(`Adding test message ${i + 1}:`, msg.substring(0, 50) + '...');
            processMessage(msg);
        });
        
        return 'Test completed - check console and notifications';
    };
    
    // Create manual message processor
    window.addMessage = function(text) {
        console.log('Processing manual message:', text.substring(0, 50) + '...');
        processMessage(text);
        return 'Message processed';
    };
    
    console.log('✅ Repetition Detector loaded!');
    console.log('📝 Test with: testRepetition()');
    console.log('➕ Add message: addMessage("your message text")');
    
})();