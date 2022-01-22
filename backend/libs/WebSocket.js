const ws = require('ws');

const HEART_BEAT_TIME = 25000;

class WebSocket {
  constructor({ logger }) {
    this.logger = logger;
    return this;
  }

  init({ url, heartBeat = HEART_BEAT_TIME }) {
    if (!url) throw new Error('Invalid input');
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
    this.ws.on('pong', () => this.heartbeat());
    this.ws.on('close', () => this.clear());
    this.ws.on('error', async (err) => {
      this.logger.error(err);
      await this.init({ url: this.url });
    });
  }

  heartbeat() {
    clearTimeout(this.pingTimeout);
    this.pingTimeout = setTimeout(() => {
      this.logger.debug('heartbeat');
      this.ws.ping();
    }, this.heartBeatTime);
  }

  clear() {
    this.logger.debug('on close!!!, close timeout!!!');
    clearTimeout(this.pingTimeout);
  }

  async send(data, cb) { return this.ws.send(data, cb) };
  set onmessage(cb) { this.ws.onmessage = cb };
}

module.exports = WebSocket;
