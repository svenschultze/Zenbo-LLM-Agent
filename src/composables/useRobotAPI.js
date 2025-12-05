import { ref, onMounted } from 'vue';

// Singleton expression lock shared across all useRobotAPI consumers
const expressionLocked = ref(false);

export function useRobotAPI(options = {}) {
  const {
    baseUrl = 'http://localhost:8787',
    autoCheckHealth = true,
  } = options;

  const isHealthy = ref(false);
  const healthLoading = ref(false);
  const healthError = ref(null);

  const apiBase = baseUrl.replace(/\/+$/, '');

  const checkHealth = async () => {
    if (typeof fetch === 'undefined') return;

    healthLoading.value = true;
    healthError.value = null;

    try {
      const res = await fetch(`${apiBase}/health`);
      isHealthy.value = res.ok;
      if (!res.ok) {
        healthError.value = new Error(`Health check failed with status ${res.status}`);
      }
    } catch (e) {
      console.warn('Robot health check failed:', e);
      isHealthy.value = false;
      healthError.value = e;
    } finally {
      healthLoading.value = false;
    }
  };

  const postForm = async (path, data) => {
    if (typeof fetch === 'undefined') return;

    const body = new URLSearchParams();
    Object.entries(data || {}).forEach(([key, value]) => {
      body.set(key, String(value));
    });

    const res = await fetch(`${apiBase}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!res.ok) {
      throw new Error(`Robot API ${path} failed with status ${res.status}`);
    }
  };

  const getJson = async (path) => {
    if (typeof fetch === 'undefined') return null;

    const res = await fetch(`${apiBase}${path}`);

    if (!res.ok) {
      throw new Error(`Robot API ${path} failed with status ${res.status}`);
    }

    try {
      return await res.json();
    } catch {
      return null;
    }
  };

  const speak = async (text) => {
    if (!text) return;
    await postForm('/api/dialog/speak', { text });
  };

  const startSpeakAnimation = async () => {
    if (expressionLocked.value) return;
    await postForm('/api/dialog/start_speak_animation', {});
  };

  const stopSpeak = async () => {
    await postForm('/api/dialog/stop_speak', {});
  };

  const setVoiceTrigger = async (enable) => {
    if (typeof enable === 'undefined') return;
    await postForm('/api/dialog/voice_trigger', { enable });
  };

  const setHeadAction = async (enable) => {
    if (typeof enable === 'undefined') return;
    await postForm('/api/dialog/head_action', { enable });
  };

  const setExpression = async (expression) => {
    if (!expression) return;
    if (expressionLocked.value) return;
    await postForm('/api/face/expression', { expression });
  };

  const lockExpression = async (expression) => {
    expressionLocked.value = true;
    if (!expression) return;
    console.log('Locking expression to', expression);
    await postForm('/api/face/expression', { expression });
  }

  const unlockExpression = async () => {
    console.log('Unlocking expression');
    expressionLocked.value = false;
  };

  const expressionAndSpeak = async (expression, text) => {
    if (!expression || !text) return;
    await postForm('/api/face/expression_and_speak', { expression, text });
  };

  const followFace = async (enablePreview, largePreview) => {
    const data = {};
    if (typeof enablePreview !== 'undefined') data.enablePreview = enablePreview;
    if (typeof largePreview !== 'undefined') data.largePreview = largePreview;
    await postForm('/api/utility/follow_face', data);
  };

  const followObject = async () => {
    await postForm('/api/utility/follow_object', {});
  };

  const trackFace = async (enablePreview, largePreview) => {
    const data = {};
    if (typeof enablePreview !== 'undefined') data.enablePreview = enablePreview;
    if (typeof largePreview !== 'undefined') data.largePreview = largePreview;
    await postForm('/api/utility/track_face', data);
  };

  const lookAtUser = async (doa) => {
    const value = Number(doa);
    if (!Number.isFinite(value)) return;
    await postForm('/api/utility/look_at_user', { doa: value });
  };

  const playAction = async (number) => {
    const value = Number(number);
    if (!Number.isInteger(value)) return;
    await postForm('/api/utility/play_action', { number: value });
  };

  const playEmotionalAction = async (face, action) => {
    if (!face) return;
    const value = Number(action);
    if (!Number.isInteger(value)) return;
    await postForm('/api/utility/play_emotional_action', { face, action: value });
  };

  const getBlueLightFilterEnable = async () => {
    return getJson('/api/utility/get_blue_light_filter_enable');
  };

  const getBlueLightFilterMode = async () => {
    return getJson('/api/utility/get_blue_light_filter_mode');
  };

  /**
   * Set the blue light filter mode.
   *
   * The allowed values for `mode` are defined by the robot
   * firmware / backend API. Refer to the robot's API
   * documentation for the exact list of supported modes.
   */
  const setBlueLightFilterMode = async (mode) => {
    if (!mode) return;
    await postForm('/api/utility/set_blue_light_filter_mode', { mode });
  };


  if (autoCheckHealth) {
    onMounted(checkHealth);
  }

  return {
    // state
    isHealthy,
    healthLoading,
    healthError,

    // health API
    checkHealth,

    // dialog APIs
    speak,
    startSpeakAnimation,
    stopSpeak,
    setVoiceTrigger,
    setHeadAction,

    // face APIs
    setExpression,
    lockExpression,
    unlockExpression,
    expressionAndSpeak,

    // utility APIs
    followFace,
    followObject,
    trackFace,
    lookAtUser,
    playAction,
    playEmotionalAction,
    getBlueLightFilterEnable,
    getBlueLightFilterMode,
    setBlueLightFilterMode,
  };
}
