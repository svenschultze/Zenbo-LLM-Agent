<script setup>
import { useRobotAPI } from '@/composables/useRobotAPI';
import { useRobotEvents } from '@/composables/useRobotEvents';
import { useTTS } from '@/composables/useTTS';
import { reactive } from 'vue';

const { onEventType, onEvent, connect } = useRobotEvents({
    autoConnect: false,
});
connect();
const events = reactive([]);

onEventType('onVoiceDetect', ({ data }) => {                                                                             
    console.log('Robot detected voice:', data);    
    events.push({ type: 'onVoiceDetect', data, timestamp: new Date() });                        
});

console.log('[SSE] EventDisplay component initialized.');
</script>

<template>
<p v-for="(event, index) in events" :key="index">
    [{{ event.timestamp.toLocaleTimeString() }}] {{ event.type }}: {{ event.data | json }}
</p>
</template>

<style scoped>
p {
    color: white;
}
</style>