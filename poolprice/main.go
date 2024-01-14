package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	poolpriceMetric = prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "poolprice",
		Help: "Current pool price",
	})
)

func init() {
	// Register the metric with Prometheus
	prometheus.MustRegister(poolpriceMetric)
}

func getCurrentPoolPrice() {
	client := http.Client{
		Timeout: 5 * time.Second,
	}

	req, err := http.NewRequest("GET", "https://www.aeso.ca/ets/ets.json", nil)
	if err != nil {
		log.Fatal("Error creating request:", err)
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36")

	resp, err := client.Do(req)
	if err != nil {
		log.Fatal("An error occurred while making the request:", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		body, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			log.Fatal("Error reading response body:", err)
		}

		var data map[string]interface{}
		err = json.Unmarshal(body, &data)
		if err != nil {
			log.Fatal("Error decoding JSON response:", err)
		}

		poolPrice, ok := data["poolprice"].([]interface{})
		if ok && len(poolPrice) > 0 {
			lastPrice, ok := poolPrice[len(poolPrice)-1].([]interface{})
			if ok && len(lastPrice) > 1 {
				poolpriceMetric.Set(lastPrice[1].(float64))
			} else {
				fmt.Println("Error setting pool price", poolPrice)
			}
		} else {
			fmt.Println("Error setting pool price", poolPrice)
		}
	} else {
		fmt.Printf("Request failed with status code %d\n", resp.StatusCode)
	}
}

func main() {
	// Start the HTTP server for Prometheus scraping
	go func() {
		http.Handle("/metrics", promhttp.Handler())
		log.Fatal(http.ListenAndServe(":8080", nil))
	}()

	// Collect and expose the poolprice metric
	getCurrentPoolPrice()

	// Do something with poolpriceStats if needed
	fmt.Println(poolpriceMetric)

	// Keep the program running to expose the metric
	select {}
}
