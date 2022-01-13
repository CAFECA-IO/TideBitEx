const axios = require('axios');
const crypto = require('crypto');

const ResponseFormat = require('../ResponseFormat');
const Codes = require('../../constants/Codes');
const ConnectorBase = require('../ConnectorBase');

class OkexConnector extends ConnectorBase {
  constructor ({ logger }) {
    super({ logger });
    return this;
  }

  async init({ domain, apiKey, secretKey, passPhrase }) {
    await super.init();
    this.domain = domain;
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.passPhrase = passPhrase;
    return this;
  };

  async okAccessSign({ timeString, method, path, body }) {
    const msg = timeString + method + path + (body || '');
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

  // market api
  async getTickers({ query }) {
    const method = 'GET';
    const path = '/api/v5/market/tickers';
    const { instType, uly } = query;

    const arr = [];
    if (instType) arr.push(`instType=${instType}`);
    if (uly) arr.push(`uly=${uly}`);
    const qs = (!!arr) ?  `?${arr.join('&')}` : '';

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
      return new ResponseFormat({
        message: error.message,
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
    const qs = (!!arr) ?  `?${arr.join('&')}` : '';

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
      return new ResponseFormat({
        message: error.message,
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
    const qs = (!!arr) ?  `?${arr.join('&')}` : '';

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
      return new ResponseFormat({
        message: error.message,
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
    const qs = (!!arr) ?  `?${arr.join('&')}` : '';

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
      return new ResponseFormat({
        message: error.message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }
  // market api end
}
module.exports = OkexConnector;
