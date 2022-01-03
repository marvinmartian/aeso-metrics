const axios = require("axios");

const util = require('util')
const http = require('http')
const url = require('url')

const client = require('prom-client');
// const collectDefaultMetrics = client.collectDefaultMetrics;
const Registry = client.Registry;
const register = new Registry();
// collectDefaultMetrics({ register });

register.setDefaultLabels({
  app: 'weather'
})


const temperature_metrics = new client.Gauge({
  name: 'temperature',
  help: 'Temperature Data',
  labelNames: ['city']
});
register.registerMetric(temperature_metrics);

const feels_like_temp_metrics = new client.Gauge({
  name: 'feels_like',
  help: 'Temperature Data',
  labelNames: ['city']
});
register.registerMetric(feels_like_temp_metrics);

const wind_metrics = new client.Gauge({
    name: 'wind',
    help: 'Wind Data',
    labelNames: ['city']
  });
  register.registerMetric(wind_metrics);

const API_KEY = process.env.OPENWEATHER_API_KEY;
if (!API_KEY) { 
    console.log("No API key set. Please set the environment variable OPENWEATHER_API_KEY.");
    process.exit()
}

async function getWeatherData() {

  const user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36'
  const city_array = [
    5946768,
    5913490
  ]
  // 6118158,
  // 6053154,
  // 6155033,
  // 6071618,
  // 5964347
  let req_array = [];
  
  city_array.forEach((city_id) => {
      req_array.push(axios({ url: "https://api.openweathermap.org/data/2.5/weather?id=" + city_id + "&units=metric&appid=" + API_KEY, headers: { 'User-Agent': user_agent } }))
  })

  await axios.all(req_array).then(axios.spread((...responses) => {
    responses.forEach((weather_response,index) => {
        // console.log(weather_response.data)
        temperature_metrics.set({city: weather_response.data.name},weather_response.data.main.temp);
        feels_like_temp_metrics.set({city: weather_response.data.name},weather_response.data.main.feels_like);
        wind_metrics.set({city: weather_response.data.name},weather_response.data.wind.speed);
    })
        
  }));
}

const server = http.createServer(async (req, res) => {
    // Retrieve route from request object
    const route = url.parse(req.url).pathname
    
    if (route === '/metrics') {
      // Return all metrics the Prometheus exposition format
      await getWeatherData()
      res.setHeader('Content-Type', register.contentType)
      let data = await register.metrics();
      res.end(data);

    }
  })

  // Start the HTTP server which exposes the metrics on http://localhost:8080/metrics
  server.listen(8181)