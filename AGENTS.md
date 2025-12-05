# Repository Guidelines

This document guides contributors and AI agents working on this Zenbo web UI and Android wrapper.

## Project Structure & Module Organization

- `src/` - Vue 3 single-page app (`App.vue`, `main.js`).
- `src/composables/` - reusable hooks (e.g. `useRobotAPI.js`, `useVoiceAgent.js`, `useRobotEvents.js`, `useSleepMode.js`).
- `src/modules/` - feature views such as `misc/` (tools like Assist, Finance, Sleep), `robot/`, and `event/` (e.g. EventDisplay, SleepWake).
- `src/stores/` - Pinia stores and shared state.
- `public/` - static assets injected by Vite.
- `android/` - Gradle Android project; `KiraZenbo` bundles the Vite app, Android service, and SDK modules.

## Build, Test, and Development Commands

- `npm run dev` - start Vite dev server for local web development.
- `npm run build` - production build into `dist/`.
- `npm run android` - build web assets into `android/KiraZenbo/src/main/assets/app`.
- From `android/`: `./gradlew assembleDebug` (or `gradlew.bat assembleDebug`) builds a debug APK.

## Android Project Details

- Main app wrapper: `android/KiraZenbo` (hosts the web UI in `MainActivity` with GeckoView).
- `MainActivity` also declares a `HOME` intent filter so KIRA can be set as the device launcher; when selected, the GeckoView UI becomes the home screen after boot.
- Web assets must live under `android/KiraZenbo/src/main/assets/app`; keep this in sync via `npm run android`.
- `RobotApiService` is a foreground service that initializes `RobotAPI`, runs `AsyncRobotApiServer` on `http://127.0.0.1:8787`, and `AndroidAsyncEventServer` on `ws://127.0.0.1:8790/events`.
- SDK / integration modules: `RobotActivityLibrary`, `RobotDevSample`, `RobotDSBus`, `RobotDSTang`, `ZenboSDK`. Avoid changing them unless necessary; prefer integrating via the web UI or dedicated glue code.

## Robot Event Pipeline (WebSocket + HTTP)

- Native `RobotAPI` callbacks in `RobotApiService` send JSON payloads via `sendEvent(event, data)` into `AndroidAsyncEventServer.sendEvent` (WebSocket) and leverage `AsyncRobotApiServer` for HTTP health/actions.
- `AndroidAsyncEventServer` exposes a WebSocket endpoint at `ws://<host>:8790/events`; each message is a JSON object `{ "type": "<eventName>", "data": { ... } }`.
- In the web app, `useRobotEvents` opens this WebSocket, parses incoming JSON, and forwards payloads to `onEvent` and `onEventType(type, handler)` subscribers.
- Components like `EventDisplay.vue` and `SleepWake.vue` listen for specific types (e.g. `onVoiceDetect`, `onEventUserUtterance`) to update UI, trigger `useRobotAPI` actions, or drive TTS and sleep/wake behavior.
- When adding new robot-side events, emit them with `sendEvent("NewType", json)` in `RobotApiService`; as long as the payload has a `type` field, `useRobotEvents` will route it correctly.

## Coding Style & Naming Conventions

- Use 2-space indentation and ES modules (`import` / `export`).
- Vue components: PascalCase filenames (e.g. `Robot.vue`, `EventDisplay.vue`).
- Composables: `useXxx.js` naming (e.g. `useRobotEvents.js`), keep side effects explicit.
- Keep UI in `modules/`, logic in `composables/`, and shared state in `stores/`.

## Testing Guidelines

- No formal test runner is configured yet; include clear manual test steps in PR descriptions.
- If you add automated tests, place them in `tests/` or `__tests__/` near the feature and wire an `npm test` script.
- Prioritize coverage for robot control, voice, and event-handling flows.

## Commit & Pull Request Guidelines

- Commit messages: short, imperative summaries (e.g. `feat: add robot event display`, `fix: handle missing robot connection`).
- Keep commits focused and logically grouped by feature or fix.
- PRs should state purpose, key changes, testing performed (commands and platforms), and screenshots or screen recordings for UI changes.
- Link related issues when available and call out any breaking changes explicitly.

## Agent HTML Syntax (`<tool>` & `<context>`)

- Use `<context name="...">` to expose short, human-readable facts or instructions to the agent (e.g. `current_time` in `App.vue`, `robot` in `Robot.vue`); keep content concise and user-facing.
- Define tools with `<tool name="snake_case_name" description="..." @call="handler" [return]>` inside feature modules (`Weather.vue`, `Finance.vue`, `Assist.vue`, etc.).
- Add `<prop>` children to declare parameters: `name`, `type` (`string`, `number`, etc.), `description`, and `required` when applicable; names should be stable, descriptive, and in English.
- In handlers, read `event.detail` for arguments and dispatch results with `event.target.dispatchEvent(new CustomEvent('return', { detail }))` only when the `<tool>` has the `return` attribute; omit `return` for fire-and-forget actions like `start_robot_following`.
- Prefer one focused `<tool>` per concrete capability (weather, finance, search, reminders, image generation, robot actions) and keep descriptions specific so the agent can choose the right tool reliably.
