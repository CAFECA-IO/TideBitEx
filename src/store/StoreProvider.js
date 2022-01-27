import React, { useEffect, useCallback, useMemo, useState } from "react";
import Middleman from "../modal/Middleman";
import StoreContext from "./store-context";

// const wsServer = "wss://exchange.tidebit.network/ws/v1";
const wsServer = "ws://127.0.0.1";
const wsClient = new WebSocket(wsServer);

const StoreProvider = (props) => {
  const middleman = useMemo(() => new Middleman(), []);
  const [wsConnected, setWsConnected] = useState(false);
  const [tickers, setTickers] = useState([]);
  const [books, setBooks] = useState(null);
  const [trades, setTrades] = useState([]);
  const [candles, setCandles] = useState([]);
  const [selectedBar, setSelectedBar] = useState("1D");
  const [pendingOrders, setPendingOrders] = useState([]);
  const [closeOrders, setCloseOrders] = useState([]);
  const [orderHistories, setOrderHistories] = useState([]);
  const [balances, setBalances] = useState([]);
  const [selectedTicker, setSelectedTicker] = useState(null);

  const updateTrades = (updateData) => {
    console.log(`trades`, trades);
    console.log(`updateTrades`, updateData);
    const updateTrades = updateData
      .map((trade) => ({ ...trade, update: true }))
      .concat(trades);
    setTrades(updateTrades);
  };
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

  const candleBarHandler = useCallback(
    async (bar) => {
      if (bar !== selectedBar) {
        setSelectedBar(bar);
        const candles = await getCandles(selectedTicker?.instId, bar);
        setCandles(candles);
      }
    },
    [getCandles, selectedBar, selectedTicker?.instId]
  );

  const selectTickerHandler = useCallback(
    async (ticker) => {
      setSelectedTicker(ticker);
      middleman.updateSelectedTicker(ticker);
      if (ticker?.instId !== selectedTicker?.instId) {
        const books = await getBooks(ticker?.instId);
        setBooks(books);
        const trades = await getTrades(ticker?.instId);
        setTrades(trades);
        const candles = await getCandles(ticker?.instId, selectedBar);
        setCandles(candles);
      }
    },
    [middleman, getBooks, getCandles, getTrades, selectedBar, selectedTicker]
  );

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

  const getPendingOrders = useCallback(
    async (options) => {
      try {
        const result = await middleman.getPendingOrders(options);
        console.log(`getPendingOrders result`, result);
        if (!options) setPendingOrders(result);
        return result;
      } catch (error) {
        console.log(`getPendingOrders error`, error);
        return Promise.reject({ message: error });
      }
    },
    [middleman]
  );

  const getCloseOrders = useCallback(
    async (options) => {
      try {
        const result = await middleman.getCloseOrders(options);
        console.log(`getCloseOrders result`, result);
        if (!options) setCloseOrders(result);
        return result;
      } catch (error) {
        console.log(`getCloseOrders error`, error);
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
        setBalances(result[0].details);
        return result;
      } catch (error) {
        console.log(`getBalances error`, error);
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
    if (wsConnected && selectedTicker) {
      console.log(`wsClient switchTradingPair`, selectedTicker.instId);
      wsClient.send(
        JSON.stringify({
          op: "switchTradingPair",
          args: {
            instId: selectedTicker.instId,
          },
        })
      );
    }
  }, [wsConnected, selectedTicker]);

  useEffect(() => {
    getTickers();
    getPendingOrders();
    getCloseOrders();
    // getBalances("BTC,ETH,USDT");
    getBalances();
    wsClient.addEventListener("open", function () {
      console.log("連結建立成功。");
      setWsConnected(true);
    });
    wsClient.addEventListener("close", function () {
      console.log("連結關閉。");
      setWsConnected(false);
    });
    wsClient.addEventListener("message", (msg) => {
      let metaData = JSON.parse(msg.data);
      switch (metaData.type) {
        case "pairOnUpdate":
          console.log("pairOnUpdate");
          const { updateTicker, updateTickers } = middleman.updateTickers(
            metaData.data
          );
          if (updateTicker) setSelectedTicker(updateTicker);
          if (updateTickers) setTickers(updateTickers);
          break;
        case "tradeDataOnUpdate":
          // console.log("tradeDataOnUpdate");
          // console.log(metaData.data);
          updateTrades(metaData.data);
          break;
        case "orderOnUpdate":
          // console.log("orderOnUpdate");
          // console.log(metaData.data);
          break;
        case "candleOnUpdate":
          // console.log("candleOnUpdate");
          // console.log(metaData.data);
          break;
        default:
          console.log("default");
          console.log(metaData.data);
      }
    });
  }, []);

  return (
    <StoreContext.Provider
      value={{
        tickers,
        books,
        trades,
        candles,
        selectedBar,
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
        candleBarHandler,
        getPendingOrders,
        getCloseOrders,
        getBalances,
        postOrder,
      }}
    >
      {props.children}
    </StoreContext.Provider>
  );
};

export default StoreProvider;
