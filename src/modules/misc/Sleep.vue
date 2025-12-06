<template>
  <tool
    name="go_to_sleep"
    description="Temporarily stop listening to the user until the robot detects new voice activity."
    @call="handleGoToSleep"
    return
  />
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useSleepMode } from '@/composables/useSleepMode';
import { useRobotEvents } from '@/composables/useRobotEvents';

const { sleeping, goToSleep, wakeUp } = useSleepMode();
const { onEventType } = useRobotEvents({ autoConnect: true });

let removeOnVoiceDetect;

function sendReturn(event, payload) {
  event.target.dispatchEvent(new CustomEvent('return', { detail: payload }));
}

function handleGoToSleep(event) {
  if (sleeping.value) {
    sendReturn(event, { ok: true, already_sleeping: true });
    return;
  }

  goToSleep();
  sendReturn(event, { ok: true, sleeping: true });
}

onMounted(() => {
  removeOnVoiceDetect = onEventType('onVoiceDetect', () => {
    if (sleeping.value) {
      wakeUp();
    }
  });
});

onUnmounted(() => {
  if (typeof removeOnVoiceDetect === 'function') {
    removeOnVoiceDetect();
  }
});
</script>
