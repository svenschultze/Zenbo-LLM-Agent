<template>
  <!-- No visible UI; this component only wires robot events to sleep mode. -->
  <div style="display: none"></div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useRobotEvents } from '@/composables/useRobotEvents';
import { useSleepMode } from '@/composables/useSleepMode';

const { wakeUp, sleeping } = useSleepMode();
const { onEventType } = useRobotEvents({ autoConnect: true });

let removeOnVoiceDetect;

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

