const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const Entity = require('../entity');

const DB_DEFAULT_DIR = "tidebitswap";

const TBL_TOKEN = 'token';
const TBL_TOKEN_PRICE = 'token_price';
const TBL_POOL = 'pool';
const TBL_POOL_PRICE = 'pool_price';
const TBL_TRANSACTION = 'transactionHistory';
const TBL_BLOCK_TIMESTAMP = 'block_timestamp';

class sqliteDB {
  constructor(dbPath) {
    this.db = new sqlite3.Database(dbPath);
    return this;
  }

  runDB(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) {
          console.log('Error running sql ' + sql)
          console.log(err)
          reject(err)
        } else {
          // console.log('run sql id:', this.lastID)
          resolve({ id: this.lastID })
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, result) => {
        if (err) {
          console.log('Error running sql: ' + sql)
          console.log(err)
          reject(err)
        } else {
          resolve(result)
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.log('Error running sql: ' + sql)
          console.log(err)
          reject(err)
        } else {
          resolve(rows)
        }
      })
    })
  }
}

class Sqlite {
  constructor() {}
  db = null;
  _tokenDao = null;
  _tokenPriceDao = null;
  _poolDao = null;
  _poolPriceDao = null;
  _transactionHistoryDao = null;
  _blockTimestampDao = null;

  init(dir) {
    return this._createDB(dir);
  }

  async _createDB(dbDir = DB_DEFAULT_DIR) {
    // const request = indexedDB.open(dbName, dbVersion);
    const DBName = `tidebitswap.db`;
    const dbPath = path.join(dbDir, DBName);
    if (await !fs.existsSync(dbDir)) { await fs.mkdirSync(dbDir, { recursive: true }); }
    this.db = new sqliteDB(dbPath);

    this._tokenDao = new TokenDao(this.db, TBL_TOKEN);
    this._tokenPriceDao = new TokenPriceDao(this.db, TBL_TOKEN_PRICE);
    this._poolDao = new PoolDao(this.db, TBL_POOL);
    this._poolPriceDao = new PoolPriceDao(this.db, TBL_POOL_PRICE);
    this._transactionHistoryDao = new TransactionHistoryDao(this.db, TBL_TRANSACTION);
    this._blockTimestampDao = new BlockTimestampDao(this.db, TBL_BLOCK_TIMESTAMP);

    await this._createTable();
    await this._createIndex();
    return this.db;
  }

  async _createTable() {
    const tokenSQL = `CREATE TABLE IF NOT EXISTS ${TBL_TOKEN} (
      id TEXT PRIMARY KEY,
      chainId TEXT,
      contract TEXT,
      name TEXT,
      symbol TEXT,
      decimals INTEGER,
      totalSupply TEXT,
      priceToEth TEXT,
      timestamp INTEGER
    )`;

    const tokenPriceSQL = `CREATE TABLE IF NOT EXISTS ${TBL_TOKEN_PRICE}(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chainId TEXT,
      contract TEXT,
      priceToEth TEXT,
      timestamp INTEGER
    )`;

    const poolSQL = `CREATE TABLE IF NOT EXISTS ${TBL_POOL} (
      id TEXT PRIMARY KEY,
      chainId TEXT,
      contract TEXT,
      factoryContract TEXT,
      factoryIndex INTEGER,
      decimals INTEGER,
      totalSupply TEXT,
      token0Contract TEXT,
      token1Contract TEXT,
      timestamp INTEGER
    )`;

    const poolPriceSQL = `CREATE TABLE IF NOT EXISTS ${TBL_POOL_PRICE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chainId TEXT,
      contract TEXT,
      transactionHash TEXT,
      timestamp INTEGER,
      token0Amount TEXT,
      token1Amount TEXT
    )`;

    const transactionSQL = `CREATE TABLE IF NOT EXISTS ${TBL_TRANSACTION} (
      id TEXT PRIMARY KEY,
      chainId TEXT,
      transactionHash TEXT,
      type INTEGER,
      callerAddress TEXT,
      poolContract TEXT,
      token0Contract TEXT,
      token1Contract TEXT,
      token0AmountIn TEXT,
      token0AmountOut TEXT,
      token1AmountIn TEXT,
      token1AmountOut TEXT,
      share TEXT,
      timestamp INTEGER
    )`;

    const blockTimestampSQL = `CREATE TABLE IF NOT EXISTS ${TBL_BLOCK_TIMESTAMP} (
      id TEXT PRIMARY KEY,
      chainId TEXT,
      blockNumber TEXT,
      timestamp INTEGER,
      isParsed INTEGER
    )`;
    
    try {
      await this.db.runDB(tokenSQL);
      await this.db.runDB(tokenPriceSQL);
      await this.db.runDB(poolSQL);
      await this.db.runDB(poolPriceSQL);
      await this.db.runDB(transactionSQL);
      await this.db.runDB(blockTimestampSQL);
    } catch (error) {
      console.log('create table error:', error);
    }
  }

  async _createIndex() {
    const indexTokenPriceChainIdContractTimestamp = `CREATE INDEX IF NOT EXISTS idx_token_price_chainId_contract_timestamp ON ${TBL_TOKEN_PRICE}(
      chainId,
      contract,
      timestamp
    )`;

    const indexPoolPriceChainIdContractTimestamp = `CREATE INDEX IF NOT EXISTS idx_pool_price_chainId_contract_timestamp ON ${TBL_POOL_PRICE}(
      chainId,
      contract,
      timestamp
    )`;

    const uniqueIndexPoolPriceChainIdContractTransactionHash = `CREATE UNIQUE INDEX IF NOT EXISTS idx_pool_price_chainId_contract_transactionHash ON ${TBL_POOL_PRICE}(
      chainId,
      contract,
      transactionHash
    )`;

    const indexTransactionChainIdCallerAddress = `CREATE INDEX IF NOT EXISTS idx_chainId_callerAddress ON ${TBL_TRANSACTION}(
      chainId,
      callerAddress
    )`;

    const indexBlockTimestampChainIdIsParsed = `CREATE INDEX IF NOT EXISTS idx_block_timestamp_chainId_isParsed ON ${TBL_BLOCK_TIMESTAMP}(
      chainId,
      isParsed
    )`;

    const indexBlockTimestampChainIdTimestamp = `CREATE INDEX IF NOT EXISTS idx_block_timestamp_chainId_timestamp ON ${TBL_BLOCK_TIMESTAMP}(
      chainId,
      timestamp
    )`;

    try {
      await this.db.runDB(indexTokenPriceChainIdContractTimestamp);
      await this.db.runDB(indexPoolPriceChainIdContractTimestamp);
      await this.db.runDB(uniqueIndexPoolPriceChainIdContractTransactionHash);
      await this.db.runDB(indexTransactionChainIdCallerAddress);
      await this.db.runDB(indexBlockTimestampChainIdIsParsed);
      await this.db.runDB(indexBlockTimestampChainIdTimestamp);
    } catch (error) {
      console.log('create table error:', error);
    }
  }

  close() {
    this.db.close();
  }

  get tokenDao() {
    return this._tokenDao;
  }

  get tokenPriceDao() {
    return this._tokenPriceDao;
  }

  get poolDao() {
    return this._poolDao;
  }

  get poolPriceDao() {
    return this._poolPriceDao;
  }

  get transactionHistoryDao() {
    return this._transactionHistoryDao;
  }

  get blockTimestampDao() {
    return this._blockTimestampDao;
  }
}

class DAO {
  constructor(db, name, pk) {
    this._db = db;
    this._name = name;
    this._pk = pk
  }

  entity() {}

  /**
   *
   * @param {Object} data The entity return value
   * @param {Object} [options]
   */
  _write(data, options) {
    const sql = `
      INSERT OR REPLACE INTO ${this._name} (${Object.keys(data).join(', ')})
      VALUES (${Object.keys(data).map((k) => '?').join(', ')})
    `;
    return this._db.runDB(sql, Object.values(data));
  }

  _writeAll(entities) {
    if (entities.length > 0) {
      let sql = `INSERT OR REPLACE INTO ${this._name} (${Object.keys(entities[0]).join(', ')}) VALUES`;
      let values = [];
      for (const entity of entities) {
        sql += ` (${Object.keys(entity).map((k) => '?').join(', ')}),`;
        values = [...values, ...Object.values(entity)]
      }
      sql = sql.slice(0, -1);
      return this._db.runDB(sql, values);
    }
    return Promise.resolve(true);
  }

  _read(value = null, index, option = {}) {
    const where = index ? index.map(i => `${i} = ?`).join(' AND ') : `${this._pk} = ?`;
    const order = (option && option.orderBy) ? ` ORDER BY ${option.orderBy.join(', ')}` : '';
    const findOne = `SELECT * FROM ${this._name} WHERE ${where} ${order}`;
    return this._db.get(findOne, value);
  }

  _readAll(value = [], index) {
    const where = value.length ? (index ? index.map(i => `${i} = ?`).join(' AND ') : `${this._pk} = ?`) : '';
    const find = where ? `
      SELECT * FROM ${this._name} WHERE ${where}
    `
    : `SELECT * FROM ${this._name}`;
    return this._db.all(find, value);
  }

  _update(data) {
    const where = `${this._pk} = ?`;
    const params = Object.values(data);
    params.push(data[this._pk]);
    const sql = `UPDATE ${this._name} SET ${Object.keys(data).map((k) => `${k} = ?`).join(', ')} WHERE ${where}`;
    return this._db.runDB(sql, params);
  }

  _delete(key) {
    const where = `${this._pk} = ?`;
    const sql = `DELETE FROM ${this._name} WHERE ${where}`;
    return this._db.runDB(sql, key)
  }

  _deleteAll() {
    const sql = `DELETE FROM ${this._name}`;
    return this._db.runDB(sql)
  }
}

class TokenDao extends DAO {
  constructor(db, name) {
    super(db, name, 'id');
  }

  /**
   * @override
   */
  entity(param) {
    return Entity.TokenDao(param);
  }

  findToken(chainId, address) {
    return this._read(`${chainId}-${address}`);
  }

  listToken(chainId) {
    return this._readAll(chainId, ['chainId'])
  }

  insertToken(tokenEntity) {
    return this._write(tokenEntity);
  }

  updateToken(tokenEntity) {
    return this._write(tokenEntity);
  }
}

class TokenPriceDao extends DAO {
  constructor(db, name) {
    super(db, name, 'id');
  }

  /**
   * @override
   */
  entity(param) {
    return Entity.TokenPriceDao(param);
  }

  findTokenPrice(chainId, contract) {
    return this._read([chainId, contract], ['chainId', 'contract']);
  }

  listTokenPrice(chainId, contract) {
    return this._readAll([chainId, contract], ['chainId', 'contract'])
  }

  insertToken(tokenPriceEntity) {
    return this._write(tokenPriceEntity);
  }

  insertTokens(tokenPriceEntitys) {
    return this._writeAll(tokenPriceEntitys);
  }

  updateToken(tokenPriceEntity) {
    return this._write(tokenPriceEntity);
  }
}

class PoolDao extends DAO {
  constructor(db, name) {
    super(db, name, 'id');
  }

  /**
   * @override
   */
  entity(param) {
    return Entity.PoolDao(param);
  }

  findPool(chainId, contract) {
    return this._read(`${chainId}-${contract}`);
  }

  listPool(chainId) {
    return this._readAll(chainId, ['chainId'])
  }

  insertPool(poolEntity) {
    return this._write(poolEntity);
  }

  insertPools(poolEntitys) {
    return this._writeAll(poolEntitys);
  }

  updatePool(poolEntity) {
    return this._write(poolEntity);
  }
}

class PoolPriceDao extends DAO {
  constructor(db, name) {
    super(db, name, 'id');
  }

  /**
   * @override
   */
  entity(param) {
    return Entity.PoolPriceDao(param);
  }

  findPoolPrice(chainId, contract) {
    return this._read([chainId, contract], ['chainId', 'contract'], { orderBy: ['timestamp DESC'] });
  }

  listPoolPrice(chainId, contract) {
    return this._readAll([chainId, contract], ['chainId', 'contract'])
  }

  insertPoolPrice(poolPriceEntity) {
    return this._write(poolPriceEntity);
  }

  insertPoolPrices(poolPriceEntitys) {
    return this._writeAll(poolPriceEntitys);
  }

  updatePoolPrice(poolPriceEntity) {
    return this._write(poolPriceEntity);
  }
}

class TransactionHistoryDao extends DAO {
  constructor(db, name) {
    super(db, name, 'id');
  }

  /**
   * @override
   */
  entity(param) {
    return Entity.TransactionHistoryDao(param);
  }

  findTx(chainId, callerAddress) {
    return this._read([chainId, callerAddress], ['chainId', 'callerAddress']);
  }

  listTx(chainId, callerAddress) {
    return this._readAll([chainId, callerAddress], ['chainId', 'callerAddress']);
  }

  insertTx(txEntity) {
    return this._write(txEntity);
  }

  insertTxs(txEntitys) {
    return this._writeAll(txEntitys);
  }

  updateTx(txEntity) {
    return this._write(txEntity);
  }
}

class BlockTimestampDao extends DAO {
  constructor(db, name) {
    super(db, name, 'id');
  }

  /**
   * @override
   */
  entity(param) {
    return Entity.BlockTimestampDao(param);
  }

  findTimestamp(chainId, blockNumber) {
    return this._read(`${chainId}-${blockNumber}`);
  }

  findUnparsed(chainId) {
    return this._read([chainId, 0], ['chainId', 'isParsed']);
  }

  findLastBlock(chainId) {
    return this._read([chainId], ['chainId'], {orderBy: ['timestamp DESC']});
  }

  listBlockTimestamp(chainId) {
    return this._readAll([chainId], ['chainId']);
  }

  insertBlockTimestamp(entity) {
    return this._write(entity);
  }

  updateBlockTimestamp(entity) {
    return this._write(entity);
  }
}

module.exports = Sqlite;
