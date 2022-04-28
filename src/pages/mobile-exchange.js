import React, { useContext } from "react";
import { AccountList, PendingOrders } from "../components/HistoryOrder";
import MarketHistory from "../components/MarketHistory";
import MarketTrade from "../components/MarketTrade";
import OrderBook from "../components/OrderBook";
import TradingChart from "../components/TradingChart";
import { ThemeConsumer } from "../context/ThemeContext";
import StoreContext from "../store/store-context";
import { Tabs, Tab } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import MobileTickers from "../components/MobileTickers";
import MobileTicker from "../components/MobileTicker";
import DepthChart from "../components/DepthChart";

const MobileExchange = (props) => {
  const storeCtx = useContext(StoreContext);
  const { t } = useTranslation();
  return (
    <main className="main">
      {(storeCtx.activePage === "chart" ||
        storeCtx.activePage === "market" ||
        storeCtx.activePage === "trade") && <MobileTickers />}
      {(storeCtx.activePage === "chart" ||
        storeCtx.activePage === "market") && <MobileTicker />}
      <section
        className={`section${
          storeCtx.activePage === "assets" ? " section--assets" : ""
        }`}
      >
        {storeCtx.activePage === "chart" && (
          <>
            <ThemeConsumer>
              {({ data }) => <TradingChart theme={data.theme} />}
            </ThemeConsumer>
          </>
        )}
        {storeCtx.activePage === "market" && (
          <>
            <DepthChart />
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
                {storeCtx.isLogin && (
                  <Tab eventKey="my_orders" title={t("my_orders")}>
                    <PendingOrders />
                  </Tab>
                )}
                <Tab eventKey="trades" title={t("trades")}>
                  <MarketHistory />
                </Tab>
              </Tabs>
            </div>
          </>
        )}
        {storeCtx.activePage === "assets" && (
          <div className="section__container">
            <AccountList />
          </div>
        )}
      </section>
    </main>
  );
};

export default MobileExchange;
