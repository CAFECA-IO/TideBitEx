const SafeMath = require("./SafeMath");
const Utils = require("./Utils");

const users = {};
let userGCInterval = 86400 * 1000;

class TideBitLegacyAdapter {
  constructor({ config, database, logger }) {
    this.config = config;
    this.database = database;
    this.logger = logger;
    return this;
  }

  static usersGC() {
    // ++ removeUser //++ gc behavior （timer 清理）
    Object.keys(users).forEach((key) => {
      if (users[key].ts > userGCInterval) {
        delete users[key];
      }
    });
  }

  // ++ middleware
  static async parseMemberId(ctx, next) {
    // console.log(`parseMemberId ctx.header`, ctx.header);
    if (Math.random() < 0.01) {
      TideBitLegacyAdapter.usersGC();
    }
    const peatioToken = Utils.peatioToken(ctx.header);
    console.log(`parseMemberId peatioToken`, peatioToken);
    if (!peatioToken) {
      ctx.memberId = -1;
    } else {
      ctx.token = peatioToken;
      if (users[peatioToken]) {
        ctx.memberId = users[peatioToken].memberId;
      } else {
        try {
          const memberId = await Utils.getMemberIdFromRedis(peatioToken);
          if (memberId !== -1) {
            users[peatioToken] = { memberId, ts: Date.now() };
          }
          ctx.memberId = memberId;
        } catch (error) {
          console.error(`parseMemberId getMemberIdFromRedis error`, error);
          ctx.memberId = -1;
        }
      }
      console.log(`parseMemberId ctx.memberId`, ctx.memberId);
    }
    return next();
  }

  static peatioOrderBody({ header, body }) {
    let obj = {};
    if (body.kind === "bid") {
      obj["order_bid[ord_type]"] = body.ordType;
      obj["order_bid[origin_volume]"] = body.volume;
      if (body.ordType === "limit") {
        obj["order_bid[price]"] = body.price;
        obj["order_bid[total]"] = SafeMath.mult(body.price, body.volume);
      }
    } else if (body.kind === "ask") {
      obj["order_ask[ord_type]"] = body.ordType;
      obj["order_ask[origin_volume]"] = body.volume;
      if (body.ordType === "limit") {
        obj["order_ask[price]"] = body.price;
        obj["order_ask[total]"] = SafeMath.mult(body.price, body.volume);
      }
    }
    const data = Object.keys(obj)
      .map((key) => `${key}=${encodeURIComponent(obj[key])}`)
      .join("&");

    return data;
  }
}

module.exports = TideBitLegacyAdapter;
