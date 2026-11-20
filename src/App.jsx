import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import "leaflet/dist/leaflet.css";
import "./App.css";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function MapClick({ onChoose }) {
  useMapEvents({
    click(event) {
      onChoose(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function weatherIcon(code) {
  if (code === 0) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code))
    return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code))
    return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌈";
}

function App() {
  const [city, setCity] = useState("Chennai");
  const [search, setSearch] = useState("");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unit, setUnit] = useState("C");

  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("weatherFavorites")) || [];
    } catch {
      return [];
    }
  });

  const [position, setPosition] = useState([13.0827, 80.2707]);

  async function loadWeather(latitude, longitude, placeName) {
    setLoading(true);
    setError("");

    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}` +
        `&longitude=${longitude}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m` +
        `&hourly=temperature_2m,precipitation_probability` +
        `&daily=sunrise,sunset,weather_code,temperature_2m_max,temperature_2m_min` +
        `&timezone=auto&forecast_days=5`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Weather information is unavailable.");
      }

      const data = await response.json();

      setWeather({
        ...data.current,
        daily: data.daily,
        latitude,
        longitude,
        name: placeName,
      });

      const chartData = data.hourly.time.slice(0, 24).map((time, index) => ({
        time: new Date(time).toLocaleTimeString([], {
          hour: "numeric",
          hour12: true,
        }),
        temperature: data.hourly.temperature_2m[index],
        rain: data.hourly.precipitation_probability[index],
      }));

      setForecast(chartData);
      setCity(placeName);
      setPosition([latitude, longitude]);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function searchCity(event) {
    event.preventDefault();

    if (!search.trim()) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(search)}&count=1&language=en&format=json`
      );

      const data = await response.json();

      if (!data.results?.length) {
        throw new Error("City not found. Try another city name.");
      }

      const place = data.results[0];

      await loadWeather(
        place.latitude,
        place.longitude,
        `${place.name}${place.country ? ", " + place.country : ""}`
      );

      setSearch("");
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  function chooseMapLocation(lat, lon) {
    loadWeather(lat, lon, "Selected map location");
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Location is not supported by your browser.");
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      (result) => {
        loadWeather(
          result.coords.latitude,
          result.coords.longitude,
          "My current location"
        );
      },
      () => {
        setLoading(false);
        setError("Location permission was denied. Search for a city instead.");
      }
    );
  }

  function toggleFavorite() {
    if (!weather) return;

    const exists = favorites.some((item) => item.name === city);

    const updated = exists
      ? favorites.filter((item) => item.name !== city)
      : [
          ...favorites,
          {
            name: city,
            latitude: weather.latitude,
            longitude: weather.longitude,
          },
        ];

    setFavorites(updated);
    localStorage.setItem("weatherFavorites", JSON.stringify(updated));
  }

  function openFavorite(place) {
    loadWeather(place.latitude, place.longitude, place.name);
  }

  function temperature(value) {
    if (value === undefined || value === null) return "--";

    const converted =
      unit === "F" ? (value * 9) / 5 + 32 : value;

    return `${Math.round(converted)}°${unit}`;
  }

  useEffect(() => {
    loadWeather(13.0827, 80.2707, "Chennai");
  }, []);

  const isFavorite = favorites.some((item) => item.name === city);

  return (
    <main className="app">
      <div className="glow glow-one"></div>
      <div className="glow glow-two"></div>

      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">✦</span>
          <span>
            AETHER<span className="brand-light"> WEATHER</span>
          </span>
        </div>

        <div className="live-badge">
          <span className="live-dot"></span>
          LIVE WEATHER
        </div>
      </header>

      {/* ROTATING 3D EARTH */}

      <section className="earth-section">
        <div className="earth-orbit orbit-one"></div>
        <div className="earth-orbit orbit-two"></div>

        <div className="earth-glow">
          <div className="earth">
            <div className="earth-clouds"></div>
          </div>
        </div>

        <p className="earth-caption">EXPLORE OUR PLANET</p>
        <h2>One World. Endless Weather.</h2>
        <p className="earth-description">
          Discover the atmosphere around the globe.
        </p>
      </section>

      <section className="hero">
        <p className="eyebrow">WEATHER INTELLIGENCE</p>

        <h1>
          Today's atmosphere<span>.</span>
        </h1>

        <p className="subtitle">
          Explore the sky, discover the forecast, and follow the world.
        </p>

        <form className="search-box" onSubmit={searchCity}>
          <span>⌕</span>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search any city worldwide..."
          />

          <button type="submit">Search ↗</button>
        </form>

        <button className="location-button" onClick={useMyLocation}>
          ◎ Use my current location
        </button>
      </section>

      {error && <div className="error-message">{error}</div>}

      {loading && (
        <div className="loading">
          Gathering weather intelligence...
        </div>
      )}

      {weather && (
        <>
          <section className="weather-card glass">
            <div className="weather-main">
              <div>
                <p className="eyebrow">CURRENT LOCATION</p>
                <h2>{city}</h2>

                <p className="condition">
                  {weatherIcon(weather.weather_code)} Weather right now
                </p>
              </div>

              <div className="temperature-area">
                <div className="temperature">
                  {temperature(weather.temperature_2m)}
                </div>

                <p>
                  Feels like {temperature(weather.apparent_temperature)}
                </p>

                <div className="unit-switch">
                  <button
                    className={unit === "C" ? "selected" : ""}
                    onClick={() => setUnit("C")}
                  >
                    °C
                  </button>

                  <button
                    className={unit === "F" ? "selected" : ""}
                    onClick={() => setUnit("F")}
                  >
                    °F
                  </button>
                </div>
              </div>
            </div>

            <button className="favorite-button" onClick={toggleFavorite}>
              {isFavorite ? "♥ Saved to favourites" : "♡ Add to favourites"}
            </button>

            <div className="stats-grid">
              <div className="stat">
                <span>💧</span>
                <p>Humidity</p>
                <strong>{weather.relative_humidity_2m}%</strong>
              </div>

              <div className="stat">
                <span>💨</span>
                <p>Wind speed</p>
                <strong>{weather.wind_speed_10m} km/h</strong>
              </div>

              <div className="stat">
                <span>🌧️</span>
                <p>Precipitation</p>
                <strong>{weather.precipitation} mm</strong>
              </div>

              <div className="stat">
                <span>🧭</span>
                <p>Wind direction</p>
                <strong>{weather.wind_direction_10m}°</strong>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">YOUR DAILY OUTLOOK</p>
                <h2>Sunrise & sunset</h2>
              </div>

              <span className="section-symbol">☀️</span>
            </div>

            <div className="sun-grid">
              <div className="sun-card glass">
                <span>🌅</span>
                <p>Sunrise</p>

                <strong>
                  {new Date(weather.daily.sunrise[0]).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>
              </div>

              <div className="sun-card glass">
                <span>🌇</span>
                <p>Sunset</p>

                <strong>
                  {new Date(weather.daily.sunset[0]).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">THE NEXT 24 HOURS</p>
                <h2>Temperature journey</h2>
              </div>

              <span className="section-symbol">📈</span>
            </div>

            <div className="chart-card glass">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={forecast}>
                  <defs>
                    <linearGradient
                      id="tempGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#ffb16b"
                        stopOpacity={0.6}
                      />
                      <stop
                        offset="100%"
                        stopColor="#ff6fae"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    stroke="rgba(255,255,255,0.12)"
                    strokeDasharray="4 4"
                  />

                  <XAxis
                    dataKey="time"
                    stroke="#ffe0e9"
                    tick={{ fontSize: 11 }}
                  />

                  <YAxis stroke="#ffe0e9" tick={{ fontSize: 11 }} />

                  <Tooltip
                    contentStyle={{
                      background: "#542044",
                      border: "1px solid #ffb1c8",
                      borderRadius: "12px",
                      color: "white",
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="temperature"
                    stroke="#ffc18a"
                    strokeWidth={3}
                    fill="url(#tempGradient)"
                    name="Temperature °C"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">EXPLORE THE PLANET</p>
                <h2>Interactive world map</h2>
              </div>

              <span className="section-symbol">🌍</span>
            </div>

            <p className="map-hint">
              Tap anywhere on the map to check the weather there.
            </p>

            <div className="map-card">
              <MapContainer
                center={position}
                zoom={3}
                scrollWheelZoom={true}
                className="weather-map"
                key={`${position[0]}-${position[1]}`}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <Marker position={position} />

                <MapClick onChoose={chooseMapLocation} />
              </MapContainer>
            </div>
          </section>

          <section className="section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">YOUR PERSONAL COLLECTION</p>
                <h2>Favourite cities</h2>
              </div>

              <span className="section-symbol">♡</span>
            </div>

            {favorites.length === 0 ? (
              <div className="empty-favorites glass">
                No favourite cities yet. Search for a city and tap
                “Add to favourites”.
              </div>
            ) : (
              <div className="favorites-grid">
                {favorites.map((place) => (
                  <button
                    className="favorite-city glass"
                    key={place.name}
                    onClick={() => openFavorite(place)}
                  >
                    <span>📍</span>
                    <strong>{place.name}</strong>
                    <small>View weather ↗</small>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">FIVE-DAY PREVIEW</p>
                <h2>Coming up</h2>
              </div>

              <span className="section-symbol">☁️</span>
            </div>

            <div className="daily-grid">
              {weather.daily.time.map((day, index) => (
                <div className="day-card glass" key={day}>
                  <p>
                    {new Date(day + "T12:00:00").toLocaleDateString([], {
                      weekday: "short",
                    })}
                  </p>

                  <span>
                    {weatherIcon(weather.daily.weather_code[index])}
                  </span>

                  <strong>
                    {temperature(weather.daily.temperature_2m_max[index])}
                  </strong>

                  <small>
                    {temperature(weather.daily.temperature_2m_min[index])}
                  </small>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <footer>
        <div className="brand">
          <span className="brand-icon">✦</span>
          AETHER WEATHER
        </div>

        <p>Look beyond the clouds. Discover your atmosphere.</p>

        <small>Weather data powered by Open-Meteo.</small>
      </footer>
    </main>
  );
}

export default App;