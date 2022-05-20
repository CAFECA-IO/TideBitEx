import SafeMath from "../../utils/SafeMath";
import BookBase from "../BookBase";

class TickerBook extends BookBase {
  constructor() {
    super();
    this.name = `TickerBook`;
    this._config = { remove: false, add: false, update: true };
    this._difference = {};
    this._snapshot = {};
    this._currentMarket = null;
    this._currentTicker = null;
    return this;
  }

  getSnapshot() {
    return Object.values(this._snapshot).map((ticker) =>
      Object.values(this._difference).some(
        (diff) => diff.instId === ticker.instId
      )
        ? { ...ticker, update: true }
        : ticker
    );
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

  getCurrentTicker() {
    this._currentTicker = this._snapshot[this._currentMarket];
    return this._currentTicker;
  }

  setCurrentMarket(market) {
    this._currentMarket = market;
  }

  getCurrentMarket() {
    return this._currentMarket;
  }

  updateByDifference(tickers) {
    Object.values(tickers).forEach((ticker) => {
      // console.log(`[TickerBook updateByDifference]`, ticker);
      this._difference = {};
      try {
        this._difference[ticker.market] = ticker;
        this._snapshot[ticker.market] = ticker;
        return true;
      } catch (error) {
        console.error(`[${this.constructor.name}] error`, error);
        return false;
      }
    });
  }

  updateAll(tickers) {
    this._difference = {};
    // console.log(`[TickerBook updateAll]`, tickers);
    try {
      Object.values(tickers).forEach((ticker) => {
        if (this._compareFunction(this._snapshot[ticker.market], ticker)) {
          this._difference[ticker.market] = ticker;
        }
        this._snapshot[ticker.market] = ticker;
      });
      return true;
    } catch (error) {
      console.error(`[TickerBook updateAll]`, error);
      return false;
    }
  }
}

export default TickerBook;
