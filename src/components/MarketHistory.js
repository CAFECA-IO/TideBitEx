import React, { useContext } from "react";
import StoreContext from "../store/store-context";
import { dateFormatter, formateDecimal } from "../utils/Utils";
import { useTranslation } from "react-i18next";

const TradeTile = (props) => {
  return (
    <li
      className={`market-history__tile flex-row ${
        props.trade.update ? "update" : ""
      }`}
      trade-id={props.trade.tradeId}
    >
      <div>{dateFormatter(parseInt(props.trade.ts), true).time}</div>
      <div className={props.trade.trend === 0 ? "red" : "green"}>
        {formateDecimal(props.trade.px, 8)}
      </div>
      <div>{formateDecimal(props.trade.sz, 8)}</div>
    </li>
  );
};

const MarketHistory = (props) => {
  const storeCtx = useContext(StoreContext);
  const { t } = useTranslation();

  return (
    <div className="market-history">
      <div className="market-history__header">{t("trades")}</div>
      <ul className="market-history__title flex-row">
        <li>{t("time")}</li>
        <li>{`${t("price")}(${
          storeCtx?.selectedTicker?.quoteCcy || "--"
        })`}</li>
        <li>{`${t("amount")}(${
          storeCtx?.selectedTicker?.baseCcy || "--"
        })`}</li>
      </ul>
      <ul className="market-history__list">
        {storeCtx.trades &&
          storeCtx.trades.map((trade) => (
            <TradeTile trade={trade} key={`${trade.instId}-${trade.tradeId}`} />
          ))}
      </ul>
    </div>
  );
};
export default MarketHistory;
