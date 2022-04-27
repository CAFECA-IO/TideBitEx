import React, { useContext } from "react";
import HistoryOrder, { AccountTile } from "../components/HistoryOrder";
import MarketHistory from "../components/MarketHistory";
import MarketTrade from "../components/MarketTrade";
import OrderBook from "../components/OrderBook";
import SelectedTicker from "../components/SelectedTicker";
import TradingChart from "../components/TradingChart";
import { ThemeConsumer } from "../context/ThemeContext";
import StoreContext from "../store/store-context";
import { Tabs, Tab } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import MobileTickers from "../components/MobileTickers";
import MobileTicker from "../components/MobileTicker";

const MobileExchange = (props) => {
  const storeCtx = useContext(StoreContext);
  const { t } = useTranslation();
  return (
    <main className="main">
      <MobileTickers />
      {(storeCtx.activePage === "chart" ||
        storeCtx.activePage === "market" ||
        storeCtx.activePage === "trade") && <MobileTicker />}
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
              {!!storeCtx.accounts?.length &&
                storeCtx.accounts
                  .filter(
                    (account) =>
                      storeCtx.selectedTicker?.base_unit.toUpperCase() === account.currency ||
                      storeCtx.selectedTicker?.quote_unit.toUpperCase() === account.currency
                  )
                  .map((account) => <AccountTile account={account} />)}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
};

export default MobileExchange;
