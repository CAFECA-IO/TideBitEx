// import SafeMath from "../../utils/SafeMath";
import SafeMath from "../../utils/SafeMath";
import BookBase from "../BookBase";

class DepthBook extends BookBase {
  unit;
  constructor() {
    super();
    this.name = `DepthBook`;
    this._config = { remove: true, add: true, update: false };
    return this;
  }

  changeRange(unit) {
    this.unit = unit;
  }

  getSnapshot(market, lotSz) {
    try {
      let sumAskAmount = "0",
        sumBidAmount = "0",
        length,
        asks = [],
        bids = [];
      if (!this._snapshot[market]) this._snapshot[market] = [];
      this._snapshot[market]?.forEach((data) => {
        // ++ WORKAROUND TODO: enhance performance
        // if (
        //   this._difference[market].update.some((d) =>
        //     this._compareFunction(d, data)
        //   )
        // )
        // data = { ...data, update: true };
        if (data.side === "asks") {
          asks.push(data);
        }
        if (data.side === "bids") {
          bids.push(data);
        }
      });
      length = 50; //Math.min(asks.length, bids.length, 50);
      return {
        market,
        asks: asks
          .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
          .slice(0, length)
          .map((ask) => {
            sumAskAmount = SafeMath.plus(ask.amount, sumAskAmount);
            return { ...ask, total: sumAskAmount };
          }),
        bids: bids
          .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
          .slice(0, length)
          .map((bid) => {
            sumBidAmount = SafeMath.plus(bid.amount, sumBidAmount);
            return { ...bid, total: sumBidAmount };
          }),
        total: SafeMath.plus(sumAskAmount || "0", sumBidAmount || "0"),
      };
    } catch (error) {
      console.error(`[DepthBook getSnapshot]`, error);
      return false;
    }
  }

  // _trim(data) {
  //   let asks = [],
  //     bids = [];
  //   data.forEach((d) => {
  //     asks.push(d);
  //     bids.push(d);
  //   });
  //   asks = asks
  //     .filter((book) => (this._lotSz ? book.amount > this._lotSz : true))
  //     .sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
  //   bids = bids
  //     .filter((book) => (this._lotSz ? book.amount > this._lotSz : true))
  //     .sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
  //   let length = Math.min(asks.length, bids.length, 50);
  //   asks = asks.slice(0, length);
  //   bids = bids.slice(0, length);
  //   return bids.concat(asks);
  // }

  // ++ TODO: verify function works properly
  _calculateDifference(arrayA, arrayB) {
    try {
      const onlyInLeft = (left, right) =>
        left.filter(
          (leftValue) =>
            !right.some((rightValue) =>
              this._compareFunction(leftValue, rightValue)
            )
        );
      const onlyInB = onlyInLeft(arrayB, arrayA);
      return {
        update: onlyInB,
      };
    } catch (error) {
      console.error(`[DepthBook] _calculateDifference error`, error);
      return {
        update: [],
      };
    }
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
        price: ask[0],
        amount: ask[1],
        side: "asks",
      });
    });
    bookObj.bids.forEach((bid) => {
      bookArr.push({
        price: bid[0],
        amount: bid[1],
        side: "bids",
      });
    });
    return bookArr;
  }

  updateAll(market, data) {
    // console.log(`[DepthBook updateAll]`, market, data);
    return super.updateAll(market, this._formateBooks(data));
  }
}

export default DepthBook;
