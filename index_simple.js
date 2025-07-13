// Simple test version
console.log('SIMPLE TEST - Extension loading');

// Just create the test function immediately
window.testRepetitionDetector = function(testMessage) {
    console.log('SIMPLE TEST - Processing:', testMessage);
    console.log('SIMPLE TEST - Message length:', testMessage.length);
    return 'Function works!';
};

console.log('SIMPLE TEST - Function created:', typeof window.testRepetitionDetector);