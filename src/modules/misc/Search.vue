<template>
  <tool
    name="web_search"
    description="Search the web using Firecrawl and return a short summary plus raw results"
    @call="handleWebSearch"
    return
  >
    <prop
      name="query"
      type="string"
      description="Suchbegriff oder Frage, z. B. 'neuste Nachrichten zu OpenAI'"
      required
    />
    <prop
      name="limit"
      type="number"
      description="Maximale Anzahl von Treffern (Standard: 5)"
    />
  </tool>
</template>

<script setup>
function sendReturn(event, payload) {
  console.log('Web search returning:', payload);
  event.target.dispatchEvent(new CustomEvent('return', { detail: payload }));
}

async function handleWebSearch(event) {
  const { query, limit } = event.detail || {};

  const trimmedQuery =
    typeof query === 'string' ? query.trim() : '';

  if (!trimmedQuery) {
    sendReturn(event, {
      ok: false,
      text:
        'Bitte gib eine Suchanfrage an, z. B. "Wetter in Berlin" oder "Aktuelle Nachrichten zu KI".',
      error_code: 'MISSING_QUERY',
    });
    return;
  }

  const apiKey =
    import.meta.env.VITE_FIRECRAWL_API_KEY ||
    import.meta.env.VITE_FIRECRAWL_API_TOKEN;
  const baseUrl =
    import.meta.env.VITE_FIRECRAWL_API_URL ||
    'https://api.firecrawl.dev';

  if (!apiKey) {
    console.warn('VITE_FIRECRAWL_API_KEY is not set; cannot use Firecrawl.');
    sendReturn(event, {
      ok: false,
      text:
        'Die Websuche ist derzeit nicht konfiguriert (es fehlt ein Firecrawl API-Schlüssel).',
      error_code: 'MISSING_FIRECRAWL_KEY',
    });
    return;
  }

  const maxResults =
    typeof limit === 'number' && Number.isFinite(limit) && limit > 0
      ? Math.min(Math.floor(limit), 10)
      : 5;

  try {
    const res = await fetch(`${baseUrl}/v1/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Firecrawl typically expects a bearer token; keep both headers for compatibility.
        Authorization: `Bearer ${apiKey}`,
        'x-firecrawl-api-key': apiKey,
      },
      body: JSON.stringify({
        query: trimmedQuery,
        limit: maxResults,
      }),
    });

    if (!res.ok) {
      console.error('Firecrawl search request failed with status', res.status);
      sendReturn(event, {
        ok: false,
        text:
          'Entschuldigung, die Websuche ist fehlgeschlagen. Bitte versuche es später erneut.',
        error_code: `FIRECRAWL_HTTP_${res.status}`,
      });
      return;
    }

    const data = await res.json();
    console.log('Firecrawl search response data:', data);
    const results = Array.isArray(data?.data) ? data.data : [];

    if (!results.length) {
      sendReturn(event, {
        ok: true,
        text:
          `Ich konnte keine passenden Suchergebnisse zu "${trimmedQuery}" finden.`,
        data: {
          query: trimmedQuery,
          results: [],
          source: 'firecrawl',
        },
      });
      return;
    }

    const lines = results.map((r, index) => {
      const title = r.title || r.url || `Treffer ${index + 1}`;
      const snippet = r.snippet || r.description || '';
      const url = r.url || '';
      return `• ${title}\n  ${snippet}${url ? `\n  ${url}` : ''}`;
    });

    const text =
      `Hier sind einige Web-Ergebnisse zu "${trimmedQuery}":\n` +
      lines.join('\n\n');

    sendReturn(event, text);
  } catch (err) {
    console.error('Failed to search via Firecrawl:', err);
    sendReturn(event, {
      ok: false,
      text:
        'Entschuldigung, beim Zugriff auf den Websuchdienst ist ein Fehler aufgetreten.',
      error_code: 'FIRECRAWL_UNKNOWN_ERROR',
    });
  }
}
</script>
