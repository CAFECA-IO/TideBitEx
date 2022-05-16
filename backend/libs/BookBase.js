const SafeMath = require("./SafeMath");

class BookBase {
  constructor({ logger, markets }) {
    this.logger = logger;
    this._config = { remove: true, add: true, update: true };
    this.name = `BookBase`;
    this._snapshot = {};
    this._difference = {};
    this.markets = markets;
    this.markets.forEach((market) => {
      this._snapshot[market.instId] = [];
      this._difference[market.instId] = [];
    });
    return this;
  }

  /**
   *
   * @param {Object} valueA
   * @param {Object} valueB
   */
  _compareFunction(valueA, valueB) {
    return SafeMath.eq(valueA.id, valueB.id);
  }

  /**
   *
   * @param {Array<Object>} arrayA
   * @param {Array<Object>} arrayB
   * @param {Function} compareFunction
   * @returns
   */
  // ++ TODO: verify function works properly
  _calculateDifference(arrayA, arrayB) {
    this.logger.log(
      `[${this.constructor.name}] _calculateDifference arrayA`,
      arrayA
    );
    this.logger.log(
      `[${this.constructor.name}] _calculateDifference arrayB`,
      arrayB
    );
    const onlyInLeft = (left, right) =>
      left.filter(
        (leftValue) =>
          !right.some((rightValue) =>
            this.compareFunction(leftValue, rightValue)
          )
      );

    const onlyInA = this._config.remove ? onlyInLeft(arrayA, arrayB) : [];
    const onlyInB = this._config.add ? onlyInLeft(arrayB, arrayA) : [];
    this.logger.log(
      `[${this.constructor.name}] _calculateDifference onlyInA`,
      onlyInA
    );
    this.logger.log(
      `[${this.constructor.name}] _calculateDifference onlyInB`,
      onlyInB
    );
    return {
      remove: onlyInA,
      add: onlyInB,
    };
  }

  /**
   *
   * @param {String} instId
   * @returns {Array<Object>}
   */
  getSnapshot(instId) {
    this.logger.log(
      `[${this.constructor.name}] getSnapshot(${instId})`,
      this._snapshot[instId]
    );
    if (instId) return this._snapshot[instId];
    else return this._snapshot;
  }

  /**
   *
   * @param {String} instId
   * @returns {Array<Object>}
   */
  getDifference(instId) {
    if (instId) return this._difference[instId];
    else return this._difference;
  }

  /**
   * @param {String} str1
   * @param {String} str2
   */
  // ++ TODO: verify function works properly
  _isEqual(str1, str2) {
    return SafeMath.isNumber(str1) && SafeMath.isNumber(str2)
      ? SafeMath.eq(str1, str2)
      : str1 === str2;
  }

  _trim(data) {
    return data;
  }

  /**
   *
   * @param {String} instId
   * @returns {Boolean}
   */
  // ++ TODO: verify function works properly
  updateByDifference(instId, difference) {
    this.logger.log(
      `[${this.constructor.name}] updateByDifference[${instId}] this._config`,
      this._config,
      `difference`,
      difference
    );
    let updateSnapshot;
    try {
      if (this._config.remove) {
        updateSnapshot = this._snapshot[instId].filter(
          (data) =>
            !difference.remove.some((diff) => this._isEqual(data.id, diff.id))
        );
      }
      if (this._config.add) {
        updateSnapshot = updateSnapshot
          .filter(
            (data) =>
              !difference.add.some((diff) => this._isEqual(data.id, diff.id))
          )
          .concat(difference.add);
      }
      this.logger.log(
        `[${this.constructor.name}] updateByDifference[${instId}] updateSnapshot`,
        updateSnapshot
      );
      this._snapshot[instId] = this._trim(updateSnapshot);
      this._difference[instId] = difference;
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   *
   * @param {String} instId
   * @returns {Boolean}
   */
  // ++ TODO: verify function works properly
  updateAll(instId, data) {
    // this.logger.log(
    //   `[${this.constructor.name}] updateAll[${instId}] this._snapshot[instId]`,
    //   this._snapshot[instId]
    // );
    // this.logger.log(
    //   `[${this.constructor.name}] updateAll[${instId}] data`,
    //   data
    // );
    try {
      this._difference[instId] = this._calculateDifference(
        this._snapshot[instId],
        data
      );
      this.logger.log(
        `[${this.constructor.name}] updateAll this._difference[${instId}]`,
        this._difference[instId]
      );
      this._snapshot[instId] = this._trim(data);
      this.logger.log(
        `[${this.constructor.name}] updateAll this._snapshot[${instId}]`,
        this._snapshot[instId]
      );
      // return {
      //   success: true,
      //   snapshot: this._snapshot[instId],
      //   difference: this._difference[instId],
      // };
    } catch (error) {
      return false;
    }
  }
}

module.exports = BookBase;
