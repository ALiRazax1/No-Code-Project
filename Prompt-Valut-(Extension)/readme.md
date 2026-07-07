# Prompt Vault Extension

A modern browser extension for saving, organizing, searching, and reusing AI prompts. Built entirely using **Google Gemini** through prompt-based development, the project demonstrates how a fully functional Chrome extension can be created without manually writing the application's code.

## Installation

Since the extension is not published on a browser extension store, it must be loaded manually in **Developer Mode**.

1. Open your Chromium-based browser and navigate to:

   ```text
   chrome://extensions/
   ```

2. Enable **Developer mode**.

3. Click **Load unpacked**.

4. Select the **Prompt Vault** project directory.

5. The extension will be installed and ready to use.

If you want to use AI-powered automatic prompt titles, open the extension's **Settings** page and add your **Gemini API key**. Otherwise, you can continue using the extension by manually entering prompt titles.


## Features

* Modern premium Glassmorphism user interface
* Create, organize, and manage custom prompt categories
* Save prompts securely using Chrome's local storage
* AI-powered prompt title generation and summarization with Gemini
* Secure Gemini API key management
* Manual title fallback when no API key is configured
* One-click prompt copy without opening the prompt
* Beautiful Markdown preview with syntax formatting
* Instant search and category filtering
* Export the entire prompt library as a single Markdown document
* Save highlighted text directly from any webpage using the browser context menu

## How It Works

Prompts are stored locally using Chrome's extension storage, ensuring your data remains isolated within the browser.

If a Gemini API key is configured, the extension automatically generates concise, meaningful titles for newly saved prompts. Without an API key, prompts can still be saved by manually providing a title.

The extension also integrates with the browser's context menu, allowing you to highlight text on any webpage and save it directly to your prompt collection.

## Current Limitations

* Currently supports **Gemini AI** only for automatic title generation.
* Prompts are stored locally and are not synchronized across devices.
* No cloud backup or account system.
* No prompt sharing or collaboration features.

## Future Ideas

* Support multiple AI providers for prompt generation.
* Add cloud synchronization and user accounts.
* Introduce prompt tagging, favorites, and collections.
* Support importing prompt libraries from Markdown or JSON.
* Add prompt version history and editing improvements.
* Enhance search, filtering, and organization features.
* Expand customization options for themes and layouts.

## Acknowledgements

This project was created entirely using **Google Gemini** through prompt engineering without manually writing the application's code. It explores the potential of AI-assisted development for building practical browser extensions with little to no manual coding.
