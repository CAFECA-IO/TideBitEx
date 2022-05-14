const BookBase = require("../BookBase");
const SafeMath = require("../SafeMath");

class TickerBook extends BookBase {
  constructor() {
    super();
    this._config = { remove: false, add: false, update: true };
    return this;
  }

  /**
   * @typedef {Object} Ticker
   * @property {string} id = market


   * @param {Order} valueA
   * @param {Order} valueB
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

  /**
   * @param {Array<Trade>} arrayA
   * @param {Array<Trade>} arrayB
   * @param {Function} compareFunction
   * @returns
   */
  _calculateDifference(arrayA, arrayB) {
    return super._calculateDiffence(arrayA, arrayB, this.compareFunction);
  }
}

module.exports = TickerBook;
