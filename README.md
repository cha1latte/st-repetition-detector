# AI Structure Repetition Detector

A SillyTavern extension that detects when AI responses fall into repetitive structural patterns and alerts users.

## Features

- **Real-time Detection**: Monitors AI message structure as they arrive
- **Structure Pattern Types**: Detects repetitive sentence structures, opening patterns, paragraph layouts, and dialogue patterns
- **Configurable Thresholds**: Adjust detection sensitivity and window size
- **Visual Alerts**: Toast notifications when structural patterns are detected
- **Slash Command**: Manual pattern checking with `/check-repetition`

## Installation

1. Copy the `repetition-detector` folder to your SillyTavern extensions directory:
   ```
   SillyTavern/data/default-user/extensions/repetition-detector/
   ```

2. Restart SillyTavern

3. Enable the extension in the Extensions panel

## Configuration

Access settings through the Extensions panel:

- **Enable/Disable**: Toggle the detection system
- **Window Size**: How many recent messages to analyze (3-10)
- **Alert Threshold**: How many repetitions trigger an alert (2-5)
- **Sentence Length Settings**: Define what counts as short/long sentences
- **Detection Types**: Choose what structural patterns to detect

## How It Works

The extension analyzes the last N messages (configurable) and looks for:

1. **Sentence Structure Patterns**: Repetitive patterns like "short-long-short" or "long-short-long"
2. **Opening Line Patterns**: Repetitive ways of starting responses (single words, questions, dialogue, etc.)
3. **Paragraph Structure**: Repetitive paragraph layouts (number of sentences per paragraph)
4. **Dialogue Patterns**: Repetitive dialogue vs narrative ratios

## Examples of Detected Patterns

- **Single Word Openings**: "Yes." "No." "Perhaps." repeated across messages
- **Sentence Structure**: Short-long-short pattern repeated: "Brief statement. This is a longer explanatory sentence that provides more detail. Another short one."
- **Paragraph Structure**: Always using 2-3-1 sentence paragraphs
- **Dialogue Heavy**: Always responding with mostly dialogue vs narrative

## Usage Tips

- Start with default settings and adjust based on your AI model's tendencies
- Use "Clear Message History" when switching characters or conversations
- The `/check-repetition` command can manually check the last message
- Adjust sentence length thresholds based on your preferred response style

## License

AGPLv3