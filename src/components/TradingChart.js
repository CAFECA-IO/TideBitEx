import React, { useContext } from "react";
import TradingViewWidget, { Themes } from "react-tradingview-widget";
import StoreContext from "../store/store-context";

const TradingChart = (props) => {
  const storeCtx = useContext(StoreContext);
  // candleBarHandler ++TODO
  return (
    <>
      <div className="main-chart mb15">
        {storeCtx?.selectedTicker && (
          <TradingViewWidget
            symbol={`OKEX:${storeCtx.selectedTicker.instId?.replace("-", "")}`}
            theme={props.theme === "light" ? Themes.LIGHT : Themes.DARK}
            locale="en"
            autosize
            interval="D"
            timezone="America/New_York"
            library_path="charting_library/"
            allow_symbol_change={false}
            hide_legend={true}
          />
        )}
      </div>
    </>
  );
};

export default TradingChart;
