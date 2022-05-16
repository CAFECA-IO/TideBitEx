const BookBase = require("../BookBase");
const SafeMath = require("../SafeMath");

class TradeBook extends BookBase {
  constructor({ logger, markets }) {
    super({ logger, markets });
    this.name = `TradeBook`;
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
    return super._compareFunction(valueA, valueB);
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
  _trim(data) {
    const trimed = data
      .sort((a, b) => +b.at - +a.at)
      .slice(0, 100)
      .map((trade, i) =>
        !trade.side
          ? {
              ...trade,
              side:
                i === data.length - 1
                  ? "up"
                  : SafeMath.gte(trade.price, data[i + 1].price)
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
  // updateByDifference(instId, difference) {
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
  // updateAll(instId, data) {
  //   try {
  //     this.logger.log(`[${this.constructor.name}] updateAll[${instId}]`);
  //     super.updateAll(instId, data);

  //     this._snapshot[instId] = this._trim(this._snapshot[instId]);
  //     // this._difference[instId] = difference;
  //     this.logger.log(
  //       `[${this.constructor.name}] updateAll[${instId}]`,
  //       this._snapshot[instId]
  //     );
  //     return true;
  //   } catch (error) {
  //     return false;
  //   }
  // }
}

module.exports = TradeBook;
