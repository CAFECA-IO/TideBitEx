const { Sequelize, DataTypes } = require("sequelize");
class mysql {
  constructor() {
    return this;
  }

  async init({ database, logger = console }) {
    try {
      this.logger = logger;
      // initial all database
      const initDB = { ...database };
      initDB.dialect = initDB.protocal;
      initDB.username = initDB.user;
      initDB.database = initDB.dbName;
      this.logger.log("initDB", initDB);
      const initDBSequelize = new Sequelize(
        initDB.dbName,
        initDB.user,
        initDB.password,
        initDB
      );

      await initDBSequelize.authenticate();
      this.logger.log(
        `\x1b[1m\x1b[32mDB   \x1b[0m\x1b[21m ${initDB.dbName} connect success`
      );
      this.db = initDBSequelize;
      return this;
    } catch (error) {
      this.logger.error(
        "\x1b[1m\x1b[31mDB   \x1b[0m\x1b[21m \x1b[1m\x1b[31mconnect fails\x1b[0m\x1b[21m"
      );
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
    const query = "SELECT * FROM `accounts` WHERE `accounts`.member_id = ?;";
    const values = [memberId];
    try {
      const [accounts] = await this.db.query({
        query,
        values,
      });
      this.logger.log(query, values);
      return accounts;
    } catch (error) {
      this.logger.error(error);
      return [];
    }
  }

  async getCurrency(currencyId) {
    const query = "SELECT * FROM `asset_bases` WHERE `asset_bases`.`id` = ?;";
    try {
      this.logger.log("getCurrency", query, currencyId);
      const [[currency]] = await this.db.query({
        query,
        values: [currencyId],
      });

      return currency;
    } catch (error) {
      this.logger.log(error);
      return [];
    }
  }

  async getCurrencyByKey(currencyKey) {
    const query = "SELECT * FROM `asset_bases` WHERE `asset_bases`.`key` = ?;";
    try {
      this.logger.log("getCurrencyByKey", query, currencyKey);
      const [[currency]] = await this.db.query({
        query,
        values: [currencyKey],
      });

      return currency;
    } catch (error) {
      this.logger.log(error);
      return [];
    }
  }
  async getMemberById(memberId) {
    const query = "SELECT * FROM `members` WHERE `members`.`id` = ?;";
    try {
      this.logger.log("getMemberById", query, `[${memberId}]`);
      const [[member]] = await this.db.query({
        query,
        values: [memberId],
      });
      return member;
    } catch (error) {
      this.logger.log(error);
      return [];
    }
  }

  async getAccountByMemberIdCurrency(memberId, currencyId, { dbTransaction }) {
    const query =
      "SELECT * FROM `accounts` WHERE `accounts`.`member_id` = ? AND `accounts`.`currency` = ?;";
    try {
      this.logger.log(
        "getAccountByMemberIdCurrency",
        query,
        `[${memberId}, ${currencyId}]`
      );
      const [[account]] = await this.db.query(
        {
          query,
          values: [memberId, currencyId],
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
  async getOrderList({ quoteCcy, baseCcy, state, memberId, orderType }) {
    if (memberId) {
      const query =
        "SELECT * FROM `orders` WHERE `orders`.`member_id` = ? AND `orders`.`currency` = ? AND `orders`.`ask` = ? AND `orders`.`state` = ?;";
      try {
        this.logger.log(
          "getOrderList",
          query,
          `[${memberId}, ${quoteCcy}, ${baseCcy}, ${state}]`
        );
        const [orders] = await this.db.query({
          query,
          values: [memberId, quoteCcy, baseCcy, state],
        });
        return orders;
      } catch (error) {
        this.logger.log(error);
        return [];
      }
    } else if (orderType) {
      const query =
        "SELECT * FROM `orders` WHERE `orders`.`currency` = ? AND `orders`.`ask` = ? AND `orders`.`state` = ? AND `orders`.`ord_type` = ?;";
      try {
        this.logger.log(
          "getOrderList",
          query,
          `[${quoteCcy}, ${baseCcy}, ${state}, ${orderType}]`
        );
        const [orders] = await this.db.query({
          query,
          values: [quoteCcy, baseCcy, state, orderType],
        });
        return orders;
      } catch (error) {
        this.logger.log(error);
        return [];
      }
    } else {
      const query =
        "SELECT * FROM `orders` WHERE `orders`.`currency` = ? AND `orders`.`ask` = ? AND `orders`.`state` = ?;";
      try {
        this.logger.log(
          "getOrderList",
          query,
          `[${quoteCcy}, ${baseCcy}, ${state}]`
        );
        const [orders] = await this.db.query({
          query,
          values: [quoteCcy, baseCcy, state],
        });
        return orders;
      } catch (error) {
        this.logger.log(error);
        return [];
      }
    }
  }

  async getVouchers({ memberId, ask, bid }) {
    const query =
      "SELECT * FROM `vouchers` WHERE `vouchers`.`member_id` = ? AND `vouchers`.`ask` = ? AND `vouchers`.`bid` = ?;";
    try {
      this.logger.log("getVouchers", query, `[${memberId}, ${ask}, ${bid}]`);
      const [trades] = await this.db.query({
        query,
        values: [memberId, ask, bid],
      });
      return trades;
    } catch (error) {
      this.logger.log(error);
      return [];
    }
  }

  async getTrades(quoteCcy, baseCcy) {
    const query =
      "SELECT `trades`.* FROM `trades`, `orders` WHERE `orders`.`id` = `trades`.`ask_id` AND `trades`.`currency` = ? AND `orders`.`ask` = ?;";
    try {
      this.logger.log("getTrades", query, `[${quoteCcy}, ${baseCcy}]`);
      const [trades] = await this.db.query({
        query,
        values: [quoteCcy, baseCcy],
      });
      return trades;
    } catch (error) {
      this.logger.log(error);
      return [];
    }
  }

  async getOrder(orderId, { dbTransaction }) {
    const query = "SELECT * FROM `orders` WHERE `orders`.`id` = ?;";
    try {
      this.logger.log("getOrder", query, `[${orderId}]`);
      const [[order]] = await this.db.query(
        {
          query,
          values: [orderId],
        },
        {
          transaction: dbTransaction,
          lock: dbTransaction.LOCK.UPDATE,
        }
      );
      return order;
    } catch (error) {
      this.logger.log(error);
      if (dbTransaction) throw error;
      return [];
    }
  }

  async getVouchersByOrderId(orderId, { dbTransaction }) {
    const query = "SELECT * FROM `vouchers` WHERE `order_id` = ?;";
    try {
      this.logger.log("getVouchersByOrderId", query, orderId);
      const [vouchers] = await this.db.query(
        {
          query,
          values: [orderId],
        },
        {
          transaction: dbTransaction,
        }
      );
      return vouchers;
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
    const query =
      "INSERT INTO `tidebitstaging`.`orders` (" +
      "`id`, `bid`, `ask`, `currency`, `price`, `volume`, `origin_volume`, `state`," +
      " `done_at`, `type`, `member_id`, `created_at`, `updated_at`, `sn`, `source`," +
      " `ord_type`, `locked`, `origin_locked`, `funds_received`, `trades_count`)" +
      " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);";

    try {
      this.logger.log(
        "insertOrder",
        "DEFAULT",
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
        trades_count
      );
      return this.db.query(
        {
          query,
          values: [
            "DEFAULT",
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
    const query =
      "INSERT INTO `tidebitstaging`.`account_versions` (`id`, `member_id`, `account_id`, `reason`, `balance`, `locked`, `fee`, `amount`, `modifiable_id`, `modifiable_type`, `created_at`, `updated_at`, `currency`, `fun`)" +
      " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);";
    try {
      this.logger.log(
        "insertAccountVersion",
        query,
        "DEFAULT",
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
            "DEFAULT",
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

  async insertVouchers(
    member_id,
    order_id,
    trade_id,
    designated_trading_fee_asset_history_id,
    ask,
    bid,
    price,
    volume,
    value,
    trend,
    ask_fee,
    bid_fee,
    created_at,
    { dbTransaction }
  ) {
    const query =
      "INSERT INTO `tidebitstaging`.`vouchers` (`id`,`member_id`,`order_id`,`trade_id`,`designated_trading_fee_asset_history_id`,`ask`,`bid`,`price`,`volume`,`value`,`trend`,`ask_fee`,`bid_fee`,`created_at`)" +
      " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);";
    try {
      this.logger.log(
        "insertAccountVersion",
        query,
        "DEFAULT",
        member_id,
        order_id,
        trade_id,
        designated_trading_fee_asset_history_id,
        ask,
        bid,
        price,
        volume,
        value,
        trend,
        ask_fee,
        bid_fee,
        created_at
      );
      await this.db.query(
        {
          query,
          values: [
            "DEFAULT",
            member_id,
            order_id,
            trade_id,
            designated_trading_fee_asset_history_id,
            ask,
            bid,
            price,
            volume,
            value,
            trend,
            ask_fee,
            bid_fee,
            created_at,
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
      const where = "`id` = " + id;
      delete datas.id;
      const set = Object.keys(datas).map((key) => `\`${key}\` = ${datas[key]}`);
      let query =
        "UPDATE `tidebitstaging`.`accounts` SET " +
        set.join(", ") +
        " WHERE " +
        where +
        ";";
      this.logger.log("updateAccount", query);
      await this.db.query(
        {
          query,
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

  async updateOrder(datas, { dbTransaction }) {
    try {
      const id = datas.id;
      const where = "`id` = " + id;
      delete datas.id;
      const set = Object.keys(datas).map((key) => `\`${key}\` = ${datas[key]}`);
      let query =
        "UPDATE `tidebitstaging`.`orders` SET " +
        set.join(", ") +
        " WHERE " +
        where +
        ";";
      this.logger.log("updateOrder", query);
      await this.db.query(
        {
          query,
        },
        {
          transaction: dbTransaction,
          lock: dbTransaction.LOCK.UPDATE,
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
