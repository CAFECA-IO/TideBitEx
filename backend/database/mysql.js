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

  async transaction() {
    return this.db.transaction();
  }

  async getBalance(memberId, options) {
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

  async getAccountByMemberIdCurrency(memberId, currencyId, { dbTransaction }) {
    const query = 'SELECT * FROM `accounts` WHERE `accounts`.`member_id` = ? AND `accounts`.`currency` = ?;';
    try {
      this.logger.log('getAccountByMemberIdCurrency', query, `[${memberId}, ${currencyId}]`);
      const [[account]] = await this.db.query(
        {
          query,
          values: [memberId, currencyId]
        },
        {
          transaction: dbTransaction,
          lock: dbTransaction.LOCK.UPDATE,
        }
      );
      return account;
    } catch (error) {
      this.logger.log(error);
      if (dbTransaction) throw error;
      return [];
    }
  }

  /* !!! HIGH RISK (start) !!! */
  async insertOrder(
    bid,
    ask,
    currency,
    price,
    volume,
    origin_volume,
    state,
    done_at,
    type,
    member_id,
    created_at,
    updated_at,
    sn,
    source,
    ord_type,
    locked,
    origin_locked,
    funds_received,
    trades_count,
    { dbTransaction }
  ) {
    const query = 'INSERT INTO `tidebitstaging`.`orders` ('
      + '`id`, `bid`, `ask`, `currency`, `price`, `volume`, `origin_volume`, `state`,'
      + ' `done_at`, `type`, `member_id`, `created_at`, `updated_at`, `sn`, `source`,'
      + ' `ord_type`, `locked`, `origin_locked`, `funds_received`, `trades_count`)'
      + ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);'

    try {
      this.logger.log(
        'insertOrder',
        'DEFAULT',
        query,
        bid,
        ask,
        currency,
        price,
        volume,
        origin_volume,
        state,
        done_at,
        type,
        member_id,
        created_at,
        updated_at,
        sn,
        source,
        ord_type,
        locked,
        origin_locked,
        funds_received,
        trades_count,
      );
      return this.db.query(
        {
          query,
          values: [
            'DEFAULT',
            bid,
            ask,
            currency,
            price,
            volume,
            origin_volume,
            state,
            done_at,
            type,
            member_id,
            created_at,
            updated_at,
            sn,
            source,
            ord_type,
            locked,
            origin_locked,
            funds_received,
            trades_count,
          ],
        },
        {
          transaction: dbTransaction,
        }
      );
    } catch (error) {
      this.logger.error(error);
      if (dbTransaction) throw error;
    }
  }

  async insertAccountVersion(
    member_id,
    accountId,
    reason,
    balance,
    locked,
    fee,
    amount,
    modifiable_id,
    modifiable_type,
    created_at,
    updated_at,
    currency,
    fun,
    { dbTransaction }
  ) {
    const query = 'INSERT INTO `tidebitstaging`.`account_versions` (`id`, `member_id`, `account_id`, `reason`, `balance`, `locked`, `fee`, `amount`, `modifiable_id`, `modifiable_type`, `created_at`, `updated_at`, `currency`, `fun`)'
      + ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);'
    try {
      this.logger.log(
        'insertAccountVersion',
        'DEFAULT',
        query,
        member_id,
        accountId,
        reason,
        balance,
        locked,
        fee,
        amount,
        modifiable_id,
        modifiable_type,
        currency,
        fun
      );
      await this.db.query(
        {
          query,
          values: [
            'DEFAULT',
            member_id,
            accountId,
            reason,
            balance,
            locked,
            fee,
            amount,
            modifiable_id,
            modifiable_type,
            created_at,
            updated_at,
            currency,
            fun,
          ],
        },
        {
          transaction: dbTransaction,
        }
      );
    } catch (error) {
      this.logger.error(error);
      if (dbTransaction) throw error;
    }
  }

  async updateAccount(datas, { dbTransaction }) {
    try {
      const id = datas.id;
      const where = '`id` = ' + id;
      delete datas.id;
      const set = Object.keys(datas).map((key) => `\`${key}\` = ${datas[key]}`);
      let query = 'UPDATE `tidebitstaging`.`accounts` SET ' + set.join(', ') + ' WHERE ' + where + ';';
      this.logger.log('updateAccount', query);
      await this.db.query(
        {
          query
        },
        {
          transaction: dbTransaction,
        }
      );
    } catch (error) {
      this.logger.error(error);
      if (dbTransaction) throw error;
    }
  }
  /* !!! HIGH RISK (end) !!! */
}

module.exports = mysql;