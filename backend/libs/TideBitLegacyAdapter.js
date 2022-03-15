const SafeMath = require("./SafeMath");
const FormData = require("form-data");

class TideBitLegacyAdapter {
  constructor({ config, database, logger }) {
    this.config = config;
    this.database = database;
    this.logger = logger;
    return this;
  }

  static peatioOrderBody({ header, body }) {
    let obj = {};
    if (body.side === "buy") {
      obj["order_bid[ord_type]"] = body.ordType;
      obj["order_bid[origin_volume]"] = body.sz;
      if (body.ordType === "limit") {
        obj["order_bid[price]"] = body.px;
        obj["order_bid[total]"] = SafeMath.mult(body.px, body.sz);
      }
    } else if (body.side === "sell") {
      obj["order_ask[ord_type]"] = body.ordType;
      obj["order_ask[origin_volume]"] = body.sz;
      if (body.ordType === "limit") {
        obj["order_ask[price]"] = body.px;
        obj["order_ask[total]"] = SafeMath.mult(body.px, body.sz);
      }
    }
    const data = Object.keys(obj)
      .map((key) => `${key}=${encodeURIComponent(obj[key])}`)
      .join("&");

    return data;
  }
}
module.exports = TideBitLegacyAdapter;
