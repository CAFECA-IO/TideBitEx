import React from "react";
import HistoryOrder from "../components/HistoryOrder";
import MarketHistory from "../components/MarketHistory";
import MarketTrade from "../components/MarketTrade";
import OrderBook from "../components/OrderBook";
import SelectedTicker from "../components/SelectedTicker";
import TradingViewChart from "../components/TradingViewChart";
import { ThemeConsumer } from "../context/ThemeContext";

const DesktopExchange = (props) => {
  return (
    <main className="main">
      <SelectedTicker />
      <section className="section">
        <div className="section__container">
          <div className="section__container--left">
            <OrderBook />
          </div>
          <div className="section__container--right">
            <ThemeConsumer>
              {({ data }) => <TradingViewChart theme={data.theme} />}
            </ThemeConsumer>
          </div>
        </div>
        <div className="section__container">
          <div className="section__container--left">
            <MarketTrade />
          </div>
          <div className="section__container--right">
            <HistoryOrder />
            <MarketHistory />
          </div>
        </div>
      </section>
    </main>
  );
};

export default DesktopExchange;
