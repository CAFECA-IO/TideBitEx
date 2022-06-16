import React, { useState, useEffect, useCallback } from "react";
import TableSwitch from "../components/TableSwitch";
import TableDropdown from "../components/TableDropdown";
import ScreenTags from "../components/ScreenTags";

const TickerSetting = () => {
  const [isInit, setIsInit] = useState(null);
  const [selectedTag, setSelectedTag] = useState("ALL");
  const [tickers, setTickers] = useState(null);
  const [filterTickers, setFilterTickers] = useState(null);
  const [filterOption, setFilterOption] = useState("all"); //'open','close'
  const [baseCurr, setBaseCurr] = useState("ALL");
  const [quoteCurr, setQuoteCurr] = useState("USDT");

  const getTickers = useCallback(async () => {
    return Promise.resolve({
      btcusdt: {
        id: "btcusdt",
        name: "BTC/ USDT",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        exchange: "OKEx",
        exchanges: ["TideBit", "OKEx"],
        status: "open", // 'close'
      },
      ethusdt: {
        id: "ethusdt",
        name: "ETH/ USDT",
        price: "39810.45",
        volume: "22058.73",
        change: "458.83",
        changePct: "0.0114",
        exchange: "OKEx",
        exchanges: ["TideBit", "OKEx"],
        status: "open", // 'close'
      },
      lunausdt: {
        id: "lunausdt",
        name: "LUNA/ USDT",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        exchange: null,
        exchanges: [],
        status: "close", // 'close'
      },
      busdusdt: {
        id: "busdusdt",
        name: "BUSD/ USDT",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        exchange: null,
        exchanges: [],
        status: "close", // 'close'
      },
      trxusdt: {
        id: "trxusdt",
        name: "TRX/ USDT",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        exchange: null,
        exchanges: [],
        status: "close", // 'close'
      },
      bnbusdt: {
        id: "bnbusdt",
        name: "BNB/ USDT",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        exchange: null,
        exchanges: [],
        status: "close", // 'close'
      },
      abcusdt: {
        id: "abcusdt",
        name: "ABC/ USDT",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        exchange: null,
        exchanges: [],
        status: "close", // 'close'
      },
      xrpusdt: {
        id: "xrpusdt",
        name: "XRP/ USDT",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        exchange: null,
        exchanges: [],
        status: "close", // 'close'
      },
      usdcusdt: {
        id: "usdcusdt",
        name: "USDC/ USDT",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        exchange: null,
        exchanges: [],
        status: "close", // 'close'
      },
      solusdt: {
        id: "solusdt",
        name: "SOL/ USDT",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        exchange: null,
        exchanges: [],
        status: "close", // 'close'
      },
    });
  }, []);

  const sorting = () => {};

  const selectTagHandler = useCallback(
    async (tag, tickers, option) => {
      setSelectedTag(tag);
      let _filterOption = option || filterOption;
      if (tickers) {
        let _currs =
          _filterOption === "all"
            ? tickers
            : tickers.filter((ticker) => ticker.status === _filterOption);
        let filterCurrencies;
        switch (tag) {
          case "ALL":
            setFilterTickers(_currs);
            break;
          case "Top":
            filterCurrencies = _currs
              .sort((a, b) => +b.volume - +a.volume)
              .slice(0, 3);
            setFilterTickers(filterCurrencies);
            break;
          default:
            filterCurrencies = _currs.filter((currency) =>
              currency.tags.includes(tag)
            );
            setFilterTickers(filterCurrencies);
            break;
        }
      }
    },
    [filterOption]
  );

  const filter = useCallback(
    (option, ticks) => {
      setFilterOption(option);
      let _tickers = ticks || tickers;
      if (_tickers) {
        let _ticks =
          option === "all"
            ? Object.values(_tickers)
            : Object.values(_tickers).filter(
                (currency) => currency.status === option
              );
        selectTagHandler(selectedTag, _ticks, option);
      }
    },
    [tickers, selectedTag, selectTagHandler]
  );

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
        selectTagHandler("ALL", Object.values(tickers));
        return !prev;
      } else return prev;
    });
  }, [getTickers, selectTagHandler]);

  useEffect(() => {
    if (!isInit) {
      init();
    }
  }, [init, isInit]);

  return (
    <section className="screen__section admin-ticker">
      <div className="screen__floating-btn">
        <img src="/img/floating-btn@2x.png" alt="arrow" />
      </div>
      <div className="screen__header">交易對設定</div>
      <div className="screen__search-bar">
        <div className="admin-ticker__filter">
          <div className="admin-ticker__filter--tag">
            <div className="admin-ticker__filter--text">{baseCurr}</div>
            <div className="admin-ticker__filter--icon"></div>
          </div>
          /
          <div className="admin-ticker__filter--tag">
            <div className="admin-ticker__filter--text">{quoteCurr}</div>
            <div className="admin-ticker__filter--icon"></div>
          </div>
        </div>
        <div className="screen__search-box">
          <input
            type="text"
            inputMode="search"
            className="screen__search-input"
            placeholder="輸入欲搜尋的關鍵字"
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
              onClick={() => filter("all")}
            >
              全部
            </li>
            <li
              className={`screen__display-option${
                filterOption === "open" ? " active" : ""
              }`}
              onClick={() => filter("open")}
            >
              已開啟
            </li>
            <li
              className={`screen__display-option${
                filterOption === "close" ? " active" : ""
              }`}
              onClick={() => filter("close")}
            >
              未開啟
            </li>
          </ul>
        </div>
        <div className="screen__sorting">
          <img src="/img/sorting@2x.png" alt="sorting" />
        </div>
      </div>
      <div className="screen__table">
        <ul className="screen__table-headers">
          <li className="screen__table-header">交易對</li>
          <li className="screen__table-header">價格</li>
          <li className="screen__table-header">24h 成交量</li>
          <li className="screen__table-header">24h 漲跌</li>
          <li className="screen__table-header">交易所</li>
          <li className="screen__table-header-btn">
            <span
              onClick={() => {
                const updateTickers = { ...tickers };
                Object.values(updateTickers).forEach(
                  (currency) => (currency.status = "open")
                );
                setTickers(updateTickers);
                filter(filterOption, updateTickers);
              }}
            >
              全部開啟
            </span>
            /
            <span
              onClick={() => {
                const updateTickers = { ...tickers };
                Object.values(updateTickers).forEach(
                  (currency) => (currency.status = "close")
                );
                setTickers(updateTickers);
                filter(filterOption, updateTickers);
              }}
            >
              全部關閉
            </span>
          </li>
        </ul>
        <ul className="screen__table-rows">
          {filterTickers &&
            filterTickers.map((ticker) => (
              <div
                className="deposit__currency-tile screen__table-row"
                key={ticker.id}
              >
                <div className="deposit__currency-text screen__table-item">
                  {ticker.name}
                </div>
                <div className="deposit__currency-text screen__table-item">
                  {ticker.price}
                </div>
                <div className="deposit__currency-text screen__table-item">
                  {ticker.volume}
                </div>
                <div className="deposit__currency-text screen__table-item">
                  <span>{ticker.change}</span>/
                  <span>{`${(ticker.changePct * 100).toFixed(2)}%`}</span>
                </div>
                <TableDropdown
                  className="screen__table-item"
                  selectHandler={(option) => switchExchange(option, ticker.id)}
                  options={ticker.exchanges}
                  selected={ticker.exchange}
                />
                <TableSwitch
                  className="screen__table-switch"
                  status={ticker.status}
                  toggleStatus={() => toggleStatus(ticker.status, ticker.id)}
                />
              </div>
            ))}
        </ul>
        <div className="screen__table-btn screen__table-text">顯示更多</div>
      </div>
    </section>
  );
};

export default TickerSetting;
