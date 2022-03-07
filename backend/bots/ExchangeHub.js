const path = require('path');
const redis = require('redis');

const Bot = require(path.resolve(__dirname, 'Bot.js'));
const OkexConnector = require('../libs/Connectors/OkexConnector');
const ResponseFormat = require('../libs/ResponseFormat');
const Codes = require('../constants/Codes');
const EventBus = require('../libs/EventBus');
const Events = require('../constants/Events');
const SafeMath = require('../libs/SafeMath');
const Utils = require('../libs/Utils');

class ExchangeHub extends Bot {
  constructor() {
    super();
    this.name = 'ExchangeHub';
  }

  init({ config, database, logger, i18n }) {
    return super.init({ config, database, logger, i18n })
      .then(async() => {
        this.okexConnector = new OkexConnector({ logger });
        await this.okexConnector.init({
          domain: this.config.okex.domain,
          apiKey: this.config.okex.apiKey,
          secretKey: this.config.okex.secretKey,
          passPhrase: this.config.okex.passPhrase,
          brokerId: this.config.okex.brokerId,
          wssPublic: this.config.okex.wssPublic,
          wssPrivate: this.config.okex.wssPrivate,
        })
      })
      .then(() => this);
  }

  async start() {
    await super.start();
    await this.okexConnector.start();
    this._eventListener();
    return this;
  }

  async getMemberIdFromRedis(peatioSession) {
    const client = redis.createClient({
      url: this.config.redis.domain
    });

    client.on('error', (err) => console.log('Redis Client Error', err));

    try {
      await client.connect();   // 會因為連線不到卡住
      const value = await client.get(
        redis.commandOptions({ returnBuffers: true }),
        peatioSession
        );
      await client.quit();
      console.log('getMemberIdFromRedis peatioSession', peatioSession);
      console.log('getMemberIdFromRedis value', value);
      // ++ TODO: 下面補error handle
      const split1 = value.toString('latin1').split('member_id\x06:\x06EFi\x02');
      const memberIdLatin1 = split1[1].split('I"')[0];
      const memberIdString = Buffer.from(memberIdLatin1, 'latin1').reverse().toString('hex');
      const memberId = parseInt(memberIdString, 16);
      console.log('memberId', memberIdString, memberId);
      return memberId;
    } catch (error) {
      console.log(error)
      await client.quit();
      return -1;
    }
  }

  // account api
  async getBalance({ token, params, query }) {
    try {
      const memberId = await this.getMemberIdFromRedis(token);
      if (memberId === -1) throw new Error('get member_id fail');
      const accounts = await this.database.getBalance(memberId);
      const jobs = accounts.map((acc) => this.database.getCurrency(acc.currency));
      const currencies = await Promise.all(jobs);

      const details = accounts.map((account, i) => ({
        ccy: currencies[i].key.toUpperCase(),
        availBal: Utils.removeZeroEnd(account.balance),
        cashBal: SafeMath.plus(account.balance, account.locked),
        frozenBal: Utils.removeZeroEnd(account.locked),
        uTime: new Date(account.updated_at).getTime(),
        availEq: Utils.removeZeroEnd(account.balance),
      }));

      const payload = [
        {
          details,
        }
      ]

      return new ResponseFormat({
        message: 'getBalance',
        payload,
      });
    } catch (error) {
      this.logger.error(error);
      const message = error.message;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
    // return this.okexConnector.router('getBalance', { memberId: null, params, query });
  }
  // account api end
  // market api
  async getTickers({ params, query }) {
    return this.okexConnector.router('getTickers', { params, query });
  }

  async getOrderBooks({ params, query }) {
    return this.okexConnector.router('getOrderBooks', { params, query });
  }

  async getCandlesticks({ params, query }) {
    return this.okexConnector.router('getCandlesticks', { params, query });
  }

  async getTrades({ params, query }) {
    return this.okexConnector.router('getTrades', { params, query });
  }
  // market api end
  // trade api
  async postPlaceOrder ({ params, query, body, token }) {
    const memberId = await this.getMemberIdFromRedis(token);
    if (memberId === -1) {
      return new ResponseFormat({
        message: 'member_id not found',
        code: Codes.MEMBER_ID_NOT_FOUND,
      });
    }
    /* !!! HIGH RISK (start) !!! */
    // 1. find and lock account
    // 2. get orderData from body
    // 3. calculate balance value, locked value
    // 4. new order
    // 5. add account_version
    // 6. update account balance and locked
    // 7. post okex placeOrder
    const t = await this.database.transaction();
    try {
      
      /*******************************************
       * body.side: order is 'buy' or 'sell'
       * orderData.price: body.px, price value
       * orderData.volume: body.sz, volume value
       * orderData.locked:
       *   if body.side === 'buy', locked = body.px * body.sz
       *   if body.side === 'sell', locked = body.sz
       * 
       * orderData.balance: locked value * -1
       *******************************************/
      
      const orderData = await this._getPlaceOrderData(body);
      const account = await this.database.getAccountByMemberIdCurrency(memberId, orderData.currencyId, { dbTransaction: t});
      const price = orderData.price;
      const volume = orderData.volume;
      const locked = orderData.locked;
      const balance = orderData.balance;
      const fee = '0';

      const created_at = new Date().toISOString();
      const updated_at = created_at;

      const order = await this.database.insertOrder(
        orderData.bid,
        orderData.ask,
        orderData.currency,
        price,
        volume,
        volume,
        this.database.ORDER_STATE.WAIT,
        null,
        orderData.type,
        memberId,
        created_at,
        updated_at,
        null,
        'Web',
        orderData.ordType,
        locked,
        locked,
        '0',
        0,
        { dbTransaction: t }
      );
      const orderId = order[0];

      await this._updateAccount(account, t, balance, locked, fee, this.database.MODIFIABLE_TYPE.ORDER, orderId, created_at, this.database.FUNC.LOCK_FUNDS);

      const okexOrderRes = await this.okexConnector.router('postPlaceOrder', { memberId, orderId, params, query, body });
      if (!okexOrderRes.success) {
        await t.rollback();
        return okexOrderRes;
      }
      await t.commit();
      return okexOrderRes;
    } catch (error) {
      this.logger.error(error);
      await t.rollback();
      return new ResponseFormat({
        message: error.message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
    /* !!! HIGH RISK (end) !!! */
  }

  async getOrderList ({ params, query, token }) {
    const memberId = await this.getMemberIdFromRedis(token);
    if (memberId === -1) {
      return new ResponseFormat({
        message: 'member_id not found',
        code: Codes.MEMBER_ID_NOT_FOUND,
      });
    }
    const res = await this.okexConnector.router('getOrderList', { params, query });
    const list = res.payload;
    if (Array.isArray(list)) {
      const newList = list.filter((order) => order.clOrdId.includes(`${memberId}m`));   // 可能發生與brokerId, randomId碰撞
      res.payload = newList;
    }
    return res;
  }
  async getOrderHistory ({ params, query, token }) {
    const memberId = await this.getMemberIdFromRedis(token);
    if (memberId === -1) {
      return new ResponseFormat({
        message: 'member_id not found',
        code: Codes.MEMBER_ID_NOT_FOUND,
      });
    }
    const res = await this.okexConnector.router('getOrderHistory', { params, query });
    const list = res.payload;
    if (Array.isArray(list)) {
      const newList = list.filter((order) => order.clOrdId.includes(`${memberId}m`));   // 可能發生與brokerId, randomId碰撞
      res.payload = newList;
    }
    return res;
  }
  async postCancelOrder ({ params, query, body, token }) {
    const memberId = await this.getMemberIdFromRedis(token);

    /* !!! HIGH RISK (start) !!! */
    // 1. get orderId from body
    // 2. get order data from table
    // 3. find and lock account
    // 4. update order state
    // 5. get balance and locked value from order
    // 6. add account_version
    // 7. update account balance and locked
    // 8. post okex cancel order
    const t = await this.database.transaction();
    try {
      // get orderId from body.clOrdId
      const { orderId } = Utils.parseClOrdId(body.clOrdId);
      const order = await this.database.getOrder(orderId, { dbTransaction: t });
      if (order.state !== this.database.ORDER_STATE.WAIT) {
        await t.rollback();
        return new ResponseFormat({
          code: Codes.ORDER_HAS_BEEN_CLOSED,
          message: 'order has been close',
        })
      }
      const currencyId = order.type === this.database.TYPE.ORDER_ASK ? order.ask : order.bid;
      const account = await this.database.getAccountByMemberIdCurrency(memberId, currencyId, { dbTransaction: t});

      /*******************************************
       * body.clOrdId: custom orderId for okex
       * locked: value from order.locked, used for unlock balance, negative in account_version
       * balance: order.locked
       *******************************************/
      const newOrder = {
        id: orderId,
        state: this.database.ORDER_STATE.CANCEL,
      }
      const locked = SafeMath.mult(order.locked, '-1');
      const balance = order.locked;
      const fee = '0';

      const created_at = new Date().toISOString();

      await this.database.updateOrder(newOrder, { dbTransaction: t });

      await this._updateAccount(account, t, balance, locked, fee, this.database.MODIFIABLE_TYPE.ORDER, orderId, created_at, this.database.FUNC.UNLOCK_FUNDS);

      const okexCancelOrderRes = await this.okexConnector.router('postCancelOrder', { params, query, body });
      if (!okexCancelOrderRes.success) {
        await t.rollback();
        return okexCancelOrderRes;
      }
      await t.commit();
      return okexCancelOrderRes;
    } catch (error) {
      this.logger.error(error);
      await t.rollback();
      return new ResponseFormat({
        message: error.message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
    /* !!! HIGH RISK (end) !!! */
  }
  // trade api end

  // public api
  async getInstruments ({ params, query }) {
    return this.okexConnector.router('getInstruments', { params, query });
  }
  // public api end

  async _eventListener() {
    EventBus.on(Events.tradeDataOnUpdate, (instId, tradeData) => {
      this.broadcast(
        instId,
        {
          type: Events.tradeDataOnUpdate,
          data: tradeData,
        }
      )
    });

    EventBus.on(Events.orderOnUpdate, (instId, booksData) => {
      this.broadcast(
        instId,
        {
          type: Events.orderOnUpdate,
          data: booksData,
        }
      )
    });

    EventBus.on(Events.candleOnUpdate, (instId, formatCandle) => {
      this.broadcast(
        instId,
        {
          type: Events.candleOnUpdate,
          data: formatCandle,
        }
      )
    });

    EventBus.on(Events.pairOnUpdate, (formatPair) => {
      this.broadcastAllClient(
        {
          type: Events.pairOnUpdate,
          data: formatPair,
        }
      )
    });

    EventBus.on(Events.orderDetailUpdate, async(instType, formatOrders) => {
      if (instType === 'SPOT') {
        // TODO: using message queue
        for(const formatOrder of formatOrders) {
          if (formatOrder.state !== 'canceled' /* cancel order */ && formatOrder.accFillSz !== '0'/* create order */) {
            await this._updateOrderDetail(formatOrder);
          }
        }
      }
    });
  }

  async _updateOrderDetail(formatOrder) {
    const t = await this.database.transaction();
    /* !!! HIGH RISK (start) !!! */
    // 1. get orderId from body
    // 2. get order data from table
    // 3. find and lock account
    // 4. update order state
    // 5. get balance and locked value from order
    // 6. add trade
    // 7. add vouchers
    // 8. add account_version
    // 9. update account balance and locked
    try {
      // get orderId from formatOrder.clOrdId
      const { memberId, orderId } = Utils.parseClOrdId(formatOrder.clOrdId);
      const order = await this.database.getOrder(orderId, { dbTransaction: t });
      if (order.state !== this.database.ORDER_STATE.WAIT) {
        await t.rollback();
        this.logger.error('order has been closed');
      }
      const currencyId = order.type === this.database.TYPE.ORDER_ASK ? order.ask : order.bid;
      const accountAsk = await this.database.getAccountByMemberIdCurrency(memberId, currencyId, { dbTransaction: t });
      const accountBid = await this.database.getAccountByMemberIdCurrency(memberId, currencyId, { dbTransaction: t });

      /*******************************************
       * formatOrder.clOrdId: custom orderId for okex
       * formatOrder.state: 'live', 'canceled', 'filled', 'partially_filled', but 'cancel' may not enter this function
       * lockedA: Ask locked value, 
       * balanceA: formatOrder.fillSz
       *******************************************/
      let state = this.database.ORDER_STATE.WAIT;
      if (formatOrder.state === 'filled') {
        state = this.database.ORDER_STATE.DONE;
      }
      const newOrder = {
        id: orderId,
        state,
      }
      // const lockedA = ;
      // const balanceA = formatOrder.fillSz;

      const created_at = new Date().toISOString();
      const updated_at = created_at;
      
      // !!!!!! CAUTION temp for demo, still not finish !!!!!!!
      await this.database.insertVouchers(
        memberId,
        orderId,
        formatOrder.tradeId,
        null,
        'eth',    // -- need change
        'usdt',   // -- need change
        formatOrder.fillPx,
        formatOrder.fillSz,
        SafeMath.mult(formatOrder.fillPx, formatOrder.fillSz),
        order.type === this.database.TYPE.ORDER_ASK ? 'ask' : 'bid',
        order.type === this.database.TYPE.ORDER_ASK ? formatOrder.fee : '0',
        order.type === this.database.TYPE.ORDER_ASK ? '0' : formatOrder.fee,
        created_at,
        { dbTransaction: t }
      )

      await t.commit();
    } catch (error) {
      this.logger.error(error);
      await t.rollback();
    }
    /* !!! HIGH RISK (end) !!! */
  }

  async _getPlaceOrderData(body) {
    // ++ TODO: get data by instId
    // -- temp for demo
    const bid = 34; // USDT
    const ask = 3;  // ETH
    const currency = -1;   // it doesn't in markets.yml
    const locked = body.side === 'buy' ? SafeMath.mult(body.px, body.sz) : body.sz;
    const balance = SafeMath.mult(locked, '-1');

    const EthUsdtData = {
      bid, 
      ask,
      currency,
      price: body.px || null,
      volume: body.sz,
      type: body.side === 'buy' ? this.database.TYPE.ORDER_BID : this.database.TYPE.ORDER_ASK,
      ordType: body.ordType,
      locked,
      balance,
      currencyId: body.side === 'buy' ? bid : ask,
    };
    return EthUsdtData;
  }

  async _updateAccount(account, dbTransaction, balance, locked, fee, modifiable_type, modifiable_id, created_at, fun) {
    /* !!! HIGH RISK (start) !!! */
    const updated_at = created_at;
    const oriAccBal = account.balance;
    const oriAccLoc = account.locked;
    const newAccBal = SafeMath.plus(oriAccBal, balance);
    const newAccLoc = SafeMath.plus(oriAccLoc, locked);
    const amount = SafeMath.plus(newAccBal, newAccLoc);
    const newAccount = {
      id: account.id,
      balance: newAccBal,
      locked: newAccLoc,
    };

    await this.database.insertAccountVersion(
      account.member_id,
      account.id,
      this.database.REASON.ORDER_CANCEL,
      balance,
      locked,
      fee,
      amount,
      modifiable_id,
      modifiable_type,
      created_at,
      updated_at,
      account.currency,
      fun,
      { dbTransaction }
    );

    await this.database.updateAccount(newAccount, { dbTransaction });
    /* !!! HIGH RISK (end) !!! */
  }
}

module.exports = ExchangeHub;
