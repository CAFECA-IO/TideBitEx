const { Sequelize, DataTypes } = require('sequelize');

class mysql {
  constructor() {
    return this;
  }

  async init({ database, logger = console }) {
    try {
      this.logger = logger;
      // initial all database
      const initDB = {...database};
      initDB.dialect = initDB.protocal;
      initDB.username = initDB.user;
      initDB.database = initDB.dbName;
      this.logger.log('initDB', initDB)
      const initDBSequelize = new Sequelize(initDB.dbName, initDB.user, initDB.password, initDB);
  
      await initDBSequelize.authenticate();
      this.logger.log(`\x1b[1m\x1b[32mDB   \x1b[0m\x1b[21m ${initDB.dbName} connect success`);
      this.db = initDBSequelize;
      return this;
    } catch (error) {
      this.logger.error('\x1b[1m\x1b[31mDB   \x1b[0m\x1b[21m \x1b[1m\x1b[31mconnect fails\x1b[0m\x1b[21m');
      throw error;
    }
  }

  async close() {
    this.db.close();
  }

  async getBalance(memberId) {
    const query = 'SELECT * FROM `accounts` WHERE `accounts`.member_id = ?;';
    const values = [memberId];
    try {
      const [accounts] = await this.db.query(
        {
          query,
          values
        }
      );
      this.logger.log(query, values);
      return accounts;
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  async getCurrency(currencyId) {
    const query = 'SELECT * FROM `asset_bases` WHERE `asset_bases`.`id` = ?;';
    try {
      this.logger.log('getCurrency', query, currencyId);
      const [[currency]] = await this.db.query(
        {
          query,
          values: [currencyId]
        }
      );
      
      return currency;
    } catch (error) {
      this.logger.log(error);
      return [];
    }
  }
}

module.exports = mysql;