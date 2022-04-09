import React, { useContext, useState, useEffect, useCallback } from "react";
import StoreContext from "../store/store-context";
import { Tabs, Tab, Nav } from "react-bootstrap";
import { formateDecimal } from "../utils/Utils";
import SafeMath from "../utils/SafeMath";
import { useTranslation } from "react-i18next";
import { useViewport } from "../store/ViewportProvider";

const TradeForm = (props) => {
  const { t } = useTranslation();
  return (
    <form
      onSubmit={(e) => {
        props.onSubmit(e, props.side);
      }}
      className={`market-trade__form ${
        props.side === "buy" ? "market-trade--buy" : "market-trade--sell"
      }`}
    >
      <p className="market-trade__text">
        {t("available")}:
        <span>
          {`${
            props.selectedTicker
              ? formateDecimal(
                  props.side === "buy"
                    ? props.quoteCcyAvailable
                    : props.baseCcyAvailable,
                  8
                )
              : "0" || "--"
          } `}
          {props.side === "buy"
            ? props.selectedTicker?.quote_unit.toUpperCase() || "--"
            : props.selectedTicker?.base_unit.toUpperCase() || "--"}
          {/* = 0 USD */}
        </span>
      </p>
      <div className="market-trade__input-group input-group">
        <label htmlFor="price">{t("price")}:</label>
        <div className="market-trade__input-group--box">
          <input
            name="price"
            type={props.readyOnly ? "text" : "number"}
            className="market-trade__input form-control"
            // placeholder={t("price")}
            value={props.readyOnly ? t("market") : props.px}
            onInput={(e) => props.onPxInput(e.target.value)}
            required={!props.readyOnly}
            disabled={!!props.readyOnly}
            step="any"
          />
          {!props.readyOnly && (
            <div className="market-trade__input-group--append input-group-append">
              <span className="input-group-text">
                {props.selectedTicker?.quote_unit.toUpperCase() || "--"}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="market-trade__input-group input-group">
        <label htmlFor="trade_amount">{t("trade_amount")}:</label>
        <div className="market-trade__input-group--box">
          <input
            name="trade_amount"
            type="number"
            className="market-trade__input form-control"
            // placeholder={t("trade_amount")}
            value={props.sz}
            onInput={(e) => props.onSzInput(e.target.value)}
            required
            step="any"
          />
          <div className="market-trade__input-group--append input-group-append">
            <span className="input-group-text">
              {props.selectedTicker?.base_unit.toUpperCase() || "--"}
            </span>
          </div>
        </div>
      </div>
      <div className="market-trade__input-group input-group">
        <label htmlFor="trade_amount">{t("trade_total")}:</label>
        <div className="market-trade__input-group--box">
          <input
            name="trade_total"
            type="number"
            className="market-trade__input  form-control"
            // placeholder={t("trade_total")}
            value={SafeMath.mult(props.px, props.sz)}
            readOnly
          />
          <div className="market-trade__input-group--append input-group-append">
            <span className="input-group-text">
              {props.selectedTicker?.quote_unit.toUpperCase() || "--"}
            </span>
          </div>
        </div>
      </div>
      <div className="market-trade__error-message--container">
        {props.errorMessage && (
          <p
            className={`market-trade__error-message ${
              SafeMath.lt(props.sz, props.selectedTicker?.minSz) ? "show" : ""
            }`}
          >
            {props.errorMessage}
          </p>
        )}
      </div>
      <ul className="market-trade__amount-controller">
        <li className={`${props.selectedPct === "0.25" ? "active" : ""}`}>
          <span onClick={() => props.percentageHandler("0.25", props.px)}>
            25%
          </span>
        </li>
        <li className={`${props.selectedPct === "0.5" ? "active" : ""}`}>
          <span onClick={() => props.percentageHandler("0.5", props.px)}>
            50%
          </span>
        </li>
        <li className={`${props.selectedPct === "0.75" ? "active" : ""}`}>
          <span onClick={() => props.percentageHandler("0.75", props.px)}>
            75%
          </span>
        </li>
        <li className={`${props.selectedPct === "1.0" ? "active" : ""}`}>
          <span onClick={() => props.percentageHandler("1.0", props.px)}>
            100%
          </span>
        </li>
      </ul>
      <div style={{ flex: "auto" }}></div>
      <button
        type="submit"
        className="btn market-trade__button"
        disabled={
          !props.selectedTicker ||
          SafeMath.gt(
            props.sz,
            props.side === "buy"
              ? SafeMath.div(props.quoteCcyAvailable, props.px)
              : props.baseCcyAvailable
          ) ||
          SafeMath.lte(props.sz, "0") ||
          SafeMath.lt(props.sz, props.selectedTicker?.minSz)
        }
      >
        {props.side === "buy" ? t("buy") : t("sell")}
        {` ${props.selectedTicker?.base_unit.toUpperCase() ?? ""}`}
      </button>
    </form>
  );
};

const TradePannel = (props) => {
  const { width } = useViewport();
  const breakpoint = 414;
  const storeCtx = useContext(StoreContext);
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [quoteCcyAvailable, setQuoteCcyAvailable] = useState("0");
  const [baseCcyAvailable, setBaseCcyAvailable] = useState("0");
  const [limitBuyPx, setLimitBuyPx] = useState(null);
  const [limitSellPx, setLimitSellPx] = useState(null);
  const [marketBuySz, setMarketBuySz] = useState(null);
  const [marketSellSz, setMarketSellSz] = useState(null);
  const [limitBuySz, setLimitBuySz] = useState(null);
  const [limitSellSz, setLimitSellSz] = useState(null);
  const [tdMode, setTdMode] = useState("cash");
  const [selectedLimitSellPct, setSelectedLimitSellPct] = useState(null);
  const [selectedMarketBuyPct, setSelectedMarketBuyPct] = useState(null);
  const [selectedLimitBuyPct, setSelectedLimitBuyPct] = useState(null);
  const [selectedMarketSellPct, setSelectedMarketSellPct] = useState(null);
  const [buyErrorMessage, setBuyErrorMessage] = useState(null);
  const [sellErrorMessage, setSellErrorMessage] = useState(null);
  const { t } = useTranslation();

  const limitBuyPxHandler = (value) => {
    let _value = +value < 0 ? "0" : value;
    setLimitBuyPx(_value);
  };

  const limitSellPxHandler = (value) => {
    let _value = +value < 0 ? "0" : value;
    setLimitSellPx(_value);
  };

  const buySzHandler = useCallback(
    (orderType, value) => {
      let _value = SafeMath.lt(value, "0")
        ? "0"
        : SafeMath.gt(quoteCcyAvailable, "0") &&
          SafeMath.gte(
            SafeMath.mult(
              value,
              orderType === "market"
                ? storeCtx.selectedTicker?.last
                : limitBuyPx
            ),
            quoteCcyAvailable
          )
        ? formateDecimal(
            SafeMath.div(
              quoteCcyAvailable,
              orderType === "market"
                ? storeCtx.selectedTicker?.last
                : limitBuyPx
            ),
            8
          )
        : value;
      if (orderType === "market") setMarketBuySz(_value);
      else setLimitBuySz(_value);
      if (SafeMath.gt(value, "0")) {
        if (
          !!selectedTicker?.minSz &&
          SafeMath.lt(value, selectedTicker?.minSz)
        )
          setBuyErrorMessage(`Minimum order size is ${selectedTicker?.minSz}`);
        if (
          SafeMath.gt(
            SafeMath.mult(
              value,
              orderType === "market"
                ? storeCtx.selectedTicker?.last
                : limitBuyPx
            ),
            quoteCcyAvailable
          )
        ) {
          setBuyErrorMessage(
            `Available ${selectedTicker?.quote_unit.toUpperCase()} is not enough`
          );
        } else setBuyErrorMessage(null);
      } else {
        setBuyErrorMessage(null);
      }
    },
    [
      limitBuyPx,
      quoteCcyAvailable,
      selectedTicker?.minSz,
      selectedTicker?.quote_unit,
      storeCtx.selectedTicker?.last,
    ]
  );
  const sellSzHandler = useCallback(
    (orderType, value) => {
      let _value = SafeMath.lt(value, "0")
        ? "0"
        : SafeMath.gt(baseCcyAvailable, "0") &&
          SafeMath.gte(value, baseCcyAvailable)
        ? baseCcyAvailable
        : value;
      if (orderType === "market") setMarketSellSz(_value);
      else setLimitSellSz(_value);

      if (SafeMath.gt(value, "0")) {
        if (
          !!selectedTicker?.minSz &&
          SafeMath.lt(value, selectedTicker?.minSz)
        )
          setSellErrorMessage(`Minimum order size is ${selectedTicker?.minSz}`);
        if (SafeMath.gt(value, baseCcyAvailable)) {
          setSellErrorMessage(
            `Available ${selectedTicker?.base_unit.toUpperCase()} is not enough`
          );
        } else setSellErrorMessage(null);
      } else {
        setSellErrorMessage(null);
      }
    },
    [baseCcyAvailable, selectedTicker?.base_unit, selectedTicker?.minSz]
  );

  const buyPctHandler = useCallback(
    (orderType, pct, buyPx, availBal) => {
      let size = "0";
      if (SafeMath.gt(quoteCcyAvailable, 0))
        size = formateDecimal(
          SafeMath.div(SafeMath.mult(pct, quoteCcyAvailable), buyPx),
          8
        );
      else if (SafeMath.gt(availBal, 0))
        size = formateDecimal(
          SafeMath.div(SafeMath.mult(pct, availBal), buyPx),
          8
        );
      if (orderType === "market") {
        setMarketBuySz(size);
        setSelectedMarketBuyPct(pct);
      } else {
        setLimitBuySz(size);
        setSelectedLimitBuyPct(pct);
      }
    },
    [quoteCcyAvailable]
  );

  const sellPctHandler = useCallback(
    (orderType, pct, availBal) => {
      let size = "0";
      if (SafeMath.gt(baseCcyAvailable, 0))
        size = formateDecimal(SafeMath.mult(pct, baseCcyAvailable), 8);
      else if (SafeMath.gt(availBal, 0))
        size = formateDecimal(SafeMath.mult(pct, availBal), 8);
      if (orderType === "market") {
        setMarketSellSz(size);
        setSelectedMarketSellPct(pct);
      } else {
        setLimitSellSz(size);
        setSelectedLimitSellPct(pct);
      }
    },
    [baseCcyAvailable]
  );

  const onSubmit = async (event, side) => {
    event.preventDefault();
    if (!storeCtx.selectedTicker) return;
    const order =
      props.orderType === "limit"
        ? side === "buy"
          ? {
              instId: storeCtx.selectedTicker.instId,
              tdMode,
              side,
              ordType: props.orderType,
              px: limitBuyPx,
              sz: limitBuySz,
            }
          : {
              instId: storeCtx.selectedTicker.instId,
              tdMode,
              side,
              ordType: props.orderType,
              px: limitSellPx,
              sz: limitSellSz,
            }
        : {
            instId: storeCtx.selectedTicker.instId,
            tdMode,
            side,
            ordType: props.orderType,
            px: storeCtx.selectedTicker?.last,
            sz: side === "buy" ? marketBuySz : marketSellSz,
          };
    const confirm = window.confirm(`You are going to
          ${order.side} ${order.sz} ${order.instId.split("-")[0]}
          ${order.side === "buy" ? "with" : "for"} ${SafeMath.mult(
      props.orderType === "market" ? selectedTicker.last : order.px,
      order.sz
    )} ${order.instId.split("-")[1]}
          with price ${
            props.orderType === "market" ? selectedTicker.last : order.px
          } ${order.instId.split("-")[1]} per ${order.instId.split("-")[0]}`);
    if (confirm) {
      storeCtx.postOrder(order);
    }
    if (side === "buy") {
      if (props.orderType === "market") {
        setMarketBuySz("0");
      } else {
        setLimitBuySz("0");
      }
      buyPctHandler(props.orderType, "0.25", selectedTicker.last);
    } else {
      if (props.orderType === "market") {
        setMarketSellSz("0");
      } else {
        setLimitSellSz("0");
      }

      sellPctHandler(props.orderType, "0.25", selectedTicker.last);
    }
  };

  useEffect(() => {
    if (
      storeCtx.orderbook !== null &&
      storeCtx.orderbook?.price &&
      storeCtx.orderbook?.amount
    ) {
      limitBuyPxHandler(storeCtx.orderbook.price);
      limitSellPxHandler(storeCtx.orderbook.price);
      buySzHandler("market", storeCtx.orderbook.amount);
      sellSzHandler("market", storeCtx.orderbook.amount);
      buySzHandler("limit", storeCtx.orderbook.amount);
      sellSzHandler("limit", storeCtx.orderbook.amount);
    }
  }, [buySzHandler, sellSzHandler, storeCtx.orderbook]);

  useEffect(() => {
    if (
      storeCtx.accounts?.length > 0 &&
      ((storeCtx.selectedTicker && !selectedTicker) ||
        (storeCtx.selectedTicker &&
          storeCtx.selectedTicker.instId !== selectedTicker?.instId))
    ) {
      let quoteCcyBalance = storeCtx.accounts?.find((balance) => {
        return balance.ccy === storeCtx.selectedTicker?.quote_unit.toUpperCase();
      });

      if (quoteCcyBalance) {
        setQuoteCcyAvailable(quoteCcyBalance?.availBal);
        buyPctHandler(
          "market",
          selectedMarketBuyPct ?? "0.25",
          storeCtx.selectedTicker.last,
          quoteCcyBalance?.availBal
        );
        buyPctHandler(
          "limit",
          selectedLimitBuyPct ?? "0.25",
          storeCtx.selectedTicker.last,
          quoteCcyBalance?.availBal
        );
      }
      let baseCcyBalance = storeCtx.accounts?.find(
        (balance) => balance.ccy === storeCtx.selectedTicker?.base_unit.toUpperCase()
      );
      if (baseCcyBalance) {
        setBaseCcyAvailable(baseCcyBalance?.availBal);
        sellPctHandler(
          "market",
          selectedMarketSellPct ?? "0.25",
          baseCcyBalance?.availBal
        );
        sellPctHandler(
          "limit",
          selectedLimitSellPct ?? "0.25",
          baseCcyBalance?.availBal
        );
      }
      setSelectedTicker(storeCtx.selectedTicker);
      limitBuyPxHandler(storeCtx.selectedTicker.last);
      limitSellPxHandler(storeCtx.selectedTicker.last);
    }
  }, [
    storeCtx.selectedTicker,
    storeCtx.accounts,
    selectedTicker,
    buyPctHandler,
    selectedMarketBuyPct,
    selectedLimitBuyPct,
    sellPctHandler,
    selectedMarketSellPct,
    selectedLimitSellPct,
  ]);

  return (
    <div className="market-trade__panel">
      {width <= breakpoint ? (
        <Tabs defaultActiveKey="buy">
          <Tab eventKey="buy" title={t("buy")}>
            <TradeForm
              px={
                props.orderType === "market"
                  ? storeCtx.selectedTicker?.last
                  : limitBuyPx
              }
              sz={props.orderType === "market" ? marketBuySz : limitBuySz}
              selectedTicker={selectedTicker}
              quoteCcyAvailable={quoteCcyAvailable}
              baseCcyAvailable={baseCcyAvailable}
              selectedPct={
                props.orderType === "market"
                  ? selectedMarketBuyPct
                  : selectedLimitBuyPct
              }
              onPxInput={limitBuyPxHandler}
              onSzInput={(value) => buySzHandler(props.orderType, value)}
              percentageHandler={(pct, buyPx) =>
                buyPctHandler(props.orderType, pct, buyPx)
              }
              onSubmit={onSubmit}
              side="buy"
              readyOnly={!!props.readyOnly}
              errorMessage={buyErrorMessage}
            />
          </Tab>
          <Tab eventKey="sell" title={t("sell")}>
            <TradeForm
              px={
                props.orderType === "market"
                  ? storeCtx.selectedTicker?.last
                  : limitSellPx
              }
              sz={props.orderType === "market" ? marketSellSz : limitSellSz}
              quoteCcyAvailable={quoteCcyAvailable}
              baseCcyAvailable={baseCcyAvailable}
              selectedTicker={selectedTicker}
              selectedPct={
                props.orderType === "market"
                  ? selectedMarketSellPct
                  : selectedLimitSellPct
              }
              onPxInput={limitSellPxHandler}
              onSzInput={(value) => sellSzHandler(props.orderType, value)}
              percentageHandler={(pct, buyPx) =>
                sellPctHandler(props.orderType, pct, buyPx)
              }
              onSubmit={onSubmit}
              side="sell"
              readyOnly={!!props.readyOnly}
              errorMessage={sellErrorMessage}
            />
          </Tab>
        </Tabs>
      ) : (
        <>
          <TradeForm
            px={
              props.orderType === "market"
                ? storeCtx.selectedTicker?.last
                : limitBuyPx
            }
            sz={props.orderType === "market" ? marketBuySz : limitBuySz}
            quoteCcyAvailable={quoteCcyAvailable}
            baseCcyAvailable={baseCcyAvailable}
            selectedTicker={selectedTicker}
            selectedPct={
              props.orderType === "market"
                ? selectedMarketBuyPct
                : selectedLimitBuyPct
            }
            onPxInput={limitBuyPxHandler}
            onSzInput={(value) => buySzHandler(props.orderType, value)}
            percentageHandler={(pct, buyPx) =>
              buyPctHandler(props.orderType, pct, buyPx)
            }
            onSubmit={onSubmit}
            side="buy"
            readyOnly={!!props.readyOnly}
            errorMessage={buyErrorMessage}
          />
          <TradeForm
            px={
              props.orderType === "market"
                ? storeCtx.selectedTicker?.last
                : limitSellPx
            }
            sz={props.orderType === "market" ? marketSellSz : limitSellSz}
            quoteCcyAvailable={quoteCcyAvailable}
            baseCcyAvailable={baseCcyAvailable}
            selectedTicker={selectedTicker}
            selectedPct={
              props.orderType === "market"
                ? selectedMarketSellPct
                : selectedLimitSellPct
            }
            onPxInput={limitSellPxHandler}
            onSzInput={(value) => sellSzHandler(props.orderType, value)}
            percentageHandler={(pct) => sellPctHandler(props.orderType, pct)}
            onSubmit={onSubmit}
            side="sell"
            readyOnly={!!props.readyOnly}
            errorMessage={sellErrorMessage}
          />
        </>
      )}
    </div>
  );
};

const MarketTrade = (props) => {
  const storeCtx = useContext(StoreContext);
  const { t } = useTranslation();
  return (
    <div className="market-trade">
      <div className="market-trade__container">
        <div className="market-trade__header">{t("place_order")}</div>
        <Tabs defaultActiveKey="limit">
          <Tab eventKey="limit" title={t("limit")}>
            <TradePannel orderType="limit" />
          </Tab>
          <Tab eventKey="market" title={t("market")}>
            <TradePannel orderType="market" readyOnly={true} />
          </Tab>
          {/* <Tab eventKey="stop-limit" title="Stop Limit">
            <TradePannel orderType="stop-limit" />
          </Tab> */}
          {/* <Tab eventKey="stop-market" title="Stop Market">
            <TradePannel orderType="stop-market" />
          </Tab> */}
        </Tabs>
      </div>
      {!storeCtx.isLogin && (
        <div className="market-trade__cover flex-row">
          <Nav.Link href="/signin">{t("login")}</Nav.Link>
          <Nav.Link href="/signup">{t("register")}</Nav.Link>
        </div>
      )}
    </div>
  );
};

// const MarketTrade = (props) => {
//   const [key, setKey] = useState("limit");
//   return (
//     <>
//       <div className="market-trade">
//         <Tabs defaultActiveKey="limit" activeKey={key} onSelect={setKey}>
//           <Tab eventKey="limit" title="Limit">
//             {key === "limit" && <TradePannel orderType={key} />}
//           </Tab>
//           <Tab eventKey="market" title="Market">
//             {key === "market" && <TradePannel orderType={key} />}
//           </Tab>
//           <Tab eventKey="stop-limit" title="Stop Limit">
//             {key === "stop-limit" && <TradePannel orderType={key} />}
//           </Tab>
//           <Tab eventKey="stop-market" title="Stop Market">
//             {key === "stop-market" && <TradePannel orderType={key} />}
//           </Tab>
//         </Tabs>
//       </div>
//     </>
//   );
// };
export default MarketTrade;
