import ConnectorBase from "../ConnectorBase";
import Pusher from "pusher-js";
import axios from "axios";

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
  registerTicker(id) {
    if (this.current_ticker) {
      this.pusher.unsubscribe(`market-${id}-global`);
      // unbind
    }
    this.current_ticker = id;
    this.market_channel = this.pusher.subscribe(`market-${id}-global`);
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
}

export default TibeBitConnector;
