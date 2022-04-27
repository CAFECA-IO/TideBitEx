import React, { useContext, useEffect, useState } from "react";
import { Tabs, Tab } from "react-bootstrap";
import StoreContext from "../store/store-context";
import SafeMath from "../utils/SafeMath";
import { useTranslation } from "react-i18next";
import { formateDecimal } from "../utils/Utils";

const TickerTile = (props) => {
  const storeCtx = useContext(StoreContext);
  const { t } = useTranslation();
  return (
    <li
      onClick={(_) => {
        storeCtx.selectTickerHandler(props.ticker);
        props.closeDialogHandler();
      }}
      className={`mobile-tickers__tile ${
        props.ticker.instId === storeCtx?.selectedTicker?.instId ? "active" : ""
      } ${props.ticker.update ? "update" : ""}`}
    >
      <div className="mobile-tickers__icon">
        {props.ticker.source === "TideBit" && (
          <img
            src={require("../assets/icons/" +
              `${props.ticker.base_unit}` +
              ".png")}
            alt={props.ticker?.base_unit}
          />
        )}
      </div>
      <div className="mobile-tickers__detail">
        <div className="mobile-tickers__name">{props.ticker.name}</div>
        <div className="mobile-tickers__currency">
          {t(props.ticker?.base_unit).toUpperCase()}
        </div>
      </div>
      <div className="mobile-tickers__price">
        <div>{formateDecimal(props.ticker.last, 8)}</div>
        <div
          className={SafeMath.gte(props.ticker.change, "0") ? "green" : "red"}
        >
          {SafeMath.gte(props.ticker.change, "0")
            ? `+${formateDecimal(
                SafeMath.mult(props.ticker?.changePct, "100"),
                3
              )}%`
            : `${formateDecimal(
                SafeMath.mult(props.ticker?.changePct, "100"),
                3
              )}%`}
        </div>
      </div>
    </li>
  );
};

const TickerList = (props) => {
  return (
    <ul className="mobile-tickers__list">
      {props.tickers.map((ticker, index) => (
        <TickerTile
          ticker={ticker}
          index={index}
          key={`${ticker.instId}-${ticker.instType}-${index}-star`}
        />
      ))}
    </ul>
  );
};

const quoteCcies = {
  // BTC: ["BTC"],
  // ETH: ["ETH"],
  HKD: ["HKD"],
  USDX: ["USDC", "USDT", "USDK"],
  INNO: ["INNO"],
  USD: ["USD"],
  ALTS: ["USX"],
};

const TickerDropdown = (props) => {
  const { t } = useTranslation();
  const [openDialog, setOpenDialog] = useState(false);
  const storeCtx = useContext(StoreContext);
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [defaultActiveKey, setDefaultActiveKey] = useState("hkd");

  useEffect(() => {
    if (
      (storeCtx.selectedTicker && !selectedTicker) ||
      (storeCtx.selectedTicker &&
        storeCtx.selectedTicker?.instId !== selectedTicker?.instId)
    ) {
      setSelectedTicker(storeCtx.selectedTicker);
      setDefaultActiveKey(storeCtx.selectedTicker?.group);
    }
  }, [selectedTicker, storeCtx.selectedTicker]);

  return (
    <div className="mobile-tickers mobile-tickers__dropdown">
      <div
        className="mobile-tickers__open-btn"
        onClick={() => setOpenDialog(true)}
      >
        <div className="left-label">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path d="M345.6 128l51.3 51.3-109.3 109.4-89.6-89.6L32 365.4 63.6 397 198 262.5l89.6 89.7 141.1-141 51.3 51.3V128H345.6z"></path>
          </svg>
          {t("market")}
        </div>
        <div>
          <span>{selectedTicker?.name || "--"}</span>
          <span className="caret">&#8227;</span>
        </div>
      </div>
      {openDialog && (
        <div className="mobile-tickers__container">
          <div className="mobile-tickers__header">
            <div className="mobile-tickers__title">
              {selectedTicker?.name || "--"}
            </div>
            <div
              className="mobile-tickers__close-btn"
              onClick={() => setOpenDialog(false)}
            >
              x
            </div>
          </div>
          <Tabs defaultActiveKey={defaultActiveKey}>
            {Object.keys(quoteCcies).map((quoteCcy) => (
              <Tab
                eventKey={quoteCcy.toLowerCase()}
                title={quoteCcy}
                key={`mobile-tickers-tab-${quoteCcy.toLowerCase()}`}
              >
                <TickerList
                  tickers={storeCtx.tickers.filter(
                    (ticker) => ticker.group === quoteCcy.toLowerCase()
                  )}
                />
              </Tab>
            ))}
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default TickerDropdown;
