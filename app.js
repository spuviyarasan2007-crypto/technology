/**
 * Asynchronous Weather Dashboard
 * Demonstrates:
 *  - Modern Fetch API & async/await syntax
 *  - Robust error handling (HTTP codes, network timeouts, empty results)
 *  - Parsing & dynamically rendering complex nested JSON structures
 *  - Geocoding REST API + Open-Meteo Weather Forecast REST API
 *  - Dynamic DOM manipulation & local storage state persistence
 */

// --- Global State ---
const state = {
  currentUnit: 'celsius', // 'celsius' or 'fahrenheit'
  lastWeatherData: null,
  lastGeoData: null,
  recentSearches: JSON.parse(localStorage.getItem('weather_recent_searches') || '[]'),
};

// --- WMO Weather Code Interpreter Map ---
// Translates Open-Meteo WMO weather codes into descriptive text and FontAwesome icons
const WEATHER_CODES = {
  0: { label: 'Clear Sky', icon: 'fa-sun', color: '#fbbf24' },
  1: { label: 'Mainly Clear', icon: 'fa-cloud-sun', color: '#fde047' },
  2: { label: 'Partly Cloudy', icon: 'fa-cloud-sun', color: '#93c5fd' },
  3: { label: 'Overcast', icon: 'fa-cloud', color: '#94a3b8' },
  45: { label: 'Foggy', icon: 'fa-smog', color: '#cbd5e1' },
  48: { label: 'Depositing Rime Fog', icon: 'fa-smog', color: '#cbd5e1' },
  51: { label: 'Light Drizzle', icon: 'fa-cloud-rain', color: '#60a5fa' },
  53: { label: 'Moderate Drizzle', icon: 'fa-cloud-rain', color: '#38bdf8' },
  55: { label: 'Dense Drizzle', icon: 'fa-cloud-showers-heavy', color: '#0284c7' },
  56: { label: 'Freezing Drizzle', icon: 'fa-snowflake', color: '#a5f3fc' },
  57: { label: 'Dense Freezing Drizzle', icon: 'fa-snowflake', color: '#38bdf8' },
  61: { label: 'Slight Rain', icon: 'fa-cloud-rain', color: '#38bdf8' },
  63: { label: 'Moderate Rain', icon: 'fa-cloud-showers-heavy', color: '#2563eb' },
  65: { label: 'Heavy Rain', icon: 'fa-cloud-showers-water', color: '#1d4ed8' },
  66: { label: 'Freezing Rain', icon: 'fa-snowflake', color: '#67e8f9' },
  67: { label: 'Heavy Freezing Rain', icon: 'fa-snowflake', color: '#06b6d4' },
  71: { label: 'Slight Snow Fall', icon: 'fa-snowflake', color: '#e0f2fe' },
  73: { label: 'Moderate Snow Fall', icon: 'fa-snowflake', color: '#bae6fd' },
  75: { label: 'Heavy Snow Fall', icon: 'fa-snowflake', color: '#7dd3fc' },
  77: { label: 'Snow Grains', icon: 'fa-snowflake', color: '#e0f2fe' },
  80: { label: 'Slight Rain Showers', icon: 'fa-cloud-sun-rain', color: '#38bdf8' },
  81: { label: 'Moderate Rain Showers', icon: 'fa-cloud-showers-heavy', color: '#0284c7' },
  82: { label: 'Violent Rain Showers', icon: 'fa-cloud-showers-heavy', color: '#1e40af' },
  85: { label: 'Slight Snow Showers', icon: 'fa-snowflake', color: '#bae6fd' },
  86: { label: 'Heavy Snow Showers', icon: 'fa-snowflake', color: '#7dd3fc' },
  95: { label: 'Thunderstorm', icon: 'fa-bolt', color: '#f59e0b' },
  96: { label: 'Thunderstorm with Slight Hail', icon: 'fa-cloud-bolt', color: '#ea580c' },
  99: { label: 'Thunderstorm with Heavy Hail', icon: 'fa-cloud-bolt', color: '#dc2626' },
};

function getWeatherMeta(code) {
  return WEATHER_CODES[code] || { label: 'Unknown Condition', icon: 'fa-cloud', color: '#94a3b8' };
}

// Convert wind direction degrees to compass heading
function degreesToCompass(deg) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((deg % 360) / 22.5);
  return directions[index % 16];
}

// Convert Celsius <-> Fahrenheit
function convertTemp(celsius, unit) {
  if (unit === 'fahrenheit') {
    return Math.round((celsius * 9) / 5 + 32);
  }
  return Math.round(celsius);
}

// --- DOM Elements ---
const searchForm = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const clearBtn = document.getElementById('clear-btn');
const locationBtn = document.getElementById('location-btn');
const unitToggleBtn = document.getElementById('unit-toggle');
const unitC = document.getElementById('unit-c');
const unitF = document.getElementById('unit-f');
const statusContainer = document.getElementById('status-container');
const statusCard = document.getElementById('status-card');
const statusIcon = document.getElementById('status-icon');
const statusTitle = document.getElementById('status-title');
const statusMessage = document.getElementById('status-message');
const weatherDisplay = document.getElementById('weather-display');
const chipsContainer = document.getElementById('chips-container');
const copyJsonBtn = document.getElementById('copy-json-btn');
const jsonRawDisplay = document.getElementById('json-raw-display');
const endpointUrlTag = document.getElementById('endpoint-url');

// --- Status & Loader UI Handler ---
function showLoading(msg = 'Fetching real-time meteorological data...') {
  statusContainer.classList.remove('hidden');
  statusCard.className = 'status-card loading';
  statusIcon.className = 'fa-solid fa-circle-notch fa-spin';
  statusTitle.textContent = 'Requesting Live Data';
  statusMessage.textContent = msg;
}

function showError(title, message) {
  statusContainer.classList.remove('hidden');
  statusCard.className = 'status-card error';
  statusIcon.className = 'fa-solid fa-triangle-exclamation';
  statusTitle.textContent = title;
  statusMessage.textContent = message;
  weatherDisplay.classList.add('hidden');
}

function hideStatus() {
  statusContainer.classList.add('hidden');
}

// --- Asynchronous API Functions ---

/**
 * Fetch latitude & longitude coordinates for a given city name.
 * Uses Open-Meteo Geocoding REST API (free, no auth token required).
 * Demonstrates async/await and handling HTTP response codes.
 */
async function fetchCoordinatesByCity(cityName) {
  const sanitizedCity = encodeURIComponent(cityName.trim());
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${sanitizedCity}&count=5&language=en&format=json`;

  const response = await fetch(geoUrl);

  if (!response.ok) {
    throw new Error(`Geocoding API responded with HTTP status ${response.status}`);
  }

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error(`No geographic coordinates found for "${cityName}". Please check the spelling.`);
  }

  // Return best matching location record
  return data.results[0];
}

/**
 * Reverse geocode latitude and longitude to get readable city and country.
 * Uses BigDataCloud / Open-Meteo Geocoding.
 */
async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
    if (res.ok) {
      const data = await res.json();
      return {
        name: data.city || data.locality || data.principalSubdivision || 'Current Location',
        country: data.countryName || '',
        admin1: data.principalSubdivision || '',
      };
    }
  } catch (e) {
    console.warn('Reverse geocode fallback:', e);
  }
  return { name: `Lat: ${lat.toFixed(2)}`, country: `Lon: ${lon.toFixed(2)}`, admin1: '' };
}

/**
 * Fetch real-time weather metrics and forecasts using Open-Meteo Forecast REST API.
 * Requesting nested JSON structures: current, hourly, and daily metrics.
 */
async function fetchWeatherData(latitude, longitude, timezone = 'auto') {
  const weatherEndpoint = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=${encodeURIComponent(timezone)}`;

  endpointUrlTag.textContent = `GET ${weatherEndpoint}`;

  const response = await fetch(weatherEndpoint);

  if (!response.ok) {
    throw new Error(`Weather Forecast API responded with HTTP ${response.status}: ${response.statusText}`);
  }

  const rawJson = await response.json();
  return { rawJson, url: weatherEndpoint };
}

// --- Render Nested JSON into Dashboard UI ---

function renderWeatherDashboard(geoInfo, weatherData) {
  state.lastWeatherData = weatherData;
  state.lastGeoData = geoInfo;

  const current = weatherData.current;
  const hourly = weatherData.hourly;
  const daily = weatherData.daily;
  const unit = state.currentUnit;

  // 1. Current Overview Card
  document.getElementById('city-name').textContent = geoInfo.name;
  const subText = [geoInfo.admin1, geoInfo.country].filter(Boolean).join(', ');
  document.getElementById('country-region').textContent = subText || 'Global Observation';

  // Format local observation time
  const timeStr = current.time ? new Date(current.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
  document.getElementById('local-time').innerHTML = `<i class="fa-regular fa-clock"></i> Local: ${timeStr} (${weatherData.timezone_abbreviation || weatherData.timezone})`;

  // Current Temperature & Condition
  const weatherMeta = getWeatherMeta(current.weather_code);
  const tempVal = convertTemp(current.temperature_2m, unit);
  const feelsLike = convertTemp(current.apparent_temperature, unit);

  document.getElementById('current-temp').textContent = tempVal;
  document.getElementById('display-temp-unit').textContent = unit === 'fahrenheit' ? '°F' : '°C';
  document.getElementById('weather-description').textContent = weatherMeta.label;
  document.getElementById('feels-like-temp').textContent = `${feelsLike}°`;

  // Dynamic Weather Condition Icon & Coloring
  const conditionIconEl = document.getElementById('condition-icon');
  conditionIconEl.className = `fa-solid ${weatherMeta.icon} condition-icon`;
  conditionIconEl.style.color = weatherMeta.color;

  // Today's Min / Max
  const todayMax = convertTemp(daily.temperature_2m_max[0], unit);
  const todayMin = convertTemp(daily.temperature_2m_min[0], unit);
  document.getElementById('min-temp').textContent = `${todayMin}°`;
  document.getElementById('max-temp').textContent = `${todayMax}°`;

  // 2. Metrics Grid
  // Relative Humidity
  const humidity = current.relative_humidity_2m;
  document.getElementById('humidity-val').textContent = `${humidity}%`;
  const humidityDesc = humidity < 35 ? 'Dry atmospheric air' : humidity > 70 ? 'High humidity level' : 'Normal / Comfortable';
  document.getElementById('humidity-status').textContent = humidityDesc;

  // Wind Speed & Direction
  const windKmh = current.wind_speed_10m;
  const windSpeedDisplay = unit === 'fahrenheit' ? `${Math.round(windKmh * 0.621371)} mph` : `${Math.round(windKmh)} km/h`;
  document.getElementById('wind-val').textContent = windSpeedDisplay;
  const windDirCompass = degreesToCompass(current.wind_direction_10m);
  document.getElementById('wind-dir').textContent = `Direction: ${windDirCompass} (${current.wind_direction_10m}°)`;

  // Atmospheric Pressure
  const pressure = current.pressure_msl || current.surface_pressure;
  document.getElementById('pressure-val').textContent = `${Math.round(pressure)} hPa`;

  // Precipitation & Cloud cover
  document.getElementById('precipitation-val').textContent = `${current.precipitation} mm`;
  document.getElementById('cloud-cover-val').textContent = `Cloud Cover: ${current.cloud_cover}%`;

  // 3. Hourly Forecast (Next 24 Hours)
  renderHourlyForecast(hourly, weatherData.current.time, unit);

  // 4. Daily Forecast (7-day outlook)
  renderDailyForecast(daily, unit);

  // 5. Raw JSON Inspector
  jsonRawDisplay.textContent = JSON.stringify(weatherData, null, 2);

  // Make Dashboard Visible
  hideStatus();
  weatherDisplay.classList.remove('hidden');
}

/**
 * Render the next 24 hours timeline by indexing nested parallel arrays
 * in hourly JSON: hourly.time[], hourly.temperature_2m[], hourly.weather_code[]
 */
function renderHourlyForecast(hourly, currentTimeStr, unit) {
  const container = document.getElementById('hourly-forecast-container');
  container.innerHTML = '';

  const times = hourly.time;
  const temps = hourly.temperature_2m;
  const codes = hourly.weather_code;
  const pops = hourly.precipitation_probability || [];

  // Find index closest to current hour
  const currentHourDate = new Date(currentTimeStr).getTime();
  let startIndex = times.findIndex(t => new Date(t).getTime() >= currentHourDate);
  if (startIndex === -1) startIndex = 0;

  // Show up to 24 hourly periods
  const endIndex = Math.min(startIndex + 24, times.length);

  for (let i = startIndex; i < endIndex; i++) {
    const timeObj = new Date(times[i]);
    const hourLabel = i === startIndex ? 'Now' : timeObj.toLocaleTimeString([], { hour: 'numeric' });
    const meta = getWeatherMeta(codes[i]);
    const temp = convertTemp(temps[i], unit);
    const pop = pops[i] !== undefined ? pops[i] : 0;

    const card = document.createElement('div');
    card.className = `hourly-card ${i === startIndex ? 'active-hour' : ''}`;
    card.innerHTML = `
      <span class="hour-time">${hourLabel}</span>
      <i class="fa-solid ${meta.icon} hour-icon" style="color: ${meta.color}"></i>
      <span class="hour-temp">${temp}°</span>
      <span class="hour-pop"><i class="fa-solid fa-droplet"></i> ${pop}%</span>
    `;
    container.appendChild(card);
  }
}

/**
 * Render 7-day outlook by parsing parallel daily arrays in nested JSON:
 * daily.time[], daily.weather_code[], daily.temperature_2m_max[], daily.temperature_2m_min[]
 */
function renderDailyForecast(daily, unit) {
  const container = document.getElementById('daily-forecast-container');
  container.innerHTML = '';

  const daysCount = daily.time.length;

  for (let i = 0; i < daysCount; i++) {
    const dateObj = new Date(daily.time[i] + 'T00:00:00');
    const dayName = i === 0 ? 'Today' : dateObj.toLocaleDateString([], { weekday: 'short' });
    const formattedDate = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const meta = getWeatherMeta(daily.weather_code[i]);
    const max = convertTemp(daily.temperature_2m_max[i], unit);
    const min = convertTemp(daily.temperature_2m_min[i], unit);

    const card = document.createElement('div');
    card.className = 'daily-card';
    card.innerHTML = `
      <span class="daily-day">${dayName}</span>
      <span class="daily-date">${formattedDate}</span>
      <i class="fa-solid ${meta.icon} daily-icon" style="color: ${meta.color}"></i>
      <div class="daily-temps">
        <span class="daily-max">${max}°</span>
        <span class="daily-min">${min}°</span>
      </div>
      <span class="daily-condition" title="${meta.label}">${meta.label}</span>
    `;
    container.appendChild(card);
  }
}

// --- Controller Function: Fetch & Update ---
async function searchCityWeather(cityName) {
  if (!cityName || !cityName.trim()) return;

  const cleanCity = cityName.trim();
  showLoading(`Searching for "${cleanCity}" & loading live forecast...`);

  try {
    // 1. Asynchronous Call: Get Coordinates
    const geoInfo = await fetchCoordinatesByCity(cleanCity);

    // 2. Asynchronous Call: Get Live Forecast
    const { rawJson } = await fetchWeatherData(geoInfo.latitude, geoInfo.longitude, geoInfo.timezone || 'auto');

    // 3. Render Dashboard with nested JSON
    renderWeatherDashboard(geoInfo, rawJson);

    // 4. Save to Recent Searches
    saveRecentSearch(geoInfo.name);
  } catch (error) {
    console.error('Weather dashboard error:', error);
    showError('Unable to Load Weather', error.message || 'A network error occurred. Please verify your connection.');
  }
}

// --- Geolocation Support ---
async function fetchWeatherByCurrentLocation() {
  if (!navigator.geolocation) {
    showError('Geolocation Unavailable', 'Your browser does not support HTML5 Geolocation.');
    return;
  }

  showLoading('Acquiring device GPS coordinates...');

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        showLoading('Resolving location details & meteorological telemetry...');

        const geoInfo = await reverseGeocode(latitude, longitude);
        geoInfo.latitude = latitude;
        geoInfo.longitude = longitude;

        const { rawJson } = await fetchWeatherData(latitude, longitude);
        renderWeatherDashboard(geoInfo, rawJson);
        saveRecentSearch(geoInfo.name);
      } catch (err) {
        showError('Telemetry Error', err.message || 'Failed to fetch weather for your current position.');
      }
    },
    (geoError) => {
      let msg = 'Failed to retrieve location.';
      if (geoError.code === geoError.PERMISSION_DENIED) {
        msg = 'Location access permission was denied. You can search by city name instead.';
      } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
        msg = 'GPS / Location information is currently unavailable.';
      } else if (geoError.code === geoError.TIMEOUT) {
        msg = 'Device location request timed out.';
      }
      showError('Location Request Refused', msg);
    },
    { timeout: 10000, enableHighAccuracy: true }
  );
}

// --- Recent Searches Storage & Chips ---
function saveRecentSearch(cityName) {
  if (!cityName) return;
  const filtered = state.recentSearches.filter(item => item.toLowerCase() !== cityName.toLowerCase());
  filtered.unshift(cityName);
  state.recentSearches = filtered.slice(0, 6);
  localStorage.setItem('weather_recent_searches', JSON.stringify(state.recentSearches));
  renderRecentChips();
}

function renderRecentChips() {
  chipsContainer.innerHTML = '';
  if (state.recentSearches.length === 0) {
    const defaults = ['London', 'New York', 'Tokyo', 'Sydney', 'Paris'];
    defaults.forEach(city => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'city-chip';
      chip.textContent = city;
      chip.addEventListener('click', () => {
        cityInput.value = city;
        searchCityWeather(city);
      });
      chipsContainer.appendChild(chip);
    });
    return;
  }

  state.recentSearches.forEach(city => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'city-chip';
    chip.textContent = city;
    chip.addEventListener('click', () => {
      cityInput.value = city;
      searchCityWeather(city);
    });
    chipsContainer.appendChild(chip);
  });
}

// --- Unit Toggle Handler ---
function setUnit(unit) {
  if (state.currentUnit === unit) return;
  state.currentUnit = unit;

  if (unit === 'celsius') {
    unitC.classList.add('active');
    unitF.classList.remove('active');
  } else {
    unitF.classList.add('active');
    unitC.classList.remove('active');
  }

  // Re-render dashboard if we have active data
  if (state.lastWeatherData && state.lastGeoData) {
    renderWeatherDashboard(state.lastGeoData, state.lastWeatherData);
  }
}

// --- Event Listeners ---
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const query = cityInput.value;
  searchCityWeather(query);
});

cityInput.addEventListener('input', () => {
  if (cityInput.value.length > 0) {
    clearBtn.classList.remove('hidden');
  } else {
    clearBtn.classList.add('hidden');
  }
});

clearBtn.addEventListener('click', () => {
  cityInput.value = '';
  clearBtn.classList.add('hidden');
  cityInput.focus();
});

locationBtn.addEventListener('click', () => {
  fetchWeatherByCurrentLocation();
});

unitToggleBtn.addEventListener('click', () => {
  const nextUnit = state.currentUnit === 'celsius' ? 'fahrenheit' : 'celsius';
  setUnit(nextUnit);
});

copyJsonBtn.addEventListener('click', async () => {
  if (!state.lastWeatherData) return;
  try {
    await navigator.clipboard.writeText(JSON.stringify(state.lastWeatherData, null, 2));
    const originalText = copyJsonBtn.innerHTML;
    copyJsonBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
    setTimeout(() => {
      copyJsonBtn.innerHTML = originalText;
    }, 2000);
  } catch (err) {
    console.error('Clipboard copy failed:', err);
  }
});

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  renderRecentChips();
  // Load default city on launch (London)
  searchCityWeather('London');
});

