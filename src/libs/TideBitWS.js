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

  clear(msg) {
    console.log(
      "Socket is closed. Reconnect will be attempted in 1 second.",
      msg.reason
    );
    if (this.interval) clearInterval(this.interval);
    // in case connection is broken
    if (msg.code === 1006 || msg.reason === "" || msg.wasClean === false)
      setTimeout(async () => {
        await this.init({ url: this.url });
      }, 1000);
  }

  eventListener() {
    this.ws.onclose = (msg) => this.clear(msg);
    this.ws.onerror = async (err) => {
      this.logger.error(err);
      await this.init({ url: this.url });
    };
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

  /**
   * @param {(msg: any) => void} cb
   */
  set onmessage(cb) {
    this.ws.onmessage = cb;
  }

  init({ url }) {
    if (!url) throw new Error("Invalid input");
    this.url = url;
    this.ws = new WebSocket(url);
    this.eventListener();
    return new Promise((resolve) => {
      this.ws.onopen = (r) => {
        this.eventMessenger();
        return resolve(r);
      };
    });
  }
}

export default TideBitWS;
