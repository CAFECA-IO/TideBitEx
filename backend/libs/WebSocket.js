const ws = require('ws');

class WebSocket {
  constructor({ logger }) {
    this.logger = logger;
    return this;
  }

  init({ url = 'wss://ws.okx.com:8443/ws/v5/private', heartBeat = 25000 }) {
    if (!url) throw new Error('Invalid input');
    this.url = url;
    this.heartBeatTime = heartBeat;
    this.lastSend = 0;
    this.ws = new ws(this.url);
    
    return new Promise((resolve) => {
      this.ws.onopen = (r) => {
        this.heartbeat();
        this.eventListener();
        return resolve();
      };
    });
  }

  eventListener() {
    this.ws.on('pong', () => this.heartbeat());
    this.ws.on('close', () => this.clear());
  }

  heartbeat() {
    clearTimeout(this.pingTimeout);
    this.pingTimeout = setTimeout(() => {
      console.log('heartbeat');
      this.ws.ping();
    }, this.heartBeatTime);
  }

  clear() {
    clearTimeout(this.pingTimeout);
  }

  get onmessage() { return this.ws.onmessage };
  set onmessage(func) { this.ws.onmessage = func };

  get send() { return this.ws.send };
}

module.exports = WebSocket;
