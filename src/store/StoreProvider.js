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
  const [accounts, setAccounts] = useState([]);
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [activePage, setActivePage] = useState("market");
  const [orderbook, setOrderbook] = useState(null);
  // const [sellPx, setSellPx] = useState(null);
  const [token, setToken] = useState(null);
  const [languageKey, setLanguageKey] = useState("en");

  const orderBookHandler = useCallback((price, amount) => {
    setOrderbook({ price, amount });
  }, []);

  let tickerTimestamp = 0,
    tradeTimestamp = 0,
    bookTimestamp = 0,
    candleTimestamp = 0,
    accountTimestamp = 0,
    orderTimestamp = 0;

  const getBooks = useCallback(
    async (instId, sz = 100) => {
      try {
        const result = await middleman.getBooks(instId, sz);
        setBooks(result);
        setInit(true);
        // return result;
      } catch (error) {
        enqueueSnackbar(`"getBooks error: ${error?.message}"`, {
          variant: "error",
        });
      }
    },
    [enqueueSnackbar, middleman]
  );

  const getTrades = useCallback(
    async (instId, limit) => {
      try {
        const { trades, candles, volumes } = await middleman.getTrades(
          instId,
          limit,
          selectedBar
        );
        setTrades(trades);
        setCandles({ candles, volumes });
      } catch (error) {
        enqueueSnackbar(`"getTrades error: ${error?.message}"`, {
          variant: "error",
        });
      }
    },
    [enqueueSnackbar, middleman, selectedBar]
  );

  // const getCandles = useCallback(
  //   async (instId, bar, after, before, limit) => {
  //     try {
  //       const result = await middleman.getCandles(
  //         instId,
  //         bar,
  //         after,
  //         before,
  //         limit
  //       );
  //       setCandles(result);
  //       // return result;
  //     } catch (error) {
  //       enqueueSnackbar(`"getMarketPrices error: ${error?.message}"`, {
  //         variant: "error",
  //       });
  //     }
  //   },
  //   [enqueueSnackbar, middleman]
  // );

  const candleBarHandler = useCallback(
    async (bar) => {
      if (bar !== selectedBar) {
        setSelectedBar(bar);
        const candles = middleman.transformTradesToCandle(trades, bar);
        setCandles(candles);
        // await getCandles(selectedTicker?.instId, bar);
      }
    },
    [middleman, selectedBar, trades]
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
        enqueueSnackbar(`"getPendingOrders error: ${error?.message}"`, {
          variant: "error",
        });
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
        enqueueSnackbar(`"getCloseOrders error: ${error?.message}"`, {
          variant: "error",
        });
      }
    },
    [enqueueSnackbar, middleman]
  );

  const registerMarketChannel = useCallback(
    async (instId, selectedBar) => {
      try {
        await middleman.registerMarketChannel(instId, selectedBar);
      } catch (error) {
        enqueueSnackbar(`"registerMarketChannel error: ${error?.message}"`, {
          variant: "error",
        });
      }
    },
    [enqueueSnackbar, middleman]
  );

  const registerGlobalChannel = useCallback(async () => {
    try {
      await middleman.registerGlobalChannel();
    } catch (error) {
      enqueueSnackbar(`"registerGlobalChannel error: ${error?.message}"`, {
        variant: "error",
      });
    }
  }, [enqueueSnackbar, middleman]);

  const registerPrivateChannel = useCallback(
    async (token) => {
      try {
        await middleman.registerPrivateChannel(token);
      } catch (error) {
        enqueueSnackbar(`"registerPrivateChannel error: ${error?.message}"`, {
          variant: "error",
        });
      }
    },
    [enqueueSnackbar, middleman]
  );

  const selectTickerHandler = useCallback(
    async (ticker) => {
      const _ticker = middleman.updateSelectedTicker(ticker);
      // ++ TODO 需要改用websocket呼叫的方式
      // console.log(`selectTickerHandler _ticker`, _ticker);
      //
      setSelectedTicker(_ticker);
      document.title = `${_ticker.last} ${_ticker.name}`;
      if (ticker.instId !== selectedTicker?.instId || !selectedTicker) {
        history.push({
          pathname: `/markets/${ticker.instId.replace("-", "").toLowerCase()}`,
        });
        await getBooks(ticker.instId);
        await getTrades(ticker.instId);
        // await getCandles(ticker.instId, selectedBar);
        await getPendingOrders();
        await getCloseOrders();
        await registerMarketChannel(ticker.instId, selectedBar);
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
      registerMarketChannel,
      selectedTicker,
      history,
      getBooks,
      getTrades,
      // getCandles,
      selectedBar,
      getPendingOrders,
      getCloseOrders,
    ]
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
        enqueueSnackbar(`"getTickers error: ${error?.message}"`, {
          variant: "error",
        });
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

  const getCSRFToken = useCallback(async () => {
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
          await registerPrivateChannel(token);
        }
      }
    } catch (error) {
      enqueueSnackbar(`"getToken error: ${error?.message}"`, {
        variant: "error",
      });
    }
  }, [enqueueSnackbar, registerPrivateChannel]);

  const getAccounts = useCallback(
    async (ccy) => {
      await middleman.getAccounts();
      if (middleman.isLogin) {
        await getCSRFToken();
        setIsLogin(true);
        enqueueSnackbar(`User Login`, {
          variant: "success",
        });
      }
      setAccounts(middleman.accounts);
    },
    [enqueueSnackbar, getCSRFToken, middleman]
  );

  const postOrder = useCallback(
    async (order) => {
      const _order = {
        ...order,
        "X-CSRF-Token": token,
      };
      try {
        const result = await middleman.postOrder(_order);
        enqueueSnackbar(
          `${order.side === "buy" ? "Bid" : "Ask"} ${order.sz} ${
            order.instId.split("-")[0]
          } with ${order.side === "buy" ? "with" : "for"} ${SafeMath.mult(
            order.px,
            order.sz
          )} ${order.instId.split("-")[1]}`,
          { variant: "success" }
        );
        return result;
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
    [enqueueSnackbar, middleman, token]
  );

  const cancelOrder = useCallback(
    async (order) => {
      const _order = {
        ...order,
        "X-CSRF-Token": token,
      };
      try {
        const result = await middleman.cancelOrder(_order);
        // await getCloseOrders();
        // await getPendingOrders();
        // await getAccounts();
        // await getBooks(order.instId);
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
      // getAccounts,
      // getBooks,
      // getCloseOrders,
      // getPendingOrders,
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
      await getAccounts();
      await getTickers(true);
      await registerGlobalChannel();
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
            _accountTimestamp = 0,
            _orderTimestamp = 0,
            metaData = JSON.parse(msg.data);
          switch (metaData.type) {
            case "tickersOnUpdate":
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
            case "tradesOnUpdate":
              const { updateTrades, updateCandles, updateVolume } =
                middleman.updateTrades(metaData.data, selectedBar);
              _tradeTimestamp = new Date().getTime();
              if (_tradeTimestamp - +tradeTimestamp > 1000) {
                // console.log(`updateTrades`, updateTrades);
                tradeTimestamp = _tradeTimestamp;
                setTrades(updateTrades);
                middleman.resetTrades();
                setCandles({ candles: updateCandles, volumes: updateVolume });
              }
              break;
            case "orderBooksOnUpdate":
              const updateBooks = middleman.updateBooks(metaData.data);
              _bookTimestamp = new Date().getTime();
              if (_bookTimestamp - +bookTimestamp > 1000) {
                // console.log(`updateBooks`, updateBooks);
                bookTimestamp = _bookTimestamp;
                setBooks(updateBooks);
              }
              break;
            // case "candleOnUpdate":
            //   const updateCandles = middleman.updateCandles(metaData.data);
            //   _candleTimestamp = new Date().getTime();
            //   if (_candleTimestamp - +candleTimestamp > 1000) {
            //     candleTimestamp = _candleTimestamp;
            //     setCandles(updateCandles);
            //   }
            //   break;
            // // ++ TODO TideBit WS 要與 OKEX整合
            case "accountOnUpdate":
              const updateAccounts = middleman.updateAccounts(metaData.data);
              _accountTimestamp = new Date().getTime();
              if (_accountTimestamp - +accountTimestamp > 1000) {
                accountTimestamp = _accountTimestamp;
                setAccounts(updateAccounts);
              }
              break;
            case "orderOnUpdate":
              const { updatePendingOrders, updateCloseOrders } =
                middleman.updateOrders(metaData.data);
              _orderTimestamp = new Date().getTime();
              if (_orderTimestamp - +orderTimestamp > 1000) {
                orderTimestamp = _orderTimestamp;
                setPendingOrders(updatePendingOrders);
                setCloseOrders(updateCloseOrders);
              }
              break;
            case "tradeOnUpdate":
              console.info(`tradeOnUpdate trade`, metaData.data);
              break;
            default:
          }
        });
      }
    },
    [getAccounts, getCloseOrders, getPendingOrders, getTickers, middleman]
  );

  const start = useCallback(async () => {
    sync(true);
  }, [sync]);

  useEffect(() => {
    start();
    return () => {
      middleman.unregiterAll();
    };
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
        accounts,
        selectedTicker,
        updateTickerIndexs,
        activePage,
        orderbook,
        languageKey,
        orderBookHandler,
        setLanguageKey,
        setInit,
        findTicker,
        selectTickerHandler,
        getTickers,
        getBooks,
        getTrades,
        // getCandles,
        candleBarHandler,
        getPendingOrders,
        getCloseOrders,
        getAccounts,
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
