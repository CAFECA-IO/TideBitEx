import React, { useContext, useEffect } from "react";
import TradingViewWidget, { Themes } from "react-tradingview-widget";
import StoreContext from "../store/store-context";
import ApexCharts from "react-apexcharts";

const TradingChart = (props) => {
  const storeCtx = useContext(StoreContext);
  // candleBarHandler ++TODO
  useEffect(() => {
    console.log(`storeCtx.priceData`, storeCtx.priceData);
    console.log(`storeCtx.priceData?.candles `, storeCtx.priceData?.candles);
    console.log(`storeCtx.priceData?.volumes `, storeCtx.priceData?.volumes);
  }, [storeCtx.priceData]);
  return (
    <>
      <div className="main-chart mb15">
        {/* {storeCtx.priceData && ( */}
        {storeCtx.selectedTicker?.instId && (
          <>
            <div className="tool-bar">
              <div
                className={`tool ${
                  storeCtx.selectedBar === "1m" ? "active" : ""
                }`}
                bar={"1m"}
                onClick={() => storeCtx.candleBarHandler("1m")}
              >
                1m
              </div>
              <div
                className={`tool ${
                  storeCtx.selectedBar === "30m" ? "active" : ""
                }`}
                bar={"30m"}
                onClick={() => storeCtx.candleBarHandler("30m")}
              >
                30m
              </div>
              <div
                className={`tool ${
                  storeCtx.selectedBar === "1H" ? "active" : ""
                }`}
                bar={"1H"}
                onClick={() => storeCtx.candleBarHandler("1H")}
              >
                1H
              </div>
              <div
                className={`tool ${
                  storeCtx.selectedBar === "1D" ? "active" : ""
                }`}
                bar={"D"}
                onClick={() => storeCtx.candleBarHandler("1D")}
              >
                1D
              </div>
              <div
                className={`tool ${
                  storeCtx.selectedBar === "1W" ? "active" : ""
                }`}
                bar={"W"}
                onClick={() => storeCtx.candleBarHandler("1W")}
              >
                1W
              </div>
              <div
                className={`tool ${
                  storeCtx.selectedBar === "1M" ? "active" : ""
                }`}
                bar={"1M"}
                onClick={() => storeCtx.candleBarHandler("1M")}
              >
                M
              </div>
            </div>
            <ApexCharts
              height="80%"
              type="candlestick"
              options={{
                chart: {
                  type: "candlestick",
                  height: 290,
                  id: "candles",
                  toolbar: {
                    autoSelected: "pan",
                    show: false,
                  },
                  zoom: {
                    enabled: false,
                  },
                },
                plotOptions: {
                  candlestick: {
                    colors: {
                      upward: "#239788",
                      downward: "#e73b3f",
                    },
                  },
                },
                xaxis: {
                  type: "datetime",
                },
              }}
              series={[
                {
                  data: storeCtx.priceData?.candles ?? [],
                  type: "candlestick",
                },
              ]}
            />
            <ApexCharts
              height="20%"
              type="bar"
              series={[
                {
                  data: storeCtx.priceData?.volumes && [],
                  name: "volume",
                },
              ]}
              options={{
                chart: {
                  //   // height: 160,
                  type: "bar",
                  brush: {
                    enabled: true,
                    target: "candles",
                  },
                },
                dataLabels: {
                  enabled: false,
                },
                plotOptions: {
                  bar: {
                    columnWidth: "80%",
                  },
                },
                stroke: {
                  width: 0,
                },
                xaxis: {
                  type: "datetime",
                  axisBorder: {
                    offsetX: 13,
                  },
                },
                yaxis: {
                  labels: {
                    show: false,
                  },
                },
              }}
            />
            {/* <TradingViewWidget
              symbol={`OKEX:${storeCtx.selectedTicker.instId?.replace(
                "-",
                ""
              )}`}
              theme={props.theme === "light" ? Themes.LIGHT : Themes.DARK}
              locale="en"
              autosize
              interval="D"
              timezone="America/New_York"
              library_path="charting_library/"
              allow_symbol_change={false}
              hide_legend={true}
            /> */}
          </>
        )}
      </div>
    </>
  );
};

export default TradingChart;
