const SupportedExchange = require("../../constants/SupportedExchange");
const SafeMath = require("../SafeMath");
const Utils = require("../Utils");

class ExchangeHubService {
  _timer;
  _lastSyncTime = 0;
  _syncInterval = 10 * 60 * 1000; // 10mins
  _maxInterval = 180 * 24 * 60 * 60 * 1000;
  _isStarted = false;

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

  // 到 new.tidebit.com 拿 DB 資料

  async garbageCollection(outerTrades) {
    for (let trade of outerTrades) {
      const date = new Date(trade.update_at);
      const timestamp = date.getTime();
      if (timestamp > this._maxInterval && parseInt(trade.status) === 1) {
        const t = await this.database.transaction();
        try {
          await this.database.deleteOuterTrade(trade, { dbTransaction: t });
          await t.commit();
        } catch (error) {
          this.logger.error(`deleteOuterTrade`, error);
          await t.rollback();
        }
      }
    }
  }

  start() {
    this.logger.log(`[${this.constructor.name}] start`);
    this.sync();
  }

  /**
   * ++TODO gc，#674
   * 每筆 outerTrade 只保留180天
   * outerTrade不能抓180天以前的資料
   * */

  async sync(exchange, force = false) {
    this.logger.log(
      `------------- [${this.constructor.name}] sync -------------`
    );
    const time = Date.now();
    this.logger.log(
      `time - this._lastSyncTime > this._syncInterval`,
      time - this._lastSyncTime > this._syncInterval
    );
    this.logger.log(`force`, force);
    this.logger.log(`this._isStarted`, this._isStarted);
    // 1. 定期（10mins）執行工作
    if (
      time - this._lastSyncTime > this._syncInterval ||
      force ||
      !this._isStarted
    ) {
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
    trade,
    market,
    dbTransaction,
  }) {
    // ex => ask:eth sell ask:eth => bid:usdt 增加 - (feeCcy bid:usdt) , decrease partial/all locked ask:eth
    this.logger.log(
      `------------- [${this.constructor.name}] _updateAccByAskTrade -------------`
    );
    let askAccBalDiff,
      askAccBal,
      askLocDiff,
      askLoc,
      bidAccBalDiff,
      bidAccBal,
      bidLocDiff,
      bidLoc,
      updateAskAccount,
      updateBidAccount;
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
       * 4.1 bidAccount: balanceDiff = SafeMath.minus(SafeMath.mult(trade.fillPx, trade.fillSz), SafeMath.mult(SafeMath.mult(trade.fillPx, trade.fillSz), market.ask.fee))
       * 4.2 bidAccount: balance = SafeMath.plus(bidAccount.balance, balanceDiff)
       * 4.3 bidAccount: lockedDiff  = 0
       * 4.4 bidAccount: locked = SafeMath.plus(bidAccount.locked, lockedDiff),
       * 4.5 update accountBook
       * 4.6 update DB
       */
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
      updateAskAccount = {
        balace: askAccBal,
        locked: askLoc,
        currency: market.ask.currency,
        total: SafeMath.plus(askAccBal, askLoc),
      };
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
        reason: this.database.REASON.STRIKE_SUB,
        fee: 0,
        modifiableId: trade.id,
        updateAt: new Date(parseInt(trade.ts)).toISOString(),
        fun: this.database.FUNC.UNLOCK_AND_SUB_FUNDS,
        dbTransaction,
      });
      // 4. calculate bidAccount balance change
      // 4.1 bidAccount: balanceDiff = SafeMath.minus(SafeMath.mult(trade.fillPx, trade.fillSz), trade.fee)
      bidAccBalDiff = SafeMath.minus(
        SafeMath.mult(trade.fillPx, trade.fillSz),
        SafeMath.mult(SafeMath.mult(trade.fillPx, trade.fillSz), market.ask.fee)
      );
      // 4.2 bidAccount: balance = SafeMath.plus(bidAccount.balance, balanceDiff)
      bidAccBal = SafeMath.plus(bidAccount.balance, bidAccBalDiff);
      // 4.3 bidAccount: lockedDiff  = 0
      bidLocDiff = 0;
      // 4.4 bidAccount: locked = SafeMath.plus(bidAccount.locked, lockedDiff),
      bidLoc = SafeMath.plus(bidAccount.locked, bidLocDiff);
      // ++ TODO 4.5 update accountBook
      updateBidAccount = {
        balace: bidAccBal,
        locked: bidLoc,
        currency: market.bid.currency,
        total: SafeMath.plus(bidAccBal, bidLoc),
      };
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
        reason: this.database.REASON.STRIKE_ADD,
        fee: SafeMath.abs(trade.fee),
        modifiableId: trade.id,
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
    return { updateAskAccount, updateBidAccount };
  }

  async _updateAccByBidTrade({
    memberId,
    askCurr,
    bidCurr,
    order,
    market,
    trade,
    dbTransaction,
  }) {
    this.logger.log(
      `------------- [${this.constructor.name}] _updateAccByBidTrade -------------`
    );
    // ex => bid:usdt buy ask:eth => decrease partial/all locked bid:usdt , ask:eth - (feeCcy ask:eth)增加
    let askAccBalDiff,
      askAccBal,
      askLocDiff,
      askLoc,
      bidAccBalDiff,
      bidAccBal,
      bidLocDiff,
      bidLoc,
      updateAskAccount,
      updateBidAccount;
    try {
      /**
       * !!! HIGH RISK (start) !!!
       * 1. get askAccount from table
       * 2. get bidAccount from table
       * 3. calculate askAccount balance change
       * 3.1 askAccount: SafeMath.minus(trade.fillSz, SafeMath.mult(trade.fillSz, market.bid.fee)); //++ TODO to be verify: is market.bid.fee || market.ask.fee need test (TideBit-Legacy config/markerts/markets.yml 裡 ask.fee 及 bid.fee 設定不一樣，使用 TideBit ticker 測試)
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
      //++ TODO to be verify: is market.bid.fee || market.ask.fee need test (TideBit-Legacy config/markerts/markets.yml 裡 ask.fee 及 bid.fee 設定不一樣，使用 TideBit ticker 測試)
      askAccBalDiff = SafeMath.minus(
        trade.fillSz,
        SafeMath.mult(trade.fillSz, market.bid.fee)
      );
      // 3.2 askAccount: balance = SafeMath.plus(askAccount.balance, balanceDiff)
      askAccBal = SafeMath.plus(askAccount.balance, askAccBalDiff);
      // 3.3 askAccount: lockedDiff = 0
      askLocDiff = 0;
      // 3.4 askAccount: locked = SafeMath.plus(askAccount.locked, lockedDiff),
      askLoc = SafeMath.plus(askAccount.locked, askLocDiff);
      // ++ TODO 3.5 update accountBook
      updateAskAccount = {
        balace: askAccBal,
        locked: askLoc,
        currency: market.ask.currency,
        total: SafeMath.plus(askAccBal, askLoc),
      };
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
        reason: this.database.REASON.STRIKE_ADD,
        fee: SafeMath.abs(trade.fee),
        modifiableId: trade.id,
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
        SafeMath.mult(order.price, trade.fillSz),
        "-1"
      );
      // 4.2 bidAccount: locked = SafeMath.plus(bidAccount.locked, lockedDiff),
      // ++ TODO if bidLoc < 0 ,!!! alert , systemError send email to all admins
      bidLoc = SafeMath.plus(bidAccount.locked, bidLocDiff);
      // ++ TODO 4.5 update accountBook
      updateBidAccount = {
        balace: bidAccBal,
        locked: bidLoc,
        currency: market.bid.currency,
        total: SafeMath.plus(bidAccBal, bidLoc),
      };
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
        reason: this.database.REASON.STRIKE_SUB,
        fee: 0,
        modifiableId: trade.id,
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
    return { updateAskAccount, updateBidAccount };
  }

  async _insertVouchers({ memberId, orderId, trade, market, dbTransaction }) {
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
    /**
     * ++ TODO
     * fee 也要根據用戶的等級來收，#672
     */
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
        trade.side === "sell"
          ? SafeMath.mult(
              SafeMath.mult(trade.fillPx, trade.fillSz),
              market.ask.fee
            )
          : "0", //ask_fee
        trade.side === "buy"
          ? SafeMath.mult(trade.fillSz, market.bid.fee)
          : "0", //bid_fee
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

  async insertTrades({ memberId, orderId, market, trade, dbTransaction }) {
    this.logger.log(
      `------------- [${this.constructor.name}] insertTrades -------------`
    );
    /* !!! HIGH RISK (start) !!! */
    // 1. insert Vouchers to DB
    let id, _trade;
    this.logger.log(`market`, market);
    if (!market) throw Error(`market not found`);
    _trade = {
      price: trade.fillPx,
      volume: trade.fillSz,
      ask_id: trade.side === "sell" ? orderId : null,
      bid_id: trade.side === "buy" ? orderId : null,
      trend: null,
      currency: market.code,
      created_at: new Date(parseInt(trade.ts)).toISOString(),
      updated_at: new Date(parseInt(trade.ts)).toISOString(),
      ask_member_id: trade.side === "sell" ? memberId : this.systemMemberId,
      bid_member_id: trade.side === "buy" ? memberId : this.systemMemberId,
      funds: SafeMath.mult(trade.fillPx, trade.fillSz),
      trade_fk: trade.tradeId,
    };
    try {
      id = await this.database.insertTrades(_trade, { dbTransaction });
    } catch (error) {
      this.logger.error(`insertVouchers`, error);
      throw error;
    }
    this.logger.log(
      `------------- [${this.constructor.name}] insertTrades [END] -------------`
    );
    _trade = {
      ..._trade,
      id,
      tid: id,
      type: trade.side === "sell" ? "ask" : "bid",
      date: trade.ts,
      amount: trade.fillSz,
      market: market.id,
      at: parseInt(SafeMath.div(trade.ts, "1000")),
      ts: trade.ts,
    };
    return _trade;
  }

  async _insertTradesRecord({
    memberId,
    orderId,
    market,
    trade,
    dbTransaction,
  }) {
    let insertTradesResult, insertVouchersResult, newTrade, _trade;
    this.logger.log(
      `------------- [${this.constructor.name}] _insertTradesRecord -------------`
    );
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
          market,
          dbTransaction,
        });
        this.logger.log(`_insertTrades result`, insertTradesResult);
        // 3. insert voucher to DB
        insertVouchersResult = await this._insertVouchers({
          memberId,
          orderId,
          trade: { ...trade, id: insertTradesResult.id },
          market,
          dbTransaction,
        });
        this.logger.log(`insertVouchers result`, insertVouchersResult);
        newTrade = insertTradesResult;
      } else {
        this.logger.log(`this trade is already exist`);
      }
    } catch (error) {
      this.logger.error(`_insertTradesRecord`, error);
      throw error;
    }
    this.logger.log(`_insertTradesRecord result`, insertVouchersResult);
    this.logger.log(
      `------------- [${this.constructor.name}] _insertTradesRecord [END]-------------`
    );
    return newTrade;
  }

  async _updateOrderbyTrade({ memberId, orderId, trade, dbTransaction }) {
    this.logger.log(
      `------------- [${this.constructor.name}] _updateOrderbyTrade -------------`
    );
    let _order,
      _updateOrder,
      state,
      state_text = "Waiting",
      filled = false,
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
            : SafeMath.plus(_order.funds_received, value); //++ TODO to be verify: 使用 TideBit ticker 測試)
        tradesCount = SafeMath.plus(_order.trades_count, "1");
        if (SafeMath.eq(volume, "0")) {
          state = this.database.ORDER_STATE.DONE;
          state_text = "Done";
          filled = true;
          locked = "0"; //++ TODO to be verify: 使用 TideBit ticker 測試)
        }
        _updateOrder = {
          id: _order.id,
          volume,
          state,
          locked,
          funds_received: fundsReceived,
          trades_count: tradesCount,
          // update_at: updateAt,
        };
        /* !!! HIGH RISK (start) !!! */
        // update order data from table
        await this.database.updateOrder(_updateOrder, { dbTransaction });
        _updateOrder = {
          ..._order,
          ..._updateOrder,
          kind: trade.side === "buy" ? "bid" : "ask",
          clOrdId: trade.clOrdId,
          at: parseInt(SafeMath.div(trade.ts, "1000")),
          ts: parseInt(trade.ts),
          state_text,
          ordType: _order.ord_type,
          filled,
        };
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
    this.logger.log(`_updateOrder[FOR UI]`, _updateOrder);
    return { updateOrder: _updateOrder, order: _order };
  }

  /**
   * - id: xpaeth
       code: 18
       name: XPA/ETH
       base_unit: xpa
       quote_unit: eth
       bid: {fee: 0.001, currency: eth, fixed: 8, hero_fee: 0, vip_fee: 0.001}
       ask: {fee: 0.002, currency: xpa, fixed: 2, hero_fee: 0, vip_fee: 0.001}
       sort_order: 7
       tab_category: alts
       price_group_fixed: 8
       primary: true
   * order=64: price = 101 eth bid 1 xpa => locked 101 eth
   * account_version=155: reason = 600(=ORDER_SUBMIT), balance = -101, locked = 101 modified_id = 64 , modified_type = Order, currency = 3(=eth), fun = 2(LOCK_FUNDS)
   * order=65: price = 100 eth ask 0.01 xpa => locked 0.01 eth
   * account_version=156: reason = 600(=ORDER_SUBMIT), balance = -0.01, locked = 0.01 modified_id = 65 , modified_type = Order, currency = 9(=xpa), fun = 2(LOCK_FUNDS)
   * trade=153:  price = 101, volume = 0.01, ask=65, bid=64, trend = 1, currency=18, ask_member_id=65538, bid_member_id = 65538, funds = 1.01
   * order=64: bid=3, ask=9, currency=18, price = 101, volume = 0.99, origin_volume = 1, state = 100, type = OrderBid, member_id = 65538, locked = 99.9900000000000000, origin_locked = 101.0000000000000000, fund_receive= 0.0100000000000000,
   * order=65: bid=3, ask=9, currency=18, price = 100, volume = 0, origin_volume = 0.01, state = 200, type = OrderAsk, member_id = 65538, locked = 0.0000000000000000, origin_locked = 0.0100000000000000, fund_receive = 1.0100000000000000, 
   * vouchers=33: member_id = 65538, order_id = 64, trade_id = 153, ask = xpa, bid = eth, price = 101, volume = 0.01, value = 1.01, trend = bid, ask_fee = 0, bid_fee = 0.00001(fillSz*bid.feeRate),
   * vouchers=34: member_id = 65538, order_id = 65, trade_id = 153, ask = xpa, bid = eth, price = 101, volume = 0.01, value = 1.01, trend = ask, ask_fee = 0.0020200000000000 , bid_fee = 0,
   * --- order=64,vouchers=33,trend:bid, bid:xpa, fee:xpa(fillSz*bid.feeRate)
   * account_version=158: eth, reason= 120(STRIKE_SUB: 120),  balance = 0, locked = -1.01(fillPx:101, fillSz: 0.01), fee = 0, modified_id = 153, modified_type = trade, currency = 3, fuc = 5(UNLOCK_AND_SUB_FUNDS: 5)
   * account_version=159: xpa, reason= 110(STRIKE_ADD: 110),  balance = 0.00999(fillSz - fee), locked = 0, fee = 0.00001(same as: voucher=33, fillSz:0.01, bid.fee: 0.001), modified_id = 153, modified_type = trade, currency = 9, fuc = 3PLUS_FUNDS: 3)
   * --- order=65,vouchers=34,trend:ask, ask:xpa, fee:eth
   * account_version=160: xpa, reason= 120(STRIKE_SUB: 120),  balance = 0, locked = -0.01, fee = 0, modified_id = 153, modified_type = trade, currency = 9, fuc = 5(UNLOCK_AND_SUB_FUNDS: 5)
   * account_version=161: eth, reason= 110(STRIKE_ADD: 110),  balance = 1.00798, locked = 0, fee = 0.00202(same as: voucher=34, fillPx:101* fillSz: 0.01* ask.fee: 0.001), modified_id = 153, modified_type = trade, currency = 3, fuc = 3(PLUS_FUNDS: 3)
   * account=3,memberId=65538: balance = 898.9737600000000000, locked = 99.9910000000000000
   * account=9,memberId=65538: balance = 999.9996300000000000, locked = 0.0100000000000000
   */
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
    let tmp,
      memberId,
      orderId,
      market,
      order,
      resultOnOrderUpdate,
      updateOrder,
      newTrade,
      resultOnAccUpdate,
      updateAskAccount,
      updateBidAccount;
    // 1. parse  memberId, orderId from trade.clOrdId
    try {
      tmp = Utils.parseClOrdId(trade.clOrdId);
    } catch (error) {
      this.logger.log(`trade`, trade);
      this.logger.error(`Utils.parseClOrdId error`, error);
      tmp = null;
    }
    if (tmp) {
      market = this._findMarket(trade.instId);
      memberId = tmp.memberId;
      orderId = tmp.orderId;
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
        resultOnOrderUpdate = await this._updateOrderbyTrade({
          memberId,
          orderId,
          trade,
          dbTransaction: t,
        });
        order = resultOnOrderUpdate?.order;
        updateOrder = resultOnOrderUpdate?.updateOrder;
        // if this order is in this environment
        if (order) {
          // 2. _insertTrades & _insertVouchers
          newTrade = await this._insertTradesRecord({
            memberId,
            orderId,
            market,
            trade,
            dbTransaction: t,
          });
          // 3. side === 'buy' ? _updateAccByBidTrade : _updateAccByAskTrade
          // if this trade does need update
          if (newTrade) {
            if (trade.side === "buy")
              resultOnAccUpdate = await this._updateAccByBidTrade({
                memberId,
                market,
                order,
                askCurr: order.ask,
                bidCurr: order.bid,
                trade: { ...trade, id: newTrade.id },
                dbTransaction: t,
              });
            else
              resultOnAccUpdate = await this._updateAccByAskTrade({
                memberId,
                market,
                askCurr: order.ask,
                bidCurr: order.bid,
                trade: { ...trade, id: newTrade.id },
                dbTransaction: t,
              });
            updateAskAccount = resultOnAccUpdate.updateAskAccount;
            updateBidAccount = resultOnAccUpdate.updateBidAccount;
          }
          /**
           * ++ TODO，要開票
           * 1. 記錄 tidebit 要付給 okex 的 手續費 或是 tidebit 從 okex 收到的 手續費
           * 2. 根據 member 的推薦人發送獎勵 （抽成比例由 DB 裡面記錄 member 的方案來確認 (
           *     referral_commissions
           *     commission_plans
           *     commission_policies)
           *    ）
           */
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
    return {
      memberId,
      instId: trade.instId,
      market,
      updateOrder,
      newTrade,
      updateAskAccount,
      updateBidAccount,
    };
  }

  async _processOuterTrades(exchange) {
    this.logger.log(`[${this.constructor.name}] _processOuterTrades`);
    // 1. get all records from outer_trades table &  fillter records if record.status === 5
    const outerTrades = await this.database.getOuterTrades(
      this.database.EXCHANGE[exchange.toUpperCase()],
      5
    );
    if (Math.random() < 0.01) {
      this.garbageCollection(outerTrades);
    }
    this.logger.log(`outerTrades`, outerTrades);
    // 2. _processOuterTrade
    for (let trade of outerTrades) {
      await this._processOuterTrade(JSON.parse(trade.data));
    }
  }

  async _insertOuterTrade(outerTrade) {
    this.logger.log(
      `------------- [${this.constructor.name}] _insertOuterTrade -------------`
    );
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
    this.logger.log(
      `------------- [${this.constructor.name}] _insertOuterTrade [END] -------------`
    );
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
    this.logger.log(
      `------------- [${this.constructor.name}] _getOuterTradesFromAPI --------------`
    );
    let outerTrades;
    switch (exchange) {
      case SupportedExchange.OKEX:
      default:
        let okexRes;
        if (!this._isStarted) {
          this.logger.log(`fetchTradeFillsHistoryRecords`);
          okexRes = await this.okexConnector.router(
            "fetchTradeFillsHistoryRecords",
            {
              query: {
                instType: "SPOT",
                before: Date.now() - this._maxInterval,
              },
            }
          );
          this._isStarted = true;
        } else {
          this.logger.log(`fetchTradeFillsRecords`);
          okexRes = await this.okexConnector.router("fetchTradeFillsRecords", {
            query: {
              instType: "SPOT",
              before: Date.now() - this._maxInterval,
            },
          });
        }
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
