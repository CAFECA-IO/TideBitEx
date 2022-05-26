import { Config } from "../constant/Config";
import Events from "../constant/Events";
import AccountBook from "../libs/books/AccountBook";
import DepthBook from "../libs/books/DepthBook";
import OrderBook from "../libs/books/OrderBook";
import TickerBook from "../libs/books/TickerBook";
import TradeBook from "../libs/books/TradeBook";
import TideBitWS from "../libs/TideBitWS";
import SafeMath from "../utils/SafeMath";
import Communicator from "./Communicator";

class Middleman {
  constructor() {
    this.name = "Middleman";
    this.accountBook = new AccountBook();
    this.depthBook = new DepthBook();
    this.orderBook = new OrderBook();
    this.tickerBook = new TickerBook();
    this.tradeBook = new TradeBook();
    this.tbWebSocket = new TideBitWS();
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
      if (!!orders) this.orderBook.updateByDifference(market, { add: orders });
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
      if (!!orders) this.orderBook.updateByDifference(market, { add: orders });
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
        this.tbWebSocket.setCurrentUser(token);
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
    this.tbWebSocket.setCurrentMarket(market);
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

  _tbWSEventListener() {
    this.tbWebSocket.onmessage = (msg) => {
      let metaData = JSON.parse(msg.data);
      console.log(metaData);
      switch (metaData.type) {
        case Events.account:
          this.accountBook.updateByDifference(metaData.data);
          break;
        case Events.update:
          this.depthBook.updateAll(metaData.data.market, metaData.data);
          break;
        case Events.order:
          this.orderBook.updateByDifference(
            metaData.data.market,
            metaData.data.difference
          );
          break;
        case Events.tickers:
          this.tickerBook.updateByDifference(metaData.data);
          break;
        case Events.trades:
          this.tradeBook.updateAll(metaData.data.market, metaData.data.trades);
          break;
        case Events.trade:
          this.tradeBook.updateByDifference(
            metaData.data.market,
            metaData.data.difference
          );
          break;
        default:
      }
      this.tbWebSocket.heartbeat();
    };
  }

  async start(market) {
    // TODO to verify websocket connection is working and can receive update message
    await this.tbWebSocket.init({ url: Config[Config.status].websocket });
    this._tbWSEventListener();
    await this.selectMarket(market);
    await this._getAccounts();
    await this._getTickers();
  }

  stop() {
    // TODO stop ws
  }
}

export default Middleman;
