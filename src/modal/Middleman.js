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
        pair: pair.instId.replace("-", "/"),
        change: SafeMath.minus(pair.last, pair.open24h),
        changePct: SafeMath.mult(
          SafeMath.div(SafeMath.minus(pair.last, pair.open24h), pair.open24h),
          "100"
        ),
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
    orders.forEach((order) => {
      const asks = order.asks
        ?.map((order) => ({
          ...order,
          update: true,
        }))
        .concat(this.rawBooks?.asks || []);
      const bids = order.bids
        ?.map((order) => ({
          ...order,
          update: true,
        }))
        .concat(this.rawBooks?.bids || []);
      const updateRawBooks = {
        ...this.rawBooks,
        asks,
        bids,
      };
      this.rawBooks = updateRawBooks;
    });
    this.books = this.handleBooks(this.rawBooks);
    const id = setTimeout(() => {
      this.books.asks.forEach((ask) => (ask.update = false));
      this.books.bids.forEach((bid) => (bid.update = false));
      clearTimeout(id);
    }, 500);
    return this.books;
  }

  async getBooks(instId, sz) {
    try {
      const rawBooks = await this.communicator.books(instId, sz);
      this.rawBooks = rawBooks[0];
      console.log(`getBooks this.rawBooks`, this.rawBooks);
      this.books = this.handleBooks(this.rawBooks);
      return this.books;
    } catch (error) {
      throw error;
    }
  }

  updateTrades = (updateData) => {
    // console.log(`updateTrades`, updateData);
    const _updateTrades = updateData
      .map((trade) => ({
        instId: trade.instId,
        px: trade.price,
        sz: trade.size,
        ts: trade.timestamp,
        tradeId: trade.tradeId.toString(),
        update: true,
      }))
      .concat(this.trades || []);
    // .sort((a, b) => +b.ts - +a.ts);
    const id = setTimeout(() => {
      _updateTrades.forEach((trade) => (trade.update = false));
      clearTimeout(id);
    }, 500);
    // console.log(`updateTrades`, _updateTrades);
    this.trades = _updateTrades;
    return _updateTrades;
  };

  async getTrades(instId, limit) {
    try {
      const trades = await this.communicator.trades(instId, limit);
      this.trades = trades;
      return trades;
    } catch (error) {
      throw error;
    }
  }

  async getCandles(instId, bar, after, before, limit) {
    return await this.communicator.candles(instId, bar, after, before, limit);
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
