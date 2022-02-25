const axios = require('axios');
const crypto = require('crypto');
const dvalue = require('dvalue');

const ResponseFormat = require('../ResponseFormat');
const Codes = require('../../constants/Codes');
const ConnectorBase = require('../ConnectorBase');
const WebSocket = require('../WebSocket');
const EventBus = require('../EventBus');
const Events = require('../../constants/Events');
const SafeMath = require('../SafeMath');

const HEART_BEAT_TIME = 25000;

class OkexConnector extends ConnectorBase {
  constructor ({ logger }) {
    super({ logger });
    this.websocket = new WebSocket({ logger });
    return this;
  }

  async init({ domain, apiKey, secretKey, passPhrase, brokerId, wssPublic }) {
    await super.init();
    this.domain = domain;
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.passPhrase = passPhrase;
    this.brokerId = brokerId;
    this.okexWsChannels = {};
    await this.websocket.init({ url: wssPublic, heartBeat: HEART_BEAT_TIME});
    return this;
  };

  async start() {
    this._okexWsEventListener();
    this._subscribeInstruments();
  }

  async okAccessSign({ timeString, method, path, body }) {
    const msg = timeString + method + path + (JSON.stringify(body) || '');
    this.logger.debug('okAccessSign msg', msg);

    const cr = crypto.createHmac('sha256', this.secretKey);
    const signMsg = cr.update(msg).digest('base64');
    this.logger.debug('okAccessSign signMsg', signMsg);
    return signMsg;
  }

  getHeaders(needAuth, params = {}) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (needAuth) {
      const {timeString, okAccessSign} = params;
      headers['OK-ACCESS-KEY'] = this.apiKey;
      headers['OK-ACCESS-SIGN'] = okAccessSign;
      headers['OK-ACCESS-TIMESTAMP'] = timeString;
      headers['OK-ACCESS-PASSPHRASE'] = this.passPhrase;
    }
    return headers;
  }

  // account api
  async getBalance({ query }) {
    const method = 'GET';
    const path = '/api/v5/account/balance';
    const { ccy } = query;

    const arr = [];
    if (ccy) arr.push(`ccy=${ccy}`);
    const qs = (!!arr.length) ?  `?${arr.join('&')}` : '';

    const timeString = new Date().toISOString();

    const okAccessSign = await this.okAccessSign({ timeString, method, path: `${path}${qs}` });

    try {
      const res = await axios({
        method: method.toLocaleLowerCase(),
        url: `${this.domain}${path}${qs}`,
        headers: this.getHeaders(true, {timeString, okAccessSign}),
      });
      this.logger.debug(res.data);
      if (res.data && res.data.code !== '0') {
        this.logger.trace(res.data.msg);
        return new ResponseFormat({
          message: res.data.msg,
          code: Codes.THIRD_PARTY_API_ERROR,
        });
      }
      console.log('res.data.data', res.data.data);
      const payload = res.data.data.map((data) => {
        const details = data.details.map((dtl) => {
          return {
            ...dtl,
            uTime: parseInt(dtl.uTime),
          }
        });
        return {
          ...data,
          details,
          uTime: parseInt(data.uTime),
        }
      });
      return new ResponseFormat({
        message: 'getBalance',
        payload,
      });
    } catch (error) {
      this.logger.error(error);
      let message = error.message;
      if (error.response && error.response.data) message = error.response.data.msg;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }
  // account api end
  // market api
  async getTickers({ query }) {
    const method = 'GET';
    const path = '/api/v5/market/tickers';
    const { instType, uly } = query;

    const arr = [];
    if (instType) arr.push(`instType=${instType}`);
    if (uly) arr.push(`uly=${uly}`);
    const qs = (!!arr.length) ?  `?${arr.join('&')}` : '';

    try {
      const res = await axios({
        method: method.toLocaleLowerCase(),
        url: `${this.domain}${path}${qs}`,
        headers: this.getHeaders(false),
      });
      if (res.data && res.data.code !== '0') {
        this.logger.trace(res.data.msg);
        return new ResponseFormat({
          message: res.data.msg,
          code: Codes.THIRD_PARTY_API_ERROR,
        });
      }

      const payload = res.data.data.map((data) => {
        return {
          ...data,
          ts: parseInt(data.ts),
        }
      })
      return new ResponseFormat({
        message: 'getTickers',
        payload,
      });
    } catch (error) {
      this.logger.error(error);
      let message = error.message;
      if (error.response && error.response.data) message = error.response.data.msg;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }

  async getOrderBooks({ query }) {
    const method = 'GET';
    const path = '/api/v5/market/books';
    const { instId, sz } = query;

    const arr = [];
    if (instId) arr.push(`instId=${instId}`);
    if (sz) arr.push(`sz=${sz}`);
    const qs = (!!arr.length) ?  `?${arr.join('&')}` : '';

    try {
      const res = await axios({
        method: method.toLocaleLowerCase(),
        url: `${this.domain}${path}${qs}`,
        headers: this.getHeaders(false),
      });
      if (res.data && res.data.code !== '0') {
        this.logger.trace(res.data.msg);
        return new ResponseFormat({
          message: res.data.msg,
          code: Codes.THIRD_PARTY_API_ERROR,
        });
      }
      const payload = res.data.data.map((data) => {
        return {
          ...data,
          ts: parseInt(data.ts)
        }
      })
      return new ResponseFormat({
        message: 'getOrderBooks',
        payload,
      });
    } catch (error) {
      this.logger.error(error);
      let message = error.message;
      if (error.response && error.response.data) message = error.response.data.msg;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }

  async getCandlesticks({ query }) {
    const method = 'GET';
    const path = '/api/v5/market/candles';
    const { instId, bar, after, before, limit } = query;

    const arr = [];
    if (instId) arr.push(`instId=${instId}`);
    if (bar) arr.push(`bar=${bar}`);
    if (after) arr.push(`after=${after}`);
    if (before) arr.push(`before=${before}`);
    if (limit) arr.push(`limit=${limit}`);
    const qs = (!!arr.length) ?  `?${arr.join('&')}` : '';

    try {
      const res = await axios({
        method: method.toLocaleLowerCase(),
        url: `${this.domain}${path}${qs}`,
        headers: this.getHeaders(false),
      });
      if (res.data && res.data.code !== '0') {
        this.logger.trace(res.data.msg);
        return new ResponseFormat({
          message: res.data.msg,
          code: Codes.THIRD_PARTY_API_ERROR,
        });
      }

      const payload = res.data.data.map((data) => {
        const ts = data.shift();
        return [
          parseInt(ts),
          ...data,
        ]
      })
      return new ResponseFormat({
        message: 'getCandlestick',
        payload,
      });
    } catch (error) {
      this.logger.error(error);
      let message = error.message;
      if (error.response && error.response.data) message = error.response.data.msg;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }

  async getTrades({ query }) {
    const method = 'GET';
    const path = '/api/v5/market/trades';
    const { instId, limit } = query;

    const arr = [];
    if (instId) arr.push(`instId=${instId}`);
    if (limit) arr.push(`limit=${limit}`);
    const qs = (!!arr.length) ?  `?${arr.join('&')}` : '';

    try {
      const res = await axios({
        method: method.toLocaleLowerCase(),
        url: `${this.domain}${path}${qs}`,
        headers: this.getHeaders(false),
      });
      if (res.data && res.data.code !== '0') {
        this.logger.trace(res.data.msg);
        return new ResponseFormat({
          message: res.data.msg,
          code: Codes.THIRD_PARTY_API_ERROR,
        });
      }

      const payload = res.data.data.map((data) => {
        return {
          ...data,
          ts: parseInt(data.ts),
        }
      })
      return new ResponseFormat({
        message: 'getTrades',
        payload,
      });
    } catch (error) {
      this.logger.error(error);
      let message = error.message;
      if (error.response && error.response.data) message = error.response.data.msg;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }
  // market api end
  // trade api
  async postPlaceOrder({ params, query, body, memberId }) {
    const method = 'POST';
    const path = '/api/v5/trade/order';

    const timeString = new Date().toISOString();

    const clOrdId = `${this.brokerId}m${memberId}${dvalue.randomID(8)}`.slice(0, 32);
    console.log('clOrdId:',clOrdId)

    const filterBody = {
      instId: body.instId,
      tdMode: body.tdMode,
      ccy: body.ccy,
      clOrdId,
      tag: this.brokerId,
      side: body.side,
      posSide: body.posSide,
      ordType: body.ordType,
      sz: body.sz,
      px: body.px,
      reduceOnly: body.reduceOnly,
      tgtCcy: body.tgtCcy,
    }

    const okAccessSign = await this.okAccessSign({ timeString, method, path: path, body: filterBody });

    try {
      const res = await axios({
        method: method.toLocaleLowerCase(),
        url: `${this.domain}${path}`,
        headers: this.getHeaders(true, {timeString, okAccessSign}),
        data: filterBody,
      });
      console.log(res.data.data)
      if (res.data && res.data.code !== '0') throw new Error(res.data.msg);
      return new ResponseFormat({
        message: 'postPlaceOrder',
        payload: res.data.data,
      });
    } catch (error) {
      this.logger.error(error);
      let message = error.message;
      if (error.response && error.response.data) message = error.response.data.msg;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }

  async getOrderList({ query }) {
    const method = 'GET';
    const path = '/api/v5/trade/orders-pending';
    const { instType, uly, instId, ordType, state, after, before, limit } = query;

    const arr = [];
    if (instType) arr.push(`instType=${instType}`);
    if (uly) arr.push(`uly=${uly}`);
    if (instId) arr.push(`instId=${instId}`);
    if (ordType) arr.push(`ordType=${ordType}`);
    if (state) arr.push(`state=${state}`);
    if (after) arr.push(`after=${after}`);
    if (before) arr.push(`before=${before}`);
    if (limit) arr.push(`limit=${limit}`);

    const qs = (!!arr.length) ?  `?${arr.join('&')}` : '';

    const timeString = new Date().toISOString();

    const okAccessSign = await this.okAccessSign({ timeString, method, path: `${path}${qs}` });

    try {
      const res = await axios({
        method: method.toLocaleLowerCase(),
        url: `${this.domain}${path}${qs}`,
        headers: this.getHeaders(true, {timeString, okAccessSign}),
      });
      this.logger.debug(res.data);
      if (res.data && res.data.code !== '0') {
        this.logger.trace(res.data.msg);
        return new ResponseFormat({
          message: res.data.msg,
          code: Codes.THIRD_PARTY_API_ERROR,
        });
      }

      const payload = res.data.data.map((data) => {
        return {
          ...data,
          cTime: parseInt(data.cTime),
          fillTime: parseInt(data.fillTime),
          uTime: parseInt(data.uTime),
        }
      })
      return new ResponseFormat({
        message: 'getOrderList',
        payload,
      });
    } catch (error) {
      this.logger.error(error);
      let message = error.message;
      if (error.response && error.response.data) message = error.response.data.msg;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }

  async getOrderHistory({ query }) {
    const method = 'GET';
    const path = '/api/v5/trade/orders-history';
    const { instType, uly, instId, ordType, state, category, after, before, limit } = query;

    const arr = [];
    if (instType) arr.push(`instType=${instType}`);
    if (uly) arr.push(`uly=${uly}`);
    if (instId) arr.push(`instId=${instId}`);
    if (ordType) arr.push(`ordType=${ordType}`);
    if (state) arr.push(`state=${state}`);
    if (category) arr.push(`category=${category}`);
    if (after) arr.push(`after=${after}`);
    if (before) arr.push(`before=${before}`);
    if (limit) arr.push(`limit=${limit}`);

    const qs = (!!arr.length) ?  `?${arr.join('&')}` : '';

    const timeString = new Date().toISOString();

    const okAccessSign = await this.okAccessSign({ timeString, method, path: `${path}${qs}` });

    try {
      const res = await axios({
        method: method.toLocaleLowerCase(),
        url: `${this.domain}${path}${qs}`,
        headers: this.getHeaders(true, {timeString, okAccessSign}),
      });
      this.logger.debug(res.data);
      if (res.data && res.data.code !== '0') {
        this.logger.trace(res.data.msg);
        return new ResponseFormat({
          message: res.data.msg,
          code: Codes.THIRD_PARTY_API_ERROR,
        });
      }

      const payload = res.data.data.map((data) => {
        return {
          ...data,
          cTime: parseInt(data.cTime),
          fillTime: parseInt(data.fillTime),
          uTime: parseInt(data.uTime),
        }
      })
      return new ResponseFormat({
        message: 'getOrderHistory',
        payload,
      });
    } catch (error) {
      this.logger.error(error);
      let message = error.message;
      if (error.response && error.response.data) message = error.response.data.msg;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }

  async postCancelOrder({ params, query, body }) {
    const method = 'POST';
    const path = '/api/v5/trade/cancel-order';

    const timeString = new Date().toISOString();

    const filterBody = {
      instId: body.instId,
      ordId: body.ordId,
      clOrdId: body.clOrdId,
    }

    const okAccessSign = await this.okAccessSign({ timeString, method, path: path, body: filterBody });

    try {
      const res = await axios({
        method: method.toLocaleLowerCase(),
        url: `${this.domain}${path}`,
        headers: this.getHeaders(true, {timeString, okAccessSign}),
        data: filterBody,
      });
      console.log(res.data.data)
      if (res.data && res.data.code !== '0') throw new Error(res.data.msg);
      return new ResponseFormat({
        message: 'postCancelOrder',
        payload: res.data.data,
      });
    } catch (error) {
      this.logger.error(error);
      let message = error.message;
      if (error.response && error.response.data) message = error.response.data.msg;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }
  // trade api end

  // public data api
  async getInstruments({ query }) {
    const method = 'GET';
    const path = '/api/v5/public/instruments';
    const { instType, uly } = query;

    const arr = [];
    if (instType) arr.push(`instType=${instType}`);
    if (uly) arr.push(`uly=${uly}`);
    const qs = (!!arr.length) ?  `?${arr.join('&')}` : '';

    try {
      const res = await axios({
        method: method.toLocaleLowerCase(),
        url: `${this.domain}${path}${qs}`,
        headers: this.getHeaders(false),
      });
      if (res.data && res.data.code !== '0') {
        this.logger.trace(res.data.msg);
        return new ResponseFormat({
          message: res.data.msg,
          code: Codes.THIRD_PARTY_API_ERROR,
        });
      }

      const payload = res.data.data.map((data) => {
        return {
          ...data,
          ts: parseInt(data.ts),
        }
      })
      return new ResponseFormat({
        message: 'getInstruments',
        payload,
      });
    } catch (error) {
      this.logger.error(error);
      let message = error.message;
      if (error.response && error.response.data) message = error.response.data.msg;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }
  // public data api end

  // okex ws
  _okexWsEventListener() {
    this.websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // this.logger.log('_okexWsEventListener', data);
      if (data.event) { // subscribe return
        const arg = {...data.arg};
        const channel = arg.channel;
        delete arg.channel;
        const values = Object.values(arg);
        if (data.event === 'subscribe') {
          this.okexWsChannels[channel] = this.okexWsChannels[channel] || {};
          this.okexWsChannels[channel][values[0]] = this.okexWsChannels[channel][values[0]] || {};
        } else if (data.event === 'unsubscribe') {
          delete this.okexWsChannels[channel][values[0]];
          if (!Object.keys(this.okexWsChannels[channel]).length) {
            delete this.okexWsChannels[channel];
          }
        } else if (data.event === 'error') {
          console.log('!!! _okexWsEventListener on event error', data);
        }
      } else if (data.data) { // okex server push data
        const arg = {...data.arg};
        const channel = arg.channel;
        delete arg.channel;
        const values = Object.values(arg);
        switch(channel) {
          case 'instruments':
            this._updateInstruments(values[0], data.data);
            break;
          case 'trades':
            this._updateTrades(values[0], data.data);
            break;
          case 'books':
            if (data.action === 'update') { // there has 2 action, snapshot: full data; update: incremental data.
              this._updateBooks(values[0], data.data);
            }
            break;
          case 'candle1m':
            this._updateCandle1m(values[0], data.data);
            break;
          case 'tickers':
            this._updateTickers(values[0], data.data);
            break;
          default:
        }
      }
      this.websocket.heartbeat();
    };
  }

  _updateInstruments(instType, instData) {
    const channel = 'instruments';
    if (!this.okexWsChannels[channel][instType] || Object.keys(this.okexWsChannels[channel][instType]).length === 0) {
      const instIds = [];
      // subscribe trades of BTC, ETH, USDT
      instData.forEach((inst) => {
        if (
          (
            inst.instId.includes('BTC')
            || inst.instId.includes('ETH')
            || inst.instId.includes('USDT')
          ) && (
            !this.okexWsChannels['tickers']
            || !this.okexWsChannels['tickers'][inst.instId]
          )
        ) {
          instIds.push(inst.instId);
        }
      });
      this._subscribeTickers(instIds);
    }
    this.okexWsChannels[channel][instType] = instData;
  }

  _updateTrades(instId, tradeData) {
    const channel = 'trades';
    // this.okexWsChannels[channel][instId] = tradeData[0];
    // this.logger.debug(`[${this.constructor.name}]_updateTrades`, instId, tradeData);
    const formatTrades = tradeData.map((data) => {
      return {
        instId,
        px: data.px,
        side: data.side,
        sz: data.sz,
        ts: parseInt(data.ts),
        tradeId: data.tradeId,
      }
    });
    EventBus.emit(Events.tradeDataOnUpdate, instId, formatTrades);
  }

  _updateBooks(instId, bookData) {
    const channel = 'books';
    // this.okexWsChannels[channel][instId] = bookData;
    // this.logger.debug(`[${this.constructor.name}]_updateBooks`, instId, bookData);
    const formatBooks = bookData.map((data) => {
      return {
        instId,
        asks: data.asks,
        bids: data.bids,
        ts: parseInt(data.ts),
      }
    });
    EventBus.emit(Events.orderOnUpdate, instId, formatBooks);
  }

  _updateCandle1m(instId, candleData) {
    const channel = 'candle1m';
    this.okexWsChannels[channel][instId] = candleData;
    // this.logger.debug(`[${this.constructor.name}]_updateCandle1m`, instId, candleData);
    const formatCandle = candleData.map((data) => {
      const formatData = [
        parseInt(data[0]),
        data[1],
        data[2],
        data[3],
        data[4],
        data[5],
      ]
      return {
        instId,
        candle: formatData
      }
    });
    EventBus.emit(Events.candleOnUpdate, instId, formatCandle);
  }

  _updateTickers(instId, tickerData) {
    const channel = 'tickers';
    // this.okexWsChannels[channel][instId] = tickerData;
    // this.logger.debug(`[${this.constructor.name}]_updateTickers`, instId, tickerData);
    const formatPair = tickerData.map((data) => {
      const change = SafeMath.minus(data.last, data.open24h);
      const changePct = SafeMath.div(change, data.open24h);
      return {
        instId,
        last: data.last,
        change,
        changePct,
        open24h: data.open24h,
        high24h: data.high24h,
        low24h: data.low24h,
        volCcy24h: data.volCcy24h,
        vol24h: data.vol24h,
        ts: parseInt(data.ts),
        openUtc0: data.sodUtc0,
        openUtc8: data.sodUtc8
      }
    });
    EventBus.emit(Events.pairOnUpdate, formatPair);
  }

  _subscribeInstruments() {
    const instruments = {
      op: "subscribe",
      args: [
        {
          channel: "instruments",
          instType: "SPOT"
        }
      ]
    };
    this.websocket.ws.send(JSON.stringify(instruments));
  }

  _subscribeTrades(instId) {
    const args = [{
      channel: 'trades',
      instId
    }];
    // this.logger.debug(`[${this.constructor.name}]_subscribeTrades`, args)
    this.websocket.ws.send(JSON.stringify({
      op: 'subscribe',
      args
    }));
  }

  _subscribeBook(instId) {
    // books: 400 depth levels will be pushed in the initial full snapshot. Incremental data will be pushed every 100 ms when there is change in order book.
    const args = [{
      channel: 'books',
      instId
    }];
    this.logger.debug(`[${this.constructor.name}]_subscribeBook`, args)
    this.websocket.ws.send(JSON.stringify({
      op: 'subscribe',
      args
    }));
  }

  _subscribeCandle1m(instId) {
    const args = [{
      channel: 'candle1m',
      instId
    }];
    this.logger.debug(`[${this.constructor.name}]_subscribeCandle1m`, args)
    this.websocket.ws.send(JSON.stringify({
      op: 'subscribe',
      args
    }));
  }

  _subscribeTickers(instIds) {
    const args = instIds.map(instId => ({
      channel: 'tickers',
      instId
    }));
    this.logger.debug(`[${this.constructor.name}]_subscribeTickers`, args)
    this.websocket.ws.send(JSON.stringify({
      op: 'subscribe',
      args
    }));
  }

  _unsubscribeTrades(instId) {
    const args = [{
      channel: 'trades',
      instId
    }];
    // this.logger.debug(`[${this.constructor.name}]_unsubscribeTrades`, args)
    this.websocket.ws.send(JSON.stringify({
      op: 'unsubscribe',
      args
    }));
  }

  _unsubscribeBook(instId) {
    // books: 400 depth levels will be pushed in the initial full snapshot. Incremental data will be pushed every 100 ms when there is change in order book.
    const args = [{
      channel: 'books',
      instId
    }];
    this.logger.debug(`[${this.constructor.name}]_unsubscribeBook`, args)
    this.websocket.ws.send(JSON.stringify({
      op: 'unsubscribe',
      args
    }));
  }

  _unsubscribeCandle1m(instId) {
    const args = [{
      channel: 'candle1m',
      instId
    }];
    this.logger.debug(`[${this.constructor.name}]_unsubscribeCandle1m`, args)
    this.websocket.ws.send(JSON.stringify({
      op: 'unsubscribe',
      args
    }));
  }
  // okex ws end

  // TideBitEx ws
  _subscribeInstId(instId) {
    this._subscribeTrades(instId);
    this._subscribeBook(instId);
    this._subscribeCandle1m(instId);
  }

  _unsubscribeInstId(instId) {
    this._unsubscribeTrades(instId);
    this._unsubscribeBook(instId);
    this._unsubscribeCandle1m(instId);
  }
  // TideBitEx ws end
}
module.exports = OkexConnector;
