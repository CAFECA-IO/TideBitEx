const BookBase = require("../BookBase");
const SafeMath = require("../SafeMath");

class OrderBook extends BookBase {
  constructor({ logger, markets }) {
    super({ logger, markets });
    this._config = { remove: true, add: true, update: false };
    this.name = `OrderBook`;
    return this;
  }

  /**
   * @typedef {Object} Order
   * @property {string} id = price
   * @property {string} price
   * @property {string} amount
   * @property {string} side 'asks' || 'bids'

   * @param {Order} valueA
   * @param {Order} valueB
   */
  _compareFunction(valueA, valueB) {
    return (
      SafeMath.eq(valueA.price, valueB.price) &&
      SafeMath.eq(valueA.amount, valueB.amount) &&
      valueA.side === valueB.side
    );
  }

  /**
   * @param {Array<Order>} arrayA
   * @param {Array<Order>} arrayB
   * @param {Function} compareFunction
   * @returns
   */
  _calculateDifference(arrayA, arrayB) {
    return super._calculateDiffence(arrayA, arrayB, this.compareFunction);
  }

  // ++ TODO: verify function works properly
  getSnapshot(instId) {
    const orderBooks = {
      market: instId.replace("-", "").toLowerCase(),
      asks: [],
      bids: [],
    };
    this._snapshot[instId].forEach((data) => {
      if (data.side === "asks") {
        orderBooks.asks.push([data.price, data.amount]);
      }
      if (data.side === "bids") {
        orderBooks.bids.push([data.price, data.amount]);
      }
    });
    // this.logger.log(
    //   `[${this.constructor.name}] getSnapshot[${instId}]`,
    //   orderBooks
    // );
    return orderBooks;
  }

  getDifference(instId) {
    return super.getDifference(instId);
  }

  /**
   * @typedef {Object} Book
   * @property {string} market
   * @property {Array} asks
   * @property {Array} bids
   *
   * @param {Book} bookObj
   * @returns {Array<Order>}
   */
  // ++ TODO: verify function works properly
  _formateBooks(bookObj) {
    const bookArr = [];
    bookObj.asks.forEach((ask) => {
      bookArr.push({
        id: ask[0],
        price: ask[0],
        amount: ask[1],
        side: "asks",
      });
    });
    bookObj.bids.forEach((bid) => {
      bookArr.push({
        id: bid[0],
        price: bid[0],
        amount: bid[1],
        side: "bids",
      });
    });
    return bookArr;
  }

  // ++ TODO: verify function works properly
  _trim(data) {
    let asks = [];
    let bids = [];
    data.forEach((d) => {
      if (d.side === "asks") {
        asks.push(d);
      } else if (d.side === "bids") {
        bids.push(d);
      }
    });
    asks = asks.sort((a, b) => +a.price - +b.price).slice(0, 100);
    bids = bids.sort((a, b) => +b.price - +a.price).slice(0, 100);
    return bids.concat(asks);
  }

  /**
   * @typedef {Object} Difference
   * @property {Arrary<Order>} updates
   * @property {Arrary<Order>} add
   * @property {Arrary<Order>} remove
   *
   * @param {String} instId BTC-USDT
   * @param {Difference} difference
   */
  //  updateByDifference(instId, difference) {
  //   try {
  //     super.updateByDifference(instId, difference);
  //     this._snapshot[instId] = this._trim(this._snapshot[instId]);
  //     return true;
  //   } catch (error) {
  //     return false;
  //   }
  // }

  /**
   * @param {String} instId BTC-USDT
   * @param {Array<Order>} data
   */
  updateAll(instId, data) {
    return super.updateAll(instId, this._formateBooks(data));
  }
}

module.exports = OrderBook;
