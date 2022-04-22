const path = require("path");
const redis = require("redis");
const { default: axios } = require("axios");
const URL = require("url");

const Bot = require(path.resolve(__dirname, "Bot.js"));
const OkexConnector = require("../libs/Connectors/OkexConnector");
const TideBitConnector = require("../libs/Connectors/TideBitConnector");
const ResponseFormat = require("../libs/ResponseFormat");
const Codes = require("../constants/Codes");
const EventBus = require("../libs/EventBus");
const Events = require("../constants/Events");
const SafeMath = require("../libs/SafeMath");
const Utils = require("../libs/Utils");
const SupportedExchange = require("../constants/SupportedExchange");
const TideBitLegacyAdapter = require("../libs/TideBitLegacyAdapter");

class ExchangeHub extends Bot {
  constructor() {
    super();
    this.name = "ExchangeHub";
  }

  init({ config, database, logger, i18n }) {
    return super
      .init({ config, database, logger, i18n })
      .then(async () => {
        this.okexConnector = new OkexConnector({ logger });
        await this.okexConnector.init({
          domain: this.config.okex.domain,
          apiKey: this.config.okex.apiKey,
          secretKey: this.config.okex.secretKey,
          passPhrase: this.config.okex.passPhrase,
          brokerId: this.config.okex.brokerId,
          wssPublic: this.config.okex.wssPublic,
          wssPrivate: this.config.okex.wssPrivate,
          markets: this.config.markets,
        });
        this.tideBitConnector = new TideBitConnector({ logger });
        this.tideBitConnector.init({
          app: this.config.pusher.app,
          key: this.config.pusher.key,
          secret: this.config.pusher.secret,
          wsHost: this.config.pusher.host,
          port: this.config.pusher.port,
          wsPort: this.config.pusher.wsPort,
          wssPort: this.config.pusher.wssPort,
          encrypted: this.config.pusher.encrypted,
          peatio: this.config.peatio.domain,
          redis: this.config.redis.domain,
          markets: this.config.markets,
          database: database,
        });
      })
      .then(async () => {
        this.tidebitMarkets = this.getTidebitMarkets();
        this.currencies = await this.database.getCurrencies();
        return this;
      });
  }

  async start() {
    await super.start();
    await this.okexConnector.start();
    this._eventListener();
    return this;
  }

  getTidebitMarkets() {
    try {
      const p = path.join(
        this.config.base.TideBitLegacyPath,
        "config/markets/markets.yml"
      );
      const markets = Utils.marketParser(p);
      const formatMarket = markets
        .filter((market) => market.visible !== false) // default visible is true, so if visible is undefined still need to show on list.
        .map((market) => {
          const instId = market.name.split("/").join("-").toUpperCase();
          return {
            ...market,
            // alias: "",
            // baseCcy: market.base_unit.toUpperCase(),
            // quoteCcy: market.quote_unit,
            // category: "",
            // ctMult: "",
            // ctType: "",
            // ctVal: "",
            // ctValCcy: "",
            // expTime: "",
            instId,
            instType: "",
            // lever: "",
            // listTime: Math.floor(Date.now() / 1000) * 1000,
            // lotSz: "",
            // minSz: "",
            // optType: "",
            // settleCcy: "",
            group: market.tab_category,
            // stk: "",
            // tickSz: "",
            // uly: "",
            // at: null,
            source: SupportedExchange.TIDEBIT,
          };
        });
      return formatMarket;
    } catch (error) {
      this.logger.error(error);
      process.exit(1);
    }
  }

  async getMemberIdFromRedis(peatioSession) {
    return this.tideBitConnector.getMemberIdFromRedis(peatioSession);
  }

  // account api
  async getAccounts({ token, params, query }) {
    try {
      const memberId = await this.getMemberIdFromRedis(token);
      // if (memberId === -1) throw new Error("get member_id fail");
      if (memberId === -1) {
        this.logger.error(
          `[${this.name} getAccounts] error: "get member_id fail`
        );
        return new ResponseFormat({
          message: "get member_id fail",
          code: Codes.MEMBER_ID_NOT_FOUND,
        });
      }
      const accounts = await this.database.getAccounts(memberId);
      const details = accounts.map((account, i) => ({
        currency: this.currencies.find((curr) => curr.id === account.currency)
          .symbol,
        balance: Utils.removeZeroEnd(account.balance),
        total: SafeMath.plus(account.balance, account.locked),
        locked: Utils.removeZeroEnd(account.locked),
        // uTime: new Date(account.updated_at).getTime(),
      }));

      const payload = details;

      return new ResponseFormat({
        message: "getAccounts",
        payload,
      });
    } catch (error) {
      this.logger.error(error);
      const message = error.message;
      return new ResponseFormat({
        message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
    // return this.okexConnector.router('getBalance', { memberId: null, params, query });
  }

  async getTicker({ params, query }) {
    const instId = this._findInstId(query.id);
    const index = this.tidebitMarkets.findIndex(
      (market) => instId === market.instId
    );
    if (index !== -1) {
      switch (this._findSource(instId)) {
        case SupportedExchange.OKEX:
          return this.okexConnector.router("getTicker", {
            params,
            query: { ...query, instId },
            optional: { market: this.tidebitMarkets[index] },
          });
        case SupportedExchange.TIDEBIT:
          return this.tideBitConnector.router("getTicker", {
            params,
            query: { ...query, instId },
            optional: { market: this.tidebitMarkets[index] },
          });
        default:
          return new ResponseFormat({
            message: "getTicker",
            payload: null,
          });
      }
    } else {
      return new ResponseFormat({
        message: "getTicker",
        payload: null,
      });
    }
  }
  // account api end
  // market api
  async getTickers({ query }) {
    let filteredOkexTickers,
      filteredTBTickers = {};
    this.logger.debug(
      `*********** [${this.name}] getTickers [START] ************`
    );
    try {
      const okexRes = await this.okexConnector.router("getTickers", {
        query,
        optional: { mask: this.tidebitMarkets },
      });
      if (okexRes.success) {
        filteredOkexTickers = okexRes.payload;
      } else {
        this.logger.error(okexRes);
        return new ResponseFormat({
          message: "",
          code: Codes.API_UNKNOWN_ERROR,
        });
      }
    } catch (error) {
      this.logger.error(error);
      return new ResponseFormat({
        message: error.stack,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
    // this.logger.log(`this.tidebitMarkets`, this.tidebitMarkets);
    try {
      const tideBitOnlyMarkets = Utils.marketFilterExclude(
        Object.values(filteredOkexTickers),
        this.tidebitMarkets
      );
      // this.logger.log(`tideBitOnlyMarkets`, tideBitOnlyMarkets);
      const tBTickersRes = await this.tideBitConnector.router("getTickers", {
        optional: { mask: tideBitOnlyMarkets },
      });
      filteredTBTickers = tBTickersRes.payload;
      // this.logger.log(`filteredOkexTickers`, filteredOkexTickers);
      // this.logger.log(`filteredTBTickers`, filteredTBTickers);
      this.logger.debug(
        `*********** [${this.name}] getTickers [END] ************`
      );
    } catch (error) {
      this.logger.error(error);
      return new ResponseFormat({
        message: error.stack,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
    return new ResponseFormat({
      message: "getTickers",
      payload: { ...filteredOkexTickers, ...filteredTBTickers },
    });
  }

  async getOrderBooks({ header, params, query }) {
    const instId = this._findInstId(query.id);
    switch (this._findSource(instId)) {
      case SupportedExchange.OKEX:
        return this.okexConnector.router("getOrderBooks", {
          params,
          query: { ...query, instId },
        });
      case SupportedExchange.TIDEBIT:
        return this.tideBitConnector.router("getOrderBooks", {
          query,
        });
      default:
        return new ResponseFormat({
          message: "getOrderBooks",
          payload: {},
        });
    }
  }

  // async getCandlesticks({ params, query }) {
  //   switch (this._findSource(query.instId)) {
  //     case SupportedExchange.OKEX:
  //       return this.okexConnector.router("getCandlesticks", { params, query });
  //     case SupportedExchange.TIDEBIT:
  //       return this.tideBitConnector.router("getTrades", {
  //         query: { ...query, increase: true },
  //       });
  //     default:
  //       return new ResponseFormat({
  //         message: "getCandlesticks",
  //         payload: [],
  //       });
  //   }
  // }

  async getTrades({ params, query }) {
    const instId = this._findInstId(query.id);
    switch (this._findSource(instId)) {
      case SupportedExchange.OKEX:
        return this.okexConnector.router("getTrades", {
          params,
          query: { ...query, instId },
        });
      case SupportedExchange.TIDEBIT:
        return this.tideBitConnector.router("getTrades", {
          query,
        });
      default:
        return new ResponseFormat({
          message: "getTrades",
          payload: [],
        });
    }
  }
  // market api end
  // trade api
  async postPlaceOrder({ header, params, query, body, token }) {
    const memberId = await this.getMemberIdFromRedis(token);
    if (memberId === -1) {
      return new ResponseFormat({
        message: "member_id not found",
        code: Codes.MEMBER_ID_NOT_FOUND,
      });
    }
    /* !!! HIGH RISK (start) !!! */
    // 1. find and lock account
    // 2. get orderData from body
    // 3. calculate balance value, locked value
    // 4. new order
    // 5. add account_version
    // 6. update account balance and locked
    // 7. post okex placeOrder
    const t = await this.database.transaction();

    switch (this._findSource(body.instId)) {
      case SupportedExchange.OKEX:
        try {
          /*******************************************
           * body.kind: order is 'bid' or 'ask'
           * orderData.price: body.price, price value
           * orderData.volume: body.volume, volume value
           * orderData.locked:
           *   if body.kind === 'bid', locked = body.price * body.volume
           *   if body.kind === 'ask', locked = body.volume
           *
           * orderData.balance: locked value * -1
           *******************************************/

          const orderData = await this._getPlaceOrderData(body);
          const account = await this.database.getAccountByMemberIdCurrency(
            memberId,
            orderData.currencyId,
            { dbTransaction: t }
          );
          const price = orderData.price;
          const volume = orderData.volume;
          const locked = orderData.locked;
          const balance = orderData.balance;
          const fee = "0";

          const created_at = new Date().toISOString();
          const updated_at = created_at;

          const order = await this.database.insertOrder(
            orderData.bid,
            orderData.ask,
            orderData.currency,
            price,
            volume,
            volume,
            this.database.ORDER_STATE.WAIT,
            null,
            orderData.type,
            memberId,
            created_at,
            updated_at,
            null,
            "Web",
            orderData.ordType,
            locked,
            locked,
            "0",
            0,
            { dbTransaction: t }
          );
          const orderId = order[0];

          await this._updateAccount(
            account,
            t,
            balance,
            locked,
            fee,
            this.database.MODIFIABLE_TYPE.ORDER,
            orderId,
            created_at,
            this.database.FUNC.LOCK_FUNDS
          );
          const okexOrderRes = await this.okexConnector.router(
            "postPlaceOrder",
            { memberId, orderId, params, query, body }
          );
          if (!okexOrderRes.success) {
            await t.rollback();
            return okexOrderRes;
          } else {
            let _updateOrder = {
              id: orderId,
              at: parseInt(SafeMath.div(Date.now(), "1000")),
              market: body.market,
              kind: body.kind,
              price: body.price,
              origin_volume: body.volume,
              state: "wait",
              state_text: "Waiting",
              volume: body.volume,
            };
            EventBus.emit(Events.order, body.market, _updateOrder);
            this.logger.log(
              `[TO FRONTEND][OnEvent: ${Events.order}] _updateOrder ln:409`,
              _updateOrder
            );
            let _updateAccount = {
              balance: SafeMath.plus(account.balance, balance),
              locked: SafeMath.plus(account.balance, locked),
              currency: this.currencies.find(
                (curr) => curr.id === account.currency
              )?.symbol,
              total: SafeMath.plus(
                SafeMath.plus(account.balance, balance),
                SafeMath.plus(account.balance, locked)
              ),
            };
            EventBus.emit(Events.account, _updateAccount);
            this.logger.log(
              `[TO FRONTEND][OnEvent: ${Events.account}] _updateAccount ln:425`,
              _updateAccount
            );
          }
          await t.commit();
          return okexOrderRes;
        } catch (error) {
          this.logger.error(error);
          await t.rollback();
          return new ResponseFormat({
            message: error.message,
            code: Codes.API_UNKNOWN_ERROR,
          });
        }
      /* !!! HIGH RISK (end) !!! */
      case SupportedExchange.TIDEBIT: // ++ TODO 待驗證
        try {
          const market = this._findMarket(body.instId);
          const url =
            body.kind === "bid"
              ? `${this.config.peatio.domain}/markets/${market.id}/order_bids`
              : `${this.config.peatio.domain}/markets/${market.id}/order_asks`;
          this.logger.debug("postPlaceOrder", url);

          const headers = {
            "content-type": "application/x-www-form-urlencoded",
            "x-csrf-token": body["X-CSRF-Token"],
            cookie: header.cookie,
          };
          const formbody = TideBitLegacyAdapter.peatioOrderBody({
            header,
            body,
          });
          const tbOrdersRes = await axios.post(url, formbody, {
            headers,
          }); // TODO: payload
          return new ResponseFormat({
            message: "postPlaceOrder",
            payload: [
              {
                id: "",
                clOrdId: "",
                sCode: "",
                sMsg: "",
                tag: "",
                data: tbOrdersRes.data,
              },
            ],
          });
        } catch (error) {
          this.logger.error(error.stack);
          // debug for postman so return error
          return error;
        }
      default:
        return new ResponseFormat({
          message: "instId not Support now",
          code: Codes.API_NOT_SUPPORTED,
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
      throw new Error(`bid not found${market.quote_unit}`);
    }
    if (!ask) {
      throw new Error(`ask not found${market.base_unit}`);
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
      id: order.id,
      at: parseInt(SafeMath.div(new Date(order.updated_at).getTime(), "1000")),
      market: instId.replace("-", "").toLowerCase(),
      kind: order.type === "OrderAsk" ? "ask" : "bid",
      price: Utils.removeZeroEnd(order.price),
      origin_volume: Utils.removeZeroEnd(order.origin_volume),
      volume: Utils.removeZeroEnd(order.volume),
      state:
        state === this.database.ORDER_STATE.CANCEL
          ? "canceled"
          : state === this.database.ORDER_STATE.DONE
          ? "done"
          : "wait",
      state_text:
        state === this.database.ORDER_STATE.CANCEL
          ? "Canceled"
          : state === this.database.ORDER_STATE.DONE
          ? "Done"
          : "Waiting",
      clOrdId: order.id,
      instId: instId,
      ordType: order.ord_type,
      filled: order.volume !== order.origin_volume,
    }));
    return orders;
  }

  async getOrderList({ params, query, token }) {
    const memberId = await this.getMemberIdFromRedis(token);
    if (memberId === -1) {
      return new ResponseFormat({
        message: "member_id not found",
        code: Codes.MEMBER_ID_NOT_FOUND,
      });
    }
    switch (this._findSource(query.instId)) {
      case SupportedExchange.OKEX:
        const res = await this.okexConnector.router("getOrderList", {
          params,
          query,
        });
        const list = res.payload;
        if (Array.isArray(list)) {
          const newList = list.filter((order) =>
            order.clOrdId.includes(`${memberId}m`)
          ); // 可能發生與brokerId, randomId碰撞
          res.payload = newList;
        }
        return res;
      case SupportedExchange.TIDEBIT:
        try {
          const orders = await this._tbGetOrderList({
            instId: query.instId,
            memberId,
            state: this.database.ORDER_STATE.WAIT,
          });
          return new ResponseFormat({
            message: "getOrderList",
            payload: orders.sort((a, b) => b.at - a.at),
          });
        } catch (error) {
          this.logger.error(error);
          const message = error.message;
          return new ResponseFormat({
            message,
            code: Codes.API_UNKNOWN_ERROR,
          });
        }
      default:
        return new ResponseFormat({
          message: "getOrderList",
          payload: [],
        });
    }
  }
  async getOrderHistory({ params, query, token }) {
    const memberId = await this.getMemberIdFromRedis(token);
    if (memberId === -1) {
      return new ResponseFormat({
        message: "member_id not found",
        code: Codes.MEMBER_ID_NOT_FOUND,
      });
    }
    switch (this._findSource(query.instId)) {
      case SupportedExchange.OKEX:
        const res = await this.okexConnector.router("getOrderHistory", {
          params,
          query,
        });
        const list = res.payload;
        if (Array.isArray(list)) {
          const newList = list.filter((order) =>
            order.clOrdId.includes(`${memberId}m`)
          ); // 可能發生與brokerId, randomId碰撞
          res.payload = newList;
        }
        return res;
      case SupportedExchange.TIDEBIT:
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
                  price: Utils.removeZeroEnd(
                    vouchers?.find((voucher) => voucher.order_id === order.id)
                      ?.price
                  ),
                };
              } else {
                return order;
              }
            })
            .concat(cancelOrders)
            .sort((a, b) => b.at - a.at);
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
      default:
        return new ResponseFormat({
          message: "getOrderHistory",
          payload: [],
        });
    }
  }
  async postCancelOrder({ header, params, query, body, token }) {
    const source = this._findSource(body.instId);
    const memberId = await this.getMemberIdFromRedis(token);
    /* !!! HIGH RISK (start) !!! */
    // 1. get orderId from body
    // 2. get order data from table
    // 3. find and lock account
    // 4. update order state
    // 5. get balance and locked value from order
    // 6. add account_version
    // 7. update account balance and locked
    // 8. post okex cancel order
    const t = await this.database.transaction();
    // get orderId from body.clOrdId
    try {
      let { orderId } =
        source === SupportedExchange.OKEX
          ? Utils.parseClOrdId(body.clOrdId)
          : { orderId: body.id };
      switch (source) {
        case SupportedExchange.OKEX:
          // if (order.state !== this.database.ORDER_STATE.WAIT) {
          //   await t.rollback();
          //   return new ResponseFormat({
          //     code: Codes.ORDER_HAS_BEEN_CLOSED,
          //     message: "order has been close",
          //   });
          // }

          const okexCancelOrderRes = await this.okexConnector.router(
            "postCancelOrder",
            { params, query, body }
          );
          this.logger.log(`postCancelOrder`, body);
          this.logger.log(`okexCancelOrderRes`, okexCancelOrderRes);
          if (!okexCancelOrderRes.success) {
            await t.rollback();
            return okexCancelOrderRes;
          } else {
            /*******************************************
             * body.clOrdId: custom orderId for okex
             * locked: value from order.locked, used for unlock balance, negative in account_version
             * balance: order.locked
             *******************************************/
            const order = await this.database.getOrder(orderId, {
              dbTransaction: t,
            });
            const currencyId =
              order?.type === this.database.TYPE.ORDER_ASK
                ? order?.ask
                : order?.bid;
            const account = await this.database.getAccountByMemberIdCurrency(
              memberId,
              currencyId,
              { dbTransaction: t }
            );
            const newOrder = {
              id: orderId,
              state: this.database.ORDER_STATE.CANCEL,
            };
            const locked = SafeMath.mult(order.locked, "-1");
            const balance = order.locked;
            const fee = "0";

            const created_at = new Date().toISOString();

            await this.database.updateOrder(newOrder, { dbTransaction: t });
            if (account)
              await this._updateAccount(
                account,
                t,
                balance,
                locked,
                fee,
                this.database.MODIFIABLE_TYPE.ORDER,
                orderId,
                created_at,
                this.database.FUNC.UNLOCK_FUNDS
              );
          }
          await t.commit();
          return okexCancelOrderRes;

        /* !!! HIGH RISK (end) !!! */
        case SupportedExchange.TIDEBIT:
          const market = this._findMarket(body.instId);
          const url = `${this.config.peatio.domain}/markets/${market.id}/orders/${orderId}`;
          this.logger.debug("postCancelOrder", url);
          const headers = {
            Accept: "*/*",
            "x-csrf-token": body["X-CSRF-Token"],
            cookie: header.cookie,
          };
          const tbCancelOrderRes = await axios({
            method: "DELETE",
            url,
            headers,
          });
          this.logger.debug(tbCancelOrderRes);
          return new ResponseFormat({
            message: "postCancelOrder",
            code: Codes.SUCCESS,
          });

        default:
          await t.rollback();
          return new ResponseFormat({
            message: "instId not Support now",
            code: Codes.API_NOT_SUPPORTED,
          });
      }
    } catch (error) {
      this.logger.error(error);
      await t.rollback();
      return new ResponseFormat({
        message: error.message,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
  }
  // trade api end

  // public api
  async getInstruments({ params, query }) {
    const list = [];
    try {
      const okexRes = await this.okexConnector.router("getInstruments", {
        params,
        query,
      });
      if (okexRes.success) {
        const okexInstruments = okexRes.payload;
        const includeTidebitMarket = Utils.marketFilterInclude(
          this.tidebitMarkets,
          okexInstruments
        );
        includeTidebitMarket.forEach((market) => {
          market.source = SupportedExchange.OKEX;
        });
        list.push(...includeTidebitMarket);
      } else {
        return okexRes;
      }
    } catch (error) {
      this.logger.error(error);
      return new ResponseFormat({
        message: error.stack,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }

    try {
      const tideBitOnlyMarkets = Utils.marketFilterExclude(
        list,
        this.tidebitMarkets
      );
      const isVisibles = tideBitOnlyMarkets.filter(
        (m) => m.visible === true || m.visible === undefined
      ); // default visible is true, so if visible is undefined still need to show on list.
      list.push(...isVisibles);
    } catch (error) {
      this.logger.error(error);
      return new ResponseFormat({
        message: error.stack,
        code: Codes.API_UNKNOWN_ERROR,
      });
    }

    return new ResponseFormat({
      message: "getInstruments",
      payload: list,
    });
  }
  // public api end

  async _eventListener() {
    EventBus.on(Events.account, (account) => {
      this.broadcastAllClient({
        type: Events.account,
        data: account,
      });
    });
    EventBus.on(Events.order, (market, order) => {
      this.broadcast(market, {
        type: Events.order,
        data: order,
      });
    });

    EventBus.on(Events.trade, (market, tradeData) => {
      if (this._isIncludeTideBitMarket(market)) {
        this.broadcast(market, {
          type: Events.trade,
          data: tradeData,
        });
      }
    });

    EventBus.on(Events.trades, (market, tradesData) => {
      this.broadcast(market, {
        type: Events.trades,
        data: tradesData,
      });
    });

    // orderBooksOnUpdate
    EventBus.on(Events.update, (market, booksData) => {
      // this.logger.debug(
      //   `[${this.name}]_updateBooks booksData`,
      //   booksData
      // );
      this.broadcast(market, {
        type: Events.update,
        data: booksData,
      });
    });

    // EventBus.on(Events.candleOnUpdate, (market, formatCandle) => {
    //   this.broadcast(market, {
    //     type: Events.candleOnUpdate,
    //     data: formatCandle,
    //   });
    // });

    // tickersOnUpdate
    EventBus.on(Events.tickers, (updateTickers) => {
      // const filteredTickers = Utils.tickersFilterInclude(this.tidebitMarkets, updateTickers)
      // this.logger.log(`[${this.name} Events.tickers]`, filteredTickers)
      this.broadcastAllClient({
        type: Events.tickers,
        data: updateTickers,
      });
    });

    EventBus.on(Events.orderDetailUpdate, async (instType, formatOrders) => {
      if (instType === "SPOT") {
        // TODO: using message queue
        for (const formatOrder of formatOrders) {
          if (
            formatOrder.state !== "canceled" /* cancel order */ &&
            formatOrder.accFillSz !== "0" /* create order */
          ) {
            await this._updateOrderDetail(formatOrder);
          }
        }
      }
    });
  }

  async _updateOrderDetail(formatOrder) {
    this.logger.log(
      `---------- [${this.constructor.name}]  _updateOrderDetail [START] ----------`
    );
    const t = await this.database.transaction();
    /* !!! HIGH RISK (start) !!! */
    // 1. get orderId from body
    // 2. get order data from table
    // 3. find and lock account
    // 4. update order state
    // 5. get balance and locked value from order
    // 6. add trade // -- CAUTION!!! skip now, tradeId use okex tradeId
    // 7. add vouchers
    // 8. add account_version
    // 9. update account balance and locked
    try {
      const {
        accFillSz,
        clOrdId,
        tradeId,
        state,
        side,
        fillPx,
        fillSz,
        fee,
        uTime,
      } = formatOrder;
      // get orderId from formatOrder.clOrdId
      const { memberId, orderId } = Utils.parseClOrdId(clOrdId);
      const order = await this.database.getOrder(orderId, { dbTransaction: t });
      if (order.state !== this.database.ORDER_STATE.WAIT) {
        await t.rollback();
        this.logger.error("order has been closed");
      }
      const currencyId =
        order.type === this.database.TYPE.ORDER_ASK ? order.ask : order.bid;
      const accountAsk = await this.database.getAccountByMemberIdCurrency(
        memberId,
        order.ask,
        { dbTransaction: t }
      );
      const accountBid = await this.database.getAccountByMemberIdCurrency(
        memberId,
        order.bid,
        { dbTransaction: t }
      );

      /*******************************************
       * formatOrder.clOrdId: custom orderId for okex
       * formatOrder.accFillSz: valume which already matched
       * formatOrder.state: 'live', 'canceled', 'filled', 'partially_filled', but 'cancel' may not enter this function
       * lockedA: Ask locked value, this value would be negative
       *   if formatOrder.side === 'sell', formatOrder.fillSz || '0'
       * feeA: Ask fee value
       *   if formatOrder.side === 'buy', formatOrder.fee - all this order ask vouchers.fee || 0
       * balanceA: Ask Balance, this value would be positive;
       *   if formatOrder.side === 'buy', formatOrder.fillSz - feeA || '0'
       * lockedB: Bid locked value, this value would be negative
       *   if formatOrder.side === 'buy',value = formatOrder.fillSz * formatOrder.fillPx - feeA, else value = '0'
       * feeB: Bid fee value
       *   if formatOrder.side === 'sell', formatOrder.fee - all this order bid vouchers.fee || 0
       * balanceB: Bid Blance, this value would be positive;
       *   if formatOrder.side === 'sell',value = formatOrder.fillSz * formatOrder.fillPx - feeB, else value = '0'
       * newOrderVolume: remain volume to be matched
       * newOrderLocked: remain locked to be matched
       * newFundReceive:
       *   if formatOrder.side === 'sell': formatOrder.fillSz * formatOrder.fillPx
       *   if formatOrder.side === 'buy': formatOrder.fillSz
       * changeBalance: if order is done, euqal to newOrderLocked
       * changeLocked: if order is done, euqal to newOrderLocked * -1
       *******************************************/

      let orderState = this.database.ORDER_STATE.WAIT;
      if (state === "filled") {
        orderState = this.database.ORDER_STATE.DONE;
      }

      const lockedA = side === "sell" ? SafeMath.mult(fillSz, "-1") : "0";
      const totalFee = SafeMath.abs(fee);
      const feeA =
        side === "buy"
          ? await this._calculateFee(orderId, "ask", totalFee, t)
          : "0";
      const balanceA = side === "buy" ? SafeMath.minus(fillSz, feeA) : "0";

      const value = SafeMath.mult(fillPx, fillSz);
      const lockedB = side === "buy" ? SafeMath.mult(value, "-1") : "0";
      const feeB =
        side === "sell"
          ? await this._calculateFee(orderId, "bid", totalFee, t)
          : "0";
      const balanceB = side === "sell" ? SafeMath.minus(value, feeB) : "0";

      const newOrderVolume = SafeMath.minus(order.origin_volume, accFillSz);
      const newOrderLocked = SafeMath.plus(
        order.locked,
        side === "buy" ? lockedB : lockedA
      );
      const newFundReceive = side === "buy" ? fillSz : value;

      const changeBalance = newOrderLocked;
      const changeLocked = SafeMath.mult(newOrderLocked, "-1");

      const created_at = new Date().toISOString();
      const updated_at = created_at;

      const newOrder = {
        ...order,
        id: orderId,
        volume: newOrderVolume,
        state: orderState,
        locked: newOrderLocked,
        funds_received: newFundReceive,
        trades_count: order.trades_count + 1,
      };

      // TODO: ++ 6. add trade
      // -- CAUTION!!! skip now, tradeId use okex tradeId,
      // because it need columns 'ask_member_id' and 'bid_member_id' with foreign key
      const base_unit = this.currencies.find(
        (curr) => curr.id === order.ask
      )?.key;
      const quote_unit = this.currencies.find(
        (curr) => curr.id === order.bid
      )?.key;
      if (!base_unit || !quote_unit)
        throw Error(
          `order base_unit[order.ask: ${order.ask}] or quote_unit[order.bid: ${order.bid}] not found`
        );
      await this.database.insertVouchers(
        memberId,
        orderId,
        tradeId, // ++ TODO reference step6 trade.id
        null,
        base_unit, // -- need change
        quote_unit, // -- need change
        fillPx,
        fillSz,
        value,
        order.type === this.database.TYPE.ORDER_ASK ? "ask" : "bid",
        order.type === this.database.TYPE.ORDER_ASK ? feeB : "0", // get bid, so fee is bid
        order.type === this.database.TYPE.ORDER_ASK ? "0" : feeA, // get ask, so fee is ask
        created_at,
        { dbTransaction: t }
      );

      await this.database.updateOrder(newOrder, { dbTransaction: t });
      this.logger.log(
        `[TO FRONTEND][OnEvent: ${Events.order}] updateOrder ln:1026`,
        newOrder
      );
      EventBus.emit(Events.order, `${base_unit}${quote_unit}`, newOrder);

      await this._updateAccount(
        accountAsk,
        t,
        balanceA,
        lockedA,
        feeA,
        this.database.MODIFIABLE_TYPE.TRADE,
        tradeId, // ++ TODO reference step6 trade.id
        created_at,
        order.type === this.database.TYPE.ORDER_ASK
          ? this.database.FUNC.UNLOCK_AND_SUB_FUNDS
          : this.database.FUNC.PLUS_FUNDS
      );
      let _updateAcc = {
        balance: SafeMath.plus(accountAsk.balance, balanceA),
        locked: SafeMath.plus(accountAsk.balance, lockedA),
        currency: this.currencies.find(
          (curr) => curr.id === accountAsk.currency
        )?.symbol,
        total: SafeMath.plus(
          SafeMath.plus(accountAsk.balance, balanceA),
          SafeMath.plus(accountAsk.balance, lockedA)
        ),
      };
      EventBus.emit(Events.account, _updateAcc);
      this.logger.log(
        `[TO FRONTEND][OnEvent: ${Events.account}] _updateAcc ln:1057`,
        _updateAcc
      );
      await this._updateAccount(
        accountBid,
        t,
        balanceB,
        lockedB,
        feeB,
        this.database.MODIFIABLE_TYPE.TRADE,
        tradeId, // ++ TODO reference step6 trade.id
        created_at,
        order.type === this.database.TYPE.ORDER_ASK
          ? this.database.FUNC.PLUS_FUNDS
          : this.database.FUNC.UNLOCK_AND_SUB_FUNDS
      );
      _updateAcc = {
        balance: SafeMath.plus(accountBid.balance, balanceB),
        locked: SafeMath.plus(accountBid.balance, lockedB),
        currency: this.currencies.find(
          (curr) => curr.id === accountBid.currency
        )?.symbol,
        total: SafeMath.plus(
          SafeMath.plus(accountBid.balance, balanceB),
          SafeMath.plus(accountBid.balance, lockedB)
        ),
      };
      EventBus.emit(Events.account, _updateAcc);
      this.logger.log(
        `[TO FRONTEND][OnEvent: ${Events.account}] _updateAcc ln:1086`,
        _updateAcc
      );
      // order 完成，解鎖剩餘沒用完的
      if (
        orderState === this.database.ORDER_STATE.DONE &&
        SafeMath.gt(newOrderLocked, "0")
      ) {
        if (order.type === this.database.TYPE.ORDER_ASK) {
          // ++ TODO reference step6 trade.id
          await this._updateAccount(
            accountAsk,
            t,
            changeLocked,
            changeBalance,
            "0",
            this.database.MODIFIABLE_TYPE.TRADE,
            tradeId,
            created_at,
            this.database.FUNC.UNLOCK_FUNDS
          );
          _updateAcc = {
            balance: SafeMath.plus(accountAsk.balance, changeLocked),
            locked: SafeMath.plus(accountAsk.balance, changeBalance),
            currency: this.currencies.find(
              (curr) => curr.id === accountAsk.currency
            )?.symbol,
            total: SafeMath.plus(
              SafeMath.plus(accountAsk.balance, changeLocked),
              SafeMath.plus(accountAsk.balance, changeBalance)
            ),
          };
          EventBus.emit(Events.account, _updateAcc);
          this.logger.log(
            `[TO FRONTEND][OnEvent: ${Events.account}] _updateAcc ln:1120`,
            _updateAcc
          );
        } else if (order.type === this.database.TYPE.ORDER_BID) {
          // ++ TODO reference step6 trade.id
          await this._updateAccount(
            accountBid,
            t,
            changeLocked,
            changeBalance,
            "0",
            this.database.MODIFIABLE_TYPE.TRADE,
            tradeId,
            created_at,
            this.database.FUNC.UNLOCK_FUNDS
          );
          _updateAcc = {
            balance: SafeMath.plus(accountBid.balance, changeLocked),
            locked: SafeMath.plus(accountBid.balance, changeBalance),
            currency: this.currencies.find(
              (curr) => curr.id === accountBid.currency
            )?.symbol,
            total: SafeMath.plus(
              SafeMath.plus(accountBid.balance, changeLocked),
              SafeMath.plus(accountBid.balance, changeBalance)
            ),
          };
          EventBus.emit(Events.account, _updateAcc);
          this.logger.log(
            `[TO FRONTEND][OnEvent: ${Events.account}] _updateAcc ln:1149`,
            _updateAcc
          );
        }
      }

      await t.commit();
    } catch (error) {
      this.logger.error(error);
      await t.rollback();
    }
    /* !!! HIGH RISK (end) !!! */
  }

  async _getPlaceOrderData(body) {
    const market = this._findMarket(body.instId);
    if (!market) {
      throw new Error(`this.tidebitMarkets.instId ${body.instId} not found.`);
    }
    const { id: bid } = await this.database.getCurrencyByKey(market.quote_unit);
    const { id: ask } = await this.database.getCurrencyByKey(market.base_unit);
    if (!bid) {
      throw new Error(`bid not found`);
    }
    if (!ask) {
      throw new Error(`ask not found`);
    }
    const currency = market.code;
    const locked =
      body.kind === "bid"
        ? SafeMath.mult(body.price, body.volume)
        : body.volume;
    const balance = SafeMath.mult(locked, "-1");

    const orderData = {
      bid,
      ask,
      currency,
      price: body.price || null,
      volume: body.volume,
      type:
        body.kind === "bid"
          ? this.database.TYPE.ORDER_BID
          : this.database.TYPE.ORDER_ASK,
      ordType: body.ordType,
      locked,
      balance,
      currencyId: body.kind === "bid" ? bid : ask,
    };
    return orderData;
  }

  async _updateAccount(
    account,
    dbTransaction,
    balance,
    locked,
    fee,
    modifiable_type,
    modifiable_id,
    created_at,
    fun
  ) {
    /* !!! HIGH RISK (start) !!! */
    const updated_at = created_at;
    const oriAccBal = account.balance;
    const oriAccLoc = account.locked;
    const newAccBal = SafeMath.plus(oriAccBal, balance);
    const newAccLoc = SafeMath.plus(oriAccLoc, locked);
    const amount = SafeMath.plus(newAccBal, newAccLoc);
    const newAccount = {
      id: account.id,
      balance: newAccBal,
      locked: newAccLoc,
    };

    await this.database.insertAccountVersion(
      account.member_id,
      account.id,
      this.database.REASON.ORDER_CANCEL,
      balance,
      locked,
      fee,
      amount,
      modifiable_id,
      modifiable_type,
      created_at,
      updated_at,
      account.currency,
      fun,
      { dbTransaction }
    );

    await this.database.updateAccount(newAccount, { dbTransaction });
    /* !!! HIGH RISK (end) !!! */
  }

  async _calculateFee(orderId, trend, totalFee, dbTransaction) {
    const vouchers = await this.database.getVouchersByOrderId(orderId, {
      dbTransaction,
    });
    let totalVfee = "0";
    for (const voucher of vouchers) {
      if (voucher.trend === trend) {
        switch (trend) {
          case "ask":
            totalVfee = SafeMath.plus(totalVfee, voucher.ask_fee);
            break;
          case "bid":
            totalVfee = SafeMath.plus(totalVfee, voucher.bid_fee);
            break;
          default:
        }
      }
    }
    return SafeMath.minus(totalFee, totalVfee);
  }

  _isIncludeTideBitMarket(instId) {
    return (
      Utils.marketFilterInclude(this.tidebitMarkets, [{ instId }]).length > 0
    );
  }

  _findInstId(id) {
    return this.config.markets[id.toUpperCase()];
  }

  _findSource(instId) {
    return this.config.markets[`tb${instId}`];
  }

  _findMarket(instId) {
    return this.tidebitMarkets.find((m) => m.instId === instId);
  }
}

module.exports = ExchangeHub;
