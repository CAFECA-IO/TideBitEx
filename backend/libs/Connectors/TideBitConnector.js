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
  async init({ app, key, secret, wsHost, port, wsPort, wssPort, encrypted }) {
    await super.init();
    this.pusher = new Pusher(key, {
      encrypted: encrypted,
      wsHost: wsHost,
      wsPort: wsPort,
      wssPort: wssPort,
      disableFlash: true,
      disableStats: true,
      // enabledTransports: ["ws"],
      disabledTransports: ["flash", "sockjs"],
      forceTLS: false,
      authorizer: (channel, options) => {
        return {
          authorize: (socketId, callback) => {
            fetch("/pusher/auth", {
              method: "POST",
              headers: new Headers({ "Content-Type": "application/json" }),
              body: JSON.stringify({
                socket_id: socketId,
                channel_name: channel.name,
              }),
            })
              .then((res) => {
                if (!res.ok) {
                  throw new Error(
                    `Received ${res.statusCode} from /pusher/auth`
                  );
                }
                return res.json();
              })
              .then((data) => {
                callback(null, data);
              })
              .catch((err) => {
                callback(new Error(`Error calling auth endpoint: ${err}`), {
                  auth: "",
                });
              });
          },
        };
      },
    });
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
    const formatPair = Object.values(data).map((data) => {
      const change = SafeMath.minus(data.last, data.open);
      const changePct = SafeMath.div(change, data.open);
      return {
        instId: data.name.replace("/", "-"),
        last: data.last,
        change,
        changePct,
        open24h: data.open,
        high24h: data.high,
        low24h: data.low,
        volCcy24h: data.volume, // ??
        vol24h: data.volume, // ??
        ts: data.at,
        // openUtc0: data.sodUtc0,
        // openUtc8: data.sodUtc8,
      };
    });
    EventBus.emit(Events.tideBitTickersOnUpdate, formatPair);
  }

  registerGlobal() {
    this.global_channel = this.pusher.subscribe("market-global");
    this.global_channel.bind("tickers", (data) => this._updateTickers(data));
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
      instId,
      asks: data.asks,
      bids: data.bids,
      ts: Date.now(),
    };
    this.logger.debug(`_updateBooks data`, data);
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

  registerTicker(instId) {
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
  }

  _updateAccount(data) {
    /**
    {
        balance: '386.8739', 
        locked: '436.73', 
        currency: 'hkd'
    }
    */
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
    EventBus.emit(Events.tideBitOrderOnUpdate, data);
  }
  _updateTrade(data) {
    // ++ TODO
    // formatTrade
    EventBus.emit(Events.tideBitTradeOnUpdate, data);
  }

  async registerUser(sn) {
    if (this.current_user) {
      this.pusher.unsubscribe(`private-${sn}`);
      this.private_channel.unbind("account");
      this.private_channel.unbind("order");
      this.private_channel.unbind("trade");
    }
    this.current_user = sn;
    try {
      this.private_channel = this.pusher.subscribe(`private-${sn}`);
      this.private_channel.bind("account", (data) => this._updateAccount(data));
      this.private_channel.bind("order", (data) => this._updateOrder(data));
      this.private_channel.bind("trade", (data) => this._updateTrade(data));
    } catch (error) {
      this.logger.error(`private_channel error`, error);
    }
  }

  _subscribeInstId(id) {
    // this._registerTicker(id);
  }

  _unsubscribeInstId(id) {
    // this._unregisterTicker(id);
  }
}

module.exports = TibeBitConnector;
