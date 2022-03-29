import React, { useEffect, useCallback, useMemo, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { useSnackbar } from "notistack";
import { Config } from "../constant/Config";
import Middleman from "../modal/Middleman";
import StoreContext from "./store-context";
import SafeMath from "../utils/SafeMath";
import { getToken } from "../utils/Token";

// const wsServer = "wss://exchange.tidebit.network/ws/v1";
// const wsServer = "ws://127.0.0.1";
const wsClient = new WebSocket(Config[Config.status].websocket);

const StoreProvider = (props) => {
  const middleman = useMemo(() => new Middleman(), []);
  const location = useLocation();
  const history = useHistory();
  const [wsConnected, setWsConnected] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [tickers, setTickers] = useState([]);
  const [updateTickerIndexs, setUpdateTickerIndexs] = useState([]);
  const [books, setBooks] = useState(null);
  const [init, setInit] = useState(true);
  const [trades, setTrades] = useState([]);
  const [candles, setCandles] = useState(null);
  const [selectedBar, setSelectedBar] = useState("1D");
  const [pendingOrders, setPendingOrders] = useState([]);
  const [closeOrders, setCloseOrders] = useState([]);
  const [orderHistories, setOrderHistories] = useState([]);
  const [balances, setBalances] = useState([]);
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [activePage, setActivePage] = useState("market");
  const [buyPx, setBuyPx] = useState(null);
  const [sellPx, setSellPx] = useState(null);
  const [token, setToken] = useState(null);

  const buyPxHandler = useCallback((value) => {
    let _value = +value < 0 ? "0" : value;
    setBuyPx(_value);
  }, []);

  const sellPxHandler = useCallback((value) => {
    let _value = value < 0 ? "0" : value;
    setSellPx(_value);
  }, []);

  let tickerTimestamp = 0,
    tradeTimestamp = 0,
    bookTimestamp = 0,
    candleTimestamp = 0;

  const getBooks = useCallback(
    async (instId, sz = 100) => {
      try {
        const result = await middleman.getBooks(instId, sz);
        setBooks(result);
        setInit(true);
        // return result;
      } catch (error) {
        enqueueSnackbar(
          `${error?.message || "Some went wrong"}. Failed to get market book`,
          {
            variant: "error",
          }
        );
      }
    },
    [enqueueSnackbar, middleman]
  );

  const getTrades = useCallback(
    async (instId, limit) => {
      try {
        const result = await middleman.getTrades(instId, limit);
        setTrades(result);
        // return result;
      } catch (error) {
        enqueueSnackbar(
          `${error?.message || "Some went wrong"}. Failed to get market trade`,
          {
            variant: "error",
          }
        );
      }
    },
    [enqueueSnackbar, middleman]
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
        enqueueSnackbar(
          `${error?.message || "Some went wrong"}. Failed to get market price`,
          {
            variant: "error",
          }
        );
      }
    },
    [enqueueSnackbar, middleman]
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

  const findTicker = useCallback(
    async (id) => {
      const ticker = middleman.findTicker(id);
      return ticker;
    },
    [middleman]
  );

  const getPendingOrders = useCallback(
    async (options) => {
      try {
        const result = await middleman.getPendingOrders(options);
        // if (!options) setPendingOrders(result);
        setPendingOrders(result);
        return result;
      } catch (error) {
        enqueueSnackbar(
          `${error?.message || "Some went wrong"}. Failed to get pending order`,
          {
            variant: "error",
          }
        );
      }
    },
    [enqueueSnackbar, middleman]
  );

  const getCloseOrders = useCallback(
    async (options) => {
      try {
        const result = await middleman.getCloseOrders(options);
        // if (!options) setCloseOrders(result);
        setCloseOrders(result);
        return result;
      } catch (error) {
        enqueueSnackbar(
          `${error?.message || "Some went wrong"}. Failed to get close order`,
          {
            variant: "error",
          }
        );
      }
    },
    [enqueueSnackbar, middleman]
  );

  const selectTickerHandler = useCallback(
    async (ticker) => {
      const _ticker = middleman.updateSelectedTicker(ticker);
      setSelectedTicker(_ticker);
      document.title = `${_ticker.last} ${_ticker.pair}`;
      if (ticker.instId !== selectedTicker?.instId || !selectedTicker) {
        history.push({
          pathname: `/markets/${ticker.instId.replace("-", "").toLowerCase()}`,
        });
        await getBooks(ticker.instId);
        await getTrades(ticker.instId);
        await getCandles(ticker.instId, selectedBar);
        await getPendingOrders();
        await getCloseOrders();
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
    [
      middleman,
      selectedTicker,
      history,
      getBooks,
      getTrades,
      getCandles,
      getPendingOrders,
      getCloseOrders,
      selectedBar,
    ]
  );

  const getTicker = useCallback(
    async (instId) => {
      try {
        const result = await middleman.getTicker(instId);
        setTickers(middleman.tickers);
        if (selectedTicker.instId === instId) {
          selectTickerHandler(result);
        }
      } catch (error) {
        enqueueSnackbar(
          `${error?.message || "Some went wrong"}. Failed to update ticker`,
          {
            variant: "error",
          }
        );
      }
    },
    [enqueueSnackbar, middleman, selectTickerHandler, selectedTicker]
  );

  const getTickers = useCallback(
    async (force = false, instType = "SPOT", from = 0, limit = 100) => {
      try {
        const result = await middleman.getTickers(instType, from, limit);
        setTickers(result);
        if (selectedTicker === null || force) {
          const id = location.pathname.includes("/markets/")
            ? location.pathname.replace("/markets/", "")
            : null;
          const ticker = middleman.findTicker(id);
          selectTickerHandler(ticker ?? result[0]);
        }
      } catch (error) {
        enqueueSnackbar(
          `${
            error?.message || "Some went wrong"
          }. Failed to get market tickers`,
          {
            variant: "error",
          }
        );
      }
    },
    [
      enqueueSnackbar,
      location.pathname,
      middleman,
      selectTickerHandler,
      selectedTicker,
    ]
  );

  const getBalances = useCallback(
    async (ccy) => {
      await middleman.getBalances(ccy);
      setBalances(middleman.balances);
    },
    [middleman]
  );

  const postOrder = useCallback(
    async (order) => {
      const _order = {
        ...order,
        "X-CSRF-Token": token,
      };
      try {
        const result = await middleman.postOrder(_order);
        await getCloseOrders();
        await getPendingOrders();
        await getBalances();
        await getTrades(order.instId);
        await getBooks(order.instId);
        await getCandles(order.instId);
        await getTicker(order.instId);
        // await getTickers();
        // return result;
        enqueueSnackbar(
          `${order.side === "buy" ? "Bid" : "Ask"} ${order.sz} ${
            order.instId.split("-")[0]
          } with ${order.side === "buy" ? "with" : "for"} ${SafeMath.mult(
            order.px,
            order.sz
          )} ${order.instId.split("-")[1]}`,
          { variant: "success" }
        );
      } catch (error) {
        enqueueSnackbar(
          `${error?.message}. Failed to post order:
           ${order.side === "buy" ? "Bid" : "Ask"} ${order.sz} ${
            order.instId.split("-")[0]
          } with ${order.side === "buy" ? "with" : "for"} ${SafeMath.mult(
            order.px,
            order.sz
          )} ${order.instId.split("-")[1]}
          `,
          {
            variant: "error",
          }
        );
      }
    },
    [
      enqueueSnackbar,
      getBalances,
      getBooks,
      getCandles,
      getCloseOrders,
      getPendingOrders,
      getTicker,
      getTrades,
      middleman,
      token,
    ]
  );

  const cancelOrder = useCallback(
    async (order) => {
      const _order = {
        ...order,
        "X-CSRF-Token": token,
      };
      try {
        const result = await middleman.cancelOrder(_order);
        await getCloseOrders();
        await getPendingOrders();
        await getBalances();
        await getBooks(order.instId);
        enqueueSnackbar(
          `You have canceled ordId(${order.ordId}): ${
            order.side === "buy" ? "Bid" : "Ask"
          } ${order.sz} ${order.instId.split("-")[0]} with ${
            order.side === "buy" ? "with" : "for"
          } ${SafeMath.mult(order.px, order.sz)} ${order.instId.split("-")[1]}`,
          { variant: "success" }
        );
        return result;
      } catch (error) {
        enqueueSnackbar(
          `${error?.message || "Some went wrong"}. Failed to cancel order(${
            order.ordId
          }): ${order.side === "buy" ? "Bid" : "Ask"} ${order.sz} ${
            order.instId.split("-")[0]
          } with ${order.side === "buy" ? "with" : "for"} ${SafeMath.mult(
            order.px,
            order.sz
          )} ${order.instId.split("-")[1]}`,
          {
            variant: "error",
          }
        );
        return false;
      }
    },
    [
      enqueueSnackbar,
      getBalances,
      getBooks,
      getCloseOrders,
      getPendingOrders,
      middleman,
      token,
    ]
  );

  const activePageHandler = (page) => {
    setActivePage(page);
  };

  const sync = useCallback(
    async (isInit = false) => {
      await middleman.getInstruments();
      await getBalances();
      await getTickers(true);
      if (isInit) {
        wsClient.addEventListener("open", function () {
          setWsConnected(true);
        });
        wsClient.addEventListener("close", function () {
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
              if (!!updateTicker) {
                setSelectedTicker(updateTicker);
                document.title = `${updateTicker.last} ${updateTicker.pair}`;
              }
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
                // console.log(`updateTrades`, updateTrades);
                tradeTimestamp = _tradeTimestamp;
                setTrades(updateTrades);
                middleman.resetTrades();
              }
              break;
            case "orderOnUpdate":
              const updateBooks = middleman.updateBooks(metaData.data);
              _bookTimestamp = new Date().getTime();
              if (_bookTimestamp - +bookTimestamp > 1000) {
                // console.log(`updateBooks`, updateBooks);
                bookTimestamp = _bookTimestamp;
                setBooks(updateBooks);
              }
              break;
            case "candleOnUpdate":
              const updateCandles = middleman.updateCandles(metaData.data);
              _candleTimestamp = new Date().getTime();
              if (_candleTimestamp - +candleTimestamp > 1000) {
                candleTimestamp = _candleTimestamp;
                setCandles(updateCandles);
              }
              break;
            default:
          }
        });
      }
    },
    [getBalances, getCloseOrders, getPendingOrders, getTickers, middleman]
  );

  const start = useCallback(async () => {
    sync(true);
    const XSRF = document.cookie
      .split(";")
      .filter((v) => /XSRF-TOKEN/.test(v))
      .pop()
      ?.split("=")[1];
    try {
      if (XSRF) {
        const token = await getToken(XSRF);
        if (token) {
          setToken(token);
          setIsLogin(true);
          enqueueSnackbar(`User Login`, {
            variant: "success",
          });
        }
      }
    } catch (error) {
      enqueueSnackbar(`${error?.message || "Some went wrong with getToken"}`, {
        variant: "error",
      });
    }
  }, [enqueueSnackbar, sync]);

  useEffect(() => {
    start();
  }, []);

  return (
    <StoreContext.Provider
      value={{
        init,
        isLogin,
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
        activePage,
        buyPx,
        sellPx,
        buyPxHandler,
        sellPxHandler,
        setInit,
        findTicker,
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
        cancelOrder,
        activePageHandler,
      }}
    >
      {props.children}
    </StoreContext.Provider>
  );
};

export default StoreProvider;
