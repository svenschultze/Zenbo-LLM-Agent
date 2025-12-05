import { ref, watch } from 'vue';
import { useAgent } from './useAgent';
import { useTranscription } from './useTranscription';
import { useTTS } from './useTTS';
import { useSleepMode } from './useSleepMode';

export function useVoiceAgent(options = {}) {
  const {
    autoStartListening = false,
    tts = {},
    onResponse,
  } = options;

  const prompt = ref('What is the weather in Tokyo?');

  const { result, loading, error, runPrompt } = useAgent();

  const {
    isListening,
    isTranscribing,
    error: transcriptionError,
    start: startListening,
    stop: stopListening,
    muteMic,
    unmuteMic,
    onTranscription,
  } = useTranscription({ autoStart: autoStartListening });

  const {
    isSpeaking,
    error: ttsError,
    speak,
    stop: stopSpeaking,
    onSpeakStart,
    onSpeakEnd,
  } = useTTS(tts);

  const { sleeping } = useSleepMode();

  // Fine-grained lifecycle handlers
  const userPromptHandlers = new Set();
  const agentStartHandlers = new Set();
  const agentCompleteHandlers = new Set();
  const agentErrorHandlers = new Set();
  const beforeSpeakHandlers = new Set();

  // Monotonic command id to cancel outdated runs.
  let currentCommandId = 0;

  const notify = async (handlers, payload) => {
    for (const handler of handlers) {
      try {
        await handler(payload);
      } catch (e) {
        console.error('useVoiceAgent lifecycle handler error:', e);
      }
    }
  };

  const runAgentFlow = async (inputText, source, commandId) => {
    if (!inputText) return;

    await notify(userPromptHandlers, { source, text: inputText, commandId });
    await notify(agentStartHandlers, { source, text: inputText, commandId });

    try {
      await runPrompt(inputText);

      const output = result.value;

      // If a newer command started while this one was running, drop this result.
      if (commandId !== currentCommandId) {
        return;
      }

      if (typeof onResponse === 'function') {
        onResponse(output);
      }

      await notify(agentCompleteHandlers, {
        source,
        input: inputText,
        output,
        commandId,
      });

      if (output) {
        await notify(beforeSpeakHandlers, { source, input: inputText, output, commandId });
        speak(output);
      }
    } catch (e) {
      // Also ignore errors from outdated commands.
      if (commandId !== currentCommandId) {
        return;
      }

      await notify(agentErrorHandlers, { source, text: inputText, error: e, commandId });
      throw e;
    }
  };

  const submit = async () => {
    const inputText = prompt.value;
    if (!inputText) return;

    // New text command cancels any previous voice/text command and TTS.
    currentCommandId += 1;
    const commandId = currentCommandId;
    stopSpeaking();

    await runAgentFlow(inputText, 'text', commandId);
  };

  onTranscription(async (text) => {
    // Voice input: cancel any previous command (and its TTS) and treat this as the latest utterance.
    currentCommandId += 1;
    const commandId = currentCommandId;
    stopSpeaking();

    prompt.value = text;
    await runAgentFlow(text, 'voice', commandId);
  });

  // Prevent feedback loop: mute VAD microphone input while TTS is speaking.
  onSpeakStart(() => {
    muteMic();
  });

  onSpeakEnd(() => {
    // Only unmute automatically if we are not in sleep mode.
    if (!sleeping.value) {
      unmuteMic();
    }
  });

  // Tie sleep mode to the VAD microphone.
  watch(
    sleeping,
    (isSleeping) => {
      if (isSleeping) {
        muteMic();
      } else if (!isSpeaking.value) {
        // Only unmute when not currently speaking.
        unmuteMic();
      }
    },
  );

  const onUserPrompt = (handler) => {
    if (typeof handler !== 'function') return () => {};
    userPromptHandlers.add(handler);
    return () => userPromptHandlers.delete(handler);
  };

  const onAgentStart = (handler) => {
    if (typeof handler !== 'function') return () => {};
    agentStartHandlers.add(handler);
    return () => agentStartHandlers.delete(handler);
  };

  const onAgentComplete = (handler) => {
    if (typeof handler !== 'function') return () => {};
    agentCompleteHandlers.add(handler);
    return () => agentCompleteHandlers.delete(handler);
  };

  const onAgentError = (handler) => {
    if (typeof handler !== 'function') return () => {};
    agentErrorHandlers.add(handler);
    return () => agentErrorHandlers.delete(handler);
  };

  const onBeforeSpeak = (handler) => {
    if (typeof handler !== 'function') return () => {};
    beforeSpeakHandlers.add(handler);
    return () => beforeSpeakHandlers.delete(handler);
  };

  return {
    // Agent state
    prompt,
    result,
    loading,
    error,

    // Voice state
    isListening,
    isTranscribing,
    transcriptionError,
    isSpeaking,
    ttsError,

    // Controls
    submit,
    startListening,
    stopListening,
    stopSpeaking,

    // Lifecycle hooks
    onUserPrompt,
    onAgentStart,
    onAgentComplete,
    onAgentError,
    onBeforeSpeak,
    onTranscription,
    onSpeakStart,
    onSpeakEnd,
  };
}
