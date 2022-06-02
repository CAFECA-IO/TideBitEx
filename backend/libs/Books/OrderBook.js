const BookBase = require("../BookBase");

class OrderBook extends BookBase {
  constructor({ logger, markets }) {
    super({ logger, markets });
    this._config = { remove: false, add: true, update: true };
    this.name = `OrderBook`;
    this._snapshot = {};
    this._difference = {};
    return this;
  }

  // ++ TODO: verify function works properly
  _calculateDifference(arrayA, arrayB) {
    const { add } = super._calculateDifference(arrayA, arrayB);
    const update = arrayB.filter((arrayBValue) =>
      arrayA.some(
        (arrayAValue) =>
          arrayBValue.id === arrayAValue.id &&
          (arrayBValue.volume !== arrayAValue.volume ||
            arrayBValue.state !== arrayAValue.state)
      )
    );
    return {
      add,
      update,
    };
  }

  // ++ TODO: verify function works properly
  _trim(data) {
    const pendingOrders = [];
    const historyOrders = [];
    data
      .sort((a, b) => +b.at - +a.at)
      .forEach((d) => {
        if (pendingOrders.length >= 30 && historyOrders.length >= 30) return;
        if (d.state === "wait" && pendingOrders.length < 30)
          pendingOrders.push(d);
        if (
          (d.state === "canceled" || d.state === "done") &&
          historyOrders.length < 30
        )
          historyOrders.push(d);
      });
    return pendingOrders.concat(historyOrders);
  }

  // ++ TODO: verify function works properly
  getDifference(memberId, instId) {
    if (!this._snapshot[memberId]) return null;
    else if (!this._snapshot[memberId][instId]) return null;
    else {
      return this._difference[memberId][instId];
    }
  }

  // ++ TODO: verify function works properly
  getSnapshot(memberId, instId, state) {
    if (!this._snapshot[memberId]) return [];
    else if (!this._snapshot[memberId][instId]) return [];
    else {
      if (state === "pending")
        return this._snapshot[memberId][instId].filter(
          (order) => order.state === "wait"
        );
      if (state === "history")
        return this._snapshot[memberId][instId].filter(
          (order) => order.state === "canceled" || order.state === "done"
        );
    }
  }

  updateByDifference(memberId, instId, difference) {
    try {
      if (!this._difference[memberId]) this._difference[memberId] = {};
      if (!this._snapshot[memberId]) this._snapshot[memberId] = {};
      if (!this._snapshot[memberId][instId])
        this._snapshot[memberId][instId] = [];
      this._difference[memberId][instId] = difference;
      let updateSnapshot = this._snapshot[memberId][instId]
        .filter(
          (data) =>
            !difference.add.some((diff) => this._isEqual(data.id, diff.id))
        )
        .concat(difference.add);
      // .filter(
      //   (data) =>
      //     !difference.update.some((diff) => this._isEqual(data.id, diff.id))
      // )
      // .concat(difference.update);
      this._snapshot[memberId][instId] = this._trim(updateSnapshot);
    } catch (error) {
      this.logger.error(
        `[${this.constructor.name}] updateByDifference error`,
        error
      );

      return false;
    }
  }

  updateAll(memberId, instId, data) {
    try {
      if (!this._difference[memberId]) this._difference[memberId] = {};
      if (!this._snapshot[memberId]) this._snapshot[memberId] = {};
      if (!this._snapshot[memberId][instId])
        this._snapshot[memberId][instId] = [];
      this._difference[memberId][instId] = this._calculateDifference(
        this._snapshot[memberId][instId],
        data
      );
      this._snapshot[memberId][instId] = this._trim(data);
    } catch (error) {
      this.logger.error(
        `[${this.constructor.name}] updateAll  this._snapshot[memberId][instId]`,
        this._snapshot[memberId][instId]
      );
      return false;
    }
  }
}

module.exports = OrderBook;
