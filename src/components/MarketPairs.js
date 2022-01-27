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

import { formateDecimal } from "../utils/Utils";

const PairTile = (props) => {
  const storeCtx = useContext(StoreContext);

  return (
    <tr
      onClick={(_) => storeCtx.selectTickerHandler(props.ticker)}
      className={`market-tile ${
        props.ticker.instId === storeCtx?.selectedTicker?.instId ? "active" : ""
      } ${props.ticker.update ? "update" : ""}`}
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

const MarketPairs = (props) => {
  const storeCtx = useContext(StoreContext);
  const inputRef = useRef();
  const [BTCBasedTickers, setBTCBasedTickers] = useState([]);
  const [ETHBasedTickers, setETHBasedTickers] = useState([]);
  const [USDTBasedTickers, setUSDTBasedTickers] = useState([]);
  const [starTickers, setStarTickers] = useState([]);

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
        <Tabs defaultActiveKey="btc">
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
                {starTickers.map((ticker, index) => (
                  <PairTile
                    ticker={ticker}
                    key={`${ticker.instId}-${ticker.instType}-${index}-star`}
                    onClick={props.onClick}
                  />
                ))}
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
                {BTCBasedTickers.map((ticker, index) => (
                  <PairTile
                    ticker={ticker}
                    key={`${ticker.instId}-${ticker.instType}-${index}-BTC`}
                    onClick={props.onClick}
                  />
                ))}
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
                {ETHBasedTickers.map((ticker, index) => (
                  <PairTile
                    ticker={ticker}
                    key={`${ticker.instId}-${ticker.instType}-${index}-ETH`}
                    onClick={props.onClick}
                  />
                ))}
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
                {USDTBasedTickers.map((ticker, index) => (
                  <PairTile
                    ticker={ticker}
                    key={`${ticker.instId}-${ticker.instType}-${index}-USDT`}
                    onClick={props.onClick}
                  />
                ))}
              </tbody>
            </table>
          </Tab>
        </Tabs>
      </div>
    </>
  );
};

export default MarketPairs;
