<template>
  <tool
    name="get_weather"
    description="Get the current weather for a given city"
    @call="handleGetWeather"
    return
  >
    <prop
      name="city"
      type="string"
      description="The city to get the weather for"
      required
    />
  </tool>

  <tool
    name="get_weather_forecast"
    description="Get a multi-day weather forecast for a given city"
    @call="handleGetWeatherForecast"
    return
  >
    <prop
      name="city"
      type="string"
      description="The city to get the forecast for"
      required
    />
    <prop
      name="days"
      type="number"
      description="Number of days to forecast (1-7, default 3)"
    />
  </tool>
</template>

<script setup>
function describeWeatherCode(code) {
  if (code === 0) return 'klar';
  if (code === 1 || code === 2) return 'überwiegend klar';
  if (code === 3) return 'bedeckt';
  if (code === 45 || code === 48) return 'neblig';
  if (code >= 51 && code <= 57) return 'Nieselregen';
  if (code >= 61 && code <= 67) return 'Regen';
  if (code >= 71 && code <= 77) return 'Schneefall';
  if (code >= 80 && code <= 82) return 'Regenschauer';
  if (code >= 85 && code <= 86) return 'Schneeschauer';
  if (code === 95) return 'Gewitter';
  if (code === 96 || code === 99) return 'Gewitter mit Hagel';
  return 'unbekanntes Wetter';
}

function sendReturn(event, payload) {
  event.target.dispatchEvent(new CustomEvent('return', { detail: payload }));
}

async function geocodeCity(cityRaw) {
  const encodedCity = encodeURIComponent(cityRaw);

  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodedCity}&count=1&language=de&format=json`,
  );

  if (!geoRes.ok) {
    throw new Error(`GEOCODING_HTTP_${geoRes.status}`);
  }

  const geoData = await geoRes.json();
  const results = geoData?.results;
  if (!Array.isArray(results) || results.length === 0) {
    const err = new Error('GEOCODING_NO_RESULTS');
    err.code = 'GEOCODING_NO_RESULTS';
    throw err;
  }

  return results[0];
}

async function handleGetWeather(event) {
  const cityRaw = event.detail?.city;

  const trimmedCity = typeof cityRaw === 'string' ? cityRaw.trim() : '';
  if (!trimmedCity) {
    sendReturn(event, {
      ok: false,
      text: 'Bitte gib eine Stadt an, zum Beispiel "Berlin".',
      error_code: 'MISSING_CITY',
    });
    return;
  }

  try {
    const { latitude, longitude, name } = await geocodeCity(trimmedCity);

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`,
    );

    if (!weatherRes.ok) {
      console.error('Weather request failed with status', weatherRes.status);
      sendReturn(event, {
        ok: false,
        text: `Entschuldigung, ich konnte die aktuellen Wetterdaten für ${trimmedCity} nicht abrufen.`,
        error_code: `WEATHER_HTTP_${weatherRes.status}`,
      });
      return;
    }

    const weatherData = await weatherRes.json();
    const current = weatherData.current_weather;

    if (!current) {
      console.warn('No current_weather in response:', weatherData);
      sendReturn(event, {
        ok: false,
        text: `Für ${trimmedCity} stehen aktuell keine Wetterdaten zur Verfügung.`,
        error_code: 'NO_CURRENT_WEATHER',
      });
      return;
    }

    const temp = current.temperature;
    const code = current.weathercode;

    if (typeof temp !== 'number') {
      console.warn('Unexpected temperature value:', temp);
      sendReturn(event, {
        ok: false,
        text: `Entschuldigung, die Temperatur für ${trimmedCity} konnte nicht ermittelt werden.`,
        error_code: 'INVALID_TEMPERATURE',
      });
      return;
    }

    const description = describeWeatherCode(code);
    const displayCity = name || trimmedCity;
    const roundedTemp = Math.round(temp);

    const text =
      `Das aktuelle Wetter in ${displayCity} ist ${description} ` +
      `mit einer Temperatur von ${roundedTemp}°C.`;

    const payload = {
      ok: true,
      text,
      data: {
        city: displayCity,
        latitude,
        longitude,
        temperature_c: roundedTemp,
        weather_code: code,
        condition: description,
        source: 'open-meteo',
      },
    };

    sendReturn(event, payload);
  } catch (err) {
    console.error('Failed to fetch weather from Open-Meteo:', err);

    const code = err?.code || err?.message || 'UNKNOWN_ERROR';
    sendReturn(event, {
      ok: false,
      text:
        'Entschuldigung, beim Abrufen der Wetterdaten ist ein Fehler aufgetreten. ' +
        'Bitte versuche es später erneut.',
      error_code: String(code),
    });
  }
}

async function handleGetWeatherForecast(event) {
  const cityRaw = event.detail?.city;
  const daysRaw = event.detail?.days;

  const trimmedCity = typeof cityRaw === 'string' ? cityRaw.trim() : '';
  if (!trimmedCity) {
    sendReturn(event, {
      ok: false,
      text: 'Bitte gib eine Stadt für die Vorhersage an, zum Beispiel "Berlin".',
      error_code: 'MISSING_CITY',
    });
    return;
  }

  let days = typeof daysRaw === 'number' ? daysRaw : 3;
  if (!Number.isFinite(days) || days <= 0) days = 3;
  if (days > 7) days = 7;

  try {
    const { latitude, longitude, name } = await geocodeCity(trimmedCity);

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
        `&daily=temperature_2m_max,temperature_2m_min,weathercode&forecast_days=${days}&timezone=auto`,
    );

    if (!weatherRes.ok) {
      console.error('Forecast request failed with status', weatherRes.status);
      sendReturn(event, {
        ok: false,
        text: `Entschuldigung, ich konnte die Wettervorhersage für ${trimmedCity} nicht abrufen.`,
        error_code: `FORECAST_HTTP_${weatherRes.status}`,
      });
      return;
    }

    const weatherData = await weatherRes.json();
    const daily = weatherData?.daily;

    if (
      !daily ||
      !Array.isArray(daily.time) ||
      !Array.isArray(daily.temperature_2m_min) ||
      !Array.isArray(daily.temperature_2m_max) ||
      !Array.isArray(daily.weathercode)
    ) {
      console.warn('Unexpected daily forecast structure:', weatherData);
      sendReturn(event, {
        ok: false,
        text: `Für ${trimmedCity} stehen aktuell keine vollständigen Vorhersagedaten zur Verfügung.`,
        error_code: 'INVALID_FORECAST_DATA',
      });
      return;
    }

    const displayCity = name || trimmedCity;

    const daysData = daily.time.map((date, index) => {
      const min = daily.temperature_2m_min[index];
      const max = daily.temperature_2m_max[index];
      const code = daily.weathercode[index];
      const desc = describeWeatherCode(code);

      return {
        date,
        min_temp_c: min,
        max_temp_c: max,
        weather_code: code,
        condition: desc,
      };
    });

    const lines = daysData.map((d) => {
      const min = Math.round(d.min_temp_c);
      const max = Math.round(d.max_temp_c);
      return `${d.date}: ${d.condition}, ${min}–${max}°C`;
    });

    const text =
      `Wettervorhersage für ${displayCity} (nächsten ${daysData.length} Tage):\n` +
      lines.join('\n');

    const payload = {
      ok: true,
      text,
      data: {
        city: displayCity,
        latitude,
        longitude,
        days: daysData.length,
        daily: daysData,
        source: 'open-meteo',
      },
    };

    sendReturn(event, payload);
  } catch (err) {
    console.error('Failed to fetch forecast from Open-Meteo:', err);

    const code = err?.code || err?.message || 'UNKNOWN_ERROR';
    sendReturn(event, {
      ok: false,
      text:
        'Entschuldigung, beim Abrufen der Wettervorhersage ist ein Fehler aufgetreten. ' +
        'Bitte versuche es später erneut.',
      error_code: String(code),
    });
  }
}
</script>

