const SupportedExchange = require("../../constants/SupportedExchange");
const SafeMath = require("../SafeMath");
const Utils = require("../Utils");

class ExchangeHubService {
  _timer;
  _lastSyncTime = 0;
  _syncInterval = 10 * 60 * 1000; // 10mins

  constructor({
    database,
    // connectors,
    okexConnector,
    logger,
  }) {
    this.database = database;
    // this.connectors = connectors;
    this.okexConnector = okexConnector;
    this.logger = logger;
    this.name = "ExchangeHubService";
    return this;
  }

  start() {
    this.logger.log(`[${this.constructor.name}] start`);
    this.sync();
  }

  async sync() {
    this.logger.log(`[${this.constructor.name}] sync`);
    const time = Date.now();
    // 1. 定期（10mins）執行工作
    if (time - this._lastSyncTime > this._syncInterval) {
      // 2. 從 API 取 outerTrades 並寫入 DB
      const result = await this.syncOuterTrades(SupportedExchange.OKEX);
      if (result) {
        this._lastSyncTime = Date.now();
        // 3. 觸發從 DB 取 outertradesrecord 更新下列 DB table trades、orders、accounts、accounts_version、vouchers
        this._processOuterTrades();
      } else {
        // ++ TODO
      }
      clearTimeout(this.timer);
      // 4. 休息
      this.timer = setTimeout(() => this.sync(), this._syncInterval + 1000);
    }
  }

  async _updateVouchers(memberId, trade, t) {
    /* !!! HIGH RISK (start) !!! */
    // 1. insert Vouchers to DB
    const tmp = trade.instId.toLowerCase().split("-");
    const askId = tmp[0];
    const bidId = tmp[1];

    if (!askId || !bidId)
      throw Error(
        `order base_unit[order.ask: ${askId}] or quote_unit[order.bid: ${bidId}] not found`
      );
    await this.database.insertVouchers(
      memberId,
      trade.clOdId, // orderId
      trade.tradeId,
      null,
      askId, // -- need change
      bidId, // -- need change
      trade.fillPx,
      trade.fillSz,
      SafeMath.mult(trade.fillPx, trade.fillSz),
      trade.side === "sell" ? "ask" : "bid",
      trade.side === "sell" ? trade.fee : "0", // get bid, so fee is bid
      trade.side === "sell" ? "0" : trade.fee, // get ask, so fee is ask
      trade.ts,
      { dbTransaction: t }
    );
  }
  async _updateAccByAskTrade(memberId, askCurr, bidCurr, trade) {
    // ex => ask:eth sell ask:eth => bid:usdt 增加 - (feeCcy bid:usdt) , release locked ask:eth
    /* !!! HIGH RISK (start) !!! */
    // 1. get askAccount from table
    // 2. get bidAccount from table
    // 3. calculate askAccount balance change
    // 3.1 askAccount: balanceDiff = 0
    // 3.2 askAccount: balance = SafeMath.plus(accountAsk.balance, balanceDiff)
    // 3.3 askAccount: lockedDiff = SafeMath.mult(fillSz, "-1")
    // 3.4 askAccount: locked = SafeMath.plus(accountAsk.locked, lockedDiff),
    // 4. calculate bidAccount balance change
    // 4.1 bidAccount: balanceDiff = SafeMath.minus(SafeMath.mult(trade.fillPx, trade.fillSz), trade.fee)
    // 4.2 bidAccount: balance = SafeMath.plus(accountAbidAccountsk.balance, balanceDiff)
    // 4.1 bidAccount: lockedDiff  = 0
    // 4.2 bidAccount: locked = SafeMath.plus(accountAsk.locked, lockedDiff),
    // 5. update accountBook
    // 6. update DB
  }

  async _updateAccByBidTrade(memberId, askCurr, bidCurr, trade) {
    // ex => bid:usdt buy ask:eth =>  bid:usdt 減少 , ask:eth 增加 - (feeCcy bid:usdt)
    /* !!! HIGH RISK (start) !!! */
    // 1. get askAccount from table
    // 2. get bidAccount from table
    // 3. calculate askAccount balance change
    // 3.1 askAccount: balanceDiff = 0
    // 3.2 askAccount: balance = SafeMath.plus(accountAsk.balance, balanceDiff)
    // 3.3 askAccount: lockedDiff = SafeMath.mult(fillSz, "-1")
    // 3.4 askAccount: locked = SafeMath.plus(accountAsk.locked, lockedDiff),
    // 4. calculate bidAccount balance change
    // 4.1 bidAccount: balanceDiff = SafeMath.minus(SafeMath.mult(trade.fillPx, trade.fillSz), trade.fee)
    // 4.2 bidAccount: balance = SafeMath.plus(accountAbidAccountsk.balance, balanceDiff)
    // 4.1 bidAccount: lockedDiff  = 0
    // 4.2 bidAccount: locked = SafeMath.plus(accountAsk.locked, lockedDiff),
    // 5. update accountBook
    // 6. update DB
  }

  async _updateOrderbyTrade(orderfromDB, trade) {
    /* !!! HIGH RISK (start) !!! */
    // 1. compare fillSz => volume, state, locked, funds_received, trades_count
  }

  async _updateTrade(memberId, orderId, trade) {
    /* !!! HIGH RISK (start) !!! */
    // 1. insert trade to DB
    const t = await this.database.transaction();
    try {
      const market = this._findMarket(trade.instId);
      await this.database.insertTrades(
        trade.fillPx, //price
        trade.fillSz, //volume
        trade.side === "sell" ? orderId : null, // ask_id: order_id
        trade.side === "buy" ? orderId : null, // bid_id: order_id
        null, // trend
        market.code, // currency
        trade.ts, // created_at
        trade.ts, // updated_at
        trade.side === "sell" ? memberId : this.systemMemberId, // ask_member_id
        trade.buy === "sell" ? memberId : this.systemMemberId, // bid_member_id
        SafeMath.mult(trade.fillPx, trade.fillSz), // funds
        trade.tradeId, // trade_fk
        { dbTransaction: t }
      );
      await t.commit();
    } catch (error) {
      this.logger.error(error);
      await t.rollback();
    }
  }

  /**
   * @typedef {Object} Trade
   * @property {string} side "sell"
   * @property {string} fillSz "0.002"
   * @property {string} fillPx "1195.86"
   * @property {string} fee "-0.001913376"
   * @property {string} ordId "467755654093094921"
   * @property {string} insType "SPOT"
   * @property {string} instId "ETH-USDT"
   * @property {string} clOrdId "377bd372412fSCDE11235m49o"
   * @property {string} posSide "net"
   * @property {string} billId "467871903972212805"
   * @property {string} tag "377bd372412fSCDE"
   * @property {string} execType "M"
   * @property {string} traeId "225260494"
   * @property {string} feecy "USDT"
   * @property {string} ts "1657821354546
   */
  /**
   * @param {Trade} trade
   */
  async _processOuterTrade(trade) {
    const { memberId, orderId } = Utils.parseClOrdId(trade.clOrdId);
    /* !!! HIGH RISK (start) !!! */
    // 1. get order by trade.clOrdId from orders table
    // 2. check if order.memberId === memberId, if not do nothing
    // 3. _updateOrderbyTrade
    // 4. side === 'buy' ? _updateAccByBidTrade : _updateAccByAskTrade
    // 5. _updateTrade
    // 6. _updateVouchers
    // 7. add account_version
    // ----------
    // 1. _updateTrade
    this._updateTrade(memberId, orderId, trade);
  }

  async _processOuterTrades() {
    this.logger.log(`[${this.constructor.name}] _processOuterTrades`);
    // 1. get all records from outer_trades table
    // 2. fillter records if record.status === 5
    // 3. _processOuterTrade
  }

  async insertOuterTrades(outerTrades) {
    /* !!! HIGH RISK (start) !!! */
    let result;
    this.logger.log(`[${this.constructor.name}] insertOuterTrades`);
    for (let trade in outerTrades) {
      try {
        this.logger.log(`trade`, trade);
        this.database.insertOuterTrades(
          parseInt(
            `${this.database.EXCHANGE[trade.source.toUpperCase()].toString()}${
              trade.tradeId
            }`
          ),
          this.database.EXCHANGE[trade.source.toUpperCase()],
          trade.at,
          trade.status,
          JSON.stringify(trade)
        );
        result = true;
      } catch (error) {
        this.logger.error(`insertOuterTrades`, error);
        break;
      }
    }
    return result;
  }

  async getOuterTradesFromAPI(exchange) {
    this.logger.log(`[${this.constructor.name}] getOuterTradesFromAPI`);
    let outerTrades;
    switch (exchange) {
      case SupportedExchange.OKEX:
      default:
        const okexRes = await this.okexConnector.router(
          "fetchTradeFillsRecords",
          {
            query: {},
          }
        );
        if (okexRes.success) {
          outerTrades = okexRes.payload;
        } else {
          this.logger.error(`getOuterTradesFromAPI`, okexRes);
        }
        break;
    }
    return outerTrades;
  }

  async syncOuterTrades(exchange) {
    this.logger.log(`[${this.constructor.name}] syncOuterTrades`);
    const outerTrades = await this.getOuterTradesFromAPI(exchange);
    const result = this.insertOuterTrades(outerTrades);
    return result;
  }
}

module.exports = ExchangeHubService;
