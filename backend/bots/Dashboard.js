const path = require("path");

const Bot = require(path.resolve(__dirname, "Bot.js"));
const OkexConnector = require("../libs/Connectors/OkexConnector");
const TideBitConnector = require("../libs/Connectors/TideBitConnector");
const ResponseFormat = require("../libs/ResponseFormat");
const Codes = require("../constants/Codes");
const Utils = require("../libs/Utils");

class Dashboard extends Bot {
  brokerId = '';

  constructor() {
    super();
    this.name = "Dashboard";
  }

  async start() {
    this.brokerId = this.config.okex.brokerId;
    await super.start();
    const exchangeHub = await this.getBot('ExchangeHub');
    this.okexConnector = exchangeHub.okexConnector;
    return this;
  }

  async overview() {
    const result = {};
    result.okex = await this.okex();
    return result;
  }

  async okex() {
    const result = {};
    result.assets = await this.okexAssets();
    result.orders = await this.okexOrders();
    return result;
  }

  async okexAssets() {
    const query = {};
    const result = await this.okexConnector.getBalance({ query });
    return result;
  }

  async okexOrders() {
    const query = {};
    const orders = await this.okexConnector.getAllOrders({ query });
    const result = orders.map((v) => {
      const tmp = v.clOrdId.replace(this.brokerId, '');
      v.memberId = tmp.substr(0, tmp.indexOf('m'));
      return v;
    });
    return result;
  }
}

module.exports = Dashboard;