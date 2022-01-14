import React, { useContext, useState, useEffect } from "react";
import StoreContext from "../store/store-context";
import { Tabs, Tab } from "react-bootstrap";

const TradeForm = (props) => {
  const storeCtx = useContext(StoreContext);
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
          required
          step="any"
        />
        <div className="input-group-append">
          <span className="input-group-text">
            {storeCtx?.selectedTicker?.quoteCcy || "--"}
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
            {storeCtx?.selectedTicker?.baseCcy || "--"}
          </span>
        </div>
      </div>
      <ul className="market-trade-list">
        <li className={`${props.selectedPct === "0.25" ? "active" : ""}`}>
          <span onClick={() => props.percentageHandler("0.25")}>25%</span>
        </li>
        <li className={`${props.selectedPct === "0.5" ? "active" : ""}`}>
          <span onClick={() => props.percentageHandler("0.5")}>50%</span>
        </li>
        <li className={`${props.selectedPct === "0.75" ? "active" : ""}`}>
          <span onClick={() => props.percentageHandler("0.75")}>75%</span>
        </li>
        <li className={`${props.selectedPct === "1.0" ? "active" : ""}`}>
          <span onClick={() => props.percentageHandler("1.0")}>100%</span>
        </li>
      </ul>
      <p>
        Available:{" "}
        <span>0 {storeCtx?.selectedTicker?.quoteCcy || "--"} = 0 USD</span>
      </p>
      <p>
        Volume:{" "}
        <span>0 {storeCtx?.selectedTicker?.quoteCcy || "--"} = 0 USD</span>
      </p>
      <p>
        Margin:{" "}
        <span>0 {storeCtx?.selectedTicker?.quoteCcy || "--"} = 0 USD</span>
      </p>
      <p>
        Fee: <span>0 {storeCtx?.selectedTicker?.quoteCcy || "--"} = 0 USD</span>
      </p>
      <button
        type="submit"
        className={`btn ${props.side === "buy" ? "buy" : "sell"}`}
      >
        {props.side === "buy" ? "Buy" : "Sell"}
      </button>
    </form>
  );
};

const TradePannel = (props) => {
  const storeCtx = useContext(StoreContext);
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
    let value = +event.target.value < 0 ? "0" : event.target.value;
    setBuySz(value);
  };
  const sellPxHandler = (event) => {
    let value = +event.target.value < 0 ? "0" : event.target.value;
    setSellPx(value);
  };
  const sellSzHandler = (event) => {
    let value = +event.target.value < 0 ? "0" : event.target.value;
    setSellSz(value);
  };

  const buyPctHandler = (pct) => {
    setSelectedBuyPct(pct);
  };

  const sellPctHandler = (pct) => {
    setSelectedSellPct(pct);
  };

  const onSubmit = async (event, side) => {
    event.preventDefault();
    if (!storeCtx?.selectedTicker) return;
    const order =
      side === "buy"
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
            sz: sellSz,
          };
    console.log(`order`, order);
    try {
      const result = await storeCtx.postOrder(order);
      console.log(`result`, result);
    } catch (error) {
      console.log(`error`, error);
    }
  };

  // -- TEST
  useEffect(() => {
    if (storeCtx.selectedTicker) {
      setBuyPx(storeCtx.selectedTicker.bidPx);
      setBuySz("1");
      setSellPx(storeCtx.selectedTicker.askPx);
      setSellSz("1");
    }
    return () => {};
  }, [storeCtx.selectedTicker]);

  return (
    <div className="d-flex justify-content-between">
      <div className="market-trade-buy">
        <TradeForm
          px={buyPx}
          sz={buySz}
          selectedPct={selectedBuyPct}
          onPxInput={buyPxHandler}
          onSzInput={buySzHandler}
          percentageHandler={buyPctHandler}
          onSubmit={onSubmit}
          side="buy"
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
            <TradePannel orderType="market" />
          </Tab>
          <Tab eventKey="stop-limit" title="Stop Limit">
            <TradePannel orderType="stop-limit" />
          </Tab>
          <Tab eventKey="stop-market" title="Stop Market">
            <TradePannel orderType="stop-market" />
          </Tab>
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
