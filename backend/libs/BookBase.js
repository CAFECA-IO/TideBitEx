class BookBase {
  constructor() {
    this._config = { remove: true, add: true };
    return this;
  }

  // this._snapshot = {
  //   'BTC-USDT': [],
  //    ...
  // };
  // this._difference = {
  //   'BTC-USDT': [],
  //    ...
  // };
  init({ instIds }) {
    this.instIds = instIds;
    this.instIds.forEach((instId) => {
      this._snapshot[instId] = {};
      this._difference[instId] = {};
    });
  }

  _compareFunction(valueA, valueB) {
    throw new Error("need override _compareFunction");
  }

  _calculateDifference(arrayA, arrayB, compareFunction) {
    const onlyInLeft = (left, right, compareFunction) =>
      left.filter(
        (leftValue) =>
          !right.some((rightValue) => compareFunction(leftValue, rightValue))
      );
    const onlyInA = onlyInLeft(arrayA, arrayB, compareFunction);
    const onlyInB = onlyInLeft(arrayB, arrayA, compareFunction);
    return {
      remove: onlyInA,
      add: onlyInB,
    };
  }

  getSnapshot(instId) {
    return this._snapshot[instId];
  }

  getDifference(instId) {
    return this._difference[instId];
  }

  updateByDifference(instId, difference) {
    let updateSnapshot;
    try {
      if (this._config.remove) {
        updateSnapshot = this._snapshot[instId].filter(
          (data) => !difference.some((diff) => data.id === diff.id)
        );
      }
      if (this._config.add) {
        updateSnapshot = updateSnapshot.concat(difference.add);
      }
      difference.updates.forEach((diff) => {
        const index = updateSnapshot.findIndex((d) => d.id === diff.id);
        updateSnapshot[index] = diff;
      });
      this._snapshot[instId] = updateSnapshot;
      this._difference[instId] = difference;
      return {
        success: true,
        snapshot: this._snapshot[instId],
        difference: this._difference[instId],
      };
    } catch (error) {
      return { success: false };
    }
  }

  updateAll(instId, data) {
    try {
      this._difference[instId] = this._calculateDiffence(
        this._snapshot[instId],
        data
      );
      this._snapshot[instId] = data;
      return {
        success: true,
        snapshot: this._snapshot[instId],
        difference: this._difference[instId],
      };
    } catch (error) {
      return { success: false };
    }
  }
}

module.exports = BookBase;
