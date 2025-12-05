<template>
  <tool
    name="go_to_sleep"
    description="Temporarily stop listening to the user until the robot detects new voice activity."
    @call="handleGoToSleep"
    return
  />
</template>

<script setup>
import { useSleepMode } from '@/composables/useSleepMode';

const { sleeping, goToSleep } = useSleepMode();

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
</script>

