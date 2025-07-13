// index.js  ── SillyTavern extension "repetition-detector"
const MODULE_NAME = 'repetition-detector';

(async () => {
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
        // Initialize settings object if it doesn't exist
        if (extension_settings && !extension_settings[MODULE_NAME]) {
            extension_settings[MODULE_NAME] = {};
        } else if (window.extension_settings && !window.extension_settings[MODULE_NAME]) {
            window.extension_settings[MODULE_NAME] = {};
        }
        
        // Try SillyTavern's extension_settings first
        if (extension_settings && extension_settings[MODULE_NAME]) {
            extension_settings[MODULE_NAME] = Object.assign({}, defaultSettings, extension_settings[MODULE_NAME]);
            return;
        }
        
        // Fallback to window.extension_settings
        if (window.extension_settings && window.extension_settings[MODULE_NAME]) {
            window.extension_settings[MODULE_NAME] = Object.assign({}, defaultSettings, window.extension_settings[MODULE_NAME]);
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
    }

    // Save settings
    function saveSettings() {
        if (saveSettingsDebounced) {
            saveSettingsDebounced();
        }
    }

    // Helper to get settings from any available source
    function getSettings() {
        if (extension_settings && extension_settings[MODULE_NAME]) {
            return extension_settings[MODULE_NAME];
        }
        if (window.extension_settings && window.extension_settings[MODULE_NAME]) {
            return window.extension_settings[MODULE_NAME];
        }
        
        // Fallback to localStorage
        try {
            const stored = localStorage.getItem(`${MODULE_NAME}_settings`);
            if (stored) {
                return Object.assign({}, defaultSettings, JSON.parse(stored));
            }
        } catch (error) {
            // Ignore localStorage errors
        }
        
        return Object.assign({}, defaultSettings);
    }

    // Analyze sentence structure to identify patterns
    function analyzeSentenceStructure(text) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        if (sentences.length === 0) return null;
        
        const lengths = sentences.map(s => {
            const words = s.trim().split(/\s+/).length;
            if (words <= 4) return 'S';      // Short
            if (words <= 15) return 'M';     // Medium  
            return 'L';                      // Long
        });
        
        return {
            pattern: lengths.join('-'),
            count: sentences.length,
            avgLength: sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / sentences.length
        };
    }

    // Analyze opening patterns to detect repeated sentence starters
    function analyzeOpeningPatterns(text) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
        if (sentences.length === 0) return null;
        
        const firstWords = sentences.map(s => {
            const trimmed = s.trim().toLowerCase();
            const firstWord = trimmed.split(/\s+/)[0];
            return firstWord.replace(/[^a-z]/g, '');
        }).filter(w => w.length > 0);
        
        if (firstWords.length === 0) return null;
        
        // Find most common first word
        const wordCounts = {};
        firstWords.forEach(word => {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
        });
        
        const sortedWords = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]);
        const [mostCommon, count] = sortedWords[0];
        
        return {
            firstWord: mostCommon,
            repetitions: count,
            totalSentences: sentences.length,
            isPattern: count >= 2 && count / sentences.length >= 0.5
        };
    }

    // Analyze paragraph structure patterns
    function analyzeParagraphStructure(text) {
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        if (paragraphs.length < 2) return null;
        
        const sentenceCounts = paragraphs.map(p => {
            return p.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
        });
        
        return {
            pattern: sentenceCounts.join(' → '),
            paragraphCount: paragraphs.length,
            distribution: sentenceCounts
        };
    }

    // Analyze dialogue vs narrative patterns
    function analyzeDialoguePatterns(text) {
        const lines = text.split('\n').filter(line => line.trim().length > 0);
        if (lines.length === 0) return null;
        
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
        // Skip empty or very short text immediately
        if (!text || text.trim().length < 10) {
            return;
        }
        
        const cleanText = text.trim();
        
        // Skip UI elements before any processing
        if (cleanText.includes('Manual Check') ||
            cleanText.includes('Analyzing') ||
            cleanText.includes('Thinking') ||
            cleanText.includes('recent AI messages') ||
            cleanText === 'Thinking...' ||
            /^Manual Check.*Analyzing/.test(cleanText)) {
            return;
        }
        
        const settings = getSettings();
        
        if (!settings.enabled || isUser || isProcessing) {
            return;
        }
        
        // Prevent duplicate processing of the same message
        const currentTime = Date.now();
        
        // Skip if we just processed this exact message or if called too frequently
        if (cleanText === lastProcessedMessage || (currentTime - lastProcessedTime) < 1000) {
            return;
        }
        
        // Skip SillyTavern UI elements and toast notifications
        const isUIElement = cleanText.includes('⚠️ Repetitive AI structure detected') ||
            cleanText.includes('API Connections') ||
            cleanText.includes('Chat History') ||
            cleanText.includes('Group Controls') ||
            cleanText.includes('SillyTavern 1.') ||
            cleanText.includes('Upload sprite pack') ||
            cleanText.includes('Vectorize All') ||
            cleanText.includes('Processed 0% of messages') ||
            cleanText.includes('Manual Check') ||
            cleanText.includes('Analyzing') ||
            cleanText.includes('recent AI messages') ||
            cleanText.includes('No AI messages found to analyze') ||
            cleanText === 'Thinking...' ||
            cleanText.startsWith('Thinking') ||
            /^Manual Check.*Analyzing/.test(cleanText) ||
            cleanText.length < 20;
            
        if (isUIElement) {
            return;
        }
        
        // Skip very short or empty messages
        if (cleanText.length < 10) {
            return;
        }
        
        lastProcessedMessage = cleanText;
        lastProcessedTime = currentTime;
        isProcessing = true;
        
        // Map sensitivity to practical values
        const sensitivityMap = {
            1: { windowSize: 7, threshold: 4 },  // Low: needs more messages, higher threshold
            2: { windowSize: 5, threshold: 3 },  // Medium: balanced
            3: { windowSize: 4, threshold: 2 }   // High: fewer messages, lower threshold
        };
        
        const { windowSize, threshold } = sensitivityMap[settings.sensitivity] || sensitivityMap[2];
        
        // Add message to history ONLY after passing all filtering
        messageHistory.push(cleanText);
        
        if (messageHistory.length > windowSize) {
            messageHistory.shift();
        }
        
        // Only check if we have enough messages
        if (messageHistory.length < 3) {
            isProcessing = false;
            return;
        }
        
        const recentMessages = messageHistory.slice(-windowSize);
        const detectedPatterns = [];
        
        // Check sentence structure patterns with flexible matching
        if (getSettings().checkSentenceStructure) {
            const structures = recentMessages.map(msg => analyzeSentenceStructure(msg)).filter(s => s);
            
            if (structures.length >= 3) {
                // Check for repeated patterns
                const patternCounts = {};
                structures.forEach(struct => {
                    const key = struct.pattern;
                    patternCounts[key] = (patternCounts[key] || 0) + 1;
                });
                
                Object.entries(patternCounts).forEach(([pattern, count]) => {
                    if (count >= threshold) {
                        detectedPatterns.push(`Sentence rhythm pattern: ${pattern} (${count} times)`);
                    }
                });
                
                // Check for consistent sentence length
                const avgLengths = structures.map(s => s.avgLength);
                const lengthVariance = avgLengths.reduce((sum, len, _, arr) => {
                    const avg = arr.reduce((s, l) => s + l, 0) / arr.length;
                    return sum + Math.pow(len - avg, 2);
                }, 0) / avgLengths.length;
                
                if (lengthVariance < 2 && avgLengths.length >= 3) {
                    const avgLength = Math.round(avgLengths[0]);
                    detectedPatterns.push(`Consistent sentence length: ~${avgLength} words (${avgLengths.length} times)`);
                }
            }
        }
        
        // Check opening patterns
        if (getSettings().checkOpeningPatterns) {
            const openings = recentMessages.map(msg => analyzeOpeningPatterns(msg)).filter(o => o && o.isPattern);
            
            if (openings.length >= 2) {
                const wordCounts = {};
                openings.forEach(opening => {
                    const word = opening.firstWord;
                    wordCounts[word] = (wordCounts[word] || 0) + 1;
                });
                
                Object.entries(wordCounts).forEach(([word, count]) => {
                    if (count >= threshold) {
                        detectedPatterns.push(`Repeated opening word: '${word}' (${count} times)`);
                    }
                });
            }
        }
        
        // Check paragraph structure patterns
        if (getSettings().checkParagraphStructure) {
            const paragraphStructures = recentMessages.map(msg => analyzeParagraphStructure(msg)).filter(p => p);
            
            if (paragraphStructures.length >= 2) {
                const structureCounts = {};
                paragraphStructures.forEach(struct => {
                    const key = struct.pattern;
                    structureCounts[key] = (structureCounts[key] || 0) + 1;
                });
                
                Object.entries(structureCounts).forEach(([pattern, count]) => {
                    if (count >= threshold) {
                        detectedPatterns.push(`Paragraph structure: ${pattern} (${count} times)`);
                    }
                });
            }
        }
        
        // Check dialogue patterns
        if (getSettings().checkDialoguePatterns) {
            const dialogueAnalyses = recentMessages.map(msg => analyzeDialoguePatterns(msg)).filter(d => d);
            
            if (dialogueAnalyses.length >= 2) {
                const patternCounts = {};
                dialogueAnalyses.forEach(analysis => {
                    const key = analysis.pattern;
                    patternCounts[key] = (patternCounts[key] || 0) + 1;
                });
                
                Object.entries(patternCounts).forEach(([pattern, count]) => {
                    if (count >= threshold) {
                        detectedPatterns.push(`Dialogue pattern: ${pattern} (${count} times)`);
                    }
                });
            }
        }
        
        // Show alerts for detected patterns
        if (detectedPatterns.length > 0) {
            const alertMessage = detectedPatterns.join('\n• ');
            console.log('Repetition detected:', alertMessage);
            
            if (typeof toastr !== 'undefined') {
                toastr.warning('• ' + alertMessage, '⚠️ Repetitive AI structure detected', {
                    timeOut: 8000,
                    extendedTimeOut: 4000,
                    closeButton: true,
                    progressBar: true,
                    escapeHtml: false
                });
            }
        }
        
        isProcessing = false;
    }

    // Load HTML template for settings UI
    async function loadTemplate(templatePath) {
        try {
            console.log('Trying to load template from:', templatePath);
            const response = await fetch(templatePath);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const html = await response.text();
            console.log('Successfully loaded template from:', templatePath);
            return html;
        } catch (error) {
            console.error('Failed to load template from:', templatePath, error);
            throw error;
        }
    }

    // Create settings UI
    async function createSettingsUI() {
        try {
            // Load the template
            const templateHtml = await loadTemplate('/scripts/extensions/third-party/st-repetition-detector/settings.html');
            
            // Find the extensions container
            const extensionsContainer = document.getElementById('extensions_settings2');
            if (!extensionsContainer) {
                throw new Error('Extensions container not found');
            }
            
            // Create a temporary div to parse the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = templateHtml;
            
            // Append the settings UI to the extensions container
            extensionsContainer.appendChild(tempDiv.firstElementChild);
            
            // Initialize values from settings
            updateUIFromSettings();
            
            // Setup event listeners
            setupEventListeners();
            
            return true;
        } catch (error) {
            console.error('Error creating settings UI:', error);
            return false;
        }
    }

    // Update UI elements from current settings
    function updateUIFromSettings() {
        const settings = getSettings();
        
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
        
        // Manual check button
        document.getElementById('rd_check_now').addEventListener('click', function() {
            // Simple manual check that just processes recent AI messages
            console.log('Manual check requested');
            toastr.info('Analyzing recent messages for patterns...', 'Manual Check', {
                timeOut: 3000
            });
            
            // Clear history and re-process messages naturally
            messageHistory = [];
            
            // Find messages using simpler approach
            const messages = document.querySelectorAll('.mes, .mes_text');
            const aiMessages = Array.from(messages).filter(el => {
                const text = el.textContent || '';
                return text.length > 50 && !text.includes('Bambi') && !text.includes('Please give me');
            });
            
            // Process last few messages
            const recentMessages = aiMessages.slice(-5);
            recentMessages.forEach((messageEl, index) => {
                const messageText = messageEl.textContent || '';
                setTimeout(() => {
                    checkRepetition(messageText.trim(), false);
                }, index * 100);
            });
        });
    }

    // Initialize extension
    jQuery(document).ready(function() {
        setTimeout(async () => {
            try {
                loadSettings();
                console.log('DEBUG - About to call createSettingsUI');
                await createSettingsUI();
                console.log('DEBUG - createSettingsUI completed');
                
                // Create test function for console use
                console.log('DEBUG - About to create test function');
                window.testRepetitionDetector = function(testMessage) {
                    console.log('MANUAL TEST - Processing:', testMessage);
                    checkRepetition(testMessage, false);
                };
                console.log('DEBUG - Test function created successfully');
                
                console.log('AI Structure Repetition Detector extension loaded');
                console.log('Test function available: testRepetitionDetector("your test message")');
                
                // Set up message detection
                const setupMessageDetection = () => {
                    const chatContainer = document.querySelector('#chat') || document.querySelector('.mes_block') || document.body;
                    
                    const observer = new MutationObserver((mutations) => {
                        mutations.forEach((mutation) => {
                            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                                mutation.addedNodes.forEach((node) => {
                                    if (node.nodeType === Node.ELEMENT_NODE) {
                                        const isMessage = node.matches && (
                                            node.matches('.mes') ||
                                            node.matches('.mes_text') ||
                                            node.matches('[class*="mes"]') ||
                                            node.matches('.message') ||
                                            node.matches('[class*="message"]') ||
                                            node.querySelector('.mes') ||
                                            node.querySelector('.mes_text') ||
                                            node.querySelector('[class*="mes"]')
                                        );
                                        
                                        if (isMessage) {
                                            const messageText = node.textContent || node.innerText || '';
                                            const cleanText = messageText.trim();
                                            
                                            // Filter out user messages and system content
                                            const isUserMessage = cleanText.includes('Bambi') || 
                                                                cleanText.includes('Please give me') ||
                                                                cleanText.includes('1/1') ||
                                                                cleanText.match(/^\w+ \d{1,2}, \d{4} \d{1,2}:\d{2} [AP]M$/);
                                            
                                            if (!isUserMessage && cleanText.length > 50) {
                                                setTimeout(() => checkRepetition(cleanText, false), 200);
                                            }
                                        }
                                    }
                                });
                            }
                        });
                    });
                    
                    observer.observe(chatContainer, {
                        childList: true,
                        subtree: true,
                        attributes: false
                    });
                };
                
                setupMessageDetection();
            } catch (error) {
                console.error('Repetition detector: Error during initialization:', error);
                console.error('Repetition detector: Error stack:', error.stack);
            }
        }, 1000);
    });
})();