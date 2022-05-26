const HEART_BEAT_TIME = 25000;

class TideBitWS {
  currentUser;
  currentMarket;
  interval;
  connection_resolvers = [];
  constructor() {
    return this;
  }

  setCurrentUser(token) {
    this.currentUser = token;
    this.connection_resolvers.push(
      JSON.stringify({
        op: "userStatusUpdate",
        args: {
          token,
          market: this.tickerBook.market,
        },
      })
    );
  }

  setCurrentMarket(market) {
    this.currentMarket = market;
    this.connection_resolvers.push(
      JSON.stringify({
        op: "switchMarket",
        args: {
          market,
        },
      })
    );
  }

  eventMessenger() {
    console.log("Socket is open");
    if (this.interval) clearInterval(this.interval);

    // !!!!TODO verify
    if (this.currentMarket) this.setCurrentMarket(this.currentMarket);
    if (this.currentUser) this.setCurrentUser(this.currentUser);
    // !!!!TODO verify

    const data = this.connection_resolvers.shift();
    if (data) this.ws.send(data);
    this.interval = setInterval(() => {
      console.log("Interval: connection_resolvers", this.connection_resolvers);
      const data = this.connection_resolvers.shift();
      if (data) this.ws.send(data);
    }, 500);
  }

  eventListener() {
    this.ws.on("pong", () => this.heartbeat());
    this.ws.on("close", (msg) => this.clear(msg));
    this.ws.on("error", async (err) => {
      this.logger.error(err);
      await this.init({ url: this.url });
    });
  }

  heartbeat() {
    clearTimeout(this.pingTimeout);
    this.pingTimeout = setTimeout(() => {
      // this.logger.debug('heartbeat');
      this.ws.ping();
    }, this.heartBeatTime);
  }

  clear(msg) {
    console.log(
      "Socket is closed. Reconnect will be attempted in 1 second.",
      msg.reason
    );
    clearTimeout(this.pingTimeout);
    if (this.interval) clearInterval(this.interval);
    setTimeout(async () => {
      await this.init({ url: this.url });
    }, 1000);
  }

  init({ url, heartBeat = HEART_BEAT_TIME }) {
    if (!url) throw new Error("Invalid input");
    this.url = url;
    this.heartBeatTime = heartBeat;
    this.ws = new WebSocket(url);

    return new Promise((resolve) => {
      this.ws.onopen = (r) => {
        this.heartbeat();
        this.eventMessenger();
        this.eventListener();
        return resolve(r);
      };
    });
  }
}

export default TideBitWS;
