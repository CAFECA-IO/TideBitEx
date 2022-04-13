const ResponseFormat = require('./ResponseFormat');
const Codes = require('../constants/Codes');
const EventBus = require('./EventBus');
const Events = require('../constants/Events');

class ConnectorBase {
  constructor ({ logger }) {
    this.logger = logger;
    return this;
  }

  async init() {
    this._tideBitExEventListener();
    return this;
  };

  async router(functionName, { header, params, query, body, memberId, orderId }) {
    if (!this[functionName]) {
      return new ResponseFormat({
        message: 'API_NOT_SUPPORTED',
        code: Codes.API_NOT_SUPPORTED,
      })
    }

    return this[functionName]({ header, params, query, body, memberId, orderId });
  }

  async _tideBitExEventListener() {
    EventBus.on(Events.pairOnSubscribe, (market) => {
      this._subscribeMarket(market);
    })
    EventBus.on(Events.pairOnUnsubscribe, (market) => {
      this._unsubscribeMarket(market);
    })
    EventBus.on(Events.userOnSubscribe, (sn) => {
      this._subscribeUser(sn);
    })
    EventBus.on(Events.userOnUnsubscribe, (sn) => {
      this._unsubscribeUser(sn);
    })
  }

  _subscribeUser(){
    throw new Error('need override _subscribeUser');
  }

  _unsubscribeUser(){
    throw new Error('need override _unsubscribeUser');
  }

  _subscribeMarket() {
    throw new Error('need override _subscribeMarket');
  }

  _unsubscribeMarket() {
    throw new Error('need override _unsubscribeMarket');
  }
}
module.exports = ConnectorBase;
