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
        })
      })
      .then(() => this);
  }

  async start() {
    await super.start();
    return this;
  }

  async getTickers({ params, query }) {
    const { exchange } = params;
    switch(exchange) {
      case 'okex':
        return this.okexConnector.router('getTickers', { params, query });
      default:
        return new ResponseFormat({
          message: 'Invalid input exange',
          code: Codes.INVALID_INPUT_EXCHANGE,
        })
    }
  }
}

module.exports = ExchangeHub;
