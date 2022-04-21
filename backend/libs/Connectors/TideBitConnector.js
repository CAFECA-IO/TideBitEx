const ConnectorBase = require("../ConnectorBase");
const Pusher = require("pusher-js");
const axios = require("axios");
const SafeMath = require("../SafeMath");
const EventBus = require("../EventBus");
const Events = require("../../constants/Events");
const SupportedExchange = require("../../constants/SupportedExchange");
const Utils = require("../Utils");
const redis = require("redis");
const ResponseFormat = require("../ResponseFormat");
const Codes = require("../../constants/Codes");

class TibeBitConnector extends ConnectorBase {
  constructor({ logger }) {
    super({ logger });
    this.isStarted = false;
    this.name = "TibeBitConnector";
    this.tickers = {};
    this.trades = [];
    return this;
  }
  async init({
    app,
    key,
    secret,
    wsHost,
    port,
    wsPort,
    wssPort,
    encrypted,
    peatio,
    markets,
    database,
    redis,
  }) {
    await super.init();
    this.app = app;
    this.key = key;
    this.secret = secret;
    this.wsHost = wsHost;
    this.wsPort = wsPort;
    this.wssPort = wssPort;
    this.encrypted = encrypted;
    this.peatio = peatio;
    this.markets = markets;
    this.database = database;
    this.redis = redis;
    return this;
  }

  async getMemberIdFromRedis(peatioSession) {
    const client = redis.createClient({
      url: this.redis,
    });

    client.on("error", (err) => this.logger.error("Redis Client Error", err));

    try {
      await client.connect(); // 會因為連線不到卡住
      const value = await client.get(
        redis.commandOptions({ returnBuffers: true }),
        peatioSession
      );
      await client.quit();
      // ++ TODO: 下面補error handle
      const split1 = value
        .toString("latin1")
        .split("member_id\x06:\x06EFi\x02");
      const memberIdLatin1 = split1[1].split('I"')[0];
      const memberIdString = Buffer.from(memberIdLatin1, "latin1")
        .reverse()
        .toString("hex");
      const memberId = parseInt(memberIdString, 16);
      return memberId;
    } catch (error) {
      this.logger.error(error);
      await client.quit();
      return -1;
    }
  }

  _start(headers) {
    this.pusher = new Pusher(this.key, {
      //   appId: app,
      //   key,
      //   secret,
      encrypted: this.encrypted,
      wsHost: this.wsHost,
      wsPort: this.wsPort,
      wssPort: this.wssPort,
      disableFlash: true,
      disableStats: true,
      // enabledTransports: ["ws"],
      disabledTransports: ["flash", "sockjs"],
      forceTLS: false,
      authorizer: (channel, options) => {
        return {
          authorize: headers
            ? (socketId, callback) => {
                const data = JSON.stringify({
                  socket_id: socketId,
                  channel_name: channel.name,
                });
                axios({
                  url: `${this.peatio}/pusher/auth`,
                  method: "POST",
                  headers: {
                    ...headers,
                    "Content-Length": Buffer.from(data, "utf-8").length,
                  },
                  data,
                })
                  .then((res) => {
                    if (res.status !== 200) {
                      throw new Error(
                        `Received ${res.statusCode} from /pusher/auth`
                      );
                    }
                    return res.data;
                  })
                  .then((data) => {
                    this.logger.debug(`%*%*%*%%%%%%%%%%%%%%%%%%%%%%%*%*%*%`);
                    this.logger.debug(`authorize data`, data);
                    this.logger.debug(`%*%*%*%%%%%%%%%%%%%%%%%%%%%%%*%*%*%`);
                    callback(null, data);
                  })
                  .catch((err) => {
                    this.logger.debug(`%*%*%*%%%%%%%%%%%%%%%%%%%%%%%*%*%*%`);
                    this.logger.error(`authorize err`, err);
                    this.logger.debug(`%*%*%*%%%%%%%%%%%%%%%%%%%%%%%*%*%*%`);
                    callback(new Error(`Error calling auth endpoint: ${err}`), {
                      auth: "",
                    });
                  });
              }
            : null,
        };
      },
    });
    this.isStarted = true;
    // this.pusher.bind_global((data) =>
    //   this.logger.log(`[Pusher][bind_global] data`, data)
    // );
    if (headers) this.isCredential = true;
  }

  async getTicker({ query }) {
    this.logger.log(`****----**** getTicker [START] ****----****`);
    this.logger.log(`query.id`, query.id, `query.instId`, query.instId);
    const tBTickerRes = await axios.get(
      `${this.peatio}/api/v2/tickers/${query.id}`
    );
    if (!tBTickerRes || !tBTickerRes.data) {
      return new ResponseFormat({
        message: "Something went wrong",
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
    const tBTicker = tBTickerRes.data;
    const change = SafeMath.minus(tBTicker.ticker.last, tBTicker.ticker.open);
    const changePct = SafeMath.gt(tBTicker.ticker.open, "0")
      ? SafeMath.div(change, tBTicker.ticker.open)
      : SafeMath.eq(change, "0")
      ? "0"
      : "1";

    const formatTBTicker = {};
    formatTBTicker[query.id] = {
      market: query.id,
      instId: query.instId,
      name: query.instId.replace("-", "/"),
      base_unit: query.instId.split("-")[0].toLowerCase(),
      quote_unit: query.instId.split("-")[1].toLowerCase(),
      ...tBTicker.ticker,
      at: tBTicker.at,
      change,
      changePct,
      volume: tBTicker.ticker.vol.toString(),
      source: SupportedExchange.TIDEBIT,
      group: undefined,
    };
    this.logger.log(`[${this.name}] formatTBTicker`, formatTBTicker);
    this.logger.log(`****----**** getTicker [START] ****----****`);

    return new ResponseFormat({
      message: "getTicker",
      payload: formatTBTicker,
    });
  }

  async getTickers({ optional }) {
    const tBTickersRes = await axios.get(`${this.peatio}/api/v2/tickers`);
    if (!tBTickersRes || !tBTickersRes.data) {
      return new ResponseFormat({
        message: "Something went wrong",
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
    const tBTickers = tBTickersRes.data;
    const formatTickers = Object.keys(tBTickers).reduce((prev, currId) => {
      const instId = this._findInstId(currId);
      const tickerObj = tBTickers[currId];
      const change = SafeMath.minus(
        tickerObj.ticker.last,
        tickerObj.ticker.open
      );
      const changePct = SafeMath.gt(tickerObj.ticker.open, "0")
        ? SafeMath.div(change, tickerObj.ticker.open)
        : SafeMath.eq(change, "0")
        ? "0"
        : "1";
      prev[currId] = {
        market: currId,
        instId,
        name: instId.replace("-", "/"),
        base_unit: instId.split("-")[0].toLowerCase(),
        quote_unit: instId.split("-")[1].toLowerCase(),
        buy: tickerObj.ticker.buy,
        sell: tickerObj.ticker.sell,
        low: tickerObj.ticker.low,
        high: tickerObj.ticker.high,
        last: tickerObj.ticker.last,
        open: tickerObj.ticker.open,
        volume: tickerObj.ticker.vol,
        change,
        changePct,
        at: parseInt(tickerObj.at),
        source: SupportedExchange.TIDEBIT,
      };
      return prev;
    }, {});
    optional.mask.forEach((market) => {
      let ticker = formatTickers[market.id];
      if (ticker)
        this.tickers[market.id] = {
          ...ticker,
          group: market.group,
          market: market.id,
        };
      else {
        const instId = this._findInstId(market.id);
        this.tickers[market.id] = {
          market: market.id,
          instId,
          name: market.name,
          base_unit: market.base_unit,
          quote_unit: market.quote_unit,
          group: market.group,
          buy: "0.0",
          sell: "0.0",
          low: "0.0",
          high: "0.0",
          last: "0.0",
          open: "0.0",
          volume: "0.0",
          change: "0.0",
          changePct: "0.0",
          at: "0.0",
          source: SupportedExchange.TIDEBIT,
        };
      }
    });
    return new ResponseFormat({
      message: "getTickers",
      payload: this.tickers,
    });
  }

  _updateTickers(data) {
    // this.logger.log(`[${this.name}]_updateTickers data`, data);
    /**
   {
   btchkd: {
    name: 'BTC/HKD',
    base_unit: 'btc',
    quote_unit: 'hkd',
    group: 'hkd',
    low: '0.0',
    high: '0.0',
    last: '0.0',
    open: '0.0',
    volume: '0.0',
    sell: '0.0',
    buy: '1000.0',
    at: 1649742406
  },}
    */
    const updateTickers = {};
    Object.keys(data).forEach((id) => {
      if (
        this.tickers[id] &&
        (this.tickers[id]?.last !== data[id].last ||
          this.tickers[id]?.open !== data[id].open ||
          this.tickers[id]?.high !== data[id].high ||
          this.tickers[id]?.low !== data[id].low ||
          this.tickers[id]?.volume !== data[id].volume)
      ) {
        const change = SafeMath.minus(data[id].last, data[id].open);
        const changePct = SafeMath.gt(data[id].open, "0")
          ? SafeMath.div(change, data[id].open)
          : SafeMath.eq(change, "0")
          ? "0"
          : "1";
        updateTickers[id] = { ...data[id], change, changePct, market: id };
      }
    });

    if (Object.keys(updateTickers).length > 0) {
      // this.logger.log(
      //   `[${this.name}]_updateTickers updateTickers`,
      //   updateTickers
      // );
      EventBus.emit(Events.tickers, updateTickers);
    }
  }

  async getOrderBooks({ query }) {
    try {
      const tbBooksRes = await axios.get(
        `${this.peatio}/api/v2/order_book?market=${query.id}`
      );
      if (!tbBooksRes || !tbBooksRes.data) {
        return new ResponseFormat({
          message: "Something went wrong",
          code: Codes.API_UNKNOWN_ERROR,
        });
      }
      const tbBooks = tbBooksRes.data;
      const asks = [];
      const bids = [];
      this.logger.log(`tbBooks query.id`, query.id);
      tbBooks.asks.forEach((ask) => {
        if (
          ask.market === query.id &&
          ask.ord_type === "limit" &&
          ask.state === "wait"
        ) {
          let index;
          index = asks.findIndex((_ask) =>
            SafeMath.eq(_ask[0], ask.price.toString())
          );
          if (index !== -1) {
            let updateAsk = asks[index];
            updateAsk[1] = SafeMath.plus(updateAsk[1], ask.remaining_volume);
            asks[index] = updateAsk;
          } else {
            let newAsk = [ask.price.toString(), ask.remaining_volume]; // [價格, volume]
            asks.push(newAsk);
          }
        }
      });
      tbBooks.bids.forEach((bid) => {
        if (
          bid.market === query.id &&
          bid.ord_type === "limit" &&
          bid.state === "wait"
        ) {
          let index;
          index = bids.findIndex((_bid) =>
            SafeMath.eq(_bid[0], bid.price.toString())
          );
          if (index !== -1) {
            let updateBid = bids[index];
            updateBid[1] = SafeMath.plus(updateBid[1], bid.remaining_volume);
            bids[index] = updateBid;
          } else {
            let newBid = [bid.price.toString(), bid.remaining_volume]; // [價格, volume]
            bids.push(newBid);
          }
        }
      });
      const books = { asks, bids, market: query.id };
      return new ResponseFormat({
        message: "getOrderBooks",
        payload: books,
      });
    } catch (error) {
      this.logger.error(error);
      const message = error.message;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }

  _updateBooks(market, data) {
    /**
    {
        asks: [
            ['160.0', '2.0998'],
            ['300.0', '1.0']
        ], 
        bids: [
            ['110.0', '13.4916'],
            ['10.0', '0.118']
        ]
    }
    */
    if (data.asks.length === 0 || data.bids.length === 0) return;
    let index,
      asks = [],
      bids = [];
    // this.logger.debug(`_updateBooks data`, data);
    // this.logger.debug(`_updateBooks this.books`, this.books);
    if (this.books) {
      this.books.asks.forEach((ask) => {
        index = data.asks.findIndex((_ask) => _ask[0] === ask[0]);
        if (index === -1) {
          asks.push([ask[0], "0"]);
        }
      });
      data.asks.forEach((ask) => {
        index = this.books.asks.findIndex((_ask) => _ask[0] === ask[0]);
        if (index === -1 || this.books.asks[index][1] !== ask[1]) {
          asks.push(ask);
        }
      });
      this.books.bids.forEach((bid) => {
        index = data.bids.findIndex((_bid) => _bid[0] === bid[0]);
        if (index === -1) {
          bids.push([bid[0], "0"]);
        }
      });
      data.bids.forEach((bid) => {
        index = this.books.bids.findIndex((_bid) => _bid[0] === bid[0]);
        if (index === -1 || this.books.bids[index][1] !== bid[1]) {
          bids.push(bid);
        }
      });
    }
    this.books = data;
    const formatBooks = {
      asks,
      bids,
      market,
    };
    if (asks.length > 0 || bids.length > 0) {
      // this.logger.debug(`_updateBooks formatBooks`, formatBooks);
      EventBus.emit(Events.update, market, formatBooks);
    }
  }
  /**
    [
      {
        "id": 48,
        "price": "110.0",
        "volume": "54.593",
        "funds": "6005.263",
        "market": "ethhkd",
        "created_at": "2022-04-01T09:40:21Z",
        "at": 1648806021,
        "side": "down"
      },
    ]
    */
  async getTrades({ query }) {
    const tbTradesRes = await axios.get(
      `${this.peatio}/api/v2/trades?market=${query.id}`
    );
    if (!tbTradesRes || !tbTradesRes.data) {
      return new ResponseFormat({
        message: "Something went wrong",
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
    const tbTrades = tbTradesRes.data
      .sort((a, b) => (query.increase ? a.at - b.at : b.at - a.at))
      .map((tbTrade, i) => ({
        instId: this._findInstId(query.id),
        id: tbTrade.id,
        price: tbTrade.price,
        volume: tbTrade.volume,
        market: tbTrade.market,
        at: tbTrade.at,
        side: tbTrade.side,
      }));
    this.trades = tbTrades;
    this.logger.debug(`+++++++++++ getTrades *+++++++++++ `);
    this.logger.debug(` this.trades`, this.trades);
    this.logger.debug(`+++++++++++ getTrades *+++++++++++ `);
    return new ResponseFormat({
      message: "getTrades",
      payload: tbTrades,
    });
  }

  _updateTrade(data) {
    this.logger.debug(`***********_updateTrade************`);
    // this.logger.debug(`_updateTrade data`, data);
    /**  {
    at: 1649675739
    id: 6
    kind: "ask"
    market: "ethhkd"
    price: "105.0"
    volume: "0.1"
    }*/
    if (
      SafeMath.gte(data.at, this.trades[0].at) &&
      !this.trades.find((_t) => _t.id === data.id)
    ) {
      const formatTrade = {
        instId: this._findInstId(data.market),
        id: data.id,
        price: data.price,
        volume: data.volume,
        market: data.market,
        at: data.at,
        side: SafeMath.gte(data.price, this.trades[0].price) ? "up" : "down",
      };
      this.logger.debug(`_updateTrade formatTrade`, formatTrade);
      this.logger.debug(`***********_updateTrade************`);
      EventBus.emit(Events.trade, data.market, formatTrade);
    }
  }

  _updateTrades(market, data) {
    this.logger.debug(`****$$*****_updateTradeS*****$$*****`);
    this.logger.debug(`_updateTrade data`, data);
    this.logger.debug(`****$$*****_updateTradeS*****$$*****`);
    /**
    {
       trades: [
         {
           tid: 118,
           type: 'buy',
           date: 1650532785,
           price: '95.0',
           amount: '0.1'
         }
       ]
    }
    */
    const filteredTrades = data.trades
      .filter(
        (t) =>
          SafeMath.gte(t.date, this.trades[0].at) &&
          !this.trades.find((_t) => _t.id === t.tid)
      )
      .sort((a, b) => b.date - a.date);
    const formatTrades = filteredTrades
      .map((t, i) => ({
        market,
        id: t.tid,
        price: t.price,
        volume: t.amount,
        type: t.type,
        at: t.date,
        side:
          i === filteredTrades.length - 1
            ? SafeMath.gte(t.price, this.trades[0].price)
              ? "up"
              : "down"
            : SafeMath.gte(t.price, filteredTrades[i + 1].price)
            ? "up"
            : "down",
      }))
      .sort((a, b) => b.at - a.at);
    if (formatTrades.length > 0) {
      this.logger.debug(`_updateTrade formatTrades`, formatTrades);
      EventBus.emit(Events.trades, market, formatTrades);
    }
  }

  _updateAccount(data) {
    /**
    {
        balance: '386.8739', 
        locked: '436.73', 
        currency: 'hkd'
    }
    */
    const formatAccount = {
      ccy: data.currency.toUpperCase(),
      totalBal: SafeMath.plus(data.balance, data.locked),
      availBal: data.balance,
      frozenBal: data.locked,
      uTime: Date.now(),
    };
    this.logger.debug(`_updateAccount formatAccount`, formatAccount);
    EventBus.emit(Events.account, formatAccount);
  }

  _updateOrder(data) {
    /**
    {
        id: 86, 
        at: 1649243638, 
        market: 'ethhkd', 
        kind: 'bid', 
        price: null, // market prcie
        origin_volume: "2.0",
        safe: undefined,
        state: "wait",
        state_text: "Waiting",
        volume: "2.0",
        escape: ƒ (value)
    }
    */
    // ++ TODO
    // formatOrder
    const formatOrder = {
      ordId: data.id,
      clOrdId: data.id,
      instId: this._findInstId(data.market),
      market: data.market,
      ordType: data.price === undefined ? "market" : "limit",
      px: data.price,
      side: data.kind === "bid" ? "buy" : "sell",
      sz: Utils.removeZeroEnd(
        SafeMath.eq(data.volume, "0") ? data.origin_volume : data.volume
      ),
      filled: data.volume !== data.origin_volume,
      state:
        data.state === "wait"
          ? "waiting"
          : SafeMath.eq(data.volume, "0")
          ? "done"
          : "canceled",
    };
    this.logger.debug(`_updateOrder formatOrder`, formatOrder);
    EventBus.emit(Events.order, data.market, formatOrder);
  }

  async _registerPrivateChannel(credential) {
    this.logger.debug(`++++++++_registerPrivateChannel++++++`);
    this.logger.debug(`this.isStarted`, this.isStarted);
    this.logger.debug(`this.isCredential`, this.isCredential);
    this.logger.debug(`++++++++_registerPrivateChannel++++++`);
    if (!this.isStarted || !this.isCredential) this._start(credential.headers);
    try {
      const memberId = await this.getMemberIdFromRedis(credential["token"]);
      if (memberId !== -1) {
        this.token = credential["token"];
        const member = await this.database.getMemberById(memberId);
        this.memberSN = member.sn;
        this.private_channel = this.pusher.subscribe(`private-${member.sn}`);
        this.private_channel.bind("account", (data) =>
          this._updateAccount(data)
        );
        this.private_channel.bind("order", (data) => this._updateOrder(data));
        // this.private_channel.bind("trade", (data) => {
        //   this._updateTrade(data);
        // });
        this.logger.debug(`++++++++++++++`);
        this.logger.debug(`_subscribeUser member.sn`, member.sn);
        this.logger.debug(`++++++++++++++`);
      }
    } catch (error) {
      this.logger.error(`private_channel error`, error);
      throw error;
    }
  }

  async _unregisterPrivateChannel(credential) {
    if (!this.isCredential || !this.memberSN) return;
    try {
      this.logger.debug(`++++++++_unregisterPrivateChannel++++++`);
      this.logger.debug(`this.memberSN`, this.memberSN);
      this.logger.debug(`++++++++_unregisterPrivateChannel++++++`);
      this.private_channel?.unbind();
      this.private_channel = this.pusher.unsubscribe(
        `private-${this.memberSN}`
      );
      if (credential["token"] && this.token !== credential["token"]) {
        const memberId = await this.getMemberIdFromRedis(credential["token"]);
        if (memberId !== -1) {
          const member = await this.database.getMemberById(memberId);
          this.private_channel = this.pusher.unsubscribe(
            `private-${member.sn}`
          );
        }
      }
      this.private_channel = null;
      this.pusher = null;
      this.isStarted = false;
      this.logger.debug(`++++++++++++++`);
      this.logger.debug(`_unsubscribeUser this.memberSN`, this.memberSN);
      this.logger.debug(`++++++++++++++`);
    } catch (error) {
      this.logger.error(`_unregisterPrivateChannel error`, error);
      throw error;
    }
  }

  _registerMarketChannel(market) {
    if (!this.isStarted) this._start();
    try {
      this.market_channel = this.pusher.subscribe(`market-${market}-global`);
      this.global_channel = this.pusher.subscribe("market-global");
      this.logger.log(`++++++++++_registerMarketChannel++++++++++++`);
      this.logger.log(`market`, market);
      this.logger.log(`++++++++++_registerMarketChannel++++++++++++`);
      this.market_channel.bind("update", (data) =>
        this._updateBooks(market, data)
      );
      this.market_channel.bind("trades", (data) => {
        this._updateTrades(market, data);
      });
      this.global_channel.bind("tickers", (data) => this._updateTickers(data));
    } catch (error) {
      this.logger.error(`_registerMarketChannel error`, error);
      throw error;
    }
  }

  _unregisterMarketChannel(market) {
    try {
      this.market_channel?.unbind();
      this.global_channel?.unbind();
      this.logger.log(`++++++++++_unregisterMarketChannel++++++++++++`);
      this.logger.log(`THIS IS CALLED market`, market);
      this.logger.log(`++++++++++_unregisterMarketChannel++++++++++++`);
      this.pusher?.unsubscribe(`market-${market}-global`);
      this.pusher?.unsubscribe("market-global");
      this.market_channel = null;
      this.global_channel = null;
    } catch (error) {
      this.logger.error(`_unregisterMarketChannel error`, error);
      throw error;
    }
  }

  async _subscribeUser(credential) {
    this.logger.log(`++++++++++_subscribeUser++++++++++++`);
    this.logger.log(`credential`, credential);
    this.logger.log(`++++++++++_subscribeUser++++++++++++`);
    await this._registerPrivateChannel(credential);
    this._registerMarketChannel(credential.market);
  }

  async _unsubscribeUser(market) {
    this.logger.log(`---------_UNsubscribeUSER-----------`);
    this.logger.log(`market`);
    this.logger.log(`---------_UNsubscribeUSER-----------`);
    this._unregisterPrivateChannel(market);
    this._unregisterMarketChannel(market);
  }

  _subscribeMarket(market) {
    this.logger.log(`++++++++++_subscribeMarket++++++++++++`);
    this.logger.log(`market`, market);
    this.logger.log(`++++++++++_subscribeMarket++++++++++++`);
    this._registerMarketChannel(market);
  }

  async _unsubscribeMarket(market) {
    this.logger.log(`---------_UNsubscribeMARKET-----------`);
    this.logger.log(`market`, market);
    this.logger.log(`---------_UNsubscribeMARKET-----------`);
    this._unregisterMarketChannel(market);
  }

  _findInstId(id) {
    return this.markets[id.toUpperCase()];
  }
}

module.exports = TibeBitConnector;
