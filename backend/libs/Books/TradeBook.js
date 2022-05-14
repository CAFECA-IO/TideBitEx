const { default: SafeMath } = require("../../../src/utils/SafeMath");
const BookBase = require("../BookBase");

class TradeBook extends BookBase {
  constructor() {
    super();
    this._config = { remove: false, add: true, update: false };
    return this;
  }

  /**
   * @typedef {Object} Trade
   * @property {string} id 
   * @property {string} price
   * @property {string} volume
   * @property {string} market
   * @property {Number} at
   * @property {string} side 'up' || 'down'

   * @param {Trade} valueA
   * @param {Trade} valueB
   */
  _compareFunction(valueA, valueB) {
    return super._compareFunction(valueA.id, valueB.id);
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

  // ++ TODO: verify function works properly
  _trim(snapshot) {
    const trimed = snapshot
      .sort((a, b) => +b.at - +a.at)
      .slice(0, 100)
      .map((trade, i) =>
        !trade.side
          ? {
              ...trade,
              side:
                i === snapshot.length - 1
                  ? "up"
                  : SafeMath.gte(trade.price, snapshot[i + 1].price)
                  ? "up"
                  : "down",
            }
          : trade
      );
    return trimed;
  }

  /**
   * @typedef {Object} Difference
   * @property {Arrary<Trade>} updates
   * @property {Arrary<Trade>} add
   * @property {Arrary<Trade>} remove
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

  /**
   * @param {String} instId BTC-USDT
   * @param {Array<Order>} data
   */
  updateAll(instId, data) {
    const { success, snapshot } = super.updateAll(instId, data);
    if (success) {
      this._snapshot[instId] = this._trim(snapshot);
    }
    return success;
  }
}

module.exports = TradeBook;
