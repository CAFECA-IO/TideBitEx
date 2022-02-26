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
import { IoSearch } from "react-icons/io5";

import { formateDecimal } from "../utils/Utils";

const PairTile = (props) => {
  const storeCtx = useContext(StoreContext);
  return (
    <li
      onClick={(_) => storeCtx.selectTickerHandler(props.ticker)}
      className={`market-tile ${
        props.ticker.instId === storeCtx?.selectedTicker?.instId ? "active" : ""
      } ${storeCtx.updateTickerIndexs.includes(props.index) ? "update" : ""}`}
    >
      <div>{props.ticker.pair}</div>
      <div>{formateDecimal(props.ticker.last, 8)}</div>
      <div className={SafeMath.gte(props.ticker.change, "0") ? "green" : "red"}>
        {SafeMath.gte(props.ticker.change, "0")
          ? `+${formateDecimal(props.ticker.changePct, 3)}%`
          : `${formateDecimal(props.ticker.changePct, 3)}%`}
      </div>
      <div>{formateDecimal(props.ticker.vol24h, 8)}</div>
      <div>{formateDecimal(props.ticker.high24h, 8)}</div>
      <div>{formateDecimal(props.ticker.low24h, 8)}</div>
    </li>
  );
};

const PairList = (props) => {
  return (
    <ul className="pair-list">
      {props.tickers.map((ticker, index) => (
        <PairTile
          ticker={ticker}
          index={index}
          key={`${ticker.instId}-${ticker.instType}-${index}-star`}
        />
      ))}
    </ul>
  );
};

const MarketPairs = (props) => {
  const storeCtx = useContext(StoreContext);
  const inputRef = useRef();
  const [selectedTicker, setSelectedTicker] = useState("btc");

  const [BTCBasedTickers, setBTCBasedTickers] = useState([]);
  const [ETHBasedTickers, setETHBasedTickers] = useState([]);
  const [USDTBasedTickers, setUSDTBasedTickers] = useState([]);
  const [defaultActiveKey, setDefaultActiveKey] = useState("btc");
  // const [starTickers, setStarTickers] = useState([]);

  const filterTickers = useCallback(() => {
    const tickers = storeCtx.tickers.filter(
      (ticker) =>
        !inputRef.current ||
        ticker.instId
          ?.toLowerCase()
          .includes(inputRef.current.value.toLowerCase())
    );

    setBTCBasedTickers(tickers.filter((ticker) => ticker.quoteCcy === "BTC"));
    setETHBasedTickers(tickers.filter((ticker) => ticker.quoteCcy === "ETH"));
    setUSDTBasedTickers(tickers.filter((ticker) => ticker.quoteCcy === "USDT"));
  }, [storeCtx.tickers]);

  useEffect(() => {
    filterTickers();
    return () => {};
  }, [filterTickers]);

  useEffect(() => {
    if (
      (storeCtx.selectedTicker && !selectedTicker) ||
      (storeCtx.selectedTicker &&
        storeCtx.selectedTicker?.instId !== selectedTicker?.instId)
    ) {
      console.log(`storeCtx.selectedTicker`, storeCtx.selectedTicker);
      setSelectedTicker(storeCtx.selectedTicker);
      setDefaultActiveKey(storeCtx.selectedTicker?.quoteCcy?.toLowerCase());
    }
  }, [selectedTicker, storeCtx.selectedTicker]);

  return (
    <div className="market-pairs">
      <div className="input-group">
        <div className="input-group-prepend">
          <span className="input-group-text" id="inputGroup-sizing-sm">
            <IoSearch />
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
      <Tabs defaultActiveKey={defaultActiveKey}>
        {/* <Tab eventKey="star" title="★">
          <table className="table star-active">
            <thead>
              <tr>
                <th>Pairs</th>
                <th>Last Price</th>
                <th>Change</th>
              </tr>
            </thead>
            <PairList tickers={starTickers} />
          </table>
        </Tab> */}
        <Tab eventKey="btc" title="BTC">
          <ul className="header">
            <li>Pairs</li>
            <li>Last Price</li>
            <li>Change</li>
            <li>Volume</li>
            <li>High</li>
            <li>Low</li>
          </ul>
          <PairList tickers={BTCBasedTickers} />
        </Tab>
        <Tab eventKey="eth" title="ETH">
          <ul className="header">
            <li>Pairs</li>
            <li>Last Price</li>
            <li>Change</li>
            <li>Volume</li>
            <li>High</li>
            <li>Low</li>
          </ul>
          <PairList tickers={ETHBasedTickers} />
        </Tab>
        <Tab eventKey="usdt" title="USDT">
          <ul className="header">
            <li>Pairs</li>
            <li>Last Price</li>
            <li>Change</li>
            <li>Volume</li>
            <li>High</li>
            <li>Low</li>
          </ul>
          <PairList tickers={USDTBasedTickers} />
        </Tab>
      </Tabs>
    </div>
  );
};

export default MarketPairs;
