const BookBase = require("../BookBase");
const SafeMath = require("../SafeMath");

class TickerBook extends BookBase {
  constructor({ logger, markets }) {
    super({ logger, markets });
    this.name = `TickerBook`;
    this._config = { remove: false, add: false, update: true };
    this.markets.forEach((market) => {
      this._snapshot[market.instId] = null;
      this._difference[market.instId] = null;
    });
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
      valueA?.instId === valueB.instId &&
      valueA?.source === valueB.source &&
      (!SafeMath.eq(valueA?.last, valueB.last) ||
        !SafeMath.eq(valueA?.open, valueB.open) ||
        !SafeMath.eq(valueA?.high, valueB.high) ||
        !SafeMath.eq(valueA?.low, valueB.low) ||
        !SafeMath.eq(valueA?.volume, valueB.volume))
    );
  }

  updateByDifference(instId, ticker) {
    this._difference = {}
    try {
      if (this._compareFunction(this._snapshot[instId], ticker)) {
        this.logger.log(
          `[${this.constructor.name}] updateByDifference ticker`,
          ticker,
          `this._snapshot[${instId}]`,
          this._snapshot[instId]
        );
        this._difference[instId] = ticker;
        this._snapshot[instId] = ticker;
        return true;
      } else return false;
    } catch (error) {
      this.logger.error(`[${this.constructor.name}] error`, error);
      return false;
    }
  }

  updateAll(tickers) {
    // this.logger.log(`[${this.constructor.name}] updateAll tickers`, tickers);
    this._difference = {}
    try {
      Object.values(tickers).forEach((ticker) => {
        this._snapshot[ticker.instId] = ticker;
        this._difference[ticker.instId] = ticker;
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = TickerBook;
