const axios = require("axios");
const crypto = require("crypto");
// const dvalue = require("dvalue");

const ResponseFormat = require("../ResponseFormat");
const Codes = require("../../constants/Codes");
const ConnectorBase = require("../ConnectorBase");
const WebSocket = require("../WebSocket");
const EventBus = require("../EventBus");
const Events = require("../../constants/Events");
const SafeMath = require("../SafeMath");
const SupportedExchange = require("../../constants/SupportedExchange");
const Utils = require("../Utils");
const { waterfallPromise } = require("../Utils");
const HEART_BEAT_TIME = 25000;

class OkexConnector extends ConnectorBase {
  // _tickersUpdateInterval = 0;
  // _booksUpdateInterval = 300;
  // _tradesUpdateInterval = 300;

  // _tickersTimestamp = 0;
  // _booksTimestamp = 0;
  // _tradesTimestamp = 0;

  tickers = {};
  okexWsChannels = {};
  instIds = [];

  fetchedTrades = {};
  fetchedBook = {};
  fetchedOrders = {};
  fetchedOrdersInterval = 1 * 60 * 1000;

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
    tickerBook,
    depthBook,
    tradeBook,
    accountBook,
    orderBook,
    currencies,
    database,
    tidebitMarkets,
  }) {
    await super.init();
    this.domain = domain;
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.passPhrase = passPhrase;
    this.brokerId = brokerId;
    this.markets = markets;
    await this.websocket.init({ url: wssPublic, heartBeat: HEART_BEAT_TIME });
    await this.websocketPrivate.init({
      url: wssPrivate,
      heartBeat: HEART_BEAT_TIME,
    });
    this.depthBook = depthBook;
    this.tickerBook = tickerBook;
    this.tradeBook = tradeBook;
    this.accountBook = accountBook;
    this.orderBook = orderBook;
    this.currencies = currencies;
    this.database = database;
    this.tidebitMarkets = tidebitMarkets;
    return this;
  }
  //   {
  //     "side": "sell",
  //     "fillSz": "0.002",
  //     "fillPx": "1195.86",
  //     "fee": "-0.001913376",
  //     "ordId": "467755654093094921",
  //     "instType": "SPOT",
  //     "instId": "ETH-USDT",
  //     "clOrdId": "377bd372412fSCDE2m332576077o",
  //     "posSide": "net",
  //     "billId": "467871903972212805",
  //     "tag": "377bd372412fSCDE",
  //     "execType": "M",
  //     "tradeId": "225260494",
  //     "feeCcy": "USDT",
  //     "ts": "1657821354546"
  // }
  /**
   * @typedef {Object} Trade
   * @property {string} side "sell"
   * @property {string} fillSz "0.002"
   * @property {string} fillPx "1195.86"
   * @property {string} fee "-0.001913376"
   * @property {string} ordd "467755654093094921"
   * @property {string} insType "SPOT"
   * @property {string} insId "ETH-USDT"
   * @property {string} clOdId "377bd372412fSCDE2m332576077o"
   * @property {string} poside "net"
   * @property {string} bilId "467871903972212805"
   * @property {string} tag "377bd372412fSCDE"
   * @property {string} exeType "M"
   * @property {string} tradeId "225260494"
   * @property {string} feecy "USDT"
   * @property {string} ts "1657821354546
   */
  /**
   * @returns {Promise<Trade>}
   */
  async fetchTradeFillsRecords({ query }) {
    this.logger.log(`[${this.constructor.name}] fetchTradeFillsRecords`);
    const { before } = query;
    let result,
      arr = [];
    if (before) arr.push(`before=${before}`);
    const qs = !!arr.length ? `?${arr.join("&")}` : "";
    const method = "GET";
    const path = "/api/v5/trade/fills";
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
      if (res.data && res.data.code !== "0") {
        const message = JSON.stringify(res.data);
        this.logger.trace(message);
      }
      const data = res.data.data.map((trade) => ({
        ...trade,
        // tradeId: `${this.database.EXCHANGE.OKEX.toString()}${this.tradeId}`,
        status: this.database.OUTERTRADE_STATUS.UNPROCESS,
        exchangeCode:
          this.database.EXCHANGE[SupportedExchange.OKEX.toUpperCase()],
        updatedAt: new Date(parseInt(trade.ts)).toISOString(),
        data: JSON.stringify(trade),
      }));
      result = new ResponseFormat({
        message: "tradeFills",
        payload: data,
      });
    } catch (error) {
      this.logger.error(error);
      let message = error.message;
      if (error.response && error.response.data)
        message = error.response.data.msg;
      result = new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
    return result;
  }

  async fetchTradeFillsHistoryRecords({ query }) {
    const { instType, before } = query;
    this.logger.log(`[${this.constructor.name}] fetchTradeFillsHistoryRecords`);
    let result,
      arr = [];
    const method = "GET";
    if (instType) arr.push(`instType=${instType}`);
    if (before) arr.push(`before=${before}`);
    const path = "/api/v5/trade/fills-history";
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
      if (res.data && res.data.code !== "0") {
        const message = JSON.stringify(res.data);
        this.logger.trace(message);
      }
      const data = res.data.data.map((trade) => ({
        ...trade,
        // tradeId: `${this.database.EXCHANGE.OKEX.toString()}${this.tradeId}`,
        status: this.database.OUTERTRADE_STATUS.UNPROCESS,
        exchangeCode:
          this.database.EXCHANGE[SupportedExchange.OKEX.toUpperCase()],
        updatedAt: new Date(parseInt(trade.ts)).toISOString(),
        data: JSON.stringify(trade),
      }));
      result = new ResponseFormat({
        message: "tradeFills",
        payload: data,
      });
    } catch (error) {
      this.logger.error(error);
      let message = error.message;
      if (error.response && error.response.data)
        message = error.response.data.msg;
      result = new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
    return result;
  }

  async _getOrderHistory(options) {
    const { instType, instId, after, limit } = options;
    const method = "GET";
    const path = "/api/v5/trade/orders-history";

    this.logger.log(`-------------- [START] sync OrderHistory ---------------`);
    const arr = [];
    if (instType) arr.push(`instType=${instType}`);
    if (instId) arr.push(`instId=${instId}`);
    if (after) arr.push(`after=${after}`);
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
      if (res.data && res.data.code !== "0") {
        const message = JSON.stringify(res.data);
        this.logger.trace(message);
      }
      const formatOrders = {};
      const formatOrdersForLib = {};
      res.data.data.forEach((data) => {
        const tmp = data.clOrdId.replace(this.brokerId, "");
        const memberId = tmp.substr(0, tmp.indexOf("m"));
        if (!formatOrders[memberId]) formatOrders[memberId] = [];
        if (!formatOrdersForLib[memberId]) formatOrdersForLib[memberId] = [];
        formatOrders[memberId].push({
          ...data,
          cTime: parseInt(data.cTime),
          fillTime: parseInt(data.fillTime),
          uTime: parseInt(data.uTime),
        });
        formatOrdersForLib.push({
          instId,
          market: instId.replace("-", "").toLowerCase(),
          clOrdId: data.clOrdId,
          id: data.ordId,
          ordType: data.ordType,
          price: data.px,
          kind: data.side === "buy" ? "bid" : "ask",
          volume: SafeMath.minus(data.sz, data.fillSz),
          origin_volume: data.sz,
          filled: data.state === "filled",
          state:
            data.state === "canceled"
              ? "canceled"
              : data.state === "filled"
              ? "done"
              : "wait",
          state_text:
            data.state === "canceled"
              ? "Canceled"
              : data.state === "filled"
              ? "Done"
              : "Waiting",
          at: parseInt(SafeMath.div(data.uTime, "1000")),
          ts: parseInt(data.uTime),
        });
      });
      this.logger.log(`res.data.data`, res.data.data);
      Object.keys(formatOrdersForLib).forEach((memberId) => {
        this.orderBook.updateAll(
          memberId,
          instId,
          formatOrdersForLib[memberId]
        );
      });
      EventBus.emit(Events.orderDetailUpdate, instType, formatOrders);
      this.logger.log(`-------------- [END] sync OrderHistory ---------------`);
    } catch (error) {
      this.logger.error(error);
      this.logger.log(
        `-------------- [ERROR] sync OrderHistory ---------------`
      );
    }
  }

  async start() {
    this._okexWsEventListener();
    // this._subscribeInstruments();
    Object.keys(this.markets).forEach((key) => {
      if (this.markets[key] === "OKEx") {
        const instId = key.replace("tb", "");
        this.instIds.push(instId);
      }
    });
    this._subscribeTickers(this.instIds);
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
    let result;
    let summary = [];

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

      if (res.data && res.data.code !== "0") {
        const message = JSON.stringify(res.data);
        this.logger.trace(message);
        return new ResponseFormat({
          message,
          code: Codes.THIRD_PARTY_API_ERROR,
        });
      }

      const subAccounts = res.data.data.map((v) => {
        return v.details.map((dtl) => {
          const ccyData = {
            ccy: dtl.ccy,
            totalBal: dtl.cashBal,
            availBal: dtl.availBal,
            frozenBal: dtl.frozenBal,
            uTime: parseInt(dtl.uTime),
          };

          const summaryIndex = summary.findIndex((v) => v.ccy == dtl.ccy);
          if (summaryIndex > -1) {
            summary[summaryIndex].totalBal += ccyData.cashBal;
            summary[summaryIndex].availBal += ccyData.availBal;
            summary[summaryIndex].frozenBal += ccyData.frozenBal;
            uTime = Math.max(summary[summaryIndex].uTime, ccyData.uTime);
          } else {
            summary.push(ccyData);
          }
          return ccyData;
        });
      });
      result = {
        summary,
        subAccounts,
      };
    } catch (error) {
      this.logger.error(error);
      let message = error.message;
      if (error.response && error.response.data)
        message = error.response.data.msg;
      result = new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }

    return result;
  }

  async getTicker({ query, optional }) {
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
      const [data] = res.data.data;
      const ticker = {};
      ticker[data.instId.replace("-", "").toLowerCase()] =
        this._formateTicker(data);
      // this.logger.log(`[${this.constructor.name}] getTicker`, ticker);
      return new ResponseFormat({
        message: "getTicker",
        payload: ticker,
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
  async getTickers({ query }) {
    let instruments,
      instrumentsRes = await this.getInstruments({ query });
    if (instrumentsRes.success) {
      instruments = instrumentsRes.payload;
    }
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
        prev[data.instId] = this._formateTicker(data);
        return prev;
      }, defaultObj);
      const filteredTickers = Utils.tickersFilterInclude(
        this.instIds.map((instId) =>
          this.tidebitMarkets.find(
            (market) => market.id === instId.replace("-", "").toLowerCase()
          )
        ),
        tickers,
        instruments
      );
      this.logger.log(`instId`, this.instId);
      this.logger.log(`filteredTickers`, filteredTickers);
      // this.tickerBook.updateAll(tickers);
      return new ResponseFormat({
        message: "getTickers from OKEx",
        payload: filteredTickers,
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

  async getDepthBooks({ query }) {
    const method = "GET";
    const path = "/api/v5/market/books";
    const { instId, sz } = query;

    const arr = [];
    if (instId) arr.push(`instId=${instId}`);
    if (sz) arr.push(`sz=${200}`);
    // if (sz) arr.push(`sz=${sz}`); // -- TEST
    const qs = !!arr.length ? `?${arr.join("&")}` : "";

    if (!this.fetchedBook[instId]) {
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
        const [data] = res.data.data;
        // this.logger.log(
        //   `----------- [API][RES](${instId}) [START] ----------------`
        // );
        // this.logger.log(
        //   `[${this.constructor.name}] getDepthBook res`,
        //   `asks[${data.asks.length}]`,
        //   `bids[${data.bids.length}]`
        // );
        // this.logger.log(
        //   `----------- [API][RES](${instId}) [END] ----------------`
        // );
        this.depthBook.updateAll(instId, data);
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
    return new ResponseFormat({
      message: "getDepthBooks",
      payload: this.depthBook.getSnapshot(instId),
    });
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

  async getTradingViewSymbol({ query }) {
    return Promise.resolve({
      name: query.symbol,
      timezone: "Asia/Hong_Kong",
      session: "24x7",
      ticker: query.id,
      minmov: 1,
      minmove2: 0,
      volume_precision: 8,
      pricescale: query.market?.price_group_fixed
        ? 10 ** query.market.price_group_fixed
        : 10000,
      has_intraday: true,
      has_daily: true,
      intraday_multipliers: ["1", "5", "15", "30", "60"],
      has_weekly_and_monthly: true,
    });
  }

  getBar(resolution) {
    let bar;
    switch (resolution) {
      case "1":
        bar = "1m";
        break;
      case "5":
        bar = "5m";
        break;
      case "15":
        bar = "15m";
        break;
      case "30":
        bar = "30m";
        break;
      case "60":
        bar = "1H";
        break;
      case "1W":
      case "W":
        bar = "1W";
        break;
      case "1D":
      case "D":
      default:
        bar = "1D";
        break;
    }
    return bar;
  }

  async getTradingViewHistory({ query }) {
    const method = "GET";
    const path = "/api/v5/market/candles";
    let { instId, resolution, from, to } = query;

    let arr = [];
    if (instId) arr.push(`instId=${instId}`);
    if (resolution) arr.push(`bar=${this.getBar(resolution)}`);
    // before	String	???	??????????????????????????????????????????????????????????????????????????????????????????ts
    // if (from) arr.push(`before=${parseInt(from) * 1000}`); //5/23
    //after	String	???	??????????????????????????????????????????????????????????????????????????????????????????ts
    if (to) arr.push(`after=${parseInt(to) * 1000}`); //6/2
    arr.push(`limit=${300}`);
    let qs = !!arr.length ? `?${arr.join("&")}` : "";
    // this.logger.log(`getTradingViewHistory arr`, arr);

    try {
      let res = await axios({
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
      let resData = res.data.data;
      // this.logger.log(`resData[0] 1`, resData[0]);
      // this.logger.log(
      //   `resData[resData.length-1] 1`,
      //   resData[resData.length - 1]
      // );
      if (resData[resData.length - 1][0] / 1000 > from) {
        arr = [];
        if (instId) arr.push(`instId=${instId}`);
        if (resolution) arr.push(`bar=${this.getBar(resolution)}`);
        if (to) arr.push(`after=${resData[resData.length - 1][0]}`); //6/2
        arr.push(`limit=${300}`);
        qs = !!arr.length ? `?${arr.join("&")}` : "";
        res = await axios({
          method: method.toLocaleLowerCase(),
          url: `${this.domain}${path}${qs}`,
          headers: this.getHeaders(false),
        });
        resData = resData.concat(res.data.data);
      }
      const data = {
        s: "ok",
        t: [],
        o: [],
        h: [],
        l: [],
        c: [],
        v: [],
      };
      resData
        .sort((a, b) => a[0] - b[0])
        .forEach((d) => {
          const ts = parseInt(d[0]) / 1000;
          const o = parseFloat(d[1]);
          const h = parseFloat(d[2]);
          const l = parseFloat(d[3]);
          const c = parseFloat(d[4]);
          const v = parseFloat(d[5]);
          data.t.push(ts);
          data.o.push(o);
          data.h.push(h);
          data.l.push(l);
          data.c.push(c);
          data.v.push(v);
        });
      return data;
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
    const { instId, limit } = query;
    // this.logger.log(
    //   `[${this.constructor.name}] getTrades this.fetchedTrades[${instId}]`,
    //   this.fetchedTrades[instId]
    // );
    if (!this.fetchedTrades[instId]) {
      const method = "GET";
      const path = "/api/v5/market/trades";

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
        // ++ TODO: verify function works properly
        const market = instId.replace("-", "").toLowerCase();
        const trades = this._formateTrades(market, res.data.data);
        // this.logger.log(
        //   `[${this.constructor.name}] getTrades trades[${instId}]`,
        //   trades
        // );
        this.tradeBook.updateAll(instId, trades);
        this.fetchedTrades[instId] = true;
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
    // this.logger.log(
    //   `[${this.constructor.name}] getTrades this.tradeBook.getSnapshot(${instId})`,
    //   this.tradeBook.getSnapshot(instId)
    // );
    return new ResponseFormat({
      message: "getTrades",
      payload: this.tradeBook.getSnapshot(instId),
    });
  }

  formateExAccts(subAcctsBals) {
    const exAccounts = {};
    return subAcctsBals.reduce((prev, subAcctsBal) => {
      // this.logger.log(`formateExAccts prev`, prev);
      // this.logger.log(`formateExAccts subAcctsBal`, subAcctsBal);
      if (!prev[subAcctsBal.currency]) {
        prev[subAcctsBal.currency] = {};
        prev[subAcctsBal.currency]["details"] = [];
        prev[subAcctsBal.currency]["balance"] = "0";
        prev[subAcctsBal.currency]["locked"] = "0";
        prev[subAcctsBal.currency]["total"] = "0";
      }
      prev[subAcctsBal.currency]["balance"] = SafeMath.plus(
        prev[subAcctsBal.currency]["balance"],
        subAcctsBal?.balance
      );
      prev[subAcctsBal.currency]["locked"] = SafeMath.plus(
        prev[subAcctsBal.currency]["locked"],
        subAcctsBal?.locked
      );
      prev[subAcctsBal.currency]["total"] = SafeMath.plus(
        prev[subAcctsBal.currency]["total"],
        subAcctsBal?.total
      );
      prev[subAcctsBal.currency]["details"].push(subAcctsBal);
      prev[subAcctsBal.currency]["details"].sort((a, b) => b?.total - a?.total);
      return prev;
    }, exAccounts);
  }

  fetchSubAcctsBalsJob(subAccount) {
    return () => {
      return new Promise(async (resolve, reject) => {
        const subAccBalRes = await this.getSubAccount({
          query: {
            subAcct: subAccount.subAcct,
          },
        });
        if (subAccBalRes.success) {
          const subAccBals = subAccBalRes.payload;
          // this.logger.debug(
          //   `[${this.constructor.name}: fetchSubAcctsBalsJob] subAccBals`,
          //   subAccBals
          // );
          resolve(subAccBals);
        } else {
          // ++ TODO
          this.logger.error(subAccBalRes);
          reject(subAccBalRes);
        }
      });
    };
  }

  async getExAccounts({ query }) {
    return new Promise(async (resolve, reject) => {
      const subAccountsRes = await this.getSubAccounts({ query });
      if (subAccountsRes.success) {
        const subAccounts = subAccountsRes.payload;
        const jobs = subAccounts.map((subAccount) =>
          this.fetchSubAcctsBalsJob(subAccount)
        );
        waterfallPromise(jobs, 1000).then((subAcctsBals) => {
          // this.logger.debug(
          //   `[${this.constructor.name}] getExAccounts subAcctsBals`,
          //   subAcctsBals
          // );
          const _subAcctsBals = subAcctsBals.reduce((prev, curr) => {
            prev = prev.concat(curr);
            return prev;
          }, []);
          this.logger.debug(
            `[${this.constructor.name}] getExAccounts _subAcctsBals`,
            _subAcctsBals
          );
          const exAccounts = this.formateExAccts(_subAcctsBals);
          this.logger.debug(
            `[${this.constructor.name}] getExAccounts exAccounts`,
            exAccounts
          );
          resolve(
            new ResponseFormat({
              message: "getExAccounts",
              payload: exAccounts,
            })
          );
        });
      } else {
        reject(subAccountsRes);
      }
    });
  }

  async getSubAccounts({ query }) {
    const method = "GET";
    const path = "/api/v5/users/subaccount/list";
    const { subAcct, enable } = query;
    const arr = [];
    if (subAcct) arr.push(`subAcct=${subAcct}`);
    if (enable) arr.push(`enable=${enable}`);
    const qs = !!arr.length ? `?${arr.join("&")}` : "";

    const timeString = new Date().toISOString();
    // const timeString = new Date(new Date().getTime() + 3000).toISOString();
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
      if (res.data && res.data.code !== "0") {
        const message = JSON.stringify(res.data);
        this.logger.trace(message);
        return new ResponseFormat({
          message,
          code: Codes.THIRD_PARTY_API_ERROR,
        });
      }
      const payload = res.data.data;
      // this.logger.debug(
      //   `[${this.constructor.name}] getSubAccounts payload`,
      //   payload
      // );
      return new ResponseFormat({
        message: "getSubAccounts",
        payload,
      });
    } catch (error) {
      this.logger.error(error.response);
      let message = error.message;
      if (error.response && error.response.data)
        message = error.response.data.msg;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }

  async getSubAccount({ query }) {
    const method = "GET";
    const path = "/api/v5/account/subaccount/balances";
    const { subAcct, enable } = query;

    const arr = [];
    if (subAcct) arr.push(`subAcct=${subAcct}`);
    if (enable) arr.push(`enable=${enable}`);
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
      if (res.data && res.data.code !== "0") {
        const message = JSON.stringify(res.data);
        this.logger.trace(message);
        return new ResponseFormat({
          message,
          code: Codes.THIRD_PARTY_API_ERROR,
        });
      }
      const [data] = res.data.data;
      // this.logger.debug(`[${this.constructor.name}: getSubAccount] data`, data);
      const balances = data.details.map((detail) => ({
        subAcct,
        currency: detail.ccy,
        balance: detail.availBal,
        locked: detail.frozenBal,
        total: SafeMath.plus(detail.availBal, detail.frozenBal),
      }));
      // this.logger.debug(
      //   `[${this.constructor.name}: getSubAccount] balances`,
      //   balances
      // );
      return new ResponseFormat({
        message: "getSubAccount",
        payload: balances,
      });
    } catch (error) {
      this.logger.error(error.response);
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
      // ccy: body.ccy,
      clOrdId,
      tag: this.brokerId,
      side: body.kind === "bid" ? "buy" : "sell",
      // posSide: body.posSide,
      ordType: body.ordType === "market" ? "ioc" : body.ordType,
      sz: body.volume,
      px:
        body.ordType === "market"
          ? body.kind === "bid"
            ? (parseFloat(body.price) * 1.1).toString()
            : (parseFloat(body.price) * 0.9).toString()
          : body.price,
      // reduceOnly: body.reduceOnly,
      // tgtCcy: body.tgtCcy,
    };
    this.logger.log("filterBody:", filterBody);

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
      const [payload] = res.data.data;
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

  async getAllOrders() {
    const method = "GET";
    const path = "/api/v5/trade/orders-pending";
    const arr = [];
    const qs = "";
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
      if (res.data && res.data.code !== "0") {
        const message = JSON.stringify(res.data);
        this.logger.trace(message);
        return new ResponseFormat({
          message,
          code: Codes.THIRD_PARTY_API_ERROR,
        });
      }
      return res.data.data;
    } catch (err) {
      return [];
    }
  }

  async getOrderList({ query } = {}) {
    const {
      instType,
      uly,
      instId,
      ordType,
      state,
      after,
      before,
      limit,
      memberId,
    } = query;

    const method = "GET";
    const path = "/api/v5/trade/orders-pending";
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
      if (res.data && res.data.code !== "0") {
        const message = JSON.stringify(res.data);
        this.logger.trace(message);
        return new ResponseFormat({
          message,
          code: Codes.THIRD_PARTY_API_ERROR,
        });
      }

      const orders = res.data.data.map((data) => {
        return {
          instId,
          market: instId.replace("-", "").toLowerCase(),
          clOrdId: data.clOrdId,
          id: data.ordId,
          ordType: data.ordType,
          price: data.px,
          kind: data.side === "buy" ? "bid" : "ask",
          volume: SafeMath.minus(data.sz, data.fillSz),
          origin_volume: data.sz,
          filled: data.state === "filled",
          state:
            data.state === "canceled"
              ? "canceled"
              : state === "filled"
              ? "done"
              : "wait",
          state_text:
            data.state === "canceled"
              ? "Canceled"
              : state === "filled"
              ? "Done"
              : "Waiting",
          at: parseInt(SafeMath.div(data.uTime, "1000")),
          ts: parseInt(data.uTime),
        };
      });
      // this.logger.log(
      //   `[${this.constructor.name} getOrderList] instId:`,
      //   instId,
      //   `orders`,
      //   orders
      // );
      this.orderBook.updateAll(memberId, instId, orders);
      // return new ResponseFormat({
      //   message: "getOrderList",
      //   payload,
      // });
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

    return new ResponseFormat({
      message: "getOrderList",
      payload: this.orderBook.getSnapshot(memberId, instId, "pending"),
    });
  }

  async postCancelOrder({ body }) {
    const method = "POST";
    const path = "/api/v5/trade/cancel-order";

    const timeString = new Date().toISOString();

    const filterBody = {
      instId: body.instId,
      ordId: body.id,
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

  async cancelOrders({ body }) {
    const method = "POST";
    const path = "/api/v5/trade/cancel-batch-orders";

    const timeString = new Date().toISOString();

    const okAccessSign = await this.okAccessSign({
      timeString,
      method,
      path,
      body,
    });

    try {
      const res = await axios({
        method: method.toLocaleLowerCase(),
        url: `${this.domain}${path}`,
        headers: this.getHeaders(true, { timeString, okAccessSign }),
        data: body,
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
        message: "cancelOrders",
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
      if (data.event) {
        // subscribe return
        const arg = { ...data.arg };
        const channel = arg.channel;
        delete arg.channel;
        const values = Object.values(arg);
        if (data.event === "subscribe") {
          this.okexWsChannels[channel] = this.okexWsChannels[channel] || {};
          // this.logger.log(
          //   `_okexWsEventListener this.okexWsChannels[${channel}]`,
          //   this.okexWsChannels[channel]
          // );
          this.okexWsChannels[channel][values[0]] =
            this.okexWsChannels[channel][values[0]] || {};
        } else if (data.event === "unsubscribe") {
          delete this.okexWsChannels[channel][values[0]];
          // ++ TODO ws onClose clean channel
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
          case this.candleChannel:
            this._updateCandle(data.arg.instId, data.arg.channel, data.data);
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

  /**
 * _updateOrderDetails
 * @param {*} instType 
 * @param {*} orderData 
 */
  _updateOrderDetails(instType, orderData) {
    const formatOrders = [];
    this.logger.log(`-------------- _updateOrderDetails ---------------`);
    orderData.forEach((data) => {
      if (data.clOrdId.startsWith(this.brokerId)) {
        formatOrders.push({
          ...data,
          cTime: parseInt(data.cTime),
          fillTime: parseInt(data.fillTime),
          uTime: parseInt(data.uTime),
        });
      }
    });
    this.logger.log(`formatOrders`, formatOrders);
    this.logger.log(`-------------- [END] _updateOrderDetails ---------------`);
    EventBus.emit(Events.orderDetailUpdate, instType, formatOrders);
  }

  // ++ TODO: verify function works properly
  _formateTrades(market, trades) {
    return trades.map((data) => {
      const trade = {
        tid: data.tradeId, // [about to decrepted]
        type: data.side, // [about to decrepted]
        date: data.ts, // [about to decrepted]
        amount: data.sz, // [about to decrepted]
        id: data.tradeId,
        price: data.px,
        volume: data.sz,
        market,
        at: parseInt(SafeMath.div(data.ts, "1000")),
        ts: data.ts,
      };
      // this.logger.debug(
      //   `[${this.constructor.name}]_updateTrades`,
      //   market,
      //   new Date(trade.ts)
      // );
      return trade;
    });
  }

  // ++ TODO: verify function works properly
  async _updateTrades(instId, trades) {
    try {
      const market = instId.replace("-", "").toLowerCase();
      const newTrades = this._formateTrades(market, trades);
      // this.logger.debug(`[${this.constructor.name}]_updateTrades`, newTrades);
      this.tradeBook.updateByDifference(instId, {
        add: newTrades,
      });
      EventBus.emit(Events.trades, market, {
        market,
        trades: this.tradeBook.getSnapshot(instId),
      });
    } catch (error) {}
  }

  // ++ TODO: verify function works properly
  _updateBooks(instId, data) {
    const [updateBooks] = data;
    const market = instId.replace("-", "").toLowerCase();
    // this.logger.log(
    //   `[FROM][OKEx][WS] _updateBooks data`,
    //   updateBooks
    // );
    // this.logger.log(
    //   `[FROM][OKEx][WS] _updateBooks updateBooks.bids`,
    //   updateBooks.bids
    // );
    try {
      this.depthBook.updateByDifference(instId, updateBooks);
    } catch (error) {
      // ++
      this.logger.error(`_updateBooks`, error);
    }
    // this.logger.log(
    //   `=+===+===+== [AFTER WS UPDATE][START](${instId})  =+===+===+==`
    // );
    // this.logger.log(
    //   `[${this.constructor.name}] getDepthBook res`,
    //   `asks[${this.depthBook.getSnapshot(instId).asks.length}]`,
    //   `bids[${this.depthBook.getSnapshot(instId).bids.length}]`
    // );
    // this.logger.log(
    //   `=+===+===+== [AFTER WS UPDATE][END](${instId})  =+===+===+==`
    // );
    // this.logger.log(
    //   `[AFTER WS UPDATE] depthBook snapshot(${instId})`,
    //   this.depthBook.getSnapshot(instId)
    // );

    EventBus.emit(Events.update, market, this.depthBook.getSnapshot(instId));
  }

  _updateCandle(instId, channel, candleData) {
    // this.candleChannel = channel;
    // this.logger.debug(
    //   `[${this.constructor.name}]_updateCandle  this.okexWsChannels[${this.candleChannel}]`,
    //   this.okexWsChannels,
    //   instId,
    //   channel,
    //   candleData
    // );
    this.okexWsChannels[this.candleChannel][instId] = candleData;
    const formatCandle = candleData
      .map((data) => ({
        time: parseInt(data[0]),
        open: data[1],
        high: data[2],
        low: data[3],
        close: data[4],
        volume: data[5],
      }))
      .sort((a, b) => a.time - b.time);
    EventBus.emit(Events.candleOnUpdate, instId, {
      instId,
      channel,
      candle: formatCandle,
    });
  }

  // ++ TODO: verify function works properly
  _formateTicker(data) {
    const id = data.instId.replace("-", "").toLowerCase();
    const change = SafeMath.minus(data.last, data.open24h);
    const changePct = SafeMath.gt(data.open24h, "0")
      ? SafeMath.div(change, data.open24h)
      : SafeMath.eq(change, "0")
      ? "0"
      : "1";
    const updateTicker = {
      id,
      market: id,
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
      volumeCcy: data.volCcy24h,
      at: parseInt(SafeMath.div(data.ts, "1000")),
      ts: parseInt(data.ts),
      source: SupportedExchange.OKEX,
      sell: data.askPx, // [about to decrepted]
      buy: data.bidPx, // [about to decrepted]
      ticker: {
        // [about to decrepted]
        buy: data.bidPx,
        sell: data.askPx,
        low: data.low24h,
        high: data.high24h,
        last: data.last,
        open: data.open24h,
        vol: data.vol24h,
      },
    };
    return updateTicker;
  }

  // ++ TODO: verify function works properly
  _updateTickers(data) {
    data.forEach((d) => {
      // if (d.instId === "BTC-USDT")
      //   this.logger.log(
      //     `[${this.constructor.name}]_updateTickers d.last`,
      //     d.last,
      //     new Date(parseInt(d.ts)).toISOString()
      //   );
      if (this._findSource(d.instId) === SupportedExchange.OKEX) {
        const ticker = this._formateTicker(d);
        const result = this.tickerBook.updateByDifference(d.instId, ticker);
        if (result)
          EventBus.emit(Events.tickers, this.tickerBook.getDifference());
      }
    });
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
    this.logger.debug(`[${this.constructor.name}]_subscribeTrades`, args);
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
    this.candleChannel = `candle1m`;
    const args = [
      {
        channel: this.candleChannel,
        instId,
      },
    ];
    this.logger.debug(`[${this.constructor.name}]_subscribeCandle`, args);
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
    this.logger.debug(`[${this.constructor.name}]_subscribeTickers`, args);
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
    this.logger.debug(`[${this.constructor.name}]_unsubscribeTrades`, args);
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
  _subscribeMarket(market, wsId) {
    const instId = this._findInstId(market);
    if (this._findSource(instId) === SupportedExchange.OKEX) {
      this.logger.log(
        `++++++++ [${this.constructor.name}]  _subscribeMarket [START] ++++++`
      );
      this.logger.log(`_subscribeMarket instId`, instId);
      this.logger.log(`_subscribeMarket market`, market);
      this._subscribeTrades(instId);
      this._subscribeBook(instId);
      this._subscribeCandle1m(instId);
      this.logger.log(
        `++++++++ [${this.constructor.name}]  _subscribeMarket [END] ++++++`
      );
    }
  }

  _unsubscribeMarket(market) {
    const instId = this._findInstId(market);
    if (this._findSource(instId) === SupportedExchange.OKEX) {
      this.logger.log(
        `---------- [${this.constructor.name}]  _unsubscribeMarket [START] ----------`
      );
      this.logger.log(`_unsubscribeMarket market`, market);
      this.logger.log(`_unsubscribeMarket instId`, instId);
      this._unsubscribeTrades(instId);
      this._unsubscribeBook(instId);
      this._unsubscribeCandle1m(instId);
      this.logger.log(
        `---------- [${this.constructor.name}]  _unsubscribeMarket [END] ----------`
      );
    }
  }

  _subscribeUser() {}

  _unsubscribeUser() {}
  // TideBitEx ws end

  _findInstId(id) {
    return this.markets[id.toUpperCase()];
  }

  _findSource(instId) {
    return this.markets[`tb${instId}`];
  }
}
module.exports = OkexConnector;
