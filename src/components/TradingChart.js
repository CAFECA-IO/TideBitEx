import React, { useContext } from "react";
import StoreContext from "../store/store-context";

import TradingApexChart from "./TradingApexChart";
import TradingViewChart from "./TradingViewChart";
const TradingChart = (props) => {
  const storeCtx = useContext(StoreContext);

  return storeCtx.selectedTicker?.source === "TideBit" ? (
    <TradingApexChart />
  ) : (
    <TradingViewChart />
  );
};

export default TradingChart;
