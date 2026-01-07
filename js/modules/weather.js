
export async function initWeather() {
    const weatherContainer = document.getElementById('hero-weather');
    if (!weatherContainer) return;

    weatherContainer.innerHTML = '<span style="font-size:0.8rem; opacity:0.7;">Loading weather…</span>';

    // Cleveleys Coordinates
    const lat = 53.8167;
    const lon = -3.05;

    // API URL - Daily forecast with weather codes
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day,relative_humidity_2m,wind_speed_10m,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`Weather fetch failed (${response.status})`);
        const data = await response.json();

        const current = data.current;
        const daily = data.daily;

        if (!current || !daily) {
            throw new Error('Weather data missing');
        }

        const temp = Math.round(current.temperature_2m);
        const code = current.weather_code;
        const isDay = current.is_day;

        const iconClass = getWeatherIcon(code, isDay);
        const conditionText = getWeatherCondition(code);

        // Render Widget
        weatherContainer.innerHTML = `
            <div class="weather-icon">
                <i class="${iconClass}"></i>
            </div>
            <div class="weather-info">
                <span class="weather-temp">${temp}°C</span>
                <span class="weather-desc">${conditionText}</span>
            </div>
        `;

        weatherContainer.classList.add('loaded');
        weatherContainer.style.cursor = 'pointer';

        // Build forecast data (next 5 days)
        const forecast = [];
        for (let i = 0; i < 5 && i < daily.time.length; i++) {
            forecast.push({
                date: new Date(daily.time[i]),
                high: Math.round(daily.temperature_2m_max[i]),
                low: Math.round(daily.temperature_2m_min[i]),
                code: daily.weather_code[i],
                rainChance: daily.precipitation_probability_max[i]
            });
        }

        // Click to open modal
        weatherContainer.addEventListener('click', () => {
            showWeatherModal({
                temp,
                conditionText,
                iconClass,
                wind: current.wind_speed_10m,
                humidity: current.relative_humidity_2m,
                rain: current.precipitation,
                high: Math.round(daily.temperature_2m_max[0]),
                low: Math.round(daily.temperature_2m_min[0]),
                rainChance: daily.precipitation_probability_max[0],
                forecast
            });
        });

    } catch (error) {
        console.error('Weather Error:', error);
        let message = 'Weather unavailable';
        if (error.name === 'AbortError') {
            message = 'Weather timed out';
        }
        weatherContainer.innerHTML = `<span style="font-size:0.8rem; opacity:0.7;" title="${message}">${message}</span>`;
    }
}

function showWeatherModal(data) {
    const existing = document.getElementById('weather-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'weather-modal';
    modal.className = 'weather-modal-overlay';

    // Build forecast HTML
    const forecastHTML = data.forecast.map((day, i) => {
        const dayName = i === 0 ? 'Today' : day.date.toLocaleDateString('en-GB', { weekday: 'short' });
        const icon = getWeatherIcon(day.code, true);
        return `
            <div class="wm-forecast-day">
                <span class="wm-day-name">${dayName}</span>
                <i class="${icon}"></i>
                <span class="wm-day-temps">${day.high}° / ${day.low}°</span>
                <span class="wm-day-rain"><i class="fas fa-umbrella"></i> ${day.rainChance}%</span>
            </div>
        `;
    }).join('');

    modal.innerHTML = `
        <div class="weather-modal-card">
            <button class="weather-modal-close"><i class="fas fa-times"></i></button>
            <div class="wm-header">
                <i class="${data.iconClass} wm-main-icon"></i>
                <div class="wm-title">
                    <h2>${data.temp}°C</h2>
                    <p>${data.conditionText}</p>
                    <p class="wm-hl">H: ${data.high}° L: ${data.low}°</p>
                </div>
            </div>
            <div class="wm-grid">
                <div class="wm-item">
                    <i class="fas fa-wind"></i>
                    <span>${data.wind} km/h</span>
                    <label>Wind</label>
                </div>
                <div class="wm-item">
                    <i class="fas fa-tint"></i>
                    <span>${data.humidity}%</span>
                    <label>Humidity</label>
                </div>
                <div class="wm-item">
                    <i class="fas fa-umbrella"></i>
                    <span>${data.rainChance}%</span>
                    <label>Rain</label>
                </div>
            </div>
            <div class="wm-forecast">
                <h3>5-Day Forecast</h3>
                <div class="wm-forecast-grid">
                    ${forecastHTML}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('visible'));

    const close = () => {
        modal.classList.remove('visible');
        setTimeout(() => modal.remove(), 300);
    };

    modal.querySelector('.weather-modal-close').addEventListener('click', close);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) close();
    });
}

function getWeatherIcon(code, isDay) {
    if (code === 0) return isDay ? 'fas fa-sun' : 'fas fa-moon';
    if (code === 1 || code === 2) return isDay ? 'fas fa-cloud-sun' : 'fas fa-cloud-moon';
    if (code === 3) return 'fas fa-cloud';
    if (code >= 45 && code <= 48) return 'fas fa-smog';
    if (code >= 51 && code <= 67) return 'fas fa-cloud-rain';
    if (code >= 71 && code <= 86) return 'fas fa-snowflake';
    if (code >= 95) return 'fas fa-bolt';
    return 'fas fa-cloud-sun';
}

function getWeatherCondition(code) {
    const conditions = {
        0: 'Clear', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
        45: 'Fog', 48: 'Depositing Rime Fog',
        51: 'Light Drizzle', 53: 'Moderate Drizzle', 55: 'Dense Drizzle',
        61: 'Slight Rain', 63: 'Moderate Rain', 65: 'Heavy Rain',
        71: 'Slight Snow', 73: 'Moderate Snow', 75: 'Heavy Snow',
        95: 'Thunderstorm'
    };
    return conditions[code] || 'Unknown';
}
