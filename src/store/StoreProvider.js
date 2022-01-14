import React, { useEffect, useCallback, useMemo, useState } from "react";
import Middleman from "../modal/Middleman";
import StoreContext from "./store-context";

const StoreProvider = (props) => {
  const middleman = useMemo(() => new Middleman(), []);
  const [tickers, setTickers] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [closeOrders, setCloseOrders] = useState([]);
  const [orderHistories, setOrderHistories] = useState([]);
  const [balances, setBalances] = useState([]);
  const [selectedTicker, setSelectedTicker] = useState(null);

  const selectTickerHandler = useCallback((ticker) => {
    // if (ticker?.instId !== selectedTicker?.instId) {
    setSelectedTicker(ticker);
    // }
  }, []);

  const getTickers = useCallback(
    async (instType = "SPOT", from = 0, limit = 100) => {
      try {
        const result = await middleman.getTickers(instType, from, limit);
        console.log(`getTickers result`, result);
        setTickers(result);
        if (selectedTicker === null) selectTickerHandler(result[0]);
      } catch (error) {
        return Promise.reject({ message: error });
      }
    },
    [middleman, selectTickerHandler, selectedTicker]
  );

  const getBooks = useCallback(
    async (instId, sz = 100) => {
      try {
        const result = await middleman.getBooks(instId, sz);
        return result;
      } catch (error) {
        return Promise.reject({ message: error });
      }
    },
    [middleman]
  );

  const getTrades = useCallback(
    async (instId, limit) => {
      try {
        const result = await middleman.getTrades(instId, limit);
        return result;
      } catch (error) {
        return Promise.reject({ message: error });
      }
    },
    [middleman]
  );

  const getCandles = useCallback(
    async (instId, bar, after, before, limit) => {
      try {
        const result = await middleman.getCandles(
          instId,
          bar,
          after,
          before,
          limit
        );
        return result;
      } catch (error) {
        return Promise.reject({ message: error });
      }
    },
    [middleman]
  );

  const getPendingOrders = useCallback(
    async (options) => {
      try {
        const result = await middleman.getPendingOrders(options);
        console.log(`getPendingOrders result`, result);
        if (!options) setPendingOrders(result);
        return result;
      } catch (error) {
        return Promise.reject({ message: error });
      }
    },
    [middleman]
  );

  const getBalances = useCallback(
    async (ccy) => {
      try {
        const result = await middleman.getBalances(ccy);
        console.log(`getBalances result`, result);
        setBalances(result)
        return result;
      } catch (error) {
        return Promise.reject({ message: error });
      }
    },
    [middleman]
  );

  const postOrder = useCallback(
    async (order) => {
      try {
        const result = await middleman.postOrder(order);
        return result;
      } catch (error) {
        return Promise.reject({ message: error });
      }
    },
    [middleman]
  );

  useEffect(() => {
    if (!tickers.length) {
      getTickers();
      getPendingOrders();
      getBalances("BTC,ETH,USDT");
    }
  }, [tickers, getTickers, getPendingOrders, getBalances]);

  return (
    <StoreContext.Provider
      value={{
        tickers,
        pendingOrders,
        closeOrders,
        orderHistories,
        balances,
        selectedTicker,
        selectTickerHandler,
        getTickers,
        getBooks,
        getTrades,
        getCandles,
        getPendingOrders,
        getBalances,
        postOrder,
      }}
    >
      {props.children}
    </StoreContext.Provider>
  );
};

export default StoreProvider;
