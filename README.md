# Real-Time Weather Dashboard (Asynchronous JavaScript & RESTful APIs)

A modern, responsive, real-time meteorological dashboard demonstrating asynchronous programming in JavaScript (`async`/`await`, `fetch()`, Promises) and processing nested JSON data from public REST APIs.

## 🚀 Key Features

1. **Modern Asynchronous JavaScript & REST APIs**:
   - Uses the standard **Fetch API** with clean `async`/`await` syntax.
   - Coordinates two public REST API endpoints without requiring private API keys:
     - **Open-Meteo Geocoding REST API**: `https://geocoding-api.open-meteo.com/v1/search`
     - **Open-Meteo Weather Forecast REST API**: `https://api.open-meteo.com/v1/forecast`
   - Supports HTML5 Geolocation with reverse geocoding fallback for 1-click "My Location" weather retrieval.

2. **Comprehensive Error Handling**:
   - HTTP response status validation (`response.ok`, status code handling).
   - Validation for empty or invalid search queries (e.g., misspelled or non-existent cities).
   - Device location permission / GPS timeout error recovery.
   - Visual user feedback for loading spinners and error states.

3. **Parsing Complex Nested JSON Objects**:
   - Unpacks nested objects: `current`, `hourly`, and `daily` time series.
   - Maps WMO weather code integers (0–99) to human-readable weather descriptions and dynamic icons.
   - Parallel array mapping to render:
     - **Current Metrics**: Temperature, Feels Like, Humidity, Wind speed & direction compass, Pressure, Cloud cover.
     - **24-Hour Timeline Forecast**: Horizontally scrollable hourly cards with rain probability.
     - **7-Day Outlook**: Daily min/max temperature forecasts.

4. **Interactive UI & Features**:
   - City search with real-time feedback.
   - Metric / Imperial temperature toggle (°C / °F).
   - Recent search chips stored in `localStorage`.
   - Built-in **REST API Inspector** displaying raw JSON payloads with a one-click copy button.

## 📂 Project Structure

- `index.html` - Semantic dashboard structure, input controls, metric cards, forecast grids, and API inspector.
- `style.css` - Modern glassmorphism UI design, responsive layout, custom scrollbars, and animations.
- `app.js` - Asynchronous application logic, API calls, error boundaries, state management, and DOM rendering.

## 🖥️ How to Run

You can open `index.html` directly in any web browser, or serve it using any HTTP server:

```bash
# Using Python:
python -m http.server 3000

# Using Node.js npx:
npx serve .
```
Then visit `http://localhost:3000` in your web browser.

