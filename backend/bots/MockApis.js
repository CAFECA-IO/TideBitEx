const path = require('path');
// const dvalue = require('dvalue');
const { URL } = require('url');
// const Utils = require('../libs/Utils');

const Bot = require(path.resolve(__dirname, 'Bot.js'));
const ResponseFormat = require(path.resolve(__dirname, '../libs/ResponseFormat.js'));

const ONE_DAY_SECONDS = 86400;
const ONE_MONTH_SECONDS = 2628000;

class MockApis extends Bot {
  constructor() {
    super();
    this.name = 'MockApis';
  }

  init({ config, database, logger, i18n }) {
    return super.init({ config, database, logger, i18n })
      .then(() => this);
  }

  async start() {
    await super.start();
    return this;
  }

  async ready() {
    await super.ready();
    return this;
  }

  async wsBrocast({ channel = 'BCD-BTC', msg }) {
    const WSChannel = await this.getBot('WSChannel');
    WSChannel.broadcast(channel, msg);
  }
}

module.exports = MockApis;
