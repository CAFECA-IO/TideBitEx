import React, { useEffect, useState, useContext, useCallback } from "react";
import TradingViewWidget, { Themes } from "react-tradingview-widget";
import StoreContext from "../store/store-context";

const TradingChart = (props) => {
  const storeCtx = useContext(StoreContext);
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [selectedBar, setSelectedBar] = useState("1D");
  const [data, setData] = useState(null);

  const fetchData = useCallback(
    async (selectedTicker) => {
      setSelectedTicker(selectedTicker);
      console.log(`selectedTicker:${selectedTicker.instId}`, selectedTicker);
      const data = await storeCtx.getCandles(
        selectedTicker.instId,
        selectedBar
      );
      // setData(data);
      console.log(`data:`, data);
    },
    [storeCtx, selectedBar]
  );

  useEffect(() => {
    if (
      (!selectedTicker && props.selectedTicker) ||
      props.selectedTicker?.instId !== selectedTicker?.instId
    ) {
      fetchData(props.selectedTicker);
    }
    return () => {};
  }, [selectedTicker, props.selectedTicker, fetchData]);

  return (
    <>
      <div className="main-chart mb15">
        {selectedTicker && (
          <TradingViewWidget
            symbol={`OKEX:${selectedTicker?.instId?.replace("-", "")}`}
            theme={props.theme === "light" ? Themes.LIGHT : Themes.DARK}
            locale="en"
            autosize
            interval="D"
            timezone="America/New_York"
            library_path="charting_library/"
          />
        )}
      </div>
    </>
  );
};

export default TradingChart;
