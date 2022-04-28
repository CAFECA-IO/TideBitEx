import React, { useContext } from "react";
import StoreContext from "../store/store-context";
import ApexCharts from "react-apexcharts";

const DepthChart = (props) => {
  const storeCtx = useContext(StoreContext);
  return (
    <div className="depth-chart">
      <ApexCharts
        height="130"
        width="100%"
        type="area"
        options={{
          chart: {
            toolbar: {
              show: false,
            },
          },
          xaxis: {
            type: "numeric",
          },
          colors: ["#03a66d", "#cf304a"],
          dataLabels: {
            enabled: false,
          },
        }}
        series={[
          {
            name: "Buy",
            data:
              storeCtx.books?.bids && storeCtx.books?.asks
                ? storeCtx.books.bids
                    .sort((a, b) => +a.price - +b.price)
                    .map((bid) => ({
                      x: bid.price,
                      y: bid.amount,
                    }))
                    .concat(
                      storeCtx.books.asks.map((ask) => ({
                        x: ask.price,
                        y: null,
                      }))
                    )
                : [],
          },
          {
            name: "Sell",
            data:
              storeCtx.books?.asks && storeCtx.books?.bids
                ? storeCtx.books.bids
                    .sort((a, b) => +a.price - +b.price)
                    .map((bid) => ({
                      x: bid.price,
                      y: null,
                    }))
                    .concat(
                      storeCtx.books.asks.map((ask) => ({
                        x: ask.price,
                        y: ask.amount,
                      }))
                    )
                : [],
          },
        ]}
      />
    </div>
  );
};

export default DepthChart;
