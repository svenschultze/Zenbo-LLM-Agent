import { ref, onMounted, onUnmounted } from 'vue';

// WebSocket base URL: ws(s)://<host>:8790
function computeDefaultWsBase() {
  if (typeof window === 'undefined') return '';
  const { protocol, hostname } = window.location;
  const wsProto = protocol === 'https:' ? 'wss:' : 'ws:';
  // The event server listens on 8790 regardless of the HTTP port.
  return `${wsProto}//${hostname}:8790`;
}

const defaultBaseUrl = computeDefaultWsBase();

let socket = null;
let socketBase = null;
const isConnected = ref(false);
const isConnecting = ref(false);
const lastEvent = ref(null);
const lastEventType = ref('');
const error = ref(null);

const anyEventHandlers = new Set();
const typeHandlers = new Map(); // type -> Set<handler>
let subscriberCount = 0;

function dispatchPayload(payload) {
  lastEventType.value = payload.type || 'message';
  lastEvent.value = payload.data ?? null;

  for (const handler of anyEventHandlers) {
    try {
      handler(payload);
    } catch (e) {
      console.error('[WS] useRobotEvents onEvent handler error:', e);
    }
  }

  const typedSet = typeHandlers.get(payload.type);
  if (typedSet) {
    for (const handler of typedSet) {
      try {
        handler(payload);
      } catch (e) {
        console.error(
          `[WS] useRobotEvents onEventType("${payload.type}") handler error:`,
          e,
        );
      }
    }
  }
}

function handleWsMessage(evt) {
  console.log('[WS] message received:', evt.data);
  let parsed = null;
  try {
    parsed = evt.data ? JSON.parse(evt.data) : null;
  } catch (e) {
    console.warn('[WS] failed to parse robot event data:', evt.data, e);
    parsed = { type: 'message', data: evt.data };
  }

  const payload = {
    type: parsed?.type || 'message',
    data: parsed?.data ?? parsed,
    rawEvent: evt,
  };

  dispatchPayload(payload);
}

function ensureWebSocket(baseUrl) {
  if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
    console.warn('[WS] WebSocket is not available in this environment.');
    return;
  }

  if (socket && socketBase === baseUrl) {
    console.log('[WS] reusing existing WebSocket for', baseUrl);
    return;
  }

  if (socket) {
    console.log('[WS] closing existing WebSocket before reconnecting');
    try {
      socket.close();
    } catch {
      // ignore
    }
    socket = null;
  }

  const origin = baseUrl || defaultBaseUrl;
  if (!origin) {
    console.warn('[WS] no base URL available for WebSocket connection');
    return;
  }
  const url = `${origin}/events`;

  try {
    console.log('[WS] connecting to', url);
    isConnecting.value = true;
    error.value = null;
    socketBase = baseUrl;
    socket = new WebSocket(url);

    socket.onopen = () => {
      console.log('[WS] connection opened');
      isConnecting.value = false;
      isConnected.value = true;
    };

    socket.onerror = (err) => {
      console.error('[WS] WebSocket error:', err);
      error.value = err;
      isConnected.value = false;
      isConnecting.value = false;
    };

    socket.onclose = () => {
      console.log('[WS] connection closed');
      isConnected.value = false;
      isConnecting.value = false;
    };

    socket.onmessage = handleWsMessage;
  } catch (e) {
    console.error('[WS] failed to create WebSocket for robot events:', e);
    error.value = e;
    isConnecting.value = false;
    isConnected.value = false;
  }
}

function disconnectWebSocket() {
  if (socket) {
    console.log('[WS] disconnecting WebSocket');
    try {
      socket.close();
    } catch {
      // ignore
    }
    socket = null;
  }
  isConnected.value = false;
  isConnecting.value = false;
}

export function useRobotEvents(options = {}) {
  const { baseUrl = defaultBaseUrl, autoConnect = true } = options;

  const connect = () => {
    console.log('[WS] connect() requested');
    ensureWebSocket(baseUrl);
  };

  const disconnect = () => {
    console.log('[WS] disconnect() requested');
    subscriberCount = Math.max(0, subscriberCount - 1);
    console.log('[WS] subscriberCount:', subscriberCount);
    if (subscriberCount === 0) {
      disconnectWebSocket();
    }
  };

  const onEvent = (handler) => {
    if (typeof handler !== 'function') return () => {};
    anyEventHandlers.add(handler);
    console.log('[WS] onEvent handler added; total:', anyEventHandlers.size);
    return () => {
      anyEventHandlers.delete(handler);
      console.log(
        '[WS] onEvent handler removed; total:',
        anyEventHandlers.size,
      );
    };
  };

  const onEventType = (type, handler) => {
    if (!type || typeof handler !== 'function') return () => {};
    let set = typeHandlers.get(type);
    if (!set) {
      set = new Set();
      typeHandlers.set(type, set);
    }
    set.add(handler);
    console.log(
      `[WS] onEventType("${type}") handler added; total:`,
      set.size,
    );
    return () => {
      const current = typeHandlers.get(type);
      if (!current) return;
      current.delete(handler);
      if (current.size === 0) {
        typeHandlers.delete(type);
      }
      console.log(
        `[WS] onEventType("${type}") handler removed; remaining:`,
        current ? current.size : 0,
      );
    };
  };

  onMounted(() => {
    console.log('[WS] useRobotEvents mounted');
    subscriberCount += 1;
    console.log('[WS] subscriberCount:', subscriberCount);
    if (autoConnect) {
      connect();
    }
  });

  onUnmounted(() => {
    console.log('[WS] useRobotEvents unmounted');
    disconnect();
  });

  return {
    isConnected,
    isConnecting,
    lastEvent,
    lastEventType,
    error,
    connect,
    disconnect,
    onEvent,
    onEventType,
  };
}
