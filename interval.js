const axios = require("axios");
const cheerio = require("cheerio");

const util = require('util')
const http = require('http')
const url = require('url')

const client = require('prom-client');
const collectDefaultMetrics = client.collectDefaultMetrics;
const Registry = client.Registry;
const register = new Registry();

// collectDefaultMetrics({ register });

register.setDefaultLabels({
  app: 'alberta-energy'
})

const poolprice_stats = new client.Gauge({
  name: 'poolprice',
  help: 'Pool price per MWh'
});
register.registerMetric(poolprice_stats);

const generation_mc_stats = new client.Gauge({
    name: 'generation_mc',
    help: 'Generation Maximum Capacity',
    labelNames: ['group']
  });
register.registerMetric(generation_mc_stats);

const generation_tng_stats = new client.Gauge({
    name: 'generation_tng',
    help: 'Generation Total Net Generation',
    labelNames: ['group']
  });
register.registerMetric(generation_tng_stats);

const generation_dnc_stats = new client.Gauge({
    name: 'generation_dnc',
    help: 'Generation Dispatched (and Accepted) Contingency Reserve',
    labelNames: ['group']
  });
register.registerMetric(generation_dnc_stats);

// ##############

const interchange_stats = new client.Gauge({
    name: 'interchange',
    help: 'Interchange Actual Flow',
    labelNames: ['location']
  });
register.registerMetric(interchange_stats);

// ##############

const coal_mc_stats = new client.Gauge({
    name: 'coal_mc_stats',
    help: 'Coal Maximum Capacity',
    labelNames: ['asset',]
  });
register.registerMetric(coal_mc_stats);

const coal_tng_stats = new client.Gauge({
    name: 'coal_tng_stats',
    help: 'Coal Total Net Generation',
    labelNames: ['asset']
  });
register.registerMetric(coal_tng_stats);

const coal_dnc_stats = new client.Gauge({
    name: 'coal_dnc_stats',
    help: 'Coal Dispatched (and Accepted) Contingency Reserve',
    labelNames: ['asset']
  });
register.registerMetric(coal_dnc_stats);

// ##############

const gas_mc_stats = new client.Gauge({
    name: 'gas_mc_stats',
    help: 'Gas Maximum Capacity',
    labelNames: ['asset', 'type']
  });
register.registerMetric(gas_mc_stats);

const gas_tng_stats = new client.Gauge({
    name: 'gas_tng_stats',
    help: 'Gas Total Net Generation',
    labelNames: ['asset', 'type']
  });
register.registerMetric(gas_tng_stats);

const gas_dnc_stats = new client.Gauge({
    name: 'gas_dnc_stats',
    help: 'Gas Dispatched (and Accepted) Contingency Reserve',
    labelNames: ['asset', 'type']
  });
register.registerMetric(gas_dnc_stats);

// ##############

const hydro_mc_stats = new client.Gauge({
    name: 'hydro_mc_stats',
    help: 'Hydro Maximum Capacity',
    labelNames: ['asset',]
  });
register.registerMetric(hydro_mc_stats);

const hydro_tng_stats = new client.Gauge({
    name: 'hydro_tng_stats',
    help: 'Hydro Total Net Generation',
    labelNames: ['asset']
  });
register.registerMetric(hydro_tng_stats);

const hydro_dnc_stats = new client.Gauge({
    name: 'hydro_dnc_stats',
    help: 'Hydro Dispatched (and Accepted) Contingency Reserve',
    labelNames: ['asset']
  });
register.registerMetric(hydro_dnc_stats);

// ##############

const wind_mc_stats = new client.Gauge({
    name: 'wind_mc_stats',
    help: 'Wind Maximum Capacity',
    labelNames: ['asset',]
  });
register.registerMetric(wind_mc_stats);

const wind_tng_stats = new client.Gauge({
    name: 'wind_tng_stats',
    help: 'Wind Total Net Generation',
    labelNames: ['asset']
  });
register.registerMetric(wind_tng_stats);

const wind_dnc_stats = new client.Gauge({
    name: 'wind_dnc_stats',
    help: 'Wind Dispatched (and Accepted) Contingency Reserve',
    labelNames: ['asset']
  });
register.registerMetric(wind_dnc_stats);

// ##############

const other_mc_stats = new client.Gauge({
    name: 'other_mc_stats',
    help: 'Biomass/Other Maximum Capacity',
    labelNames: ['asset',]
  });
register.registerMetric(other_mc_stats);

const other_tng_stats = new client.Gauge({
    name: 'other_tng_stats',
    help: 'Biomass/Other Total Net Generation',
    labelNames: ['asset']
  });
register.registerMetric(other_tng_stats);

const other_dnc_stats = new client.Gauge({
    name: 'other_dnc_stats',
    help: 'Biomass/Other Dispatched (and Accepted) Contingency Reserve',
    labelNames: ['asset']
  });
register.registerMetric(other_dnc_stats);

async function getCurrentPoolPrice() {
  let response = await axios( { url: "https://www.aeso.ca/ets/ets.json", 
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36' }});

  var data = response.data;
  // console.log(data);
  if ( data.poolprice && data.poolprice instanceof Array && data.poolprice.length > 0 && data.poolprice[data.poolprice.length -1][1]) {
    poolprice_stats.set(data.poolprice[data.poolprice.length -1][1]);  
  } else { 
    console.log('Error setting pool price',data.poolprice);
  }
  // poolprice_stats.set(data.poolprice[data.poolprice.length -1][1]);
  // console.log(data.poolprice[data.poolprice.length -1][1]);
}

async function getCurrentStats() {
    let response = await axios( { url: "http://ets.aeso.ca/ets_web/ip/Market/Reports/CSDReportServlet", 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36' }});
    // console.log("Response:", response.data);
    var data = response.data;
    var $ = cheerio.load(data);
    var aeso_stats_array = {};

    var aeso_summary_table = $('body > table:nth-child(9) > tbody > tr > td:nth-child(1) > table > tbody').children();
    aeso_stats_array.summary = {};
    aeso_summary_table.each(function (i, elem) {
        if ( i > 0) {
            let row_data = $(this).children('td').toArray()
            aeso_stats_array.summary[$(row_data[0]).text()] = $(row_data[1]).text()
        }
    });

    var aeso_generation_table = $('body > table:nth-child(9) > tbody > tr > td:nth-child(2) > table > tbody').children();
    aeso_stats_array.generation = {};
    aeso_generation_table.each(function (i, elem) {
        if ( i > 1) {
            let row_data = $(this).children('td').toArray()
            generation_mc_stats.set({group: $(row_data[0]).text() },parseInt($(row_data[1]).text()));
            generation_tng_stats.set({group: $(row_data[0]).text() },parseInt($(row_data[2]).text()));
            generation_dnc_stats.set({group: $(row_data[0]).text() },parseInt($(row_data[3]).text()));            
            aeso_stats_array.generation[$(row_data[0]).text()] = { 'MC': $(row_data[1]).text(), 'TNG': $(row_data[2]).text(), 'DCR': $(row_data[3]).text() }
        }
    });



    var aeso_interchange_table = $('body > table:nth-child(9) > tbody > tr > td:nth-child(3) > table > tbody').children();
    aeso_stats_array.interchange = {};
    aeso_interchange_table.each(function (i, elem) {
        if ( i > 1) {
            let row_data = $(this).children('td').toArray()
            interchange_stats.set({location: $(row_data[0]).text() },parseInt($(row_data[1]).text()));
            aeso_stats_array.interchange[$(row_data[0]).text()] = $(row_data[1]).text()
        }
    });



    var aeso_coal_table = $('body > table:nth-child(10) > tbody > tr > td:nth-child(1) > table > tbody > tr > td:nth-child(1) > table > tbody').children();
    aeso_stats_array.coal = {};
    aeso_coal_table.each(function (i, elem) {
        if ( i > 1) {
            let row_data = $(this).children('td').toArray()
            coal_mc_stats.set({asset: $(row_data[0]).text() },parseInt($(row_data[1]).text()));
            coal_tng_stats.set({asset: $(row_data[0]).text() },parseInt($(row_data[2]).text()));
            coal_dnc_stats.set({asset: $(row_data[0]).text() },parseInt($(row_data[3]).text()));      
            aeso_stats_array.coal[$(row_data[0]).text()] = { 'MC': $(row_data[1]).text(), 'TNG': $(row_data[2]).text(), 'DCR': $(row_data[3]).text() }
        }
    });


    var aeso_gas_table = $('body > table:nth-child(10) > tbody > tr > td:nth-child(1) > table > tbody > tr > td:nth-child(2) > table > tbody').children();
    aeso_stats_array.gas = { 'Simple': {}, 'Cogeneration': {}, 'Combined': {} };
    var active = 'simple';
    aeso_gas_table.each(function (i, elem) {
        
        let row_data = $(this).children('td').toArray()
        // let row_name = $(row_data[0]).text().replace(/[^a-zA-Z0-9 ]/g, "").replace(/ /g,"_");
        let row_name = $(row_data[0]).text();
        if ( i >= 3 && i <= 31 ) {
            aeso_stats_array.gas.Simple[`${row_name}`] = { 'MC': $(row_data[1]).text(), 'TNG': $(row_data[2]).text(), 'DCR': $(row_data[3]).text() }
            gas_mc_stats.set({asset: $(row_data[0]).text(), type: 'Simple' },parseInt($(row_data[1]).text()));
            gas_tng_stats.set({asset: $(row_data[0]).text(), type: 'Simple' },parseInt($(row_data[2]).text()));
            gas_dnc_stats.set({asset: $(row_data[0]).text(), type: 'Simple' },parseInt($(row_data[3]).text()));
        }

        if ( i >= 34 && i <= 70 ) {
            aeso_stats_array.gas.Cogeneration[`${row_name}`] = { 'MC': $(row_data[1]).text(), 'TNG': $(row_data[2]).text(), 'DCR': $(row_data[3]).text() }
            gas_mc_stats.set({asset: $(row_data[0]).text(), type: 'Cogeneration' },parseInt($(row_data[1]).text()));
            gas_tng_stats.set({asset: $(row_data[0]).text(), type: 'Cogeneration' },parseInt($(row_data[2]).text()));
            gas_dnc_stats.set({asset: $(row_data[0]).text(), type: 'Cogeneration' },parseInt($(row_data[3]).text()));
        }

        if ( i >= 73 && i <= 78 ) {
            aeso_stats_array.gas.Combined[`${row_name}`] = { 'MC': $(row_data[1]).text(), 'TNG': $(row_data[2]).text(), 'DCR': $(row_data[3]).text() }
            gas_mc_stats.set({asset: $(row_data[0]).text(), type: 'Combined' },parseInt($(row_data[1]).text()));
            gas_tng_stats.set({asset: $(row_data[0]).text(), type: 'Combined' },parseInt($(row_data[2]).text()));
            gas_dnc_stats.set({asset: $(row_data[0]).text(), type: 'Combined' },parseInt($(row_data[3]).text()));
        }


    });


    var aeso_hydro_table = $('body > table:nth-child(10) > tbody > tr > td:nth-child(2) > table > tbody > tr:nth-child(1) > td > table > tbody').children();
    aeso_stats_array.hydro = {};
    aeso_hydro_table.each(function (i, elem) {
        if ( i > 1) {
            let row_data = $(this).children('td').toArray()
            hydro_mc_stats.set({asset: $(row_data[0]).text() },parseInt($(row_data[1]).text()));
            hydro_tng_stats.set({asset: $(row_data[0]).text() },parseInt($(row_data[2]).text()));
            hydro_dnc_stats.set({asset: $(row_data[0]).text() },parseInt($(row_data[3]).text()));  
            aeso_stats_array.hydro[$(row_data[0]).text()] = { 'MC': $(row_data[1]).text(), 'TNG': $(row_data[2]).text(), 'DCR': $(row_data[3]).text() }
        }
    });


    var aeso_wind_table = $('body > table:nth-child(10) > tbody > tr > td:nth-child(2) > table > tbody > tr:nth-child(2) > td > table > tbody').children();
    aeso_stats_array.wind = {};
    aeso_wind_table.each(function (i, elem) {
        if ( i > 1) {
            let row_data = $(this).children('td').toArray()
            wind_mc_stats.set({asset: $(row_data[0]).text() },parseInt($(row_data[1]).text()));
            wind_tng_stats.set({asset: $(row_data[0]).text() },parseInt($(row_data[2]).text()));
            wind_dnc_stats.set({asset: $(row_data[0]).text() },parseInt($(row_data[3]).text())); 
            aeso_stats_array.wind[$(row_data[0]).text()] = { 'MC': $(row_data[1]).text(), 'TNG': $(row_data[2]).text(), 'DCR': $(row_data[3]).text() }
        }
    });

    
    var aeso_biomass_table = $('body > table:nth-child(10) > tbody > tr > td:nth-child(2) > table > tbody > tr:nth-child(3) > td > table > tbody').children();
    aeso_stats_array.other = {};
    aeso_biomass_table.each(function (i, elem) {
        if ( i > 1) {
            let row_data = $(this).children('td').toArray()
            other_mc_stats.set({asset: $(row_data[0]).text() },parseInt($(row_data[1]).text()));
            other_tng_stats.set({asset: $(row_data[0]).text() },parseInt($(row_data[2]).text()));
            other_dnc_stats.set({asset: $(row_data[0]).text() },parseInt($(row_data[3]).text())); 
            aeso_stats_array.other[$(row_data[0]).text()] = { 'MC': $(row_data[1]).text(), 'TNG': $(row_data[2]).text(), 'DCR': $(row_data[3]).text() }
        }
    });

    // console.log('---requested---');
    // console.log(util.inspect(aeso_stats_array, {showHidden: false, depth: null}))
} 

function callStatsScraperEveryNSeconds(n) {
    setInterval(getCurrentStats, n * 1000);
}

function callPoolPriceEveryNSeconds(n) {
  setInterval(getCurrentPoolPrice, n * 1000);
}

getCurrentPoolPrice();
callPoolPriceEveryNSeconds(3600);

getCurrentStats();
callStatsScraperEveryNSeconds(120);


const server = http.createServer(async (req, res) => {
    // Retrieve route from request object
    const route = url.parse(req.url).pathname
    
    if (route === '/metrics') {
      // Return all metrics the Prometheus exposition format
      res.setHeader('Content-Type', register.contentType)
      let data = await register.metrics();
      res.end(data);

    }
  })

  // Start the HTTP server which exposes the metrics on http://localhost:8080/metrics
  server.listen(8080)