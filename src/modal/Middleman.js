import SafeMath from "../utils/SafeMath";
import Communicator from "./Communicator";

class Middleman {
  constructor() {
    this.communicator = new Communicator();
  }
  async getTickers() {
    return await this.communicator.tickers();
  }

  async getBooks(instId) {
    try {
      const rawBooks = await this.communicator.books(instId);
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
        .sort((a, b) => +a[0] - +b[0])
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
  async getTrades(instId) {
    return await this.communicator.trades(instId);
  }
}

export default Middleman;
