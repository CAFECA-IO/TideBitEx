import React, { useContext } from "react";
import StoreContext from "../store/store-context";
import { useViewport } from "../store/ViewportProvider";

import TradingApexChart from "./TradingApexChart";
import TradingViewChart from "./TradingViewChart";
import { useTranslation } from "react-i18next";
import TradingIframe from "./TradingIframe";

const TradingChart = (props) => {
  const { width } = useViewport();
  const breakpoint = 414;
  const storeCtx = useContext(StoreContext);
  const { t } = useTranslation();

  return (
    <div
      className={`main-chart${
        width <= breakpoint ? " main-chart--mobile" : ""
      }`}
    >
      <div className="main-chart__header">{t("chart")}</div>
      {window.location.host.includes("legacy2") ? (
        <TradingIframe isMobile={width <= breakpoint} />
      ) : storeCtx.selectedTicker?.source === "TideBit" ? (
        <TradingApexChart />
      ) : (
        <TradingViewChart theme={props.theme} />
      )}
    </div>
  );
};

export default TradingChart;
