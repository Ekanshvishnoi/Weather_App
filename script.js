const apiConfig = {
  baseUrl : 'https://api.openweathermap.org/data/2.5',
  apikey : 'ce84649923acd71e5c0dcc2c73e022f5',
  units : 'metric',
  lang : 'en'
};

function buildApiUrl(endpoint, params){
  let url = `${apiConfig.baseUrl}/${endpoint}`;
  const searchParams = new URLSearchParams(params);
  searchParams.set('appid', apiConfig.apikey);
  searchParams.set('units', apiConfig.units);
  searchParams.set('lang', apiConfig.lang);
  return `${url}?${searchParams}`;
}

async function fetchCurrentWeather(city) {
  try {
    const endpoint = 'weather';
    const params = { q: city };
    const url = buildApiUrl(endpoint, params);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const rawData = await response.json();
    return parseWeatherData(rawData);
  } catch (error) {
    console.error('Error fetching current weather:', error);
    throw error;
  }
}

function displayWeather(weatherData) {
  if (!weatherData) return;

  document.getElementById('temperature-value').textContent = weatherData.temp.toFixed(1);
  document.getElementById('condition-value').textContent = weatherData.condition;
  document.getElementById('humidity-value').textContent = weatherData.humidity;
  const windSpeedKmh = (weatherData.wind_speed * 3.6).toFixed(1);
  document.getElementById('wind-speed-value').textContent = windSpeedKmh;
}

async function fetchForecast(city) {
  try {
    const endpoint = 'forecast';
    const params = { q: city };
    const url = buildApiUrl(endpoint, params);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const rawData = await response.json();
    return parseForecastData(rawData);
  } catch (error) {
    console.error('Error fetching forecast data:', error);
    throw error;
  }
}

async function fetchHistoricalData(coords) {
  try {
    const endpoint = 'onecall';
    const params = {
      lat: coords.lat,
      lon: coords.lon,
      exclude: 'minutely,hourly'
    };
    const url = buildApiUrl(endpoint, params);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const rawData = await response.json();
    return parseHistoricalData(rawData);
  } catch (error) {
    console.error('Error fetching historical data:', error);
    throw error;
  }
}

function displayForecast(forecastData) {
  if (!forecastData) return;

  const forecastContainer = document.getElementById('forecast-grid');
  const forecastHTML = `
    ${forecastData
      .map(item => `
        <div class="forecast-card">
          <p>${item.date}</p>
          <img src="http://openweathermap.org/img/wn/${item.icon}@2x.png" alt="${item.condition}">
          <div class="forecast-metrics">
            <div>High: ${item.temp_max}°C</div>
            <div>Low: ${item.temp_min}°C</div>
          </div>
        </div>
      `)
      .join('')}
  `;

  forecastContainer.innerHTML = forecastHTML;
}

function displayHistoricalData(historicalData) {
  if (!historicalData) return;

  const historicalContainer = document.querySelector('.historical-chart-container');
  historicalContainer.innerHTML = `
    <h3>Historical Data</h3>
    <canvas id="chart-canvas"></canvas>
  `;

  const dates = historicalData.labels;
  const temps = historicalData.daily.map(item => item.temp);
  const humidity = historicalData.daily.map(item => item.humidity);

  if (window.Chart) {
    new Chart(document.getElementById('chart-canvas'), {
      type: 'line',
      data: {
        labels: dates,
        datasets: [
          {
            label: 'Daily Temperature (°C)',
            data: temps,
            borderColor: '#3b82f6',
            tension: 0.1
          },
          {
            label: 'Humidity (%)',
            data: humidity,
            borderColor: '#10b981',
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            display: true
          }
        }
      }
    });
  }
}

async function getCoordinates(city) {
  try {
    const endpoint = 'weather';
    const params = { q: city };
    const url = buildApiUrl(endpoint, params);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return {
      lat: data.coord.lat,
      lon: data.coord.lon
    };
  } catch (error) {
    console.error('Error getting coordinates:', error);
    throw error;
  }
}

function parseWeatherData(weatherData) {
  if (!weatherData) return null;

  return {
    temp: weatherData.main.temp,
    feels_like: weatherData.main.feels_like,
    humidity: weatherData.main.humidity,
    wind_speed: weatherData.wind.speed,
    condition: weatherData.weather[0].description,
    icon: weatherData.weather[0].icon
  };
}

function parseForecastData(forecastData) {
  if (!forecastData) return [];

  return forecastData.list
    .filter((item, index) => index % 8 === 0)
    .map(item => ({
      date: new Date(item.dt * 1000).toLocaleDateString(),
      temp: item.main.temp,
      temp_min: item.main.temp_min,
      temp_max: item.main.temp_max,
      condition: item.weather[0].description,
      icon: item.weather[0].icon
    }));
}

function parseHistoricalData(historicalData) {
  if (!historicalData) return null;

  return {
    daily: historicalData.daily.map(item => ({
      date: new Date(item.dt * 1000).toLocaleDateString(),
      temp: item.temp.day,
      humidity: item.humidity
    })),
    labels: historicalData.daily.map(item =>
      new Date(item.dt * 1000).toLocaleDateString()
    )
  };
}

document.getElementById('search-button').addEventListener('click', async () => {
  const cityInput = document.getElementById('location-input');
  const city = cityInput.value.trim();

  if (!city) {
    alert('Please enter a city name');
    return;
  }

  let weatherData = null;
  let forecastData = null;
  let historicalData = null;
  let errorCount = 0;

  try {
    weatherData = await fetchCurrentWeather(city);
    console.log('Current weather data:', weatherData);
  } catch (error) {
    console.error('Error fetching current weather:', error);
    errorCount++;
  }

  try {
    forecastData = await fetchForecast(city);
    console.log('Forecast data:', forecastData);
  } catch (error) {
    console.error('Error fetching forecast:', error);
    errorCount++;
  }

  try {
    const coords = await getCoordinates(city);
    historicalData = await fetchHistoricalData(coords);
    console.log('Historical data:', historicalData);
  } catch (error) {
    console.error('Error fetching historical data:', error);
    errorCount++;
  }

  if (errorCount === 3) {
    alert('Failed to fetch weather data. Please check the city name.');
    return;
  }

  if (weatherData) {
    displayWeather(weatherData);
  }
  if (forecastData) {
    displayForecast(forecastData);
  }
  if (historicalData) {
    displayHistoricalData(historicalData);
  }
});

document.getElementById('location-input').addEventListener('keypress', async (e) => {
  if (e.key === 'Enter') {
    const city = e.target.value.trim();
    if (city) {
      let weatherData = null;
      let forecastData = null;
      let historicalData = null;
      let errorCount = 0;

      try {
        weatherData = await fetchCurrentWeather(city);
        console.log('Current weather data:', weatherData);
      } catch (error) {
        console.error('Error fetching current weather:', error);
        errorCount++;
      }

      try {
        forecastData = await fetchForecast(city);
        console.log('Forecast data:', forecastData);
      } catch (error) {
        console.error('Error fetching forecast:', error);
        errorCount++;
      }

      try {
        const coords = await getCoordinates(city);
        historicalData = await fetchHistoricalData(coords);
        console.log('Historical data:', historicalData);
      } catch (error) {
        console.error('Error fetching historical data:', error);
        errorCount++;
      }

      if (errorCount === 3) {
        alert('Failed to fetch weather data. Please check the city name.');
        return;
      }

      if (weatherData) {
        displayWeather(weatherData);
      }
      if (forecastData) {
        displayForecast(forecastData);
      }
      if (historicalData) {
        displayHistoricalData(historicalData);
      }
    }
  }
});
