// import SafeMath from "../../utils/SafeMath";
import BookBase from "../BookBase";

class TradeBook extends BookBase {
  constructor() {
    super();
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
    return valueA.id === valueB.id;
  }

  updateByDifference(market, difference) {
    if (!this._snapshot[market]) this._snapshot[market] = [];
    if (!this._difference[market]) this._difference[market] = {};
    if (!this._difference[market]["add"]) this._difference[market]["add"] = [];
    let updateSnapshot;
    try {
      if (this._config.add) {
        updateSnapshot = this._snapshot[market]
          .filter(
            (data) =>
              !difference.add?.some((diff) => this._isEqual(data.id, diff.id))
          )
          .concat(difference.add);
        this._difference[market].add.concat(difference.add);
      }
      this._snapshot[market] = this._trim(updateSnapshot);
      return true;
    } catch (error) {
      console.error(`[TradeBook] updateByDifference[${market}] error`, error);
      return false;
    }
  }

  updateAll(market, data) {
    if (!this._snapshot[market]) this._snapshot[market] = [];
    if (!this._difference[market]) this._difference[market] = {};
    if (!this._difference[market].add) this._difference[market].add = [];
    try {
      // console.log(`[TradeBook updateAll] data`, data);
      const difference = this._calculateDifference(
        this._snapshot[market],
        data
      );
      // console.log(`[TradeBook updateAll] difference`, difference);
      this._difference[market].add.concat(difference.add);
      this._snapshot[market] = this._trim(data);
      // console.log(
      //   `[TradeBook updateAll] this._difference[market]`,
      //   this._difference[market]
      // );
    } catch (error) {
      console.error(`[BookBase] updateAll error`, error);
      return false;
    }
  }

  getSnapshot(market) {
    let trades;
    try {
      if (this._snapshot[market]) {
        trades = this._snapshot[market].map((trade) => {
          if (
            this._difference[market]?.add?.some((_trade) =>
              this._compareFunction(trade, _trade)
            )
          ) {
            return { ...trade, update: true };
          } else return trade;
        });
        console.log(
          `[TradeBook getSnapshot] this._difference[market]`,
          this._difference[market]
        );
        delete this._difference[market].add;
        console.log(
          `delete[TradeBook getSnapshot] this._difference[market]`,
          this._difference[market]
        );
      } else trades = [];

      return trades;
    } catch (error) {
      console.error(`[TradeBook getSnapshot]`, error);
      return false;
    }
  }
}

export default TradeBook;
