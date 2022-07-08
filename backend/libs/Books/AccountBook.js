const BookBase = require("../BookBase");
const SafeMath = require("../SafeMath");

class AccountBook extends BookBase {
  constructor({ logger, markets }) {
    super({ logger, markets });
    this._config = { remove: false, add: false, update: true };
    this.name = `AccountBook`;
    return this;
  }

  getDifference(memberId) {
    if (!this._difference[memberId]) return null;
    else return Object.values(this._difference[memberId]);
  }

  getSnapshot(memberId, instId) {
    if (!this._snapshot[memberId]) return null;
    else {
      if (instId)
        return instId
          .split("-")
          .map((currency) => this._snapshot[memberId][currency]);
      return Object.values(this._snapshot[memberId]);
    }
  }

  /**
   *  return need update Account
   * @typedef {Object} Account
   * @property {String} currency
   * @property {String} balance
   * @property {String} locked
   * @property {String} total
   *
   * @param {Account} valueA
   * @param {Account} valueB
   */
  _compareFunction(valueA, valueB) {
    return (
      valueA?.currency === valueB.currency &&
      (!SafeMath.eq(valueA?.balance, valueB.balance) ||
        !SafeMath.eq(valueA?.locked, valueB.locked))
    );
  }

  /**
   *
   * @param {Account} account
   * @returns
   */
  updateByDifference(memberId, account) {
    this._difference[memberId] = {};
    if (!this._snapshot[memberId]) this._snapshot[memberId] = {};
    if (
      this._compareFunction(this._snapshot[memberId][account.currency], account)
    ) {
      try {
        this._difference[memberId][account.currency] = account;
        this._snapshot[memberId][account.currency] = account;
        return true;
      } catch (error) {
        console.error(`[${this.constructor.name}] error`, error);
        return false;
      }
    }
  }

  /**
   *
   * @param {Array<Account>} account
   * @returns
   */
  updateAll(memberId, accounts) {
    this._difference[memberId] = {};
    if (!this._snapshot[memberId]) this._snapshot[memberId] = {};
    try {
      accounts.forEach((account) => {
        this._difference[memberId][account.currency] = account;
        this._snapshot[memberId][account.currency] = account;
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = AccountBook;
