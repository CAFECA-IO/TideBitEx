const axios = require('axios');
const crypto = require('crypto');
const dvalue = require('dvalue');

const ResponseFormat = require('../ResponseFormat');
const Codes = require('../../constants/Codes');
const ConnectorBase = require('../ConnectorBase');
const WebSocket = require('../WebSocket');

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
    await this.websocket.init({ url: wssPublic, heartBeat: 25000});
    this._okexWsEventListener();
    this._subscribeInstruments();
    return this;
  };

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
      if (res.data && res.data.code !== '0') throw new Error(res.data.msg);
      return new ResponseFormat({
        message: 'getBalance',
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
      if (res.data && res.data.code !== '0') throw new Error(res.data.msg);
      return new ResponseFormat({
        message: 'getTickers',
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
      if (res.data && res.data.code !== '0') throw new Error(res.data.msg);
      return new ResponseFormat({
        message: 'getOrderBooks',
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
      if (res.data && res.data.code !== '0') throw new Error(res.data.msg);
      return new ResponseFormat({
        message: 'getCandlestick',
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
      if (res.data && res.data.code !== '0') throw new Error(res.data.msg);
      return new ResponseFormat({
        message: 'getTrades',
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
  // market api end
  // trade api
  async postPlaceOrder({ params, query, body }) {
    const method = 'POST';
    const path = '/api/v5/trade/order';

    const timeString = new Date().toISOString();

    const clOrdId = `${this.brokerId}${dvalue.randomID(16)}`;
    console.log('clOrdId:',clOrdId)

    const filterBody = {
      instId: body.instId,
      tdMode: body.tdMode,
      ccy: body.ccy,
      clOrdId,
      tag: body.tag,
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
      if (res.data && res.data.code !== '0') throw new Error(res.data.msg);
      return new ResponseFormat({
        message: 'getOrderList',
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
      if (res.data && res.data.code !== '0') throw new Error(res.data.msg);
      return new ResponseFormat({
        message: 'getOrderHistory',
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
        }
      } else if (data.data) { // okex server push data
        const arg = {...data.arg};
        const channel = arg.channel;
        delete arg.channel;
        const values = Object.values(arg);
        if (channel === 'instruments'
        && (!this.okexWsChannels[channel][values[0]] || Object.keys(this.okexWsChannels[channel][values[0]]).length === 0)) {
          const instIds = [];
          // subscribe trades of BTC, ETH, USDT
          data.data.forEach((inst) => {
            if (
              (
                inst.instId.includes('BTC')
                || inst.instId.includes('ETH')
                || inst.instId.includes('USDT')
              ) && (
                !this.okexWsChannels['trades']
                || !this.okexWsChannels['trades'][inst.instId]
              )
            ) {
              instIds.push(inst.instId);
            }
          });
          this._subscribeTrades(instIds);
        }
        this.okexWsChannels[channel][values[0]] = data.data;
      }
      this.websocket.heartbeat();
    };
  }

  _subscribeInstruments() {
    const instruments = {
      "op": "subscribe",
      "args": [
        {
          "channel" : "instruments",
          "instType": "SPOT"
        }
      ]
    };
    this.websocket.ws.send(JSON.stringify(instruments));
  }

  _subscribeTrades(instIds) {
    const args = instIds.map(instId => ({
      channel: 'trades',
      instId
    }));
    this.logger.debug('_subscribeTrades', args)
    this.websocket.ws.send(JSON.stringify({
      op: 'subscribe',
      args
    }));
  }
}
module.exports = OkexConnector;
