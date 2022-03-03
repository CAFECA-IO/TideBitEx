import React, { useContext } from "react";
import HistoryOrder from "../components/HistoryOrder";
import MarketHistory from "../components/MarketHistory";
import MarketTrade from "../components/MarketTrade";
import OrderBook from "../components/OrderBook";
import SelectedPair from "../components/SelectedPair";
import TradingChart from "../components/TradingChart";
import { ThemeConsumer } from "../context/ThemeContext";
import StoreContext from "../store/store-context";
import { Tabs, Tab } from "react-bootstrap";
import { useTranslation } from "react-i18next";

const MobileExchange = (props) => {
  const storeCtx = useContext(StoreContext);
  const { t } = useTranslation();
  console.log(`StoreContext storeCtx.activePage`, storeCtx.activePage);
  return (
    <main className="main">
      {(storeCtx.activePage === "chart" ||
        storeCtx.activePage === "market" ||
        storeCtx.activePage === "trade") && <SelectedPair />}
      <section className="section">
        {storeCtx.activePage === "chart" && (
          <>
            <ThemeConsumer>
              {({ data }) => <TradingChart theme={data.theme} />}
            </ThemeConsumer>
          </>
        )}
        {storeCtx.activePage === "market" && (
          <>
            <OrderBook />
          </>
        )}
        {storeCtx.activePage === "trade" && (
          <>
            <div className="section__container">
              <MarketTrade />
            </div>
            <div className="section__container">
              <Tabs defaultActiveKey="market">
                <Tab eventKey="market" title={t("market")}>
                  <OrderBook />
                </Tab>
                <Tab eventKey="my_orders" title={t("my_orders")}>
                  <HistoryOrder />
                </Tab>
                <Tab eventKey="trades" title={t("trades")}>
                  <MarketHistory />
                </Tab>
              </Tabs>
            </div>
          </>
        )}
        {storeCtx.activePage === "assets" && <></>}
      </section>
    </main>
  );
};

export default MobileExchange;
