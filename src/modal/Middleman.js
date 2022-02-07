import SafeMath from "../utils/SafeMath";
import Communicator from "./Communicator";

class Middleman {
  constructor() {
    this.communicator = new Communicator();
  }
  updateSelectedTicker(ticker) {
    this.selectedTicker = ticker;
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
      if (pair.instId === this.selectedTicker?.instId) updateTicker = ticker;
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

  handleBooks(books) {
    let totalAsks = "0",
      totalBids = "0",
      asks = [],
      bids = [],
      askPx,
      bidPx;
    books.asks
      ?.sort((a, b) => +a[0] - +b[0])
      ?.forEach((d) => {
        totalAsks = SafeMath.plus(SafeMath.plus(d[2], d[3]), totalAsks);
        let ask = {
          price: d[0],
          amount: SafeMath.plus(d[2], d[3]),
          total: totalAsks,
          update: !!d["update"],
        };
        if (d[0] === askPx) {
          asks[asks.length - 1] = ask;
        } else {
          askPx = d[0];
          asks.push(ask);
        }
      });
    asks = asks.sort((a, b) => +b.price - +a.price);
    books.bids
      ?.sort((a, b) => +b[0] - +a[0])
      ?.forEach((d) => {
        totalBids = SafeMath.plus(SafeMath.plus(d[2], d[3]), totalBids);
        let bid = {
          price: d[0],
          amount: SafeMath.plus(d[2], d[3]),
          total: totalBids,
        };
        if (d[0] === bidPx) {
          bids[bids.length - 1] = bid;
        } else {
          bidPx = d[0];
          bids.push(bid);
        }
      });
    const updateBooks = {
      ...books,
      asks,
      bids,
    };
    return updateBooks;
  }

  updateBooks(orders) {
    // console.log(`updateBooks orders`, orders);
    const updateRawBooks = {
      ...this.rawBooks,
      asks: this.rawBooks?.asks
        ? this.rawBooks.asks.map((ask) => ({ ...ask, update: false }))
        : [],
      bids: this.rawBooks?.bids
        ? this.rawBooks.bids.map((bid) => ({ ...bid, update: false }))
        : [],
    };
    orders.forEach((order) => {
      order.asks.forEach((ask) => {
        let index;
        index = (this.rawBooks?.asks || []).findIndex((d) => d[0] === ask[0]);
        // console.log(`updateBooks index`, index);
        // console.log(
        // `updateBooks order.asks SafeMath.gt(SafeMath.plus(ask[2], ask[3]), "0")`,
        //   SafeMath.gt(SafeMath.plus(ask[2], ask[3]), "0")
        // );
        if (SafeMath.gt(SafeMath.plus(ask[2], ask[3]), "0")) {
          if (index === -1) updateRawBooks.asks.push(ask);
          else updateRawBooks.asks[index] = ask;
        } else {
          updateRawBooks.asks.splice(index, 1);
        }
      });
      order.bids.forEach((bid) => {
        let index;
        index = (this.rawBooks?.bids || []).findIndex((d) => d[0] === bid[0]);
        if (SafeMath.gt(SafeMath.plus(bid[2], bid[3]), "0")) {
          if (index === -1) updateRawBooks.bids.push(bid);
          else updateRawBooks.bids[index] = bid;
        } else {
          updateRawBooks.bids.splice(index, 1);
        }
      });
      this.rawBooks = updateRawBooks;
    });
    this.books = this.handleBooks(this.rawBooks);
    return this.books;
  }

  async getBooks(instId, sz) {
    try {
      const rawBooks = await this.communicator.books(instId, sz);
      this.rawBooks = rawBooks[0];
      // console.log(`getBooks this.rawBooks`, this.rawBooks);
      this.books = this.handleBooks(this.rawBooks);
      // console.log(`getBooks this.books`, this.books);
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
    console.log(`updateCandles data`, data);
    console.log(`updateCandles this.rawCandles`, this.rawCandles[0][0]-this.rawCandles[0][1],this.rawCandles);

    const priceData = this.handleCandles(
      data
        .filter(
          (d) =>
            d.instId === this.selectedTicker.instId &&
            d.candle[0] > this.rawCandles[0][0]
        )
        .map((d) => d.candle)
        .concat(this.rawCandles)
    );
    return priceData;
  }

  async getCandles(instId, bar, after, before, limit) {
    let priceData;
    try {
      const result = await this.communicator.candles(
        instId,
        bar,
        after,
        before,
        limit
      );
      this.rawCandles = result;
      priceData = this.handleCandles(result);
      return priceData;
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
    return await this.communicator.balance(ccy);
  }

  async postOrder(order) {
    return await this.communicator.order(order);
  }
}

export default Middleman;
