import React, { useState, useEffect, useCallback } from "react";
import TableSwitch from "../components/TableSwitch";
import TableDropdown from "../components/TableDropdown";
import ScreenTags from "../components/ScreenTags";

const Deposit = () => {
  const [showMore, setShowMore] = useState(false);
  const [isInit, setIsInit] = useState(null);
  const [selectedTag, setSelectedTag] = useState("ALL");
  const [currencies, setCurrencies] = useState(null);
  const [filterCurrencies, setFilterCurrencies] = useState(null);
  const [filterOption, setFilterOption] = useState("all"); //'open','close'

  const sorting = () => {};

  const getCurrencies = useCallback(async () => {
    return Promise.resolve({
      BTC: {
        currency: "Bitcoin",
        symbol: "BTC",
        depositAmount: "19061368",
        exchange: "OKEx",
        exchanges: ["TideBit", "OKEx"],
        tags: ["Blockchain"],
        status: "open", // 'close'
      },
      ETH: {
        currency: "Ethereum",
        symbol: "ETH",
        depositAmount: "121091060",
        exchange: "TideBit",
        exchanges: ["TideBit", "OKEx"],
        tags: ["Blockchain"],
        status: "open", // 'close'
      },
      XRP: {
        //The purpose of XRP is to serve as an intermediate mechanism of exchange between two currencies or networks—as a sort of temporary settlement layer denomination
        currency: "XRP",
        symbol: "XRP",
        depositAmount: "0",
        exchanges: [],
        tags: ["Layer2"],
        status: "close", // 'open'
      },
      USDC: {
        //SD Coin is a service to tokenize US dollars and facilitate their use over the internet and public blockchains.
        currency: "USD Coin",
        symbol: "USDC",
        depositAmount: "0",
        exchange: "OKEx",
        exchanges: ["TideBit", "OKEx"],
        tags: ["Defi"],
        status: "close", // 'close'
      },
      USDT: {
        currency: "Tether",
        symbol: "USDT",
        depositAmount: "20549553",
        exchange: "TideBit",
        exchanges: ["TideBit", "OKEx"],
        tags: ["Polkadot"],
        status: "open", // 'close'
      },
      BNB: {
        currency: "Build and Build",
        symbol: "BNB",
        depositAmount: "0",
        exchanges: [],
        tags: ["Greyscale"],
        status: "close", // 'open'
      },
      BUSD: {
        currency: "Binance USD",
        symbol: "BUSD",
        depositAmount: "0",
        exchanges: [],
        tags: ["Defi"],
        status: "close", // 'open'
      },
      ADA: {
        currency: "Cardano", //Cardano is built by a decentralized community of scientists, engineers, and thought leaders united in a common purpose: to create a technology platform that will ignite the positive change the world needs.
        symbol: "ADA",
        depositAmount: "4048406",
        exchanges: [],
        tags: ["GameFi"],
        status: "close", // 'open'
      },
      SOL: {
        currency: "Solana",
        symbol: "SOL",
        depositAmount: "0",
        exchanges: [],
        tags: ["Meme"],
        status: "close", // 'open'
      },
      DOGE: {
        currency: "Dogecoin",
        symbol: "DOGE",
        depositAmount: "0",
        exchanges: [],
        tags: ["NFT"],
        status: "close", // 'open'
      },
    });
  }, []);

  const selectTagHandler = useCallback(
    async (tag, currencies, option) => {
      setSelectedTag(tag);
      let _filterOption = option || filterOption;
      if (currencies) {
        let _currs =
          _filterOption === "all"
            ? currencies
            : currencies.filter(
                (currency) => currency.status === _filterOption
              );
        let filterCurrencies;
        switch (tag) {
          case "ALL":
            setFilterCurrencies(_currs);
            break;
          case "Top":
            filterCurrencies = _currs
              .sort((a, b) => +b.depositAmount - +a.depositAmount)
              .slice(0, 3);
            setFilterCurrencies(filterCurrencies);
            break;
          default:
            filterCurrencies = _currs.filter((currency) =>
              currency.tags.includes(tag)
            );
            setFilterCurrencies(filterCurrencies);
            break;
        }
      }
    },
    [filterOption]
  );

  const filter = useCallback(
    (option, currs) => {
      setFilterOption(option);
      let _currencies = currs || currencies;
      if (_currencies) {
        let _currs =
          option === "all"
            ? Object.values(_currencies)
            : Object.values(_currencies).filter(
                (currency) => currency.status === option
              );
        selectTagHandler(selectedTag, _currs, option);
      }
    },
    [currencies, selectedTag, selectTagHandler]
  );

  const switchExchange = useCallback(
    (exchange, symbol) => {
      console.log(`switchExchange`, exchange, symbol);
      const updateCurrencies = { ...currencies };
      updateCurrencies[symbol].exchange = exchange;
      setCurrencies(updateCurrencies);
      filter(filterOption, updateCurrencies);
    },
    [currencies, filter, filterOption]
  );

  const toggleStatus = useCallback(
    (status, symbol) => {
      console.log(`toggleStatus`, status, symbol);
      const updateCurrencies = { ...currencies };
      updateCurrencies[symbol].status = status === "open" ? "close" : "open";
      setCurrencies(updateCurrencies);
      filter(filterOption, updateCurrencies);
    },
    [currencies, filter, filterOption]
  );

  const init = useCallback(() => {
    setIsInit(async (prev) => {
      if (!prev) {
        const currencies = await getCurrencies();
        setCurrencies(currencies);
        selectTagHandler("ALL", Object.values(currencies));
        return !prev;
      } else return prev;
    });
  }, [getCurrencies, selectTagHandler]);

  useEffect(() => {
    if (!isInit) {
      init();
    }
  }, [init, isInit]);

  return (
    <section className="screen__section deposit">
      <div className="screen__header">入金管理</div>
      {/* <ScreenTags
        selectedTag={selectedTag}
        selectTagHandler={selectTagHandler}
        currencies={currencies}
      /> */}
      <div className="screen__search-bar">
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
      <div className={`screen__table${showMore ? " show" : ""}`}>
        <ul className="screen__table-headers">
          <li className="screen__table-header">幣種</li>
          <li className="screen__table-header">代號</li>
          <li className="screen__table-header">平台入金數量</li>
          <li className="screen__table-header">入金交易所</li>
          <li className="screen__table-header-btn">
            <button
              disabled={`${
                !Object.values(currencies || {}).some(
                  (currency) => currency.status === "open"
                )
                  ? "disable"
                  : ""
              }`}
              onClick={() => {
                const updateCurrencies = { ...currencies };
                Object.values(updateCurrencies).forEach(
                  (currency) => (currency.status = "close")
                );
                setCurrencies(updateCurrencies);
                filter(filterOption, updateCurrencies);
              }}
            >
              全部關閉
            </button>
            /
            <button
              disabled={`${
                !Object.values(currencies || {}).some(
                  (currency) => currency.status === "close"
                )
                  ? "disable"
                  : ""
              }`}
              onClick={() => {
                const updateCurrencies = { ...currencies };
                Object.values(updateCurrencies).forEach(
                  (currency) => (currency.status = "open")
                );
                setCurrencies(updateCurrencies);
                filter(filterOption, updateCurrencies);
              }}
            >
              全部開啟
            </button>
          </li>
        </ul>
        <ul className="screen__table-rows">
          {filterCurrencies &&
            filterCurrencies.map((currency) => (
              <div
                className="deposit__currency-tile screen__table-row"
                key={currency.symbol}
              >
                <div className="deposit__currency-text screen__table-item">
                  {currency.currency}
                </div>
                <div className="deposit__currency-text screen__table-item">
                  {currency.symbol}
                </div>
                <div className="deposit__currency-text screen__table-item">
                  {currency.depositAmount}
                </div>
                <TableDropdown
                  className="screen__table-item"
                  selectHandler={(option) =>
                    switchExchange(option, currency.symbol)
                  }
                  options={currency.exchanges}
                  selected={currency.exchange}
                />
                <TableSwitch
                  className="screen__table-switch"
                  status={currency.status === "open"}
                  toggleStatus={() =>
                    toggleStatus(currency.status, currency.symbol)
                  }
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

export default Deposit;