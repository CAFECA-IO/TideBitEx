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
                  4
                )
              : "0"
          } `}
          {props.side === "buy"
            ? props.selectedTicker?.quoteCcy || "--"
            : props.selectedTicker?.baseCcy || "--"}
          = 0 USD
        </span>
      </p>
      <div className="market-trade__input-group input-group">
        <input
          type="number"
          className="market-trade__input form-control"
          placeholder={t("price")}
          value={props.px}
          onInput={(e) => props.onPxInput(e.target.value)}
          required={!props.readyOnly}
          disabled={!!props.readyOnly}
          step="any"
        />
        <div className="market-trade__input-group--append input-group-append">
          <span className="input-group-text">
            {props.selectedTicker?.quoteCcy || "--"}
          </span>
        </div>
      </div>
      <div className="market-trade__input-group input-group">
        <input
          type="number"
          className="market-trade__input form-control"
          placeholder={t("trade_amount")}
          value={props.sz}
          onInput={props.onSzInput}
          required
          step="any"
        />
        <div className="market-trade__input-group--append input-group-append">
          <span className="input-group-text">
            {props.selectedTicker?.baseCcy || "--"}
          </span>
        </div>
      </div>
      <div className="market-trade__input-group input-group">
        <input
          type="number"
          className="market-trade__input  form-control"
          placeholder={t("trade_total")}
          value={SafeMath.mult(props.px, props.sz)}
          readOnly
        />
        <div className="market-trade__input-group--append input-group-append">
          <span className="input-group-text">
            {props.selectedTicker?.quoteCcy || "--"}
          </span>
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
          <span
            onClick={() =>
              props.percentageHandler(props.selectedTicker, "0.25, props.px")
            }
          >
            25%
          </span>
        </li>
        <li className={`${props.selectedPct === "0.5" ? "active" : ""}`}>
          <span
            onClick={() =>
              props.percentageHandler(props.selectedTicker, "0.5", props.px)
            }
          >
            50%
          </span>
        </li>
        <li className={`${props.selectedPct === "0.75" ? "active" : ""}`}>
          <span
            onClick={() =>
              props.percentageHandler(props.selectedTicker, "0.75, props.px")
            }
          >
            75%
          </span>
        </li>
        <li className={`${props.selectedPct === "1.0" ? "active" : ""}`}>
          <span
            onClick={() =>
              props.percentageHandler(props.selectedTicker, "1.0", props.px)
            }
          >
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
              ? SafeMath.div(props.selectedTicker?.quoteCcyAvailable, props.px)
              : props.selectedTicker?.baseCcyAvailable
          ) ||
          SafeMath.lte(props.sz, "0") ||
          SafeMath.lt(props.sz, props.selectedTicker?.minSz)
        }
      >
        {props.side === "buy" ? t("buy") : t("sell")}
        {` ${props.selectedTicker?.baseCcy ?? ""}`}
      </button>
    </form>
  );
};

const TradePannel = (props) => {
  const { width } = useViewport();
  const breakpoint = 414;
  const storeCtx = useContext(StoreContext);
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [quoteCcyAvailable, setQuoteCcyAvailable] = useState(null);
  const [baseCcyAvailable, setBaseCcyAvailable] = useState(null);
  const [buyPx, setBuyPx] = useState(null);
  const [sellPx, setSellPx] = useState(null);
  const [buySz, setBuySz] = useState(null);
  const [tdMode, setTdMode] = useState("cash");
  const [sellSz, setSellSz] = useState(null);
  const [selectedBuyPct, setSelectedBuyPct] = useState(null);
  const [selectedSellPct, setSelectedSellPct] = useState(null);
  const [buyErrorMessage, setBuyErrorMessage] = useState(null);
  const [sellErrorMessage, setSellErrorMessage] = useState(null);
  const { t } = useTranslation();

  const buySzHandler = (event) => {
    let value = SafeMath.lt(event.target.value, "0")
      ? "0"
      : SafeMath.gt(storeCtx.selectedTicker?.quoteCcyAvailable, "0") &&
        SafeMath.gte(
          SafeMath.mult(
            event.target.value,
            props.orderType === "market" ? buyPx : storeCtx.buyPx
          ),
          storeCtx.selectedTicker?.quoteCcyAvailable
        )
      ? SafeMath.div(
          storeCtx.selectedTicker?.quoteCcyAvailable,
          props.orderType === "market" ? buyPx : storeCtx.buyPx
        )
      : event.target.value;
    setBuySz(value);
    if (SafeMath.gt(value, "0")) {
      if (!!selectedTicker?.minSz && SafeMath.lt(value, selectedTicker?.minSz))
        setBuyErrorMessage(`Minimum order size is ${selectedTicker?.minSz}`);
      if (
        SafeMath.gte(
          SafeMath.mult(
            value,
            props.orderType === "market" ? buyPx : storeCtx.buyPx
          ),
          storeCtx.selectedTicker?.quoteCcyAvailable
        )
      )
        setBuyErrorMessage(
          `Available ${selectedTicker?.quoteCcy} is not enough`
        );
    } else {
      setBuyErrorMessage(null);
    }
  };
  const sellSzHandler = (event) => {
    let value = SafeMath.lt(event.target.value, "0")
      ? "0"
      : SafeMath.gt(storeCtx.selectedTicker?.baseCcyAvailable, "0") &&
        SafeMath.gte(
          event.target.value,
          storeCtx.selectedTicker?.baseCcyAvailable
        )
      ? storeCtx.selectedTicker?.baseCcyAvailable
      : event.target.value;
    setSellSz(value);
    if (SafeMath.gt(value, "0")) {
      if (!!selectedTicker?.minSz && SafeMath.lt(value, selectedTicker?.minSz))
        setSellErrorMessage(`Minimum order size is ${selectedTicker?.minSz}`);
      if (SafeMath.gte(value, storeCtx.selectedTicker?.baseCcyAvailable))
        setSellErrorMessage(
          `Available ${selectedTicker?.baseCcy} is not enough`
        );
    } else {
      setSellErrorMessage(null);
    }
  };

  const buyPctHandler = useCallback((selectedTicker, pct, buyPx) => {
    setBuySz(
      SafeMath.div(SafeMath.mult(pct, selectedTicker?.quoteCcyAvailable), buyPx)
    );
    setSelectedBuyPct(pct);
  }, []);

  const sellPctHandler = useCallback((selectedTicker, pct) => {
    setSellSz(SafeMath.mult(pct, selectedTicker.baseCcyAvailable));
    setSelectedSellPct(pct);
  }, []);

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
              px: storeCtx.buyPx,
              sz: buySz,
            }
          : {
              instId: storeCtx.selectedTicker.instId,
              tdMode,
              side,
              ordType: props.orderType,
              px: storeCtx.sellPx,
              sz: sellSz,
            }
        : {
            instId: storeCtx.selectedTicker.instId,
            tdMode,
            side,
            ordType: props.orderType,
            sz: side === "buy" ? buySz : sellSz,
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
      setBuySz("0");
      buyPctHandler(selectedTicker, "0.25", selectedTicker.last);
    } else {
      setSellSz("0");
      sellPctHandler(selectedTicker, "0.25", selectedTicker.last);
    }
  };

  // -- TEST
  useEffect(() => {
    if (
      (storeCtx.selectedTicker && !selectedBuyPct && !selectedSellPct) ||
      (storeCtx.selectedTicker &&
        storeCtx.selectedTicker.instId !== selectedTicker?.instId)
    ) {
      setSelectedTicker(storeCtx.selectedTicker);
      storeCtx.balances.forEach((balance) => {
        if (balance.ccy === storeCtx.selectedTicker?.quoteCcy)
          setQuoteCcyAvailable(balance.availBal);
        else if (balance.ccy === storeCtx.selectedTicker?.baseCcy)
          setBaseCcyAvailable(balance.availBal);
      });
      storeCtx.buyPxHandler(storeCtx.selectedTicker.last);
      storeCtx.sellPxHandler(storeCtx.selectedTicker.last);
      setBuyPx(storeCtx.selectedTicker.last);
      setSellPx(storeCtx.selectedTicker.last);
      buyPctHandler(
        storeCtx.selectedTicker,
        selectedBuyPct ?? "0.25",
        storeCtx.selectedTicker.last
      );
      sellPctHandler(storeCtx.selectedTicker, selectedSellPct ?? "0.25");
    }
    if (storeCtx.selectedTicker && props.orderType === "market") {
      setBuyPx(storeCtx.selectedTicker.last);
      setSellPx(storeCtx.selectedTicker.last);
    }
    return () => {};
  }, [
    props.orderType,
    selectedBuyPct,
    selectedSellPct,
    selectedTicker?.instId,
    storeCtx.selectedTicker,
    buyPctHandler,
    sellPctHandler,
    storeCtx,
    props.selectedTicker?.quoteCcy,
    props.selectedTicker?.baseCcy,
  ]);

  return (
    <div className="market-trade__panel">
      {width <= breakpoint ? (
        <Tabs defaultActiveKey="buy">
          <Tab eventKey="buy" title={t("buy")}>
            <TradeForm
              px={props.orderType === "market" ? buyPx : storeCtx.buyPx}
              sz={buySz}
              selectedTicker={selectedTicker}
              quoteCcyAvailable={quoteCcyAvailable}
              baseCcyAvailable={baseCcyAvailable}
              selectedPct={selectedBuyPct}
              onPxInput={!!props.readyOnly ? () => {} : storeCtx.buyPxHandler}
              onSzInput={buySzHandler}
              percentageHandler={buyPctHandler}
              onSubmit={onSubmit}
              side="buy"
              readyOnly={!!props.readyOnly}
              errorMessage={buyErrorMessage}
            />
          </Tab>
          <Tab eventKey="sell" title={t("sell")}>
            <TradeForm
              px={props.orderType === "market" ? sellPx : storeCtx.sellPx}
              sz={sellSz}
              selectedTicker={selectedTicker}
              selectedPct={selectedSellPct}
              onPxInput={!!props.readyOnly ? () => {} : storeCtx.sellPxHandler}
              onSzInput={sellSzHandler}
              percentageHandler={sellPctHandler}
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
            px={props.orderType === "market" ? buyPx : storeCtx.buyPx}
            sz={buySz}
            selectedTicker={selectedTicker}
            selectedPct={selectedBuyPct}
            onPxInput={!!props.readyOnly ? () => {} : storeCtx.buyPxHandler}
            onSzInput={buySzHandler}
            percentageHandler={buyPctHandler}
            onSubmit={onSubmit}
            side="buy"
            readyOnly={!!props.readyOnly}
            errorMessage={buyErrorMessage}
          />
          <TradeForm
            px={props.orderType === "market" ? sellPx : storeCtx.sellPx}
            sz={sellSz}
            selectedTicker={selectedTicker}
            selectedPct={selectedSellPct}
            onPxInput={!!props.readyOnly ? () => {} : storeCtx.sellPxHandler}
            onSzInput={sellSzHandler}
            percentageHandler={sellPctHandler}
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
