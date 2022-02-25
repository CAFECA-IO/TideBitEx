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

  async router(functionName, { header, params, query, body, memberId }) {
    if (!this[functionName]) {
      return new ResponseFormat({
        message: 'API_NOT_SUPPORTED',
        code: Codes.API_NOT_SUPPORTED,
      })
    }

    return this[functionName]({ header, params, query, body, memberId });
  }

  async _tideBitExEventListener() {
    EventBus.on(Events.pairOnSubscribe, (instId) => {
      this._subscribeInstId(instId);
    })
    EventBus.on(Events.pairOnUnsubscribe, (instId) => {
      this._unsubscribeInstId(instId);
    })
  }

  _subscribeInstId() {
    throw new Error('need override _subscribeInstId');
  }

  _unsubscribeInstId() {
    throw new Error('need override _unsubscribeInstId');
  }
}
module.exports = ConnectorBase;
