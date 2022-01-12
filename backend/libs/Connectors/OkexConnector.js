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

  getHeaders({timeString, okAccessSign}) {
    return {
      'Content-Type': 'application/json',
      'OK-ACCESS-KEY': this.apiKey,
      'OK-ACCESS-SIGN': okAccessSign,
      'OK-ACCESS-TIMESTAMP': timeString,
      'OK-ACCESS-PASSPHRASE': this.passPhrase,
    }
  }

  async getTickers({ query }) {
    const method = 'GET';
    const path = '/api/v5/market/tickers';
    const { instType, uly } = query;
    console.log(query)

    const arr = [];
    if (instType) arr.push(`instType=${instType}`);
    if (uly) arr.push(`uly=${uly}`);
    const qs = (!!arr) ?  `?${arr.join('&')}` : '';

    const timeString = new Date().toISOString();

    const okAccessSign = await this.okAccessSign({ timeString, method, path: path+qs });

    try {
      const res = await axios({
        method: method.toLocaleLowerCase(),
        url: `${this.domain}${path}${qs}`,
        headers: this.getHeaders({ timeString, okAccessSign }),
      });
      console.log('getTickers', res);
      return new ResponseFormat({
        message: 'getTickers',
        payload: res.data,
      });
    } catch (error) {
      this.logger.error(error);
      return new ResponseFormat({
        message: 'getTickers fail',
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }
}
module.exports = OkexConnector;
