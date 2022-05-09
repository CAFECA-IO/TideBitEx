import React, { useEffect, useCallback, useMemo, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { useSnackbar } from "notistack";
import { Config } from "../constant/Config";
import Middleman from "../modal/Middleman";
import StoreContext from "./store-context";
import SafeMath from "../utils/SafeMath";
import { getToken } from "../utils/Token";
import Events from "../constant/Events";

// const wsServer = "wss://exchange.tidebit.network/ws/v1";
// const wsServer = "ws://127.0.0.1";

let tickerTimestamp = 0,
  bookTimestamp = 0,
  accountTimestamp = 0,
  connection_resolvers = [];

const StoreProvider = (props) => {
  const middleman = useMemo(() => new Middleman(), []);
  const location = useLocation();
  const history = useHistory();
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
  const [token, setToken] = useState(null);
  const [languageKey, setLanguageKey] = useState("en");

  const action = useCallback(
    (key) => (
      <React.Fragment>
        <div
          onClick={() => {
            closeSnackbar(key);
          }}
        >
          Dismiss
        </div>
      </React.Fragment>
    ),
    [closeSnackbar]
  );

  const wsUpdateHandler = useCallback(
    (msg) => {
      let _tickerTimestamp = 0,
        _bookTimestamp = 0,
        // _candleTimestamp = 0,
        _accountTimestamp = 0,
        metaData = JSON.parse(msg.data);
      switch (metaData.type) {
        case Events.tickers:
          const { updateTicker, updateTickers } = middleman.updateTickers(
            metaData.data
          );
          _tickerTimestamp = new Date().getTime();
          if (!!updateTicker) {
            // console.log(`Events.tickers updateTicker`, updateTicker);
            setSelectedTicker(updateTicker);
            document.title = `${updateTicker.last} ${updateTicker.name}`;
          }
          if (_tickerTimestamp - +tickerTimestamp > 1000) {
            // console.log(
            //   `++++++++****+++++ Events.tickers[START] +++++*****+++++`
            // );
            tickerTimestamp = _tickerTimestamp;
            setTickers(updateTickers);
            // console.log(`updateTickers`, updateTickers);
            // console.log(`updateTicker`, updateTicker);
            // console.log(
            //   `++++++++****+++++ Events.tickers[END] +++++*****+++++`
            // );
          }
          break;
        case Events.trades:
          const { trades, candles, volumes } = middleman.updateTrades(
            metaData.data.trades,
            resolution
          );
          setTrades(trades);
          setCandles({ candles, volumes });
          middleman.resetTrades();
          break;
        case Events.update:
          const updateBooks = middleman.updateBooks(metaData.data);
          _bookTimestamp = new Date().getTime();
          if (_bookTimestamp - +bookTimestamp > 1000) {
            // console.log(`updateBooks`, updateBooks);
            bookTimestamp = _bookTimestamp;
            setBooks(updateBooks);
          }
          break;
        case Events.account:
          const updateAccounts = middleman.updateAccounts(metaData.data);
          _accountTimestamp = new Date().getTime();
          if (_accountTimestamp - +accountTimestamp > 1000) {
            accountTimestamp = _accountTimestamp;
            setAccounts(updateAccounts);
          }
          break;
        case Events.order:
          const { updatePendingOrders, updateCloseOrders } =
            middleman.updateOrders(metaData.data);
          setPendingOrders(updatePendingOrders);
          setCloseOrders(updateCloseOrders);
          break;
        // case Events.trade:
        //   console.info(`Events.trade`, metaData.data);
        //   break;
        default:
      }
    },
    [middleman, resolution]
  );

  const connect = useCallback(() => {
    const ws = new WebSocket(Config[Config.status].websocket);
    let interval;
    ws.addEventListener("open", () => {
      clearInterval(interval);
      const data = connection_resolvers.shift();
      if (data) ws.send(data);
      interval = setInterval(() => {
        const data = connection_resolvers.shift();
        if (data) ws.send(data);
      }, 1000);
    });
    ws.addEventListener("close", (msg) => {
      clearInterval(interval);
      console.log(
        "Socket is closed. Reconnect will be attempted in 1 second.",
        msg.reason
      );
      setTimeout(function () {
        connect();
      }, 1000);
    });
    ws.addEventListener("message", (msg) => {
      // console.log(`message msg`, msg);
      wsUpdateHandler(msg);
    });
  }, [wsUpdateHandler]);

  const orderBookHandler = useCallback((price, amount) => {
    setOrderbook({ price, amount });
  }, []);

  const getBooks = useCallback(
    async (id, sz = 100) => {
      try {
        const result = await middleman.getBooks(id, sz);
        setBooks(result);
        // return result;
      } catch (error) {
        enqueueSnackbar(`"getBooks error: ${error?.message}"`, {
          variant: "error",
          action,
        });
      }
    },
    [action, enqueueSnackbar, middleman]
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
          action,
        });
      }
    },
    [action, enqueueSnackbar, middleman, resolution]
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
  //         variant: "error",action
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

  const getOrderList = useCallback(
    async (options) => {
      try {
        const result = await middleman.getOrderList(options);
        // if (!options) setPendingOrders(result);
        setPendingOrders(result);
        return result;
      } catch (error) {
        enqueueSnackbar(`"getOrderList error: ${error?.message}"`, {
          variant: "error",
          action,
        });
      }
    },
    [action, enqueueSnackbar, middleman]
  );

  const getOrderHistory = useCallback(
    async (options) => {
      try {
        const result = await middleman.getOrderHistory(options);
        // if (!options) setCloseOrders(result);
        setCloseOrders(result);
        return result;
      } catch (error) {
        enqueueSnackbar(`"getOrderHistory error: ${error?.message}"`, {
          variant: "error",
          action,
        });
      }
    },
    [action, enqueueSnackbar, middleman]
  );

  const getTicker = useCallback(
    async (market) => {
      try {
        const result = await middleman.getTicker(market);
        return result;
      } catch (error) {
        enqueueSnackbar(`"getTicker error: ${error?.message}"`, {
          variant: "error",
          action,
        });
      }
    },
    [action, enqueueSnackbar, middleman]
  );

  const selectTickerHandler = useCallback(
    async (ticker) => {
      // console.log(`selectedTicker`, selectedTicker, !selectedTicker);
      // console.log(`ticker`, ticker, ticker.market !== selectedTicker?.market);
      if (!selectedTicker || ticker.market !== selectedTicker?.market) {
        middleman.updateSelectedTicker(ticker);
        setSelectedTicker(ticker);
        console.log(`ticker`, ticker);
        document.title = `${ticker.last} ${ticker.name}`;
        history.push({
          pathname: `/markets/${ticker.market}`,
        });
        await getBooks(ticker.market);
        await getTrades(ticker.market);
        if (isLogin) {
          await getOrderList();
          await getOrderHistory();
        }
        connection_resolvers.push(
          JSON.stringify({
            op: "switchMarket",
            args: {
              market: ticker.market,
              resolution: resolution,
            },
          })
        );
      }
      // console.log(`****^^^^**** selectTickerHandler [END] ****^^^^****`);
    },
    [
      resolution,
      isLogin,
      selectedTicker,
      history,
      middleman,
      getBooks,
      getTrades,
      getOrderList,
      getOrderHistory,
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
          action,
        });
      }
    },
    [action, enqueueSnackbar, middleman]
  );

  const getCSRFToken = useCallback(async () => {
    const XSRF = document.cookie
      .split(";")
      .filter((v) => /XSRF-TOKEN/.test(v))
      .pop()
      ?.split("=")[1];
    try {
      if (XSRF) {
        // const token = await getToken(XSRF);
        const token = await middleman.getCSRTToken();
        if (token) {
          setToken(token);
          setIsLogin(true);
        }
      }
    } catch (error) {
      enqueueSnackbar(`"getToken error: ${error?.message}"`, {
        variant: "error",
        action,
      });
    }
  }, [action, enqueueSnackbar, middleman]);
  // }, [action, enqueueSnackbar]);

  const getAccounts = useCallback(async () => {
    await middleman.getAccounts();
    // console.log(`getAccounts accounts`, middleman.accounts)
    setAccounts(middleman.accounts);
    if (middleman.isLogin) await getCSRFToken();
    await getOrderList();
    await getOrderHistory();
    const id = location.pathname.includes("/markets/")
      ? location.pathname.replace("/markets/", "")
      : null;
    if (id) {
      connection_resolvers.push(
        JSON.stringify({
          op: "userStatusUpdate",
          args: {
            token,
            market: id,
            resolution: resolution,
          },
        })
      );
    }
  }, [
    getCSRFToken,
    getOrderHistory,
    getOrderList,
    location.pathname,
    middleman,
    resolution,
    token,
  ]);

  const getExAccounts = useCallback(
    async (exchange) => {
      let exAccounts = [];
      try {
        exAccounts = await middleman.getExAccounts(exchange);
      } catch (error) {
        console.error(error);
      }
      return exAccounts;
    },
    [middleman]
  );

  const getUsersAccounts = useCallback(async () => {
    let usersAccounts = [];
    try {
      usersAccounts = await middleman.getUsersAccounts();
    } catch (error) {
      console.error(error);
    }
    return usersAccounts;
  }, [middleman]);

  const postOrder = useCallback(
    async (order) => {
      const _order = {
        ...order,
        // "X-CSRF-Token": token,
      };
      try {
        const result = await middleman.postOrder(_order);
        let index, updateQuoteAccount, updateBaseAccount;
        if (order.kind === "bid") {
          index = accounts.findIndex(
            (account) => account.ccy === selectedTicker?.quote_unit
          );
          if (index !== -1) {
            updateQuoteAccount = accounts[index];
            updateQuoteAccount.availBal = SafeMath.minus(
              accounts[index].availBal,
              SafeMath.mult(order.price, order.volume)
            );
            updateQuoteAccount.frozenBal = SafeMath.plus(
              accounts[index].frozenBal,
              SafeMath.mult(order.price, order.volume)
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
              order.volume
            );
            updateBaseAccount.frozenBal = SafeMath.plus(
              accounts[index].frozenBal,
              order.volume
            );
            const updateAccounts = accounts.map((account) => ({ ...account }));
            updateAccounts[index] = updateBaseAccount;
            middleman.updateAccounts(updateBaseAccount);
            setAccounts(updateAccounts);
          }
        }
        enqueueSnackbar(
          `${order.kind === "bid" ? "Bid" : "Ask"} ${order.volume} ${
            order.instId.split("-")[0]
          } with ${order.kind === "bid" ? "with" : "for"} ${SafeMath.mult(
            order.price,
            order.volume
          )} ${order.instId.split("-")[1]}`,
          { variant: "success", action }
        );
        return result;
      } catch (error) {
        enqueueSnackbar(
          `${error?.message}. Failed to post order:
           ${order.kind === "buy" ? "Bid" : "Ask"} ${order.volume} ${
            order.instId.split("-")[0]
          } with ${order.kind === "buy" ? "with" : "for"} ${SafeMath.mult(
            order.price,
            order.volume
          )} ${order.instId.split("-")[1]}
          `,
          {
            variant: "error",
            action,
          }
        );
      }
    },
    [
      accounts,
      action,
      enqueueSnackbar,
      middleman,
      selectedTicker?.base_unit,
      selectedTicker?.quote_unit,
      // token,
    ]
  );

  const cancelOrder = useCallback(
    async (order) => {
      const _order = {
        ...order,
        // "X-CSRF-Token": token,
      };
      try {
        const result = await middleman.cancelOrder(_order);
        // -- WORKAROUND
        const { updatePendingOrders, updateCloseOrders } =
          middleman.updateOrders({
            ...order,
            state: "cancel",
            state_text: "Canceled",
          });
        setPendingOrders(updatePendingOrders);
        setCloseOrders(updateCloseOrders);
        // -- WORKAROUND
        enqueueSnackbar(
          `You have canceled order id(${order.id}): ${
            order.kind === "bid" ? "Bid" : "Ask"
          } ${order.volume} ${order.instId.split("-")[0]} with ${
            order.kind === "bid" ? "with" : "for"
          } ${SafeMath.mult(order.price, order.volume)} ${
            order.instId.split("-")[1]
          }`,
          { variant: "success", action }
        );
        return result;
      } catch (error) {
        enqueueSnackbar(
          `${error?.message || "Some went wrong"}. Failed to cancel order(${
            order.id
          }): ${order.kind === "bid" ? "Bid" : "Ask"} ${order.volume} ${
            order.instId.split("-")[0]
          } with ${order.kind === "bid" ? "with" : "for"} ${SafeMath.mult(
            order.price,
            order.volume
          )} ${order.instId.split("-")[1]}`,
          {
            variant: "error",
            action,
          }
        );
        return false;
      }
    },
    [action, enqueueSnackbar, middleman]
    // [action, enqueueSnackbar, middleman, token]
  );

  const cancelOrders = useCallback(
    async (type) => {
      const _options = {
        type,
        instId: selectedTicker.instId,
        // "X-CSRF-Token": token,
      };
      try {
        const result = await middleman.cancelOrders(_options);
        enqueueSnackbar(`Your orders have canceled `, {
          variant: "success",
          action,
        });
        return result;
      } catch (error) {
        enqueueSnackbar(
          `${error?.message || "Some went wrong"}. Failed to cancel orders`,
          {
            variant: "error",
            action,
          }
        );
        return false;
      }
    },
    [action, enqueueSnackbar, middleman, token, selectedTicker]
  );

  const activePageHandler = (page) => {
    setActivePage(page);
  };

  const start = useCallback(async () => {
    // console.log(`******** start [START] ********`);
    connect();
    const market = location.pathname.includes("/markets/")
      ? location.pathname.replace("/markets/", "")
      : null;
    const ticker = await getTicker(market);
    await selectTickerHandler(ticker);
    await getTickers();
    await getAccounts();
    // console.log(`******** start [END] ********`);
  }, [
    connect,
    getTicker,
    getAccounts,
    getTickers,
    selectTickerHandler,
    location.pathname,
  ]);

  useEffect(() => {
    start();
    return () => {};
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
        getOrderList,
        getOrderHistory,
        getAccounts,
        postOrder,
        cancelOrder,
        cancelOrders,
        activePageHandler,
        getExAccounts,
        getUsersAccounts,
      }}
    >
      {props.children}
    </StoreContext.Provider>
  );
};

export default StoreProvider;
