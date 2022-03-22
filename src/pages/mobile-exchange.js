import React, { useContext } from "react";
import HistoryOrder, { BalanceTile } from "../components/HistoryOrder";
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
  return (
    <main className="main">
      {(storeCtx.activePage === "chart" ||
        storeCtx.activePage === "market" ||
        storeCtx.activePage === "trade") && <SelectedPair />}
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
        {storeCtx.activePage === "assets" && (
          <div className="section__container">
            <ul className="d-flex justify-content-between market-order-item market-order__title">
              <li>{t("currency")}</li>
              <li>{t("totalBal")}</li>
              <li>{t("availBal")}</li>
              <li>{t("frozenBal")}</li>
            </ul>
            <ul className="order-list">
              {!!storeCtx.balances?.length &&
                storeCtx.balances
                  .filter(
                    (balance) =>
                      storeCtx.selectedTicker?.baseCcy === balance.ccy ||
                      storeCtx.selectedTicker?.quoteCcy === balance.ccy
                  )
                  .map((balance) => <BalanceTile balance={balance} />)}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
};

export default MobileExchange;
