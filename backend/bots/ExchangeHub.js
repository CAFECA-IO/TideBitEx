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
    const okexOrderRes = await this.okexConnector.router('postPlaceOrder', { memberId, params, query, body });
    /* !!! HIGH RISK (start) !!! */
    // 1. find and lock account
    // 2. get orderData from body
    // 3. calculate balance value, locked value
    // 4. new order
    // 5. add account_version
    // 6. update account balance and locked
    if (okexOrderRes.success) {
      const t = await this.database.transaction();
      try {
        const account = await this.database.getAccountByMemberIdCurrency(memberId, orderData.currencyId, { dbTransaction: t});
        const amount = SafeMath.plus(account.balance, account.locked);

        // orderData.locked: locked value
        // orderData.balance: locked value * -1
        // orderData.absBalance: absolute value of balance
        const orderData = await this._getOrderData(body);

        const created_at = new Date().toISOString();
        const updated_at = created_at;
        const newAccount = {
          id: account.id,
          balance: SafeMath.plus(account.balance, orderData.balance),
          locked: SafeMath.plus(account.locked, orderData.locked),
        };

        const order = await this.database.insertOrder(
          orderData.bid,
          orderData.ask,
          orderData.currency,
          orderData.price,
          orderData.volume,
          orderData.volume,
          orderData.state,
          'NULL',
          orderData.type,
          memberId,
          created_at,
          updated_at,
          'NULL',
          'Web',
          orderData.ordType,
          orderData.locked,
          orderData.locked,
          '0',
          0,
          { dbTransaction: t }
        );

        await this.database.insertAccountVersion(
          memberId,
          account.id,
          this.database.REASON.ORDER_SUBMIT,
          orderData.absBalance,
          orderData.locked,
          '0',
          amount,
          order[0],
          this.database.MODIFIABLE_TYPE.ORDER,
          created_at,
          updated_at,
          account.currency,
          this.database.FUNC.LOCK_FUNDS,
          { dbTransaction: t }
        );
        await this.database.updateAccount(newAccount, { dbTransaction: t })
        await t.commit();
      } catch (error) {
        this.logger.error(error);
        await t.rollback();
      }
    }
    /* !!! HIGH RISK (end) !!! */
    return okexOrderRes;
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
  async postCancelOrder ({ params, query, body }) {
    return this.okexConnector.router('postCancelOrder', { params, query, body });
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
  }

  async _getOrderData(body) {
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
      price: body.px || 'DEFAULT',
      volume: body.sz,
      type: body.side === 'buy' ? this.database.TYPE.ORDER_BID : this.database.TYPE.ORDER_ASK,
      state: this.database.ORDER_STATE.WAIT,
      ordType: body.ordType,
      locked,
      balance,
      absBalance: locked,
      currencyId: body.side === 'buy' ? bid : ask,
    };
    return EthUsdtData;
  }
}

module.exports = ExchangeHub;
