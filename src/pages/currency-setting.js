import React, { useState, useEffect, useCallback } from "react";
import ScreenTags from "../components/ScreenTags";
import TableSwitch from "../components/TableSwitch";

const CurrencyDropdown = (props) => {
  const [openDropDown, setOpenDropDown] = useState(false);
  return (
    <div
      className="currency-dropdown admin-dropdown"
      key={props.currency.symbol}
    >
      <input
        className="admin-dropdown__controller"
        type="checkbox"
        id="admin-dropdown-btn"
        checked={openDropDown}
        readOnly
      />
      <div
        className="currency-dropdown__label"
        onClick={() => setOpenDropDown((prev) => !prev)}
      >
        <div
          className={`currency-dropdown__icon${openDropDown ? " active" : ""}`}
        ></div>
        <div className="currency-dropdown__label-item">
          <div className="currency-dropdown__label-title">幣種</div>
          <div className="currency-dropdown__label-data">
            {props.currency.currency}
          </div>
        </div>
        <div className="currency-dropdown__label-item">
          <div className="currency-dropdown__label-title">價格</div>
          <div className="currency-dropdown__label-data">
            {props.currency.price}
          </div>
        </div>
        <div className="currency-dropdown__label-item">
          <div className="currency-dropdown__label-title">24h 交易量</div>
          <div className="currency-dropdown__label-data">
            {props.currency.volume}
          </div>
        </div>
        <div className="currency-dropdown__label-item">
          <div className="currency-dropdown__label-title">24h 漲跌</div>
          <div className="currency-dropdown__label-data">
            {`${(props.currency.changePct * 100).toFixed(2)}%`}
          </div>
        </div>
        <div className="currency-dropdown__label-box">
          <div className="currency-dropdown__label-title">可交易項目</div>
          <div className="currency-dropdown__label-options">
            {Object.keys(props.currency.items).map((key) => (
              <div
                className={`currency-dropdown__label-option${
                  props.currency.items[key].status ? " active" : ""
                }`}
                onClick={() => props.toggleStatus(key, props.currency.symbol)}
                key={`${key}`}
              >
                <div className={`currency-dropdown__label-icon`}>
                  {/* <img
                    src={require("../assets/icons/circle_button@2x.png")}
                    alt="circle_button"
                  /> */}
                </div>
                <div className="currency-dropdown__label-text">
                  {props.currency.items[key].text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="currency-dropdown__contain">
        <div className="currency-dropdown__container">
          <div className="currency-dropdown__section">
            <div className="currency-dropdown__section-btn-box">
              <div className="currency-dropdown__section-title">
                選擇啟用功能：
              </div>
              <div className="currency-dropdown__section-box">
                <div className="currency-dropdown__section-btn">全部開啟</div>/
                <div className="currency-dropdown__section-btn">全部關閉</div>
              </div>
            </div>
          </div>
          <div className="currency-dropdown__section">
            {Object.keys(props.currency.items).map((key) => (
              <div
                className={`currency-dropdown__section-option${
                  props.currency.items[key].status ? " active" : ""
                }`}
                onClick={() => props.toggleStatus(key, props.currency.symbol)}
                key={`${key}`}
              >
                <div className="currency-dropdown__section-text">
                  {props.currency.items[key].text}
                </div>
                <TableSwitch status={props.currency.items[key].status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const CurrencySetting = () => {
  const [isInit, setIsInit] = useState(null);
  const [selectedTag, setSelectedTag] = useState("ALL");
  const [currencies, setCurrencies] = useState(null);
  const [filterCurrencies, setFilterCurrencies] = useState(null);
  const [filterOptions, setFilterOptions] = useState(["all"]); //'deposit','withdraw','transfer', 'transaction'

  const getCurrencies = useCallback(async () => {
    return Promise.resolve({
      BTC: {
        currency: "Bitcoin",
        symbol: "BTC",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        items: {
          deposit: {
            status: true,
            text: "充值",
          },
          withdraw: {
            status: true,
            text: "提現",
          },
          transfer: {
            status: false,
            text: "劃轉",
          },
          transaction: {
            status: false,
            text: "交易",
          },
        },
      },
      ETH: {
        currency: "Ethereum",
        symbol: "ETH",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        items: {
          deposit: {
            status: true,
            text: "充值",
          },
          withdraw: {
            status: true,
            text: "提現",
          },
          transfer: {
            status: false,
            text: "劃轉",
          },
          transaction: {
            status: false,
            text: "交易",
          },
        },
      },
      XRP: {
        //The purpose of XRP is to serve as an intermediate mechanism of exchange between two currencies or networks—as a sort of temporary settlement layer denomination
        currency: "XRP",
        symbol: "XRP",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        items: {
          deposit: {
            status: true,
            text: "充值",
          },
          withdraw: {
            status: true,
            text: "提現",
          },
          transfer: {
            status: false,
            text: "劃轉",
          },
          transaction: {
            status: false,
            text: "交易",
          },
        },
      },
      USDC: {
        //SD Coin is a service to tokenize US dollars and facilitate their use over the internet and public blockchains.
        currency: "USD Coin",
        symbol: "USDC",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        items: {
          deposit: {
            status: true,
            text: "充值",
          },
          withdraw: {
            status: true,
            text: "提現",
          },
          transfer: {
            status: false,
            text: "劃轉",
          },
          transaction: {
            status: false,
            text: "交易",
          },
        },
      },
      USDT: {
        currency: "Tether",
        symbol: "USDT",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        items: {
          deposit: {
            status: true,
            text: "充值",
          },
          withdraw: {
            status: true,
            text: "提現",
          },
          transfer: {
            status: false,
            text: "劃轉",
          },
          transaction: {
            status: false,
            text: "交易",
          },
        },
      },
      BNB: {
        currency: "Build and Build",
        symbol: "BNB",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        items: {
          deposit: {
            status: true,
            text: "充值",
          },
          withdraw: {
            status: true,
            text: "提現",
          },
          transfer: {
            status: false,
            text: "劃轉",
          },
          transaction: {
            status: false,
            text: "交易",
          },
        },
      },
      BUSD: {
        currency: "Binance USD",
        symbol: "BUSD",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        items: {
          deposit: {
            status: true,
            text: "充值",
          },
          withdraw: {
            status: true,
            text: "提現",
          },
          transfer: {
            status: false,
            text: "劃轉",
          },
          transaction: {
            status: false,
            text: "交易",
          },
        },
      },
      ADA: {
        currency: "Cardano", //Cardano is built by a decentralized community of scientists, engineers, and thought leaders united in a common purpose: to create a technology platform that will ignite the positive change the world needs.
        symbol: "ADA",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        items: {
          deposit: {
            status: true,
            text: "充值",
          },
          withdraw: {
            status: true,
            text: "提現",
          },
          transfer: {
            status: false,
            text: "劃轉",
          },
          transaction: {
            status: false,
            text: "交易",
          },
        },
      },
      SOL: {
        currency: "Solana",
        symbol: "SOL",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        items: {
          deposit: {
            status: true,
            text: "充值",
          },
          withdraw: {
            status: true,
            text: "提現",
          },
          transfer: {
            status: false,
            text: "劃轉",
          },
          transaction: {
            status: false,
            text: "交易",
          },
        },
      },
      DOGE: {
        currency: "Dogecoin",
        symbol: "DOGE",
        price: "39810.45",
        volume: "22058.73",
        change: "-458.83",
        changePct: "0.0114",
        items: {
          deposit: {
            status: true,
            text: "充值",
          },
          withdraw: {
            status: true,
            text: "提現",
          },
          transfer: {
            status: false,
            text: "劃轉",
          },
          transaction: {
            status: false,
            text: "交易",
          },
        },
      },
    });
  }, []);

  const selectTagHandler = useCallback(
    async (tag, currencies, options) => {
      console.log(tag, currencies, options);
      setSelectedTag(tag);
      let _filterOptions = options || filterOptions;
      if (currencies) {
        let _currs = _filterOptions.includes("all")
          ? currencies
          : currencies.filter((currency) =>
              currency.items.some((item) => _filterOptions.includes(item))
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
    [filterOptions]
  );

  const filter = useCallback(
    (option, currs) => {
      setFilterOptions((prev) => {
        let index,
          options = [...prev];

        if (option) {
          if (prev.includes(option)) {
            index = options.findIndex((op) => op === option);
            options.splice(index, 1);
          } else {
            if (option === "all") options = ["all"];
            else {
              index = options.findIndex((op) => op === "all");

              if (index > -1) {
                options.splice(index, 1);
              }

              options.push(option);
            }
          }
          if (options.length === 0) options = ["all"];
        }
        console.log(`filter currs`, currs);
        let _currencies = currs || currencies;
        if (_currencies) {
          let _currs =
            option === "all"
              ? Object.values(_currencies)
              : Object.values(_currencies).filter((currency) =>
                  Object.keys(currency.items).some((key) =>
                    options.includes(key)
                  )
                );
          selectTagHandler(selectedTag, _currs, options);
        }
        return options;
      });
    },
    [currencies, selectedTag, selectTagHandler]
  );

  const toggleStatus = useCallback(
    (key, symbol) => {
      const updateCurrencies = { ...currencies };
      updateCurrencies[symbol].items[key].status =
        !updateCurrencies[symbol].items[key].status;
      setCurrencies(updateCurrencies);
      filter(null, updateCurrencies);
    },
    [currencies, filter]
  );

  const init = useCallback(() => {
    setIsInit(async (prev) => {
      if (!prev) {
        const tickers = await getCurrencies();
        setCurrencies(tickers);
        selectTagHandler("ALL", Object.values(tickers));
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
    <section className="screen__section currency-settings">
      <div className="screen__floating-btn">
        <img src="/img/floating-btn@2x.png" alt="arrow" />
      </div>
      <div className="screen__header">支援幣種設定</div>
      {/* <ScreenTags
        selectedTag={selectedTag}
        selectTagHandler={selectTagHandler}
        data={currencies}
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
                filterOptions.includes("all") ? " active" : ""
              }`}
              onClick={() => filter("all")}
            >
              全部
            </li>
            <li
              className={`screen__display-option${
                filterOptions.includes("deposit") ? " active" : ""
              }`}
              onClick={() => filter("deposit")}
            >
              充值
            </li>
            <li
              className={`screen__display-option${
                filterOptions.includes("withdraw") ? " active" : ""
              }`}
              onClick={() => filter("withdraw")}
            >
              提現
            </li>
            <li
              className={`screen__display-option${
                filterOptions.includes("transfer") ? " active" : ""
              }`}
              onClick={() => filter("transfer")}
            >
              劃轉
            </li>
            <li
              className={`screen__display-option${
                filterOptions.includes("transaction") ? " active" : ""
              }`}
              onClick={() => filter("transaction")}
            >
              交易
            </li>
          </ul>
        </div>
        <div className="screen__sorting">
          <img src="/img/sorting@2x.png" alt="sorting" />
        </div>
      </div>
      <div className="screen__table">
        <div className="currency-settings__rows">
          {filterCurrencies?.map((currency) => (
            <CurrencyDropdown currency={currency} toggleStatus={toggleStatus} />
          ))}
        </div>
        <div className="screen__table-btn screen__table-text">顯示更多</div>
      </div>
    </section>
  );
};

export default CurrencySetting;
