<template>
  <context name="reminders_overview" v-if="remindersOverviewText">
    {{ remindersOverviewText }}
  </context>

  <tool
    name="create_reminder"
    description="Create a reminder with a time and title"
    @call="handleCreateReminder"
    return
  >
    <prop
      name="title"
      type="string"
      description="Kurzbeschreibung, z. B. 'Arzttermin'"
      required
    />
    <prop
      name="time"
      type="string"
      description="Zeitangabe, z. B. 'morgen 9:00', '2025-12-04 14:30'"
      required
    />
    <prop
      name="description"
      type="string"
      description="Optionale Zusatzinformationen"
    />
  </tool>

  <tool
    name="list_reminders"
    description="List all stored reminders"
    @call="handleListReminders"
    return
  />

  <tool
    name="delete_reminder"
    description="Delete a reminder by its ID"
    @call="handleDeleteReminder"
    return
  >
    <prop
      name="id"
      type="number"
      description="ID der Erinnerung (siehe list_reminders)"
      required
    />
  </tool>

  <tool
    name="add_todo_item"
    description="Add an item to a todo or shopping list"
    @call="handleAddTodoItem"
    return
  >
    <prop
      name="title"
      type="string"
      description="Bezeichnung der Aufgabe oder des Einkaufs"
      required
    />
    <prop
      name="list"
      type="string"
      description="Name der Liste, z. B. 'Einkauf', 'Privat', 'Arbeit' (Standard: 'Allgemein')"
    />
    <prop
      name="due"
      type="string"
      description="Optionale Fälligkeit, z. B. 'morgen', 'nächste Woche'"
    />
  </tool>

  <tool
    name="list_todo_items"
    description="List todo items, optionally filtered by list name"
    @call="handleListTodoItems"
    return
  >
    <prop
      name="list"
      type="string"
      description="Name der Liste, z. B. 'Einkauf', 'Privat', 'Arbeit'"
    />
  </tool>

  <tool
    name="complete_todo_item"
    description="Mark a todo item as completed by its ID"
    @call="handleCompleteTodoItem"
    return
  >
    <prop
      name="id"
      type="number"
      description="ID der Aufgabe (siehe list_todo_items)"
      required
    />
  </tool>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useTTS } from '../../composables/useTTS';

const REMINDERS_KEY = 'zenbo_assist_reminders';
const TODOS_KEY = 'zenbo_assist_todos';

const reminders = ref([]);
const todos = ref([]);
let nextReminderId = 1;
let nextTodoId = 1;

const { speak } = useTTS();

function sendReturn(event, payload) {
  event.target.dispatchEvent(new CustomEvent('return', { detail: payload }));
}

// Persistence helpers
const loadFromStorage = (key, fallback) => {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const saveToStorage = (key, value) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / serialization errors
  }
};

function detectOverdueAndSpeak() {
  const now = new Date();
  const overdue = [];

  for (const r of reminders.value) {
    // Normalize due_at from time if missing
    if (!r.due_at && r.time) {
      const parsed = new Date(r.time);
      if (!Number.isNaN(parsed.getTime())) {
        r.due_at = parsed.toISOString();
      }
    }

    if (!r.due_at) continue;
    if (r.notified_at) continue;

    const due = new Date(r.due_at);
    if (!Number.isNaN(due.getTime()) && due <= now) {
      overdue.push(r);
      r.notified_at = new Date().toISOString();
    }
  }

  if (!overdue.length) return;

  const lines = overdue.map((r) => {
    const desc = r.description ? ` – ${r.description}` : '';
    return `${r.title}${desc}.`;
  });

  const text =
    'Du hast überfällige Erinnerungen:\n' + lines.join('\n');

  speak(text);
}

onMounted(() => {
  const storedReminders = loadFromStorage(REMINDERS_KEY, []);
  reminders.value = storedReminders;
  const maxReminderId = storedReminders.reduce(
    (max, r) => (typeof r.id === 'number' && r.id > max ? r.id : max),
    0,
  );
  nextReminderId = maxReminderId + 1;

  const storedTodos = loadFromStorage(TODOS_KEY, []);
  todos.value = storedTodos;
  const maxTodoId = storedTodos.reduce(
    (max, t) => (typeof t.id === 'number' && t.id > max ? t.id : max),
    0,
  );
  nextTodoId = maxTodoId + 1;

});

// detect overdue reminders every 5 seconds
setInterval(() => {
  detectOverdueAndSpeak();
}, 5 * 1000);

watch(
  reminders,
  (val) => {
    saveToStorage(REMINDERS_KEY, val);
  },
  { deep: true },
);

watch(
  todos,
  (val) => {
    saveToStorage(TODOS_KEY, val);
  },
  { deep: true },
);

const remindersOverviewText = computed(() => {
  if (!reminders.value.length) {
    return '';
  }

  const lines = reminders.value.map((r) => {
    const desc = r.description ? ` – ${r.description}` : '';
    let dueInfo = r.time;

    if (r.due_at) {
      const due = new Date(r.due_at);
      if (!Number.isNaN(due.getTime())) {
        dueInfo = `${r.time} (normalisiert: ${due.toLocaleString()})`;
      }
    }

    const status = r.notified_at
      ? 'überfällig (bereits gemeldet)'
      : 'geplant';

    return `• [${r.id}] ${dueInfo}: ${r.title}${desc} – Status: ${status}`;
  });

  return 'Aktuelle Erinnerungen und Fälligkeiten:\n' + lines.join('\n');
});

async function handleCreateReminder(event) {
  const { title, time, description } = event.detail || {};

  const trimmedTitle = typeof title === 'string' ? title.trim() : '';
  const trimmedTime = typeof time === 'string' ? time.trim() : '';

  if (!trimmedTitle || !trimmedTime) {
    sendReturn(event, {
      ok: false,
      text:
        'Bitte gib sowohl einen Titel als auch eine Zeit für die Erinnerung an, z. B. Titel: "Arzttermin", Zeit: "morgen 9:00".',
      error_code: 'MISSING_FIELDS',
    });
    return;
  }

  let dueAt = null;
  const parsed = new Date(trimmedTime);
  if (!Number.isNaN(parsed.getTime())) {
    dueAt = parsed.toISOString();
  }

  const reminder = {
    id: nextReminderId++,
    title: trimmedTitle,
    time: trimmedTime,
    description: typeof description === 'string' ? description.trim() : '',
    created_at: new Date().toISOString(),
    due_at: dueAt,
    notified_at: null,
  };

  reminders.value.push(reminder);

  const text = `Erinnerung gespeichert: "${reminder.title}" um ${reminder.time}.`;

  sendReturn(event, {
    ok: true,
    text,
    data: {
      reminder,
      reminders_count: reminders.value.length,
    },
  });
}

async function handleListReminders(event) {
  if (reminders.value.length === 0) {
    sendReturn(event, {
      ok: true,
      text: 'Es sind derzeit keine Erinnerungen gespeichert.',
      data: {
        reminders: [],
      },
    });
    return;
  }

  const lines = reminders.value.map((r) => {
    const desc = r.description ? ` – ${r.description}` : '';
    return `• [${r.id}] ${r.time}: ${r.title}${desc}`;
  });

  const text =
    'Hier sind deine gespeicherten Erinnerungen:\n' + lines.join('\n');

  sendReturn(event, {
    ok: true,
    text,
    data: {
      reminders: reminders.value,
    },
  });
}

async function handleDeleteReminder(event) {
  const rawId = event.detail?.id;
  const id =
    typeof rawId === 'number' && Number.isFinite(rawId)
      ? rawId
      : Number.parseInt(rawId, 10);

  if (!Number.isFinite(id)) {
    sendReturn(event, {
      ok: false,
      text:
        'Bitte gib eine gültige Erinnerungs-ID an (siehe list_reminders).',
      error_code: 'INVALID_ID',
    });
    return;
  }

  const index = reminders.value.findIndex((r) => r.id === id);
  if (index === -1) {
    sendReturn(event, {
      ok: false,
      text: `Ich konnte keine Erinnerung mit der ID ${id} finden.`,
      error_code: 'REMINDER_NOT_FOUND',
    });
    return;
  }

  const [removed] = reminders.value.splice(index, 1);
  const text = `Die Erinnerung "${removed.title}" um ${removed.time} wurde gelöscht.`;

  sendReturn(event, {
    ok: true,
    text,
    data: {
      deleted: removed,
      reminders_count: reminders.value.length,
    },
  });
}

async function handleAddTodoItem(event) {
  const { title, list, due } = event.detail || {};

  const trimmedTitle = typeof title === 'string' ? title.trim() : '';
  const trimmedList =
    typeof list === 'string' && list.trim() ? list.trim() : 'Allgemein';
  const trimmedDue = typeof due === 'string' ? due.trim() : '';

  if (!trimmedTitle) {
    sendReturn(event, {
      ok: false,
      text: 'Bitte gib einen Titel für den Eintrag an, z. B. "Brot kaufen".',
      error_code: 'MISSING_TITLE',
    });
    return;
  }

  const item = {
    id: nextTodoId++,
    title: trimmedTitle,
    list: trimmedList,
    due: trimmedDue,
    created_at: new Date().toISOString(),
    completed: false,
  };

  todos.value.push(item);

  const duePart = trimmedDue ? ` (Fällig: ${trimmedDue})` : '';
  const text = `Aufgabe hinzugefügt zur Liste "${trimmedList}": ${trimmedTitle}${duePart}.`;

  sendReturn(event, {
    ok: true,
    text,
    data: {
      item,
      todos_count: todos.value.length,
    },
  });
}

async function handleListTodoItems(event) {
  const listNameRaw = event.detail?.list;
  const trimmedList =
    typeof listNameRaw === 'string' && listNameRaw.trim()
      ? listNameRaw.trim()
      : null;

  const filtered = trimmedList
    ? todos.value.filter((t) => t.list === trimmedList)
    : todos.value;

  if (filtered.length === 0) {
    const listInfo = trimmedList ? ` in der Liste "${trimmedList}"` : '';
    sendReturn(event, {
      ok: true,
      text: `Es gibt derzeit keine offenen Aufgaben${listInfo}.`,
      data: {
        items: [],
      },
    });
    return;
  }

  const lines = filtered.map((t) => {
    const listPart = trimmedList ? '' : ` [${t.list}]`;
    const duePart = t.due ? ` (Fällig: ${t.due})` : '';
    const status = t.completed ? '✓' : '✗';
    return `• [${t.id}] ${t.title}${listPart}${duePart} (${status})`;
  });

  const heading = trimmedList
    ? `Aufgaben in der Liste "${trimmedList}":`
    : 'Hier sind deine offenen Aufgaben:';

  const text = `${heading}\n${lines.join('\n')}`;

  sendReturn(event, {
    ok: true,
    text,
    data: {
      items: filtered,
    },
  });
}

async function handleCompleteTodoItem(event) {
  const rawId = event.detail?.id;
  const id =
    typeof rawId === 'number' && Number.isFinite(rawId)
      ? rawId
      : Number.parseInt(rawId, 10);

  if (!Number.isFinite(id)) {
    sendReturn(event, {
      ok: false,
      text:
        'Bitte gib eine gültige Aufgaben-ID an (siehe list_todo_items).',
      error_code: 'INVALID_ID',
    });
    return;
  }

  const item = todos.value.find((t) => t.id === id);
  if (!item) {
    sendReturn(event, {
      ok: false,
      text: `Ich konnte keine Aufgabe mit der ID ${id} finden.`,
      error_code: 'TODO_NOT_FOUND',
    });
    return;
  }

  item.completed = true;

  const duePart = item.due ? ` (Fällig: ${item.due})` : '';
  const text = `Aufgabe als erledigt markiert: ${item.title}${duePart} in der Liste "${item.list}".`;

  sendReturn(event, {
    ok: true,
    text,
    data: {
      item,
    },
  });
}
</script>

