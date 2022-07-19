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

  async sync(exchange, force = false) {
    this.logger.log(`[${this.constructor.name}] sync`);
    const time = Date.now();
    // 1. 定期（10mins）執行工作
    if (time - this._lastSyncTime > this._syncInterval || force) {
      // 2. 從 API 取 outerTrades 並寫入 DB
      const result = await this._syncOuterTrades(
        exchange || SupportedExchange.OKEX
      );
      if (result) {
        this._lastSyncTime = Date.now();
        // 3. 觸發從 DB 取 outertradesrecord 更新下列 DB table trades、orders、accounts、accounts_version、vouchers
        this._processOuterTrades(SupportedExchange.OKEX);
      } else {
        // ++ TODO
      }
      clearTimeout(this.timer);
      // 4. 休息
      this.timer = setTimeout(() => this.sync(), this._syncInterval + 1000);
    }
  }

  async _insertVouchers(memberId, trade, t) {
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

  async _insertTrades(memberId, orderId, trade) {
    this.logger.log(
      `------------- [${this.constructor.name}] _insertTrades -------------`
    );
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
        new Date(parseInt(trade.ts)).toISOString(), // created_at
        new Date(parseInt(trade.ts)).toISOString(), // updated_at
        trade.side === "sell" ? memberId : this.systemMemberId, // ask_member_id
        trade.side === "buy" ? memberId : this.systemMemberId, // bid_member_id
        SafeMath.mult(trade.fillPx, trade.fillSz), // funds
        trade.tradeId, // trade_fk
        { dbTransaction: t }
      );
      await this._updateOuterTrade({ id: trade.id, status: 2 });
      await t.commit();
    } catch (error) {
      this.logger.error(error);
      await t.rollback();
    }
  }

  async _updateOrderbyTrade(memberId, orderId, trade) {
    this.logger.log(
      `------------- [${this.constructor.name}] _updateOrderbyTrade -------------`
    );
    this.logger.log(`memberId`, memberId);
    this.logger.log(`orderId`, orderId);
    this.logger.log(`trade`, trade);
    const t = await this.database.transaction();
    let state, volume, locked, updateAt, fundsReceived, tradesCount, value;
    try {
      /* !!! HIGH RISK (start) !!! */
      // 1. get order data from table
      const order = await this.database.getOrder(orderId, { dbTransaction: t });
      this.logger.log(`order`, order);
      // 2. check if order.memberId === memberId, if not do nothing
      if (
        order.memberId === memberId &&
        order.state === this.database.ORDER_STATE.WAIT
      ) {
        value = SafeMath.mult(trade.fillPx, trade.fillSz);
        // 1. compare fillSz => volume, state, locked, funds_received, trades_count, update_at
        volume = SafeMath.minus(order.volume, trade.fillSz);
        // ++ TODO Check value
        locked =
          trade.side === "buy"
            ? SafeMath.minus(order.locked, SafeMath.mult(order.price, volume))
            : SafeMath.minus(order.locked, volume);
        // updateAt = new Date(parseInt(trade.ts)).toISOString();
        fundsReceived =
          trade.side === "buy"
            ? SafeMath.plus(order.funds_received, trade.fillSz)
            : SafeMath.plus(order.funds_received, value);
        tradesCount = SafeMath.plus(order.trades_count, "1");
        if (SafeMath.eq(volume, "0")) {
          state = this.database.ORDER_STATE.DONE;
          locked = "0";
        }
        const newOrder = {
          id: orderId,
          volume,
          state,
          locked,
          funds_received: fundsReceived,
          trades_count: tradesCount,
          // update_at: updateAt
        };
        await this.database.updateOrder(newOrder, { dbTransaction: t });
      } else {
        await t.rollback();
        if (order.memberId === memberId)
          this.logger.error("order has been closed");
        else this.logger.error("this order is in other environment");
      }
      // ++ TODO
      this.logger.log(`_updateOuterTrade`);
      await this._updateOuterTrade({ id: trade.id, status: 1 });
      await t.commit();
    } catch (error) {
      this.logger.error(`_updateOrderbyTrade`, error);
      await t.rollback();
    }
  }
  // ++ TODO
  async _updateOuterTrade({ id, status }) {}
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
    // 1. parse  memberId, orderId from trade.clOrdId
    const { memberId, orderId } = Utils.parseClOrdId(trade.clOrdId);
    /* !!! HIGH RISK (start) !!! */
    // 1. _updateOrderbyTrade
    // 2. _insertTrades
    // 3. _insertVouchers
    // 4. side === 'buy' ? _updateAccByBidTrade : _updateAccByAskTrade
    // 5. _insertAccountVersions
    // ----------

    // 1. _updateOrderbyTrade
    await this._updateOrderbyTrade(memberId, orderId, trade);
    // 2. _insertTrades
    await this._insertTrades(memberId, orderId, trade);
  }

  async _processOuterTrades(exchange) {
    this.logger.log(`[${this.constructor.name}] _processOuterTrades`);
    // 1. get all records from outer_trades table &  fillter records if record.status === 5
    const outerTrades = await this.database.getOuterTrades(
      this.database.EXCHANGE[exchange.toUpperCase()],
      5
    );
    // 2. _processOuterTrade
    for (let trade of outerTrades) {
      await this._processOuterTrade(JSON.parse(trade.data));
    }
  }

  async _insertOuterTrade(outerTrade) {
    /* !!! HIGH RISK (start) !!! */
    let result;
    const t = await this.database.transaction();
    try {
      this.logger.log(`outerTrade`, outerTrade);
      await this.database.insertOuterTrades(
        outerTrade.tradeId, // ++ TODO 之後加上其他交易所 primary ID 是要由 id 及 source 組合
        this.database.EXCHANGE[outerTrade.source.toUpperCase()],
        new Date(parseInt(outerTrade.ts)).toISOString(),
        outerTrade.status,
        JSON.stringify(outerTrade),
        { dbTransaction: t }
      );
      result = true;
      await t.commit();
    } catch (error) {
      this.logger.error(`insertOuterTrades`, error);
      result = false;
      await t.rollback();
    }
    return result;
  }

  async _insertOuterTrades(outerTrades) {
    /* !!! HIGH RISK (start) !!! */
    let result;
    this.logger.log(`[${this.constructor.name}] insertOuterTrades`);
    for (let trade of outerTrades) {
      result = await this._insertOuterTrade(trade);
    }
    return result;
  }

  async _getOuterTradesFromAPI(exchange) {
    this.logger.log(`[${this.constructor.name}] _getOuterTradesFromAPI`);
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
          this.logger.error(`_getOuterTradesFromAPI`, okexRes);
        }
        break;
    }
    return outerTrades;
  }

  async _syncOuterTrades(exchange) {
    this.logger.log(`[${this.constructor.name}] _syncOuterTrades`);
    const outerTrades = await this._getOuterTradesFromAPI(exchange);
    const result = this._insertOuterTrades(outerTrades);
    return result;
  }
}

module.exports = ExchangeHubService;
