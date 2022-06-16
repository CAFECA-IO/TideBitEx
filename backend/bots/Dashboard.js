const path = require("path");

const Bot = require(path.resolve(__dirname, "Bot.js"));
const OkexConnector = require("../libs/Connectors/OkexConnector");
const TideBitConnector = require("../libs/Connectors/TideBitConnector");
const ResponseFormat = require("../libs/ResponseFormat");
const Codes = require("../constants/Codes");
const Utils = require("../libs/Utils");

class Dashboard extends Bot {
  constructor() {
    super();
    this.name = "Dashboard";
  }

  async overview() {
    const result = {};
    result.okex = await this.okex();
    return result;
  }

  async okex() {
    const result = {};
    result.assets = await this.okexAssets();
    return result;
  }

  async okexAssets() {

  }

  async okexOrders() {

  }
}
