const path = require('path');
const url = require('url');
const WebSocket = require('ws');

const Bot = require(path.resolve(__dirname, 'Bot.js'));

class WSChannel extends Bot {
  _client = [];
  constructor() {
    super();
    this.name = 'WSChannel';
  }

  init({ database, logger, i18n }) {
    return super.init({ database, logger, i18n });
  }

  start() {
    return super.start();
  }

  ready() {
    return super.ready()
    .then(() => {
      return this.getBot('receptor')
      .then((Receptor) => Receptor.servers);
    })
    .then((servers) => {
      this.WebSocket = new WebSocket.Server({
        noServer: true
      });
      Object.values(servers).map(s => {
        s.on('upgrade', (request, socket, head) => {
          this.WebSocket.handleUpgrade(request, socket, head, (ws) => {
            this.WebSocket.emit('connection', ws, request);
          });
        })
      });

      return Promise.resolve(this.WebSocket);
    })
    .then((wss) => {
      wss.on('connection', (ws, req) => {
        this._client.push(ws);
        // console.log(req.headers);
        let ip = req.headers['x-forwarded-for'] ?
          req.headers['x-forwarded-for'].split(/\s*,\s*/)[0] :
          req.headers['host'] ?
            req.headers['host'].split(/\s*,\s*/)[0] :
            'unknown';

        // console.log('HI', ip);
        ws.on('message', (message) => {
          // console.log('received: %s', message);
        });
        ws.on('close', () => {
          // console.log('disconnected');
        });
      });
    });
  }

  broadcast({ type, data }) {
    // new job
    // job taken
    // job release
    // job expired
    const msg = JSON.stringify({ type, data });
    // this.WebSocket.send(msg);
    this._client.map((ws) => {
      ws.send(msg);
    });
  }
}

module.exports = WSChannel;