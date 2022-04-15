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
  const [books, setBooks] = useState(null);
  const [trades, setTrades] = useState([]);
  const [candles, setCandles] = useState(null);
  const [resolution, setResolution] = useState("1D");
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
    bookTimestamp = 0,
    accountTimestamp = 0;

  const getBooks = useCallback(
    async (id, sz = 100) => {
      try {
        const result = await middleman.getBooks(id, sz);
        setBooks(result);
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
    async (id, limit) => {
      try {
        const { trades, candles, volumes } = await middleman.getTrades(
          id,
          limit,
          resolution
        );
        setTrades(trades);
        setCandles({ candles, volumes });
      } catch (error) {
        enqueueSnackbar(`"getTrades error: ${error?.message}"`, {
          variant: "error",
        });
      }
    },
    [enqueueSnackbar, middleman, resolution]
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

  const resolutionHandler = useCallback(
    async (newResolution) => {
      if (newResolution !== resolution) {
        setResolution(newResolution);
        const { candles, volumes } = middleman.updateCandles(
          trades,
          newResolution
        );
        setCandles({ candles, volumes });
      }
    },
    [middleman, resolution, trades]
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

  const getTicker = useCallback(
    async (id) => {
      try {
        const result = await middleman.getTicker(id);
        return result;
      } catch (error) {
        enqueueSnackbar(`"getTicker error: ${error?.message}"`, {
          variant: "error",
        });
      }
    },
    [enqueueSnackbar, middleman]
  );

  const selectTickerHandler = useCallback(
    async (ticker) => {
      console.log(`****^^^^**** selectTickerHandler [START] ****^^^^****`);
      console.log(`selectedTicker`, selectedTicker, !selectedTicker);
      console.log(`ticker`, ticker, ticker.id !== selectedTicker?.id);
      if (!selectedTicker || ticker.id !== selectedTicker?.id) {
        middleman.updateSelectedTicker(ticker);
        setSelectedTicker(ticker);
        console.log(`ticker`, ticker);
        document.title = `${ticker.last} ${ticker.name}`;
        history.push({
          pathname: `/markets/${ticker.id}`,
        });
        await getBooks(ticker.id);
        await getTrades(ticker.id);
        if (isLogin) {
          await getPendingOrders();
          await getCloseOrders();
        }
        wsClient.send(
          JSON.stringify({
            op: "switchTradingPair",
            args: {
              market: ticker.id,
            },
          })
        );
      }
      console.log(`****^^^^**** selectTickerHandler [END] ****^^^^****`);
    },
    [
      isLogin,
      selectedTicker,
      history,
      middleman,
      getBooks,
      getTrades,
      getPendingOrders,
      getCloseOrders,
    ]
  );

  const getTickers = useCallback(
    async (instType = "SPOT", from = 0, limit = 100) => {
      try {
        const result = await middleman.getTickers(instType, from, limit);
        setTickers(result);
      } catch (error) {
        enqueueSnackbar(`"getTickers error: ${error?.message}"`, {
          variant: "error",
        });
      }
    },
    [enqueueSnackbar, middleman]
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
          setIsLogin(true);
          await getPendingOrders();
          await getCloseOrders();
          const id = location.pathname.includes("/markets/")
            ? location.pathname.replace("/markets/", "")
            : null;
          if (id) {
            wsClient.send(
              JSON.stringify({
                op: "userLogin",
                args: {
                  token,
                  market: id,
                },
              })
            );
          }
        }
      }
    } catch (error) {
      enqueueSnackbar(`"getToken error: ${error?.message}"`, {
        variant: "error",
      });
    }
  }, [enqueueSnackbar, getCloseOrders, getPendingOrders, location.pathname]);

  const getAccounts = useCallback(async () => {
    await middleman.getAccounts();
    setAccounts(middleman.accounts);
    if (middleman.isLogin) await getCSRFToken();
  }, [getCSRFToken, middleman]);

  const postOrder = useCallback(
    async (order) => {
      const _order = {
        ...order,
        "X-CSRF-Token": token,
      };
      try {
        const result = await middleman.postOrder(_order);
        let index, updateQuoteAccount, updateBaseAccount;
        if (order.side === "buy") {
          index = accounts.findIndex(
            (account) => account.ccy === selectedTicker?.quote_unit
          );
          if (index !== -1) {
            updateQuoteAccount = accounts[index];
            updateQuoteAccount.availBal = SafeMath.minus(
              accounts[index].availBal,
              SafeMath.mult(order.px, order.sz)
            );
            updateQuoteAccount.frozenBal = SafeMath.plus(
              accounts[index].frozenBal,
              SafeMath.mult(order.px, order.sz)
            );
            const updateAccounts = accounts.map((account) => ({ ...account }));
            updateAccounts[index] = updateQuoteAccount;
            middleman.updateAccounts(updateQuoteAccount);
            setAccounts(updateAccounts);
          }
        } else {
          index = accounts.findIndex(
            (account) => account.ccy === selectedTicker?.base_unit
          );
          if (index !== -1) {
            updateBaseAccount = accounts[index];
            updateBaseAccount.availBal = SafeMath.minus(
              accounts[index].availBal,
              order.sz
            );
            updateBaseAccount.frozenBal = SafeMath.plus(
              accounts[index].frozenBal,
              order.sz
            );
            const updateAccounts = accounts.map((account) => ({ ...account }));
            updateAccounts[index] = updateBaseAccount;
            middleman.updateAccounts(updateBaseAccount);
            setAccounts(updateAccounts);
          }
        }
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
    [
      accounts,
      enqueueSnackbar,
      middleman,
      selectedTicker?.base_unit,
      selectedTicker?.quote_unit,
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

  const start = useCallback(async () => {
    const id = location.pathname.includes("/markets/")
      ? location.pathname.replace("/markets/", "")
      : null;
    const ticker = await getTicker(id);
    await selectTickerHandler(ticker);
    await getTickers();
    await getAccounts();
  }, [
    getTicker,
    getAccounts,
    getTickers,
    selectTickerHandler,
    location.pathname,
  ]);

  useEffect(() => {
    start();
    wsClient.addEventListener("open", function () {
      setWsConnected(true);
    });
    wsClient.addEventListener("close", function () {
      setWsConnected(false);
    });
    wsClient.addEventListener("message", (msg) => {
      let // _tickerTimestamp = 0,
        _bookTimestamp = 0,
        // _candleTimestamp = 0,
        _accountTimestamp = 0,
        metaData = JSON.parse(msg.data);
      switch (metaData.type) {
        case "tickersOnUpdate":
          const { updateTicker, updateTickers } = middleman.updateTickers(
            metaData.data
          );
          // _tickerTimestamp = new Date().getTime();
          if (!!updateTicker) {
            console.log(`tickersOnUpdate updateTicker`, updateTicker);
            setSelectedTicker(updateTicker);
            document.title = `${updateTicker.last} ${updateTicker.pair}`;
          }
          // if (_tickerTimestamp - +tickerTimestamp > 1000) {
          // console.log(
          //   `++++++++****+++++ tickersOnUpdate[START] +++++*****+++++`
          // );
          // tickerTimestamp = _tickerTimestamp;
          setTickers(updateTickers);
          // console.log(`updateTickers`, updateTickers);
          // console.log(`updateTicker`, updateTicker);
          // console.log(
          //   `++++++++****+++++ tickersOnUpdate[END] +++++*****+++++`
          // );
          // }
          break;
        case "tradesOnUpdate":
          const { trades, candles, volumes } = middleman.updateTrades(
            metaData.data,
            resolution
          );
          setTrades(trades);
          setCandles({ candles, volumes });
          middleman.resetTrades();
          break;
        case "orderBooksOnUpdate":
          const updateBooks = middleman.updateBooks(metaData.data);
          _bookTimestamp = new Date().getTime();
          if (_bookTimestamp - +bookTimestamp > 1000) {
            console.log(`updateBooks`, updateBooks);
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
          setPendingOrders(updatePendingOrders);
          setCloseOrders(updateCloseOrders);
          break;
        // case "tradeOnUpdate":
        //   console.info(`tradeOnUpdate trade`, metaData.data);
        //   break;
        default:
      }
    });
    return () => {
      middleman.unregiterAll();
    };
  }, []);

  return (
    <StoreContext.Provider
      value={{
        isLogin,
        tickers,
        books,
        trades,
        candles,
        resolution,
        pendingOrders,
        closeOrders,
        orderHistories,
        accounts,
        selectedTicker,
        activePage,
        orderbook,
        languageKey,
        orderBookHandler,
        setLanguageKey,
        findTicker,
        selectTickerHandler,
        getTickers,
        getBooks,
        getTrades,
        // getCandles,
        resolutionHandler,
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
