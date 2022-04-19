const ConnectorBase = require("../ConnectorBase");
const Pusher = require("pusher-js");
const axios = require("axios");
const SafeMath = require("../SafeMath");
const EventBus = require("../EventBus");
const Events = require("../../constants/Events");
const SupportedExchange = require("../../constants/SupportedExchange");
const Utils = require("../Utils");
const redis = require("redis");
const path = require("path");
const ResponseFormat = require("../ResponseFormat");
const Codes = require("../../constants/Codes");

class TideBitConnector extends ConnectorBase {
  constructor({ config, database, logger, i18n }) {
    super({ logger });
    this.isStarted = false;
    this.name = "TideBitConnector";
    this.database = database;
    this.config = config;
    return this;
  }

  async init() {
    this.tidebitMarkets = this.getTidebitMarkets();
    this.currencies = await this.database.getCurrencies();
    return this;
  }

  getTidebitMarkets() {
    try {
      const p = path.join(
        this.config.base.TideBitLegacyPath,
        "config/markets/markets.yml"
      );
      const markets = Utils.marketParser(p);
      const formatMarkets = markets.map((market) => {
        const instId = market.name.split("/").join("-").toUpperCase();
        return {
          ...market,
          instId,
          state: market.visible,
          group: market.tab_category,
          source: SupportedExchange.TIDEBIT,
        };
      });
      return formatMarkets;
    } catch (error) {
      this.logger.error(error);
      process.exit(1);
    }
  }

  async getMemberIdFromRedis({ token }) {
    const client = redis.createClient({
      url: this.config.redis.domain,
    });

    client.on("error", (err) => this.logger.error("Redis Client Error", err));

    try {
      await client.connect(); // 會因為連線不到卡住
      const value = await client.get(
        redis.commandOptions({ returnBuffers: true }),
        token
      );
      await client.quit();
      // ++ TODO: 下面補error handle
      const split1 = value
        .toString("latin1")
        .split("member_id\x06:\x06EFi\x02");
      const memberIdLatin1 = split1[1].split('I"')[0];
      const memberIdString = Buffer.from(memberIdLatin1, "latin1")
        .reverse()
        .toString("hex");
      const memberId = parseInt(memberIdString, 16);
      return memberId;
    } catch (error) {
      this.logger.error(error);
      await client.quit();
      return -1;
    }
  }

  // account api
  async getBalance({ memberId }) {
    try {
      // const memberId = await this.getMemberIdFromRedis(token);
      // if (memberId === -1) throw new Error("get member_id fail");
      if (memberId === -1) {
        this.logger.error(
          `[${this.name} getBalance] error: "get member_id fail`
        );
        return null;
      }
      const accounts = await this.database.getBalance(memberId);
      const details = accounts.map((account, i) => ({
        ccy: this.currencies.find((curr) => curr.id === account.currency)
          .symbol,
        availBal: Utils.removeZeroEnd(account.balance),
        totalBal: SafeMath.plus(account.balance, account.locked),
        frozenBal: Utils.removeZeroEnd(account.locked),
        uTime: new Date(account.updated_at).getTime(),
      }));
      return new ResponseFormat({
        message: "getBalance",
        payload: details,
      });
    } catch (error) {
      return new ResponseFormat({
        message: error.message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }

  async getTicker({ query }) {
    try {
      const response = await axios.get(
        `${this.config.peatio.domain}/api/v2/tickers/${query.id}`
      );
      if (!response || !response.data) {
        return new ResponseFormat({
          message: "Something went wrong",
          code: Codes.API_UNKNOWN_ERROR,
        });
      }
      const tBTicker = response.data;
      const change = SafeMath.minus(tBTicker.ticker.last, tBTicker.ticker.open);
      const changePct = SafeMath.gt(tBTicker.ticker.open, "0")
        ? SafeMath.div(change, tBTicker.ticker.open)
        : SafeMath.eq(change, "0")
        ? "0"
        : "1";
      const formatTBTicker = {
        id: query.id,
        instId: query.instId,
        name: query.instId.replace("-", "/"),
        base_unit: query.instId.split("-")[0].toLowerCase(),
        quote_unit: query.instId.split("-")[1].toLowerCase(),
        ...tBTicker.ticker,
        at: tBTicker.at,
        change,
        changePct,
        volume: tBTicker.ticker.vol.toString(),
        source: SupportedExchange.TIDEBIT,
        group: undefined,
      };
      this.logger.log(`formatTBTicker`, formatTBTicker);
      this.logger.log(`****----**** getTicker [END] ****----****`);
      return new ResponseFormat({
        message: "getTicker",
        payload: formatTBTicker,
      });
    } catch (error) {
      this.logger.error(error);
      return new ResponseFormat({
        message: error.stack,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }

  async getTickers() {
    try {
      const response = await axios.get(
        `${this.config.peatio.domain}/api/v2/tickers`
      );
      if (!response || !response.data) {
        throw Error("Something went wrong");
      }
      const tBTickers = response.data;
      return tBTickers;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getOrderBooks({ query }) {
    try {
      const response = await axios({
        method: "GET",
        url: `${this.config.peatio}/api/v2/order_book?market=${query.id}`,
      });
      if (!response || !response.data)
        return new ResponseFormat({
          message: "Something went wrong",
          code: Codes.API_UNKNOWN_ERROR,
        });
      const tbBooks = response.data;
      const asks = [];
      const bids = [];
      this.logger.log(`tbBooks market`, query.id);

      tbBooks.asks.forEach((ask) => {
        if (
          ask.market === query.id &&
          ask.ord_type === "limit" &&
          ask.state === "wait"
        ) {
          let index;
          index = asks.findIndex((_ask) =>
            SafeMath.eq(_ask[0], ask.price.toString())
          );
          if (index !== -1) {
            let updateAsk = asks[index];
            updateAsk[1] = SafeMath.plus(updateAsk[1], ask.remaining_volume);
            asks[index] = updateAsk;
          } else {
            let newAsk = [ask.price.toString(), ask.remaining_volume]; // [價格, volume]
            asks.push(newAsk);
          }
        }
      });
      tbBooks.bids.forEach((bid) => {
        if (
          bid.market === query.id &&
          bid.ord_type === "limit" &&
          bid.state === "wait"
        ) {
          let index;
          index = bids.findIndex((_bid) =>
            SafeMath.eq(_bid[0], bid.price.toString())
          );
          if (index !== -1) {
            let updateBid = bids[index];
            updateBid[1] = SafeMath.plus(updateBid[1], bid.remaining_volume);
            bids[index] = updateBid;
          } else {
            let newBid = [bid.price.toString(), bid.remaining_volume]; // [價格, volume]
            bids.push(newBid);
          }
        }
      });
      const books = { asks, bids, ts: new Date().toISOString() };
      return new ResponseFormat({
        message: "getOrderBooks",
        payload: books,
      });
    } catch (error) {
      return new ResponseFormat({
        message: "Something went wrong",
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }

  async _tbGetOrderList({ memberId, instId, state, orderType }) {
    const market = this._findMarket(instId);
    if (!market) {
      throw new Error(`this.tidebitMarkets.instId ${instId} not found.`);
    }
    const { id: bid } = await this.database.getCurrencyByKey(market.quote_unit);
    const { id: ask } = await this.database.getCurrencyByKey(market.base_unit);
    if (!bid) {
      throw new Error(`bid not found`);
    }
    if (!ask) {
      throw new Error(`ask not found`);
    }
    let orderList;
    if (memberId) {
      orderList = await this.database.getOrderList({
        quoteCcy: bid,
        baseCcy: ask,
        state,
        memberId,
      });
    } else {
      orderList = await this.database.getOrderList({
        quoteCcy: bid,
        baseCcy: ask,
        state,
        orderType,
      });
    }
    const orders = orderList.map((order) => ({
      cTime: new Date(order.created_at).getTime(),
      clOrdId: order.id,
      instId: instId,
      ordId: order.id,
      ordType: order.ord_type,
      px: Utils.removeZeroEnd(order.price),
      side: order.type === "OrderAsk" ? "sell" : "buy",
      sz: Utils.removeZeroEnd(
        state === this.database.ORDER_STATE.DONE
          ? order.origin_volume
          : order.volume
      ),
      filled: order.volume !== order.origin_volume,
      uTime: new Date(order.updated_at).getTime(),
      state:
        state === this.database.ORDER_STATE.CANCEL
          ? "canceled"
          : state === this.database.ORDER_STATE.DONE
          ? "done"
          : "waiting",
    }));
    return orders;
  }

  async getOrderList({ memberId, query }) {
    try {
      const orders = await this._tbGetOrderList({
        instId: query.instId,
        memberId,
        state: this.database.ORDER_STATE.WAIT,
      });
      return new ResponseFormat({
        message: "getOrderList",
        payload: orders.sort((a, b) => b.cTime - a.cTime),
      });
    } catch (error) {
      this.logger.error(error);
      const message = error.message;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }

  async getOrderHistory({ memberId, query }) {
    try {
      const cancelOrders = await this._tbGetOrderList({
        instId: query.instId,
        memberId,
        state: this.database.ORDER_STATE.CANCEL,
      });
      const doneOrders = await this._tbGetOrderList({
        instId: query.instId,
        memberId,
        state: this.database.ORDER_STATE.DONE,
      });
      const vouchers = await this.database.getVouchers({
        memberId,
        ask: query.instId.split("-")[0],
        bid: query.instId.split("-")[1],
      });
      const orders = doneOrders
        .map((order) => {
          if (order.ordType === "market") {
            return {
              ...order,
              px: Utils.removeZeroEnd(
                vouchers?.find((voucher) => voucher.order_id === order.ordId)
                  ?.price
              ),
            };
          } else {
            return order;
          }
        })
        .concat(cancelOrders)
        .sort((a, b) => b.cTime - a.cTime);
      return new ResponseFormat({
        message: "getOrderHistory",
        payload: orders,
      });
    } catch (error) {
      this.logger.error(error);
      const message = error.message;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }

  async getTrades({ query }) {
    try {
      const tbTradesRes = await axios.get(
        `${this.config.peatio.domain}/api/v2/trades?market=${query.id}`
      );
      if (!tbTradesRes || !tbTradesRes.data) {
        return new ResponseFormat({
          message: "Something went wrong",
          code: Codes.API_UNKNOWN_ERROR,
        });
      }
      const tbTrades = tbTradesRes.data.sort((a, b) =>
        query.increase ? a.at - b.at : b.at - a.at
      );
      return new ResponseFormat({
        message: "getTrades",
        payload: tbTrades,
      });
    } catch (error) {
      this.logger.error(error);
      const message = error.message;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }

  _start(headers) {
    this.pusher = new Pusher(this.config.pusher.key, {
      //   appId: app,
      //   key,
      //   secret,
      encrypted: this.config.pusher.encrypted,
      wsHost: this.config.pusher.wsHost,
      wsPort: this.config.pusher.wsPort,
      wssPort: this.config.pusher.wssPort,
      disableFlash: true,
      disableStats: true,
      // enabledTransports: ["ws"],
      disabledTransports: ["flash", "sockjs"],
      forceTLS: false,
      authorizer: (channel, options) => {
        return {
          authorize: headers
            ? (socketId, callback) => {
                const data = JSON.stringify({
                  socket_id: socketId,
                  channel_name: channel.name,
                });
                axios({
                  url: `${this.config.peatio}/pusher/auth`,
                  method: "POST",
                  headers: {
                    ...headers,
                    "Content-Length": Buffer.from(data, "utf-8").length,
                  },
                  data,
                })
                  .then((res) => {
                    if (res.status !== 200) {
                      throw new Error(
                        `Received ${res.statusCode} from /pusher/auth`
                      );
                    }
                    return res.data;
                  })
                  .then((data) => {
                    this.logger.debug(`%*%*%*%%%%%%%%%%%%%%%%%%%%%%%*%*%*%`);
                    this.logger.debug(`authorize data`, data);
                    this.logger.debug(`%*%*%*%%%%%%%%%%%%%%%%%%%%%%%*%*%*%`);
                    callback(null, data);
                  })
                  .catch((err) => {
                    this.logger.debug(`%*%*%*%%%%%%%%%%%%%%%%%%%%%%%*%*%*%`);
                    this.logger.error(`authorize err`, err);
                    this.logger.debug(`%*%*%*%%%%%%%%%%%%%%%%%%%%%%%*%*%*%`);
                    callback(new Error(`Error calling auth endpoint: ${err}`), {
                      auth: "",
                    });
                  });
              }
            : null,
        };
      },
    });
    this.isStarted = true;
    if (headers) this.isCredential = true;
  }

  _updateTickers(data) {
    /**
   {
   btchkd: {
    name: 'BTC/HKD',
    base_unit: 'btc',
    quote_unit: 'hkd',
    group: 'hkd',
    low: '0.0',
    high: '0.0',
    last: '0.0',
    open: '0.0',
    volume: '0.0',
    sell: '0.0',
    buy: '1000.0',
    at: 1649742406
  },}
    */
    if (!this.tickers || this.tickers.length === 0) {
      this.tickers = Object.values(data);
      // this.logger.log(`_updateTickers this.tickers`, this.tickers);
    }
    const formatTickers = Object.values(data)
      .filter((d) => {
        let index = this.tickers?.findIndex((ticker) => ticker.name === d.name);
        if (
          index === -1 ||
          this.tickers[index].last !== d.last ||
          this.tickers[index].open !== d.open ||
          this.tickers[index].close !== d.close ||
          this.tickers[index].high !== d.high ||
          this.tickers[index].low !== d.low ||
          this.tickers[index].volume !== d.volume
        ) {
          this.tickers[index] = d;
          return true;
        } else return false;
      })
      .map((d) => {
        const change = SafeMath.minus(d.last, d.open);
        const changePct = SafeMath.gt(d.open24h, "0")
          ? SafeMath.div(change, d.open24h)
          : SafeMath.eq(change, "0")
          ? "0"
          : "1";
        return {
          ...d,
          instId: d.name.replace("/", "-"),
          change,
          changePct,
          source: SupportedExchange.TIDEBIT,
        };
      });
    if (formatTickers.length > 0) {
      this.logger.log(`_updateTickers formatTickers`, formatTickers);
      EventBus.emit(Events.tickersOnUpdate, formatTickers);
    }
  }

  _updateBooks(instId, data) {
    /**
    {
        asks: [
            ['160.0', '2.0998'],
            ['300.0', '1.0']
        ], 
        bids: [
            ['110.0', '13.4916'],
            ['10.0', '0.118']
        ]
    }
    */
    if (data.asks.length === 0 || data.bids.length === 0) return;
    let index,
      asks = [],
      bids = [];
    // this.logger.debug(`_updateBooks data`, data);
    // this.logger.debug(`_updateBooks this.books`, this.books);
    if (this.books) {
      this.books.asks.forEach((ask) => {
        index = data.asks.findIndex((_ask) => _ask[0] === ask[0]);
        if (index === -1) {
          asks.push([ask[0], "0"]);
        }
      });
      data.asks.forEach((ask) => {
        index = this.books.asks.findIndex((_ask) => _ask[0] === ask[0]);
        if (index === -1 || this.books.asks[index][1] !== ask[1]) {
          asks.push(ask);
        }
      });
      this.books.bids.forEach((bid) => {
        index = data.bids.findIndex((_bid) => _bid[0] === bid[0]);
        if (index === -1) {
          bids.push([bid[0], "0"]);
        }
      });
      data.bids.forEach((bid) => {
        index = this.books.bids.findIndex((_bid) => _bid[0] === bid[0]);
        if (index === -1 || this.books.bids[index][1] !== bid[1]) {
          bids.push(bid);
        }
      });
    }
    this.books = data;
    const formatBooks = {
      asks,
      bids,
      instId,
      ts: Date.now(),
    };
    if (asks.length > 0 || bids.length > 0) {
      this.logger.debug(`_updateBooks formatBooks`, formatBooks);
      EventBus.emit(
        Events.orderBooksOnUpdate,
        instId.replace("-", "").toLowerCase(),
        formatBooks
      );
    }
  }

  _updateTrade(data) {
    this.logger.debug(`***********_updateTrade************`);
    this.logger.debug(`_updateTrade data`, data);
    /**  {
    at: 1649675739
    id: 6
    kind: "ask"
    market: "ethhkd"
    price: "105.0"
    volume: "0.1"
    }*/
    const formatTrade = {
      ...data,
      instId: this._findInstId(data.market),
    };
    this.logger.debug(`_updateTrade formatTrade`, formatTrade);
    this.logger.debug(`***********_updateTrade************`);
    EventBus.emit(Events.tradeOnUpdate, data.market, formatTrade);
  }

  _updateTrades(instId, data) {
    this.logger.debug(`****$$*****_updateTradeS*****$$*****`);
    this.logger.debug(`_updateTrade data`, data);
    this.logger.debug(`****$$*****_updateTradeS*****$$*****`);
    /**
    {
      trades: [
        amount: "0.07"
        classes: "new"
        date: 1649665223 (s)
        escape: ƒ (e)
        price: "0.2769"
        safe: undefined
        tid: 31841859
        type: "buy"
      ]
    }
    */
    const formatTrades = data.trades
      .map((t) => ({
        instId,
        id: t.tid,
        price: t.price,
        volume: t.amount,
        market: instId.replace("-", "").toLowerCase(),
        type: t.type,
        at: t.date,
        side: t.type === "sell" ? "down" : "up",
      }))
      .sort((a, b) => b.at - a.at);
    if (formatTrades.length > 0) {
      this.logger.debug(`_updateTrade formatTrades`, formatTrades);
      EventBus.emit(
        Events.tradesOnUpdate,
        instId.replace("-", "").toLowerCase(),
        formatTrades
      );
    }
  }

  _updateAccount(data) {
    /**
    {
        balance: '386.8739', 
        locked: '436.73', 
        currency: 'hkd'
    }
    */
    const formatAccount = {
      ccy: data.currency.toUpperCase(),
      totalBal: SafeMath.plus(data.balance, data.locked),
      availBal: data.balance,
      frozenBal: data.locked,
      uTime: Date.now(),
    };
    this.logger.debug(`_updateAccount formatAccount`, formatAccount);
    EventBus.emit(Events.accountOnUpdate, formatAccount);
  }

  _updateOrder(data) {
    /**
    {
        id: 86, 
        at: 1649243638, 
        market: 'ethhkd', 
        kind: 'bid', 
        price: null, // market prcie
        origin_volume: "2.0",
        safe: undefined,
        state: "wait",
        state_text: "Waiting",
        volume: "2.0",
        escape: ƒ (value)
    }
    */
    // ++ TODO
    // formatOrder
    const formatOrder = {
      ordId: data.id,
      clOrdId: data.id,
      instId: this._findInstId(data.market),
      market: data.market,
      ordType: data.price === undefined ? "market" : "limit",
      px: data.price,
      side: data.kind === "bid" ? "buy" : "sell",
      sz: Utils.removeZeroEnd(
        SafeMath.eq(data.volume, "0") ? data.origin_volume : data.volume
      ),
      filled: data.volume !== data.origin_volume,
      state:
        data.state === "wait"
          ? "waiting"
          : SafeMath.eq(data.volume, "0")
          ? "done"
          : "canceled",
    };
    this.logger.debug(`_updateOrder formatOrder`, formatOrder);
    EventBus.emit(Events.orderOnUpdate, data.market, formatOrder);
  }

  async _registerPrivateChannel(credential) {
    this.logger.debug(`++++++++_registerPrivateChannel++++++`);
    this.logger.debug(`this.isStarted`, this.isStarted);
    this.logger.debug(`this.isCredential`, this.isCredential);
    this.logger.debug(`++++++++_registerPrivateChannel++++++`);
    if (!this.isStarted || !this.isCredential) this._start(credential.headers);
    try {
      const memberId = await this.getMemberIdFromRedis(credential["token"]);
      if (memberId !== -1) {
        this.token = credential["token"];
        const member = await this.database.getMemberById(memberId);
        this.memberSN = member.sn;
        this.private_channel = this.pusher.subscribe(`private-${member.sn}`);
        this.private_channel.bind("account", (data) =>
          this._updateAccount(data)
        );
        this.private_channel.bind("order", (data) => this._updateOrder(data));
        // this.private_channel.bind("trade", (data) => {
        //   this._updateTrade(data);
        // });
        this.logger.debug(`++++++++++++++`);
        this.logger.debug(`_subscribeUser member.sn`, member.sn);
        this.logger.debug(`++++++++++++++`);
      }
    } catch (error) {
      this.logger.error(`private_channel error`, error);
      throw error;
    }
  }

  async _unregisterPrivateChannel(credential) {
    if (!this.isCredential || !this.memberSN) return;
    try {
      this.logger.debug(`++++++++_unregisterPrivateChannel++++++`);
      this.logger.debug(`this.memberSN`, this.memberSN);
      this.logger.debug(`++++++++_unregisterPrivateChannel++++++`);
      this.private_channel?.unbind();
      this.private_channel = this.pusher.unsubscribe(
        `private-${this.memberSN}`
      );
      if (credential["token"] && this.token !== credential["token"]) {
        const memberId = await this.getMemberIdFromRedis(credential["token"]);
        if (memberId !== -1) {
          const member = await this.database.getMemberById(memberId);
          this.private_channel = this.pusher.unsubscribe(
            `private-${member.sn}`
          );
        }
      }
      this.private_channel = null;
      this.pusher = null;
      this.isStarted = false;
      this.logger.debug(`++++++++++++++`);
      this.logger.debug(`_unsubscribeUser this.memberSN`, this.memberSN);
      this.logger.debug(`++++++++++++++`);
    } catch (error) {
      this.logger.error(`_unregisterPrivateChannel error`, error);
      throw error;
    }
  }

  _registerMarketChannel(instId) {
    if (!this.isStarted) this._start();
    try {
      this.market_channel = this.pusher.subscribe(
        `market-${instId.replace("-", "").toLowerCase()}-global`
      );
      this.global_channel = this.pusher.subscribe("market-global");
      this.logger.log(`++++++++++_registerMarketChannel++++++++++++`);
      this.logger.log(`instId`, instId);
      this.logger.log(`++++++++++_registerMarketChannel++++++++++++`);
      this.market_channel.bind("update", (data) =>
        this._updateBooks(instId, data)
      );
      this.market_channel.bind("trades", (data) => {
        this._updateTrades(instId, data);
      });
      this.global_channel.bind("tickers", (data) => this._updateTickers(data));
    } catch (error) {
      this.logger.error(`_registerMarketChannel error`, error);
      throw error;
    }
  }

  _unregisterMarketChannel(instId) {
    try {
      this.market_channel?.unbind();
      this.global_channel?.unbind();
      this.logger.log(`++++++++++_unregisterMarketChannel++++++++++++`);
      this.logger.log(`THIS IS CALLED instId`, instId);
      this.logger.log(`++++++++++_unregisterMarketChannel++++++++++++`);
      this.pusher?.unsubscribe(
        `market-${instId.replace("-", "").toLowerCase()}-global`
      );
      this.pusher?.unsubscribe("market-global");
      this.market_channel = null;
      this.global_channel = null;
    } catch (error) {
      this.logger.error(`_unregisterMarketChannel error`, error);
      throw error;
    }
  }

  async router(
    functionName,
    { header, params, query, body, memberId, orderId, token }
  ) {
    if (!this[functionName]) {
      return new ResponseFormat({
        message: "API_NOT_SUPPORTED",
        code: Codes.API_NOT_SUPPORTED,
      });
    }

    return this[functionName]({
      header: header,
      params: params,
      query: query,
      body: body,
      memberId: memberId,
      orderId: orderId,
      token: token,
    });
  }

  async _subscribeUser(credential) {
    this.logger.log(`++++++++++_subscribeUser++++++++++++`);
    this.logger.log(`credential`, credential);
    this.logger.log(`++++++++++_subscribeUser++++++++++++`);
    await this._registerPrivateChannel(credential);
    this._registerMarketChannel(this._findInstId(credential.market));
  }

  async _unsubscribeUser(market) {
    this.logger.log(`---------_UNsubscribeUSER-----------`);
    this.logger.log(`market`);
    this.logger.log(`---------_UNsubscribeUSER-----------`);
    this._unregisterPrivateChannel(market);
    this._unregisterMarketChannel(this._findInstId(market));
  }

  _subscribeMarket(market) {
    this.logger.log(`++++++++++_subscribeMarket++++++++++++`);
    this.logger.log(`market`, market);
    this.logger.log(`++++++++++_subscribeMarket++++++++++++`);
    this._registerMarketChannel(this._findInstId(market));
  }

  async _unsubscribeMarket(market) {
    this.logger.log(`---------_UNsubscribeMARKET-----------`);
    this.logger.log(`market`, market);
    this.logger.log(`---------_UNsubscribeMARKET-----------`);
    this._unregisterMarketChannel(this._findInstId(market));
  }

  _findInstId(id) {
    return this.config.markets[id.toUpperCase()];
  }

  _findMarket(instId) {
    return this.tidebitMarkets.find((m) => m.instId === instId);
  }
}

module.exports = TideBitConnector;
