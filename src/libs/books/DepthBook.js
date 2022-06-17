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
    let decimal;
    decimal = unit.toString().includes(".")
      ? unit.toString().split(".")[1].length
      : 0;
    if (unit) {
      const max = Math.max(..._arr);
      const min = Math.min(..._arr);
      const start = min - (min % unit);
      const end = max % unit === 0 ? max : max - (max % unit) + unit;
      const length = parseInt((end - start) / unit);
      result = {};
      for (let i = 0; i < length; i++) {
        const price = start + unit * i;
        const data = { amount: "0", price, side: "" };
        result[parseFloat(price.toFixed(decimal))] = data;
      }
      for (let i = 0; i < arr.length + 1; i++) {
        const p = arr[i];
        let price = parseFloat(
          (p.side === "asks" &&
          ((p.price * 10 ** decimal) % (unit * 10 ** decimal)) /
            10 ** decimal !==
            0
            ? parseInt(parseFloat(p.price) / unit) * unit + unit
            : parseInt(parseFloat(p.price) / unit) * unit
          ).toFixed(decimal)
        );
        if (result[price]) {
          if (SafeMath.eq(result[price].amount, "0")) {
            result[price] = { ...p, price };
          } else {
            result[price].amount =
              parseFloat(result[price].amount) + parseFloat(p.amount);
          }
        }
      }
    }
    return Object.values(result);
  };

  getSnapshot(market) {
    try {
      const depthBooks = {
        market,
        asks: [],
        bids: [],
      };
      if (!this._snapshot[market]) this._snapshot[market] = [];
      const rangedArr = this.range(
        this._snapshot[market],
        parseFloat(this.unit)
      );
      for (let i = 0; i < rangedArr.length; i++) {
        let data = rangedArr[i];
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
      }
      return {
        asks: depthBooks.asks.sort(
          (a, b) => parseFloat(a.price) - parseFloat(b.price)
        ),
        bids: depthBooks.bids.sort(
          (a, b) => parseFloat(b.price) - parseFloat(a.price)
        ),
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
