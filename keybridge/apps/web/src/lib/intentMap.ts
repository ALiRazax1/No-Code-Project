import { Intent, IntentOption, ProviderId } from './types';

/**
 * Maps each intent to the preferred provider for v1.
 * If an intent has multiple capable providers, we pick the most common one.
 */
export const INTENT_TO_PROVIDER: Record<Intent, ProviderId> = {
  chat: 'openai',
  image: 'openai',
  speech: 'elevenlabs',
  embeddings: 'openai',
};

/**
 * User-facing intent options shown on the Intent Picker screen.
 * Labels are written in plain language -- no provider names visible here.
 */
export const INTENT_OPTIONS: IntentOption[] = [
  {
    id: 'chat',
    label: 'Chat with AI',
    description: 'Ask questions, get answers, write and brainstorm with a language model.',
    icon: '💬',
  },
  {
    id: 'image',
    label: 'Generate images',
    description: 'Turn text descriptions into photos, illustrations, or artwork.',
    icon: '🖼️',
  },
  {
    id: 'speech',
    label: 'Generate speech',
    description: 'Convert written text into natural-sounding audio voices.',
    icon: '🔊',
  },
  {
    id: 'embeddings',
    label: 'Search & recall',
    description: 'Power semantic search, recommendations, or memory for your app.',
    icon: '🔍',
  },
];

/**
 * One-sentence reason shown in the guidance panel explaining why this
 * provider is needed for the chosen intent.
 */
export const PROVIDER_REASON: Record<ProviderId, Partial<Record<Intent, string>>> = {
  openai: {
    chat: "OpenAI's models power most AI chat tools available today.",
    image: "OpenAI's DALL-E model generates images directly from your descriptions.",
    embeddings: "OpenAI's embeddings API turns text into vectors for search and memory.",
  },
  anthropic: {
    chat: "Anthropic's Claude models are built for safe, helpful conversation.",
  },
  google_gemini: {
    chat: 'Google Gemini is a powerful multimodal model available through Google AI Studio.',
    image: 'Gemini can understand and generate images alongside text.',
  },
  elevenlabs: {
    speech: 'ElevenLabs produces some of the most natural-sounding AI voices available.',
  },
  openrouter: {
    chat: 'OpenRouter lets you access many AI models through a single key.',
    image: 'OpenRouter connects you to multiple image generation providers.',
    embeddings: 'OpenRouter routes your embedding requests to the best available model.',
  },
};
