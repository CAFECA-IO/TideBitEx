const path = require("path");
const url = require("url");
const WebSocket = require("ws");
const Codes = require("../constants/Codes");
const ResponseFormat = require("../libs/ResponseFormat");
const EventBus = require("../libs/EventBus");
const Events = require("../constants/Events");
const Utils = require("../libs/Utils");

const Bot = require(path.resolve(__dirname, "Bot.js"));

class WSChannel extends Bot {
  _client = {};
  _channelClients = {};
  constructor() {
    super();
    this.name = "WSChannel";
  }

  init({ database, logger, i18n }) {
    return super.init({ database, logger, i18n });
  }

  start() {
    return super.start();
  }

  ready() {
    return super
      .ready()
      .then(() => {
        return this.getBot("receptor").then((Receptor) => Receptor.servers);
      })
      .then((servers) => {
        this.WebSocket = new WebSocket.Server({
          noServer: true,
          clientTracking: true,
        });
        Object.values(servers).map((s) => {
          s.on("upgrade", (request, socket, head) => {
            this.WebSocket.handleUpgrade(request, socket, head, (ws) => {
              this.WebSocket.emit("connection", ws, request);
            });
          });
        });

        return Promise.resolve(this.WebSocket);
      })
      .then((wss) => {
        wss.on("connection", (ws, req) => {
          ws.id = req.headers["sec-websocket-key"];
          this._client[ws.id] = {
            ws,
            channel: "",
            isStart: false,
          };
          this.logger.debug("ws.id", ws.id);
          // this.logger.debug(req.headers);
          let ip = req.headers["x-forwarded-for"]
            ? req.headers["x-forwarded-for"].split(/\s*,\s*/)[0]
            : req.headers["host"]
            ? req.headers["host"].split(/\s*,\s*/)[0]
            : "unknown";

          this.logger.debug("HI", ip);
          ws.on("message", (message) => {
            this.logger.debug("received: %s", message);
            const { op, args } = JSON.parse(message);
            if (!op || !args || !args.market) {
              ws.send(
                JSON.stringify(
                  new ResponseFormat({
                    message: "Invalid Input WebSocket Data.",
                    code: Codes.INVALID_INPUT_WEBSOCKET_DATA,
                  })
                )
              );
              return;
            }
            switch (op) {
              case "userLogin":
                this._onOpUserLogin(req.headers, ws, args);
                break;
              case "switchTradingPair":
                this._onOpSwitchTradingPair(ws, args);
                break;
              default:
                ws.send(
                  JSON.stringify(
                    new ResponseFormat({
                      message: "Invalid Input WebSocket operatrion.",
                      code: Codes.INVALID_INPUT_WEBSOCKET_OPERATION,
                    })
                  )
                );
            }
            this.logger.debug("!!!!this._channelClients", this._channelClients);
          });
          ws.on("close", () => {
            this.logger.debug("disconnected");
            const findClient = this._client[ws.id];
            if (findClient.isStart) {
              delete this._channelClients[findClient.channel][ws.id];
              if (
                Object.values(this._channelClients[findClient.channel])
                  .length === 0
              ) {
                EventBus.emit(Events.tickerOnUnsubscribe, findClient.channel);
                EventBus.emit(Events.userOnUnsubscribe, findClient.channel);
              }
            }
            delete this._client[ws.id];
            this.logger.debug("this._channelClients", this._channelClients);
          });
        });
      });
  }

  // TODO SPA LOGIN
  // ++ CURRENT_USER UNSAVED
  _onOpUserLogin(headers, ws, args) {
    const findClient = this._client[ws.id];
    const token = Utils.peatioToken(headers);
    if (!findClient.isStart) {
      findClient.channel = args.market;
      findClient.isStart = true;

      // add channel-client map
      if (!this._channelClients[args.market]) {
        this._channelClients[args.market] = {};
      }
      if (Object.values(this._channelClients[args.market]).length === 0) {
        this.logger.log(
          `++++++++++ EventBus.emit(Events.userOnSubscribe)1[args.market:${args.market}]++++++++++++`
        );
        EventBus.emit(Events.userOnSubscribe, {
          headers: {
            cookie: headers.cookie,
            "content-type": "application/json",
            "x-csrf-token": args.token,
          },
          market: args.market,
          token,
        });
      }
      this._channelClients[args.market][ws.id] = ws;
    } else {
      const oldChannel = findClient.channel;
      delete this._channelClients[oldChannel][ws.id];
      if (Object.values(this._channelClients[oldChannel]).length === 0) {
        this.logger.log(
          `++++++++++ EventBus.emit(Events.userOnUnsubscribe)2[oldChannel:${oldChannel}]++++++++++++`
        );
        EventBus.emit(Events.userOnUnsubscribe, {
          headers: {
            cookie: headers.cookie,
            "content-type": "application/json",
            "x-csrf-token": args.token,
          },
          market: oldChannel,
          token,
        });
      }
      findClient.channel = args.market;
      if (!this._channelClients[args.market]) {
        this._channelClients[args.market] = {};
      }
      if (Object.values(this._channelClients[args.market]).length === 0) {
        this.logger.log(
          `++++++++++ EventBus.emit(Events.userOnSubscribe)3[args.market:${args.market}]++++++++++++`
        );
        EventBus.emit(Events.userOnSubscribe, {
          headers: {
            cookie: headers.cookie,
            "content-type": "application/json",
            "x-csrf-token": args.token,
          },
          market: args.market,
          token,
        });
      }
      this._channelClients[args.market][ws.id] = ws;
    }
  }

  _onOpSwitchTradingPair(ws, args) {
    const findClient = this._client[ws.id];
    if (!findClient.isStart) {
      findClient.channel = args.market;
      findClient.isStart = true;

      // add channel-client map
      if (!this._channelClients[args.market]) {
        this._channelClients[args.market] = {};
      }
      if (Object.values(this._channelClients[args.market]).length === 0) {
        EventBus.emit(Events.tickerOnSibscribe, args.market);
      }
      this._channelClients[args.market][ws.id] = ws;
    } else {
      const oldChannel = findClient.channel;
      delete this._channelClients[oldChannel][ws.id];
      if (Object.values(this._channelClients[oldChannel]).length === 0) {
        EventBus.emit(Events.tickerOnUnsubscribe, oldChannel);
      }
      findClient.channel = args.market;
      if (!this._channelClients[args.market]) {
        this._channelClients[args.market] = {};
      }
      if (Object.values(this._channelClients[args.market]).length === 0) {
        EventBus.emit(Events.tickerOnSibscribe, args.market);
      }
      this._channelClients[args.market][ws.id] = ws;
    }
  }

  broadcast(market, { type, data }) {
    const msg = JSON.stringify({ type, data });
    // this.WebSocket.send(msg);
    const channel = this._channelClients[market];
    if (channel) {
      const clients = Object.values(channel);
      clients.map((ws) => {
        ws.send(msg);
      });
    }
  }

  broadcastAllClient({ type, data }) {
    const msg = JSON.stringify({ type, data });
    const clients = Object.values(this._client);
    clients.forEach((client) => {
      client.ws.send(msg);
    });
  }
}

module.exports = WSChannel;
