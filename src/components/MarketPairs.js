import React, {
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { Tabs, Tab } from "react-bootstrap";
import StoreContext from "../store/store-context";
import SafeMath from "../utils/SafeMath";
import { FixedSizeList as List } from "react-window";

import { formateDecimal } from "../utils/Utils";

const PairTile = (props) => {
  const storeCtx = useContext(StoreContext);
  return (
    <tr
      onClick={(_) => storeCtx.selectTickerHandler(props.ticker)}
      className={`market-tile ${
        props.ticker.instId === storeCtx?.selectedTicker?.instId ? "active" : ""
      } ${
        storeCtx.updateTickerIndexs &&
        storeCtx.updateTickerIndexs[props.eventKey]?.includes(props.index)
          ? "update"
          : ""
      }`}
    >
      <td>
        <i className="icon ion-md-star"></i> {props.ticker.pair}
      </td>
      <td>{formateDecimal(props.ticker.last, 8)}</td>
      <td className={SafeMath.gt(props.ticker.change, "0") ? "green" : "red"}>
        {SafeMath.gt(props.ticker.change, "0")
          ? `+${formateDecimal(props.ticker.changePct, 3)}%`
          : `${formateDecimal(props.ticker.changePct, 3)}%`}
      </td>
    </tr>
  );
};

const PairList = (props) => {
  return (
    <React.Fragment>
      {props.tickers.map((ticker, index) => (
        <PairTile
          ticker={ticker}
          key={`${ticker.instId}-${ticker.instType}-${index}-BTC`}
          onClick={props.onClick}
          index={index}
          eventKey={props.eventKey}
        />
      ))}
    </React.Fragment>
  );
};

const MarketPairs = (props) => {
  const storeCtx = useContext(StoreContext);
  const inputRef = useRef();
  const [tickers, setTickers] = useState(null);
  const [starTickers, setStarTickers] = useState([]);
  const [key, setKey] = useState("btc");

  const filterTickers = useCallback(() => {
    if (!storeCtx.tickers) return;
    const updateTickers = { ...storeCtx.tickers };
    updateTickers[key] = storeCtx.tickers[key].filter(
      (ticker) =>
        !inputRef.current ||
        ticker.instId
          ?.toLowerCase()
          .includes(inputRef.current.value.toLowerCase())
    );
    setTickers(updateTickers);
  }, [key, storeCtx.tickers]);

  useEffect(() => {
    filterTickers();
    return () => {};
  }, [filterTickers]);

  return (
    <>
      <div className="market-pairs">
        <div className="input-group">
          <div className="input-group-prepend">
            <span className="input-group-text" id="inputGroup-sizing-sm">
              <i className="icon ion-md-search"></i>
            </span>
          </div>
          <input
            type="text"
            className="form-control"
            placeholder="Search"
            aria-describedby="inputGroup-sizing-sm"
            ref={inputRef}
            onChange={filterTickers}
          />
        </div>
        <Tabs activeKey={key} onSelect={(k) => setKey(k)}>
          <Tab eventKey="star" title="★">
            <table className="table star-active">
              <thead>
                <tr>
                  <th>Pairs</th>
                  <th>Last Price</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {key === "star" && (
                  <PairList
                    tickers={starTickers}
                    eventKey="star"
                    onClick={props.onClick}
                  />
                )}
              </tbody>
            </table>
          </Tab>
          <Tab eventKey="btc" title="BTC">
            <table className="table">
              <thead>
                <tr>
                  <th>Pairs</th>
                  <th>Last Price</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {tickers && key === "btc" && (
                  <PairList
                    tickers={tickers["btc"]}
                    eventKey="btc"
                    onClick={props.onClick}
                  />
                )}
              </tbody>
            </table>
          </Tab>
          <Tab eventKey="eth" title="ETH">
            <table className="table">
              <thead>
                <tr>
                  <th>Pairs</th>
                  <th>Last Price</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {tickers && key === "eth" && (
                  <PairList
                    tickers={tickers["eth"]}
                    eventKey="eth"
                    onClick={props.onClick}
                  />
                )}
              </tbody>
            </table>
          </Tab>
          <Tab eventKey="usdt" title="USDT">
            <table className="table">
              <thead>
                <tr>
                  <th>Pairs</th>
                  <th>Last Price</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {tickers && key === "usdt" && (
                  <PairList
                    tickers={tickers["usdt"]}
                    eventKey="usdt"
                    onClick={props.onClick}
                  />
                )}
              </tbody>
            </table>
          </Tab>
        </Tabs>
      </div>
    </>
  );
};

export default MarketPairs;
