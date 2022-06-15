const ws = require("ws");

const HEART_BEAT_TIME = 25000;

class WebSocket {
  wsReConnectTimeout;
  constructor({ logger }) {
    this.logger = logger;
    return this;
  }

  init({ url, heartBeat = HEART_BEAT_TIME }) {
    if (!url) throw new Error("Invalid input");
    this.url = url;
    this.heartBeatTime = heartBeat;
    this.ws = new ws(this.url);

    return new Promise((resolve) => {
      this.ws.onopen = (r) => {
        this.heartbeat();
        this.eventListener();
        return resolve(r);
      };
    });
  }

  eventListener() {
    this.ws.on("pong", () => this.heartbeat());
    this.ws.on("close", async (event) => await this.clear(event));
    this.ws.on("error", async (err) => {
      this.logger.error(err);
      clearTimeout(this.wsReConnectTimeout);
      this.wsReConnectTimeout = setTimeout(async () => {
        await this.init({ url: this.url });
      }, 1000);
    });
  }

  heartbeat() {
    clearTimeout(this.pingTimeout);
    this.pingTimeout = setTimeout(() => {
      // this.logger.debug('heartbeat');
      this.ws.ping();
    }, this.heartBeatTime);
  }

  async clear(event) {
    clearTimeout(this.wsReConnectTimeout);
    if (event.wasClean) {
      this.logger.debug(
        `[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`
      );
      clearTimeout(this.pingTimeout);
    } else {
      // e.g. server process killed or network down
      // event.code is usually 1006 in this case
      this.logger.error("[close] Connection died");
      this.wsReConnectTimeout = setTimeout(async () => {
        await this.init({ url: this.url });
      }, 1000);
    }
  }

  async send(data, cb) {
    return this.ws.send(data, cb);
  }
  set onmessage(cb) {
    this.ws.onmessage = cb;
  }
}

module.exports = WebSocket;
