const ResponseFormat = require('./ResponseFormat');
const Codes = require('../constants/Codes');

class ConnectorBase {
  constructor ({ logger }) {
    this.logger = logger;
    return this;
  }

  async init() {
    return this;
  };

  async router(functionName, { params, query, body }) {
    if (!this[functionName]) {
      return new ResponseFormat({
        message: 'API_NOT_SUPPORTED',
        code: Codes.API_NOT_SUPPORTED,
      })
    }

    return this[functionName]({ params, query, body });
  }
}
module.exports = ConnectorBase;
