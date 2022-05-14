const BookBase = require("../BookBase");
const SafeMath = require("../SafeMath");

class OrderBook extends BookBase {
  constructor() {
    super();
    this._config = { remove: true, add: true };
    return this;
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

  /**
   * @typedef {Object} Order
   * @property {string} id = price time
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

  getSnapshot(instId) {
    const orderBooks = {
      market: instId.replace("-", "").toLowerCase(),
      asks: [],
      bids: [],
    };
    this._snapshot[instId].forEach((data) => {
      if (data.side === "asks") {
        orderBooks.asks.push(data);
      }
      if (data.side === "bids") {
        orderBooks.asks.push(data);
      }
    });
    return orderBooks;
  }

  getDifference(instId) {
    return super.getDifference(instId);
  }

  _trim(snapshot) {
    let asks = [];
    let bids = [];
    snapshot.forEach((d) => {
      if (d.side === "asks") {
        asks.push(d);
      } else if (d.side === "bids") {
        bids.push(d);
      }
    });
    asks = asks.sort((a, b) => a.id - b.id).slice(0, 100);
    bids = bids.sort((a, b) => b.id - a.id).slice(0, 100);
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
  updateByDifference(instId, difference) {
    const { success, snapshot } = super.updateByDifference(instId, difference);
    if (success) {
      this._snapshot[instId] = this._trim(snapshot);
    }
    return success;
  }

  updateAll(instId, data) {
    const { success, snapshot } = super.updateAll(
      instId,
      this._formateBooks(data)
    );
    if (success) {
      this._snapshot[instId] = this._trim(snapshot);
    }
    return success;
  }
}

module.exports = OrderBook;
