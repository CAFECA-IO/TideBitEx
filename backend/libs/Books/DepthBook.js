const BookBase = require("../BookBase");
const SafeMath = require("../SafeMath");
const Utils = require("../Utils");

class DepthBook extends BookBase {
  constructor({ logger, markets }) {
    super({ logger, markets });
    this._config = { remove: true, add: true, update: true };
    this.name = `DepthBook`;
    return this;
  }

  /**
   * @typedef {Object} Depth
   * @property {string} price
   * @property {string} amount
   * @property {string} side 'asks' || 'bids'

   * @param {Depth} valueA
   * @param {Depth} valueB
   */
  _compareFunction(valueA, valueB) {
    return (
      SafeMath.eq(valueA.price, valueB.price) &&
      SafeMath.eq(valueA.amount, valueB.amount) &&
      valueA.side === valueB.side
    );
  }

  /**
   * @param {Array<Depth>} arrayA
   * @param {Array<Depth>} arrayB
   * @param {Function} compareFunction
   * @returns
   */
  // _calculateDifference(arrayA, arrayB) {
  //   return super._calculateDiffence(arrayA, arrayB);
  // }

  // !!!! IMPORTANT 要遵守 tideLegacy 的資料格式
  // ++ TODO: verify function works properly
  getSnapshot(instId) {
    const depthBooks = {
      market: instId.replace("-", "").toLowerCase(),
      asks: [],
      bids: [],
    };
    this._snapshot[instId].forEach((data) => {
      if (data.side === "asks") {
        depthBooks.asks.push([data.price, data.amount, data.total]);
      }
      if (data.side === "bids") {
        depthBooks.bids.push([data.price, data.amount, data.total]);
      }
    });
    // this.logger.log(
    //   `[${this.constructor.name}] getSnapshot[${instId}]`,
    //   depthBooks
    // );
    return depthBooks;
  }

  getDifference(instId) {
    return super.getDifference(instId);
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
    // console.log(`[DepthBook _formateBooks]`, bookArr);
    return bookArr;
  }

  range = (arr, precision) => {
    console.log(`arr`, arr);
    console.log(`precision`, precision);
    let result = arr;
    let _arr = arr?.map((d) => parseFloat(d.price)) || [];
    let unit = Utils.getDecimal(precision);
    console.log(`unit`, unit);

    if (unit) {
      const max = Math.max(..._arr);
      const min = Math.min(..._arr);
      console.log(`min`, min);
      console.log(`max`, max);
      const start =
        ((min * 10 ** precision) % (unit * 10 ** precision)) /
          10 ** precision ===
        0
          ? min
          : min -
            ((min * 10 ** precision) % (unit * 10 ** precision)) /
              10 ** precision;
      const end =
        ((max * 10 ** precision) % (unit * 10 ** precision)) /
          10 ** precision ===
        0
          ? max + unit
          : max -
            ((max * 10 ** precision) % (unit * 10 ** precision)) /
              10 ** precision +
            unit;
      const length = parseInt((end - start) / unit) + 1;
      result = {};
      for (let i = 0; i < length + 1; i++) {
        const price = start + unit * i;
        const data = { amount: "0", price, side: "" };
        result[parseFloat(price.toFixed(precision))] = data;
      }
      console.log(`result`, result);
      for (let i = 0; i < arr.length; i++) {
        const p = arr[i];
        let price = parseFloat(
          (p.side === "asks" &&
          ((p.price * 10 ** precision) % (unit * 10 ** precision)) /
            10 ** precision !==
            0
            ? parseInt(parseFloat(p.price) / unit) * unit + unit
            : parseInt(parseFloat(p.price) / unit) * unit
          ).toFixed(precision)
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
    return Object.values(result).filter((order) => +order.amount > 0);
  };

  // ++ TODO: verify function works properly
  _trim(instId, data) {
    let sumAskAmount = "0",
      sumBidAmount = "0",
      asks = [],
      bids = [],
      rangeData = this.range(
        data,
        this.markets.find(
          (market) => market.id === instId.replace("-", "").toLowerCase()
        )?.asks?.fixed
      );
    rangeData.forEach((d) => {
      if (d.side === "asks" && asks.length < 50) {
        // ++ 30 -- TEST
        asks.push(d);
      }
      if (d.side === "bids" && bids.length < 50) {
        // -- TEST
        bids.push(d);
      }
    });
    asks = asks
      .sort((a, b) => +a.price - +b.price)
      .map((ask) => {
        sumAskAmount = SafeMath.plus(ask.amount, sumAskAmount);
        return { ...ask, total: sumAskAmount };
      });
    bids = bids
      .sort((a, b) => +b.price - +a.price)
      .map((bid) => {
        sumBidAmount = SafeMath.plus(bid.amount, sumBidAmount);
        return { ...bid, total: sumBidAmount };
      });
    return bids.concat(asks);
  }
  /**
   *
   *   
   * {
    price: '10'
    amount: '1'
    side: 'bids',
  }
   * @param {Array<Depth>} preArr
   * @param {Array<Depth>} newArr
   * @returns {Difference} difference
   */
  _getDifference(preArr, newArr) {
    const difference = {
      add: [],
      update: [],
      remove: [],
    };
    const update = preArr;
    newArr.forEach((data) => {
      const index = preArr.findIndex(
        (_data) =>
          SafeMath.eq(data.price, _data.price) && data.side === _data.side
      );
      if (index === -1 && SafeMath.gt(data.amount, "0")) {
        update.push(data);
        difference.add.push(data);
      }
      if (index !== -1) {
        if (SafeMath.eq(data.amount, "0")) {
          update.splice(index, 1);
          difference.remove.push(data);
        } else if (!SafeMath.eq(data.amount, preArr[index].amount)) {
          update[index] = data;
          difference.update.push(data);
        }
      }
    });
    return { difference, update };
  }

  /**
   * @typedef {Object} Difference
   * @property {Arrary<Depth>} update
   * @property {Arrary<Depth>} add
   * @property {Arrary<Depth>} remove
   *
   * @param {String} instId BTC-USDT
   * @param {Difference} difference
   */
  updateByDifference(instId, data) {
    try {
      const result = this._getDifference(
        [...this._snapshot[instId]],
        this._formateBooks(data)
      );
      // this.logger.log(`_getDifference update`, result.update);
      this._snapshot[instId] = this._trim(instId, result.update);
      this._difference[instId] = this.result.difference;
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * @param {String} instId BTC-USDT
   * @param {Array<Depth>} data
   */
  updateAll(instId, data) {
    // this.logger.log(
    //   `=*===*===*== [FROM][OKEx][API][START](${instId})  =*===*===*==`
    // );
    // this.logger.log(data);
    // this.logger.log(
    //   `=*===*===*== [FROM][OKEx][API][END](${instId})  =*===*===*==`
    // );
    return super.updateAll(instId, this._formateBooks(data));
  }
}

module.exports = DepthBook;
