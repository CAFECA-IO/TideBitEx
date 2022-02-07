import React, { useEffect, useCallback, useMemo, useState } from "react";
import Middleman from "../modal/Middleman";
import StoreContext from "./store-context";

// const wsServer = "wss://exchange.tidebit.network/ws/v1";
// const wsServer = "ws://127.0.0.1";
const wsClient = new WebSocket(
  (window.location.protocol === "https:" ? "wss://" : "ws://") +
    window.location.host +
    "/ws"
);

const StoreProvider = (props) => {
  const middleman = useMemo(() => new Middleman(), []);
  const [wsConnected, setWsConnected] = useState(false);
  const [tickers, setTickers] = useState([]);
  const [updateTickerIndexs, setUpdateTickerIndexs] = useState([]);
  const [books, setBooks] = useState(null);
  const [trades, setTrades] = useState([]);
  const [candles, setCandles] = useState([]);
  const [selectedBar, setSelectedBar] = useState("1D");
  const [pendingOrders, setPendingOrders] = useState([]);
  const [closeOrders, setCloseOrders] = useState([]);
  const [orderHistories, setOrderHistories] = useState([]);
  const [balances, setBalances] = useState([]);
  const [selectedTicker, setSelectedTicker] = useState(null);
  let tickerTimestamp = 0,
    tradeTimestamp = 0,
    bookTimestamp = 0,
    candleTimestamp = 0;

  const getBooks = useCallback(
    async (instId, sz = 100) => {
      try {
        const result = await middleman.getBooks(instId, sz);
        setBooks(result);
        // return result;
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
        setTrades(result);
        // return result;
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
        setCandles(result);
        // return result;
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
        await getCandles(selectedTicker?.instId, bar);
      }
    },
    [getCandles, selectedBar, selectedTicker?.instId]
  );

  const selectTickerHandler = useCallback(
    async (ticker) => {
      middleman.updateSelectedTicker(ticker);
      setSelectedTicker(ticker);
      if (ticker.instId !== selectedTicker?.instId || !selectedTicker) {
        await getBooks(ticker.instId);
        await getTrades(ticker.instId);
        await getCandles(ticker.instId, selectedBar);
        console.log(`wsClient switchTradingPair`, ticker.instId);
        wsClient.send(
          JSON.stringify({
            op: "switchTradingPair",
            args: {
              instId: ticker.instId,
            },
          })
        );
      }
    },
    [middleman, getBooks, getCandles, getTrades, selectedBar, selectedTicker]
  );

  const getTickers = useCallback(
    async (force = false, instType = "SPOT", from = 0, limit = 100) => {
      try {
        const result = await middleman.getTickers(instType, from, limit);
        setTickers(result);
        if (selectedTicker === null || force) selectTickerHandler(result[0]);
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

  const sync = useCallback(
    async (isInit = false) => {
      console.log("useCallback 只用一遍");
      await getTickers(true);
      if (isInit) {
        wsClient.addEventListener("open", function () {
          console.log("連結建立成功。");
          setWsConnected(true);
        });
        wsClient.addEventListener("close", function () {
          console.log("連結關閉。");
          setWsConnected(false);
        });
        wsClient.addEventListener("message", (msg) => {
          let _tickerTimestamp = 0,
            _tradeTimestamp = 0,
            _bookTimestamp = 0,
            _candleTimestamp = 0,
            metaData = JSON.parse(msg.data);
          switch (metaData.type) {
            case "pairOnUpdate":
              const { updateTicker, updateTickers, updateIndexes } =
                middleman.updateTickers(metaData.data);
              _tickerTimestamp = new Date().getTime();
              if (!!updateTicker) setSelectedTicker(updateTicker);
              if (_tickerTimestamp - +tickerTimestamp > 1000) {
                tickerTimestamp = _tickerTimestamp;
                setTickers(updateTickers);
                setUpdateTickerIndexs(updateIndexes);
              }
              break;
            case "tradeDataOnUpdate":
              const updateTrades = middleman.updateTrades(metaData.data);
              _tradeTimestamp = new Date().getTime();
              if (_tradeTimestamp - +tradeTimestamp > 1000) {
                console.log(`updateTrades`, updateTrades);
                tradeTimestamp = _tradeTimestamp;
                setTrades(updateTrades);
              }
              break;
            case "orderOnUpdate":
              const updateBooks = middleman.updateBooks(metaData.data);
              _bookTimestamp = new Date().getTime();
              if (_bookTimestamp - +bookTimestamp > 1000) {
                console.log(`updateBooks`, updateBooks);
                bookTimestamp = _bookTimestamp;
                setBooks(updateBooks);
              }
              break;
            case "candleOnUpdate":
              _candleTimestamp = new Date().getTime();
              if (_candleTimestamp - +candleTimestamp > 1000) {
                console.log(`candleOnUpdate`);
                candleTimestamp = _candleTimestamp;
                setBooks(updateBooks);
                console.log("candleOnUpdate");
                console.log(metaData.data);
              }
              break;
            default:
              console.log("default");
              console.log(metaData.data);
          }
        });
        await getPendingOrders();
        await getCloseOrders();
        await getBalances();
      }
    },
    [getBalances, getCloseOrders, getPendingOrders, getTickers, middleman]
  );

  useEffect(() => {
    sync(true);
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
        updateTickerIndexs,
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
