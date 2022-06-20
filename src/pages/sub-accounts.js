import React, { useState, useEffect, useCallback } from "react";
import SafeMath from "../utils/SafeMath";

const exchanges = [
  `OKEx`,
  `Exchange02`,
  `Exchange03`,
  `Exchange04`,
  `Exchange05`,
  `Exchange06`,
];

const currencies = {
  BTC: {
    symbol: "BTC",
    color: "#D34258",
  },
  ETH: {
    symbol: "ETH",
    color: "#DFC141",
  },
  USDT: {
    symbol: "USDT",
    color: "#9F55D2",
  },
  BNB: {
    symbol: "BNB",
    color: "#73BAE1",
  },
  USDC: {
    symbol: "USDC",
    color: "#5CB85C",
  },
  OTHERS: {
    symbol: "OTHERS",
    color: "#929295",
  },
};

const SubAccounts = () => {
  const [isInit, setIsInit] = useState(null);
  const [exchange, setExchange] = useState(null);
  const [subAccounts, setSubAccounts] = useState(null);
  const [filterOption, setFilterOption] = useState("all");
  const filter = (option) => {
    setFilterOption(option);
  };

  const getSubAccounts = useCallback(
    async (ex) => {
      const subAccounts = {};
      if (!exchange || ex !== exchange) {
        const details = {
          BTC: {
            balance: "100",
            locked: "10",
            total: "110",
          },
          ETH: {
            balance: "50",
            locked: "10",
            total: "60",
          },
          USDT: {
            balance: "30",
            locked: "10",
            total: "40",
          },
          BNB: {
            balance: "10",
            locked: "10",
            total: "20",
          },
          USDC: {
            balance: "15",
            locked: "10",
            total: "25",
          },
          OTHERS: {
            balance: "100",
            locked: "10",
            total: "110",
          },
        };
        for (let i = 0; i < 10; i++) {
          subAccounts[`${ex}Sub_00${i}`] = {};
          subAccounts[`${ex}Sub_00${i}`]["details"] = details;
          subAccounts[`${ex}Sub_00${i}`]["total"] = "0";
          Object.values(details).forEach((detail) => {
            subAccounts[`${ex}Sub_00${i}`]["total"] = SafeMath.plus(
              subAccounts[`${ex}Sub_00${i}`]["total"],
              detail["total"]
            );
          });
          if (i < 3) {
            subAccounts[`${ex}Sub_00${i}`]["alert"] = true;
          }
        }
        setExchange(ex);
      }
      setSubAccounts(subAccounts);
      console.log(ex);
      console.log(subAccounts);
      return Promise.resolve(subAccounts);
    },
    [exchange]
  );

  const init = useCallback(() => {
    setIsInit(async (prev) => {
      if (!prev) {
        const subAccounts = await getSubAccounts(exchanges[0]);
        console.log(subAccounts);
        return !prev;
      } else return prev;
    });
  }, [getSubAccounts]);

  useEffect(() => {
    if (!isInit) {
      init();
    }
  }, [init, isInit]);
  return (
    <section className="screen__section sub-accounts">
      <div className="screen__header">子帳號管理</div>
      <ul className="screen__select-bar">
        {exchanges.map((ex) => (
          <li
            className={`screen__select-option${
              ex === exchange ? " active" : ""
            }`}
            key={ex}
            onClick={() => getSubAccounts(ex)}
          >
            {ex}
          </li>
        ))}
      </ul>
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
                filterOption === "alert" ? " active" : ""
              }`}
              onClick={() => filter("alert")}
            >
              警示
            </li>
          </ul>
        </div>
        <ul className="sub-accounts__currency-labels">
          {Object.values(currencies).map((currency) => (
            <div
              className="sub-accounts__currency-label"
              key={`${currency["symbol"]}${currency["color"]}`}
            >
              <div
                className="sub-accounts__currency-icon"
                style={{
                  backgroundColor: currency["color"],
                }}
              ></div>
              <div className="sub-accounts__currency-text">
                {currency["symbol"]}
              </div>
            </div>
          ))}
        </ul>
      </div>
      {subAccounts && (
        <ul className="sub-accounts__list">
          {Object.keys(subAccounts).map((key, index) => (
            <div
              className={`sub-accounts__tile${
                !!subAccounts[key].alert ? " alert" : ""
              }`}
              key={`${key}-${index}`}
            >
              <div className="sub-accounts__tile--icon">
                <img
                  src="/img/alert@2x.png"
                  alt="alert"
                ></img>
              </div>
              <div className="sub-accounts__name">{key}</div>
              <div className="sub-accounts__assets">
                <div className="sub-accounts__assets--title">資產分佈：</div>
                <div className="sub-accounts__assets--details">
                  {Object.keys(subAccounts[key]["details"]).map((symbol) => (
                    <div
                      className="sub-accounts__asset"
                      style={{
                        width: `${SafeMath.mult(
                          SafeMath.div(
                            subAccounts[key]["details"][symbol]["total"],
                            subAccounts[key]["total"]
                          ),
                          "100"
                        )}%`,
                        backgroundColor: currencies[symbol]["color"],
                      }}
                      key={`${key}-${symbol}`}
                    ></div>
                  ))}
                </div>
              </div>
              <div className="sub-accounts__tile--icon sub-accounts__tile--sub-icon">
                <img
                  src="/img/arrow@2x.png"
                  alt="arrow"
                ></img>
              </div>
            </div>
          ))}
        </ul>
      )}
    </section>
  );
};

export default SubAccounts;
