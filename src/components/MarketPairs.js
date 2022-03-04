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
import { useTranslation } from "react-i18next";
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

const PairsHeader = (props) => {
  const { t } = useTranslation();
  return (
    <ul className="header">
      <li>{t("pairs")}</li>
      <li>{t("unit_price")}</li>
      <li>{t("change")}</li>
      <li>{t("volume")}</li>
      <li>{t("high")}</li>
      <li>{t("low")}</li>
    </ul>
  );
};
const quoteCcies = ["btc", "eth", "usdt", "hkd", "usdx", "inno", "usd", "alts"];

const MarketPairs = (props) => {
  const storeCtx = useContext(StoreContext);
  const inputRef = useRef();
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [defaultActiveKey, setDefaultActiveKey] = useState("btc");
  const [filteredTickers, setFilteredTickers] = useState([]);

  const filterTickers = useCallback(() => {
    const tickers = storeCtx.tickers.filter(
      (ticker) =>
        !inputRef.current ||
        ticker.instId
          ?.toLowerCase()
          .includes(inputRef.current.value.toLowerCase())
    );
    setFilteredTickers(tickers);
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
        <Tab eventKey="btc" title="BTC">
          <PairsHeader />
          <PairList
            tickers={filteredTickers.filter(
              (ticker) => ticker.quoteCcy === "BTC"
            )}
          />
        </Tab>
        <Tab eventKey="eth" title="ETH">
          <PairsHeader />
          <PairList
            tickers={filteredTickers.filter(
              (ticker) => ticker.quoteCcy === "ETH"
            )}
          />
        </Tab>
        <Tab eventKey="usdt" title="USDT">
          <PairsHeader />
          <PairList
            tickers={filteredTickers.filter(
              (ticker) => ticker.quoteCcy === "USDT"
            )}
          />
        </Tab>
        <Tab eventKey="hkd" title="HKD">
          <PairsHeader />
          <PairList
            tickers={filteredTickers.filter(
              (ticker) => ticker.quoteCcy === "HKD"
            )}
          />
        </Tab>
        <Tab eventKey="usdx" title="USDX">
          <PairsHeader />
          <PairList
            tickers={filteredTickers.filter(
              (ticker) => ticker.quoteCcy === "USDX"
            )}
          />
        </Tab>
        <Tab eventKey="inno" title="INNO">
          <PairsHeader />
          <PairList
            tickers={filteredTickers.filter(
              (ticker) => ticker.quoteCcy === "INNO"
            )}
          />
        </Tab>
        <Tab eventKey="usd" title="USD">
          <PairsHeader />
          <PairList
            tickers={filteredTickers.filter(
              (ticker) => ticker.quoteCcy === "USD"
            )}
          />
        </Tab>
        <Tab eventKey="alts" title="ALTS">
          <PairsHeader />
          <PairList
            tickers={filteredTickers.filter(
              (ticker) => ticker.quoteCcy === "ALTS"
            )}
          />
        </Tab>
      </Tabs>
    </div>
  );
};

export default MarketPairs;
