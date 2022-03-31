import React, { useContext } from "react";
import TradingViewWidget, { Themes } from "react-tradingview-widget";
import StoreContext from "../store/store-context";

const TradingViewChart = (props) => {
  const storeCtx = useContext(StoreContext);

  return storeCtx.selectedTicker?.instId ? (
    <div className="main-chart__chart">
      <TradingViewWidget
        symbol={`${storeCtx.selectedTicker.name}`}
        datafeed={() => ({
          onReady: (cb) => {
            console.log("=====onReady running");
          },
          resolveSymbol: (
            symbolName,
            onSymbolResolvedCallback,
            onResolveErrorCallback
          ) => {
            console.log("=====resolveSymbol running");
            console.log("=====resolveSymbol symbolName", symbolName);
            var split_data = symbolName.split(/[:/]/);

            var symbol_stub = {
              name: symbolName,
              description: "",
              type: "crypto",
              session: "24x7",
              timezone: "Asia/Hong_Kong",
              ticker: symbolName,
              minmov: 1,
              pricescale: 100000000,
              has_intraday: true,
              intraday_multipliers: ["1", "60"],
              supported_resolution: [
                "1",
                "3",
                "5",
                "15",
                "30",
                "60",
                "120",
                "240",
                "D",
              ],
              volume_precision: 8,
              data_status: "streaming",
            };
            if (split_data[2].match(/USD|EUR|JPY|AUD|GBP|KRW|CNY|HKD/)) {
              symbol_stub.pricescale = 100;
            }

            setTimeout(function () {
              onSymbolResolvedCallback(symbol_stub);
            }, 0);
          },
          getbars: (
            symbolInfo,
            resolution,
            periodParams,
            onHistoryCallback,
            onErrorCallback
          ) => {
            const { from, to, firstDataRequest } = periodParams;
            console.log(
              "[getBars]: Method call",
              symbolInfo,
              resolution,
              from,
              to
            );
            console.log(
              "[getBars]:storeCtx.candles.candles",
              storeCtx.candles.candles
            );
            let bars = [];
            storeCtx.candles.candles.forEach((bar, i) => {
              //   if (bar.time >= from && bar.time < to) {
              // if (bar[0]>= from && bar[0] < to) {
              bars = [
                ...bars,
                {
                  time: bar[0],
                  low: bar[3],
                  high: bar[2],
                  open: bar[1],
                  close: bar[4],
                  volume: storeCtx.candles.volume[i][1],
                },
              ];
              //   }
            });
            console.log(`[getBars]: returned ${bars.length} bar(s)`);
            onHistoryCallback(bars, { noData: false });
          },
        })}
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
