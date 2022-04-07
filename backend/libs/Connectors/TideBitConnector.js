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

  registerGlobal() {
    this.global_channel = this.pusher.subscribe("market-global");
    this.global_channel.bind("tickers", (data) =>
      console.log("global_channel", data)
    );
  }

  registerTicker(id) {
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
      this.private_channel.unbind("account");
      this.private_channel.unbind("order");
      this.private_channel.unbind("trade");
    }
    this.current_user = sn;
    this.private_channel = this.pusher.subscribe(`private-${sn}`);
    this.private_channel.bind("account", (data) =>
      console.log("private_channel account", data)
    );
    this.private_channel.bind("order", (data) =>
      console.log("private_channel order", data)
    );
    this.private_channel.bind("trade", (data) =>
      console.log("private_channel trade", data)
    );
  }

  _subscribeInstId(id) {
    // this._registerTicker(id);
  }

  _unsubscribeInstId(id) {
    // this._unregisterTicker(id);
  }
}

module.exports = TibeBitConnector;
