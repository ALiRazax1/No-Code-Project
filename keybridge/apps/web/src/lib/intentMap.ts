// 
// -----------------------------------

import { Intent, IntentOption, ProviderId } from './types';

// ─── Role / Quiz types ──────────────────────────────────────────────────────

export type QuizRole = 'self' | 'dev' | 'team';

export interface QuizGoalOption {
  label: string;
  sub: string | null;
  intents: Intent[];
  rec: ProviderId | null;
  banner: string | null;
}

export interface QuizRoleConfig {
  question: string;
  opts: QuizGoalOption[];
}

// ─── Intent → Provider mappings ─────────────────────────────────────────────

/** Legacy 1:1 map — kept for backward compat (e.g. GuidancePanel fallback) */
export const INTENT_TO_PROVIDER: Record<Intent, ProviderId> = {
  chat:       'openai',
  image:      'openai',
  speech:     'elevenlabs',
  embeddings: 'openai',
};

/** All capable providers per intent */
export const INTENT_TO_PROVIDERS: Record<Intent, ProviderId[]> = {
  chat:       ['openai', 'anthropic', 'google_gemini', 'openrouter'],
  image:      ['openai', 'google_gemini'],
  speech:     ['elevenlabs'],
  embeddings: ['openai', 'openrouter'],
};

// ─── Visual tokens ───────────────────────────────────────────────────────────

export const INTENT_COLORS: Record<Intent, {
  iconBg: string;
  iconText: string;
  badgeBg: string;
  badgeText: string;
  cta: string;
  borderHover: string;
}> = {
  chat:       { iconBg: '#E1F5EE', iconText: '#0F6E56', badgeBg: '#E1F5EE', badgeText: '#085041', cta: '#1D9E75', borderHover: '#5DCAA5' },
  image:      { iconBg: '#EEEDFE', iconText: '#534AB7', badgeBg: '#EEEDFE', badgeText: '#26215C', cta: '#7F77DD', borderHover: '#AFA9EC' },
  speech:     { iconBg: '#FAEEDA', iconText: '#854F0B', badgeBg: '#FAEEDA', badgeText: '#412402', cta: '#BA7517', borderHover: '#EF9F27' },
  embeddings: { iconBg: '#E6F1FB', iconText: '#185FA5', badgeBg: '#E6F1FB', badgeText: '#042C53', cta: '#378ADD', borderHover: '#85B7EB' },
};

export const PROVIDER_META: Record<ProviderId, { label: string; model: string; color: string }> = {
  openai:        { label: 'OpenAI',        model: 'GPT-4o',         color: '#10a37f' },
  anthropic:     { label: 'Anthropic',     model: 'Claude',         color: '#C97B4B' },
  google_gemini: { label: 'Google Gemini', model: 'Gemini 1.5',     color: '#4285F4' },
  elevenlabs:    { label: 'ElevenLabs',    model: 'Natural voices', color: '#F5A623' },
  openrouter:    { label: 'OpenRouter',    model: 'Multi-model',    color: '#9E6BDE' },
};

// ─── Intent options (card grid) ──────────────────────────────────────────────

export const INTENT_OPTIONS: IntentOption[] = [
  { id: 'chat',       label: 'Chat with AI',    description: 'Ask questions, get answers, write and brainstorm with a language model.', icon: '💬' },
  { id: 'image',      label: 'Generate images', description: 'Turn text descriptions into photos, illustrations, or artwork.',           icon: '🖼️' },
  { id: 'speech',     label: 'Generate speech', description: 'Convert written text into natural-sounding audio voices.',                 icon: '🔊' },
  { id: 'embeddings', label: 'Search & recall', description: 'Power semantic search, recommendations, or memory for your app.',         icon: '🔍' },
];

// ─── Two-step quiz config ────────────────────────────────────────────────────

export const ROLE_OPTIONS: { id: QuizRole; label: string; sub: string; icon: string }[] = [
  { id: 'self', label: 'Just for me',       sub: 'Personal use, no coding needed',      icon: '🙋' },
  { id: 'dev',  label: 'My app or product', sub: "I'm building something for users",    icon: '⚙️' },
  { id: 'team', label: 'My team or company',sub: 'Shared workspace or internal tool',   icon: '👥' },
];

export const ROLE_LABELS: Record<QuizRole, string> = {
  self: 'Just for me',
  dev:  'My app',
  team: 'My team',
};

export const QUIZ_CONFIG: Record<QuizRole, QuizRoleConfig> = {
  self: {
    question: 'What do you want to do?',
    opts: [
      { label: 'Chat or get writing help',    sub: 'Ask questions, summarise, brainstorm',   intents: ['chat'],                                  rec: 'openai',      banner: 'Claude or GPT-4o are great for everyday chat.' },
      { label: 'Make images or artwork',       sub: 'Generate visuals from a description',    intents: ['image'],                                 rec: 'openai',      banner: 'DALL-E 3 is the easiest to get started with.' },
      { label: 'Create voiceovers or audio',   sub: 'Turn text into realistic speech',        intents: ['speech'],                                rec: 'elevenlabs',  banner: 'ElevenLabs has the most natural-sounding voices.' },
      { label: 'Show me everything',           sub: null,                                     intents: ['chat','image','speech','embeddings'],     rec: null,          banner: null },
    ],
  },
  dev: {
    question: 'What does your app need?',
    opts: [
      { label: 'AI chat or responses',         sub: 'LLM API calls from your backend',        intents: ['chat'],                                  rec: 'openrouter',  banner: 'OpenRouter gives you one key for many models — ideal for apps.' },
      { label: 'Image generation',             sub: 'Generate images on demand',              intents: ['image'],                                 rec: 'openai',      banner: 'DALL-E 3 has the most straightforward API for developers.' },
      { label: 'Text-to-speech output',        sub: 'Audio generation for your users',        intents: ['speech'],                                rec: 'elevenlabs',  banner: 'ElevenLabs has the best developer API for voice.' },
      { label: 'Semantic search or memory',    sub: 'Embeddings for search and retrieval',    intents: ['embeddings'],                            rec: 'openai',      banner: "OpenAI's embeddings are the industry standard for search." },
      { label: 'Multiple of these',            sub: null,                                     intents: ['chat','image','speech','embeddings'],     rec: null,          banner: null },
    ],
  },
  team: {
    question: 'What does your team need?',
    opts: [
      { label: 'AI writing assistant',         sub: 'Chat, drafting and summarisation',       intents: ['chat'],                                  rec: 'anthropic',   banner: 'Claude is great for team writing — longer context, safer outputs.' },
      { label: 'Image creation',               sub: 'Generate visuals for content',           intents: ['image'],                                 rec: 'openai',      banner: 'DALL-E 3 via OpenAI is the easiest for non-technical teams.' },
      { label: 'Voice and audio content',      sub: 'Realistic narration and voiceovers',     intents: ['speech'],                                rec: 'elevenlabs',  banner: 'ElevenLabs makes voice cloning and narration simple.' },
      { label: 'Knowledge search',             sub: 'Search across documents and data',       intents: ['embeddings'],                            rec: 'openai',      banner: 'OpenAI embeddings work well for internal knowledge bases.' },
    ],
  },
};

// ─── Provider reasons (used in GuidancePanel) ───────────────────────────────

export const PROVIDER_REASON: Record<ProviderId, Partial<Record<Intent, string>>> = {
  openai: {
    chat:       "OpenAI's models power most AI chat tools available today.",
    image:      "OpenAI's DALL-E model generates images directly from your descriptions.",
    embeddings: "OpenAI's embeddings API turns text into vectors for search and memory.",
  },
  anthropic: {
    chat: "Anthropic's Claude models are built for safe, helpful conversation.",
  },
  google_gemini: {
    chat:  'Google Gemini is a powerful multimodal model available through Google AI Studio.',
    image: 'Gemini can understand and generate images alongside text.',
  },
  elevenlabs: {
    speech: 'ElevenLabs produces some of the most natural-sounding AI voices available.',
  },
  openrouter: {
    chat:       'OpenRouter lets you access many AI models through a single key.',
    image:      'OpenRouter connects you to multiple image generation providers.',
    embeddings: 'OpenRouter routes your embedding requests to the best available model.',
  },
};


