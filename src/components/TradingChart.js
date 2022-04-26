import React, { useContext } from "react";
import StoreContext from "../store/store-context";

import TradingApexChart from "./TradingApexChart";
import TradingViewChart from "./TradingViewChart";
import { useTranslation } from "react-i18next";
import TradingIframe from "./TradingIframe";
const TradingChart = (props) => {
  const storeCtx = useContext(StoreContext);
  const { t } = useTranslation();

  return (
    <div className="main-chart">
      <div className="main-chart__header">{t("chart")}</div>
      {storeCtx.selectedTicker?.source === "TideBit" ? (
        // <TradingApexChart />
        <TradingIframe />
      ) : (
        <TradingViewChart theme={props.theme} />
      )}
    </div>
  );
};

export default TradingChart;
