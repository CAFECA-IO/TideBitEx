import React from "react";
import HistoryOrder from "../components/HistoryOrder";
import MarketHistory from "../components/MarketHistory";
import MarketTrade from "../components/MarketTrade";
import OrderBook from "../components/OrderBook";
import SelectedPair from "../components/SelectedPair";
import TradingChart from "../components/TradingChart";
import { ThemeConsumer } from "../context/ThemeContext";

const DesktopExchange = (props) => {
  return (
    <main className="main">
      <SelectedPair />
      <section className="section">
        <div className="section__container">
          <div className="section__container--left">
            <OrderBook />
          </div>
          <div className="section__container--right">
            <ThemeConsumer>
              {({ data }) => <TradingChart theme={data.theme} />}
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
