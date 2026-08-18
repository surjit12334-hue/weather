const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const gpsBtn = document.getElementById("gpsBtn");
const unitToggle = document.getElementById("unitToggle");
const errorMsg = document.getElementById("errorMsg");
const recentSearches = document.getElementById("recentSearches");
const recentList = document.getElementById("recentList");

let useCelsius = true;
let lastCityName = "";
let lastCountry = "";
let currentData = null;

const WMO_CODES = {
  0: { desc: "Clear sky", icon: "01d", bg: "clear", night_icon: "01n" },
  1: { desc: "Mainly clear", icon: "01d", bg: "clear", night_icon: "01n" },
  2: { desc: "Partly cloudy", icon: "02d", bg: "clouds", night_icon: "02n" },
  3: { desc: "Overcast", icon: "04d", bg: "clouds", night_icon: "04n" },
  45: { desc: "Foggy", icon: "50d", bg: "fog", night_icon: "50n" },
  48: { desc: "Rime fog", icon: "50d", bg: "fog", night_icon: "50n" },
  51: { desc: "Light drizzle", icon: "09d", bg: "rain", night_icon: "09n" },
  53: { desc: "Moderate drizzle", icon: "09d", bg: "rain", night_icon: "09n" },
  55: { desc: "Dense drizzle", icon: "09d", bg: "rain", night_icon: "09n" },
  61: { desc: "Slight rain", icon: "10d", bg: "rain", night_icon: "10n" },
  63: { desc: "Moderate rain", icon: "10d", bg: "rain", night_icon: "10n" },
  65: { desc: "Heavy rain", icon: "10d", bg: "rain", night_icon: "10n" },
  71: { desc: "Slight snow", icon: "13d", bg: "snow", night_icon: "13n" },
  73: { desc: "Moderate snow", icon: "13d", bg: "snow", night_icon: "13n" },
  75: { desc: "Heavy snow", icon: "13d", bg: "snow", night_icon: "13n" },
  80: { desc: "Slight showers", icon: "09d", bg: "rain", night_icon: "09n" },
  81: { desc: "Moderate showers", icon: "09d", bg: "rain", night_icon: "09n" },
  82: { desc: "Violent showers", icon: "09d", bg: "rain", night_icon: "09n" },
  85: { desc: "Slight snow showers", icon: "13d", bg: "snow", night_icon: "13n" },
  86: { desc: "Heavy snow showers", icon: "13d", bg: "snow", night_icon: "13n" },
  95: { desc: "Thunderstorm", icon: "11d", bg: "thunder", night_icon: "11n" },
  96: { desc: "Thunderstorm with hail", icon: "11d", bg: "thunder", night_icon: "11n" },
  99: { desc: "Thunderstorm with heavy hail", icon: "11d", bg: "thunder", night_icon: "11n" },
};

function isNightTime() {
  if (!currentData || !currentData.current) return false;
  const now = new Date();
  const timezone = currentData.timezone || "UTC";
  const localHour = parseInt(
    now.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: timezone })
  );
  return localHour < 6 || localHour >= 20;
}

function getIcon(code) {
  const entry = WMO_CODES[code] || { icon: "01d", night_icon: "01n" };
  const night = isNightTime();
  return `https://openweathermap.org/img/wn/${night ? entry.night_icon : entry.icon}@4x.png`;
}

function getDesc(code) {
  return (WMO_CODES[code] || { desc: "Unknown" }).desc;
}

function getWeatherBg(code) {
  return (WMO_CODES[code] || { bg: "clear" }).bg;
}

function celsiusToF(c) {
  return (c * 9) / 5 + 32;
}

function tempStr(c) {
  return useCelsius ? `${Math.round(c)}\u00B0C` : `${Math.round(celsiusToF(c))}\u00B0F`;
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

function formatTime(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
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
  gpsBtn.disabled = loading;
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

// Recent searches
function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem("recentSearches")) || [];
  } catch {
    return [];
  }
}

function addRecentSearch(city) {
  let recent = getRecentSearches();
  recent = recent.filter((c) => c.toLowerCase() !== city.toLowerCase());
  recent.unshift(city);
  recent = recent.slice(0, 5);
  localStorage.setItem("recentSearches", JSON.stringify(recent));
  renderRecentSearches();
}

function renderRecentSearches() {
  const recent = getRecentSearches();
  if (recent.length === 0) {
    recentSearches.style.display = "none";
    return;
  }
  recentSearches.style.display = "flex";
  recentList.innerHTML = "";
  recent.forEach((city) => {
    const chip = document.createElement("button");
    chip.className = "recent-chip";
    chip.textContent = city;
    chip.addEventListener("click", () => {
      cityInput.value = city;
      fetchWeather(city);
    });
    recentList.appendChild(chip);
  });
}

// Dynamic background & particles
function clearParticles() {
  document.querySelectorAll(".particles, .lightning, .fog-layer, .sun-rays, .star").forEach((el) => el.remove());
}

function setWeatherBackground(code, isNight) {
  clearParticles();
  const bg = getWeatherBg(code);
  document.body.className = "";

  if (isNight) {
    document.body.classList.add("bg-night");
    createStars();
  } else {
    document.body.classList.add(`bg-${bg}`);
  }

  if (bg === "rain" || bg === "thunder") createRain();
  if (bg === "snow") createSnow();
  if (bg === "clouds") createClouds();
  if (bg === "fog") createFog();
  if (bg === "clear" && !isNight) createSunRays();
  if (bg === "thunder") createLightning();
}

function createRain() {
  const container = document.createElement("div");
  container.className = "particles";
  for (let i = 0; i < 80; i++) {
    const drop = document.createElement("div");
    drop.className = "rain-drop";
    drop.style.left = Math.random() * 100 + "%";
    drop.style.height = Math.random() * 20 + 15 + "px";
    drop.style.animationDuration = Math.random() * 0.5 + 0.5 + "s";
    drop.style.animationDelay = Math.random() * 2 + "s";
    container.appendChild(drop);
  }
  document.body.appendChild(container);
}

function createSnow() {
  const container = document.createElement("div");
  container.className = "particles";
  for (let i = 0; i < 50; i++) {
    const flake = document.createElement("div");
    flake.className = "snow-flake";
    flake.style.left = Math.random() * 100 + "%";
    flake.style.width = flake.style.height = Math.random() * 6 + 3 + "px";
    flake.style.animationDuration = Math.random() * 4 + 4 + "s";
    flake.style.animationDelay = Math.random() * 5 + "s";
    flake.style.opacity = Math.random() * 0.7 + 0.3;
    container.appendChild(flake);
  }
  document.body.appendChild(container);
}

function createClouds() {
  const container = document.createElement("div");
  container.className = "particles";
  for (let i = 0; i < 6; i++) {
    const cloud = document.createElement("div");
    cloud.className = "cloud";
    cloud.style.top = Math.random() * 60 + "%";
    cloud.style.width = Math.random() * 200 + 150 + "px";
    cloud.style.height = Math.random() * 40 + 30 + "px";
    cloud.style.animationDuration = Math.random() * 20 + 20 + "s";
    cloud.style.animationDelay = Math.random() * 10 + "s";
    container.appendChild(cloud);
  }
  document.body.appendChild(container);
}

function createFog() {
  const container = document.createElement("div");
  container.className = "particles";
  for (let i = 0; i < 3; i++) {
    const fog = document.createElement("div");
    fog.className = "fog-layer";
    fog.style.top = i * 30 + "%";
    fog.style.opacity = 0.3 - i * 0.08;
    fog.style.animationDuration = 15 + i * 5 + "s";
    container.appendChild(fog);
  }
  document.body.appendChild(container);
}

function createSunRays() {
  const rays = document.createElement("div");
  rays.className = "sun-rays";
  document.body.appendChild(rays);
}

function createLightning() {
  const flash = document.createElement("div");
  flash.className = "lightning";
  document.body.appendChild(flash);
}

function createStars() {
  const container = document.createElement("div");
  container.className = "particles";
  for (let i = 0; i < 60; i++) {
    const star = document.createElement("div");
    star.className = "star";
    star.style.left = Math.random() * 100 + "%";
    star.style.top = Math.random() * 100 + "%";
    star.style.width = star.style.height = Math.random() * 2 + 1 + "px";
    star.style.animationDuration = Math.random() * 3 + 2 + "s";
    star.style.animationDelay = Math.random() * 3 + "s";
    container.appendChild(star);
  }
  document.body.appendChild(container);
}

// Fetch & render
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
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m,is_day",
      hourly: "temperature_2m,weather_code",
      daily: "temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset",
      timezone: "auto",
      forecast_days: 6,
    });

    const weatherRes = await fetch(`${WEATHER_URL}?${params}`);
    const weatherData = await weatherRes.json();

    setLoading(false);
    currentData = weatherData;
    lastCityName = name;
    lastCountry = country;

    addRecentSearch(name);
    renderCurrent(weatherData, name, country);
    renderHourly(weatherData);
    renderWeekly(weatherData);

    const isNight = weatherData.current.is_day === 0;
    setWeatherBackground(weatherData.current.weather_code, isNight);
  } catch (err) {
    setLoading(false);
    showError("Network error. Please check your connection.");
  }
}

async function fetchWeatherByCoords(lat, lon) {
  hideError();
  setLoading(true);
  try {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m,is_day",
      hourly: "temperature_2m,weather_code",
      daily: "temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset",
      timezone: "auto",
      forecast_days: 6,
    });

    const weatherRes = await fetch(`${WEATHER_URL}?${params}`);
    const weatherData = await weatherRes.json();

    const geoRes = await fetch(`${GEO_URL}?name=&count=1`);
    let name = "Your Location";
    let country = "";

    try {
      const revGeo = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=&count=1`
      );
    } catch {}

    setLoading(false);
    currentData = weatherData;
    lastCityName = name;
    lastCountry = country;

    renderCurrent(weatherData, name, country);
    renderHourly(weatherData);
    renderWeekly(weatherData);

    const isNight = weatherData.current.is_day === 0;
    setWeatherBackground(weatherData.current.weather_code, isNight);
  } catch (err) {
    setLoading(false);
    showError("Network error. Please check your connection.");
  }
}

function renderCurrent(data, name, country) {
  const c = data.current;
  document.getElementById("weatherIcon").src = getIcon(c.weather_code);
  document.getElementById("temperature").textContent = tempStr(c.temperature_2m);
  document.getElementById("cityName").textContent = country ? `${name}, ${country}` : name;
  document.getElementById("date").textContent = formatDate(c.time.split("T")[0]);
  document.getElementById("condition").textContent = getDesc(c.weather_code);
  document.getElementById("humidity").textContent = `${c.relative_humidity_2m}%`;
  document.getElementById("wind").textContent = `${Math.round(c.wind_speed_10m)} km/h`;
  document.getElementById("feelsLike").textContent = tempStr(c.apparent_temperature);
  document.getElementById("pressure").textContent = `${Math.round(c.surface_pressure)} hPa`;

  if (data.daily && data.daily.sunrise && data.daily.sunset) {
    document.getElementById("sunrise").textContent = formatTime(data.daily.sunrise[0]);
    document.getElementById("sunset").textContent = formatTime(data.daily.sunset[0]);
  }
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
      <span class="hour-temp">${tempStr(temps[i])}</span>
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
    const high = daily.temperature_2m_max[i];
    const low = daily.temperature_2m_min[i];
    const barLeft = ((low - globalMin) / range) * 100;
    const barWidth = ((high - low) / range) * 100;

    const card = document.createElement("div");
    card.className = "day-card";
    card.innerHTML = `
      <span class="day-name">${formatDay(daily.time[i], i)}</span>
      <img class="day-icon-img" src="${getIcon(daily.weather_code[i])}" alt="">
      <span class="day-condition">${getDesc(daily.weather_code[i])}</span>
      <div class="day-temps">
        <span class="temp-high">${tempStr(high)}</span>
        <div class="temp-bar"><div class="temp-fill" style="margin-left:${barLeft}%;width:${Math.max(barWidth, 8)}%"></div></div>
        <span class="temp-low">${tempStr(low)}</span>
      </div>
    `;
    grid.appendChild(card);
  }
}

function updateDisplayedTemps() {
  if (!currentData) return;
  renderCurrent(currentData, lastCityName, lastCountry);
  renderHourly(currentData);
  renderWeekly(currentData);
}

// Event listeners
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

gpsBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showError("Geolocation is not supported by your browser.");
    return;
  }
  setLoading(true);
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
    },
    () => {
      setLoading(false);
      showError("Location access denied. Please search manually.");
    }
  );
});

unitToggle.addEventListener("click", () => {
  useCelsius = !useCelsius;
  unitToggle.textContent = useCelsius ? "\u00B0C" : "\u00B0F";
  updateDisplayedTemps();
});

// Init
renderRecentSearches();
fetchWeather("New York");
