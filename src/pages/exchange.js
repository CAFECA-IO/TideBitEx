import React, { useState } from "react";
import HistoryOrder from "../components/HistoryOrder";
import MarketHistory from "../components/MarketHistory";
import MarketNews from "../components/MarketNews";
import MarketPairs from "../components/MarketPairs";
import MarketTrade from "../components/MarketTrade";
import OrderBook from "../components/OrderBook";
import TradingChart from "../components/TradingChart";
import TradingChartDark from "../components/TradingChartDark";
import { ThemeConsumer } from "../context/ThemeContext";

const Exchange = (props) => {
  const [selectedTicker, setSelectedTicker] = useState(null);
  const handleSelectedTicker = (ticker) => {
    console.log(`ticker`, ticker)
    setSelectedTicker(ticker);
  };

  return (
    <>
      <div className="container-fluid mtb15 no-fluid">
        <div className="row sm-gutters">
          <div className="col-sm-12 col-md-3">
            <MarketPairs onClick={handleSelectedTicker} />
          </div>
          <div className="col-sm-12 col-md-6">
            <ThemeConsumer>
              {({ data }) => {
                return data.theme === "light" ? (
                  <TradingChart />
                ) : (
                  <TradingChartDark />
                );
              }}
            </ThemeConsumer>
            <MarketTrade />
          </div>
          <div className="col-md-3">
            <OrderBook selectedTicker={selectedTicker} />
            <MarketHistory />
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
