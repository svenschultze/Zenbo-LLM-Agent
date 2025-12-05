import { ref } from 'vue';
import OpenAI from 'openai';
import { useVAD } from './useVAD';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const apiBaseUrl = import.meta.env.VITE_OPENAI_API_BASE_URL;
const apiModel = import.meta.env.VITE_SPEECH_MODEL;

const openaiClient = apiKey
  ? new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
      baseURL: apiBaseUrl,
    })
  : null;

export function useTranscription(options = {}) {
  const { autoStart = false } = options;

  const isTranscribing = ref(false);
  const error = ref(null);

  const vad = useVAD({ autoStart });
  const {
    isListening,
    isMuted,
    muteMic,
    unmuteMic,
    start,
    stop,
    onSpeechEnd,
  } = vad;

  const transcriptionHandlers = new Set();

  const notifyTranscription = async (text) => {
    for (const handler of transcriptionHandlers) {
      try {
        await handler(text);
      } catch (e) {
        console.error('useTranscription onTranscription handler error:', e);
      }
    }
  };

  onSpeechEnd(async ({ blob }) => {
    // If the mic is muted (e.g. while TTS/robot are speaking), ignore this segment entirely
    // so it never goes through Whisper or back into the agent.
    if (isMuted.value) return;

    if (!openaiClient) {
      console.warn('VITE_OPENAI_API_KEY is not set; cannot transcribe audio.');
      return;
    }

    isTranscribing.value = true;
    error.value = null;

    try {
      const file = new File([blob], 'speech.wav', { type: 'audio/wav' });
      const transcription = await openaiClient.audio.transcriptions.create({
        file,
        model: apiModel,
      });

      const text = transcription?.text || '';
      if (!text) return;

      await notifyTranscription(text);
    } catch (e) {
      console.error('Whisper transcription failed:', e);
      error.value = e;
    } finally {
      isTranscribing.value = false;
    }
  });

  const onTranscriptionEvent = (handler) => {
    if (typeof handler !== 'function') return () => {};
    transcriptionHandlers.add(handler);
    return () => transcriptionHandlers.delete(handler);
  };

  return {
    isListening,
    isTranscribing,
    error,
    start,
    stop,
    muteMic,
    unmuteMic,
    onTranscription: onTranscriptionEvent,
  };
}
