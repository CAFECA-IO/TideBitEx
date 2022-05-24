import AccountBook from "../libs/books/AccountBook";
import DepthBook from "../libs/books/DepthBook";
import OrderBook from "../libs/books/OrderBook";
import TickerBook from "../libs/books/TickerBook";
import TradeBook from "../libs/books/TradeBook";
import SafeMath from "../utils/SafeMath";
import Communicator from "./Communicator";
import WebSocket from "./WebSocket";

class Middleman {
  login = false;
  constructor() {
    this.name = "Middleman";
    this.accountBook = new AccountBook();
    this.depthBook = new DepthBook();
    this.orderBook = new OrderBook();
    this.tickerBook = new TickerBook();
    this.tradeBook = new TradeBook();
    this.websocket = new WebSocket({
      accountBook: this.accountBook,
      depthBook: this.depthBook,
      orderBook: this.orderBook,
      tickerBook: this.tickerBook,
      tradeBook: this.tradeBook,
    });
    this.communicator = new Communicator();
    // -- TEST
    window.middleman = this;
    // -- TEST
    return this;
  }

  async getInstruments(instType) {
    try {
      const instruments = await this.communicator.instruments(instType);
      this.instruments = instruments;
      return instruments;
    } catch (error) {
      // this.instruments = [];
      throw error;
    }
  }

  handleBooks(rawBooks) {
    let totalAsks = "0",
      totalBids = "0",
      asks = [],
      bids = [],
      askPx,
      bidPx;
    // asks is increase
    let _asks = rawBooks.asks.splice(0, 100);
    let _bids = rawBooks.bids.splice(0, 100);
    _asks?.forEach((d, i) => {
      totalAsks = SafeMath.plus(d[1], totalAsks);
      let ask = {
        price: d[0],
        amount: d[1],
        total: totalAsks,
        update: !!d[2],
      };
      if (d[0] === askPx) {
        asks[asks.length - 1] = ask;
      } else {
        askPx = d[0];
        asks.push(ask);
      }
      if (_asks[i][2]) _asks[i].splice(2, 1);
    });
    // bids is decrease
    _bids?.forEach((d, i) => {
      totalBids = SafeMath.plus(d[1], totalBids);
      let bid = {
        price: d[0],
        amount: d[1],
        total: totalBids,
        update: !!d[2],
      };
      if (d[0] === bidPx) {
        bids[bids.length - 1] = bid;
      } else {
        bidPx = d[0];
        bids.push(bid);
      }
      if (_bids[i][2]) _bids[i].splice(2, 1);
    });
    const updateBooks = {
      asks,
      bids,
      ts: Date.now(),
      total: SafeMath.plus(totalAsks, totalBids),
    };
    return updateBooks;
  }

  updateOrders(data) {
    // console.log(`*&&&&&&&&&&&*Events.order*&&&&&&&&&&&**`);
    // console.log(`data`, data);
    // console.log(`this.selectedTicker.market`, this.selectedTicker.market);
    const updatePendingOrders =
      this.pendingOrders?.map((order) => ({
        ...order,
      })) || [];
    const updateCloseOrders =
      this.closeOrders?.map((order) => ({ ...order })) || [];
    if (data.market === this.selectedTicker.market) {
      const index = updatePendingOrders.findIndex(
        (order) => order.id === data.id
      );
      if (index !== -1) {
        if (data.state !== "wait") {
          updatePendingOrders.splice(index, 1);
          updateCloseOrders.push({
            ...data,
            at: SafeMath.div(Date.now(), "1000"),
          });
          // console.log(`updateCloseOrders.push`, { ...data, at: SafeMath.div(Date.now(), "1000") });
        } else {
          const updateOrder = updatePendingOrders[index];
          updatePendingOrders[index] = {
            ...updateOrder,
            ...data,
          };
          // console.log(` updatePendingOrders[${index}]`, {
          // ...updateOrder,
          // ...data,
          // });
        }
      } else {
        if (data.state === "wait")
          updatePendingOrders.push({
            ...data,
            at: SafeMath.div(Date.now(), "1000"),
          });
        else
          updateCloseOrders.push({
            ...data,
            at: SafeMath.div(Date.now(), "1000"),
          });
        // console.log(` updatePendingOrders[${index}]`, {
        //   ...data,
        // });
      }
      this.pendingOrders = updatePendingOrders;
      this.closeOrders = updateCloseOrders;
    }
    // console.log(`*&&&&&&&&&&&*Events.order*&&&&&&&&&&&**`);
    return {
      updatePendingOrders: updatePendingOrders.sort((a, b) => b.at - a.at),
      updateCloseOrders: updateCloseOrders.sort((a, b) => +b.at - +a.at),
    };
  }

  async postOrder(order) {
    if (this.isLogin) return await this.communicator.order(order);
  }
  async cancelOrder(order) {
    if (this.isLogin) {
      const result = await this.communicator.cancel(order);
      if (result.success) {
        this.orderBook.updateByDifference(
          this.tickerBook.getCurrentTicker()?.market,
          { ...order, state: "cancel", state_text: "Canceled" }
        );
      }
    }
  }

  async cancelOrders(options) {
    if (this.isLogin) {
      return await this.communicator.cancelOrders(options);
    }
  }

  async getExAccounts(exchange) {
    return await this.communicator.getExAccounts(exchange);
  }

  async getUsersAccounts(exchange) {
    return await this.communicator.getUsersAccounts(exchange);
  }

  getMyOrders(market) {
    if (!market) market = this.tickerBook.getCurrentTicker()?.market;
    return this.orderBook.getSnapshot(market);
  }

  async _getOrderList(market, options = {}) {
    try {
      const orders = await this.communicator.getOrderList({
        ...options,
        market,
      });
      this.orderBook.updateByDifference(market, { add: orders });
    } catch (error) {
      console.error(`_getOrderList error`, error);
      // throw error;
    }
  }

  async _getOrderHistory(market, options = {}) {
    try {
      const orders = await this.communicator.getOrderHistory({
        ...options,
        market,
      });
      this.orderBook.updateByDifference(market, { add: orders });
    } catch (error) {
      console.error(`_getOrderHistory error`, error);
      // throw error;
    }
  }

  getTickers() {
    return Object.values(this.tickerBook.getSnapshot());
  }

  async _getTickers(instType = "SPOT", from, limit) {
    let instruments,
      rawTickers,
      tickers = {};
    try {
      instruments = await this.communicator.instruments(instType);
    } catch (error) {
      console.error(`get instruments error`, error);
      // throw error;
    }
    try {
      rawTickers = await this.communicator.tickers(instType, from, limit);
      Object.values(rawTickers).forEach((t) => {
        let instrument = instruments.find((i) => i.instId === t.instId);
        const ticker = { ...t, minSz: instrument?.minSz || "0.001" };
        tickers[ticker.instId] = ticker;
      });
      this.tickerBook.updateAll(tickers);
    } catch (error) {
      console.error(`get tickers error`, error);
      throw error;
    }
    return this.tickers;
  }

  getTrades(market) {
    if (!market) market = this.tickerBook.getCurrentTicker()?.market;
    return this.tradeBook.getSnapshot(market);
  }

  async _getTrades(id, limit) {
    try {
      const trades = await this.communicator.trades(id, limit);
      this.tradeBook.updateAll(id, trades);
    } catch (error) {
      console.error(`_getTrades error`, error);
      // throw error;
    }
  }

  getBooks(market) {
    if (!market) market = this.tickerBook.getCurrentTicker()?.market;
    // console.log(`getBooks current market`, market)
    return this.depthBook.getSnapshot(market);
  }

  async _getBooks(id, sz) {
    try {
      const depthBook = await this.communicator.books(id, sz);
      this.depthBook.updateAll(id, depthBook);
    } catch (error) {
      console.error(`_getBooks error`, error);
      // throw error;
    }
  }

  getTicker() {
    return this.tickerBook.getCurrentTicker();
  }

  async _getTicker(market) {
    try {
      const ticker = await this.communicator.ticker(market);
      this.tickerBook.updateByDifference(market, ticker[market]);
    } catch (error) {
      console.error(`_getTicker error`, error);
    }
  }

  async _getAccounts() {
    try {
      const accounts = await this.communicator
        .getAccounts
        // this.selectedTicker?.instId?.replace("-", ",")
        ();
      console.info(`_getAccounts accounts`, accounts);
      if (accounts) {
        this.isLogin = true;
        this.accountBook.updateAll(accounts);
        const token = await this.communicator.CSRFTokenRenew();
        this.websocket.setCurrentUser(token);
      }
    } catch (error) {
      this.isLogin = false;
      console.error(`_getAccounts error`, error);
    }
  }

  getAccounts(instId) {
    return this.accountBook.getSnapshot(instId);
  }

  async selectMarket(market) {
    this.websocket.setCurrentMarket(market);
    this.tickerBook.setCurrentMarket(market);
    if (!this.tickerBook.getCurrentTicker()) await this._getTicker(market);
    await this._getBooks(market);
    await this._getTrades(market);
    // if (this.isLogin) {
    // TODO to verify if user is not login would be a problem
    await this._getOrderList(market);
    await this._getOrderHistory(market);
    // }
  }

  async start(market) {
    // TODO to verify websocket connection is working and can receive update message
    this.websocket.connect();
    await this.selectMarket(market);
    await this._getAccounts();
    await this._getTickers();
  }

  stop() {
    // TODO stop ws
  }
}

export default Middleman;
