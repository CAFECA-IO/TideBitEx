const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const Entity = require('../entity');
const sqlType = require('../sqlType');
const {attribute, dataType} = sqlType.sqlite3

const DB_DEFAULT_DIR = "tidebitswap";

// const TBL_TOKEN = 'token';

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

  init(dir) {
    // return this._createDB(dir);
  }

  async _createDB(dbDir = DB_DEFAULT_DIR) {
    // const request = indexedDB.open(dbName, dbVersion);
    const DBName = `tidebitswap.db`;
    const dbPath = path.join(dbDir, DBName);
    if (await !fs.existsSync(dbDir)) { await fs.mkdirSync(dbDir, { recursive: true }); }
    this.db = new sqliteDB(dbPath);

    // this._tokenDao = new TokenDao(this.db, TBL_TOKEN);

    await this._runMigration();
    return this.db;
  }

  close() {
    this.db.close();
  }

  get tokenDao() {
    return this._tokenDao;
  }

  // migration

  async _runMigration() {
    const migrationTBLSQL = `CREATE TABLE IF NOT EXISTS ${TBL_MIGRATIONS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name VARCHAR,
      run_on DATETIME
    )`;
    await this.db.runDB(migrationTBLSQL);
    const mgPath = path.resolve(__dirname, '../migrations');
    const dirMigrations = (fs.readdirSync(mgPath)).map(fileName => {
      const arr = fileName.split('.');
      arr.pop();
      return arr.join('.');
    });
    const dbMigrations = (await this.migrationsDao.listMigrations()).map(mg => mg.file_name);
    const newMigrations = dirMigrations.filter((mg) => !dbMigrations.includes(mg));
    try {
      for (const newMigration of newMigrations) {
        await this.db.runDB('BEGIN TRANSACTION');
        const entity = this.migrationsDao.entity({
          file_name: newMigration,
        });
        const mgUp = require(`${mgPath}/${newMigration}`).up;
        console.log(`[Run migration] ${newMigration}`);

        await this.migrationsDao.insertMigration(entity);
        await mgUp(this, dataType);
        await this.db.runDB('COMMIT');
      }
    } catch (error) {
      console.log('[Migration error]', error);
      await this.db.runDB('ROLLBACK');
      throw error;
    }

    if (newMigrations.length === 0) {
      console.log('[There is not have new migrations]');
    }
  }

  _parseAttribute(attr) {
    const cloneAttr = {...attr};
    delete cloneAttr.type;
    const keys = Object.keys(cloneAttr);
    let sqlArr = [];
    keys.forEach(key => {
      let sql;
      switch (key) {
        case attribute.primaryKey:
          if (cloneAttr.primaryKey) { sql = 'PRIMARY KEY'; }
          break;
        case attribute.autoIncrement:
          if (cloneAttr.autoIncrement) { sql = 'AUTOINCREMENT'; }
          break;
        case attribute.allowNull:
          if (!cloneAttr.allowNull) { sql = 'NOT NULL'; }
          break;
        case attribute.defaultValue:
          sql = `DEFAULT ${cloneAttr.defaultValue}`;
          break;
        default:
      }

      if (sql) sqlArr.push(sql);
    });
    return sqlArr.join(' ');
  }

  async createTable(tableName, attributes) {
    const columeNames = Object.keys(attributes);
    let schemaSqlArr = [];
    columeNames.forEach(name => {
      const attr = attributes[name];
      if (typeof attr === 'string') {
        const columnSql = `${name} ${attr}`;
        schemaSqlArr.push(columnSql);
      } else {
        const columnSql = `${name} ${attr.type} ${this._parseAttribute(attr)}`;
        schemaSqlArr.push(columnSql);
      }
    });

    const sql = `CREATE TABLE ${tableName} (${schemaSqlArr.join(', ')})`;
    console.log(`[Run migration] ${sql}`);
    return this.db.runDB(sql);
  }

  async addColumn(tableName, columnName, attribute) {
    let columnSql = '';
    if (typeof attribute === 'string') {
      columnSql = `${columnName} ${attribute}`;
    } else {
      columnSql = `${columnName} ${attribute.type} ${this._parseAttribute(attribute)}`;
    }

    const sql = `ALTER TABLE ${tableName} ADD COLUMN ${columnSql}`;
    console.log(`[Run migration] ${sql}`);
    return this.db.runDB(sql);
  }

  async renameTable(oriTableName, newTableName) {
    const sql = `ALTER TABLE ${oriTableName} RENAME TO ${newTableName}`;
    console.log(`[Run migration] ${sql}`);
    return this.db.runDB(sql);
  }

  async dropTable(tableName) {
    const sql = `DROP TABLE ${tableName}`;
    console.log(`[Run migration] ${sql}`);
    return this.db.runDB(sql);
  }

  async renameColumn(tableName, oriColumnName, newColumnName) {
    const sql = `ALTER TABLE ${tableName} RENAME COLUMN ${oriColumnName} TO ${newColumnName}`;
    console.log(`[Run migration] ${sql}`);
    return this.db.runDB(sql);
  }

  async addIndex(tableName, attributes, options = {}) {
    const indexName = options.name ? options.name : `idx_${tableName}_${attributes.join('_')}`;
    const isUnique = options.unique ? 'UNIQUE' : '';
    const sql = `CREATE ${isUnique} INDEX ${indexName} ON ${tableName} (${attributes.join(', ')})`;
    console.log(`[Run migration] ${sql}`);
    return this.db.runDB(sql);
  }

  async dropIndex(indexName) {
    const sql = `DROP INDEX IF EXISTS ${indexName};`;
    console.log(`[Run migration] ${sql}`);
    return this.db.runDB(sql);
  }

  // 為了DB降版用，未完成
  // async removeColumn(tableName, columnName) {
  //   const tempTableName = `${tableName}_${Date.now()}`;
  //   const oriTableCreateSql = await this.db.get(`SELECT sql FROM sqlite_master WHERE name=?`, tableName);
  //   console.log('!!!oriTableCreateSql', oriTableCreateSql) // --
  //   const arrSql = oriTableCreateSql.sql.split(/\(|\)/);
  //   console.log('!!!arrSql', arrSql); // --
  //   const arrColumn = arrSql[1].split(', ');
  //   const newArrColumn = arrColumn.filter(str => {
  //     const arr = str.split(' ');
  //     if (arr[0] === columnName) return false;
  //     return true;
  //   });
  //   const newTableSql = `CREATR TABLE ${tempTableName} (${newArrColumn.join(', ')})`;
  //   console.log('!!!newTableSql', newTableSql); // --
  //   await this.db.runDB(newTableSql);

  //   throw new Error ('stop migrate')
  // }
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
    const where = index ? index.map(i => `${i}= ?`).join(' AND ') : `${this._pk} = ?`;
    const order = (option && option.orderBy) ? ` ORDER BY ${option.orderBy.join(', ')}` : '';
    const findOne = `SELECT * FROM ${this._name} WHERE ${where} ${order}`;
    return this._db.get(findOne, value);
  }

  _readAll(value = [], index, option = {}) {
    const where = value.length ? (index ? `WHERE ${index.map(i => `${i}= ?`).join(' AND ')}` : `WHERE ${this._pk} = ?`) : '';
    const order = (option && option.orderBy) ? ` ORDER BY ${option.orderBy.join(', ')}` : '';
    const limit = (option && option.limit) ? ` LIMIT ${option.limit.join(', ')}` : '';
    const find = `SELECT * FROM ${this._name} ${where} ${order} ${limit}`;
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

module.exports = Sqlite;
