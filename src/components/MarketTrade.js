import React, { useContext, useState, useEffect, useCallback } from "react";
import StoreContext from "../store/store-context";
import { Tabs, Tab } from "react-bootstrap";
import { formateDecimal } from "../utils/Utils";
import SafeMath from "../utils/SafeMath";

const TradeForm = (props) => {
  return (
    <form
      onSubmit={(e) => {
        props.onSubmit(e, props.side);
      }}
    >
      <div className="input-group">
        <input
          type="number"
          className="form-control"
          placeholder="Price"
          value={props.px}
          onInput={props.onPxInput}
          required={!props.readyOnly}
          disabled={!!props.readyOnly}
          step="any"
        />
        <div className="input-group-append">
          <span className="input-group-text">
            {props.selectedTicker?.quoteCcy || "--"}
          </span>
        </div>
      </div>
      <div className="input-group">
        <input
          type="number"
          className="form-control"
          placeholder="Amount"
          value={props.sz}
          onInput={props.onSzInput}
          required
          step="any"
        />
        <div className="input-group-append">
          <span className="input-group-text">
            {props.selectedTicker?.baseCcy || "--"}
          </span>
        </div>
      </div>
      <p
        className={`error-message ${
          SafeMath.lt(props.sz, props.selectedTicker?.minSz) ? "show" : ""
        }`}
      >
        Minimum order size is {`${props.selectedTicker?.minSz}`}
      </p>
      <ul className="market-trade-list">
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
            onClick={() => props.percentageHandler(props.selectedTicker, "0.5", props.px)}
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
            onClick={() => props.percentageHandler(props.selectedTicker, "1.0", props.px)}
          >
            100%
          </span>
        </li>
      </ul>
      <p>
        Available:
        <span>
          {`${
            props.selectedTicker
              ? formateDecimal(
                  props.side === "buy"
                    ? props.selectedTicker?.quoteCcyAvailable
                    : props.selectedTicker?.baseCcyAvailable,
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
      <p>
        Volume:
        <span>
          {`${
            props.selectedTicker
              ? formateDecimal(
                  props.side === "buy"
                    ? props.selectedTicker?.volCcy24h
                    : props.selectedTicker?.vol24h,
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
      <p>
        Margin:
        <span>
          {`0 `}
          {props.side === "buy"
            ? props.selectedTicker?.quoteCcy || "--"
            : props.selectedTicker?.baseCcy || "--"}
          = 0 USD
        </span>
      </p>
      <p>
        Fee:
        <span>
          {`0 `}
          {props.side === "buy"
            ? props.selectedTicker?.quoteCcy || "--"
            : props.selectedTicker?.baseCcy || "--"}
          = 0 USD
        </span>
      </p>
      <button
        type="submit"
        className={`btn ${props.side === "buy" ? "buy" : "sell"}`}
        disabled={
          !props.selectedTicker ||
          SafeMath.gt(
            props.sz,
            props.side === "buy"
              ? SafeMath.div(props.selectedTicker?.quoteCcyAvailable, props.px)
              : props.selectedTicker?.baseCcyAvailable
          ) ||
          SafeMath.lte(props.sz, "0") ||
          SafeMath.lte(props.sz, props.selectedTicker?.minSz)
        }
      >
        {props.side === "buy" ? "Buy" : "Sell"}
        {` ${props.selectedTicker?.baseCcy ?? ""}`}
      </button>
    </form>
  );
};

const TradePannel = (props) => {
  const storeCtx = useContext(StoreContext);
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [buyPx, setBuyPx] = useState(null);
  const [buySz, setBuySz] = useState(null);
  const [tdMode, setTdMode] = useState("cash");
  const [sellPx, setSellPx] = useState(null);
  const [sellSz, setSellSz] = useState(null);
  const [selectedBuyPct, setSelectedBuyPct] = useState(null);
  const [selectedSellPct, setSelectedSellPct] = useState(null);

  const buyPxHandler = (event) => {
    let value = +event.target.value < 0 ? "0" : event.target.value;
    setBuyPx(value);
  };
  const buySzHandler = (event) => {
    let value = SafeMath.lt(event.target.value, "0")
      ? "0"
      : SafeMath.gte(
          SafeMath.mult(event.target.value, buyPx),
          storeCtx.selectedTicker?.quoteCcyAvailable
        )
      ? SafeMath.div(storeCtx.selectedTicker?.quoteCcyAvailable, buyPx)
      : event.target.value;
    setBuySz(value);
  };
  const sellPxHandler = (event) => {
    let value = +event.target.value < 0 ? "0" : event.target.value;
    setSellPx(value);
  };
  const sellSzHandler = (event) => {
    let value = SafeMath.lt(event.target.value, "0")
      ? "0"
      : SafeMath.gte(
          event.target.value,
          storeCtx.selectedTicker?.baseCcyAvailable
        )
      ? storeCtx.selectedTicker?.baseCcyAvailable
      : event.target.value;
    setSellSz(value);
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
              px: buyPx,
              sz: buySz,
            }
          : {
              instId: storeCtx.selectedTicker.instId,
              tdMode,
              side,
              ordType: props.orderType,
              px: sellPx,
              sz: sellSz,
            }
        : {
            instId: storeCtx.selectedTicker.instId,
            tdMode,
            side,
            ordType: props.orderType,
            sz: side === "buy" ? buySz : sellSz,
          };
    storeCtx.postOrder(order);
  };

  // -- TEST
  useEffect(() => {
    if (
      (storeCtx.selectedTicker && props.orderType === "market") ||
      (storeCtx.selectedTicker && !selectedBuyPct && !selectedSellPct) ||
      (storeCtx.selectedTicker &&
        storeCtx.selectedTicker.instId !== selectedTicker?.instId)
    ) {
      console.log(
        `MarketTrade storeCtx.selectedTicker`,
        storeCtx.selectedTicker
      );
      // setBuyPx(storeCtx.selectedTicker.askPx);
      // setSellPx(storeCtx.selectedTicker.bidPx);
      setSelectedTicker(storeCtx.selectedTicker);
      setBuyPx(storeCtx.selectedTicker.last);
      setSellPx(storeCtx.selectedTicker.last);
      buyPctHandler(
        storeCtx.selectedTicker,
        selectedBuyPct ?? "0.25",
        storeCtx.selectedTicker.last
      );
      sellPctHandler(storeCtx.selectedTicker, selectedSellPct ?? "0.25");
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
  ]);

  return (
    <div className="d-flex justify-content-between">
      <div className="market-trade-buy">
        <TradeForm
          px={buyPx}
          sz={buySz}
          selectedTicker={selectedTicker}
          selectedPct={selectedBuyPct}
          onPxInput={buyPxHandler}
          onSzInput={buySzHandler}
          percentageHandler={buyPctHandler}
          onSubmit={onSubmit}
          side="buy"
          readyOnly={!!props.readyOnly}
        />
      </div>
      <div className="market-trade-sell">
        <TradeForm
          px={sellPx}
          sz={sellSz}
          selectedPct={selectedSellPct}
          onPxInput={sellPxHandler}
          onSzInput={sellSzHandler}
          percentageHandler={sellPctHandler}
          onSubmit={onSubmit}
          side="sell"
          readyOnly={!!props.readyOnly}
        />
      </div>
    </div>
  );
};

const MarketTrade = (props) => {
  return (
    <>
      <div className="market-trade">
        <Tabs defaultActiveKey="limit">
          <Tab eventKey="limit" title="Limit">
            <TradePannel orderType="limit" />
          </Tab>
          <Tab eventKey="market" title="Market">
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
    </>
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
