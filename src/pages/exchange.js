import React, { useState, useContext, useEffect } from "react";
import HistoryOrder from "../components/HistoryOrder";
import MarketHistory from "../components/MarketHistory";
import MarketNews from "../components/MarketNews";
import MarketPairs from "../components/MarketPairs";
import MarketTrade from "../components/MarketTrade";
import OrderBook from "../components/OrderBook";
import TradingChart from "../components/TradingChart";
import { ThemeConsumer } from "../context/ThemeContext";
import StoreContext from "../store/store-context";

const Exchange = (props) => {
  const storeCtx = useContext(StoreContext);
  const [selectedTicker, setSelectedTicker] = useState(null);

  const handleSelectedTicker = (ticker) => {
    console.log(`ticker`, ticker);
    setSelectedTicker(ticker);
  };

  useEffect(() => {
    console.log(`init`);
    if (storeCtx.tickers.length > 0) setSelectedTicker(storeCtx.tickers[0]);
    return () => {};
  }, [storeCtx.tickers]);

  return (
    <>
      <div className="container-fluid mtb15 no-fluid">
        <div className="row sm-gutters">
          <div className="col-sm-12 col-md-3">
            <MarketPairs onClick={handleSelectedTicker} />
          </div>
          <div className="col-sm-12 col-md-6">
            <ThemeConsumer>
              {({ data }) => (
                <TradingChart
                  selectedTicker={selectedTicker}
                  theme={data.theme}
                />
              )}
            </ThemeConsumer>
            <MarketTrade selectedTicker={selectedTicker}/>
          </div>
          <div className="col-md-3">
            <OrderBook selectedTicker={selectedTicker} />
            <MarketHistory selectedTicker={selectedTicker} />
          </div>
          <div className="col-md-3">
            <MarketNews />
          </div>
          <div className="col-md-9">
            <HistoryOrder />
          </div>
        </div>
      </div>
    </>
  );
};

export default Exchange;
