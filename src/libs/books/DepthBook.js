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

  range = (arr, unit) => {
    let result = arr;
    let _arr = arr?.map((d) => parseFloat(d.price)) || [];
    if (unit) {
      const max = Math.max(..._arr);
      const min = Math.min(..._arr);
      const start = SafeMath.minus(min, SafeMath.mod(min, unit));
      const end = SafeMath.eq(SafeMath.mod(max, unit), "0")
        ? max
        : SafeMath.plus(SafeMath.minus(max, SafeMath.mod(max, unit)), "1");
      const length = parseInt(SafeMath.div(SafeMath.minus(end, start), unit));

      result = [];
      for (let i = 0; i < length; i++) {
        const price = SafeMath.plus(start, SafeMath.mult(unit, i));
        const data = { amount: "0", price, side: "" };
        result.push(data);
      }

      arr.forEach((p) => {
        const price = SafeMath.mult(
          parseInt(SafeMath.div(p.price, unit)),
          unit
        );
        const index = result.findIndex(
          (v) =>
            (!v.side && SafeMath.eq(v.price, price)) ||
            (v.side === p.side && SafeMath.eq(v.price, price))
        );

        if (index > -1) {
          if (SafeMath.eq(result[index].amount, "0")) {
            result[index] = { ...p, price };
          } else {
            result[index].amount = SafeMath.plus(
              result[index].amount,
              p.amount
            );
          }
        } else {
          result.push({ ...p, price });
        }
      });
    }
    return result;
  };

  getSnapshot(market) {
    try {
      const depthBooks = {
        market,
        asks: [],
        bids: [],
      };
      this.range(this._snapshot[market], this.unit)?.forEach((data) => {
        if (
          this._difference[market].update.some((d) =>
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
      console.log(`getSnapshot range`, this.unit);
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

  // _trim(data) {
  //   let asks = [],
  //     bids = [];
  //   data.forEach((d) => {
  //     if (d.side === "asks" && asks.length < 100) {
  //       asks.push(d);
  //     }
  //     if (d.side === "bids" && bids.length < 100) {
  //       bids.push(d);
  //     }
  //   });
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
