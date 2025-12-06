<script setup>
import { ref } from 'vue';
import { useRobotAPI } from './composables/useRobotAPI';
import { useVoiceAgent } from './composables/useVoiceAgent';
import Robot from './modules/robot/Robot.vue';
import Weather from './modules/misc/Weather.vue';
import Finance from './modules/misc/Finance.vue';
import Assist from './modules/misc/Assist.vue';
import ImageGen from './modules/misc/ImageGen.vue';
import Search from './modules/misc/Search.vue';
import Sleep from './modules/misc/Sleep.vue';
import SystemStatus from './modules/misc/SystemStatus.vue';

const {
  prompt,
  result,
  loading,
  error,
  submit,
} = useVoiceAgent({
  autoStartListening: true,
});

useRobotAPI().setExpression('DEFAULT');

const currentDatetime = ref(new Date().toLocaleString());
setInterval(() => {
  currentDatetime.value = new Date().toLocaleString();
}, 10000);
</script>

<template>
  <context name="current_time">
    The current date and time is {{ currentDatetime }}.
  </context>

  <Weather />
  <Finance />
  <Assist />
  <ImageGen />
  <Search />
  <SystemStatus />
  <Robot />
  <Sleep />
</template>

<style scoped></style>
