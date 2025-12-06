<template>
  <tool
    name="get_system_status"
    description="Retrieve current robot system status including battery, connectivity, memory, storage and device info"
    @call="handleGetSystemStatus"
    return
  />
</template>

<script setup>
async function fetchJson(path) {
  try {
    const res = await fetch(`http://127.0.0.1:8787${path}`, {
      method: 'GET',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn(`Failed to fetch ${path}`, e);
    return null;
  }
}

async function handleGetSystemStatus(event) {
  const [battery, device, connectivity, memory, storage] = await Promise.all([
    fetchJson('/api/system/battery'),
    fetchJson('/api/system/device'),
    fetchJson('/api/system/connectivity'),
    fetchJson('/api/system/memory'),
    fetchJson('/api/system/storage'),
  ]);

  const parts = [];

  if (battery && typeof battery.percentage === 'number') {
    parts.push(
      `Batterie ${battery.percentage.toFixed(0)}%` +
        (battery.plugged && battery.plugged !== 0 ? ' (am Laden)' : ''),
    );
  }

  if (connectivity) {
    const conn = connectivity.connected ? connectivity.type : 'offline';
    parts.push(`Netzwerk ${conn}`);
  }

  if (device) {
    const model = device.model || '';
    const manufacturer = device.manufacturer || '';
    const androidVersion = device.android_version || '';
    const deviceText = `${manufacturer} ${model}`.trim();
    parts.push(
      deviceText
        ? `Gerät ${deviceText} (Android ${androidVersion})`
        : `Android ${androidVersion}`,
    );
  }

  if (memory && typeof memory.total_mem === 'number') {
    const totalGb = memory.total_mem / (1024 * 1024 * 1024);
    parts.push(`Arbeitsspeicher ${totalGb.toFixed(1)} GB gesamt`);
  }

  if (storage && typeof storage.total_bytes === 'number') {
    const totalGb = storage.total_bytes / (1024 * 1024 * 1024);
    const freeGb = storage.available_bytes / (1024 * 1024 * 1024);
    parts.push(
      `Speicher ${freeGb.toFixed(1)} / ${totalGb.toFixed(1)} GB frei`,
    );
  }

  const summary = parts.join(' | ');

  event.target.dispatchEvent(
    new CustomEvent('return', {
      detail: {
        summary,
        battery,
        device,
        connectivity,
        memory,
        storage,
      },
    }),
  );
}
</script>

