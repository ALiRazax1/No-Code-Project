# Prompt to Speech

A web application that converts text into speech using **Claude AI** through prompt-based development. The entire project was created using AI-generated code without manually writing the application's code.

## Features

* Convert any text into speech
* Uses the browser's built-in Text-to-Speech voice by default
* Supports **ElevenLabs API** for higher-quality AI voices
* Text highlights and glows in sync with the spoken audio
* Real-time waveform visualizer
* Word-by-word and sentence highlighting modes
* Volume control slider
* Regenerate button for generating fresh speech without creating a new session
* Generation history panel
* Download generated subtitles as an `.srt` file
* MP3 download support is already integrated

## How It Works

By default, the application uses your browser's built-in Text-to-Speech engine, so it works without any external API.

For premium AI voices, you can configure an **ElevenLabs API key** in the project's environment (`.env`) file. Once configured, the application automatically switches to ElevenLabs for speech generation.

> **Note:** Users cannot currently add or manage API keys through the application's interface.

## Features in Detail

### Generation History

Every successful speech generation is automatically saved to a history panel (up to the latest 20 generations).

Each history entry includes:

* Voice used
* Prompt preview
* Word count
* Audio duration
* Relative timestamp (e.g., *Just now*, *3 minutes ago*)

The most recent generation is highlighted with a **Latest** badge.

Selecting a history item instantly restores the prompt, selected voice, and generated audio without making another API request.

The history panel can be closed by:

* Clicking outside the panel
* Clicking the close button
* Pressing the **Escape** key

---

### Real-Time Waveform Visualizer

The application includes a dynamic waveform visualizer that adapts to the current audio source.

#### ElevenLabs Audio

When using ElevenLabs audio, the visualizer analyzes the actual audio using the Web Audio API.

Features include:

* Live frequency analysis
* Smooth bar animations
* Natural decay between frames
* Persistent audio context for better performance
* **Live** indicator while real audio is playing

#### Browser Text-to-Speech

Since browser Speech Synthesis cannot be analyzed by the Web Audio API, the application generates a realistic animated waveform that mimics speech using procedural animation.

A **Synth** badge indicates that the visualization is simulated rather than based on live audio.

When playback stops, the waveform smoothly returns to its idle state instead of abruptly resetting.

---

### Sentence Mode

In addition to word-by-word highlighting, the application includes **Sentence Mode**.

When enabled:

* The entire current sentence is highlighted instead of only the current word.
* A softer glow effect provides a more natural reading experience.
* Auto-scrolling continues to follow playback seamlessly.
* Switching between word and sentence mode only changes the visual presentation and does not affect playback.

## Current Limitations

* API keys cannot be added from the UI.
* ElevenLabs API must be configured manually through the `.env` file.
* The **Download MP3** button is present but remains disabled while using the browser's default voice because no audio file is generated.
* Once ElevenLabs is configured, the MP3 download button automatically becomes available without requiring any code changes.
* Generated voices are not currently saved.

## Future Ideas

* Allow users to add and manage API keys from the application
* Save generated voices and speech history across sessions
* Improve and expand download options
* Support multiple speech providers
* Add voice customization options such as speed, pitch, and emotion
* Improve overall UI and user experience

## Acknowledgements

This project was created using **Claude AI** through prompt engineering to explore AI-assisted application development with little to no manual coding.
