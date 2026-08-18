const API_KEY = "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";
const BASE_URL = "https://api.openweathermap.org/data/2.5";

const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const errorMsg = document.getElementById("errorMsg");

function formatDate(timestamp, tz) {
  const d = new Date((timestamp + tz) * 1000);
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  };
  return d.toLocaleDateString("en-US", options);
}

function formatDay(timestamp, tz) {
  const d = new Date((timestamp + (tz || 0)) * 1000);
  return d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

function formatHour(timestamp, tz) {
  const d = new Date((timestamp + (tz || 0)) * 1000);
  return d.toLocaleTimeString("en-US", { hour: "numeric", hour12: true, timeZone: "UTC" });
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
    const [currentRes, forecastRes] = await Promise.all([
      fetch(`${BASE_URL}/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`),
      fetch(`${BASE_URL}/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`)
    ]);

    setLoading(false);

    if (!currentRes.ok) {
      if (currentRes.status === 404) showError("City not found. Please try again.");
      else showError("Failed to fetch weather data.");
      return;
    }

    if (!forecastRes.ok) {
      showError("Failed to fetch forecast data.");
      return;
    }

    const currentData = await currentRes.json();
    const forecastData = await forecastRes.json();

    renderCurrent(currentData);
    renderHourly(forecastData, currentData.timezone);
    renderWeekly(forecastData, currentData.timezone);
  } catch (err) {
    setLoading(false);
    showError("Network error. Please check your connection.");
  }
}

function renderCurrent(data) {
  if (!data || !data.weather || !data.weather[0] || !data.main || !data.sys || !data.wind) {
    showError("Incomplete weather data received.");
    return;
  }
  document.getElementById("weatherIcon").src =
    `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;
  document.getElementById("temperature").textContent =
    `${Math.round(data.main.temp)}\u00B0C`;
  document.getElementById("cityName").textContent =
    `${data.name}, ${data.sys.country}`;
  document.getElementById("date").textContent =
    formatDate(data.dt, data.timezone);
  document.getElementById("condition").textContent =
    data.weather[0].description.charAt(0).toUpperCase() +
    data.weather[0].description.slice(1);
  document.getElementById("humidity").textContent = `${data.main.humidity}%`;
  document.getElementById("wind").textContent =
    `${Math.round(data.wind.speed * 3.6)} km/h`;
  document.getElementById("feelsLike").textContent =
    `${Math.round(data.main.feels_like)}\u00B0`;
  document.getElementById("pressure").textContent = `${data.main.pressure} hPa`;
}

function renderHourly(data, tz) {
  const grid = document.getElementById("hourlyGrid");
  grid.innerHTML = "";
  if (!data || !data.list || !Array.isArray(data.list)) return;

  const nowUtc = Math.floor(Date.now() / 1000);
  const upcoming = data.list.filter((item) => item.dt >= nowUtc).slice(0, 8);

  if (upcoming.length === 0) return;

  upcoming.forEach((item, i) => {
    const card = document.createElement("div");
    card.className = "hour-card";
    card.innerHTML = `
      <span class="hour-time">${i === 0 ? "Now" : formatHour(item.dt, tz)}</span>
      <img class="hour-icon-img" src="https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png" alt="">
      <span class="hour-temp">${Math.round(item.main.temp)}\u00B0</span>
    `;
    grid.appendChild(card);
  });
}

function renderWeekly(data, tz) {
  const grid = document.getElementById("weeklyGrid");
  grid.innerHTML = "";
  if (!data || !data.list || !Array.isArray(data.list) || data.list.length === 0) return;

  const dailyMap = {};
  data.list.forEach((item) => {
    const d = new Date((item.dt + tz) * 1000);
    const dateKey = d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = {
        temps: [],
        icons: [],
        conditions: [],
        date: item.dt,
      };
    }
    dailyMap[dateKey].temps.push(item.main.temp);
    dailyMap[dateKey].icons.push(item.weather[0].icon);
    dailyMap[dateKey].conditions.push(item.weather[0].description);
  });

  const days = Object.values(dailyMap).slice(0, 5);
  if (days.length === 0) return;

  const allTemps = days.flatMap((d) => d.temps);
  const globalMin = Math.min(...allTemps);
  const globalMax = Math.max(...allTemps);
  const range = globalMax - globalMin || 1;

  days.forEach((day, i) => {
    const high = Math.round(Math.max(...day.temps));
    const low = Math.round(Math.min(...day.temps));
    const midIcon = day.icons[Math.floor(day.icons.length / 2)];
    const midCondition = day.conditions[Math.floor(day.conditions.length / 2)];
    const barLeft = ((low - globalMin) / range) * 100;
    const barWidth = ((high - low) / range) * 100;

    const card = document.createElement("div");
    card.className = "day-card";
    card.innerHTML = `
      <span class="day-name">${i === 0 ? "Today" : formatDay(day.date, tz)}</span>
      <img class="day-icon-img" src="https://openweathermap.org/img/wn/${midIcon}@2x.png" alt="">
      <span class="day-condition">${midCondition.charAt(0).toUpperCase() + midCondition.slice(1)}</span>
      <div class="day-temps">
        <span class="temp-high">${high}\u00B0</span>
        <div class="temp-bar"><div class="temp-fill" style="margin-left:${barLeft}%;width:${Math.max(barWidth, 8)}%"></div></div>
        <span class="temp-low">${low}\u00B0</span>
      </div>
    `;
    grid.appendChild(card);
  });
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
