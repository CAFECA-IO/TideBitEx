const ConnectorBase = require("../ConnectorBase");
const Pusher = require("pusher-js");
const axios = require("axios");
const SafeMath = require("../SafeMath");
const EventBus = require("../EventBus");
const Events = require("../../constants/Events");

class TibeBitConnector extends ConnectorBase {
  constructor({ logger }) {
    super({ logger });
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
    // this.pusher = new Pusher(key, {
    //   //   appId: app,
    //   //   key,
    //   //   secret,
    //   encrypted: encrypted,
    //   wsHost: wsHost,
    //   wsPort: wsPort,
    //   wssPort: wssPort,
    //   disableFlash: true,
    //   disableStats: true,
    //   // enabledTransports: ["ws"],
    //   disabledTransports: ["flash", "sockjs"],
    //   forceTLS: false,
    //   authorizer: (channel, options) => {
    //     return {
    //       authorize: (socketId, callback) => {
    //         this.logger.debug(`%*%*%*%%%%%%%%%%%%%%%%%%%%%%%*%*%*%`);
    //         this.logger.debug(`authorize options`, options);
    //         this.logger.debug(`authorize socketId`, socketId);
    //         this.logger.debug(`authorize channel.name`, channel.name);
    //         this.logger.debug(`%*%*%*%%%%%%%%%%%%%%%%%%%%%%%*%*%*%`);
    //         axios({
    //           url: `${this.peatio}/pusher/auth`,
    //           method: "POST",
    //           headers: options.header,
    //           body: JSON.stringify({
    //             socket_id: socketId,
    //             channel_name: channel.name,
    //           }),
    //         })
    //           .then((res) => {
    //             this.logger.debug(`%*%*%*%%%%%%%%%%%%%%%%%%%%%%%*%*%*%`);
    //             this.logger.debug(`authorize res`, res);
    //             this.logger.debug(`%*%*%*%%%%%%%%%%%%%%%%%%%%%%%*%*%*%`);
    //             if (res.status !== 200) {
    //               throw new Error(
    //                 `Received ${res.statusCode} from /pusher/auth`
    //               );
    //             }
    //             return Promise.resolve({
    //               success: true,
    //             });
    //           })
    //           .then((data) => {
    //             callback(null, data);
    //           })
    //           .catch((err) => {
    //             this.logger.debug(`%*%*%*%%%%%%%%%%%%%%%%%%%%%%%*%*%*%`);
    //             this.logger.error(`authorize err`, err);
    //             this.logger.debug(`%*%*%*%%%%%%%%%%%%%%%%%%%%%%%*%*%*%`);
    //             callback(new Error(`Error calling auth endpoint: ${err}`), {
    //               auth: "",
    //             });
    //           });
    //       },
    //     };
    //   },
    // });
    return this;
  }

  _updateTickers(data) {
    /**
    name: 'ETC/USDT',
    base_unit: 'etc',
    quote_unit: 'usdt',
    group: 'usdx',
    low: '0.0',
    high: '0.0',
    last: '0.0',
    open: '0.0',
    volume: '0.0',
    sell: '0.0',
    buy: '0.0',
    at: 1649315293
    */
    this.logger.debug(`_updateTickers data`, data);
    const formatTickers = Object.values(data).map((data) => {
      const change = SafeMath.minus(data.last, data.open);
      const changePct = SafeMath.gt(data.open24h, "0")
        ? SafeMath.div(change, data.open24h)
        : SafeMath.eq(change, "0")
        ? "0"
        : "100";
      return {
        ...data,
        instId: data.name.replace("/", "-"),
        change,
        changePct,
      };
    });
    EventBus.emit(Events.pairOnUpdate, formatTickers);
  }

  registerGlobalChannel() {
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
    const formatBooks = {
      ...data,
      instId,
      ts: Date.now(),
    };
    // this.logger.debug(`_updateBooks data`, data);
    this.logger.debug(`_updateBooks data`);
    EventBus.emit(Events.tideBitBooksOnUpdate, instId, formatBooks);
  }

  _updateTrades(instId, data) {
    // ++ TODO
    // formatTrade
    /**
     */
    const formatTrades = {
      instId,
      trades: data,
      ts: Date.now(),
    };
    this.logger.debug(`_updateTrades data`, data);
    EventBus.emit(Events.tideBitTradesOnUpdate, instId, formatTrades);
  }

  registerMarketChannel(instId) {
    try {
      if (
        this.current_ticker &&
        this.current_ticker === instId &&
        this.market_channel
      ) {
        this.pusher.unsubscribe(
          `market-${instId.replace("-", "").toLowerCase()}-global`
        );
        this.market_channel.unbind(`update`);
        this.market_channel.unbind(`trades`);
        this.market_channel = null;
      }
      this.current_ticker = instId;
      this.market_channel = this.pusher.subscribe(
        `market-${instId.replace("-", "").toLowerCase()}-global`
      );
      this.market_channel.bind("update", (data) =>
        this._updateBooks(instId, data)
      );
      this.market_channel.bind("trades", (data) =>
        this._updateTrades(instId, data)
      );
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
    this.logger.debug(`_updateAccount data`, data);
    EventBus.emit(Events.tideBitAccountOnUpdate, data);
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
    this.logger.debug(`_updateOrder data`, data);
    EventBus.emit(Events.tideBitOrderOnUpdate, data);
  }
  _updateTrade(data) {
    // ++ TODO
    // formatTrade
    this.logger.debug(`_updateTrade data`, data);
    EventBus.emit(Events.tideBitTradeOnUpdate, data);
  }

  async registerPrivateChannel({ header, sn }) {
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
    try {
      if (this.current_user) {
        this.pusher.unsubscribe(`private-${sn}`);
        this.private_channel.unbind("account");
        this.private_channel.unbind("order");
        this.private_channel.unbind("trade");
      }

      this.current_user = sn;
      this.private_channel = this.pusher.subscribe(`private-${sn}`);
      this.private_channel.bind("account", (data) => this._updateAccount(data));
      this.private_channel.bind("order", (data) => this._updateOrder(data));
      this.private_channel.bind("trade", (data) => this._updateTrade(data));
    } catch (error) {
      this.logger.error(`private_channel error`, error);
      throw error;
    }
  }

  _registerMarketChannel(instId) {
    this.current_ticker = instId;
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

  _unregisterMarketChannel(instId) {
    this.market_channel.unbind(`update`);
    this.market_channel.unbind(`trades`);
    this.pusher.unsubscribe(
      `market-${instId.replace("-", "").toLowerCase()}-global`
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
