import React, { useContext } from "react";
// import TradingViewWidget, { Themes } from "react-tradingview-widget";
import StoreContext from "../store/store-context";
import ApexCharts from "react-apexcharts";
const TradingApexChart = (props) => {
  const storeCtx = useContext(StoreContext);
  return storeCtx.selectedTicker?.instId ? (
    <React.Fragment>
      <div className="tool-bar">
        <div
          className={`tool ${storeCtx.selectedBar === "1m" ? "active" : ""}`}
          bar={"1m"}
          onClick={() => storeCtx.candleBarHandler("1m")}
        >
          1m
        </div>
        <div
          className={`tool ${storeCtx.selectedBar === "30m" ? "active" : ""}`}
          bar={"30m"}
          onClick={() => storeCtx.candleBarHandler("30m")}
        >
          30m
        </div>
        <div
          className={`tool ${storeCtx.selectedBar === "1H" ? "active" : ""}`}
          bar={"1H"}
          onClick={() => storeCtx.candleBarHandler("1H")}
        >
          1H
        </div>
        <div
          className={`tool ${storeCtx.selectedBar === "1D" ? "active" : ""}`}
          bar={"D"}
          onClick={() => storeCtx.candleBarHandler("1D")}
        >
          1D
        </div>
        <div
          className={`tool ${storeCtx.selectedBar === "1W" ? "active" : ""}`}
          bar={"W"}
          onClick={() => storeCtx.candleBarHandler("1W")}
        >
          1W
        </div>
        <div
          className={`tool ${storeCtx.selectedBar === "1M" ? "active" : ""}`}
          bar={"1M"}
          onClick={() => storeCtx.candleBarHandler("1M")}
        >
          M
        </div>
      </div>
      <div className="main-chart__chart">
        <ApexCharts
          height="65%"
          width="100%"
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
            grid: {
              yaxis: {
                lines: {
                  show: true,
                },
              },
              xaxis: {
                lines: {
                  show: true,
                },
              },
              padding: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
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
              labels: {
                show: false,
              },
              axisBorder: {
                show: false,
              },
            },
            yaxis: {
              opposite: true,
              labels: {
                show: false,
              },
            },
          }}
          series={[
            {
              data: storeCtx.candles ? storeCtx.candles.candles : [],
              type: "candlestick",
            },
          ]}
        />
        <ApexCharts
          height="32%"
          width="100%"
          type="bar"
          series={[
            {
              data: storeCtx.candles ? storeCtx.candles.volumes : [],
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
              offsetY: -32,
            },
            grid: {
              yaxis: {
                lines: {
                  show: false,
                },
              },
              xaxis: {
                lines: {
                  show: true,
                },
              },
              padding: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
              },
            },
            dataLabels: {
              enabled: false,
            },
            plotOptions: {
              bar: {
                columnWidth: "80%",
                // color: {
                //   backgroundBarColors: storeCtx.candles.map((candle) =>
                //     SafeMath.gt(candle[1], candle[4]) ? "#e73b3f" : "#239788"
                //   ),
                // },
              },
            },
            stroke: {
              width: 0,
            },
            xaxis: {
              type: "datetime",
              axisBorder: {
                show: true,
              },
            },
            yaxis: {
              labels: {
                show: false,
              },
              opposite: true,
            },
          }}
        />
      </div>
    </React.Fragment>
  ) : (
    <div></div>
  );
};

export default TradingApexChart;
