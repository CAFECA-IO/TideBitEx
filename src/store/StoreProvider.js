import React, { useCallback, useMemo, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { useSnackbar } from "notistack";
import Middleman from "../modal/Middleman";
import StoreContext from "./store-context";
import SafeMath from "../utils/SafeMath";

let interval,
  accountInterval = 500,
  accountTs = 0,
  depthInterval = 3000,
  depthTs = 0,
  orderInterval = 500,
  orderTs = 0,
  tradeInterval = 500,
  tradeTs = 0,
  tickerInterval = 300,
  tickerTs = 0,
  tickersInterval = 1000,
  tickersTs = 0;

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
  // const [orderHistories, setOrderHistories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [activePage, setActivePage] = useState("market");
  const [depthBook, setDepthbook] = useState(null);
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

  const selectMarket = useCallback(
    async (market) => {
      // console.log(`selectedTicker`, selectedTicker, !selectedTicker);
      // console.log(`ticker`, ticker, ticker.market !== selectedTicker?.market);
      if (!selectedTicker || market !== selectedTicker?.market) {
        history.push({
          pathname: `/markets/${market}`,
        });
        await middleman.selectMarket(market);
        setSelectedTicker(middleman.getTicker());
      }
      // console.log(`****^^^^**** selectTickerHandler [END] ****^^^^****`);
    },
    [selectedTicker, history, middleman]
  );

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
  );

  // TODO get latest snapshot of orders, trades, accounts
  const cancelOrders = useCallback(
    async (instId, type) => {
      const _options = {
        type,
        instId,
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
        console.error(`cancelOrders error`, error);
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
    [action, enqueueSnackbar, middleman]
  );

  const activePageHandler = (page) => {
    setActivePage(page);
  };

  const depthBookHandler = useCallback((price, amount) => {
    setDepthbook({ price, amount });
  }, []);

  // ++ TODO1: verify function works properly
  const sync = useCallback(() => {
    // console.log(`sync`);
    const time = Date.now();

    if (time - accountTs > accountInterval) {
      const accounts = middleman.getAccounts();
      // console.log(`middleman.accounts`, accounts);
      setAccounts(accounts);
    }
    if (time - tickerTs > tickerInterval) {
      setSelectedTicker(middleman.getTicker());
    }
    if (time - depthTs > depthInterval) {
      // console.log(`middleman.getBooks()`, middleman.getBooks());
      setBooks(middleman.getBooks());
    }
    if (time - tradeTs > tradeInterval) {
      // console.log(`middleman.getTrades()`, middleman.getTrades());
      setTrades(middleman.getTrades());
    }
    if (time - tickersTs > tickersInterval) {
      setTickers(middleman.getTickers());
    }
    // TODO orderBook is not completed
    if (time - orderTs > orderInterval) {
      // console.log(`middleman.getMyOrders()`, middleman.getMyOrders());
      const orders = middleman.getMyOrders();
      setPendingOrders(orders.pendingOrders);
      setCloseOrders(orders.closedOrders);
    }
  }, [middleman]);

  const start = useCallback(async () => {
    console.log(`STORE location.pathname start`, location.pathname);
    let market;
    if (location.pathname.includes("/markets")) {
      market = location.pathname.includes("/markets/")
        ? location.pathname.replace("/markets/", "")
        : "ethhkd";
    } else {
      // add default market: ethhkd
      market = "ethhkd";
    }
    history.push({
      pathname: `/markets/${market}`,
    });
    await middleman.start(market);
    setSelectedTicker(middleman.getTicker());
    setIsLogin(middleman.isLogin);
    // ++ TODO: verify function works properly
    sync();
    interval = setInterval(sync, 100);
    // console.log(`interval`, interval);
  }, [history, location.pathname, middleman, sync]);

  const stop = useCallback(() => {
    console.log(`stop`);
    clearInterval(interval);
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
        accounts,
        selectedTicker,
        activePage,
        depthBook,
        languageKey,
        start,
        stop,
        depthBookHandler,
        setLanguageKey,
        selectMarket,
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
