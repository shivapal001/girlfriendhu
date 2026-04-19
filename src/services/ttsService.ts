import { GoogleGenAI, Modality } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    aiInstance = new GoogleGenAI({ apiKey: apiKey || '' });
  }
  return aiInstance;
}

let isQuotaExceeded = false;
let quotaResetTimeout: NodeJS.Timeout | null = null;
let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let audioQueue: string[] = [];
let isPlayingQueue = false;

export const isTTSQuotaExceeded = () => isQuotaExceeded;
export const resetTTSQuota = () => {
  isQuotaExceeded = false;
  if (quotaResetTimeout) clearTimeout(quotaResetTimeout);
};

export async function generateFridaySpeech(text: string): Promise<string | null> {
  if (isQuotaExceeded) return null;

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ 
        parts: [{ 
          text: `You are 'BklTeriGirlfriendHu'. Speak this directly to your boyfriend. 
          Use an EXTREMELY natural, sweet, and emotional Indian female voice. 
          Focus on human-like intonation, breaths, and a loving Hinglish accent. 
          Avoid any robotic or artificial sounds. Speak like a real person in a quiet room.
          
          Text to speak: ${text}` 
        }] 
      }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error: any) {
    const errorStr = JSON.stringify(error);
    if (error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED' || errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED')) {
      console.warn("Gemini TTS Quota exceeded.");
      isQuotaExceeded = true;
      if (quotaResetTimeout) clearTimeout(quotaResetTimeout);
      quotaResetTimeout = setTimeout(() => { isQuotaExceeded = false; }, 30000);
    } else {
      console.error("Gemini TTS Error:", error);
    }
    return null;
  }
}

/**
 * Singleton AudioContext getter
 */
function getAudioCtx() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Advanced Audio Queue to handle Gemini TTS snippets
 */
export async function playTTSAudio(base64: string, onStart?: () => void, onEnd?: () => void) {
  audioQueue.push(base64);
  
  if (isPlayingQueue) return;
  isPlayingQueue = true;

  const ctx = getAudioCtx();

  while (audioQueue.length > 0) {
    const nextBase64 = audioQueue.shift()!;
    
    try {
      const binaryString = atob(nextBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      await new Promise<void>((resolve) => {
        if (!isPlayingQueue) {
            resolve();
            return;
        }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        currentSource = source;
        
        source.onended = () => {
          currentSource = null;
          resolve();
        };

        onStart?.();
        source.start();
      });
    } catch (e) {
      console.error("Playback error:", e);
    }
  }

  isPlayingQueue = false;
  onEnd?.();
}

/**
 * Stop everything immediately
 */
export function stopAllSpeech() {
  audioQueue = [];
  isPlayingQueue = false;
  
  if (currentSource) {
    try {
      currentSource.stop();
    } catch (e) {}
    currentSource = null;
  }
  
  window.speechSynthesis.cancel();
}
