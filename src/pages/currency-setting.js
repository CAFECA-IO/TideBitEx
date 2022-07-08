import React, { useState, useEffect, useCallback } from "react";
import TableSwitchWithLock from "../components/TableSwitchWithLock";

let timer;
const CurrencyDropdown = (props) => {
  const [openDropDown, setOpenDropDown] = useState(false);
  const [active, setActive] = useState(false);
  const [unLocked, setUnLocked] = useState(false);
  return (
    <>
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
          <div
            className={`currency-dropdown__label-data${
              props.currency.changePct > 0 ? " positive" : " negative"
            }`}
          >
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
                onClick={(e) => {
                  e.stopPropagation();
                  props.toggleStatus(key, props.currency.symbol);
                }}
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
        <div
          className={`currency-dropdown__label-item--fixed screen__table-header-btn${
            active ? " active" : ""
          }${unLocked ? " unLocked" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            setActive(true);
            timer = setTimeout(() => {
              setUnLocked(false);
              setActive(false);
              clearTimeout(timer);
            }, 3000);
          }}
        >
          <div
            className="screen__table-header-btn--lock"
            onClick={(e) => {
              e.stopPropagation();
              if (active) {
                clearTimeout(timer);
                setUnLocked(true);
                timer = setTimeout(() => {
                  setUnLocked(false);
                  setActive(false);
                  clearTimeout(timer);
                }, 3000);
              }
            }}
          ></div>
          <button
            className="currency-dropdown__section-btn"
            onClick={(e) => {
              if (unLocked) {
                e.stopPropagation();
                props.toggleAllOptions(props.currency, false);
                const timer = setTimeout(() => {
                  setUnLocked(false);
                  setActive(false);
                  clearTimeout(timer);
                }, 500);
              }
            }}
            disabled={`${
              !Object.values(props.currency.items).some((item) => !!item.status)
                ? "disable"
                : ""
            }`}
          >
            全部關閉
          </button>
          /
          <button
            className="currency-dropdown__section-btn"
            onClick={(e) => {
              if (unLocked) {
                e.stopPropagation();
                props.toggleAllOptions(props.currency, true);
                const timer = setTimeout(() => {
                  setUnLocked(false);
                  setActive(false);
                  clearTimeout(timer);
                }, 500);
              }
            }}
            disabled={`${
              !Object.values(props.currency.items).some((item) => !item.status)
                ? "disable"
                : ""
            }`}
          >
            全部開啟
          </button>
        </div>
      </div>
      <div className="currency-dropdown__contain">
        <div className="currency-dropdown__container">
          <div className="currency-dropdown__section">
            <div className="currency-dropdown__section-btn-box">
              <div className="currency-dropdown__section-title">
                選擇啟用功能：
              </div>
            </div>
          </div>
          <div className="currency-dropdown__section">
            {Object.keys(props.currency.items).map((key) => (
              <div
                className={`currency-dropdown__section-option${
                  props.currency.items[key].status ? " active" : ""
                }`}
                key={`${key}`}
              >
                <div className="currency-dropdown__section-text">
                  {props.currency.items[key].text}
                </div>
                <TableSwitchWithLock
                  className="screen__table-switch"
                  status={props.currency.items[key].status}
                  toggleStatus={() =>
                    props.toggleStatus(key, props.currency.symbol)
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

const CurrencySetting = () => {
  const [showMore, setShowMore] = useState(false);
  const [isInit, setIsInit] = useState(null);
  const [currencies, setCurrencies] = useState(null);
  const [filterCurrencies, setFilterCurrencies] = useState(null);
  const [filterOptions, setFilterOptions] = useState(["all"]); //'deposit','withdraw','transfer', 'transaction'
  const [filterKey, setFilterKey] = useState("");

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

  const toggleAllOptions = (currency, status) => {
    const _updateCurrenies = { ...currencies };
    const _updateCurrency = _updateCurrenies[currency.symbol];
    Object.values(_updateCurrency.items).forEach(
      (item) => (item.status = status)
    );
    _updateCurrenies[currency.symbol] = _updateCurrency;
    setCurrencies(_updateCurrenies);
  };

  const filter = useCallback(
    ({ filterCurrencies, option, keyword }) => {
      let index,
        options = [...filterOptions];
      console.log(`filter option`, option);
      if (option) {
        if (option === "all") options = ["all"];
        else {
          if (options.includes(option)) {
            index = options.findIndex((op) => op === option);
            options.splice(index, 1);
          } else {
            index = options.findIndex((op) => op === "all");
            if (index > -1) {
              options.splice(index, 1);
            }
            options.push(option);
          }
        }
        if (options.length === 0) options = ["all"];
        setFilterOptions(options);
      }
      let _currencies = filterCurrencies || currencies,
        _keyword = keyword === undefined ? filterKey : keyword;
      if (_currencies) {
        _currencies = Object.values(_currencies).filter((currency) => {
          if (options.includes("all")) {
            return (
              currency.currency.includes(_keyword) ||
              currency.symbol.includes(_keyword)
            );
          } else {
            return (
              (currency.currency.includes(_keyword) ||
                currency.symbol.includes(_keyword)) &&
              Object.keys(currency.items).some(
                (itemKey) =>
                  options.includes(itemKey) && currency.items[itemKey].status
              )
            );
          }
        });
        setFilterCurrencies(_currencies);
      }
    },
    [currencies, filterKey, filterOptions]
  );

  const toggleStatus = useCallback(
    (key, symbol) => {
      const updateCurrencies = { ...currencies };
      updateCurrencies[symbol].items[key].status =
        !updateCurrencies[symbol].items[key].status;
      setCurrencies(updateCurrencies);
    },
    [currencies]
  );

  const init = useCallback(() => {
    setIsInit(async (prev) => {
      if (!prev) {
        const currencies = await getCurrencies();
        setCurrencies(currencies);
        filter({ filterCurrencies: currencies });
        return !prev;
      } else return prev;
    });
  }, [getCurrencies, filter]);

  useEffect(() => {
    if (!isInit) {
      init();
    }
  }, [init, isInit]);

  return (
    <section className="screen__section currency-settings">
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
                filterOptions.includes("all") ? " active" : ""
              }`}
              onClick={() => filter({ option: "all" })}
            >
              全部
            </li>
            <li
              className={`screen__display-option${
                filterOptions.includes("deposit") ? " active" : ""
              }`}
              onClick={() => filter({ option: "deposit" })}
            >
              充值
            </li>
            <li
              className={`screen__display-option${
                filterOptions.includes("withdraw") ? " active" : ""
              }`}
              onClick={() => filter({ option: "withdraw" })}
            >
              提現
            </li>
            <li
              className={`screen__display-option${
                filterOptions.includes("transfer") ? " active" : ""
              }`}
              onClick={() => filter({ option: "transfer" })}
            >
              劃轉
            </li>
            <li
              className={`screen__display-option${
                filterOptions.includes("transaction") ? " active" : ""
              }`}
              onClick={() => filter({ option: "transaction" })}
            >
              交易
            </li>
          </ul>
        </div>
        <div className="screen__sorting">
          <img src="/img/sorting@2x.png" alt="sorting" />
        </div>
      </div>
      <div className={`screen__table${showMore ? " show" : ""}`}>
        <div className="currency-settings__rows">
          {filterCurrencies?.map((currency) => (
            <div
              className="currency-dropdown admin-dropdown"
              key={currency.currency + currency.symbol}
            >
              <CurrencyDropdown
                currency={currency}
                toggleStatus={toggleStatus}
                toggleAllOptions={toggleAllOptions}
              />
            </div>
          ))}
        </div>
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

export default CurrencySetting;
