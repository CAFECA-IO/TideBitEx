import React, { useContext } from "react";
import TradingViewWidget, { Themes } from "react-tradingview-widget";
import StoreContext from "../store/store-context";

const supportedResolutions = [
  "1",
  "3",
  "5",
  "15",
  "30",
  "60",
  "120",
  "240",
  "D",
];

const config = {
  supported_resolutions: supportedResolutions,
};
const transformTradesToCandle = (trades, resolution) => {
  let interval,
    data,
    defaultObj = {};
  switch (resolution) {
    case "1m":
      interval = 1 * 60 * 1000;
      break;
    case "30m":
      interval = 30 * 60 * 1000;
      break;
    case "1H":
      interval = 60 * 60 * 1000;
      break;
    case "1W":
      interval = 7 * 24 * 60 * 60 * 1000;
      break;
    case "M":
      interval = 30 * 24 * 60 * 60 * 1000;
      break;
    case "1":
    default:
      interval = 24 * 60 * 60 * 1000;
  }
  data = trades.reduce((prev, curr) => {
    const index = Math.floor((curr.at * 1000) / interval);
    let point = prev[index];
    if (point) {
      point.high = Math.max(point.high, +curr.price); // high
      point.low = Math.min(point.low, +curr.price); // low
      point.close = +curr.price; // close
      point.volume += +curr.volume; // volume
    } else {
      point = {
        time: index * interval,
        open: +curr.price,
        high: +curr.price,
        low: +curr.price,
        close: +curr.price,
        volume: +curr.volume,
      };
    }
    prev[index] = point;
    return prev;
  }, defaultObj);

  const now = Math.floor(new Date().getTime() / interval);
  for (let i = 0; i < 2000; i++) {
    if (!defaultObj[now - i])
      defaultObj[now - i] = {
        time: (now - i) * interval,
        open: 0,
        high: 0,
        low: 0,
        close: 0,
      };
  }

  return Object.values(data);
};
const Datafeed = {
  onReady: (cb) => {
    console.log("=====onReady running");
    setTimeout(() => cb(config), 0);
  },
  searchSymbols: (
    userInput,
    exchange,
    symbolType,
    onResultReadyCallback
  ) => {
    console.log("====Search Symbols running");
  },
  resolveSymbol: (
    symbolName,
    onSymbolResolvedCallback,
    onResolveErrorCallback
  ) => {
    // expects a symbolInfo object in response
    console.log("======resolveSymbol running");
    // console.log('resolveSymbol:',{symbolName})
    var split_data = symbolName.split(/[:/]/);
    // console.log({split_data})
    var symbol_stub = {
      name: symbolName,
      description: "",
      type: "crypto",
      session: "24x7",
      timezone: "Etc/UTC",
      ticker: symbolName,
      exchange: split_data[0],
      minmov: 1,
      pricescale: 100000000,
      // has_intraday: true,
      // intraday_multipliers: ["1", "60"],
      supported_resolution: supportedResolutions,
      volume_precision: 8,
      data_status: "streaming",
    };

    if (split_data[2].match(/USD|EUR|JPY|AUD|GBP|KRW|CNY/)) {
      symbol_stub.pricescale = 100;
    }
    setTimeout(function () {
      onSymbolResolvedCallback(symbol_stub);
      console.log("Resolving that symbol....", symbol_stub);
    }, 0);

    // onResolveErrorCallback('Not feeling it today')
  },
  getBars: function (
    symbolInfo,
    resolution,
    from,
    to,
    onHistoryCallback,
    onErrorCallback,
    firstDataRequest
  ) {
    console.log("=====getBars running");
    // console.log('function args',arguments)
    // console.log(`Requesting bars between ${new Date(from * 1000).toISOString()} and ${new Date(to * 1000).toISOString()}`)
    fetch(`https://legacy2.tidebit.network/api/v2/trades?market=ethhkd`)
      .then((response) => response.json())
      .then((data) => {
        // console.log(resolution);
        // console.log(data);
        const bars = transformTradesToCandle(data, resolution);
        // console.log(bars);
        console.log(bars);
        if (bars.length) {
          onHistoryCallback(bars, { noData: false });
        } else {
          onHistoryCallback(bars, { noData: true });
        }
      })
      .catch((err) => {
        console.log({ err });
        onErrorCallback(err);
      });
  },
  subscribeBars: (
    symbolInfo,
    resolution,
    onRealtimeCallback,
    subscribeUID,
    onResetCacheNeededCallback
  ) => {
    console.log("=====subscribeBars runnning");
  },
  unsubscribeBars: (subscriberUID) => {
    console.log("=====unsubscribeBars running");
  },
  calculateHistoryDepth: (resolution, resolutionBack, intervalBack) => {
    //optional
    console.log("=====calculateHistoryDepth running");
    // while optional, this makes sure we request 24 hours of minute data at a time
    // CryptoCompare's minute data endpoint will throw an error if we request data beyond 7 days in the past, and return no data
  //   return resolution < 60
  //     ? { resolutionBack: "D", intervalBack: "1" }
  //     : undefined;
  },
  getMarks: (
    symbolInfo,
    startDate,
    endDate,
    onDataCallback,
    resolution
  ) => {
    //optional
    console.log("=====getMarks running");
  },
  getTimeScaleMarks: (
    symbolInfo,
    startDate,
    endDate,
    onDataCallback,
    resolution
  ) => {
    //optional
    console.log("=====getTimeScaleMarks running");
  },
  getServerTime: (cb) => {
    console.log("=====getServerTime running");
  },
};


const TradingViewChart = (props) => {
  const storeCtx = useContext(StoreContext);

  return storeCtx.selectedTicker?.instId ? (
    <div className="main-chart__chart">
      <TradingViewWidget
        symbol={'Tidebit:ETH/HKD'}
        // symbol={`${storeCtx.selectedTicker.name}`}
        datafeed={Datafeed}
        theme={props.theme === "light" ? Themes.LIGHT : Themes.DARK}
        locale={storeCtx.languageKey}
        autosize
        interval="D"
        timezone="Asia/Hong_Kong"
      />
    </div>
  ) : (
    <div></div>
  );
};

export default TradingViewChart;
