const SafeMath = require("./SafeMath");
const Utils = require("./Utils");

const users = {};
let userGCInterval = 86400 * 1000;

class TideBitLegacyAdapter {
  static usersGC() {
    // ++ removeUser //++ gc behavior （timer 清理）
    Object.keys(users).forEach((key) => {
      if (users[key].ts > userGCInterval) {
        delete users[key];
      }
    });
  }

  static async parseMemberId(header, radisDomain) {
    if (Math.random() < 0.01) {
      TideBitLegacyAdapter.usersGC();
    }
    let peatioToken,
      memberId = -1;
    // console.trace(`parseMemberId header`, header);
    peatioToken = Utils.peatioToken(header);
    // console.log(`parseMemberId peatioToken`, peatioToken);
    if (peatioToken) {
      if (users[peatioToken]) {
        memberId = users[peatioToken].memberId;
      } else {
        try {
          console.log(
            `!!! [TideBitLegacyAdapter parseMemberId] getMemberIdFromRedis`,
            radisDomain
          );
          memberId = await Utils.getMemberIdFromRedis(
            radisDomain || this.redisDomain,
            peatioToken
          );
          users[peatioToken] = { memberId, ts: Date.now() };
        } catch (error) {
          console.error(`parseMemberId getMemberIdFromRedis error`, error);
          users[peatioToken] = { memberId, ts: Date.now() };
        }
      }
      // console.log(`parseMemberId users[${peatioToken}]`, users[peatioToken]);
    }
    return { peatioToken, memberId };
  }

  // ++ middleware
  static async getMemberId(ctx, next, redisDomain) {
    this.redisDomain = redisDomain;
    const parsedResult = await TideBitLegacyAdapter.parseMemberId(
      ctx.header,
      redisDomain
    );
    ctx.token = parsedResult.peatioToken;
    ctx.memberId = parsedResult.memberId;
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
