const BlockTimestampDao = require('./BlockTimestampDao');
const PoolDao = require('./PoolDao');
const PoolPriceDao = require('./PoolPriceDao');
const TokenDao = require('./TokenDao');
const TokenPriceDao = require('./TokenPriceDao');
const TransactionHistoryDao = require('./TransactionHistoryDao');

module.exports = {
  BlockTimestampDao, PoolDao, PoolPriceDao,
  TokenDao, TokenPriceDao, TransactionHistoryDao
}