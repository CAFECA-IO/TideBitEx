const ConnectorBase = require("../ConnectorBase");
const Pusher = require("pusher-js");
const axios = require("axios");

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
      enabledTransports: ["ws"],
      disabledTransports: ["flash", "sockjs"],
    });
    return this;
  }
  registerGlobal() {
    this.global_channel = this.pusher.subscribe("market-global");
    this.global_channel.bind("tickers", (data) =>
      console.log("global_channel", data)
    );
  }
  _unregisterTicker(id) {
    if (
      this.current_ticker &&
      this.current_ticker === id &&
      this.market_channel
    ) {
      this.pusher.unsubscribe(`market-${id}-global`);
      this.market_channel.unbind(`update`);
      this.market_channel.unbind(`trades`);
      this.market_channel = null;
    }
  }
  _registerTicker(id) {
    this.current_ticker = id;
    this.market_channel = this.pusher.subscribe(`market-${id}-global`);
    this.market_channel.bind("update", (data) =>
      console.log("market_channel update", data)
    );
    this.market_channel.bind("trades", (data) =>
    console.log("market_channel trades", data)
  );
  }
  async registerUser(sn) {
    if (this.current_user) {
      this.pusher.unsubscribe(`private-${sn}`);
      // unbind
    }
    try {
      //   this.pusher.authenticate(socketId, `private-${sn}`);
    } catch (error) {}

    this.current_user = sn;

    this.private_channel = this.pusher.subscribe(`private-${sn}`);
  }
  // TideBitEx ws
  _subscribeInstId(id) {
    this._registerTicker(id);
  }

  _unsubscribeInstId(id) {
    this._unregisterTicker(id);
  }
}

module.exports = TibeBitConnector;
