export interface PuterVoice {
  id: string;
  name: string;
  provider: 'aws-polly' | 'openai' | 'elevenlabs' | 'xai' | 'gemini' | 'speechify';
  voiceId: string;
  model?: string;
  engine?: string;
  lang: string;
  description: string;
  badge: string;
}

export const PUTER_VOICES: PuterVoice[] = [
  // 1. Google Gemini TTS (Natural Language Styled Voices)
  {
    id: 'gemini-puck',
    name: 'Puck (Gemini)',
    provider: 'gemini',
    voiceId: 'Puck',
    model: 'gemini-2.5-flash-preview-tts',
    lang: 'en-US',
    description: 'Upbeat, friendly, and highly expressive literary delivery',
    badge: 'Gemini AI',
  },
  {
    id: 'gemini-charon',
    name: 'Charon (Gemini)',
    provider: 'gemini',
    voiceId: 'Charon',
    model: 'gemini-2.5-flash-preview-tts',
    lang: 'en-US',
    description: 'Deep, resonant, and calm narration for novels',
    badge: 'Gemini AI',
  },
  {
    id: 'gemini-kore',
    name: 'Kore (Gemini)',
    provider: 'gemini',
    voiceId: 'Kore',
    model: 'gemini-2.5-flash-preview-tts',
    lang: 'en-US',
    description: 'Warm, clear, and soothing storytelling voice',
    badge: 'Gemini AI',
  },
  {
    id: 'gemini-fenrir',
    name: 'Fenrir (Gemini)',
    provider: 'gemini',
    voiceId: 'Fenrir',
    model: 'gemini-2.5-flash-preview-tts',
    lang: 'en-US',
    description: 'Authoritative, dramatic, and immersive narration',
    badge: 'Gemini AI',
  },
  {
    id: 'gemini-aoede',
    name: 'Aoede (Gemini)',
    provider: 'gemini',
    voiceId: 'Aoede',
    model: 'gemini-2.5-flash-preview-tts',
    lang: 'en-US',
    description: 'Melodic, poetic, and nuanced prose reader',
    badge: 'Gemini AI',
  },

  // 2. xAI (Grok) Expressive TTS
  {
    id: 'xai-eve',
    name: 'Eve (xAI Grok)',
    provider: 'xai',
    voiceId: 'eve',
    lang: 'en-US',
    description: 'Energetic, dynamic, and engaging modern voice',
    badge: 'xAI Grok',
  },
  {
    id: 'xai-ara',
    name: 'Ara (xAI Grok)',
    provider: 'xai',
    voiceId: 'ara',
    lang: 'en-US',
    description: 'Warm, gentle, and comforting storytelling tone',
    badge: 'xAI Grok',
  },
  {
    id: 'xai-rex',
    name: 'Rex (xAI Grok)',
    provider: 'xai',
    voiceId: 'rex',
    lang: 'en-US',
    description: 'Confident, clear, and steady narrator',
    badge: 'xAI Grok',
  },
  {
    id: 'xai-sal',
    name: 'Sal (xAI Grok)',
    provider: 'xai',
    voiceId: 'sal',
    lang: 'en-US',
    description: 'Smooth, rhythmic, and articulate narrator',
    badge: 'xAI Grok',
  },
  {
    id: 'xai-leo',
    name: 'Leo (xAI Grok)',
    provider: 'xai',
    voiceId: 'leo',
    lang: 'en-US',
    description: 'Authoritative and distinguished classic voice',
    badge: 'xAI Grok',
  },

  // 3. Speechify Simba TTS
  {
    id: 'speechify-geffen',
    name: 'Geffen (Speechify)',
    provider: 'speechify',
    voiceId: 'geffen_32',
    model: 'simba-3.2',
    lang: 'en-US',
    description: 'Premier audiobook voice with natural pacing and rhythm',
    badge: 'Speechify',
  },
  {
    id: 'speechify-dominic',
    name: 'Dominic (Speechify)',
    provider: 'speechify',
    voiceId: 'dominic_32',
    model: 'simba-3.2',
    lang: 'en-US',
    description: 'Rich, cinematic voice suited for fantasy and epic tales',
    badge: 'Speechify',
  },
  {
    id: 'speechify-harper',
    name: 'Harper (Speechify)',
    provider: 'speechify',
    voiceId: 'harper_32',
    model: 'simba-3.2',
    lang: 'en-US',
    description: 'Conversational and relatable literary narrative',
    badge: 'Speechify',
  },
  {
    id: 'speechify-hugh',
    name: 'Hugh (Speechify)',
    provider: 'speechify',
    voiceId: 'hugh_32',
    model: 'simba-3.2',
    lang: 'en-US',
    description: 'Classic British narrative tone with timeless warmth',
    badge: 'Speechify',
  },
  {
    id: 'speechify-imogen',
    name: 'Imogen (Speechify)',
    provider: 'speechify',
    voiceId: 'imogen_32',
    model: 'simba-3.2',
    lang: 'en-US',
    description: 'Sophisticated, expressive female narrator',
    badge: 'Speechify',
  },

  // 4. OpenAI Studio Models
  {
    id: 'openai-alloy',
    name: 'Alloy (OpenAI)',
    provider: 'openai',
    voiceId: 'alloy',
    model: 'tts-1',
    lang: 'en-US',
    description: 'Versatile, neutral, and balanced storytelling voice',
    badge: 'OpenAI Studio',
  },
  {
    id: 'openai-fable',
    name: 'Fable (OpenAI)',
    provider: 'openai',
    voiceId: 'fable',
    model: 'tts-1',
    lang: 'en-GB',
    description: 'Expressive British accent, ideal for novels and fiction',
    badge: 'OpenAI Fiction',
  },
  {
    id: 'openai-onyx',
    name: 'Onyx (OpenAI)',
    provider: 'openai',
    voiceId: 'onyx',
    model: 'tts-1',
    lang: 'en-US',
    description: 'Deep, rich, and authoritative narrative tone',
    badge: 'OpenAI Deep',
  },
  {
    id: 'openai-nova',
    name: 'Nova (OpenAI)',
    provider: 'openai',
    voiceId: 'nova',
    model: 'tts-1',
    lang: 'en-US',
    description: 'Warm, dynamic, and engaging audio reader',
    badge: 'OpenAI Warm',
  },
  {
    id: 'openai-shimmer',
    name: 'Shimmer (OpenAI)',
    provider: 'openai',
    voiceId: 'shimmer',
    model: 'tts-1',
    lang: 'en-US',
    description: 'Bright, emotional, and clear resonance',
    badge: 'OpenAI Bright',
  },
  {
    id: 'openai-echo',
    name: 'Echo (OpenAI)',
    provider: 'openai',
    voiceId: 'echo',
    model: 'tts-1',
    lang: 'en-US',
    description: 'Warm, relaxed, and conversational narrative',
    badge: 'OpenAI Studio',
  },

  // 5. AWS Polly Neural & Long-Form Audio (Default Engine in Puter)
  {
    id: 'aws-ruth',
    name: 'Ruth (Long-form)',
    provider: 'aws-polly',
    voiceId: 'Ruth',
    engine: 'long-form',
    lang: 'en-US',
    description: 'Engineered specifically for long-form literary audiobook reading',
    badge: 'AWS Literary',
  },
  {
    id: 'aws-joanna',
    name: 'Joanna (Neural)',
    provider: 'aws-polly',
    voiceId: 'Joanna',
    engine: 'neural',
    lang: 'en-US',
    description: 'Natural American English with pristine clarity',
    badge: 'AWS Neural',
  },
  {
    id: 'aws-matthew',
    name: 'Matthew (Neural)',
    provider: 'aws-polly',
    voiceId: 'Matthew',
    engine: 'neural',
    lang: 'en-US',
    description: 'Rich American baritone for audiobooks',
    badge: 'AWS Neural',
  },
  {
    id: 'aws-amy',
    name: 'Amy (Neural British)',
    provider: 'aws-polly',
    voiceId: 'Amy',
    engine: 'neural',
    lang: 'en-GB',
    description: 'Sophisticated British female narrative',
    badge: 'AWS British',
  },
  {
    id: 'aws-arthur',
    name: 'Arthur (Neural British)',
    provider: 'aws-polly',
    voiceId: 'Arthur',
    engine: 'neural',
    lang: 'en-GB',
    description: 'Classic British gentleman narration',
    badge: 'AWS British',
  },
  {
    id: 'aws-olivia',
    name: 'Olivia (Neural Australian)',
    provider: 'aws-polly',
    voiceId: 'Olivia',
    engine: 'neural',
    lang: 'en-AU',
    description: 'Melodic Australian English accent',
    badge: 'AWS Neural',
  },

  // 6. ElevenLabs Expressive Models
  {
    id: 'eleven-rachel',
    name: 'Rachel (ElevenLabs)',
    provider: 'elevenlabs',
    voiceId: 'Rachel',
    lang: 'en-US',
    description: 'Hyper-realistic calm literary narration',
    badge: 'ElevenLabs',
  },
  {
    id: 'eleven-adam',
    name: 'Adam (ElevenLabs)',
    provider: 'elevenlabs',
    voiceId: 'Adam',
    lang: 'en-US',
    description: 'Deep expressive audiobook voice',
    badge: 'ElevenLabs',
  },
];

declare global {
  interface Window {
    puter?: {
      ai: {
        txt2speech: (
          text: string,
          options?:
            | string
            | {
                provider?: string;
                model?: string;
                voice?: string;
                engine?: string;
                language?: string;
                instructions?: string;
                output_format?: string;
                test_mode?: boolean;
              }
        ) => Promise<HTMLAudioElement>;
      };
      auth?: {
        isSignedIn: () => boolean;
        signIn: () => Promise<any>;
        signOut: () => Promise<void>;
        getUser: () => Promise<any>;
      };
    };
  }
}

export function isPuterAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean(window.puter?.ai?.txt2speech);
}

export function isPuterSignedIn(): boolean {
  try {
    return Boolean(window.puter?.auth?.isSignedIn?.());
  } catch {
    return false;
  }
}

export async function signInToPuter(): Promise<any> {
  if (typeof window !== 'undefined' && window.puter?.auth?.signIn) {
    return await window.puter.auth.signIn();
  }
  throw new Error('Puter authentication is not available in this environment');
}

export async function signOutFromPuter(): Promise<void> {
  if (typeof window !== 'undefined' && window.puter?.auth?.signOut) {
    await window.puter.auth.signOut();
  }
}

export interface PuterError extends Error {
  status?: number;
  isAuthError?: boolean;
}

export async function speakWithPuter(
  text: string,
  voice: PuterVoice,
  rate: number = 1.0
): Promise<HTMLAudioElement> {
  if (!isPuterAvailable()) {
    const err: PuterError = new Error('Puter.js library is loading or unavailable');
    throw err;
  }

  const safeText = text.slice(0, 2400).trim();
  if (!safeText) {
    throw new Error('No text to speak');
  }

  // Construct options matching exact Puter.js documentation
  const options: Record<string, any> = {};

  if (voice.provider === 'aws-polly') {
    // AWS Polly is default in Puter; provider is omitted, voice & engine are specified
    options.voice = voice.voiceId;
    options.engine = voice.engine || 'neural';
    options.language = voice.lang || 'en-US';
  } else if (voice.provider === 'gemini') {
    options.provider = 'gemini';
    options.model = voice.model || 'gemini-2.5-flash-preview-tts';
    options.voice = voice.voiceId;
    options.instructions = 'Speak clearly in a natural and friendly audiobook style.';
  } else if (voice.provider === 'xai') {
    options.provider = 'xai';
    options.voice = voice.voiceId;
    options.output_format = 'mp3';
  } else if (voice.provider === 'speechify') {
    options.provider = 'speechify';
    options.model = voice.model || 'simba-3.2';
    options.voice = voice.voiceId;
  } else if (voice.provider === 'openai') {
    options.provider = 'openai';
    options.model = voice.model || 'tts-1';
    options.voice = voice.voiceId;
  } else if (voice.provider === 'elevenlabs') {
    options.provider = 'elevenlabs';
    options.voice = voice.voiceId;
  } else {
    // Simple fallback
    options.voice = voice.voiceId;
  }

  try {
    const audio = await window.puter!.ai.txt2speech(safeText, options);
    if (audio && rate !== 1.0) {
      try {
        audio.playbackRate = rate;
      } catch {
        // ignore playbackRate error if unsupported by element
      }
    }
    return audio;
  } catch (rawError: any) {
    const status = rawError?.status || rawError?.statusCode;
    const isAuth =
      status === 401 ||
      rawError?.message?.includes('Unauthorized') ||
      rawError?.message?.includes('401');

    const err: PuterError = new Error(
      isAuth
        ? 'Puter authentication required or session expired (401 Unauthorized).'
        : `Puter TTS failed: ${rawError?.message || 'Unknown error'}`
    );
    err.status = status;
    err.isAuthError = isAuth;
    throw err;
  }
}
