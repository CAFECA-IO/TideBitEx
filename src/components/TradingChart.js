import React, { useEffect, useState, useContext, useCallback } from "react";
import TradingViewWidget, { Themes } from "react-tradingview-widget";
import StoreContext from "../store/store-context";

const TradingChart = (props) => {
  const storeCtx = useContext(StoreContext);
  const [selectedBar, setSelectedBar] = useState("1D");
  const [data, setData] = useState(null);

  const fetchData = useCallback(
    async (selectedTicker) => {
      const data = await storeCtx.getCandles(
        selectedTicker.instId,
        selectedBar
      );
      setData(data);
      // console.log(`data:`, data);
    },
    [storeCtx, selectedBar]
  );

  useEffect(() => {
    if (storeCtx?.selectedTicker && !data?.length) {
      console.log(
        `storeCtx.selectedTicker:${storeCtx?.selectedTicker?.instId}`
      );
      fetchData(storeCtx.selectedTicker);
    }
    return () => {};
  }, [storeCtx.selectedTicker, data?.length, fetchData]);

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
