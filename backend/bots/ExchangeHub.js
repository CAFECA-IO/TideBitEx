const path = require('path');

const Bot = require(path.resolve(__dirname, 'Bot.js'));
const OkexConnector = require('../libs/Connectors/OkexConnector');
const ResponseFormat = require('../libs/ResponseFormat');
const Codes = require('../constants/Codes');
const EventBus = require('../libs/EventBus');
const Events = require('../constants/Events');

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

    // EventBus.on(Events.pairOnUpdate, (instId, formatPair) => {
    //   this.broadcastAllClient(
    //     {
    //       type: Events.pairOnUpdate,
    //       data: formatPair,
    //     }
    //   )
    // });
  }
}

module.exports = ExchangeHub;
