// import SafeMath from "../../utils/SafeMath";
import SafeMath from "../../utils/SafeMath";
import BookBase from "../BookBase";

class DepthBook extends BookBase {
  constructor() {
    super();
    this.name = `DepthBook`;
    this._config = { remove: true, add: true, update: false };
    return this;
  }

  getSnapshot(market) {
    try {
      const depthBooks = {
        market,
        asks: [],
        bids: [],
      };
      this._snapshot[market]?.forEach((data) => {
        if (
          this._difference[market].add.some((d) =>
            this._compareFunction(d, data)
          )
        )
          data = { ...data, update: true };
        if (data.side === "asks") {
          depthBooks.asks.push(data);
        }
        if (data.side === "bids") {
          depthBooks.bids.push(data);
        }
      });
      // console.log(`[DepthBook] getSnapshot[${market}]`, {
      //   ...depthBooks,
      //   total: SafeMath.plus(
      //     depthBooks.asks[depthBooks.asks.length - 1]?.total,
      //     depthBooks.bids[depthBooks.bids.length - 1]?.total
      //   ),
      // });
      return {
        ...depthBooks,
        total: SafeMath.plus(
          depthBooks.asks[depthBooks.asks.length - 1]?.total,
          depthBooks.bids[depthBooks.bids.length - 1]?.total
        ),
      };
    } catch (error) {
      console.error(`[DepthBook getSnapshot]`, error);
      return false;
    }
  }
  _trim(data) {
    let asks = [],
      bids = [];
    data.forEach((d) => {
      if (d.side === "asks" && asks.length < 100) {
        asks.push(d);
      }
      if (d.side === "bids" && bids.length < 100) {
        bids.push(d);
      }
    });
    return bids.concat(asks);
  }

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
      console.error(`[BookBase] _calculateDifference error`, error);
      return {
        remove: [],
        add: [],
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
        total: ask[2],
        side: "asks",
      });
    });
    bookObj.bids.forEach((bid) => {
      bookArr.push({
        price: bid[0],
        amount: bid[1],
        total: bid[2],
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
