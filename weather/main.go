package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	// Define metrics with city label
	tempMetric = prometheus.NewGaugeVec(prometheus.GaugeOpts{
		Name: "temperature",
		Help: "Temperature Data",
	}, []string{"city"})

	feelsLikeMetric = prometheus.NewGaugeVec(prometheus.GaugeOpts{
		Name: "feels_like",
		Help: "Feels Like Temperature",
	}, []string{"city"})

	windMetric = prometheus.NewGaugeVec(prometheus.GaugeOpts{
		Name: "wind",
		Help: "Wind Speed",
	}, []string{"city"})
)

func init() {
	// Register the metrics with Prometheus
	prometheus.MustRegister(tempMetric)
	prometheus.MustRegister(feelsLikeMetric)
	prometheus.MustRegister(windMetric)
}

func getCurrentWeather(cityID int) {
	apiKey := os.Getenv("OPENWEATHER_API_KEY")

	if apiKey == "" {
		log.Fatal("API key not found in environment")
	}

	client := http.Client{
		Timeout: 5 * time.Second,
	}

	url := fmt.Sprintf("https://api.openweathermap.org/data/2.5/weather?id=%d&appid=%s&units=metric", cityID, apiKey)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.Fatal("Error creating request:", err)
	}

	resp, err := client.Do(req)
	if err != nil {
		log.Fatal("An error occurred while making the request:", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			log.Fatal("Error reading response body:", err)
		}

		var data map[string]interface{}
		err = json.Unmarshal(body, &data)
		if err != nil {
			log.Fatal("Error decoding JSON response:", err)
		}

		// Get city name
		city, _ := data["name"].(string)

		// Get temperature data
		main, ok := data["main"].(map[string]interface{})
		if ok {
			if temp, ok := main["temp"].(float64); ok {
				tempMetric.WithLabelValues(city).Set(temp)
				// fmt.Printf("Set temperature for %s: %f\n", city, temp)
			}
			if feelsLike, ok := main["feels_like"].(float64); ok {
				feelsLikeMetric.WithLabelValues(city).Set(feelsLike)
				// fmt.Printf("Set feels like temperature for %s: %f\n", city, feelsLike)
			}
		}

		// Get wind data
		wind, ok := data["wind"].(map[string]interface{})
		if ok {
			if speed, ok := wind["speed"].(float64); ok {
				windMetric.WithLabelValues(city).Set(speed)
				// fmt.Printf("Set wind speed for %s: %f\n", city, speed)
			}
		}
	} else {
		fmt.Printf("Request failed for cityID %d with status code %d\n", cityID, resp.StatusCode)
	}
}

func gatherWeatherData(cityIDs []int) {
	for _, cityID := range cityIDs {
		getCurrentWeather(cityID)
	}
}

func metricsHandler(w http.ResponseWriter, r *http.Request) {

	log.Println("Calling weather API")

	// Array of city IDs to gather weather data for
	cityIDs := []int{
		5946768,
		5913490,
		6118158,
		6053154,
		6155033,
		6071618,
		5964347}

	// Gather weather data for the cities
	gatherWeatherData(cityIDs)

	// Serve the metrics endpoint
	promhttp.Handler().ServeHTTP(w, r)
}

func main() {
	// Start the HTTP server for Prometheus scraping
	http.HandleFunc("/metrics", metricsHandler)
	log.Fatal(http.ListenAndServe(":8181", nil))
}
