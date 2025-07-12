// index.js  ── SillyTavern extension "repetition-detector"
const MODULE_NAME = 'repetition-detector';

(async () => {
    // Import SillyTavern extension context
    console.log('Repetition detector: Starting initialization');
    
    let extension_settings, saveSettingsDebounced;
    
    try {
        const { getContext } = await import('/scripts/extensions.js');
        const ctx = getContext();
        ({ extension_settings, saveSettingsDebounced } = ctx);
        
        console.log('Repetition detector: Successfully imported SillyTavern context');
    } catch (error) {
        console.error('Repetition detector: Failed to import context:', error);
        return;
    }

    const defaultSettings = {
        enabled: true,
        sensitivity: 2, // 1=low, 2=medium, 3=high
        checkSentenceStructure: true,
        checkOpeningPatterns: true,
        checkParagraphStructure: true,
        checkDialoguePatterns: true
    };

    let messageHistory = [];
    let patternCounts = {};
    let isProcessing = false;
    let lastProcessedMessage = '';
    let lastProcessedTime = 0;

    // Load settings with multiple fallbacks
    function loadSettings() {
        console.log('Repetition detector: Loading settings');
        console.log('Repetition detector: extension_settings available:', !!extension_settings);
        
        // Initialize settings object if it doesn't exist
        if (extension_settings && !extension_settings[MODULE_NAME]) {
            extension_settings[MODULE_NAME] = {};
        } else if (window.extension_settings && !window.extension_settings[MODULE_NAME]) {
            window.extension_settings[MODULE_NAME] = {};
        }
        
        // Try SillyTavern's extension_settings first
        if (extension_settings && extension_settings[MODULE_NAME]) {
            extension_settings[MODULE_NAME] = Object.assign({}, defaultSettings, extension_settings[MODULE_NAME]);
            console.log('Repetition detector: Settings loaded from extension_settings:', extension_settings[MODULE_NAME]);
            return;
        }
        
        // Fallback to window.extension_settings
        if (window.extension_settings && window.extension_settings[MODULE_NAME]) {
            window.extension_settings[MODULE_NAME] = Object.assign({}, defaultSettings, window.extension_settings[MODULE_NAME]);
            console.log('Repetition detector: Settings loaded from window.extension_settings');
            return;
        }
        
        // Fallback to localStorage
        try {
            const stored = localStorage.getItem(`${MODULE_NAME}_settings`);
            if (stored) {
                const parsedSettings = JSON.parse(stored);
                const finalSettings = Object.assign({}, defaultSettings, parsedSettings);
                
                // Store back to extension_settings if available
                if (extension_settings) {
                    extension_settings[MODULE_NAME] = finalSettings;
                } else if (window.extension_settings) {
                    window.extension_settings[MODULE_NAME] = finalSettings;
                }
                
                console.log('Repetition detector: Settings loaded from localStorage:', finalSettings);
                return;
            }
        } catch (error) {
            console.error('Repetition detector: Error loading from localStorage:', error);
        }
        
        // Final fallback - just use defaults
        const finalSettings = Object.assign({}, defaultSettings);
        if (extension_settings) {
            extension_settings[MODULE_NAME] = finalSettings;
        } else if (window.extension_settings) {
            window.extension_settings[MODULE_NAME] = finalSettings;
        }
        
        console.log('Repetition detector: Using default settings:', finalSettings);
    }

    // Save settings
    function saveSettings() {
        saveSettingsDebounced();
    }

    // Helper to get settings from any available source
    function getSettings() {
        if (extension_settings && extension_settings[MODULE_NAME]) {
            return extension_settings[MODULE_NAME];
        } else if (window.extension_settings && window.extension_settings[MODULE_NAME]) {
            return window.extension_settings[MODULE_NAME];
        } else {
            return defaultSettings;
        }
    }

// Analyze sentence structure with more flexible pattern detection
function analyzeSentenceStructure(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return null;
    
    const lengths = sentences.map(sentence => sentence.trim().split(/\s+/).length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variation = Math.max(...lengths) - Math.min(...lengths);
    
    // Use fixed thresholds that work well for most cases
    const shortSentenceMax = 8;
    const longSentenceMin = 25;
    
    // Create a more flexible pattern signature
    const structure = sentences.map(sentence => {
        const wordCount = sentence.trim().split(/\s+/).length;
        if (wordCount <= shortSentenceMax) return 'S';
        if (wordCount >= longSentenceMin) return 'L';
        return 'M';
    });
    
    return {
        pattern: structure.join(''),
        avgLength: Math.round(avgLength),
        variation: variation,
        rhythm: structure.length > 2 ? structure.slice(0, 3).join('') : structure.join(''),
        count: sentences.length
    };
}

// Analyze opening patterns with broader detection
function analyzeOpeningPattern(text) {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    if (lines.length === 0) return null;
    
    const firstLine = lines[0].trim();
    const wordCount = firstLine.split(/\s+/).length;
    const firstWord = firstLine.split(/\s+/)[0].toLowerCase();
    
    // Create a pattern signature based on multiple factors
    let signature = '';
    
    // Length category
    if (wordCount === 1) signature += 'single-';
    else if (wordCount <= 3) signature += 'short-';
    else if (wordCount <= 8) signature += 'medium-';
    else signature += 'long-';
    
    // Punctuation pattern
    if (firstLine.endsWith('?')) signature += 'question';
    else if (firstLine.endsWith('!')) signature += 'exclamation';
    else if (firstLine.startsWith('"') || firstLine.includes('" ')) signature += 'dialogue';
    else if (firstLine.endsWith(',')) signature += 'incomplete';
    else signature += 'statement';
    
    // Common opening word patterns
    const commonOpeners = ['well', 'so', 'ah', 'oh', 'yes', 'no', 'perhaps', 'indeed', 'certainly'];
    const isCommonOpener = commonOpeners.includes(firstWord);
    
    return {
        signature: signature,
        firstWord: firstWord,
        wordCount: wordCount,
        isCommonOpener: isCommonOpener,
        hasDialogue: firstLine.includes('"')
    };
}

// Analyze paragraph structure
function analyzeParagraphStructure(text) {
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
    const structure = paragraphs.map(paragraph => {
        const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 0);
        return sentences.length;
    });
    
    return {
        pattern: structure.join('-'),
        paragraphCount: paragraphs.length,
        sentenceDistribution: structure
    };
}

// Analyze dialogue patterns
function analyzeDialoguePattern(text) {
    const lines = text.split('\n');
    const hasDialogue = lines.some(line => line.includes('"'));
    
    if (!hasDialogue) return null;
    
    const dialogueLines = lines.filter(line => line.includes('"')).length;
    const narrativeLines = lines.filter(line => !line.includes('"') && line.trim().length > 0).length;
    
    return {
        dialogueRatio: dialogueLines / (dialogueLines + narrativeLines),
        pattern: dialogueLines > narrativeLines ? 'dialogue-heavy' : 'narrative-heavy',
        dialogueCount: dialogueLines
    };
}

// Check for repetitive patterns
function checkRepetition(text, isUser = false) {
    const settings = getSettings();
    if (!settings.enabled || isUser || isProcessing) {
        return;
    }
    
    // Prevent duplicate processing of the same message
    const currentTime = Date.now();
    const cleanText = text.trim();
    
    // Skip if we just processed this exact message or if called too frequently
    if (cleanText === lastProcessedMessage || (currentTime - lastProcessedTime) < 1000) {
        return;
    }
    
    // Skip very short messages
    if (cleanText.length < 10) {
        return;
    }
    
    lastProcessedMessage = cleanText;
    lastProcessedTime = currentTime;
    isProcessing = true;
    
    console.log('Repetition detector: Processing message:', cleanText.substring(0, 50) + '...');
    
    // Map sensitivity to practical values
    const sensitivityMap = {
        1: { windowSize: 7, threshold: 4 },  // Low: needs more messages, higher threshold
        2: { windowSize: 5, threshold: 3 },  // Medium: balanced
        3: { windowSize: 4, threshold: 2 }   // High: fewer messages, lower threshold
    };
    
    const { windowSize, threshold } = sensitivityMap[settings.sensitivity] || sensitivityMap[2];
    
    // Add message to history ONLY after passing all filtering
    messageHistory.push(cleanText);  // Use cleanText instead of original text
    if (messageHistory.length > windowSize) {
        messageHistory.shift();
    }
    
    // Only check if we have enough messages
    if (messageHistory.length < 3) {
        console.log('Repetition detector: Not enough messages yet, need 3, have:', messageHistory.length);
        isProcessing = false;
        return;
    }
    
    const recentMessages = messageHistory.slice(-windowSize);
    const detectedPatterns = [];
    
    // Check sentence structure patterns with flexible matching
    if (getSettings().checkSentenceStructure) {
        const structures = recentMessages.map(msg => analyzeSentenceStructure(msg)).filter(s => s);
        
        console.log('DEBUG - Recent messages for analysis:', recentMessages.length);
        recentMessages.forEach((msg, i) => {
            console.log(`DEBUG - Message ${i + 1}:`, msg.substring(0, 80) + '...');
        });
        
        console.log('DEBUG - Sentence structures:', structures.map(s => ({
            pattern: s.pattern,
            rhythm: s.rhythm,
            avgLength: s.avgLength
        })));
        
        // Check for rhythm patterns
        const rhythmPatterns = {};
        const avgLengthPatterns = {};
        
        structures.forEach(struct => {
            if (struct.rhythm) {
                rhythmPatterns[struct.rhythm] = (rhythmPatterns[struct.rhythm] || 0) + 1;
            }
            
            // Group average lengths into ranges for pattern detection
            const lengthRange = Math.floor(struct.avgLength / 5) * 5; // Group by 5s
            avgLengthPatterns[lengthRange] = (avgLengthPatterns[lengthRange] || 0) + 1;
        });
        
        console.log('DEBUG - Rhythm patterns found:', rhythmPatterns);
        console.log('DEBUG - Threshold needed:', threshold);
        
        // Alert on rhythm patterns
        Object.entries(rhythmPatterns).forEach(([pattern, count]) => {
            console.log(`DEBUG - Checking pattern "${pattern}": count=${count}, threshold=${threshold}, length=${pattern.length}`);
            if (count >= threshold && pattern.length > 1) {
                console.log(`DEBUG - TRIGGERING alert for pattern "${pattern}"`);
                detectedPatterns.push({
                    type: 'sentence-rhythm',
                    content: pattern,
                    count: count,
                    description: `Sentence rhythm pattern: ${pattern.split('').join('-')} (${count} times)`
                });
            } else {
                console.log(`DEBUG - NOT triggering: count=${count} < threshold=${threshold} OR length=${pattern.length} <= 1`);
            }
        });
        
        // Alert on consistent sentence lengths
        Object.entries(avgLengthPatterns).forEach(([lengthRange, count]) => {
            if (count >= threshold) {
                detectedPatterns.push({
                    type: 'sentence-length',
                    content: lengthRange,
                    count: count,
                    description: `Consistent sentence length: ~${lengthRange} words (${count} times)`
                });
            }
        });
    }
    
    // Check opening patterns with broader detection
    if (getSettings().checkOpeningPatterns) {
        const openings = recentMessages.map(msg => analyzeOpeningPattern(msg)).filter(o => o);
        const signaturePatterns = {};
        const firstWordPatterns = {};
        
        openings.forEach(opening => {
            // Track signature patterns
            signaturePatterns[opening.signature] = (signaturePatterns[opening.signature] || 0) + 1;
            
            // Track repeated first words (if common opener)
            if (opening.isCommonOpener) {
                firstWordPatterns[opening.firstWord] = (firstWordPatterns[opening.firstWord] || 0) + 1;
            }
        });
        
        // Alert on signature patterns
        Object.entries(signaturePatterns).forEach(([pattern, count]) => {
            if (count >= threshold) {
                detectedPatterns.push({
                    type: 'opening-style',
                    content: pattern,
                    count: count,
                    description: `Opening style pattern: ${pattern.replace(/-/g, ' ')} (${count} times)`
                });
            }
        });
        
        // Alert on repeated opener words
        Object.entries(firstWordPatterns).forEach(([word, count]) => {
            if (count >= threshold) {
                detectedPatterns.push({
                    type: 'opening-word',
                    content: word,
                    count: count,
                    description: `Repeated opening word: "${word}" (${count} times)`
                });
            }
        });
    }
    
    // Check paragraph structure patterns
    if (getSettings().checkParagraphStructure) {
        const paragraphs = recentMessages.map(msg => analyzeParagraphStructure(msg));
        const paragraphPatterns = {};
        
        paragraphs.forEach(para => {
            if (para.pattern && para.paragraphCount > 1) {
                paragraphPatterns[para.pattern] = (paragraphPatterns[para.pattern] || 0) + 1;
            }
        });
        
        Object.entries(paragraphPatterns).forEach(([pattern, count]) => {
            if (count >= threshold) {
                detectedPatterns.push({
                    type: 'paragraph-structure',
                    content: pattern,
                    count: count,
                    description: `Paragraph structure: ${pattern.replace(/-/g, ' → ')} sentences`
                });
            }
        });
    }
    
    // Check dialogue patterns
    if (getSettings().checkDialoguePatterns) {
        const dialogues = recentMessages.map(msg => analyzeDialoguePattern(msg)).filter(d => d);
        const dialoguePatterns = {};
        
        dialogues.forEach(dialogue => {
            dialoguePatterns[dialogue.pattern] = (dialoguePatterns[dialogue.pattern] || 0) + 1;
        });
        
        Object.entries(dialoguePatterns).forEach(([pattern, count]) => {
            if (count >= threshold) {
                detectedPatterns.push({
                    type: 'dialogue-pattern',
                    content: pattern,
                    count: count,
                    description: `Dialogue pattern: ${pattern.replace(/-/g, ' ')}`
                });
            }
        });
    }
    
    // Alert if patterns detected
    if (detectedPatterns.length > 0) {
        showRepetitionAlert(detectedPatterns);
    }
    
    isProcessing = false;
}

// Show repetition alert
function showRepetitionAlert(patterns) {
    const patternList = patterns.map(p => 
        `• ${p.description || p.content} (${p.count} times)`
    ).join('\n');
    
    const alertText = `⚠️ Repetitive AI structure detected:\n\n${patternList}\n\nThe AI may be falling into repetitive response patterns.`;
    
    // Create toast notification
    toastr.warning(alertText, 'AI Structure Repetition', { 
        timeOut: 12000,
        extendedTimeOut: 6000,
        positionClass: 'toast-top-center'
    });
}

// Load template with fallback paths
async function loadTemplate() {
    const templatePaths = [
        '/scripts/extensions/third-party/st-repetition-detector/settings.html',
        '/scripts/extensions/third-party/repetition-detector/settings.html',
        '/scripts/extensions/repetition-detector/settings.html',
        './settings.html'
    ];
    
    for (const path of templatePaths) {
        try {
            console.log(`Trying to load template from: ${path}`);
            const response = await fetch(path);
            if (response.ok) {
                console.log(`Successfully loaded template from: ${path}`);
                return await response.text();
            }
        } catch (error) {
            console.log(`Failed to load template from ${path}:`, error);
        }
    }
    
    throw new Error('Could not load repetition detector template from any path');
}

// Load and setup settings UI
async function createSettingsUI() {
    console.log('Repetition detector: createSettingsUI called');
    
    try {
        console.log('Repetition detector: About to load template');
        // Load HTML template with fallbacks
        const templateContent = await loadTemplate();
        console.log('Repetition detector: Template loaded successfully');
        
        // Retry logic for UI setup
        const trySetupUI = () => {
            console.log('Repetition detector: Trying to setup UI');
            const extensionsContainer = document.getElementById('extensions_settings');
            console.log('Repetition detector: Extensions container found:', !!extensionsContainer);
            
            if (extensionsContainer) {
                // Inject template
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = templateContent;
                extensionsContainer.appendChild(tempDiv.firstElementChild);
                
                console.log('Repetition detector: Template injected into DOM');
                
                // Initialize values from settings
                updateUIFromSettings();
                
                // Setup event listeners
                setupEventListeners();
                
                console.log('Repetition detector UI setup successful');
                return true;
            }
            return false;
        };
        
        // Try to set up UI, with retries if needed
        if (!trySetupUI()) {
            console.log('Repetition detector: Initial UI setup failed, retrying...');
            let retries = 0;
            const maxRetries = 10;
            const retryInterval = setInterval(() => {
                console.log(`Repetition detector: Retry attempt ${retries + 1}/${maxRetries}`);
                if (trySetupUI() || retries >= maxRetries) {
                    clearInterval(retryInterval);
                    if (retries >= maxRetries) {
                        console.error('Failed to find extensions_settings container after retries');
                    }
                }
                retries++;
            }, 100);
        }
        
    } catch (error) {
        console.error('Failed to load repetition detector settings:', error);
    }
}

// Update UI elements with current settings values
function updateUIFromSettings() {
    console.log('Repetition detector: Updating UI from settings');
    
    const settings = getSettings();
    console.log('Repetition detector: Using settings for UI update:', settings);
    
    document.getElementById('rd_enabled').checked = settings.enabled;
    document.getElementById('rd_sensitivity').value = settings.sensitivity;
    document.getElementById('rd_sensitivity_value').textContent = ['Low', 'Medium', 'High'][settings.sensitivity - 1] || 'Medium';
    document.getElementById('rd_check_sentence_structure').checked = settings.checkSentenceStructure;
    document.getElementById('rd_check_opening_patterns').checked = settings.checkOpeningPatterns;
    document.getElementById('rd_check_paragraph_structure').checked = settings.checkParagraphStructure;
    document.getElementById('rd_check_dialogue_patterns').checked = settings.checkDialoguePatterns;
}

// Setup all event listeners
function setupEventListeners() {
    const settings = getSettings();
    
    document.getElementById('rd_enabled').addEventListener('change', function() {
        settings.enabled = this.checked;
        saveSettings();
    });
    
    document.getElementById('rd_sensitivity').addEventListener('input', function() {
        settings.sensitivity = parseInt(this.value);
        document.getElementById('rd_sensitivity_value').textContent = ['Low', 'Medium', 'High'][this.value - 1] || 'Medium';
        saveSettings();
    });
    
    document.getElementById('rd_check_sentence_structure').addEventListener('change', function() {
        settings.checkSentenceStructure = this.checked;
        saveSettings();
    });
    
    document.getElementById('rd_check_opening_patterns').addEventListener('change', function() {
        settings.checkOpeningPatterns = this.checked;
        saveSettings();
    });
    
    document.getElementById('rd_check_paragraph_structure').addEventListener('change', function() {
        settings.checkParagraphStructure = this.checked;
        saveSettings();
    });
    
    document.getElementById('rd_check_dialogue_patterns').addEventListener('change', function() {
        settings.checkDialoguePatterns = this.checked;
        saveSettings();
    });
}

    // Initialize extension - use jQuery ready like the working extension
    jQuery(document).ready(function() {
        console.log('Repetition detector: jQuery ready fired');
        
        // Wait a bit for SillyTavern to fully initialize
        setTimeout(async () => {
            console.log('Repetition detector: Starting delayed initialization');
            
            try {
                loadSettings();
                console.log('Repetition detector: Settings loaded successfully');
                
                console.log('Repetition detector: About to create settings UI');
                await createSettingsUI();
                console.log('Repetition detector: Settings UI creation completed');
            } catch (error) {
                console.error('Repetition detector: Error during initialization:', error);
            }
            
            // Alternative message detection using DOM observation
            console.log('Repetition detector: Setting up DOM-based message detection');
            
            // Function to set up message detection
            const setupMessageDetection = () => {
                // Look for chat container
                const chatContainer = document.querySelector('#chat') || 
                                    document.querySelector('.chat') || 
                                    document.querySelector('[id*="chat"]') ||
                                    document.querySelector('[class*="chat"]');
                
                if (!chatContainer) {
                    console.log('Repetition detector: Chat container not found, will retry...');
                    setTimeout(setupMessageDetection, 1000);
                    return;
                }
                
                console.log('Repetition detector: Found chat container, setting up observer');
                
                // Set up mutation observer to watch for new messages
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'childList') {
                            mutation.addedNodes.forEach((node) => {
                                if (node.nodeType === Node.ELEMENT_NODE) {
                                    // Look for actual message elements (more specific)
                                    const isMessageElement = node.classList?.contains('mes') ||
                                                           node.querySelector?.('.mes') ||
                                                           node.classList?.contains('message') ||
                                                           node.querySelector?.('.message');
                                    
                                    if (isMessageElement) {
                                        // Check if it's NOT a user message
                                        const isUserMessage = node.classList?.contains('user') ||
                                                             node.querySelector?.('.user') ||
                                                             node.classList?.contains('human') ||
                                                             node.querySelector?.('.human');
                                        
                                        // Additional content-based detection for user messages
                                        const messagePreview = (node.textContent || '').trim();
                                        const isUserBasedOnContent = 
                                            messagePreview.includes('"Please give me') ||
                                            messagePreview.includes('1/1') ||
                                            messagePreview.endsWith('?') && messagePreview.length < 100 ||
                                            /^[\"\'].*[\"\']$/.test(messagePreview.substring(0, 200)); // Quoted text
                                        
                                        const finalIsUserMessage = isUserMessage || isUserBasedOnContent;
                                        
                                        console.log('DEBUG - Node classes:', node.className);
                                        console.log('DEBUG - CSS-based user:', isUserMessage);
                                        console.log('DEBUG - Content-based user:', isUserBasedOnContent);
                                        console.log('DEBUG - Final is user:', finalIsUserMessage);
                                        console.log('DEBUG - Message preview:', messagePreview.substring(0, 50));
                                        
                                        if (!finalIsUserMessage) {
                                            const messageText = node.textContent || node.innerText;
                                            const cleanText = messageText ? messageText.trim().replace(/\s+/g, ' ') : '';
                                            
                                            // Extract actual message content by removing metadata pattern
                                            // Patterns: 
                                            // "#0 Bambi July 12, 2025 6:56 PM Thinking... test message"
                                            // "#1 5.3s Assistant July 12, 2025 6:56 PM Thinking....."
                                            const metadataPattern1 = /^#\d+\s+\w+\s+\w+\s+\d{1,2},\s+\d{4}\s+\d{1,2}:\d{2}\s+[AP]M\s+Thinking\.+\s*/;
                                            const metadataPattern2 = /^#\d+\s+\d+\.\d+s\s+\w+\s+\w+\s+\d{1,2},\s+\d{4}\s+\d{1,2}:\d{2}\s+[AP]M\s+Thinking\.+\s*/;
                                            
                                            let actualMessage = cleanText.replace(metadataPattern1, '').trim();
                                            if (actualMessage === cleanText.trim()) {
                                                // First pattern didn't match, try second pattern
                                                actualMessage = cleanText.replace(metadataPattern2, '').trim();
                                            }
                                            
                                            // Skip if it's purely system metadata or too short
                                            const isSystemMessage = /^#\d+\s*$/.test(cleanText) || // Pure "#0", "#1", etc.
                                                                   /^\d+\.\d+s\s*$/.test(cleanText) || // Pure timestamps
                                                                   /^[\d\s\.\#\:]+$/.test(cleanText) || // Only numbers/symbols
                                                                   actualMessage.length < 10 || // Too short after metadata removal
                                                                   !actualMessage || // Nothing left after metadata removal
                                                                   cleanText.match(/^#\d+\s+\d+\.\d+s\s*$/); // Pure "#0 5.0s" pattern
                                            
                                            if (!isSystemMessage && actualMessage.length > 10) {
                                                console.log('Repetition detector: New AI message detected via observer');
                                                console.log('Original:', cleanText.substring(0, 80) + '...');
                                                console.log('Extracted:', actualMessage.substring(0, 80) + '...');
                                                setTimeout(() => checkRepetition(actualMessage, false), 500);
                                            } else {
                                                console.log('Repetition detector: Filtered out system message:', JSON.stringify(cleanText.substring(0, 50)));
                                            }
                                        }
                                    }
                                }
                            });
                        }
                    });
                });
                
                // Start observing chat container
                observer.observe(chatContainer, {
                    childList: true,
                    subtree: true
                });
                
                console.log('AI Structure Repetition Detector extension loaded (DOM-based detection)');
                
                // Polling backup - check for new messages every 3 seconds
                let lastMessageCount = 0;
                let lastMessageText = '';
                setInterval(() => {
                    const messages = chatContainer.querySelectorAll('[class*="mes"]:not([class*="user"])');
                    if (messages.length > lastMessageCount) {
                        const newMessage = messages[messages.length - 1];
                        const messageText = newMessage.textContent || newMessage.innerText;
                        
                        const cleanText = messageText ? messageText.trim().replace(/\s+/g, ' ') : '';
                        
                        // Extract actual message content by removing metadata pattern
                        const metadataPattern1 = /^#\d+\s+\w+\s+\w+\s+\d{1,2},\s+\d{4}\s+\d{1,2}:\d{2}\s+[AP]M\s+Thinking\.+\s*/;
                        const metadataPattern2 = /^#\d+\s+\d+\.\d+s\s+\w+\s+\w+\s+\d{1,2},\s+\d{4}\s+\d{1,2}:\d{2}\s+[AP]M\s+Thinking\.+\s*/;
                        
                        let actualMessage = cleanText.replace(metadataPattern1, '').trim();
                        if (actualMessage === cleanText.trim()) {
                            actualMessage = cleanText.replace(metadataPattern2, '').trim();
                        }
                        
                        // Apply same filtering as observer
                        const isSystemMessage = /^#\d+\s*$/.test(cleanText) || 
                                               /^\d+\.\d+s\s*$/.test(cleanText) || 
                                               /^[\d\s\.\#\:]+$/.test(cleanText) || 
                                               actualMessage.length < 10 || 
                                               !actualMessage ||
                                               cleanText.match(/^#\d+\s+\d+\.\d+s\s*$/);
                        
                        if (!isSystemMessage && actualMessage.length > 10 && actualMessage !== lastMessageText) {
                            console.log('Repetition detector: New message detected via polling');
                            console.log('Extracted message:', actualMessage.substring(0, 100) + '...');
                            checkRepetition(actualMessage, false);
                            lastMessageText = actualMessage;
                        }
                        lastMessageCount = messages.length;
                    }
                }, 3000);
            };
            
            setupMessageDetection();
        }, 1000); // Wait 1 second for SillyTavern to initialize
    });

})();