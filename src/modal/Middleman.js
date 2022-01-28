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
    let updateTicker,
      updateIndexes = {},
      updateTickers = { ...this.tickers };
    updatePairs.forEach((pair) => {
      const ticker = {
        ...pair,
        baseCcy: pair.instId.split("-")[0],
        quoteCcy: pair.instId.split("-")[1],
        pair: pair.instId.replace("-", "/"),
        changePct: SafeMath.mult(pair.changePct, "100"),
      };
      if (pair.instId === this.selectedTicker?.instId) updateTicker = ticker;
      const index = updateTickers[ticker.quoteCcy.toLowerCase()].findIndex(
        (ticker) => ticker.instId === pair.instId
      );
      if (!updateIndexes[ticker.quoteCcy.toLowerCase()])
        updateIndexes[ticker.quoteCcy.toLowerCase()] = [];
      if (!updateTickers[ticker.quoteCcy.toLowerCase()])
        updateTickers[ticker.quoteCcy.toLowerCase()] = [];
      if (index === -1) {
        updateTickers[ticker.quoteCcy.toLowerCase()].push(ticker);
        updateIndexes[ticker.quoteCcy.toLowerCase()].push(
          updateTickers[ticker.quoteCcy.toLowerCase()].length - 1
        );
      } else {
        updateTickers[ticker.quoteCcy.toLowerCase()][index] = ticker;
        updateIndexes[ticker.quoteCcy.toLowerCase()].push(index);
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
    this.tickers = {
      btc: [],
      eth: [],
      usdt: [],
    };
    try {
      const rawTickers = await this.communicator.tickers(instType, from, limit);
      rawTickers.forEach((rawTicker) => {
        const ticker = {
          ...rawTicker,
          baseCcy: rawTicker.instId.split("-")[0],
          quoteCcy: rawTicker.instId.split("-")[1],
          pair: rawTicker.instId.replace("-", "/"),
          // pair: rawTicker.instId
          //   .split("-")
          //   .reduce((acc, curr, i) => (i === 0 ? `${curr}` : `${acc}/${curr}`), ""),
          change: SafeMath.minus(rawTicker.last, rawTicker.open24h),
          changePct: SafeMath.mult(
            SafeMath.div(
              SafeMath.minus(rawTicker.last, rawTicker.open24h),
              rawTicker.open24h
            ),
            "100"
          ),
        };
        if (!this.tickers[ticker.quoteCcy.toLowerCase()])
          this.tickers[ticker.quoteCcy.toLowerCase()] = [];
        this.tickers[ticker.quoteCcy.toLowerCase()].push(ticker);
      });
      return this.tickers;
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
    const updateRawBooks = {
      ...this.rawBooks,
      asks: this.rawBooks?.asks ? [...this.rawBooks.asks] : [],
      bids: this.rawBooks?.bids ? this.rawBooks.bids : [],
    };
    console.log(`updateBooks`, orders);
    orders.forEach((order) => {
      order.asks.forEach((ask) => {
        let index;
        index = (this.rawBooks?.asks || []).findIndex((d) => d[0] === ask[0]);
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
    const id = setTimeout(() => {
      this.books.asks.forEach((ask) => (ask.update = false));
      this.books.bids.forEach((bid) => (bid.update = false));
      clearTimeout(id);
    }, 100);
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
    console.log(`updateTrades`, updateData);
    const _updateTrades = updateData
      .map((trade) => ({
        ...trade,
        update: true,
      }))
      .concat(this.trades || []);
    // .sort((a, b) => +b.ts - +a.ts);
    const id = setTimeout(() => {
      _updateTrades.forEach((trade) => (trade.update = false));
      clearTimeout(id);
    }, 100);
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
