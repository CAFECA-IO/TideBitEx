import React, { useState, useEffect, useCallback } from "react";
import TableDropdown from "../components/TableDropdown";
import { dateFormatter } from "../utils/Utils";

const exchanges = ["ALL", "OKEx"];

const MatchOrders = () => {
  const [showMore, setShowMore] = useState(false);
  const [isInit, setIsInit] = useState(null);
  const [orders, setOrders] = useState(null);
  const [profit, setProfit] = useState(null);
  const [filterOrders, setFilterOrders] = useState(null);
  const [filterOption, setFilterOption] = useState("month"); //'month','year'
  const [filterKey, setFilterKey] = useState("");
  const [filterExchange, setFilterExchange] = useState("ALL");
  const [ascending, setAscending] = useState(false);

  const filter = useCallback(
    ({ keyword, timeInterval, exchange, filterOrders }) => {
      if (timeInterval) setFilterOption(timeInterval);
      if (exchange) setFilterExchange(exchange);
      let _orders = filterOrders || orders,
        _keyword = keyword === undefined ? filterKey : keyword,
        _exchange = exchange || filterExchange,
        ts = Date.now(),
        _timeInterval =
          timeInterval === "month"
            ? 30 * 24 * 60 * 60 * 1000
            : 12 * 30 * 24 * 60 * 60 * 1000;

      if (_orders) {
        _orders = Object.values(_orders).filter((order) => {
          if (_exchange === "ALL")
            return (
              (order.orderId.includes(_keyword) ||
                order.memberId.includes(_keyword) ||
                order.exchange.includes(_keyword)) &&
              ts - order.ts < _timeInterval
            );
          else
            return (
              order.exchange === _exchange &&
              (order.orderId.includes(_keyword) ||
                order.memberId.includes(_keyword) ||
                order.exchange.includes(_keyword)) &&
              ts - order.ts < _timeInterval
            );
        });
        setFilterOrders(_orders);
        // ++ TODO addSum
        let sum = 0;
        _orders.forEach((order) => {
          sum += parseFloat(order.revenue);
          console.log(order.revenue);
        });
        setProfit(sum);
      }
    },
    [filterExchange, filterKey, orders]
  );

  const getMatchOrders = useCallback(async () => {
    return Promise.resolve({
      38491204: {
        orderId: "38491204",
        memberId: "38491204",
        tickerId: "btcusdt",
        baseUnit: "BTC",
        quoteUnit: "USDT",
        exchange: "OKEx",
        fee: "0.000001",
        externalFee: "0.000003",
        referral: null,
        revenue: "0.000007",
        ts: 1655796586422,
      },
      38491205: {
        orderId: "38491205",
        memberId: "38491205",
        tickerId: "btcusdt",
        baseUnit: "BTC",
        quoteUnit: "USDT",
        exchange: "OKEx",
        fee: "0.000001",
        externalFee: "0.000003",
        referral: "0.000003",
        revenue: "-0.000002",
        ts: 1655796586422,
      },
      38491206: {
        orderId: "38491206",
        memberId: "38491206",
        tickerId: "btcusdt",
        baseUnit: "BTC",
        quoteUnit: "USDT",
        exchange: "TideBit",
        fee: "0.000001",
        externalFee: null,
        referral: null,
        revenue: "0.000001",
        ts: 1655796586422,
      },
      38491207: {
        orderId: "38491207",
        memberId: "38491207",
        tickerId: "btcusdt",
        baseUnit: "BTC",
        quoteUnit: "USDT",
        exchange: "OKEx",
        fee: "0.000001",
        externalFee: "0.000003",
        referral: null,
        revenue: "0.000007",
        ts: 1655796586422,
      },
    });
  }, []);

  const sorting = () => {
    setAscending((prev) => {
      setFilterOrders((prevOrders) =>
        !prev
          ? prevOrders.sort((a, b) => a.ts - b.ts)
          : prevOrders.sort((a, b) => b.ts - a.ts)
      );
      return !prev;
    });
  };

  const init = useCallback(() => {
    setIsInit(async (prev) => {
      if (!prev) {
        const orders = await getMatchOrders();
        setOrders(orders);
        console.log(orders);
        filter({ filterOrders: orders });
        return !prev;
      } else return prev;
    });
  }, [getMatchOrders, filter]);

  useEffect(() => {
    if (!isInit) {
      init();
    }
  }, [init, isInit]);

  return (
    <section className="screen__section match-orders">
      <div className="screen__header">搓合成交紀錄</div>
      <div className="screen__search-bar">
        <TableDropdown
          className="screen__filter"
          selectHandler={(option) => filter({ exchange: option })}
          options={exchanges}
          selected={filterExchange}
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
                filterOption === "month" ? " active" : ""
              }`}
              onClick={() => filter({ timeInterval: "month" })}
            >
              近30日
            </li>
            <li
              className={`screen__display-option${
                filterOption === "year" ? " active" : ""
              }`}
              onClick={() => filter({ timeInterval: "year" })}
            >
              近一年
            </li>
          </ul>
        </div>
        <div className="screen__sorting">
          <img src="/img/sorting@2x.png" alt="sorting" />
        </div>
      </div>
      <div className="screen__table--overivew">
        <div className="screen__table-title">當前總營收：</div>
        {filterOrders && (
          <div
            className={`screen__table-value${
              profit > 0 ? " positive" : " negative"
            }`}
          >{`${profit} ${filterOrders[0].baseUnit}`}</div>
        )}
      </div>
      <div className={`screen__table${showMore ? " show" : ""}`}>
        <ul className="screen__table-headers">
          <li className="screen__table-header">日期</li>
          <li className="screen__table-header">用戶 ID</li>
          <li className="screen__table-header">訂單 ID</li>
          <li className="screen__table-header">交易所</li>
          <li className="screen__table-header">搓合手續費</li>
          <li className="screen__table-header">外部手續費成本</li>
          <li className="screen__table-header">推薦回饋</li>
          <li className="screen__table-header">營收</li>
        </ul>
        <ul className="screen__table-rows">
          {filterOrders &&
            filterOrders.map((order) => (
              <div
                className={`match-orders__tile screen__table-row`}
                key={order.orderId}
              >
                <div className="match-orders__text screen__table-item">
                  {dateFormatter(order.ts).date}
                </div>
                <div className="match-orders__text screen__table-item">
                  {order.memberId}
                </div>
                <div className="match-orders__text screen__table-item">
                  {order.orderId}
                </div>
                <div className="match-orders__text screen__table-item">
                  {order.exchange}
                </div>
                <div className="match-orders__text screen__table-item positive">
                  {order.fee ? `${order.fee} ${order.baseUnit}` : "-"}
                </div>
                <div className="match-orders__text screen__table-item negative">
                  {order.externalFee
                    ? `${order.externalFee} ${order.baseUnit}`
                    : "-"}
                </div>
                <div className="match-orders__text screen__table-item negative">
                  {order.referral ? `${order.referral} ${order.baseUnit}` : "-"}
                </div>
                <div
                  className={`match-orders__text screen__table-item${
                    order.revenue > 0 ? " positive" : " negative"
                  }`}
                >
                  {order.revenue ? `${order.revenue} ${order.baseUnit}` : "-"}
                </div>
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

export default MatchOrders;
