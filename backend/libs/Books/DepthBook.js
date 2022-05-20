const BookBase = require("../BookBase");
const SafeMath = require("../SafeMath");

class DepthBook extends BookBase {
  constructor({ logger, markets }) {
    super({ logger, markets });
    this._config = { remove: true, add: true, update: false };
    this.name = `DepthBook`;
    return this;
  }

  /**
   * @typedef {Object} Depth
   * @property {string} id = price
   * @property {string} price
   * @property {string} amount
   * @property {string} side 'asks' || 'bids'

   * @param {Depth} valueA
   * @param {Depth} valueB
   */
  _compareFunction(valueA, valueB) {
    return (
      SafeMath.eq(valueA.price, valueB.price) &&
      SafeMath.eq(valueA.amount, valueB.amount) &&
      valueA.side === valueB.side
    );
  }

  /**
   * @param {Array<Depth>} arrayA
   * @param {Array<Depth>} arrayB
   * @param {Function} compareFunction
   * @returns
   */
  // _calculateDifference(arrayA, arrayB) {
  //   return super._calculateDiffence(arrayA, arrayB);
  // }

  // !!!! IMPORTANT 要遵守 tideLegacy 的資料格式
  // ++ TODO: verify function works properly
  getSnapshot(instId) {
    const depthBooks = {
      market: instId.replace("-", "").toLowerCase(),
      asks: [],
      bids: [],
    };
    this._snapshot[instId].forEach((data) => {
      if (data.side === "asks") {
        depthBooks.asks.push([data.price, data.amount, data.total]);
      }
      if (data.side === "bids") {
        depthBooks.bids.push([data.price, data.amount, data.total]);
      }
    });
    this.logger.log(
      `[${this.constructor.name}] getSnapshot[${instId}]`,
      depthBooks
    );
    return depthBooks;
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
   * @returns {Array<Depth>}
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
    let sumAskAmount = "0",
      sumBidAmount = "0",
      asks = [],
      bids = [];
    data.forEach((d) => {
      if (d.side === "asks" && asks.length < 100) {
        asks.push(d);
      } else if (d.side === "bids" && bids.length < 100) {
        bids.push(d);
      }
    });
    asks = asks
      .sort((a, b) => +a.price - +b.price)
      .map((ask) => {
        sumAskAmount = SafeMath.plus(ask.amount, sumAskAmount);
        return { ...ask, total: sumAskAmount };
      });
    bids = bids
      .sort((a, b) => +b.price - +a.price)
      .map((bid) => {
        sumBidAmount = SafeMath.plus(bid.amount, sumBidAmount);
        return { ...bid, total: sumBidAmount };
      });
    return bids.concat(asks);
  }

  /**
   * @typedef {Object} Difference
   * @property {Arrary<Depth>} updates
   * @property {Arrary<Depth>} add
   * @property {Arrary<Depth>} remove
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
   * @param {Array<Depth>} data
   */
  updateAll(instId, data) {
    return super.updateAll(instId, this._formateBooks(data));
  }
}

module.exports = DepthBook;
