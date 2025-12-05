<template>
  <tool
    name="get_stock_quote"
    description="Get the latest stock quote for a symbol from Finnhub"
    @call="handleGetStockQuote"
    return
  >
    <prop
      name="symbol"
      type="string"
      description="Ticker symbol, e.g. AAPL, MSFT, TSLA"
      required
    />
  </tool>

  <tool
    name="get_stock_profile"
    description="Get basic company profile information for a stock"
    @call="handleGetStockProfile"
    return
  >
    <prop
      name="symbol"
      type="string"
      description="Ticker symbol, e.g. AAPL, MSFT, TSLA"
      required
    />
  </tool>

  <tool
    name="get_stock_metrics"
    description="Get key fundamental metrics for a stock"
    @call="handleGetStockMetrics"
    return
  >
    <prop
      name="symbol"
      type="string"
      description="Ticker symbol, e.g. AAPL, MSFT, TSLA"
      required
    />
  </tool>

  <tool
    name="get_stock_news"
    description="Get recent company news for a stock"
    @call="handleGetStockNews"
    return
  >
    <prop
      name="symbol"
      type="string"
      description="Ticker symbol, e.g. AAPL, MSFT, TSLA"
      required
    />
    <prop
      name="days"
      type="number"
      description="How many days back to look for news (1-14, default 3)"
    />
  </tool>

  <tool
    name="get_stock_peers"
    description="Get peer symbols for a given stock"
    @call="handleGetStockPeers"
    return
  >
    <prop
      name="symbol"
      type="string"
      description="Ticker symbol, e.g. AAPL, MSFT, TSLA"
      required
    />
  </tool>
</template>

<script setup>
function sendReturn(event, payload) {
  event.target.dispatchEvent(new CustomEvent('return', { detail: payload }));
}

const apiKey = import.meta.env.VITE_FINNHUB_API_KEY;
const baseUrl =
  import.meta.env.VITE_FINNHUB_API_URL || 'https://finnhub.io/api';

function ensureApiKey(event) {
  if (!apiKey) {
    console.warn('VITE_FINNHUB_API_KEY is not set; cannot use Finnhub.');
    sendReturn(event, {
      ok: false,
      text:
        'Die Kursabfrage ist derzeit nicht konfiguriert (es fehlt ein Finnhub API-Schlüssel).',
      error_code: 'MISSING_FINNHUB_KEY',
    });
    return false;
  }
  return true;
}

async function handleGetStockQuote(event) {
  const symbolRaw = event.detail?.symbol;

  const trimmedSymbol =
    typeof symbolRaw === 'string' ? symbolRaw.trim().toUpperCase() : '';

  if (!trimmedSymbol) {
    sendReturn(event, {
      ok: false,
      text:
        'Bitte gib ein gültiges Börsenkürzel an, zum Beispiel "AAPL" oder "MSFT".',
      error_code: 'MISSING_SYMBOL',
    });
    return;
  }

  if (!ensureApiKey(event)) return;

  try {
    // 1) Quote endpoint: current price and changes
    const quoteRes = await fetch(
      `${baseUrl}/v1/quote?symbol=${encodeURIComponent(
        trimmedSymbol,
      )}&token=${encodeURIComponent(apiKey)}`,
    );

    if (!quoteRes.ok) {
      console.error('Finnhub quote request failed with status', quoteRes.status);
      sendReturn(event, {
        ok: false,
        text: `Entschuldigung, ich konnte die Kursdaten für ${trimmedSymbol} nicht abrufen.`,
        error_code: `QUOTE_HTTP_${quoteRes.status}`,
      });
      return;
    }

    const quoteData = await quoteRes.json();
    const price = quoteData?.c;

    if (typeof price !== 'number') {
      console.warn('Unexpected price in Finnhub quote:', quoteData);
      sendReturn(event, {
        ok: false,
        text: `Entschuldigung, der aktuelle Kurs für ${trimmedSymbol} konnte nicht ermittelt werden.`,
        error_code: 'INVALID_PRICE',
      });
      return;
    }

    const change = quoteData?.d ?? null;
    const changePercent = quoteData?.dp ?? null;

    // 2) Optional profile endpoint to get the company name and currency
    let name = trimmedSymbol;
    let currency = 'USD';

    try {
      const profileRes = await fetch(
        `${baseUrl}/v1/stock/profile2?symbol=${encodeURIComponent(
          trimmedSymbol,
        )}&token=${encodeURIComponent(apiKey)}`,
      );
      if (profileRes.ok) {
        const profile = await profileRes.json();
        if (profile?.name) {
          name = profile.name;
        }
        if (profile?.currency) {
          currency = profile.currency;
        }
      }
    } catch (profileErr) {
      console.warn('Finnhub profile request failed:', profileErr);
    }

    const roundedPrice = price.toFixed(2);
    const roundedChange =
      typeof change === 'number' ? change.toFixed(2) : null;
    const roundedChangePercent =
      typeof changePercent === 'number' ? changePercent.toFixed(2) : null;

    let changePart = '';
    if (roundedChange !== null && roundedChangePercent !== null) {
      const sign = change >= 0 ? '+' : '';
      changePart = ` (${sign}${roundedChange} ${currency}, ${sign}${roundedChangePercent}%)`;
    }

    const text = `Der aktuelle Kurs von ${trimmedSymbol} (${name}) liegt bei ${roundedPrice} ${currency}${changePart}.`;

    sendReturn(event, {
      ok: true,
      text,
      data: {
        symbol: trimmedSymbol,
        name,
        price,
        change,
        change_percent: changePercent,
        currency,
        source: 'finnhub',
      },
    });
  } catch (err) {
    console.error('Failed to fetch quote from Finnhub:', err);
    sendReturn(event, {
      ok: false,
      text:
        'Entschuldigung, beim Abrufen der Kursdaten ist ein Fehler aufgetreten. Bitte versuche es später erneut.',
      error_code: 'QUOTE_UNKNOWN_ERROR',
    });
  }
}

async function handleGetStockProfile(event) {
  const symbolRaw = event.detail?.symbol;
  const trimmedSymbol =
    typeof symbolRaw === 'string' ? symbolRaw.trim().toUpperCase() : '';

  if (!trimmedSymbol) {
    sendReturn(event, {
      ok: false,
      text:
        'Bitte gib ein gültiges Börsenkürzel an, zum Beispiel "AAPL" oder "MSFT".',
      error_code: 'MISSING_SYMBOL',
    });
    return;
  }

  if (!ensureApiKey(event)) return;

  try {
    const profileRes = await fetch(
      `${baseUrl}/v1/stock/profile2?symbol=${encodeURIComponent(
        trimmedSymbol,
      )}&token=${encodeURIComponent(apiKey)}`,
    );

    if (!profileRes.ok) {
      console.error('Finnhub profile request failed with status', profileRes.status);
      sendReturn(event, {
        ok: false,
        text: `Entschuldigung, ich konnte die Unternehmensdaten für ${trimmedSymbol} nicht abrufen.`,
        error_code: `PROFILE_HTTP_${profileRes.status}`,
      });
      return;
    }

    const profile = await profileRes.json();
    if (!profile || Object.keys(profile).length === 0) {
      sendReturn(event, {
        ok: false,
        text: `Ich konnte keine Unternehmensdaten für ${trimmedSymbol} finden.`,
        error_code: 'PROFILE_NO_RESULTS',
      });
      return;
    }

    const name = profile.name || trimmedSymbol;
    const exchange = profile.exchange || profile.marketCapitalization
      ? profile.exchange
      : 'unbekannte Börse';
    const industry = profile.finnhubIndustry || 'unbekannte Branche';
    const country = profile.country || 'unbekanntes Land';
    const marketCap = profile.marketCapitalization;
    const currency = profile.currency || 'USD';

    let marketCapText = '';
    if (typeof marketCap === 'number') {
      const capRounded = marketCap.toFixed(1);
      marketCapText = ` Die Marktkapitalisierung beträgt ca. ${capRounded} Mrd. ${currency}.`;
    }

    const text =
      `${name} (${trimmedSymbol}) ist ein Unternehmen aus ${country}, ` +
      `notiert an der Börse ${exchange}, Branche: ${industry}.${marketCapText}`;

    sendReturn(event, {
      ok: true,
      text,
      data: {
        symbol: trimmedSymbol,
        profile,
        source: 'finnhub',
      },
    });
  } catch (err) {
    console.error('Failed to fetch profile from Finnhub:', err);
    sendReturn(event, {
      ok: false,
      text:
        'Entschuldigung, beim Abrufen der Unternehmensdaten ist ein Fehler aufgetreten.',
      error_code: 'PROFILE_UNKNOWN_ERROR',
    });
  }
}

async function handleGetStockMetrics(event) {
  const symbolRaw = event.detail?.symbol;
  const trimmedSymbol =
    typeof symbolRaw === 'string' ? symbolRaw.trim().toUpperCase() : '';

  if (!trimmedSymbol) {
    sendReturn(event, {
      ok: false,
      text:
        'Bitte gib ein gültiges Börsenkürzel an, zum Beispiel "AAPL" oder "MSFT".',
      error_code: 'MISSING_SYMBOL',
    });
    return;
  }

  if (!ensureApiKey(event)) return;

  try {
    const metricsRes = await fetch(
      `${baseUrl}/v1/stock/metric?symbol=${encodeURIComponent(
        trimmedSymbol,
      )}&metric=all&token=${encodeURIComponent(apiKey)}`,
    );

    if (!metricsRes.ok) {
      console.error('Finnhub metrics request failed with status', metricsRes.status);
      sendReturn(event, {
        ok: false,
        text: `Entschuldigung, ich konnte die Kennzahlen für ${trimmedSymbol} nicht abrufen.`,
        error_code: `METRICS_HTTP_${metricsRes.status}`,
      });
      return;
    }

    const metricsData = await metricsRes.json();
    const metrics = metricsData?.metric;

    if (!metrics || Object.keys(metrics).length === 0) {
      sendReturn(event, {
        ok: false,
        text: `Für ${trimmedSymbol} stehen derzeit keine Kennzahlen zur Verfügung.`,
        error_code: 'METRICS_NO_RESULTS',
      });
      return;
    }

    const pe = metrics.peTTM;
    const eps = metrics.epsTTM;
    const roe = metrics.roeTTM;
    const netMargin = metrics.netMargin;
    const high52 = metrics['52WeekHigh'];
    const low52 = metrics['52WeekLow'];

    const parts = [];
    if (typeof pe === 'number') parts.push(`KGV (TTM): ${pe.toFixed(2)}`);
    if (typeof eps === 'number') parts.push(`EPS (TTM): ${eps.toFixed(2)}`);
    if (typeof roe === 'number') parts.push(`Eigenkapitalrendite (ROE): ${roe.toFixed(2)}%`);
    if (typeof netMargin === 'number') parts.push(`Nettomarge: ${netMargin.toFixed(2)}%`);
    if (typeof low52 === 'number' && typeof high52 === 'number') {
      parts.push(
        `52‑Wochen‑Spanne: ${low52.toFixed(2)}–${high52.toFixed(2)}`,
      );
    }

    const text =
      parts.length > 0
        ? `Wichtige Kennzahlen für ${trimmedSymbol}:\n- ` + parts.join('\n- ')
        : `Für ${trimmedSymbol} konnten keine aussagekräftigen Kennzahlen ermittelt werden.`;

    sendReturn(event, {
      ok: true,
      text,
      data: {
        symbol: trimmedSymbol,
        metrics,
        source: 'finnhub',
      },
    });
  } catch (err) {
    console.error('Failed to fetch metrics from Finnhub:', err);
    sendReturn(event, {
      ok: false,
      text:
        'Entschuldigung, beim Abrufen der Kennzahlen ist ein Fehler aufgetreten.',
      error_code: 'METRICS_UNKNOWN_ERROR',
    });
  }
}

async function handleGetStockNews(event) {
  const symbolRaw = event.detail?.symbol;
  const daysRaw = event.detail?.days;

  const trimmedSymbol =
    typeof symbolRaw === 'string' ? symbolRaw.trim().toUpperCase() : '';

  if (!trimmedSymbol) {
    sendReturn(event, {
      ok: false,
      text:
        'Bitte gib ein gültiges Börsenkürzel an, zum Beispiel "AAPL" oder "MSFT".',
      error_code: 'MISSING_SYMBOL',
    });
    return;
  }

  if (!ensureApiKey(event)) return;

  let days = typeof daysRaw === 'number' ? daysRaw : 3;
  if (!Number.isFinite(days) || days <= 0) days = 3;
  if (days > 14) days = 14;

  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

  const toStr = to.toISOString().slice(0, 10);
  const fromStr = from.toISOString().slice(0, 10);

  try {
    const newsRes = await fetch(
      `${baseUrl}/v1/company-news?symbol=${encodeURIComponent(
        trimmedSymbol,
      )}&from=${fromStr}&to=${toStr}&token=${encodeURIComponent(apiKey)}`,
    );

    if (!newsRes.ok) {
      console.error('Finnhub news request failed with status', newsRes.status);
      sendReturn(event, {
        ok: false,
        text: `Entschuldigung, ich konnte die Nachrichten für ${trimmedSymbol} nicht abrufen.`,
        error_code: `NEWS_HTTP_${newsRes.status}`,
      });
      return;
    }

    const articles = await newsRes.json();
    const results = Array.isArray(articles) ? articles : [];

    if (!results.length) {
      sendReturn(event, {
        ok: true,
        text: `Für ${trimmedSymbol} wurden in den letzten ${days} Tagen keine Nachrichten gefunden.`,
        data: {
          symbol: trimmedSymbol,
          from: fromStr,
          to: toStr,
          articles: [],
          source: 'finnhub',
        },
      });
      return;
    }

    const maxArticles = Math.min(results.length, 5);
    const lines = results.slice(0, maxArticles).map((a) => {
      const date = a.datetime
        ? new Date(a.datetime * 1000).toLocaleDateString()
        : '';
      const headline = a.headline || 'Ohne Überschrift';
      const url = a.url || '';
      return `• ${date} – ${headline}${url ? `\n  ${url}` : ''}`;
    });

    const text =
      `Neueste Nachrichten zu ${trimmedSymbol} (Zeitraum ${fromStr} bis ${toStr}):\n` +
      lines.join('\n\n');

    sendReturn(event, {
      ok: true,
      text,
      data: {
        symbol: trimmedSymbol,
        from: fromStr,
        to: toStr,
        articles: results,
        source: 'finnhub',
      },
    });
  } catch (err) {
    console.error('Failed to fetch news from Finnhub:', err);
    sendReturn(event, {
      ok: false,
      text:
        'Entschuldigung, beim Abrufen der Nachrichten ist ein Fehler aufgetreten.',
      error_code: 'NEWS_UNKNOWN_ERROR',
    });
  }
}

async function handleGetStockPeers(event) {
  const symbolRaw = event.detail?.symbol;
  const trimmedSymbol =
    typeof symbolRaw === 'string' ? symbolRaw.trim().toUpperCase() : '';

  if (!trimmedSymbol) {
    sendReturn(event, {
      ok: false,
      text:
        'Bitte gib ein gültiges Börsenkürzel an, zum Beispiel "AAPL" oder "MSFT".',
      error_code: 'MISSING_SYMBOL',
    });
    return;
  }

  if (!ensureApiKey(event)) return;

  try {
    const peersRes = await fetch(
      `${baseUrl}/v1/stock/peers?symbol=${encodeURIComponent(
        trimmedSymbol,
      )}&token=${encodeURIComponent(apiKey)}`,
    );

    if (!peersRes.ok) {
      console.error('Finnhub peers request failed with status', peersRes.status);
      sendReturn(event, {
        ok: false,
        text: `Entschuldigung, ich konnte die Peers für ${trimmedSymbol} nicht abrufen.`,
        error_code: `PEERS_HTTP_${peersRes.status}`,
      });
      return;
    }

    const peers = await peersRes.json();
    const symbols = Array.isArray(peers) ? peers : [];

    if (!symbols.length) {
      sendReturn(event, {
        ok: true,
        text: `Für ${trimmedSymbol} wurden keine Peers gefunden.`,
        data: {
          symbol: trimmedSymbol,
          peers: [],
          source: 'finnhub',
        },
      });
      return;
    }

    const text =
      `Peers von ${trimmedSymbol}: ` + symbols.slice(0, 10).join(', ');

    sendReturn(event, {
      ok: true,
      text,
      data: {
        symbol: trimmedSymbol,
        peers: symbols,
        source: 'finnhub',
      },
    });
  } catch (err) {
    console.error('Failed to fetch peers from Finnhub:', err);
    sendReturn(event, {
      ok: false,
      text:
        'Entschuldigung, beim Abrufen der Peers ist ein Fehler aufgetreten.',
      error_code: 'PEERS_UNKNOWN_ERROR',
    });
  }
}
</script>

