# Prompt to Speech

A web application that converts text into speech using **Claude AI** through prompt-based development. The entire project was created using AI-generated code without manually writing the application's code.

## Features

* Convert text into natural-sounding speech
* Supports multiple TTS providers:

  * Browser SpeechSynthesis
  * ElevenLabs
  * OpenAI Text-to-Speech
* Multi-language support (15+ languages)
* Automatic voice and model selection
* Real-time word-by-word subtitle synchronization
* Optional sentence highlighting mode
* Interactive subtitles with auto-scroll and click-to-seek
* Real-time waveform visualization for both generated audio and browser speech
* Custom audio player with playback controls
* Volume, mute, and playback speed controls
* Audio trimming and background music mixing
* Download MP3 (supported providers), SRT subtitles, and JSON exports
* Batch speech generation with ZIP export
* Session-based generation history
* Share generations via URL or clipboard
* Built-in API Explorer with request logging
* SSML editor and pronunciation dictionary
* Comprehensive settings panel for providers, API keys, voices, playback, and appearance
* Responsive design optimized for desktop and mobile
* Browser SpeechSynthesis fallback when external APIs are unavailable
* Error recovery with retry support
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

* Browser SpeechSynthesis does not generate downloadable audio files, so **MP3 downloads are only available when using providers that return audio data** (such as ElevenLabs or OpenAI TTS).
* Generated voices and history are currently stored only for the active session and are not permanently saved.
* Some advanced features, such as parts of the language settings integration and ZIP export implementation, are still being refined.

---

## Future Ideas

* Add cloud sync with user accounts and persistent generation history.
* Expand support for additional TTS providers, voice cloning, and advanced voice customization.
* Enhance editing and export capabilities with richer SSML tools, more export formats, and improved batch processing.
* Increase personalization through themes, accessibility improvements, and overall UI/UX refinements.
* Continue optimizing performance, stability, and developer experience as the project evolves.

---

### 📋 Future Ideas

* Allow users to add and manage API keys directly from the UI
* Persist generation history across browser sessions
* Save generated voices locally or in the cloud
* Additional speech providers
* More export formats
* Voice cloning support
* Advanced SSML tools
* Cloud synchronization
* User accounts
* Theme customization
* Improved accessibility
* Performance optimizations

---

## Acknowledgements

This project was created using **Claude AI** through prompt engineering to explore AI-assisted application development with little to no manual coding.
