import React, { useContext } from "react";
import TradingViewWidget, { Themes } from "react-tradingview-widget";
import StoreContext from "../store/store-context";

const TradingViewChart = (props) => {
  const storeCtx = useContext(StoreContext);

  return storeCtx.selectedTicker?.instId ? (
    <div className="main-chart__chart">
      <TradingViewWidget
        symbol={`${storeCtx.selectedTicker.name}`}
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
