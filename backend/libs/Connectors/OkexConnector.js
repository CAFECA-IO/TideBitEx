const axios = require("axios");
const crypto = require("crypto");
const dvalue = require("dvalue");

const ResponseFormat = require("../ResponseFormat");
const Codes = require("../../constants/Codes");
const ConnectorBase = require("../ConnectorBase");
const WebSocket = require("../WebSocket");
const EventBus = require("../EventBus");
const Events = require("../../constants/Events");
const SafeMath = require("../SafeMath");
const SupportedExchange = require("../../constants/SupportedExchange");
const Utils = require("../Utils");

const HEART_BEAT_TIME = 25000;

class OkexConnector extends ConnectorBase {
  constructor({ logger }) {
    super({ logger });
    this.websocket = new WebSocket({ logger });
    this.websocketPrivate = new WebSocket({ logger });
    return this;
  }

  async init({
    domain,
    apiKey,
    secretKey,
    passPhrase,
    brokerId,
    wssPublic,
    wssPrivate,
    markets,
  }) {
    await super.init();
    this.domain = domain;
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.passPhrase = passPhrase;
    this.brokerId = brokerId;
    this.markets = markets;
    this.okexWsChannels = {};
    await this.websocket.init({ url: wssPublic, heartBeat: HEART_BEAT_TIME });
    await this.websocketPrivate.init({
      url: wssPrivate,
      heartBeat: HEART_BEAT_TIME,
    });
    return this;
  }

  async start() {
    this._okexWsEventListener();
    this._subscribeInstruments();
    this._wsPrivateLogin();
  }

  async okAccessSign({ timeString, method, path, body }) {
    const msg = timeString + method + path + (JSON.stringify(body) || "");
    this.logger.debug("okAccessSign msg", msg);

    const cr = crypto.createHmac("sha256", this.secretKey);
    const signMsg = cr.update(msg).digest("base64");
    this.logger.debug("okAccessSign signMsg", signMsg);
    return signMsg;
  }

  getHeaders(needAuth, params = {}) {
    const headers = {
      "Content-Type": "application/json",
    };

    if (needAuth) {
      const { timeString, okAccessSign } = params;
      headers["OK-ACCESS-KEY"] = this.apiKey;
      headers["OK-ACCESS-SIGN"] = okAccessSign;
      headers["OK-ACCESS-TIMESTAMP"] = timeString;
      headers["OK-ACCESS-PASSPHRASE"] = this.passPhrase;
    }
    return headers;
  }

  // account api
  async getBalance({ query }) {
    const method = "GET";
    const path = "/api/v5/account/balance";
    const { ccy } = query;

    const arr = [];
    if (ccy) arr.push(`ccy=${ccy}`);
    const qs = !!arr.length ? `?${arr.join("&")}` : "";

    const timeString = new Date().toISOString();

    const okAccessSign = await this.okAccessSign({
      timeString,
      method,
      path: `${path}${qs}`,
    });

    try {
      const res = await axios({
        method: method.toLocaleLowerCase(),
        url: `${this.domain}${path}${qs}`,
        headers: this.getHeaders(true, { timeString, okAccessSign }),
      });
      this.logger.debug(res.data);
      if (res.data && res.data.code !== "0") {
        const message = JSON.stringify(res.data);
        this.logger.trace(message);
        return new ResponseFormat({
          message,
          code: Codes.THIRD_PARTY_API_ERROR,
        });
      }
      this.logger.log("res.data.data", res.data.data);
      const payload = res.data.data.map((data) => {
        const details = data.details.map((dtl) => {
          return {
            ccy: dtl.ccy,
            totalBal: dtl.cashBal,
            availBal: dtl.availBal,
            frozenBal: dtl.frozenBal,
            uTime: parseInt(dtl.uTime),
          };
        });
        return {
          ...data,
          details,
          uTime: parseInt(data.uTime),
        };
      });
      return new ResponseFormat({
        message: "getBalance",
        payload,
      });
    } catch (error) {
      this.logger.error(error);
      let message = error.message;
      if (error.response && error.response.data)
        message = error.response.data.msg;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }

  async getTicker({ query }) {
    const method = "GET";
    const path = "/api/v5/market/ticker";
    const { instId } = query;

    const arr = [];
    if (instId) arr.push(`instId=${instId}`);
    const qs = !!arr.length ? `?${arr.join("&")}` : "";

    try {
      const res = await axios({
        method: method.toLocaleLowerCase(),
        url: `${this.domain}${path}${qs}`,
        headers: this.getHeaders(false),
      });
      if (res.data && res.data.code !== "0") {
        const message = JSON.stringify(res.data);
        this.logger.trace(message);
        return new ResponseFormat({
          message,
          code: Codes.THIRD_PARTY_API_ERROR,
        });
      }

      const [payload] = res.data.data.map((data) => {
        const change = SafeMath.minus(data.last, data.open24h);
        const changePct = SafeMath.gt(data.open24h, "0")
          ? SafeMath.div(change, data.open24h)
          : SafeMath.eq(change, "0")
          ? "0"
          : "1";
        return {
          id: data.instId.replace("-", "").toLowerCase(),
          name: data.instId.replace("-", "/"),
          base_unit: data.instId.split("-")[0].toLowerCase(),
          quote_unit: data.instId.split("-")[1].toLowerCase(),
          group:
            data.instId.split("-")[1].toLowerCase().includes("usd") &&
            data.instId.split("-")[1].toLowerCase().length > 3
              ? "usdx"
              : data.instId.split("-")[1].toLowerCase(),
          sell: data.askPx,
          buy: data.bidPx,
          instId: data.instId,
          last: data.last,
          change,
          changePct,
          open: data.open24h,
          high: data.high24h,
          low: data.low24h,
          volume: data.vol24h,
          at: parseInt(data.ts),
          source: SupportedExchange.OKEX,
        };
      });
      return new ResponseFormat({
        message: "getTicker",
        payload,
      });
    } catch (error) {
      this.logger.error(error);
      let message = error.message;
      if (error.response && error.response.data)
        message = error.response.data.msg;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }
  // account api end
  // market api
  async getTickers({ query, optional }) {
    const method = "GET";
    const path = "/api/v5/market/tickers";
    const { instType, uly } = query;

    const arr = [];
    if (instType) arr.push(`instType=${instType}`);
    if (uly) arr.push(`uly=${uly}`);
    const qs = !!arr.length ? `?${arr.join("&")}` : "";

    try {
      const res = await axios({
        method: method.toLocaleLowerCase(),
        url: `${this.domain}${path}${qs}`,
        headers: this.getHeaders(false),
      });
      if (res.data && res.data.code !== "0") {
        const message = JSON.stringify(res.data);
        this.logger.trace(message);
        return new ResponseFormat({
          message,
          code: Codes.THIRD_PARTY_API_ERROR,
        });
      }
      const defaultObj = {};
      const tickers = res.data.data.reduce((prev, data) => {
        const change = SafeMath.minus(data.last, data.open24h);
        const changePct = SafeMath.gt(data.open24h, "0")
          ? SafeMath.div(change, data.open24h)
          : SafeMath.eq(change, "0")
          ? "0"
          : "1";
        prev[data.instId.replace("-", "").toLowerCase()] = {
          id: data.instId.replace("-", "").toLowerCase(),
          name: data.instId.replace("-", "/"),
          base_unit: data.instId.split("-")[0].toLowerCase(),
          quote_unit: data.instId.split("-")[1].toLowerCase(),
          group:
            data.instId.split("-")[1].toLowerCase().includes("usd") &&
            data.instId.split("-")[1].toLowerCase().length > 3
              ? "usdx"
              : data.instId.split("-")[1].toLowerCase(),
          sell: data.askPx,
          buy: data.bidPx,
          instId: data.instId,
          last: data.last,
          change,
          changePct,
          open: data.open24h,
          high: data.high24h,
          low: data.low24h,
          volume: data.vol24h,
          at: parseInt(data.ts),
          source: SupportedExchange.OKEX,
        };
        return prev;
      }, defaultObj);
      this.tickers = Utils.tickersFilterInclude(optional.mask, tickers);
      // this.logger.log(`+++++++++ getTickers +++++++++`);
      // this.logger.log(` this.tickers`, this.tickers);
      // this.logger.log(`+++++++++ getTickers +++++++++`);
      return new ResponseFormat({
        message: "getTickers",
        payload: this.tickers,
      });
    } catch (error) {
      this.logger.error(error);
      let message = error.message;
      if (error.response && error.response.data)
        message = error.response.data.msg;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }

  async getOrderBooks({ query }) {
    const method = "GET";
    const path = "/api/v5/market/books";
    const { instId, sz } = query;

    const arr = [];
    if (instId) arr.push(`instId=${instId}`);
    if (sz) arr.push(`sz=${sz}`);
    const qs = !!arr.length ? `?${arr.join("&")}` : "";

    try {
      const res = await axios({
        method: method.toLocaleLowerCase(),
        url: `${this.domain}${path}${qs}`,
        headers: this.getHeaders(false),
      });
      if (res.data && res.data.code !== "0") {
        const message = JSON.stringify(res.data);
        this.logger.trace(message);
        return new ResponseFormat({
          message,
          code: Codes.THIRD_PARTY_API_ERROR,
        });
      }
      const [payload] = res.data.data.map((data) => {
        const asks = data.asks.map((ask) => [
          ask[0],
          SafeMath.plus(ask[2], ask[3]),
        ]);
        const bids = data.bids.map((bid) => [
          bid[0],
          SafeMath.plus(bid[2], bid[3]),
        ]);
        return {
          asks,
          bids,
          instId,
          ts: parseInt(data.ts),
        };
      });
      this.logger.log(`++++++++++++++`);
      this.logger.log(payload);
      this.logger.log(`++++++++++++++`);
      return new ResponseFormat({
        message: "getOrderBooks",
        payload: payload,
      });
    } catch (error) {
      this.logger.error(error);
      let message = error.message;
      if (error.response && error.response.data)
        message = error.response.data.msg;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }

  async getCandlesticks({ query }) {
    const method = "GET";
    const path = "/api/v5/market/candles";
    const { instId, bar, after, before, limit } = query;

    const arr = [];
    if (instId) arr.push(`instId=${instId}`);
    if (bar) arr.push(`bar=${bar}`);
    if (after) arr.push(`after=${after}`);
    if (before) arr.push(`before=${before}`);
    if (limit) arr.push(`limit=${limit}`);
    const qs = !!arr.length ? `?${arr.join("&")}` : "";

    try {
      const res = await axios({
        method: method.toLocaleLowerCase(),
        url: `${this.domain}${path}${qs}`,
        headers: this.getHeaders(false),
      });
      if (res.data && res.data.code !== "0") {
        const message = JSON.stringify(res.data);
        this.logger.trace(message);
        return new ResponseFormat({
          message,
          code: Codes.THIRD_PARTY_API_ERROR,
        });
      }

      const payload = res.data.data.map((data) => {
        const ts = data.shift();
        return [parseInt(ts), ...data];
      });
      return new ResponseFormat({
        message: "getCandlestick",
        payload,
      });
    } catch (error) {
      this.logger.error(error);
      let message = error.message;
      if (error.response && error.response.data)
        message = error.response.data.msg;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }

  async getTrades({ query }) {
    const method = "GET";
    const path = "/api/v5/market/trades";
    const { instId, limit } = query;

    const arr = [];
    if (instId) arr.push(`instId=${instId}`);
    if (limit) arr.push(`limit=${limit}`);
    const qs = !!arr.length ? `?${arr.join("&")}` : "";

    try {
      const res = await axios({
        method: method.toLocaleLowerCase(),
        url: `${this.domain}${path}${qs}`,
        headers: this.getHeaders(false),
      });
      if (res.data && res.data.code !== "0") {
        const message = JSON.stringify(res.data);
        this.logger.trace(message);
        return new ResponseFormat({
          message,
          code: Codes.THIRD_PARTY_API_ERROR,
        });
      }
      const payload = res.data.data
        // .sort((a, b) => +b.ts - +a.ts)
        .map((data, i) => {
          return {
            instId: data.instId,
            id: data.tradeId,
            price: data.px,
            volume: data.sz,
            market: instId.replace("-", "").toLowerCase(),
            at: parseInt(SafeMath.div(data.ts, "1000")),
            side:
              i === res.data.data.length - 1
                ? "up"
                : SafeMath.gte(data.px, res.data.data[i + 1].px)
                ? "up"
                : "down",
          };
        });
      return new ResponseFormat({
        message: "getTrades",
        payload,
      });
    } catch (error) {
      this.logger.error(error);
      let message = error.message;
      if (error.response && error.response.data)
        message = error.response.data.msg;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }
  // market api end
  // trade api
  async postPlaceOrder({ params, query, body, memberId, orderId }) {
    const method = "POST";
    const path = "/api/v5/trade/order";

    const timeString = new Date().toISOString();

    const clOrdId = `${this.brokerId}${memberId}m${orderId}o`.slice(0, 32);
    // clOrdId = 377bd372412fSCDE60977m247674466o
    // brokerId = 377bd372412fSCDE
    // memberId = 60976
    // orderId = 247674466

    this.logger.log("clOrdId:", clOrdId);

    const filterBody = {
      instId: body.instId,
      tdMode: body.tdMode,
      ccy: body.ccy,
      clOrdId,
      tag: this.brokerId,
      side: body.side,
      posSide: body.posSide,
      ordType: body.ordType,
      sz: body.sz,
      px: body.px,
      reduceOnly: body.reduceOnly,
      tgtCcy: body.tgtCcy,
    };

    const okAccessSign = await this.okAccessSign({
      timeString,
      method,
      path: path,
      body: filterBody,
    });

    try {
      const res = await axios({
        method: method.toLocaleLowerCase(),
        url: `${this.domain}${path}`,
        headers: this.getHeaders(true, { timeString, okAccessSign }),
        data: filterBody,
      });
      this.logger.log(res.data.data);
      if (res.data && res.data.code !== "0") {
        const message = JSON.stringify(res.data);
        this.logger.trace(message);
        return new ResponseFormat({
          message,
          code: Codes.THIRD_PARTY_API_ERROR,
        });
      }
      return new ResponseFormat({
        message: "postPlaceOrder",
        payload: res.data.data,
      });
    } catch (error) {
      this.logger.error(error);
      let message = error.message;
      if (error.response && error.response.data)
        message = error.response.data.msg;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }

  async getOrderList({ query }) {
    const method = "GET";
    const path = "/api/v5/trade/orders-pending";
    const { instType, uly, instId, ordType, state, after, before, limit } =
      query;

    const arr = [];
    if (instType) arr.push(`instType=${instType}`);
    if (uly) arr.push(`uly=${uly}`);
    if (instId) arr.push(`instId=${instId}`);
    if (ordType) arr.push(`ordType=${ordType}`);
    if (state) arr.push(`state=${state}`);
    if (after) arr.push(`after=${after}`);
    if (before) arr.push(`before=${before}`);
    if (limit) arr.push(`limit=${limit}`);

    const qs = !!arr.length ? `?${arr.join("&")}` : "";

    const timeString = new Date().toISOString();

    const okAccessSign = await this.okAccessSign({
      timeString,
      method,
      path: `${path}${qs}`,
    });

    try {
      const res = await axios({
        method: method.toLocaleLowerCase(),
        url: `${this.domain}${path}${qs}`,
        headers: this.getHeaders(true, { timeString, okAccessSign }),
      });
      this.logger.debug(res.data);
      if (res.data && res.data.code !== "0") {
        const message = JSON.stringify(res.data);
        this.logger.trace(message);
        return new ResponseFormat({
          message,
          code: Codes.THIRD_PARTY_API_ERROR,
        });
      }

      const payload = res.data.data.map((data) => {
        return {
          instId,
          clOrdId: data.id,
          ordId: data.id,
          ordType: data.ordType,
          px: data.px,
          side: data.side,
          sz: data.sz,
          filled: data.state === "filled",
          state:
            data.state === "canceled"
              ? "canceled"
              : state === "filled"
              ? "done"
              : "waiting",

          cTime: parseInt(data.cTime),
          uTime: parseInt(data.uTime),
        };
      });
      return new ResponseFormat({
        message: "getOrderList",
        payload,
      });
    } catch (error) {
      this.logger.error(error);
      let message = error.message;
      if (error.response && error.response.data)
        message = error.response.data.msg;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }

  async getOrderHistory({ query }) {
    const method = "GET";
    const path = "/api/v5/trade/orders-history";
    const {
      instType,
      uly,
      instId,
      ordType,
      state,
      category,
      after,
      before,
      limit,
    } = query;

    const arr = [];
    if (instType) arr.push(`instType=${instType}`);
    if (uly) arr.push(`uly=${uly}`);
    if (instId) arr.push(`instId=${instId}`);
    if (ordType) arr.push(`ordType=${ordType}`);
    if (state) arr.push(`state=${state}`);
    if (category) arr.push(`category=${category}`);
    if (after) arr.push(`after=${after}`);
    if (before) arr.push(`before=${before}`);
    if (limit) arr.push(`limit=${limit}`);

    const qs = !!arr.length ? `?${arr.join("&")}` : "";

    const timeString = new Date().toISOString();

    const okAccessSign = await this.okAccessSign({
      timeString,
      method,
      path: `${path}${qs}`,
    });

    try {
      const res = await axios({
        method: method.toLocaleLowerCase(),
        url: `${this.domain}${path}${qs}`,
        headers: this.getHeaders(true, { timeString, okAccessSign }),
      });
      this.logger.debug(res.data);
      if (res.data && res.data.code !== "0") {
        const message = JSON.stringify(res.data);
        this.logger.trace(message);
        return new ResponseFormat({
          message,
          code: Codes.THIRD_PARTY_API_ERROR,
        });
      }

      const payload = res.data.data.map((data) => {
        return {
          ...data,
          cTime: parseInt(data.cTime),
          fillTime: parseInt(data.fillTime),
          uTime: parseInt(data.uTime),
        };
      });
      return new ResponseFormat({
        message: "getOrderHistory",
        payload,
      });
    } catch (error) {
      this.logger.error(error);
      let message = error.message;
      if (error.response && error.response.data)
        message = error.response.data.msg;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }

  async postCancelOrder({ params, query, body }) {
    const method = "POST";
    const path = "/api/v5/trade/cancel-order";

    const timeString = new Date().toISOString();

    const filterBody = {
      instId: body.instId,
      ordId: body.ordId,
      clOrdId: body.clOrdId,
    };

    const okAccessSign = await this.okAccessSign({
      timeString,
      method,
      path: path,
      body: filterBody,
    });

    try {
      const res = await axios({
        method: method.toLocaleLowerCase(),
        url: `${this.domain}${path}`,
        headers: this.getHeaders(true, { timeString, okAccessSign }),
        data: filterBody,
      });
      this.logger.log(res.data.data);
      if (res.data && res.data.code !== "0") {
        const message = JSON.stringify(res.data);
        this.logger.trace(message);
        return new ResponseFormat({
          message,
          code: Codes.THIRD_PARTY_API_ERROR,
        });
      }
      return new ResponseFormat({
        message: "postCancelOrder",
        payload: res.data.data,
      });
    } catch (error) {
      this.logger.error(error);
      let message = error.message;
      if (error.response && error.response.data)
        message = error.response.data.msg;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }
  // trade api end

  // public data api
  async getInstruments({ query }) {
    const method = "GET";
    const path = "/api/v5/public/instruments";
    const { instType, uly } = query;

    const arr = [];
    if (instType) arr.push(`instType=${instType}`);
    if (uly) arr.push(`uly=${uly}`);
    const qs = !!arr.length ? `?${arr.join("&")}` : "";

    try {
      const res = await axios({
        method: method.toLocaleLowerCase(),
        url: `${this.domain}${path}${qs}`,
        headers: this.getHeaders(false),
      });
      if (res.data && res.data.code !== "0") {
        const message = JSON.stringify(res.data);
        this.logger.trace(message);
        return new ResponseFormat({
          message,
          code: Codes.THIRD_PARTY_API_ERROR,
        });
      }

      const payload = res.data.data.map((data) => {
        return {
          ...data,
          ts: parseInt(data.ts),
        };
      });
      return new ResponseFormat({
        message: "getInstruments",
        payload,
      });
    } catch (error) {
      this.logger.error(error);
      let message = error.message;
      if (error.response && error.response.data)
        message = error.response.data.msg;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }
  // public data api end

  // okex ws
  _okexWsEventListener() {
    this.websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // this.logger.log('_okexWsEventListener', data);
      if (data.event) {
        // subscribe return
        const arg = { ...data.arg };
        const channel = arg.channel;
        delete arg.channel;
        const values = Object.values(arg);
        if (data.event === "subscribe") {
          this.okexWsChannels[channel] = this.okexWsChannels[channel] || {};
          this.okexWsChannels[channel][values[0]] =
            this.okexWsChannels[channel][values[0]] || {};
        } else if (data.event === "unsubscribe") {
          delete this.okexWsChannels[channel][values[0]];
          if (!Object.keys(this.okexWsChannels[channel]).length) {
            delete this.okexWsChannels[channel];
          }
        } else if (data.event === "error") {
          this.logger.log("!!! _okexWsEventListener on event error", data);
        }
      } else if (data.data) {
        // okex server push data
        const arg = { ...data.arg };
        const channel = arg.channel;
        delete arg.channel;
        const values = Object.values(arg);
        switch (channel) {
          case "instruments":
            this._updateInstruments(values[0], data.data);
            break;
          case "trades":
            this._updateTrades(values[0], data.data);
            break;
          case "books":
            if (data.action === "update") {
              // there has 2 action, snapshot: full data; update: incremental data.
              this._updateBooks(values[0], data.data);
            }
            break;
          case "candle1m":
            this._updateCandle1m(values[0], data.data);
            break;
          case "tickers":
            this._updateTickers(data.data);
            break;
          default:
        }
      }
      this.websocket.heartbeat();
    };
    this.websocketPrivate.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.event) {
        // subscribe return
        if (data.event === "login") {
          if (data.code === "0") {
            this._subscribeOrders();
          }
        } else if (data.event === "subscribe") {
          // temp do nothing
        } else if (data.event === "error") {
          this.logger.log(
            "!!! _okexWsPrivateEventListener on event error",
            data
          );
        }
      } else if (data.data) {
        // okex server push data
        const arg = { ...data.arg };
        const channel = arg.channel;
        delete arg.channel;
        const values = Object.values(arg);
        switch (channel) {
          case "orders":
            this._updateOrderDetails(values[0], data.data);
            break;
          default:
        }
      }
    };
  }

  _updateInstruments(instType, instData) {
    const channel = "instruments";
    if (
      !this.okexWsChannels[channel][instType] ||
      Object.keys(this.okexWsChannels[channel][instType]).length === 0
    ) {
      const instIds = [];
      // subscribe trades of BTC, ETH, USDT
      instData.forEach((inst) => {
        if (
          (inst.instId.includes("BTC") ||
            inst.instId.includes("ETH") ||
            inst.instId.includes("USDT")) &&
          (!this.okexWsChannels["tickers"] ||
            !this.okexWsChannels["tickers"][inst.instId])
        ) {
          instIds.push(inst.instId);
        }
      });
      this._subscribeTickers(instIds);
    }
    this.okexWsChannels[channel][instType] = instData;
  }

  _updateOrderDetails(instType, orderData) {
    const formatOrders = [];
    orderData.map((data) => {
      if (data.clOrdId.startsWith(this.brokerId)) {
        formatOrders.push({
          ...data,
          cTime: parseInt(data.cTime),
          fillTime: parseInt(data.fillTime),
          uTime: parseInt(data.uTime),
        });
      }
    });

    EventBus.emit(Events.orderDetailUpdate, instType, formatOrders);
  }

  _updateTrades(instId, tradeData) {
    const channel = "trades";
    // this.okexWsChannels[channel][instId] = tradeData[0];
    // this.logger.debug(`[${this.constructor.name}]_updateTrades`, instId, tradeData);
    const formatTrades = tradeData.map((data) => {
      return {
        instId,
        px: data.px,
        side: data.side,
        sz: data.sz,
        ts: parseInt(data.ts),
        tradeId: data.tradeId,
      };
    });
    EventBus.emit(Events.trades, instId, formatTrades);
  }

  _updateBooks(instId, bookData) {
    const channel = "books";
    // this.okexWsChannels[channel][instId] = bookData;
    this.logger.debug(
      `[${this.constructor.name}]_updateBooks`,
      instId,
      bookData
    );
    const [formatBooks] = bookData.map((data) => {
      const asks = data.asks.map((ask) => [
        ask[0],
        SafeMath.plus(ask[2], ask[3]),
      ]);
      const bids = data.bids.map((bid) => [
        bid[0],
        SafeMath.plus(bid[2], bid[3]),
      ]);
      return {
        asks,
        bids,
        instId,
        ts: parseInt(data.ts),
      };
    });
    EventBus.emit(Events.update, instId, formatBooks);
  }

  _updateCandle1m(instId, candleData) {
    const channel = "candle1m";
    this.okexWsChannels[channel][instId] = candleData;
    // this.logger.debug(`[${this.constructor.name}]_updateCandle1m`, instId, candleData);
    const formatCandle = candleData.map((data) => {
      const formatData = [
        parseInt(data[0]),
        data[1],
        data[2],
        data[3],
        data[4],
        data[5],
      ];
      return {
        instId,
        candle: formatData,
      };
    });
    EventBus.emit(Events.candleOnUpdate, instId, formatCandle);
  }

  _updateTickers(tickerData) {
    if (!this.tickers) return;
    // this.logger.log(`========== _updateTickers ==========`);
    // this.logger.log(`tickerData`, tickerData);
    const updateTickers = tickerData
      .filter((data) => {
        const id = data.instId.replace("-", "").toLowerCase();
        // this.logger.log(`this.tickers[id]`, id, this.tickers[id]);
        return (
          this.tickers[id] &&
          (this.tickers[id]?.last !== data.last ||
            this.tickers[id]?.open !== data.open24h ||
            this.tickers[id]?.high !== data.high24h ||
            this.tickers[id]?.low !== data.low24h ||
            this.tickers[id]?.volume !== data.vol24h)
        );
      })
      .reduce((prev, data) => {
        const change = SafeMath.minus(data.last, data.open24h);
        const changePct = SafeMath.gt(data.open24h, "0")
          ? SafeMath.div(change, data.open24h)
          : SafeMath.eq(change, "0")
          ? "0"
          : "1";
        prev[data.instId.replace("-", "/").toLowerCase] = {
          id: data.instId.replace("-", "/").toLowerCase,
          instId: data.instId,
          name: data.instId.replace("-", "/"),
          base_unit: data.instId.split("-")[0].toLowerCase(),
          quote_unit: data.instId.split("-")[1].toLowerCase(),
          group:
            data.instId.split("-")[1].toLowerCase().includes("usd") &&
            data.instId.split("-")[1].toLowerCase().length > 3
              ? "usdx"
              : data.instId.split("-")[1].toLowerCase(),
          last: data.last,
          change,
          changePct,
          open: data.open24h,
          high: data.high24h,
          low: data.low24h,
          volume: data.vol24h,
          at: parseInt(data.ts),
          source: SupportedExchange.OKEX,
        };
        return prev;
      }, {});
    if (Object.keys(updateTickers).length > 0) {
      this.logger.log(
        `[${this.name}]_updateTickers updateTickers`,
        updateTickers
      );
      EventBus.emit(Events.tickers, updateTickers);
    }
  }

  _subscribeInstruments() {
    const instruments = {
      op: "subscribe",
      args: [
        {
          channel: "instruments",
          instType: "SPOT",
        },
      ],
    };
    this.websocket.ws.send(JSON.stringify(instruments));
  }

  _subscribeTrades(instId) {
    const args = [
      {
        channel: "trades",
        instId,
      },
    ];
    // this.logger.debug(`[${this.constructor.name}]_subscribeTrades`, args)
    this.websocket.ws.send(
      JSON.stringify({
        op: "subscribe",
        args,
      })
    );
  }

  _subscribeBook(instId) {
    // books: 400 depth levels will be pushed in the initial full snapshot. Incremental data will be pushed every 100 ms when there is change in order book.
    const args = [
      {
        channel: "books",
        instId,
      },
    ];
    this.logger.debug(`[${this.constructor.name}]_subscribeBook`, args);
    this.websocket.ws.send(
      JSON.stringify({
        op: "subscribe",
        args,
      })
    );
  }

  _subscribeCandle1m(instId) {
    const args = [
      {
        channel: "candle1m",
        instId,
      },
    ];
    this.logger.debug(`[${this.constructor.name}]_subscribeCandle1m`, args);
    this.websocket.ws.send(
      JSON.stringify({
        op: "subscribe",
        args,
      })
    );
  }

  _subscribeTickers(instIds) {
    const args = instIds.map((instId) => ({
      channel: "tickers",
      instId,
    }));
    // this.logger.debug(`[${this.constructor.name}]_subscribeTickers`, args)
    this.websocket.ws.send(
      JSON.stringify({
        op: "subscribe",
        args,
      })
    );
  }

  _unsubscribeTrades(instId) {
    const args = [
      {
        channel: "trades",
        instId,
      },
    ];
    // this.logger.debug(`[${this.constructor.name}]_unsubscribeTrades`, args)
    this.websocket.ws.send(
      JSON.stringify({
        op: "unsubscribe",
        args,
      })
    );
  }

  _unsubscribeBook(instId) {
    // books: 400 depth levels will be pushed in the initial full snapshot. Incremental data will be pushed every 100 ms when there is change in order book.
    const args = [
      {
        channel: "books",
        instId,
      },
    ];
    this.logger.debug(`[${this.constructor.name}]_unsubscribeBook`, args);
    this.websocket.ws.send(
      JSON.stringify({
        op: "unsubscribe",
        args,
      })
    );
  }

  _unsubscribeCandle1m(instId) {
    const args = [
      {
        channel: "candle1m",
        instId,
      },
    ];
    this.logger.debug(`[${this.constructor.name}]_unsubscribeCandle1m`, args);
    this.websocket.ws.send(
      JSON.stringify({
        op: "unsubscribe",
        args,
      })
    );
  }

  async _wsPrivateLogin() {
    const method = "GET";
    const path = "/users/self/verify";

    const timestamp = Math.floor(Date.now() / 1000);

    const okAccessSign = await this.okAccessSign({
      timeString: timestamp,
      method,
      path: `${path}`,
    });
    const login = {
      op: "login",
      args: [
        {
          apiKey: this.apiKey,
          passphrase: this.passPhrase,
          timestamp,
          sign: okAccessSign,
        },
      ],
    };
    this.websocketPrivate.ws.send(JSON.stringify(login));
  }

  _subscribeOrders() {
    const orders = {
      op: "subscribe",
      args: [
        {
          channel: "orders",
          instType: "SPOT",
        },
      ],
    };
    this.websocketPrivate.ws.send(JSON.stringify(orders));
  }
  // okex ws end

  // TideBitEx ws
  _subscribeMarket(market) {
    const instId = this._findInstId(market);
    this._subscribeTrades(instId);
    this._subscribeBook(instId);
    this._subscribeCandle1m(instId);
  }

  _unsubscribeMarket(market) {
    const instId = this._findInstId(market);
    this._unsubscribeTrades(instId);
    this._unsubscribeBook(instId);
    this._unsubscribeCandle1m(instId);
  }
  // TideBitEx ws end
  _subscribeUser() {}

  _unsubscribeUser() {}

  _findInstId(id) {
    return this.markets[id.toUpperCase()];
  }
}
module.exports = OkexConnector;
