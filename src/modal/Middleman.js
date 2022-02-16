import SafeMath from "../utils/SafeMath";
import Communicator from "./Communicator";

class Middleman {
  constructor() {
    this.communicator = new Communicator();
    this.tickers = [];
  }
  updateTicker(ticker) {
    let _ticker;
    const instrument = this.instruments.find((i) => i.instId === ticker.instId);
    _ticker = { ...ticker, minSz: instrument?.minSz || "0.001" }; // -- TEST for ETH-USDT
    const quoteBalance = this.balances.find(
      (detail) => detail.ccy === ticker.quoteCcy
    );
    if (quoteBalance) _ticker.quoteCcyAvailable = quoteBalance.availBal;
    else _ticker.quoteCcyAvailable = 0;
    const baseBalance = this.balances.find(
      (detail) => detail.ccy === ticker.baseCcy
    );
    if (baseBalance) _ticker.baseCcyAvailable = baseBalance.availBal;
    else _ticker.baseCcyAvailable = 0;
    return _ticker;
  }

  updateSelectedTicker(ticker) {
    const _ticker = this.updateTicker(ticker);
    this.selectedTicker = _ticker;
    return this.selectedTicker;
  }

  updateTickers(updatePairs) {
    if (!this.tickers.length > 0) return;
    let updateTickers = [...this.tickers];
    let updateTicker;
    const updateIndexes = updatePairs.map((pair) => {
      const index = this.tickers.findIndex(
        (ticker) => ticker.instId === pair.instId
      );
      const ticker = {
        ...pair,
        baseCcy: pair.instId.split("-")[0],
        quoteCcy: pair.instId.split("-")[1],
        pair: pair.instId.replace("-", "/"),
        changePct: SafeMath.mult(pair.changePct, "100"),
      };
      if (pair.instId === this.selectedTicker?.instId)
        updateTicker = { ...ticker, available: this.selectedTicker.available };
      if (index === -1) {
        updateTickers.push(ticker);
        return updateTickers.length - 1;
      } else {
        updateTickers[index] = ticker;
        return index;
      }
    });
    this.tickers = updateTickers;
    return {
      updateTicker,
      updateTickers,
      updateIndexes,
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
      console.log(`getInstruments error`, error);
      this.instruments = [];
      // throw error;
    }
  }

  async getTickers(instType, from, limit) {
    try {
      const rawTickers = await this.communicator.tickers(instType, from, limit);
      const tickers = rawTickers.map((ticker) => ({
        ...ticker,
        baseCcy: ticker.instId.split("-")[0],
        quoteCcy: ticker.instId.split("-")[1],
        pair: ticker.instId.replace("-", "/"),
        // pair: ticker.instId
        //   .split("-")
        //   .reduce((acc, curr, i) => (i === 0 ? `${curr}` : `${acc}/${curr}`), ""),
        change: SafeMath.minus(ticker.last, ticker.open24h),
        changePct: SafeMath.mult(
          SafeMath.div(
            SafeMath.minus(ticker.last, ticker.open24h),
            ticker.open24h
          ),
          "100"
        ),
      }));
      this.tickers = tickers;
      return tickers;
    } catch (error) {
      throw error;
    }
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
        totalAsks = SafeMath.plus(SafeMath.plus(d[2], d[3]), totalAsks);
        let ask = {
          price: d[0],
          amount: SafeMath.plus(d[2], d[3]),
          total: totalAsks,
          update: !!d[4],
        };
        if (d[0] === askPx) {
          asks[asks.length - 1] = ask;
        } else {
          askPx = d[0];
          asks.push(ask);
        }
        if (this.rawBooks.asks[i][4]) this.rawBooks.asks[i].splice(4, 1);
      });
    asks = asks.sort((a, b) => +b.price - +a.price);
    this.rawBooks.bids
      ?.sort((a, b) => +b[0] - +a[0])
      ?.forEach((d, i) => {
        totalBids = SafeMath.plus(SafeMath.plus(d[2], d[3]), totalBids);
        let bid = {
          price: d[0],
          amount: SafeMath.plus(d[2], d[3]),
          total: totalBids,
          update: !!d[4],
        };
        if (d[0] === bidPx) {
          bids[bids.length - 1] = bid;
        } else {
          bidPx = d[0];
          bids.push(bid);
        }
        if (this.rawBooks.bids[i][4]) this.rawBooks.bids[i].splice(4, 1);
      });
    const updateBooks = {
      asks,
      bids,
      ts: Date.now(),
    };
    return updateBooks;
  }

  updateBooks(rawOrders) {
    const updateRawBooks = {
      asks: this.rawBooks?.asks ? this.rawBooks.asks : [],
      bids: this.rawBooks?.bids ? this.rawBooks.bids : [],
    };
    rawOrders.forEach((order) => {
      order.asks.forEach((ask) => {
        let index,
          updateAsk = ask;
        updateAsk.push(true);
        index = updateRawBooks.asks.findIndex((d) => d[0] === ask[0]);
        if (SafeMath.gt(SafeMath.plus(ask[2], ask[3]), "0")) {
          if (index === -1) updateRawBooks.asks.push(updateAsk);
          else updateRawBooks.asks[index] = updateAsk;
        } else {
          updateRawBooks.asks.splice(index, 1);
        }
      });
      order.bids.forEach((bid) => {
        let index,
          updateBid = bid;
        updateBid.push(true);
        index = updateRawBooks.bids.findIndex((d) => d[0] === bid[0]);
        if (SafeMath.gt(SafeMath.plus(bid[2], bid[3]), "0")) {
          if (index === -1) updateRawBooks.bids.push(updateBid);
          else updateRawBooks.bids[index] = updateBid;
        } else {
          updateRawBooks.bids.splice(index, 1);
        }
      });
      this.rawBooks = updateRawBooks;
    });
    this.books = this.handleBooks();
    return this.books;
  }

  async getBooks(instId, sz) {
    try {
      const rawBooks = await this.communicator.books(instId, sz);
      this.rawBooks = rawBooks[0];
      this.books = this.handleBooks();
      return this.books;
    } catch (error) {
      throw error;
    }
  }

  updateTrades = (updateData) => {
    // console.log(`updateTrades updateData`, updateData);
    const _updateTrades = updateData
      .filter(
        (data) =>
          SafeMath.gte(data.ts, this.trades[0].ts) &&
          data.tradeId !== this.trades[0].tradeId
      )
      .map((data) => ({
        ...data,
        update: true,
      }))
      .concat(this.trades.map((trade) => ({ ...trade, update: false })) || []);
    this.trades = _updateTrades;
    return _updateTrades;
  };

  async getTrades(instId, limit) {
    try {
      const trades = await this.communicator.trades(instId, limit);
      this.trades = trades.sort((a, b) => SafeMath.gt(a.ts, b.ts));
      return trades;
    } catch (error) {
      throw error;
    }
  }

  handleCandles(data) {
    let candles = [],
      volumes = [];
    data.forEach((d) => {
      const timestamp = parseInt(d[0]);
      const date = new Date(timestamp);
      candles.push({
        x: date,
        y: d.slice(1, 5),
      });
      volumes.push({
        x: date,
        y: d[6],
        upward: SafeMath.gt(d[4], d[1]),
      });
    });
    return {
      candles,
      volumes,
    };
  }

  updateCandles(data) {
    let candles = [],
      volumes = [];
    const updateCandles = [...this.candles];
    data.forEach((d) => {
      let i = updateCandles.findIndex((candle) => d.candle[0] === candle[0]);
      if (i === -1) {
        if (SafeMath.gt(d.candle[0], updateCandles[0][0])) {
          updateCandles.unshift(d.candle);
          // console.log(`updateCandles unshift updateCandles`, updateCandles);
        } else if (
          SafeMath.lt(d.candle[0], updateCandles[updateCandles.length - 1][0])
        ) {
          updateCandles.push(d.candle);
          // console.log(`updateCandles push updateCandles`, updateCandles);
        }
      } else {
        // console.log(`updateCandles index: ${i} updateCandles`, updateCandles);
        updateCandles[i] = d.candle;
      }
    });
    this.candles = updateCandles;
    this.candles.forEach((candle) => {
      candles.push(candle.slice(0, 5));
      volumes.push([candle[0], candle[5]]);
    });
    console.log(`candleOnUpdate`, { candles, volumes });
    return { candles, volumes };
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
      console.log(`getCandles`, { candles, volumes });
      return { candles, volumes };
    } catch (error) {
      console.log(`getCandles error`, error);
      throw error;
    }
  }

  async getPendingOrders(options) {
    return await this.communicator.ordersPending(options);
  }

  async getCloseOrders(options) {
    return await this.communicator.closeOrders(options);
  }

  async getBalances(ccy) {
    try {
      const result = await this.communicator.balance(ccy);
      this.balances = result[0].details;
      console.log(`getBalances`, this.balances);
      return this.balances;
    } catch (error) {}
    return;
  }

  async postOrder(order) {
    return await this.communicator.order(order);
  }
}

export default Middleman;
