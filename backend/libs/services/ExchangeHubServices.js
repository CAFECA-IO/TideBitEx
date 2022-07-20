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
    systemMemberId,
    okexConnector,
    tidebitMarkets,
    logger,
  }) {
    this.database = database;
    // this.connectors = connectors;
    this.systemMemberId = systemMemberId;
    this.tidebitMarkets = tidebitMarkets;
    this.okexConnector = okexConnector;
    this.logger = logger;
    this.name = "ExchangeHubService";
    return this;
  }

  start() {
    this.logger.log(`[${this.constructor.name}] start`);
    this.sync();
  }

  /**
   * ++TODO gc
   * 每筆 outerTrade 只保留180天
   * outerTrade不能抓180天以前的資料
   * */

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

  // ++ TODO
  async _updateOuterTradeStatus({ id, exchangeCode, status, dbTransaction }) {
    this.logger.log(
      `------------- [${this.constructor.name}] _updateOuterTradeStatus -------------`
    );
    this.logger.log("data", {
      id,
      exchangeCode,
      status,
    });
    try {
      await this.database.updateOuterTrade(
        { id, exchange_code: exchangeCode, status },
        { dbTransaction }
      );
    } catch (error) {
      throw error;
    }
    this.logger.log(
      `------------- [${this.constructor.name}] _updateOuterTradeStatus  [END]-------------`
    );
  }

  async _updateAccountsRecord({
    account,
    accBalDiff,
    accBal,
    accLocDiff,
    accLoc,
    reason,
    fee,
    modifiableId,
    updateAt,
    fun,
    dbTransaction,
  }) {
    try {
      /* !!! HIGH RISK (start) !!! */
      const amount = SafeMath.plus(accBal, accLoc);
      await this.database.insertAccountVersion(
        account.member_id,
        account.id,
        reason,
        accBalDiff,
        accLocDiff,
        fee,
        amount,
        modifiableId,
        this.database.MODIFIABLE_TYPE.TRADE,
        updateAt,
        updateAt,
        account.currency,
        fun,
        { dbTransaction }
      );
      const updateAccount = {
        id: account.id,
        balance: accBal,
        locked: accLoc,
      };
      await this.database.updateAccount(updateAccount, { dbTransaction });
      /* !!! HIGH RISK (end) !!! */
    } catch (error) {
      this.logger.error(`_updateAccountsRecord`, error);
      throw error;
    }
  }

  async _updateAccByAskTrade({
    memberId,
    askCurr,
    bidCurr,
    orderState,
    trade,
    dbTransaction,
  }) {
    // ex => ask:eth sell ask:eth => bid:usdt 增加 - (feeCcy bid:usdt) , release partial/all locked ask:eth
    this.logger.log(
      `------------- [${this.constructor.name}] _updateAccByAskTrade -------------`
    );
    try {
      /** !!! HIGH RISK (start) !!!
       * 1. get askAccount from table
       * 2. get bidAccount from table
       * 3. calculate askAccount balance change
       * 3.1 askAccount: balanceDiff = 0
       * 3.2 askAccount: balance = SafeMath.plus(askAccount.balance, balanceDiff)
       * 3.3 askAccount: lockedDiff = SafeMath.mult(fillSz, "-1")
       * 3.4 askAccount: locked = SafeMath.plus(askAccount.locked, lockedDiff),
       * 3.5 update accountBook
       * 3.6 update DB
       * 4. calculate bidAccount balance change
       * 4.1 bidAccount: balanceDiff = SafeMath.minus(SafeMath.mult(trade.fillPx, trade.fillSz), trade.fee)
       * 4.2 bidAccount: balance = SafeMath.plus(bidAccount.balance, balanceDiff)
       * 4.3 bidAccount: lockedDiff  = 0
       * 4.4 bidAccount: locked = SafeMath.plus(bidAccount.locked, lockedDiff),
       * 4.5 update accountBook
       * 4.6 update DB
       */
      let askAccBalDiff,
        askAccBal,
        askLocDiff,
        askLoc,
        bidAccBalDiff,
        bidAccBal,
        bidLocDiff,
        bidLoc;
      // 1. get askAccount from table
      const askAccount = await this.database.getAccountByMemberIdCurrency(
        memberId,
        askCurr,
        { dbTransaction }
      );
      // 2. get bidAccount from table
      const bidAccount = await this.database.getAccountByMemberIdCurrency(
        memberId,
        bidCurr,
        { dbTransaction }
      );
      // 3. calculate askAccount balance change
      // 3.1 askAccount: balanceDiff = 0
      askAccBalDiff = 0;
      // 3.2 askAccount: balance = SafeMath.plus(askAccount.balance, balanceDiff)
      askAccBal = SafeMath.plus(askAccount.balance, askAccBalDiff);
      // 3.3 askAccount: lockedDiff = SafeMath.mult(fillSz, "-1")
      askLocDiff = SafeMath.mult(trade.fillSz, "-1");
      // 3.4 askAccount: locked = SafeMath.plus(askAccount.locked, lockedDiff),
      askLoc = SafeMath.plus(askAccount.locked, askLocDiff);
      // ++ TODO 3.5 update accountBook
      // 3.6 update DB
      this.logger.log(`askAccount`, askAccount);
      this.logger.log(`askAccBalDiff`, askAccBalDiff);
      this.logger.log(`askAccBal`, askAccBal);
      this.logger.log(`askLocDiff`, askLocDiff);
      this.logger.log(`askLoc`, askLoc);
      this.logger.log(`askFee`, 0);
      this.logger.log(`modifiableId`, trade.tradeId);
      this.logger.log(`updateAt`, new Date(parseInt(trade.ts)).toISOString());
      await this._updateAccountsRecord({
        account: askAccount,
        accBalDiff: askAccBalDiff,
        accBal: askAccBal,
        accLocDiff: askLocDiff,
        accLoc: askLoc,
        reason:
          orderState === this.database.ORDER_STATE.DONE
            ? this.database.REASON.ORDER_FULLFILLED
            : this.database.REASON.STRIKE_UNLOCK,
        fee: 0,
        modifiableId: trade.tradeId,
        updateAt: new Date(parseInt(trade.ts)).toISOString(),
        fun: this.database.FUNC.UNLOCK_AND_SUB_FUNDS,
        dbTransaction,
      });
      // 4. calculate bidAccount balance change
      // 4.1 bidAccount: balanceDiff = SafeMath.minus(SafeMath.mult(trade.fillPx, trade.fillSz), trade.fee)
      bidAccBalDiff = SafeMath.minus(
        SafeMath.mult(trade.fillPx, trade.fillSz),
        trade.fee
      );
      // 4.2 bidAccount: balance = SafeMath.plus(bidAccount.balance, balanceDiff)
      bidAccBal = SafeMath.plus(bidAccount.balance, bidAccBalDiff);
      // 4.3 bidAccount: lockedDiff  = 0
      bidLocDiff = 0;
      // 4.4 bidAccount: locked = SafeMath.plus(bidAccount.locked, lockedDiff),
      bidLoc = SafeMath.plus(bidAccount.locked, bidLocDiff);
      // ++ TODO 4.5 update accountBook
      // 4.6 update DB
      this.logger.log(`bidAccount`, bidAccount);
      this.logger.log(`bidAccBalDiff`, bidAccBalDiff);
      this.logger.log(`bidAccBal`, bidAccBal);
      this.logger.log(`bidLocDiff`, bidLocDiff);
      this.logger.log(`bidLoc`, bidLoc);
      this.logger.log(`bidFee`, SafeMath.abs(trade.fee));
      this.logger.log(`modifiableId`, trade.tradeId);
      this.logger.log(`updateAt`, new Date(parseInt(trade.ts)).toISOString());
      await this._updateAccountsRecord({
        account: bidAccount,
        accBalDiff: bidAccBalDiff,
        accBal: bidAccBal,
        accLocDiff: bidLocDiff,
        accLoc: bidLoc,
        reason:
          orderState === this.database.ORDER_STATE.DONE
            ? this.database.REASON.ORDER_FULLFILLED
            : this.database.REASON.STRIKE_ADD,
        fee: SafeMath.abs(trade.fee),
        modifiableId: trade.tradeId,
        updateAt: new Date(parseInt(trade.ts)).toISOString(),
        fun: this.database.FUNC.PLUS_FUNDS,
        dbTransaction,
      });
      this.logger.log(
        `------------- [${this.constructor.name}] _updateAccByAskTrade [END]-------------`
      );
    } catch (error) {
      this.logger.error(`_updateAccByAskTrade`, error);
      throw error;
    }
  }

  async _updateAccByBidTrade({
    memberId,
    askCurr,
    bidCurr,
    orderState,
    trade,
    dbTransaction,
  }) {
    this.logger.log(
      `------------- [${this.constructor.name}] _updateAccByBidTrade -------------`
    );
    // ex => bid:usdt buy ask:eth => release partial/all locked bid:usdt , ask:eth - (feeCcy ask:eth)增加
    try {
      /**
       * !!! HIGH RISK (start) !!!
       * 1. get askAccount from table
       * 2. get bidAccount from table
       * 3. calculate askAccount balance change
       * 3.1 askAccount: SafeMath.plus(trade.fillSz, trade.fee);
       * 3.2 askAccount: balance = SafeMath.plus(askAccount.balance, balanceDiff)
       * 3.3 askAccount: lockedDiff = 0;
       * 3.4 askAccount: locked = SafeMath.plus(askAccount.locked, lockedDiff),
       * 3.5 update accountBook
       * 3.6 update DB
       * 4. calculate bidAccount balance change
       * 4.1 bidAccount: balanceDiff = 0
       * 4.2 bidAccount: balance = SafeMath.plus(bidAccount.balance, balanceDiff)
       * 4.3 bidAccount: lockedDiff  = SafeMath.mult(SafeMath.mult(trade.fillPx, trade.fillSz), "-1");
       * 4.4 bidAccount: locked = SafeMath.plus(bidAccount.locked, lockedDiff),
       * 4.5 update accountBook
       * 4.6 update DB
       * -----
       */
      let askAccBalDiff,
        askAccBal,
        askLocDiff,
        askLoc,
        bidAccBalDiff,
        bidAccBal,
        bidLocDiff,
        bidLoc;
      // 1. get askAccount from table
      const askAccount = await this.database.getAccountByMemberIdCurrency(
        memberId,
        askCurr,
        { dbTransaction }
      );
      // 2. get bidAccount from table
      const bidAccount = await this.database.getAccountByMemberIdCurrency(
        memberId,
        bidCurr,
        { dbTransaction }
      );
      // 3. calculate askAccount balance change
      // 3.1 askAccount: SafeMath.plus(trade.fillSz, trade.fee);
      askAccBalDiff = SafeMath.plus(trade.fillSz, trade.fee);
      // 3.2 askAccount: balance = SafeMath.plus(askAccount.balance, balanceDiff)
      askAccBal = SafeMath.plus(askAccount.balance, askAccBalDiff);
      // 3.3 askAccount: lockedDiff = 0
      askLocDiff = 0;
      // 3.4 askAccount: locked = SafeMath.plus(askAccount.locked, lockedDiff),
      askLoc = SafeMath.plus(askAccount.locked, askLocDiff);
      // ++ TODO 3.5 update accountBook
      // 3.6 update DB
      this.logger.log(`askAccount`, askAccount);
      this.logger.log(`askAccBalDiff`, askAccBalDiff);
      this.logger.log(`askAccBal`, askAccBal);
      this.logger.log(`askLocDiff`, askLocDiff);
      this.logger.log(`askLoc`, askLoc);
      this.logger.log(`askFee`, SafeMath.abs(trade.fee));
      this.logger.log(`modifiableId`, trade.tradeId);
      this.logger.log(`updateAt`, new Date(parseInt(trade.ts)).toISOString());
      await this._updateAccountsRecord({
        account: askAccount,
        accBalDiff: askAccBalDiff,
        accBal: askAccBal,
        accLocDiff: askLocDiff,
        accLoc: askLoc,
        reason:
          orderState === this.database.ORDER_STATE.DONE
            ? this.database.REASON.ORDER_FULLFILLED
            : this.database.REASON.STRIKE_ADD,
        fee: SafeMath.abs(trade.fee),
        modifiableId: trade.tradeId,
        updateAt: new Date(parseInt(trade.ts)).toISOString(),
        fun: this.database.FUNC.PLUS_FUNDS,
        dbTransaction,
      });
      // 4. calculate bidAccount balance change
      // 4.1 bidAccount: balanceDiff = 0;
      bidAccBalDiff = 0;
      // 4.2 bidAccount: balance = SafeMath.plus(bidAccount.balance, balanceDiff)
      bidAccBal = SafeMath.plus(bidAccount.balance, bidAccBalDiff);
      // 4.1 bidAccount: lockedDiff  = SafeMath.mult(SafeMath.mult(trade.fillPx, trade.fillSz), "-1");
      bidLocDiff = SafeMath.mult(
        SafeMath.mult(trade.fillPx, trade.fillSz),
        "-1"
      );
      // 4.2 bidAccount: locked = SafeMath.plus(bidAccount.locked, lockedDiff),
      bidLoc = SafeMath.plus(bidAccount.locked, bidLocDiff);
      // ++ TODO 4.5 update accountBook
      // 4.6 update DB
      this.logger.log(`bidAccount`, bidAccount);
      this.logger.log(`bidAccBalDiff`, bidAccBalDiff);
      this.logger.log(`bidAccBal`, bidAccBal);
      this.logger.log(`bidLocDiff`, bidLocDiff);
      this.logger.log(`bidLoc`, bidLoc);
      this.logger.log(`bidFee`, 0);
      this.logger.log(`modifiableId`, trade.tradeId);
      this.logger.log(`updateAt`, new Date(parseInt(trade.ts)).toISOString());
      await this._updateAccountsRecord({
        account: bidAccount,
        accBalDiff: bidAccBalDiff,
        accBal: bidAccBal,
        accLocDiff: bidLocDiff,
        accLoc: bidLoc,
        reason:
          orderState === this.database.ORDER_STATE.DONE
            ? this.database.REASON.ORDER_FULLFILLED
            : this.database.REASON.STRIKE_UNLOCK,
        fee: 0,
        modifiableId: trade.tradeId,
        updateAt: new Date(parseInt(trade.ts)).toISOString(),
        fun: this.database.FUNC.UNLOCK_AND_SUB_FUNDS,
        dbTransaction,
      });
      this.logger.log(
        `------------- [${this.constructor.name}] _updateAccByBidTrade [END]-------------`
      );
    } catch (error) {
      this.logger.error(`_updateAccByAskTrade`, error);
      throw error;
    }
  }

  async _insertVouchers({ memberId, orderId, trade, dbTransaction }) {
    this.logger.log(
      `------------- [${this.constructor.name}] _insertVouchers -------------`
    );
    /* !!! HIGH RISK (start) !!! */
    // 1. insert Vouchers to DB
    let result,
      tmp = trade.instId.toLowerCase().split("-"),
      askId = tmp[0],
      bidId = tmp[1];
    this.logger.log(`askId`, askId);
    this.logger.log(`bidId`, bidId);
    if (!askId || !bidId)
      throw Error(
        `order base_unit[order.ask: ${askId}] or quote_unit[order.bid: ${bidId}] not found`
      );
    try {
      result = await this.database.insertVouchers(
        memberId,
        orderId, // ++TODO check order_id is trade.clOrdId or orderId
        trade.id,
        null,
        askId,
        bidId,
        trade.fillPx,
        trade.fillSz,
        SafeMath.mult(trade.fillPx, trade.fillSz),
        trade.side === "sell" ? "ask" : "bid",
        trade.side === "sell" ? trade.fee : "0", // get bid, so fee is bid
        trade.side === "sell" ? "0" : trade.fee, // get ask, so fee is ask
        trade.ts,
        { dbTransaction }
      );
    } catch (error) {
      this.logger.error(`insertVouchers`, error);
      throw error;
    }
    this.logger.log(
      `------------- [${this.constructor.name}] _insertVouchers [END] -------------`
    );
    return result;
  }

  async insertTrades({ memberId, orderId, trade, dbTransaction }) {
    this.logger.log(
      `------------- [${this.constructor.name}] insertTrades -------------`
    );
    /* !!! HIGH RISK (start) !!! */
    // 1. insert Vouchers to DB
    let result,
      market = this._findMarket(trade.instId);
    this.logger.log(`market`, market);
    if (!market) throw Error(`market not found`);
    try {
      result = await this.database.insertTrades(
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
        { dbTransaction }
      );
    } catch (error) {
      this.logger.error(`insertVouchers`, error);
      throw error;
    }
    this.logger.log(
      `------------- [${this.constructor.name}] insertTrades [END] -------------`
    );
    return result;
  }

  async _insertTradesRecord({ memberId, orderId, trade, dbTransaction }) {
    let insertTradesResult, insertVouchersResult, result;
    this.logger.log(
      `------------- [${this.constructor.name}] _insertTradesRecord -------------`
    );
    let _trade;
    /* !!! HIGH RISK (start) !!! */
    try {
      // 1. get _trade By trade_fk
      _trade = await this.database.getTradeByTradeFk(trade.tradeId);
      this.logger.log(`_trade`, _trade);
      // 2. if _trade is not exist
      if (!_trade) {
        // 3. insert trade to DB
        insertTradesResult = await this.insertTrades({
          memberId,
          orderId,
          trade,
          dbTransaction,
        });
        _trade = await this.database.getTradeByTradeFk(trade.tradeId);
        this.logger.log(`inserted _trade`, _trade);
        this.logger.log(`_insertTrades result`, insertTradesResult);
        // 3. insert voucher to DB
        insertVouchersResult = await this._insertVouchers({
          memberId,
          orderId,
          trade: _trade,
          dbTransaction,
        });
        this.logger.log(`insertVouchers result`, insertVouchersResult);
        result = _trade.id;
      }
    } catch (error) {
      this.logger.error(`_insertTradesRecord`, error);
      throw error;
    }
    this.logger.log(`_insertTradesRecord result`, insertVouchersResult);
    this.logger.log(
      `------------- [${this.constructor.name}] _insertTradesRecord [END]-------------`
    );
    return result;
  }

  async _updateOrderbyTrade({ memberId, orderId, trade, dbTransaction }) {
    this.logger.log(
      `------------- [${this.constructor.name}] _updateOrderbyTrade -------------`
    );
    let _order,
      _updateOrder,
      state,
      volume,
      locked,
      updateAt,
      fundsReceived,
      tradesCount,
      value;
    // get _order data from table
    this.logger.log(`orderId`, orderId);
    _order = await this.database.getOrder(orderId, { dbTransaction });
    this.logger.log(`_order`, _order);
    try {
      if (
        _order &&
        _order?.member_id.toString() === memberId &&
        _order?.state === this.database.ORDER_STATE.WAIT
      ) {
        value = SafeMath.mult(trade.fillPx, trade.fillSz);
        volume = SafeMath.minus(_order.volume, trade.fillSz);
        locked =
          trade.side === "buy"
            ? SafeMath.minus(_order.locked, SafeMath.mult(_order.price, volume))
            : SafeMath.minus(_order.locked, volume);
        updateAt = new Date(parseInt(trade.ts)).toISOString();
        fundsReceived =
          trade.side === "buy"
            ? SafeMath.plus(_order.funds_received, trade.fillSz)
            : SafeMath.plus(_order.funds_received, value);
        tradesCount = SafeMath.plus(_order.trades_count, "1");
        if (SafeMath.eq(volume, "0")) {
          state = this.database.ORDER_STATE.DONE;
          locked = "0";
        }
        _updateOrder = {
          id: _order.id,
          volume,
          state,
          locked,
          funds_received: fundsReceived,
          trades_count: tradesCount,
          update_at: updateAt,
        };
        /* !!! HIGH RISK (start) !!! */
        // update order data from table
        await this.database.updateOrder(_updateOrder, { dbTransaction });
      } else {
        if (_order?.member_id.toString() === memberId)
          this.logger.error("order has been closed");
        else {
          this.logger.error("this order is in other environment");
          _order = null;
        }
      }
    } catch (error) {
      this.logger.error(`_updateOrderbyTrade`, error);
      throw error;
    }
    this.logger.log(`_updateOrder`, _updateOrder);
    this.logger.log(
      `------------- [${this.constructor.name}] _updateOrderbyTrade [END] -------------`
    );
    return { updateOrder: _updateOrder, order: _order };
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
   * @property {string} tradeId "225260494"
   * @property {string} feecy "USDT"
   * @property {string} ts "1657821354546
   */
  /**
   * @param {Trade} trade
   */
  async _processOuterTrade(trade) {
    this.logger.log(
      `------------- [${this.constructor.name}] _processOuterTrade -------------`
    );
    // 1. parse  memberId, orderId from trade.clOrdId
    const { memberId, orderId } = Utils.parseClOrdId(trade.clOrdId);
    /* !!! HIGH RISK (start) !!! */
    // 1. _updateOrderbyTrade
    // 2. _insertTrades & _insertVoucher
    // 3. side === 'buy' ? _updateAccByBidTrade : _updateAccByAskTrade
    // 5. _updateOuterTradeStatus
    // ----------
    this.logger.log(`outerTrade`, trade);
    this.logger.log(`memberId`, memberId);
    this.logger.log(`orderId`, orderId);
    const t = await this.database.transaction();
    try {
      // 1. _updateOrderbyTrade
      const { order, updateOrder } = await this._updateOrderbyTrade({
        memberId,
        orderId,
        trade,
        dbTransaction: t,
      });
      // if this order is in this environment
      if (order) {
        // 2. _insertTrades & _insertVouchers
        let result = await this._insertTradesRecord({
          memberId,
          orderId,
          trade,
          dbTransaction: t,
        });
        // 3. side === 'buy' ? _updateAccByBidTrade : _updateAccByAskTrade
        // if this trade does need update
        if (result) {
          if (trade.side === "buy")
            await this._updateAccByBidTrade({
              memberId,
              askCurr: order.ask,
              bidCurr: order.bid,
              orderState: updateOrder?.state || order?.state,
              trade,
              dbTransaction: t,
            });
          else
            await this._updateAccByAskTrade({
              memberId,
              askCurr: order.ask,
              bidCurr: order.bid,
              orderState: updateOrder?.state || order?.state,
              trade,
              dbTransaction: t,
            });
        }
        // 4. _updateOuterTradeStatus
        await this._updateOuterTradeStatus({
          id: trade.tradeId,
          exchangeCode: this.database.EXCHANGE[trade.source.toUpperCase()],
          status: 1,
          dbTransaction: t,
        });
        await t.commit();
      } else {
        await t.rollback();
      }
    } catch (error) {
      this.logger.error(`_processOuterTrade`, error);
      await t.rollback();
    }
    this.logger.log(
      `------------- [${this.constructor.name}] _processOuterTrade [END] -------------`
    );
  }

  async _processOuterTrades(exchange) {
    this.logger.log(`[${this.constructor.name}] _processOuterTrades`);
    // 1. get all records from outer_trades table &  fillter records if record.status === 5
    const outerTrades = await this.database.getOuterTrades(
      this.database.EXCHANGE[exchange.toUpperCase()],
      5
    );
    this.logger.log(`outerTrades`, outerTrades);
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
  _findMarket(instId) {
    return this.tidebitMarkets.find((m) => m.instId === instId);
  }
}

module.exports = ExchangeHubService;
