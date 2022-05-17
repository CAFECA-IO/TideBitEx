import SafeMath from "../../utils/SafeMath";
import BookBase from "../BookBase";

class AccountBook extends BookBase {
  constructor() {
    super();
    this.name = `AccountBook`;
    this._config = { remove: false, add: false, update: true };
    this._snapshot = {};
    this._difference = {};
    return this;
  }

  getSnapshot(instId) {
    if (instId)
      return instId.split("-").map((currency) => this._snapshot[currency]);
    return Object.values(this._snapshot);
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
      valueA.currency === valueB.currency &&
      (!SafeMath.eq(valueA.balance, valueB.balance) ||
        !SafeMath.eq(valueA.locked, valueB.locked))
    );
  }

  /**
   *
   * @param {String} currency
   * @param {Account} account
   * @returns
   */
  updateByDifference(currency, account) {
    this._difference = {};
    try {
      this._difference[currency] = account;
      this._snapshot[currency] = account;
      return true;
    } catch (error) {
      console.error(`[${this.constructor.name}] error`, error);
      return false;
    }
  }

  /**
   *
   * @param {Array<Account>} account
   * @returns
   */
  updateAll(accounts) {
    this._difference = {};
    try {
      accounts.forEach((account) => {
        if (this._compareFunction(this._snapshot[account.currency], account)) {
          this._difference[account.currency] = account;
        }
        this._snapshot[account.currency] = account;
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default AccountBook;
