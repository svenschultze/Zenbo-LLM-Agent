import { ref } from 'vue';
import OpenAI from 'openai';
import { useRobotAPI } from './useRobotAPI';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const apiBaseUrl = import.meta.env.VITE_OPENAI_API_BASE_URL;
const apiModel = import.meta.env.VITE_TTS_MODEL;
const apiVoice = import.meta.env.VITE_TTS_VOICE;

const openaiClient = apiKey
  ? new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
      baseURL: apiBaseUrl,
    })
  : null;

export function useTTS(options = {}) {
  const {
    model = apiModel,
    voice = apiVoice,
    format = 'mp3',
  } = options;

  const isSpeaking = ref(false);
  const error = ref(null);

  const startHandlers = new Set();
  const endHandlers = new Set();

  let currentAudio = null;
  let currentUrl = null;

  const cleanupAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    if (currentUrl && typeof URL !== 'undefined') {
      URL.revokeObjectURL(currentUrl);
      currentUrl = null;
    }
  };

  const speak = async (text) => {
    if (!text) return;

    if (!openaiClient) {
      console.warn('VITE_OPENAI_API_KEY is not set; cannot use OpenAI TTS.');
      return;
    }

    cleanupAudio();
    isSpeaking.value = true;
    error.value = null;

    for (const handler of startHandlers) {
      try {
        handler(text);
      } catch (e) {
        console.error('useTTS onSpeakStart handler error:', e);
      }
    }

    try {
      const response = await openaiClient.audio.speech.create({
        model,
        voice,
        input: text,
        format,
      });

      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });

      const url = URL.createObjectURL(blob);
      currentUrl = url;

      const audio = new Audio(url);
      currentAudio = audio;

      audio.onended = () => {
        isSpeaking.value = false;
        cleanupAudio();
        for (const handler of endHandlers) {
          try {
            handler(text);
          } catch (e) {
            console.error('useTTS onSpeakEnd handler error:', e);
          }
        }
      };

      audio.onerror = (e) => {
        console.error('OpenAI TTS audio playback error:', e);
        error.value = e;
        isSpeaking.value = false;
        cleanupAudio();
      };

      useRobotAPI().setExpression('DEFAULT');
      useRobotAPI().startSpeakAnimation();
      await audio.play();
    } catch (e) {
      console.error('OpenAI TTS error:', e);
      error.value = e;
      isSpeaking.value = false;
      cleanupAudio();
    }
  };

  const stop = () => {
    cleanupAudio();
    isSpeaking.value = false;
  };

  const onSpeakStart = (handler) => {
    if (typeof handler !== 'function') return () => {};
    startHandlers.add(handler);
    return () => startHandlers.delete(handler);
  };

  const onSpeakEnd = (handler) => {
    if (typeof handler !== 'function') return () => {};
    endHandlers.add(handler);
    return () => endHandlers.delete(handler);
  };

  return {
    isSpeaking,
    error,
    speak,
    stop,
    onSpeakStart,
    onSpeakEnd,
  };
}

