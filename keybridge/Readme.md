# KeyBridge

An open-source web application that helps users securely connect AI provider API keys to applications without exposing those keys in plaintext. Built entirely using **Claude AI** through prompt-based development, KeyBridge demonstrates how a secure API key management service can be created with little to no manual coding.

> **Note:** This project is a proof of concept and educational implementation. While it follows modern security practices, it is not yet production-ready.

## Features

* Guided setup that recommends the appropriate AI provider based on user intent
* Supports multiple AI providers:

  * OpenAI
  * Anthropic
  * Google Gemini
  * ElevenLabs
  * OpenRouter
* Live API key validation with clear, human-friendly feedback
* Secure AES-256-GCM encryption before storing API keys
* Choose between encrypted cloud storage or local browser storage
* Security Dashboard for managing connected providers
* Permanent key deletion
* Monorepo architecture with reusable security and validation packages
* Centralized provider validation and error translation
* Responsive modern interface built with Next.js and Tailwind CSS

## How It Works

KeyBridge acts as a secure bridge between users and AI-powered applications.

1. Select what you want to use an AI provider for.
2. KeyBridge recommends the most suitable provider.
3. Paste your API key.
4. The application performs a live validation request.
5. Choose whether to store the key locally or securely in the cloud.
6. Your API key is encrypted before storage.
7. Applications can later retrieve the key securely through a server-side API without ever exposing it to the browser.

The application is designed so that plaintext API keys are never intentionally logged or stored in the database.

## Tech Stack

| Layer         | Technology                |
| ------------- | ------------------------- |
| Frontend      | Next.js 16 + Tailwind CSS |
| Backend       | Next.js API Routes        |
| Database      | Neon PostgreSQL           |
| Encryption    | AES-256-GCM               |
| Local Storage | IndexedDB                 |
| Language      | TypeScript                |
| Testing       | Jest & Vitest             |

## Current Limitations

* Authentication currently uses a mock user and has not yet been integrated with a real authentication provider.
* Local browser storage is not yet encrypted.
* Refresh and production deployment workflows still require additional work.
* Duplicate provider detection in the UI has not yet been implemented.
* Documentation and trust pages are still being completed.

## Future Ideas

* Integrate real authentication providers such as Clerk, NextAuth, or custom JWT authentication.
* Encrypt locally stored API keys using the Web Crypto API.
* Improve provider management with key rotation, duplicate detection, and audit logs.
* Enhance the dashboard with provider branding, relative timestamps, and richer user feedback.
* Strengthen production readiness with automated migrations, rate limiting, monitoring, and deployment improvements.
* Expand documentation with security guides, self-hosting instructions, and trust documentation.

## Acknowledgements

This project was created entirely using **Claude AI** through prompt engineering without manually writing the application's code. It explores AI-assisted software development while demonstrating modern API key management, encryption, and secure architecture principles.
