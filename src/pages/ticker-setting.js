import React, { useState, useEffect, useCallback } from "react";
import TableSwitch from "../components/TableSwitch";
import TableDropdown from "../components/TableDropdown";

const categories = {
  HKD: ["HKD"],
  USDX: ["USDC", "USDT", "USDK"],
  INNO: ["INNO"],
  USD: ["USD"],
  ALTS: ["USX"],
};

const quoteCurrencies = ["HKD", "USDC", "USDT", "USDK", "USD"];

const TickerSetting = () => {
  const [showMore, setShowMore] = useState(false);
  const [isInit, setIsInit] = useState(null);
  const [tickers, setTickers] = useState(null);
  const [filterTickers, setFilterTickers] = useState(null);
  const [filterOption, setFilterOption] = useState("all"); //'open','close'
  const [filterKey, setFilterKey] = useState("");
  const [quoteUnit, setQuoteUnit] = useState("USDT");

  const filter = useCallback(
    ({ keyword, status, quote, filterTickers }) => {
      if (status) setFilterOption(status);
      if (quote) setQuoteUnit(quote);
      let _tickers = filterTickers || tickers,
        _option = status || filterOption,
        _keyword = keyword === undefined ? filterKey : keyword,
        _quoteUnit = quote || quoteUnit;
      if (_tickers) {
        _tickers = Object.values(_tickers).filter((ticker) => {
          if (_option === "all")
            return (
              ticker.name.includes(_keyword) && ticker.quoteUnit === _quoteUnit
            );
          else
            return (
              ticker.status === _option &&
              ticker.name.includes(_keyword) &&
              ticker.quoteUnit === _quoteUnit
            );
        });
        setFilterTickers(_tickers);
      }
    },
    [filterKey, filterOption, quoteUnit, tickers]
  );

  const getTickers = useCallback(async () => {
    return Promise.resolve({
      btcusdt: {
        id: "btcusdt",
        name: "BTC/ USDT",
        baseUnit: "BTC",
        quoteUnit: "USDT",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        fee: "0.000001",
        exchange: "OKEx",
        exchanges: ["TideBit", "OKEx"],
        status: "open", // 'close'
      },
      btchkd: {
        id: "btchkd",
        name: "BTC/ HKD",
        baseUnit: "BTC",
        quoteUnit: "HKD",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        fee: null,
        exchange: "OKEx",
        exchanges: ["TideBit", "OKEx"],
        status: "open", // 'close'
      },
      btcusd: {
        id: "btcusd",
        name: "BTC/ USD",
        baseUnit: "BTC",
        quoteUnit: "USD",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        fee: null,
        exchange: "OKEx",
        exchanges: ["TideBit", "OKEx"],
        status: "open", // 'close'
      },
      bchusdc: {
        id: "bchusdc",
        name: "BCH/ USDC",
        baseUnit: "BCH",
        quoteUnit: "USDC",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        fee: null,
        exchange: "OKEx",
        exchanges: ["TideBit", "OKEx"],
        status: "open", // 'close'
      },
      ethusdt: {
        id: "ethusdt",
        name: "ETH/ USDT",
        baseUnit: "ETH",
        quoteUnit: "USDT",
        price: "39810.45",
        volume: "22058.73",
        change: "458.83",
        changePct: "0.0114",
        fee: null,
        exchange: "OKEx",
        exchanges: ["TideBit", "OKEx"],
        status: "open", // 'close'
      },
      lunausdt: {
        id: "lunausdt",
        name: "LUNA/ USDT",
        baseUnit: "LUNA",
        quoteUnit: "USDT",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        fee: null,
        exchange: null,
        exchanges: [],
        status: "close", // 'close'
      },
      busdusdt: {
        id: "busdusdt",
        name: "BUSD/ USDT",
        baseUnit: "BUSD",
        quoteUnit: "USDT",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        fee: null,
        exchange: null,
        exchanges: [],
        status: "close", // 'close'
      },
      trxusdt: {
        id: "trxusdt",
        name: "TRX/ USDT",
        baseUnit: "TRX",
        quoteUnit: "USDT",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        fee: null,
        exchange: null,
        exchanges: [],
        status: "close", // 'close'
      },
      bnbusdt: {
        id: "bnbusdt",
        name: "BNB/ USDT",
        baseUnit: "BNB",
        quoteUnit: "USDT",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        fee: null,
        exchange: null,
        exchanges: [],
        status: "close", // 'close'
      },
      abcusdt: {
        id: "abcusdt",
        name: "ABC/ USDT",
        baseUnit: "ABC",
        quoteUnit: "USDT",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        fee: null,
        exchange: null,
        exchanges: [],
        status: "close", // 'close'
      },
      xrpusdt: {
        id: "xrpusdt",
        name: "XRP/ USDT",
        baseUnit: "XRP",
        quoteUnit: "USDT",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        fee: null,
        exchange: null,
        exchanges: [],
        status: "close", // 'close'
      },
      usdcusdt: {
        id: "usdcusdt",
        name: "USDC/ USDT",
        baseUnit: "USDC",
        quoteUnit: "USDT",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        fee: null,
        exchange: null,
        exchanges: [],
        status: "close", // 'close'
      },
      solusdt: {
        id: "solusdt",
        name: "SOL/ USDT",
        baseUnit: "SOL",
        quoteUnit: "USDT",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        fee: null,
        exchange: null,
        exchanges: [],
        status: "close", // 'close'
      },
    });
  }, []);

  const sorting = () => {};

  const switchExchange = useCallback(
    (exchange, id) => {
      console.log(`switchExchange`, exchange, id);
      const updateTickers = { ...tickers };
      updateTickers[id].exchange = exchange;
      setTickers(updateTickers);
      filter(filterOption, updateTickers);
    },
    [tickers, filter, filterOption]
  );

  const toggleStatus = useCallback(
    (status, id) => {
      console.log(`toggleStatus`, status, id);
      const updateTickers = { ...tickers };
      updateTickers[id].status = status === "open" ? "close" : "open";
      console.log(`toggleStatus updateTickers[${id}]`, updateTickers[id]);
      setTickers(updateTickers);
      filter(filterOption, updateTickers);
    },
    [tickers, filter, filterOption]
  );

  const init = useCallback(() => {
    setIsInit(async (prev) => {
      if (!prev) {
        const tickers = await getTickers();
        setTickers(tickers);
        console.log(tickers);
        filter({ filterTickers: tickers });
        return !prev;
      } else return prev;
    });
  }, [getTickers, filter]);

  useEffect(() => {
    if (!isInit) {
      init();
    }
  }, [init, isInit]);

  return (
    <section className="screen__section admin-ticker">
      <div className="screen__header">交易對設定</div>
      <div className="screen__search-bar">
        <TableDropdown
          className="admin-ticker__filter"
          selectHandler={(option) => filter({ quote: option })}
          options={quoteCurrencies}
          selected={quoteUnit}
        />
        <div className="screen__search-box">
          <input
            type="text"
            inputMode="search"
            className="screen__search-input"
            placeholder="輸入欲搜尋的關鍵字"
            onInput={(e) => {
              setFilterKey(e.target.value);
              filter({ keyword: e.target.value });
            }}
          />
          <div className="screen__search-icon">
            <div className="screen__search-icon--circle"></div>
            <div className="screen__search-icon--rectangle"></div>
          </div>
        </div>
      </div>
      <div className="screen__tool-bar">
        <div className="screen__display">
          <div className="screen__display-title">顯示：</div>
          <ul className="screen__display-options">
            <li
              className={`screen__display-option${
                filterOption === "all" ? " active" : ""
              }`}
              onClick={() => filter({ status: "all" })}
            >
              全部
            </li>
            <li
              className={`screen__display-option${
                filterOption === "open" ? " active" : ""
              }`}
              onClick={() => filter({ status: "open" })}
            >
              已開啟
            </li>
            <li
              className={`screen__display-option${
                filterOption === "close" ? " active" : ""
              }`}
              onClick={() => filter({ status: "close" })}
            >
              未開啟
            </li>
          </ul>
        </div>
        <div className="screen__sorting">
          <img src="/img/sorting@2x.png" alt="sorting" />
        </div>
      </div>
      <div className={`screen__table${showMore ? " show" : ""}`}>
        <ul className="screen__table-headers">
          <li className="screen__table-header">交易對</li>
          <li className="screen__table-header">價格</li>
          <li className="screen__table-header">24h 成交量</li>
          <li className="screen__table-header">24h 漲跌</li>
          <li className="screen__table-header">交易所</li>
          <li className="screen__table-header">外部手續費</li>
          <li className="screen__table-header-btn">
            <button
              disabled={`${
                !Object.values(tickers || {}).some(
                  (ticker) => ticker.status === "open"
                )
                  ? "disable"
                  : ""
              }`}
              onClick={() => {
                const updateTickers = { ...tickers };
                Object.values(updateTickers).forEach(
                  (ticker) => (ticker.status = "close")
                );
                setTickers(updateTickers);
                filter(filterOption, updateTickers);
              }}
            >
              全部關閉
            </button>
            /
            <button
              disabled={`${
                !Object.values(tickers || {}).some(
                  (ticker) => ticker.status === "close"
                )
                  ? "disable"
                  : ""
              }`}
              onClick={() => {
                const updateTickers = { ...tickers };
                Object.values(updateTickers).forEach(
                  (ticker) => (ticker.status = "open")
                );
                setTickers(updateTickers);
                filter(filterOption, updateTickers);
              }}
            >
              全部開啟
            </button>
          </li>
        </ul>
        <ul className="screen__table-rows">
          {filterTickers &&
            filterTickers.map((ticker) => (
              <div
                className={`admin-ticker__tile screen__table-row${
                  ticker.change > 0 ? " increase" : " descrease"
                }`}
                key={ticker.id}
              >
                <div className="admin-ticker__text screen__table-item">
                  {ticker.name}
                </div>
                <div className="admin-ticker__text screen__table-item">
                  {ticker.price}
                </div>
                <div className="admin-ticker__text screen__table-item">
                  {ticker.volume}
                </div>
                <div className="admin-ticker__text screen__table-item">
                  {`${(ticker.changePct * 100).toFixed(2)}%`}
                </div>
                <TableDropdown
                  className="screen__table-item"
                  selectHandler={(option) => switchExchange(option, ticker.id)}
                  options={ticker.exchanges}
                  selected={ticker.exchange}
                />
                <div className="admin-ticker__text screen__table-item">
                  {ticker.fee ? `${(ticker.fee * 100).toFixed(4)}%` : "-"}
                </div>
                <TableSwitch
                  className="screen__table-switch"
                  status={ticker.status === "open"}
                  toggleStatus={() => toggleStatus(ticker.status, ticker.id)}
                />
              </div>
            ))}
        </ul>
        <div
          className="screen__table-btn screen__table-text"
          onClick={() => setShowMore((prev) => !prev)}
        >
          {showMore ? "顯示更少" : "顯示更多"}
        </div>
      </div>
      <div className="screen__floating-box">
        <div
          className="screen__floating-btn"
          onClick={() => {
            const screenSection =
              window.document.querySelector(".screen__section");
            // console.log(screenSection.scrollTop)
            screenSection.scroll(0, 0);
          }}
        >
          <img src="/img/floating-btn@2x.png" alt="arrow" />
        </div>
      </div>
    </section>
  );
};

export default TickerSetting;
