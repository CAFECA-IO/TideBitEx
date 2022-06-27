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
      const start =
        ((min * 10 ** decimal) % (unit * 10 ** decimal)) / 10 ** decimal === 0
          ? min
          : min -
            ((min * 10 ** decimal) % (unit * 10 ** decimal)) / 10 ** decimal;
      const end =
        ((max * 10 ** decimal) % (unit * 10 ** decimal)) / 10 ** decimal === 0
          ? max + unit
          : max -
            ((max * 10 ** decimal) % (unit * 10 ** decimal)) / 10 ** decimal +
            unit;
      const length = parseInt((end - start) / unit) + 1;
      result = {};
      for (let i = 0; i < length + 1; i++) {
        const price = start + unit * i;
        const data = { amount: "0", price, side: "" };
        result[parseFloat(price.toFixed(decimal))] = data;
      }
      for (let i = 0; i < arr.length; i++) {
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
      let asks = [],
        bids = [];
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
          asks.push(data);
        }
        if (data.side === "bids") {
          bids.push(data);
        }
      }
      // console.log(`depthBooks length`, length);
      return {
        market,
        asks: asks.sort((a, b) => parseFloat(a.price) - parseFloat(b.price)),
        bids: bids.sort((a, b) => parseFloat(b.price) - parseFloat(a.price)),
        total: SafeMath.plus(
          asks[asks.length - 1]?.total || "0",
          bids[bids.length - 1]?.total || "0"
        ),
      };
    } catch (error) {
      console.error(`[DepthBook getSnapshot]`, error);
      return false;
    }
  }

  /**
   * @param {String} lotSz
   */
  set lotSz(lotSz) {
    this._lotSz = lotSz;
  }

  _trim(data) {
    let asks = [],
      bids = [];
    data.forEach((d) => {
      asks.push(d);
      bids.push(d);
    });
    asks = asks
      .filter((book) => (this._lotSz ? book.amount > this._lotSz : true))
      .sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    bids = bids
      .filter((book) => (this._lotSz ? book.amount > this._lotSz : true))
      .sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    let length = Math.min(asks.length, bids.length, 50);
    asks = asks.slice(0, length);
    bids = bids.slice(0, length);
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
