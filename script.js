const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const errorMsg = document.getElementById("errorMsg");

const WMO_CODES = {
  0: { desc: "Clear sky", icon: "01d" },
  1: { desc: "Mainly clear", icon: "01d" },
  2: { desc: "Partly cloudy", icon: "02d" },
  3: { desc: "Overcast", icon: "04d" },
  45: { desc: "Foggy", icon: "50d" },
  48: { desc: "Rime fog", icon: "50d" },
  51: { desc: "Light drizzle", icon: "09d" },
  53: { desc: "Moderate drizzle", icon: "09d" },
  55: { desc: "Dense drizzle", icon: "09d" },
  61: { desc: "Slight rain", icon: "10d" },
  63: { desc: "Moderate rain", icon: "10d" },
  65: { desc: "Heavy rain", icon: "10d" },
  71: { desc: "Slight snow", icon: "13d" },
  73: { desc: "Moderate snow", icon: "13d" },
  75: { desc: "Heavy snow", icon: "13d" },
  80: { desc: "Slight showers", icon: "09d" },
  81: { desc: "Moderate showers", icon: "09d" },
  82: { desc: "Violent showers", icon: "09d" },
  85: { desc: "Slight snow showers", icon: "13d" },
  86: { desc: "Heavy snow showers", icon: "13d" },
  95: { desc: "Thunderstorm", icon: "11d" },
  96: { desc: "Thunderstorm with hail", icon: "11d" },
  99: { desc: "Thunderstorm with heavy hail", icon: "11d" },
};

function getIcon(code) {
  const entry = WMO_CODES[code] || { icon: "01d" };
  return `https://openweathermap.org/img/wn/${entry.icon}@4x.png`;
}

function getDesc(code) {
  return (WMO_CODES[code] || { desc: "Unknown" }).desc;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDay(dateStr, i) {
  if (i === 0) return "Today";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function formatHour(timeStr) {
  const d = new Date(timeStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.style.display = "block";
}

function hideError() {
  errorMsg.textContent = "";
  errorMsg.style.display = "none";
}

function setLoading(loading) {
  searchBtn.disabled = loading;
  cityInput.disabled = loading;
  if (loading) {
    errorMsg.textContent = "Loading...";
    errorMsg.style.display = "block";
    errorMsg.style.background = "rgba(100, 150, 255, 0.2)";
    errorMsg.style.borderColor = "rgba(100, 150, 255, 0.4)";
    errorMsg.style.color = "#8ab4f8";
  } else {
    errorMsg.style.background = "";
    errorMsg.style.borderColor = "";
    errorMsg.style.color = "";
    errorMsg.textContent = "";
    errorMsg.style.display = "none";
  }
}

async function fetchWeather(city) {
  hideError();
  setLoading(true);
  try {
    const geoRes = await fetch(`${GEO_URL}?name=${encodeURIComponent(city)}&count=1`);
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      setLoading(false);
      showError("City not found. Please try again.");
      return;
    }

    const { latitude, longitude, name, country } = geoData.results[0];

    const params = new URLSearchParams({
      latitude,
      longitude,
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m",
      hourly: "temperature_2m,weather_code",
      daily: "temperature_2m_max,temperature_2m_min,weather_code",
      timezone: "auto",
      forecast_days: 6,
    });

    const weatherRes = await fetch(`${WEATHER_URL}?${params}`);
    const weatherData = await weatherRes.json();

    setLoading(false);
    renderCurrent(weatherData, name, country);
    renderHourly(weatherData);
    renderWeekly(weatherData);
  } catch (err) {
    setLoading(false);
    showError("Network error. Please check your connection.");
  }
}

function renderCurrent(data, name, country) {
  const c = data.current;
  document.getElementById("weatherIcon").src = getIcon(c.weather_code);
  document.getElementById("temperature").textContent = `${Math.round(c.temperature_2m)}\u00B0C`;
  document.getElementById("cityName").textContent = `${name}, ${country}`;
  document.getElementById("date").textContent = formatDate(c.time.split("T")[0]);
  document.getElementById("condition").textContent = getDesc(c.weather_code);
  document.getElementById("humidity").textContent = `${c.relative_humidity_2m}%`;
  document.getElementById("wind").textContent = `${Math.round(c.wind_speed_10m)} km/h`;
  document.getElementById("feelsLike").textContent = `${Math.round(c.apparent_temperature)}\u00B0`;
  document.getElementById("pressure").textContent = `${Math.round(c.surface_pressure)} hPa`;
}

function renderHourly(data) {
  const grid = document.getElementById("hourlyGrid");
  grid.innerHTML = "";
  const times = data.hourly.time;
  const temps = data.hourly.temperature_2m;
  const codes = data.hourly.weather_code;

  const nowIdx = times.findIndex((t) => new Date(t) >= new Date());
  const start = Math.max(0, nowIdx);

  for (let i = start; i < Math.min(start + 8, times.length); i++) {
    const card = document.createElement("div");
    card.className = "hour-card";
    card.innerHTML = `
      <span class="hour-time">${i === start ? "Now" : formatHour(times[i])}</span>
      <img class="hour-icon-img" src="${getIcon(codes[i])}" alt="">
      <span class="hour-temp">${Math.round(temps[i])}\u00B0</span>
    `;
    grid.appendChild(card);
  }
}

function renderWeekly(data) {
  const grid = document.getElementById("weeklyGrid");
  grid.innerHTML = "";
  const daily = data.daily;

  const allTemps = [...daily.temperature_2m_max, ...daily.temperature_2m_min];
  const globalMin = Math.min(...allTemps);
  const globalMax = Math.max(...allTemps);
  const range = globalMax - globalMin || 1;

  for (let i = 0; i < Math.min(5, daily.time.length); i++) {
    const high = Math.round(daily.temperature_2m_max[i]);
    const low = Math.round(daily.temperature_2m_min[i]);
    const barLeft = ((low - globalMin) / range) * 100;
    const barWidth = ((high - low) / range) * 100;

    const card = document.createElement("div");
    card.className = "day-card";
    card.innerHTML = `
      <span class="day-name">${formatDay(daily.time[i], i)}</span>
      <img class="day-icon-img" src="${getIcon(daily.weather_code[i])}" alt="">
      <span class="day-condition">${getDesc(daily.weather_code[i])}</span>
      <div class="day-temps">
        <span class="temp-high">${high}\u00B0</span>
        <div class="temp-bar"><div class="temp-fill" style="margin-left:${barLeft}%;width:${Math.max(barWidth, 8)}%"></div></div>
        <span class="temp-low">${low}\u00B0</span>
      </div>
    `;
    grid.appendChild(card);
  }
}

searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (city) fetchWeather(city);
  else showError("Please enter a city name.");
});

cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const city = cityInput.value.trim();
    if (city) fetchWeather(city);
    else showError("Please enter a city name.");
  }
});

fetchWeather("New York");
