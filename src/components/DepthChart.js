import React, { useContext, useEffect, useState } from "react";
import StoreContext from "../store/store-context";
import ApexCharts from "apexcharts";

const DepthChart = (props) => {
  const defaultOptions = {
    chart: {
      height: 130,
      type: "area",
    },
    series: [
      { name: "Buy", data: [] },
      {
        name: "Sell",
        data: [],
      },
    ],
    xaxis: {
      type: "numeric",
    },
  };
  const storeCtx = useContext(StoreContext);
  const [options, setOptions] = useState(defaultOptions);

  useEffect(() => {
    if (storeCtx.selectedTicker) {
      setOptions((prev) => ({
        ...prev,
        series: [
          {
            name: "Buy",
            data: storeCtx.books?.bids.map((bid) => ({
              x: bid.price,
              y: bid.amount,
            })),
          },
          {
            name: "Sell",
            data: storeCtx.books?.asks.map((ask) => ({
              x: ask.price,
              y: ask.amount,
            })),
          },
        ],
      }));
    }
  }, [storeCtx]);

  return (
    <div className="depth-chart">
      <ApexCharts width="100%" options={options} />
    </div>
  );
};

export default DepthChart;
