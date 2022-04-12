import SafeMath from "../utils/SafeMath";
import Communicator from "./Communicator";

class Middleman {
  constructor() {
    this.communicator = new Communicator();
    this.tickers = [];
  }

  async registerPrivateChannel(token, instId, resolution) {
    try {
      await this.communicator.registerPrivateChannel(token, instId, resolution);
    } catch (error) {
      console.error(`registerPrivateChannel error`, error);
      throw error;
    }
  }

  async unregiterAll() {
    try {
      await this.communicator.unregiterAll();
    } catch (error) {
      console.error(`unregiterAll error`, error);
      throw error;
    }
  }

  async updateSelectedTicker(id, resolution) {
    console.log(`updateSelectedTicker id`, id);
    try {
      await this.communicator.registerMarketChannel(id, resolution);
    } catch (error) {
      console.error(`registerMarketChannel error`, error);
      // throw error;
    }
    this.selectedTicker = this.tickers?.find((ticker) => ticker.id === id);
    if (!this.selectedTicker) {
      this.selectedTicker = await this.communicator.ticker(id);
    }
    return this.selectedTicker;
  }

  updateTickers(tickers) {
    if (!this.tickers || !this.tickers.length > 0) return;
    let updateTickers = this.tickers.map((t) => ({ ...t, update: false }));
    let updateTicker;
    tickers.forEach((t) => {
      const i = this.tickers.findIndex((ticker) => ticker.instId === t.instId);
      if (i === -1) {
        updateTickers.push({ ...t, update: true });
      } else {
        const ticker = {
          ...updateTickers[i],
          last: t.last,
          change: t.change,
          changePct: t.changePct,
          open: t.open,
          high: t.high,
          low: t.low,
          volume: t.volume,
          update: true,
        };
        if (!!this.selectedTicker && t.instId === this.selectedTicker?.instId)
          updateTicker = this.updateSelectedTicker(ticker);
        updateTickers[i] = ticker;
      }
    });
    this.tickers = updateTickers;
    return {
      updateTicker,
      updateTickers,
    };
  }

  findTicker(id) {
    let _ticker = this.tickers.find(
      (ticker) => ticker.instId.replace("-", "").toLowerCase() === id
    );
    return _ticker;
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

  async getTickers(instType, from, limit) {
    let instruments, rawTickers;
    try {
      instruments = await this.communicator.instruments(instType);
    } catch (error) {
      console.error(`get instruments error`, error);
      throw error;
    }
    try {
      rawTickers = await this.communicator.tickers(instType, from, limit);
      this.tickers = rawTickers.map((t) => {
        let instrument = instruments.find((i) => i.instId === t.instId);
        return { ...t, minSz: instrument?.minSz || "0.001" };
      });
    } catch (error) {
      console.error(`get tickers error`, error);
      throw error;
    }
    try {
      await this.communicator.registerGlobalChannel();
    } catch (error) {
      console.error(`registerGlobalChannel error`, error);
      throw error;
    }
    return this.tickers;
  }

  handleBooks() {
    let totalAsks = "0",
      totalBids = "0",
      asks = [],
      bids = [],
      askPx,
      bidPx;

    this.rawBooks.asks
      ?.sort((a, b) => +a[0] - +b[0])
      ?.forEach((d, i) => {
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
        if (this.rawBooks.asks[i][2]) this.rawBooks.asks[i].splice(2, 1);
      });
    this.rawBooks.bids
      ?.sort((a, b) => +b[0] - +a[0])
      ?.forEach((d, i) => {
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
        if (this.rawBooks.bids[i][2]) this.rawBooks.bids[i].splice(2, 1);
      });
    const updateBooks = {
      asks,
      bids,
      ts: Date.now(),
      total: SafeMath.plus(totalAsks, totalBids),
    };
    return updateBooks;
  }

  updateBooks(data) {
    console.log(`updateBooks data`, data);
    if (data.instId !== this.selectedTicker.instId) return;
    const updateRawBooks = {
      asks: this.rawBooks?.asks
        ? this.rawBooks.asks.map((ask) => [...ask])
        : [],
      bids: this.rawBooks?.bids
        ? this.rawBooks.bids.map((bid) => [...bid])
        : [],
    };
    data.asks.forEach((ask) => {
      let index,
        updateAsk = ask;
      updateAsk.push(true);
      index = updateRawBooks.asks.findIndex((d) => SafeMath.eq(d[0], ask[0]));
      if (index === -1) {
        updateRawBooks.asks.push(updateAsk);
      } else {
        if (SafeMath.gt(ask[1], "0")) {
          updateRawBooks.asks[index] = updateAsk;
        } else updateRawBooks.asks.splice(index, 1);
      }
    });
    data.bids.forEach((bid) => {
      let index,
        updateBid = bid;
      updateBid.push(true);
      index = updateRawBooks.bids.findIndex((d) => SafeMath.eq(d[0], bid[0]));
      if (index === -1) {
        updateRawBooks.bids.push(updateBid);
      } else {
        if (SafeMath.gt(bid[1], "0")) {
          updateRawBooks.bids[index] = updateBid;
        } else updateRawBooks.bids.splice(index, 1);
      }
    });
    this.rawBooks = updateRawBooks;
    this.books = this.handleBooks();
    console.log(`updateBooks updateRawBooks`, updateRawBooks);
    return this.books;
  }

  async getBooks(id, sz) {
    try {
      const rawBooks = await this.communicator.books(id, sz);
      this.rawBooks = rawBooks;
      console.log(`getBooks this.rawBooks`, this.rawBooks);
      this.books = this.handleBooks();
      return this.books;
    } catch (error) {
      throw error;
    }
  }

  updateTrades = (updateData, resolution) => {
    const _updateTrades = updateData
      .filter(
        (trade) =>
          !this.trades ||
          (trade.instId === this.selectedTicker.instId &&
            this.trades.findIndex((t) => t.id === trade.id) === -1)
      )
      .map((trade, i) => ({
        ...trade,
        side:
          i === updateData.length - 1
            ? !this.trades[0]
              ? SafeMath.gte(trade.price, this.trades[0].price)
                ? "up"
                : "down"
              : "up"
            : SafeMath.gte(trade.px, updateData[i + 1].px)
            ? "up"
            : "down",
        update: true,
      }))
      .concat(this.trades || []);
    console.log(
      `updateTrades _updateTrades[${_updateTrades.length}]`,
      _updateTrades
    );
    const { candles, volumes } = this.updateCandles(_updateTrades, resolution);
    return { trades: _updateTrades, candles, volumes };
  };

  resetTrades = () => {
    this.trades = this.trades.map((trade) => ({ ...trade, update: false }));
  };

  async getTrades(id, limit, resolution) {
    try {
      const trades = await this.communicator.trades(id, limit);
      this.trades = trades.reduce(
        (prev, curr, i) => [
          ...prev,
          i === 0
            ? { ...curr, trend: 1 }
            : {
                ...curr,
                trend: SafeMath.gte(curr.px, prev[prev.length - 1].px) ? 1 : 0,
              },
        ],
        []
      );
      const { candles, volumes } = this.updateCandles(trades, resolution);
      return { trades, candles, volumes };
    } catch (error) {
      throw error;
    }
  }

  updateCandles(trades, resolution) {
    const candlesData = this.transformTradesToCandle(trades, resolution);
    let candles = [],
      volumes = [];
    this.candles = Object.values(candlesData);
    this.candles.forEach((candle) => {
      candles.push(candle.slice(0, 5));
      volumes.push([candle[0], candle[5]]);
    });
    return { candles, volumes };
  }

  /**
   *
   * @param {Array} trades
   */
  transformTradesToCandle(trades, resolution) {
    let interval,
      data,
      defaultObj = {};
    switch (resolution) {
      case "1m":
        interval = 1 * 60 * 1000;
        break;
      case "30m":
        interval = 30 * 60 * 1000;
        break;
      case "1H":
        interval = 60 * 60 * 1000;
        break;
      case "1W":
        interval = 7 * 24 * 60 * 60 * 1000;
        break;
      case "M":
        interval = 30 * 24 * 60 * 60 * 1000;
        break;
      case "1D":
      default:
        interval = 24 * 60 * 60 * 1000;
    }
    const now = Math.floor(new Date().getTime() / interval);
    defaultObj[now] = [now * interval, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 100; i++) {
      defaultObj[now - i] = [(now - i) * interval, 0, 0, 0, 0, 0, 0];
    }
    data = trades.reduce((prev, curr) => {
      const index = Math.floor((curr.at * 1000) / interval);
      let point = prev[index];
      if (point) {
        point[2] = Math.max(point[2], +curr.price);
        point[3] = Math.min(point[3], +curr.price);
        point[4] = +curr.price;
        point[5] += +curr.volume;
        point[6] += +curr.volume * +curr.price;
      } else {
        point = [
          index * interval,
          +curr.price,
          +curr.price,
          +curr.price,
          +curr.price,
          +curr.volume,
          +curr.volume * +curr.price,
        ];
      }
      prev[index] = point;
      return prev;
    }, defaultObj);
    return Object.values(data);
  }

  async getCandles(instId, bar, after, before, limit) {
    let candles = [],
      volumes = [];
    try {
      const result = await this.communicator.candles(
        instId,
        bar,
        after,
        before,
        limit
      );
      this.candles = result;
      this.candles.forEach((candle) => {
        candles.push(candle.slice(0, 5));
        volumes.push([candle[0], candle[5]]);
      });
      return { candles, volumes };
    } catch (error) {
      throw error;
    }
  }

  updateOrders(data) {
    const updatePendingOrders =
      this.pendingOrders?.map((order) => ({
        ...order,
      })) || [];
    const updateCloseOrders =
      this.closeOrders?.map((order) => ({ ...order })) || [];
    if (data.market === this.selectedTicker.id) {
      const index = updatePendingOrders.findIndex(
        (order) => order.ordId === data.ordId
      );
      if (index !== -1) {
        if (data.state !== "waiting") {
          updatePendingOrders.splice(index, 1);
          updateCloseOrders.push({ ...data, uTime: Date.now() });
        } else {
          const updateOrder = updatePendingOrders[index];
          updatePendingOrders[index] = {
            ...updateOrder,
            sz: data.sz,
            filled: data.filled,
          };
        }
      } else {
        if (data.state === "waiting")
          updatePendingOrders.push({ ...data, cTime: Date.now() });
        else updateCloseOrders.push({ ...data, uTime: Date.now() });
      }
      this.pendingOrders = updatePendingOrders;
      this.closeOrders = updateCloseOrders;
    }
    return {
      updatePendingOrders: updatePendingOrders.sort(
        (a, b) => b.cTime - a.cTime
      ),
      updateCloseOrders: updateCloseOrders.sort((a, b) => +b.uTime - +a.uTime),
    };
  }

  async getPendingOrders(options) {
    if (this.isLogin) {
      const orders = await this.communicator.ordersPending({
        ...options,
        instId: this.selectedTicker?.instId,
      });
      // ++ WORKAROUND
      this.pendingOrders = orders.filter((order) => order.px !== "NaN");
      return this.pendingOrders;
    }
  }

  async getCloseOrders(options) {
    if (this.isLogin) {
      const orders = await this.communicator.closeOrders({
        ...options,
        instId: this.selectedTicker?.instId,
      });
      // ++ WORKAROUND
      this.closeOrders = orders.filter((order) => order.px !== "NaN");
      return this.closeOrders;
    }
  }

  updateAccounts(data) {
    const updateAccounts = this.accounts.map((account) => ({ ...account }));
    const index = updateAccounts.findIndex(
      (account) => account.ccy === data.ccy
    );
    if (index !== -1) {
      updateAccounts[index] = data;
    } else updateAccounts.push(data);

    this.accounts = updateAccounts;
    return this.accounts;
  }

  async getAccounts() {
    try {
      const result = await this.communicator.getAccountBalance(
        this.selectedTicker?.instId?.replace("-", ",")
      );
      this.accounts = result;
      if (this.accounts) this.isLogin = true;
    } catch (error) {
      this.isLogin = false;
    }
  }

  async postOrder(order) {
    if (this.isLogin) return await this.communicator.order(order);
  }
  async cancelOrder(order) {
    if (this.isLogin) {
      return await this.communicator.cancel(order);
    }
  }
}

export default Middleman;
