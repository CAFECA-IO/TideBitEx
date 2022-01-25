const path = require('path');
const url = require('url');
const WebSocket = require('ws');
const Codes = require('../constants/Codes');
const ResponseFormat = require('../libs/ResponseFormat');

const Bot = require(path.resolve(__dirname, 'Bot.js'));

class WSChannel extends Bot {
  _client = {};
  _channelClients = {};
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
        noServer: true,
        clientTracking: true,
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
        ws.id = req.headers['sec-websocket-key'];
        this._client[ws.id] = {
          ws,
          channel: '',
          isStart: false,
        };
        this.logger.debug('ws.id', ws.id);
        // this.logger.debug(req.headers);
        let ip = req.headers['x-forwarded-for'] ?
          req.headers['x-forwarded-for'].split(/\s*,\s*/)[0] :
          req.headers['host'] ?
            req.headers['host'].split(/\s*,\s*/)[0] :
            'unknown';

        this.logger.debug('HI', ip);
        ws.on('message', (message) => {
          this.logger.debug('received: %s', message);
          const { op, args } = JSON.parse((message));
          if (!op || !args || !args.instId) {
            ws.send(JSON.stringify(new ResponseFormat({
              message: 'Invalid Input WebSocket Data.',
              code: Codes.INVALID_INPUT_WEBSOCKET_DATA,
            })));
            return;
          }
          switch(op) {
            case 'start':
              this._onOpStart(ws, args);
              break;
            case 'switchTradingPair':
              this._onOpSwitchTradingPair(ws, args);
              break;
            default:
              ws.send(JSON.stringify(new ResponseFormat({
                message: 'Invalid Input WebSocket operatrion.',
                code: Codes.INVALID_INPUT_WEBSOCKET_OPERATION,
              })));
          }
          this.logger.debug('!!!!this._channelClients', this._channelClients)
        });
        ws.on('close', () => {
          this.logger.debug('disconnected');
          const findClient = this._client[ws.id];
          delete this._channelClients[findClient.channel][ws.id]
          delete this._client[ws.id];
          this.logger.debug('this._channelClients', this._channelClients)
        });
      });
    });
  }

  _onOpStart(ws, args) {
    const findClient = this._client[ws.id];
    if (!findClient.isStart) {
      findClient.channel = args.instId;
      findClient.isStart = true;

      // add channel-client map
      if (!this._channelClients[args.instId]) {
        this._channelClients[args.instId] = {};
      }
      this._channelClients[args.instId][ws.id] = ws;
    } else {
      ws.send(JSON.stringify(new ResponseFormat({
        message: 'WebSocket already started.',
        code: Codes.WEBSOCKET_ALREADY_STARTED,
      })));
    }
  }

  _onOpSwitchTradingPair(ws, args) {
    const findClient = this._client[ws.id];
    if (!findClient.isStart) {
      findClient.channel = args.instId;
      findClient.isStart = true;

      // add channel-client map
      if (!this._channelClients[args.instId]) {
        this._channelClients[args.instId] = {};
      }
      this._channelClients[args.instId][ws.id] = ws;
    } else {
      const oldChannel = findClient.channel;
      delete this._channelClients[oldChannel][ws.id];

      findClient.channel = args.instId;
      if (!this._channelClients[args.instId]) {
        this._channelClients[args.instId] = {};
      }
      this._channelClients[args.instId][ws.id] = ws;
    }
  }

  broadcast(isdtId, { type, data }) {
    const msg = JSON.stringify({ type, data });
    // this.WebSocket.send(msg);
    const channel = this._channelClients[isdtId];
    if (channel) {
      const clients = Object.values(channel);
      clients.map((ws) => {
        ws.send(msg);
      })
    }
  }
}

module.exports = WSChannel;