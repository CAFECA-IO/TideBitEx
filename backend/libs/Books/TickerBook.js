const BookBase = require("../BookBase");
const SafeMath = require("../SafeMath");

class TickerBook extends BookBase {
  constructor() {
    super();
    this._config = { remove: false, add: false, update: true };
    return this;
  }

  /**
   * return need update ticker
   * @typedef {Object} Ticker
   * @property {String} id = market
   * @property {String} market
   * @property {String} instId
   * @property {String} name
   * @property {String} base_unit
   * @property {String} quote_unit
   * @property {String} group
   * @property {String} last
   * @property {String} change
   * @property {String} changePct
   * @property {String} open
   * @property {String} high
   * @property {String} low
   * @property {String} volume
   * @property {Number} at
   * @property {String} source

   * @param {Ticker} valueA
   * @param {Ticker} valueB
   */
  _compareFunction(valueA, valueB) {
    return (
      SafeMath.eq(valueA.id, valueB.id) &&
      (!SafeMath.eq(valueA.last, valueB.last) ||
        !SafeMath.eq(valueA.open, valueB.open24h) ||
        !SafeMath.eq(valueA.high, valueB.high24h) ||
        !SafeMath.eq(valueA.low, valueB.low24h) ||
        !SafeMath.eq(valueA.volume, valueB.vol24h))
    );
  }

  updateByDifference(instId, ticker) {
    try {
      if (this._compareFunction(this._snapshot[instId], ticker)) {
        this._difference[instId] = ticker;
        this._snapshot[instId] = ticker;
        return {
          success: true,
          snapshot: this._snapshot[instId],
          difference: this._difference[instId],
        };
      }
    } catch (error) {
      return { success: false };
    }
  }

  updateAll(tickers) {
    try {
      Object.values(tickers).forEach((ticker) => {
        this._snapshot[ticker.instId] = ticker;
        this._difference[ticker.instId] = ticker;
      });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }
}

module.exports = TickerBook;
