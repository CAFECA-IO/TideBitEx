const path = require('path');

const Bot = require(path.resolve(__dirname, 'Bot.js'));
const OkexConnector = require('../libs/Connectors/OkexConnector');
const ResponseFormat = require('../libs/ResponseFormat');
const Codes = require('../constants/Codes');

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
        })
      })
      .then(() => this);
  }

  async start() {
    await super.start();
    return this;
  }

  // account api
  async getBalance({ params, query }) {
    return this.okexConnector.router('getBalance', { params, query });
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
  async postPlaceOrder ({ params, query, body }) {
    return this.okexConnector.router('postPlaceOrder', { params, query, body });
  }
  async getOrderList ({ params, query }) {
    return this.okexConnector.router('getOrderList', { params, query });
  }
  async getOrderHistory ({ params, query }) {
    return this.okexConnector.router('getOrderHistory', { params, query });
  }
  // trade api end
}

module.exports = ExchangeHub;
