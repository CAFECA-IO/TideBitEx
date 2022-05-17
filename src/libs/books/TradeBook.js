// import SafeMath from "../../utils/SafeMath";
import BookBase from "../BookBase";

class TradeBook extends BookBase {
  constructor() {
    super();
    this.name = `TradeBook`;
    this._config = { remove: false, add: false, update: true };
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
    return valueA.id === valueB.id;
  }

  getSnapshot(instId) {
    return this._snapshot[instId].map((trade) => {
      if (
        this._difference[instId].add.some((_trade) =>
          this._compareFunction(trade, _trade)
        )
      ) {
        return { ...trade, update: true };
      } else return trade;
    });
  }
}

export default TradeBook;
