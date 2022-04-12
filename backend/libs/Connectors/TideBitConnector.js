const ConnectorBase = require("../ConnectorBase");
const Pusher = require("pusher-js");
const axios = require("axios");
const SafeMath = require("../SafeMath");
const EventBus = require("../EventBus");
const Events = require("../../constants/Events");
const SupportedExchange = require("../../constants/SupportedExchange");
const Utils = require("../Utils");

class TibeBitConnector extends ConnectorBase {
  constructor({ logger }) {
    super({ logger });
    this.start = false;
    this.name = "TibeBitConnector";
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
    peatioDomain,
  }) {
    await super.init();
    this.app = app;
    this.key = key;
    this.secret = secret;
    this.wsHost = wsHost;
    this.wsPort = wsPort;
    this.wssPort = wssPort;
    this.encrypted = encrypted;
    this.peatio = peatioDomain;
    return this;
  }

  _start({ header }) {
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
          authorize: (socketId, callback) => {
            const data = JSON.stringify({
              socket_id: socketId,
              channel_name: channel.name,
            });
            axios({
              url: `${this.peatio}/pusher/auth`,
              method: "POST",
              headers: {
                ...header,
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
          },
        };
      },
    });
    this.start = true;
  }

  _updateTickers(data) {
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
    if (!this.tickers || this.tickers.length === 0) {
      this.tickers = Object.values(data);
      this.logger.log(`_updateTickers this.tickers`, this.tickers);
    }
    const formatTickers = Object.values(data)
      .filter((d) => {
        let index = this.tickers?.findIndex((ticker) => ticker.name === d.name);
        if (
          index === -1 ||
          this.tickers[index].last !== d.last ||
          this.tickers[index].open !== d.open ||
          this.tickers[index].close !== d.close ||
          this.tickers[index].high !== d.high ||
          this.tickers[index].low !== d.low ||
          this.tickers[index].volume !== d.volume
        ) {
          this.tickers[index] = d;
          return true;
        } else return false;
      })
      .map((d) => {
        const change = SafeMath.minus(d.last, d.open);
        const changePct = SafeMath.gt(d.open24h, "0")
          ? SafeMath.div(change, d.open24h)
          : SafeMath.eq(change, "0")
          ? "0"
          : "1";
        return {
          ...d,
          instId: d.name.replace("/", "-"),
          change,
          changePct,
          source: SupportedExchange.TIDEBIT,
        };
      });
    if (formatTickers.length > 0) {
      this.logger.log(`_updateTickers formatTickers`, formatTickers);
      EventBus.emit(Events.tickersOnUpdate, formatTickers);
    }
  }

  registerGlobalChannel({ header }) {
    if (!this.start) this._start({ header });
    try {
      this.global_channel = this.pusher.subscribe("market-global");
      this.global_channel.bind("tickers", (data) => this._updateTickers(data));
    } catch (error) {
      this.logger.error(`registerGlobalChannel error`, error);
      throw error;
    }
  }

  _updateBooks(instId, data) {
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
    this.logger.debug(`_updateBooks data`, data);
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
      instId,
      ts: Date.now(),
    };
    this.logger.debug(`_updateBooks formatBooks`, formatBooks);
    // if (asks.length > 0 || bids.length > 0)
    EventBus.emit(Events.orderBooksOnUpdate, instId, formatBooks);
  }

  _updateTrade(data) {
    /**  {
    at: 1649675739
    id: 6
    kind: "ask"
    market: "ethhkd"
    price: "105.0"
    volume: "0.1"
    }*/
    const formatTrade = {
      ...data,
      instId: this.current_instId,
    };
    this.logger.debug(`_updateTrade data`, data);
    this.logger.debug(`_updateTrade formatTrade`, formatTrade);
    EventBus.emit(Events.tradesOnUpdate, this.current_instId, [formatTrade]);
  }

  _updateTrades(data) {
    /**
    {
      trades: [
        amount: "0.07"
        classes: "new"
        date: 1649665223 (s)
        escape: ƒ (e)
        price: "0.2769"
        safe: undefined
        tid: 31841859
        type: "buy"
      ]
    }
    */
    const formatTrades = data.trades
      .map((t) => ({
        instId: this.current_instId,
        id: t.tid,
        price: t.price,
        volume: t.amount,
        market: t.market,
        type: t.type,
        at: t.date,
        side: t.type === "sell" ? "down" : "up",
      }))
      .sort((a, b) => b.at - a.at);
    if (formatTrades.length > 0) {
      this.logger.debug(`_updateTrade formatTrades`, formatTrades);
      EventBus.emit(Events.tradesOnUpdate, this.current_instId, formatTrades);
    }
  }

  async getOrderBooks({ header, instId }) {
    if (!this.start) this._start({ header });
    // const response = await this.pusher.get({
    //   path: `${this.peatio}/channels/market-${instId
    //     .replace("-", "")
    //     .toLowerCase()}-global`,
    // });
    const response = await axios({
      method: "GET",
      url: `${this.peatio}/apps/${this.app}/channels/market-${instId
        .replace("-", "")
        .toLowerCase()}-global`,
      headers: header,
    });
    if (response.status === 200) {
      const body = await response.json();
      const channelsInfo = body.channels;
      this.logger.log(`getOrderBooks response`, response);
      this.logger.log(`getOrderBooks channelsInfo`, channelsInfo);
    }
  }

  registerMarketChannel({ header, instId, resolution }) {
    if (!this.start) this._start({ header });
    try {
      if (
        this.current_instId &&
        this.current_instId !== instId &&
        this.market_channel
      ) {
        this.market_channel.unbind();
        this.pusher.unsubscribe(
          `market-${this.instId.replace("-", "").toLowerCase()}-global`
        );
        this.market_channel = null;
      }
      this.current_instId = instId;
      this.resolution = resolution;
      this.market_channel = this.pusher.subscribe(
        `market-${instId.replace("-", "").toLowerCase()}-global`
      );
      this.market_channel.bind("update", (data) =>
        this._updateBooks(instId, data)
      );
      this.market_channel.bind("trades", (data) => {
        this._updateTrades(data);
      });
    } catch (error) {
      this.logger.error(`registerMarketChannel error`, error);
      throw error;
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
    EventBus.emit(Events.accountOnUpdate, formatAccount);
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
      instId: this.current_instId,
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
    EventBus.emit(Events.orderOnUpdate, formatOrder);
  }

  async registerPrivateChannel({ header, sn, instId, resolution }) {
    this.unregisterAll();
    this.start = false;
    if (!this.start) this._start({ header });
    try {
      if (this.current_user) {
        this.private_channel?.unbind();
        this.pusher.unsubscribe(`private-${this.current_user}`);
      }
      this.registerGlobalChannel({ header });
      this.registerMarketChannel({ header, instId, resolution });
      this.current_user = sn;
      this.private_channel = this.pusher.subscribe(`private-${sn}`);
      this.private_channel.bind("account", (data) => this._updateAccount(data));
      this.private_channel.bind("order", (data) => this._updateOrder(data));
      this.private_channel.bind("trade", (data) => {
        this._updateTrade(data);
      });
    } catch (error) {
      this.logger.error(`private_channel error`, error);
      throw error;
    }
  }

  unregisterAll() {
    try {
      this.global_channel?.unbind();
      this.market_channel?.unbind();
      this.private_channel?.unbind();
      this.pusher?.unsubscribe("market-global");
      this.pusher?.unsubscribe(
        `market-${this.current_instId.replace("-", "").toLowerCase()}-global`
      );
      this.pusher?.unsubscribe(`private-${this.current_user}`);
      this.market_channel = null;
      this.global_channel = null;
      this.private_channel = null;
    } catch (error) {
      this.logger.error(`registerGlobalChannel error`, error);
      throw error;
    }
  }

  _registerMarketChannel(instId) {
    if (!this.start) return;
    this.current_instId = instId;
    this.market_channel = this.pusher.subscribe(
      `market-${instId.replace("-", "").toLowerCase()}-global`
    );
    this.market_channel.bind("update", (data) =>
      this._updateBooks(instId, data)
    );
    this.market_channel.bind("trades", (data) =>
      this._updateTrades(instId, data)
    );
  }

  _unregisterMarketChannel() {
    if (!this.start) return;
    this.market_channel.unbind(`update`);
    this.market_channel.unbind(`trades`);
    this.pusher.unsubscribe(
      `market-${this.current_instId.replace("-", "").toLowerCase()}-global`
    );
    this.market_channel = null;
  }

  // ++ TODO
  _subscribeInstId(instId) {
    // this._registerMarketChannel(instId);
  }

  // ++ TODO
  _unsubscribeInstId(instId) {
    // this._unregisterMarketChannel(instId);
  }
}

module.exports = TibeBitConnector;
