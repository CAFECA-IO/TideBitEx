import React, { useEffect, useCallback, useMemo, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { useSnackbar } from "notistack";
// import { Config } from "../constant/Config";
import Middleman from "../modal/Middleman";
import StoreContext from "./store-context";
import SafeMath from "../utils/SafeMath";
// import { getToken } from "../utils/Token";
// import Events from "../constant/Events";

// const wsServer = "wss://exchange.tidebit.network/ws/v1";
// const wsServer = "ws://127.0.0.1";

// let tickerTimestamp = 0,
//   bookTimestamp = 0,
//   accountTimestamp = 0,
//   tradeTimestamp = 0,
//   connection_resolvers = [];

let interval;

const StoreProvider = (props) => {
  const middleman = useMemo(() => new Middleman(), []);
  const location = useLocation();
  const history = useHistory();
  const [isLogin, setIsLogin] = useState(false);
  const [tickers, setTickers] = useState([]);
  const [books, setBooks] = useState(null);
  const [trades, setTrades] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [closeOrders, setCloseOrders] = useState([]);
  const [orderHistories, setOrderHistories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [activePage, setActivePage] = useState("market");
  const [depthBook, setDepthbook] = useState(null);
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

  /*
  const wsUpdateHandler = useCallback(
    (msg) => {
      let _tickerTimestamp = 0,
        // _bookTimestamp = 0,
        _accountTimestamp = 0,
        _tradeTimestamp = 0,
        metaData = JSON.parse(msg.data);
      switch (metaData.type) {
        case Events.tickers:
          const { updateTicker, updateTickers } = middleman.updateTickers(
            metaData.data
          );
          if (!!updateTicker) {
            setSelectedTicker(updateTicker);
            document.title = `${updateTicker.last} ${updateTicker.name}`;
          }
          _tickerTimestamp = new Date().getTime();
          if (_tickerTimestamp - +tickerTimestamp > 1000) {
            tickerTimestamp = _tickerTimestamp;
            setTickers(updateTickers);
          }
          break;
        case Events.trades:
          if (metaData.data.updateAll) {
            middleman.updateAllTrades(metaData.data);
            setTrades(metaData.data);
          }
          middleman.updateTrades(metaData.data);
          _tradeTimestamp = new Date().getTime();
          if (_tradeTimestamp - +tradeTimestamp > 1000) {
            tradeTimestamp = _tradeTimestamp;
            const { updateTrades, updatedTrades } = middleman.getUpdateTrades();
            setTrades(updateTrades);
            middleman.updateUpdatedTradesQueue(updatedTrades);
          }
          break;
        case Events.update:
          const updateBooks = middleman.updateBooks(metaData.data);
          // _bookTimestamp = new Date().getTime();
          // if (_bookTimestamp - +bookTimestamp > 1000) {
          //   bookTimestamp = _bookTimestamp;
          setBooks(updateBooks);
          // }
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
    [middleman]
  );
  */
  /*
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
                },
              })
            );
          }
        }
      }
    } catch (error) {
      // enqueueSnackbar(`"getToken error: ${error?.message}"`, {
      //   variant: "error",
      //   action,
      // });
      console.error(`etToken error`, error);
    }
  }, [location.pathname, middleman]);
  */
  /*
  const connectWS = useCallback(() => {
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
    ws.addEventListener("close", async (msg) => {
      clearInterval(interval);
      console.log(
        "Socket is closed. Reconnect will be attempted in 1 second.",
        msg.reason
      );
      await getCSRFToken();
      setTimeout(function () {
        connectWS();
      }, 1000);
    });
    ws.addEventListener("message", (msg) => {
      // console.log(`message msg`, msg);
      wsUpdateHandler(msg);
    });
    // middleman.connectWS(wsUpdateHandler);
  }, [getCSRFToken, wsUpdateHandler]);
  */

  const depthBookHandler = useCallback((price, amount) => {
    setDepthbook({ price, amount });
  }, []);

  /*
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
  */
  /*
  const getTrades = useCallback(
    async (id, limit = 100) => {
      try {
        const trades = await middleman.getTrades(
          id,
          limit
          // resolution
        );
        setTrades(trades);
        // setCandles({ candles, volumes });
      } catch (error) {
        enqueueSnackbar(`"getTrades error: ${error?.message}"`, {
          variant: "error",
          action,
        });
      }
    },
    [action, enqueueSnackbar, middleman]
  );
  */

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

  /*
  const findTicker = useCallback(
    async (id) => {
      const ticker = middleman.findTicker(id);
      return ticker;
    },
    [middleman]
  );
  */

  // TODO when orderBook is complete this function will be remove
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
  /*
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
*/
  const selectMarket = useCallback(
    async (market) => {
      // console.log(`selectedTicker`, selectedTicker, !selectedTicker);
      // console.log(`ticker`, ticker, ticker.market !== selectedTicker?.market);
      if (!selectedTicker || market !== selectedTicker?.market) {
        history.push({
          pathname: `/markets/${market}`,
        });
        await middleman.selectMarket(market);
        /*
        connection_resolvers.push(
          JSON.stringify({
            op: "switchMarket",
            args: {
              market,
            },
          })
        );
        getBooks(market);
        getTrades(market);
        let ticker = tickers.find((t) => t.market === market);
        if (!ticker) ticker = await getTicker(market);
        middleman.updateSelectedTicker(ticker);
        setSelectedTicker(ticker);
        console.log(`ticker`, ticker);
        document.title = `${ticker?.last} ${ticker?.name}`;
        if (isLogin) {
          getOrderList();
          getOrderHistory();
        }
*/
        // middleman.sendMsg(
        //   "switchMarket",
        //   {
        //     market: ticker.market,
        //     resolution: resolution,
        //   },
        //   false
        // );
      }
      // console.log(`****^^^^**** selectTickerHandler [END] ****^^^^****`);
    },
    [selectedTicker, history, middleman]
  );
  /*
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
   */
  /*
  const getAccounts = useCallback(async () => {
    await middleman.getAccounts();
    // console.log(`getAccounts accounts`, middleman.accounts)
    setAccounts(middleman.accounts);
    if (middleman.isLogin) {
      await getCSRFToken();
      await getOrderList();
      await getOrderHistory();
    }
  }, [getCSRFToken, getOrderHistory, getOrderList, middleman]);
  */
  const getExAccounts = useCallback(
    async (exchange) => {
      let exAccounts = {};
      try {
        exAccounts = await middleman.getExAccounts(exchange);
      } catch (error) {
        console.log(error);
      }
      return exAccounts;
    },
    [middleman]
  );

  const getUsersAccounts = useCallback(async () => {
    let usersAccounts = {};
    try {
      usersAccounts = await middleman.getUsersAccounts();
    } catch (error) {
      console.log(error);
    }
    return usersAccounts;
  }, [middleman]);

  // TODO get latest snapshot of orders, trades, accounts
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

  // TODO get latest snapshot of orders, trades, accounts
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

  // TODO get latest snapshot of orders, trades, accounts
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
    [action, enqueueSnackbar, middleman, selectedTicker]
  );

  const activePageHandler = (page) => {
    setActivePage(page);
  };

  // ++ TODO1: verify function works properly
  const sync = useCallback(() => {
    let accountInterval = 300,
      accountTs = 0,
      depthInterval = 100,
      depthTs = 0,
      orderInterval = 300,
      orderTs = 0,
      tradeInterval = 300,
      tradeTs = 0,
      tickerInterval = 100,
      tickerTs = 0,
      tickersInterval = 1000,
      tickersTs = 0;

    const time = Date.now();
    const _sync = () => {
      if (time - accountTs > accountInterval) {
        setAccounts(middleman.getAccounts());
      }
      if (time - tickerTs > tickerInterval) {
        setSelectedTicker(middleman.getTicker());
      }
      if (time - depthTs > depthInterval) {
        setBooks(middleman.getBooks());
      }
      if (time - tradeTs > tradeInterval) {
        setTrades(middleman.getTrades());
      }
      if (time - tickersTs > tickersInterval) {
        // TODO getSnapshot is not finished
        setTickers(middleman.getTickers());
      }
      // TODO orderBook is not completed
      // if (time - orderTs > orderInterval) {
      //   setOrderHistories(middleman.getOrderHistory());
      // }
    };
    interval = setInterval(() => {
      _sync();
    }, 100);
  }, [middleman]);

  const start = useCallback(async () => {
    if (location.pathname.includes("/markets")) {
      const market = location.pathname.includes("/markets/")
        ? location.pathname.replace("/markets/", "")
        : null;
      // ++ TODO: verify function works properly
      await middleman.start(market);
      // TODO: need OP
      setIsLogin(middleman.isLogin);
      sync();
      /**
      connectWS();
      const market = location.pathname.includes("/markets/")
        ? location.pathname.replace("/markets/", "")
        : null;
      // const ticker = await getTicker(market);
      selectTickerHandler(market);
      getTickers();
      getAccounts();
      console.log(`******** start [END] ********`);
      */
    }
  }, [location.pathname, middleman, sync]);

  useEffect(() => {
    start();
    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <StoreContext.Provider
      value={{
        isLogin,
        tickers,
        books,
        trades,
        pendingOrders,
        closeOrders,
        orderHistories,
        accounts,
        selectedTicker,
        activePage,
        depthBook,
        languageKey,
        depthBookHandler,
        setLanguageKey,
        selectMarket,
        // getTickers,
        // getBooks,
        // getTrades,
        getOrderList,
        getOrderHistory,
        // getAccounts,
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
