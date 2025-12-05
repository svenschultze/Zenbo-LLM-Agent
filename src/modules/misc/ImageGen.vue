<template>
  <tool
    name="generate_image"
    description="Generate an image from a text prompt using OpenAI and display it on the page"
    @call="handleGenerateImage"
    return
  >
    <prop
      name="prompt"
      type="string"
      description="Beschreibung des Bildes, das erzeugt werden soll"
      required
    />
    <prop
      name="size"
      type="string"
      description="Bildgröße: z. B. '512x512', '1024x1024' (Standard: '512x512')"
    />
  </tool>

  <teleport to="body">
    <div v-if="visible" class="image-gen-overlay" @click="close">
      <div class="image-gen-image-wrapper">
        <img :src="imageUrl" alt="Generiertes Bild" />
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref } from 'vue';
import OpenAI from 'openai';
import { useRobotAPI } from '@/composables/useRobotAPI';

function sendReturn(event, payload) {
  event.target.dispatchEvent(new CustomEvent('return', { detail: payload }));
}

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const apiBaseUrl = import.meta.env.VITE_OPENAI_API_BASE_URL;
const apiImageModel = import.meta.env.VITE_IMAGE_MODEL;

const openaiClient = apiKey
  ? new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
      baseURL: apiBaseUrl,
    })
  : null;

const visible = ref(false);
const imageUrl = ref('');
const lastPrompt = ref('');
const loading = ref(false);
const error = ref(null);

function close() {
  useRobotAPI().unlockExpression();
  useRobotAPI().setExpression('DEFAULT');
  visible.value = false;
}

async function handleGenerateImage(event) {
  const { prompt, size } = event.detail || {};
  const trimmedPrompt =
    typeof prompt === 'string' ? prompt.trim() : '';

  if (!trimmedPrompt) {
    sendReturn(event, {
      ok: false,
      text:
        'Bitte gib eine Beschreibung für das Bild an, z. B. "Ein Roboter, der Kaffee trinkt".',
      error_code: 'MISSING_PROMPT',
    });
    return;
  }

  if (!openaiClient) {
    console.warn('VITE_OPENAI_API_KEY is not set; cannot use OpenAI image generation.');
    sendReturn(event, {
      ok: false,
      text:
        'Die Bildgenerierung ist derzeit nicht konfiguriert (es fehlt ein OpenAI API-Schlüssel).',
      error_code: 'MISSING_OPENAI_KEY',
    });
    return;
  }

  const imgSize =
    typeof size === 'string' && size.trim()
      ? size.trim()
      : '512x512';

  loading.value = true;
  error.value = null;
  visible.value = true;
  lastPrompt.value = trimmedPrompt;
  imageUrl.value = '';

  try {
    const response = await openaiClient.images.generate({
      model: apiImageModel,
      prompt: trimmedPrompt,
      size: imgSize,
      n: 1,
      response_format: 'base64_json',
    });

    console.log('OpenAI image generation response:', response);
    const url = response?.data?.[0]?.b64_json
      ? `data:image/png;base64,${response.data[0].b64_json}`
      : null;

    if (!url) {
      console.error('OpenAI image response did not contain a URL:', response);
      loading.value = false;
      error.value = new Error('NO_IMAGE_URL');
      sendReturn(event, {
        ok: false,
        text:
          'Entschuldigung, das Bild konnte nicht erzeugt werden. Bitte versuche es mit einer anderen Beschreibung erneut.',
        error_code: 'NO_IMAGE',
      });
      return;
    }

    imageUrl.value = url;
    loading.value = false;
    error.value = null;

    useRobotAPI().lockExpression('HIDEFACE');

    sendReturn(event, {
      ok: true,
      text: 'Das Bild wurde erfolgreich erzeugt und auf der Seite angezeigt.',
      data: {
        prompt: trimmedPrompt,
        size: imgSize,
      },
    });
  } catch (err) {
    console.error('Failed to generate image with OpenAI:', err);
    loading.value = false;
    error.value = err;
    sendReturn(event, {
      ok: false,
      text:
        'Entschuldigung, beim Erzeugen des Bildes ist ein Fehler aufgetreten. Bitte versuche es später erneut.',
      error_code: 'IMAGE_GENERATION_ERROR',
    });
  }
}
</script>

<style scoped>
.image-gen-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.image-gen-container {
  background: #111827;
  border-radius: 0.5rem;
  padding: 1rem;
  max-width: 90vw;
  max-height: 90vh;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  position: relative;
  color: #e5e7eb;
}

.image-gen-close {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  border: none;
  background: transparent;
  color: #9ca3af;
  font-size: 1.25rem;
  cursor: pointer;
}

.image-gen-status {
  min-width: 200px;
  text-align: center;
}

.image-gen-error {
  color: #fecaca;
}

.image-gen-image-wrapper {
  max-width: 100vw;
  max-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.image-gen-image-wrapper img {
  max-width: 100%;
  max-height: 100vh;
  border-radius: 0.5rem;
  object-fit: contain;
}

.image-gen-caption {
  font-size: 0.875rem;
  color: #9ca3af;
}
</style>

