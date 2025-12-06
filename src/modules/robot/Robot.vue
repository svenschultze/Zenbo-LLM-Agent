<template>
  <div v-if="isHealthy">
    <tool v-if="false"
      name="robot_set_expression"
      description="Set the robot's facial expression"
      @call="handleExpression"
    >
      <prop
        name="expression"
        type="string"
        description="Facial expression (must be one of ACTIVE, AWARE_LEFT, AWARE_RIGHT, CONFIDENT, DEFAULT, DEFAULT_STILL, DOUBTING, EXPECTING, HAPPY, HELPLESS, HIDEFACE, IMPATIENT, INNOCENT, INTERESTED, LAZY, PLEASED, PRETENDING, PROUD, QUESTIONING, SERIOUS, SHOCKED, SHY, SINGING, TIRED, WORRIED)"
        required
      />
    </tool>
    <tool
      name="start_robot_following"
      description="When called, the robot will start following the user around."
      @call="handleFollowing"
    />
    <tool
      name="stop_robot_following"
      description="When called, the robot will stop following the user."
      @call="handleStopFollowing"
    />
    <p>Robot Detected</p>
    <context name="robot">
        You are a robot named Kira. You are employed by the Taunussparkasse. You help the user in any way you can. Always be polite and friendly, and respond in short sentences in German. Your output is spoken language, so don't include any special formatting or markup.
    </context>
  </div>
  <div v-else>
    <p>Robot Not Detected</p>
  </div>
</template>

<script setup>
import { useRobotAPI } from '../../composables/useRobotAPI';

const {
  isHealthy,
  speak,
  stopSpeak,
  setVoiceTrigger,
  setHeadAction,
  setExpression,
  expressionAndSpeak,
  followFace,
  stopFollowing,
} = useRobotAPI({ autoCheckHealth: true });

async function handleSpeak(event) {
  const { text } = event.detail || {};
  if (!text) return;
  await speak(text);
}

async function handleStopSpeak() {
  await stopSpeak();
}

async function handleVoiceTrigger(event) {
  const { enable } = event.detail || {};
  await setVoiceTrigger(enable);
}

async function handleHeadAction(event) {
  const { enable } = event.detail || {};
  await setHeadAction(enable);
}

async function handleExpression(event) {
  const { expression } = event.detail || {};
  await setExpression(expression);
}

async function handleExpressionAndSpeak(event) {
  const { expression, text } = event.detail || {};
  await expressionAndSpeak(expression, text);
}

async function handleFollowing() {
  await followFace();
}

async function handleStopFollowing() {
  await stopFollowing();
}
</script>
