const path = require('path');

const mysql = require('./mysql');

class DBOperator {
  database = null;
  _isInit = false;

  constructor() {
    return this;
  }

  async init({ dir, database, logger }) {
    if (this._isInit) return;
    this.database = new mysql();
    this._isInit = true;

    return this.database.init({ dir, database, logger });
  }

  down() {
    if (!this.database) return;
    this.database.close();
    this._isInit = false;
    this.database = null;
  }

  async getBalance(memberId) {
    return this.database.getBalance(memberId)
  }

  async getCurrency(currencyIds) {
    return this.database.getCurrency(currencyIds);
  }
}

module.exports = DBOperator;
