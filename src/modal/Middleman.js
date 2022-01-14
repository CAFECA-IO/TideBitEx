import SafeMath from "../utils/SafeMath";
import Communicator from "./Communicator";

class Middleman {
  constructor() {
    this.communicator = new Communicator();
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
        change: SafeMath.div(
          SafeMath.minus(ticker.last, ticker.open24h),
          ticker.open24h
        ),
      }));
      return tickers;
    } catch (error) {
      throw error;
    }
  }

  async getBooks(instId, sz) {
    try {
      const rawBooks = await this.communicator.books(instId, sz);
      let totalAsks = "0",
        totalBids = "0";
      const asks = rawBooks[0].asks
        .sort((a, b) => +a[0] - +b[0])
        .map((d) => {
          totalAsks = SafeMath.plus(SafeMath.plus(d[2], d[3]), totalAsks);
          return {
            price: d[0],
            amount: SafeMath.plus(d[2], d[3]),
            total: totalAsks,
          };
        })
        .sort((a, b) => +b.price - +a.price);
      const bids = rawBooks[0].bids
        .sort((a, b) => +b[0] - +a[0])
        .map((d) => {
          totalBids = SafeMath.plus(SafeMath.plus(d[2], d[3]), totalBids);
          return {
            price: d[0],
            amount: SafeMath.plus(d[2], d[3]),
            total: totalBids,
          };
        });
      const books = {
        asks,
        bids,
        ts: rawBooks[0].ts,
      };
      console.log(`rawBooks`, rawBooks);
      console.log(`books`, books);
      return books;
    } catch (error) {
      throw error;
    }
  }

  async getTrades(instId, limit) {
    return await this.communicator.trades(instId, limit);
  }

  async getCandles(instId, bar, after, before, limit) {
    return await this.communicator.candles(instId, bar, after, before, limit);
  }

  async getPendingOrders(options) {
    return await this.communicator.ordersPending(options);
  }

  async getBalance(ccy) {
    return await this.communicator.balance(ccy);
  }

  async postOrder(order) {
    return await this.communicator.order(order);
  }
}

export default Middleman;
