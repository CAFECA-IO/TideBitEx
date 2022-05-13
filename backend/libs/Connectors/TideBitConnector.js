const ConnectorBase = require("../ConnectorBase");
const Pusher = require("pusher-js");
const axios = require("axios");
const SafeMath = require("../SafeMath");
const EventBus = require("../EventBus");
const Events = require("../../constants/Events");
const SupportedExchange = require("../../constants/SupportedExchange");
const Utils = require("../Utils");
const redis = require("redis");
const ResponseFormat = require("../ResponseFormat");
const Codes = require("../../constants/Codes");
const TideBitLegacyAdapter = require("../TideBitLegacyAdapter");

class TibeBitConnector extends ConnectorBase {
  _accountsUpdateInterval = 0;
  _tickersUpdateInterval = 0;
  _booksUpdateInterval = 500;
  _tradesUpdateInterval = 500;

  _accountsTimestamp = 0;
  _tickersTimestamp = 0;
  _booksTimestamp = 0;
  _tradesTimestamp = 0;

  isStart = false;

  public_pusher = null;
  private_pusher = {};

  global_channel = null;
  private_channel = {};
  market_channel = {};

  tickers = {};
  trades = [];
  books = null;

  constructor({ logger }) {
    super({ logger });
    return this;
  }

  async init({
    app,
    key,
    secret,
    wsHost,
    port,
    wsPort,
    wssPort,
    encrypted,
    peatio,
    markets,
    database,
    redis,
  }) {
    await super.init();
    this.app = app;
    this.key = key;
    this.secret = secret;
    this.wsHost = wsHost;
    this.wsPort = wsPort;
    this.wssPort = wssPort;
    this.encrypted = encrypted;
    this.peatio = peatio;
    this.markets = markets;
    this.database = database;
    this.redis = redis;
    this.currencies = await this.database.getCurrencies();
    return this;
  }

  // ++ move to utils
  async getMemberIdFromRedis(peatioSession) {
    const client = redis.createClient({
      url: this.redis,
    });

    client.on("error", (err) => this.logger.error("Redis Client Error", err));

    try {
      await client.connect(); // 會因為連線不到卡住
      const value = await client.get(
        redis.commandOptions({ returnBuffers: true }),
        peatioSession
      );
      await client.quit();
      // ++ TODO: 下面補error handle
      this.logger.log(
        `[${this.constructor.name} getMemberIdFromRedis] value:`,
        value
      );
      this.logger.log(
        `[${this.constructor.name} getMemberIdFromRedis] value.toString("latin1"):`,
        value.toString("latin1")
      );
      const split1 = value
        .toString("latin1")
        .split("member_id\x06:\x06EFi\x02");
      this.logger.log(
        `[${this.constructor.name} getMemberIdFromRedis] split1:`,
        split1
      );
      if (split1.length > 0) {
        const memberIdLatin1 = split1[1].split('I"')[0];
        const memberIdString = Buffer.from(memberIdLatin1, "latin1")
          .reverse()
          .toString("hex");
        const memberId = parseInt(memberIdString, 16);
        return memberId;
      } else return -1;
    } catch (error) {
      this.logger.error(
        `[${this.constructor.name} getMemberIdFromRedis] error: "get member_id fail`,
        error
      );
      this.logger.error(error);
      await client.quit();
      return -1;
    }
  }

  async getTicker({ query, optional }) {
    const tBTickerRes = await axios.get(
      `${this.peatio}/api/v2/tickers/${query.id}`
    );
    if (!tBTickerRes || !tBTickerRes.data) {
      return new ResponseFormat({
        message: "Something went wrong",
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
    const tBTicker = tBTickerRes.data;
    const change = SafeMath.minus(tBTicker.ticker.last, tBTicker.ticker.open);
    const changePct = SafeMath.gt(tBTicker.ticker.open, "0")
      ? SafeMath.div(change, tBTicker.ticker.open)
      : SafeMath.eq(change, "0")
      ? "0"
      : "1";

    const formatTBTicker = {};
    formatTBTicker[query.id] = {
      market: query.id,
      instId: query.instId,
      name: optional.market.name,
      base_unit: optional.market.base_unit,
      quote_unit: optional.market.quote_unit,
      ...tBTicker.ticker,
      at: tBTicker.at,
      change,
      changePct,
      volume: tBTicker.ticker.vol.toString(),
      source: SupportedExchange.TIDEBIT,
      group: optional.market.group,
      pricescale: optional.market.price_group_fixed,
      ticker: tBTicker.ticker,
    };
    return new ResponseFormat({
      message: "getTicker",
      payload: formatTBTicker,
    });
  }

  async getTickers({ optional }) {
    const tBTickersRes = await axios.get(`${this.peatio}/api/v2/tickers`);
    if (!tBTickersRes || !tBTickersRes.data) {
      return new ResponseFormat({
        message: "Something went wrong",
        code: Codes.API_UNKNOWN_ERROR,
      });
    }
    const tBTickers = tBTickersRes.data;
    const formatTickers = Object.keys(tBTickers).reduce((prev, currId) => {
      const instId = this._findInstId(currId);
      const tickerObj = tBTickers[currId];
      const change = SafeMath.minus(
        tickerObj.ticker.last,
        tickerObj.ticker.open
      );
      const changePct = SafeMath.gt(tickerObj.ticker.open, "0")
        ? SafeMath.div(change, tickerObj.ticker.open)
        : SafeMath.eq(change, "0")
        ? "0"
        : "1";
      prev[currId] = {
        market: currId,
        instId,
        buy: tickerObj.ticker.buy,
        sell: tickerObj.ticker.sell,
        low: tickerObj.ticker.low,
        high: tickerObj.ticker.high,
        last: tickerObj.ticker.last,
        open: tickerObj.ticker.open,
        volume: tickerObj.ticker.vol,
        change,
        changePct,
        at: parseInt(tickerObj.at),
        source: SupportedExchange.TIDEBIT,
        ticker: tickerObj.ticker,
      };
      return prev;
    }, {});
    optional.mask.forEach((market) => {
      let ticker = formatTickers[market.id];
      if (ticker)
        this.tickers[market.id] = {
          ...ticker,
          group: market.group,
          market: market.id,
          pricescale: market.price_group_fixed,
          name: market.name,
          base_unit: market.base_unit,
          quote_unit: market.quote_unit,
        };
      else {
        const instId = this._findInstId(market.id);
        this.tickers[market.id] = {
          market: market.id,
          instId,
          name: market.name,
          base_unit: market.base_unit,
          quote_unit: market.quote_unit,
          group: market.group,
          pricescale: market.price_group_fixed,
          buy: "0.0",
          sell: "0.0",
          low: "0.0",
          high: "0.0",
          last: "0.0",
          open: "0.0",
          volume: "0.0",
          change: "0.0",
          changePct: "0.0",
          at: "0.0",
          source: SupportedExchange.TIDEBIT,
        };
      }
    });
    return new ResponseFormat({
      message: "getTickers",
      payload: this.tickers,
    });
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
    const updateTickers = {};
    Object.keys(data).forEach((id) => {
      if (
        this.tickers[id] &&
        (!SafeMath.eq(this.tickers[id]?.last, data[id].last) ||
          !SafeMath.eq(this.tickers[id]?.open, data[id].open) ||
          !SafeMath.eq(this.tickers[id]?.high, data[id].high) ||
          !SafeMath.eq(this.tickers[id]?.low, data[id].low) ||
          !SafeMath.eq(this.tickers[id]?.volume, data[id].volume))
      ) {
        const change = SafeMath.minus(data[id].last, data[id].open);
        const changePct = SafeMath.gt(data[id].open, "0")
          ? SafeMath.div(change, data[id].open)
          : SafeMath.eq(change, "0")
          ? "0"
          : "1";
        const updateTicker = { ...data[id], change, changePct, market: id };
        updateTickers[id] = updateTicker;
        this.tickers[id] = updateTicker;
      }
    });
    if (Object.keys(updateTickers).length > 0) {
      const timestamp = Date.now();
      if (timestamp - this._tickersTimestamp > this._tickersUpdateInterval) {
        this._tickersTimestamp = timestamp;
        EventBus.emit(Events.tickers, updateTickers);
      }
    }
  }

  async getOrderBooks({ query }) {
    // this.logger.log(
    //   `---------- [${this.constructor.name}]  getOrderBooks market: ${query.id} [START] ----------`
    // );
    this.market = query.id;
    try {
      const tbBooksRes = await axios.get(
        `${this.peatio}/api/v2/order_book?market=${query.id}`
      );
      if (!tbBooksRes || !tbBooksRes.data) {
        return new ResponseFormat({
          message: "Something went wrong",
          code: Codes.API_UNKNOWN_ERROR,
        });
      }
      const tbBooks = tbBooksRes.data;
      const asks = [];
      const bids = [];
      // this.logger.log(`tbBooks query.id`, query.id);
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
      const books = { asks, bids, market: query.id };
      // this.books = books;
      // this.logger.log(`[FROM TideBit] Response books`, books);
      // this.logger.log(
      //   `---------- [${this.constructor.name}]  getOrderBooks market: ${query.id} [END] ----------`
      // );
      return new ResponseFormat({
        message: "getOrderBooks",
        payload: books,
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

  _updateBooks(market, updateBooks) {
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
    if (this.books) {
      const books = {
        market,
        asks: this.books.asks.filter((ask) =>
          updateBooks.asks.find((_ask) => SafeMath.eq(_ask[0], ask[0]))
        ),
        bids: this.books.bids.filter((bid) =>
          updateBooks.bids.find((_bid) => SafeMath.eq(_bid[0], bid[0]))
        ),
      };
      updateBooks.asks.forEach((ask) => {
        const index = books.asks.findIndex((a) => SafeMath.eq(a[0], ask[0]));
        if (index === -1) {
          if (SafeMath.gt(ask[1], "0")) {
            books.asks.push([ask[0], ask[1], true]);
          } else {
            if (SafeMath.gt(ask[1], "0")) {
              books.asks[index] = [ask[0], ask[1], true];
            } else {
              books.asks.splice(index, 1);
            }
          }
        }
      });
      updateBooks.bids.forEach((bid) => {
        const index = books.bids.findIndex((a) => SafeMath.eq(a[0], bid[0]));
        if (index === -1) {
          if (SafeMath.gt(bid[1], "0")) {
            books.bids.push([bid[0], bid[1], true]);
          } else {
            if (SafeMath.gt(bid[1], "0")) {
              books.bids[index] = [bid[0], bid[1], true];
            } else {
              books.bids.splice(index, 1);
            }
          }
        }
      });
      this.books = {
        market,
        asks: books.asks.sort((a, b) => +a[0] - +b[0]).slice(0, 100),
        bids: books.bids.sort((a, b) => +b[0] - +a[0]).slice(0, 100),
      };
    } else {
      this.books = {
        market,
        asks:
          updateBooks.asks
            ?.map((ask) => [ask[0], ask[1], true])
            ?.sort((a, b) => +a[0] - +b[0])
            ?.slice(0, 100) || [],
        bids:
          updateBooks.bids
            ?.map((bid) => [bid[0], bid[1], true])
            ?.sort((a, b) => +b[0] - +a[0])
            ?.slice(0, 100) || [],
      };
    }
    const timestamp = Date.now();
    if (timestamp - this._booksTimestamp > this._booksUpdateInterval) {
      this._booksTimestamp = timestamp;
      EventBus.emit(Events.update, market, this.books);
    }
  }
  /**
    [
      {
        "id": 48,
        "price": "110.0",
        "volume": "54.593",
        "funds": "6005.263",
        "market": "ethhkd",
        "created_at": "2022-04-01T09:40:21Z",
        "at": 1648806021,
        "side": "down"
      },
    ]
    */
  async getTrades({ query }) {
    try {
      const tbTradesRes = await axios.get(
        `${this.peatio}/api/v2/trades?market=${query.id}`
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
      this.trades = tbTrades;
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

  _updateTrade(data) {
    this.logger.log(
      `---------- [${this.constructor.name}]  _updateTrade [START] ----------`
    );
    this.logger.log(`[FROM TideBit] tradeData`, data);
    /**  {
    at: 1649675739
    id: 6
    kind: "ask"
    market: "ethhkd"
    price: "105.0"
    volume: "0.1"
    }*/
    if (
      SafeMath.gte(data.at, this.trades[0].at) &&
      !this.trades.find((_t) => _t.id === data.id)
    ) {
      const formatTrade = {
        ...data,
        side: SafeMath.gte(data.price, this.trades[0].price) ? "up" : "down",
      };
      this.logger.log(
        `[TO FRONTEND][OnEvent: ${Events.trade}] updateTrade`,
        formatTrade
      );
      EventBus.emit(Events.trade, data.market, formatTrade);
    }
    this.logger.log(
      `---------- [${this.constructor.name}]  _updateTrade [END] ----------`
    );
  }

  _updateTrades(market, data) {
    /**
    {
       trades: [
         {
           tid: 118,
           type: 'buy',
           date: 1650532785,
           price: '95.0',
           amount: '0.1'
         }
       ]
    }
    */
    const filteredTrades = data.trades
      .filter(
        (t) =>
          SafeMath.gte(t.date, this.trades[0]?.at) &&
          !this.trades.find((_t) => _t.id === t.tid)
      )
      .sort((a, b) => b.date - a.date);
    const formatTrades = filteredTrades
      .map((t, i) => ({
        ...t,
        id: t.tid,
        price: t.price,
        volume: t.amount,
        market,
        at: t.date,
        side:
          i === filteredTrades.length - 1
            ? SafeMath.gte(t.price, this.trades[0].price)
              ? "up"
              : "down"
            : SafeMath.gte(t.price, filteredTrades[i + 1].price)
            ? "up"
            : "down",
      }))
      .sort((a, b) => b.at - a.at);
    this.trades = formatTrades.concat(this.trades).slice(0, 100);
    const timestamp = Date.now();
    if (timestamp - this._tradesTimestamp > this._tradesUpdateInterval) {
      this._tradesTimestamp = timestamp;
      EventBus.emit(Events.trades, market, { market, trades: formatTrades });
    }
  }

  /* 
  {
    'BTC': {
      'sum': '0.0',
      'balance': [
        {
          'currency': 'BTC',
          'balance': '0.0',
          'locked': '0.0',
          'total': '0.0',
        }
      ]
    }
  }
  **/

  async getUsersAccounts() {
    try {
      const _accounts = await this.database.getAccounts();
      const accounts = {};
      _accounts.forEach((account) => {
        let currency = this.currencies.find(
          (curr) => curr.id === account.currency
        ).symbol;
        if (!accounts[currency]) {
          accounts[currency] = {};
          accounts[currency]["details"] = [];
          accounts[currency]["balance"] = "0";
          accounts[currency]["locked"] = "0";
          accounts[currency]["total"] = "0";
        }
        let balance = Utils.removeZeroEnd(account.balance);
        let locked = Utils.removeZeroEnd(account.locked);
        let total = SafeMath.plus(balance, locked);
        accounts[currency]["balance"] = SafeMath.plus(
          accounts[currency]["balance"],
          balance
        );
        accounts[currency]["locked"] = SafeMath.plus(
          accounts[currency]["locked"],
          locked
        );
        accounts[currency]["total"] = SafeMath.plus(
          accounts[currency]["total"],
          total
        );
        accounts[currency]["details"].push({
          currency: currency,
          memberId: account.member_id,
          balance,
          locked,
          total,
        });
        accounts[currency]["details"].sort((a, b) => b.total - a.total);
      });
      // this.logger.debug(`[${this.constructor.name} getUsersAccounts]`, accounts)
      return new ResponseFormat({
        message: "getAccounts",
        payload: accounts,
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

  async getAccounts({ memberId }) {
    try {
      const _accounts = await this.database.getAccountsByMemberId(memberId);
      const accounts = _accounts.map((account) => ({
        currency: this.currencies.find((curr) => curr.id === account.currency)
          .symbol,
        balance: Utils.removeZeroEnd(account.balance),
        total: SafeMath.plus(account.balance, account.locked),
        locked: Utils.removeZeroEnd(account.locked),
      }));

      this.accounts = accounts;
      return new ResponseFormat({
        message: "getAccounts",
        payload: accounts,
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

  _updateAccount(data) {
    /**
    {
        balance: '386.8739', 
        locked: '436.73', 
        currency: 'hkd'
    }
    */
    const account = this.accounts.find(
      (account) => data.currency.toUpperCase() === account.currency
    );
    if (
      !account ||
      SafeMath.eq(account.balance, data.balance) ||
      SafeMath.eq(account.locked, data.locked)
    )
      return;
    const formatAccount = {
      ...data,
      currency: data.currency.toUpperCase(),
      total: SafeMath.plus(data.balance, data.locked),
    };
    this.logger.log(
      `---------- [${this.constructor.name}]  _updateAccount [START] ----------`
    );
    this.logger.log(`[FROM TideBit] accountData`, data);
    this.logger.log(
      `[TO FRONTEND][OnEvent: ${Events.account}] updateAccount`,
      formatAccount
    );
    EventBus.emit(Events.account, formatAccount);
    this.logger.log(
      `---------- [${this.constructor.name}]  _updateAccount [END] ----------`
    );
  }

  async tbGetOrderList(query) {
    if (!query.market) {
      throw new Error(`this.tidebitMarkets.market ${query.market} not found.`);
    }
    const { id: bid } = this.currencies.find(
      (curr) => curr.key === query.market.quote_unit
    );
    const { id: ask } = this.currencies.find(
      (curr) => curr.key === query.market.base_unit
    );
    if (!bid) {
      throw new Error(`bid not found${query.market.quote_unit}`);
    }
    if (!ask) {
      throw new Error(`ask not found${query.market.base_unit}`);
    }
    let orderList;
    if (query.memberId) {
      orderList = await this.database.getOrderList({
        quoteCcy: bid,
        baseCcy: ask,
        state: query.state,
        memberId: query.memberId,
        orderType: query.orderType,
      });
    } else {
      orderList = await this.database.getOrderList({
        quoteCcy: bid,
        baseCcy: ask,
        state: query.state,
        orderType: query.orderType,
      });
    }
    const orders = orderList.map((order) => ({
      id: order.id,
      at: parseInt(SafeMath.div(new Date(order.updated_at).getTime(), "1000")),
      market: query.instId.replace("-", "").toLowerCase(),
      kind: order.type === "OrderAsk" ? "ask" : "bid",
      price: Utils.removeZeroEnd(order.price),
      origin_volume: Utils.removeZeroEnd(order.origin_volume),
      volume: Utils.removeZeroEnd(order.volume),
      state:
        query.state === this.database.ORDER_STATE.CANCEL
          ? "canceled"
          : query.state === this.database.ORDER_STATE.DONE
          ? "done"
          : "wait",
      state_text:
        query.state === this.database.ORDER_STATE.CANCEL
          ? "Canceled"
          : query.state === this.database.ORDER_STATE.DONE
          ? "Done"
          : "Waiting",
      clOrdId: order.id,
      instId: query.instId,
      ordType: order.ord_type,
      filled: order.volume !== order.origin_volume,
    }));
    return orders;
  }

  async getOrderList({ query }) {
    try {
      const orders = await this.tbGetOrderList({
        ...query,
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
  }

  async getOrderHistory({ query }) {
    try {
      const cancelOrders = await this.tbGetOrderList({
        ...query,
        state: this.database.ORDER_STATE.CANCEL,
      });
      const doneOrders = await this.tbGetOrderList({
        ...query,
        state: this.database.ORDER_STATE.DONE,
      });
      const vouchers = await this.database.getVouchers({
        memberId: query.memberId,
        ask: query.market.base_unit,
        bid: query.market.quote_unit,
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
    this.logger.log(
      `---------- [${this.constructor.name}]  _updateOrder this.market: ${this.market} [START] ----------`
    );
    this.logger.log(` this.market: ${this.market}`);
    this.logger.log(`[FROM TideBit] orderData`, data);
    if (data.market === this.market) {
      const formatOrder = {
        ...data,
        // ordId: data.id,
        clOrdId: data.id,
        instId: this._findInstId(data.market),
        ordType: data.price === undefined ? "market" : "limit",
        // px: data.price,
        // side: data.kind === "bid" ? "buy" : "sell",
        // sz: Utils.removeZeroEnd(
        //   SafeMath.eq(data.volume, "0") ? data.origin_volume : data.volume
        // ),
        filled: data.volume !== data.origin_volume,
        // state:
        //   data.state === "wait"
        //     ? "wait"
        //     : SafeMath.eq(data.volume, "0")
        //     ? "done"
        //     : "canceled",
      };
      this.logger.log(
        `[TO FRONTEND][OnEvent: ${Events.order}] updateOrder`,
        formatOrder
      );
      EventBus.emit(Events.order, data.market, formatOrder);
      this.logger.log(
        `---------- [${this.constructor.name}]  _updateOrder market: ${data.market} [END] ----------`
      );
    }
  }

  async postPlaceOrder({ header, body }) {
    try {
      const url =
        body.kind === "bid"
          ? `${this.peatio}/markets/${body.market.id}/order_bids`
          : `${this.peatio}/markets/${body.market.id}/order_asks`;
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
      this.logger.error(error);
      // debug for postman so return error
      return new ResponseFormat({
        message: "postPlaceOrder error",
        code: Codes.UNKNOWN_ERROR,
      });
    }
  }

  async postCancelOrder({ header, body }) {
    try {
      const url = `${this.peatio}/markets/${body.market.id}/orders/${body.orderId}`;
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
      return new ResponseFormat({
        message: "postCancelOrder",
        code: Codes.SUCCESS,
        payload: tbCancelOrderRes.data,
      });
    } catch (error) {
      this.logger.error(error);
      // debug for postman so return error
      return new ResponseFormat({
        message: "postCancelOrder error",
        code: Codes.UNKNOWN_ERROR,
      });
    }
  }

  async cancelAllAsks({ header, body }) {
    try {
      const url = `${this.peatio}/markets/${body.market.id}/order_asks/clear`;
      this.logger.debug("cancelAllAsks", url);
      const headers = {
        Accept: "*/*",
        "x-csrf-token": body["X-CSRF-Token"],
        cookie: header.cookie,
      };
      const tbCancelOrderRes = await axios({
        method: "post",
        url,
        headers,
      });
      return new ResponseFormat({
        message: "cancelAllAsks",
        code: Codes.SUCCESS,
        payload: tbCancelOrderRes.data,
      });
    } catch (error) {
      this.logger.error(error);
      // debug for postman so return error
      return new ResponseFormat({
        message: "cancelAllAsks error",
        code: Codes.UNKNOWN_ERROR,
      });
    }
  }

  async cancelAllBids({ header, body }) {
    try {
      const url = `${this.peatio}/markets/${body.market.id}/order_bids/clear`;
      this.logger.debug("cancelAllBids", url);
      const headers = {
        Accept: "*/*",
        "x-csrf-token": body["X-CSRF-Token"],
        cookie: header.cookie,
      };
      const tbCancelOrderRes = await axios({
        method: "post",
        url,
        headers,
      });
      return new ResponseFormat({
        message: "cancelAllBids",
        code: Codes.SUCCESS,
        payload: tbCancelOrderRes.data,
      });
    } catch (error) {
      this.logger.error(error);
      // debug for postman so return error
      return new ResponseFormat({
        message: "cancelAllBids error",
        code: Codes.UNKNOWN_ERROR,
      });
    }
  }

  async cancelAllOrders({ header, body }) {
    try {
      const url = `${this.peatio}/markets/${body.market.id}/orders/clear`;
      this.logger.debug("cancelAll", url);
      const headers = {
        Accept: "*/*",
        "x-csrf-token": body["X-CSRF-Token"],
        cookie: header.cookie,
      };
      const tbCancelOrderRes = await axios({
        method: "post",
        url,
        headers,
      });
      return new ResponseFormat({
        message: "cancelAll",
        code: Codes.SUCCESS,
        payload: tbCancelOrderRes.data,
      });
    } catch (error) {
      this.logger.error(error);
      // debug for postman so return error
      return new ResponseFormat({
        message: "cancelAll error",
        code: Codes.UNKNOWN_ERROR,
      });
    }
  }

  async _registerPrivateChannel(wsId, sn) {
    try {
      if (!this.private_channel[wsId]) {
        this.private_channel[wsId] = {};
        this.private_channel[wsId]["sn"] = sn;
        this.private_channel[wsId]["channel"] = this.private_pusher[
          wsId
        ].subscribe(`private-${sn}`);
        this.private_channel[wsId]["channel"].bind("account", (data) =>
          this._updateAccount(data)
        );
        this.private_channel[wsId]["channel"].bind("order", (data) =>
          this._updateOrder(data)
        );
        this.private_channel[wsId]["channel"].bind("trade", (data) => {
          this._updateTrade(data);
        });
      }
    } catch (error) {
      this.logger.error(`private_channel error`, error);
      throw error;
    }
    this.logger.log(
      `[${this.constructor.name}] this.private_channel`,
      this.private_channel
    );
  }

  _unregisterPrivateChannel(wsId) {
    if (!wsId || !this.isStart) return;
    try {
      this.private_channel[wsId]["channel"]?.unbind();
      this.private_channel = this.private_pusher[wsId].unsubscribe(
        `private-${this.private_channel[wsId]["sn"]}`
      );
      delete this.private_channel[wsId];
    } catch (error) {
      this.logger.error(`_unregisterPrivateChannel error`, error);
      throw error;
    }
  }

  _registerMarketChannel(market, wsId) {
    if (!this.market_channel[`market-${market}-global`]) {
      try {
        this.market_channel[`market-${market}-global`] = {};
        this.logger.log(`_registerMarketChannel market`, market);
        this.market_channel[`market-${market}-global`]["channel"] =
          this.public_pusher.subscribe(`market-${market}-global`);
        this.market_channel[`market-${market}-global`]["channel"].bind(
          "update",
          (data) => this._updateBooks(market, data)
        );
        this.market_channel[`market-${market}-global`]["channel"].bind(
          "trades",
          (data) => {
            this._updateTrades(market, data);
          }
        );
        this.market_channel[`market-${market}-global`]["listener"] = [wsId];
      } catch (error) {
        this.logger.error(`_registerMarketChannel error`, error);
        throw error;
      }
    } else {
      this.market_channel[`market-${market}-global`]["listener"].push(wsId);
    }
    this.logger.log(
      `[${this.constructor.name}] this.market_channel`,
      this.market_channel
    );
  }

  _unregisterMarketChannel(market, wsId) {
    if (!this.isStart || !this.market_channel[`market-${market}-global`])
      return;
    try {
      if (
        this.market_channel[`market-${market}-global`]["listener"]?.length > 0
      ) {
        const index = this.market_channel[`market-${market}-global`][
          "listener"
        ].findIndex((_wsId) => _wsId === wsId);
        this.market_channel[`market-${market}-global`]["listener"] =
          this.market_channel[`market-${market}-global`]["listener"].splice(
            index,
            1
          );
      } else {
        this.market_channel[`market-${market}-global`]["channel"]?.unbind();
        this.public_pusher?.unsubscribe(`market-${market}-global`);
        delete this.market_channel[`market-${market}-global`];
      }
      if (Object.keys(this.market_channel).length === 0) {
        this.start = false;
        this._unregisterGlobalChannel();
        delete this.public_pusher;
        this.public_pusher = null;
      }
    } catch (error) {
      this.logger.error(`_unregisterMarketChannel error`, error);
      throw error;
    }
  }

  _registerGlobalChannel() {
    try {
      this.global_channel = this.public_pusher.subscribe("market-global");
      this.global_channel.bind("tickers", (data) => this._updateTickers(data));
    } catch (error) {
      this.logger.error(`_registerGlobalChannel error`, error);
      throw error;
    }
  }

  _unregisterGlobalChannel() {
    if (!this.isStart) return;
    try {
      this.global_channel?.unbind();
      this.public_pusher?.unsubscribe("market-global");
      this.global_channel = null;
    } catch (error) {
      this.logger.error(`_unregisterGlobalChannel error`, error);
      throw error;
    }
  }

  _startPusher() {
    this.public_pusher = new Pusher(this.key, {
      encrypted: this.encrypted,
      wsHost: this.wsHost,
      wsPort: this.wsPort,
      wssPort: this.wssPort,
      disableFlash: true,
      disableStats: true,
      disabledTransports: ["flash", "sockjs"],
      forceTLS: false,
    });
    this.isStart = true;
    this._registerGlobalChannel();
    // this.public_pusher.bind_global((data) =>
    //   this.logger.log(`[_startPusher][bind_global] data`, data)
    // );
  }

  _startPusherWithLoginToken(headers, wsId) {
    this.private_pusher[wsId] = new Pusher(this.key, {
      encrypted: this.encrypted,
      wsHost: this.wsHost,
      wsPort: this.wsPort,
      wssPort: this.wssPort,
      disableFlash: true,
      disableStats: true,
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
                  url: `${this.peatio}/pusher/auth`,
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
                    callback(null, data);
                  })
                  .catch((err) => {
                    this.logger.error(`authorize err`, err);
                    callback(new Error(`Error calling auth endpoint: ${err}`), {
                      auth: "",
                    });
                  });
              }
            : null,
        };
      },
    });
    this.isStart = true;
    // this.isCredential = true;
    // this.public_pusher.bind_global((data) =>
    //   this.logger.log(`[_startPusherWithLoginToken][bind_global] data`, data)
    // );
  }

  _stopPusher() {
    this._unregisterGlobalChannel();
    this._unregisterMarketChannel();
    this._unregisterPrivateChannel();
    // this.isStart = false;
    // this.isCredential = false;
  }

  _restartPusherWithLoginToken(credential) {
    // this._stopPusher();
    this._startPusherWithLoginToken(credential.headers);
    if (credential.market) {
      this.logger.log(`credential.market`, credential.market);
      this._registerMarketChannel(credential.market);
    }
  }

  /**
   *
   * @param {*} credential
   * headers
   * token
   * market
   * wsId
   */
  async _subscribeUser(credential) {
    try {
      this.logger.log(
        `++++++++ [${this.constructor.name}]  _subscribeUser [START] ++++++`
      );
      this.logger.error(`_subscribeUser credential`, credential);
      const memberId = await this.getMemberIdFromRedis(credential.token);
      if (memberId !== -1) {
        const member = await this.database.getMemberById(memberId);
        this._startPusherWithLoginToken(credential.headers, credential.wsId);
        await this._registerPrivateChannel(credential.wsId, member.sn);
      }
      this.logger.log(
        `++++++++ [${this.constructor.name}]  _subscribeUser [END] ++++++`
      );
    } catch (error) {
      this.logger.error(`_subscribeUser error`, error);
      throw error;
    }
  }
  /**
   *
   * @param {*} credential
   * wsId
   * market
   */
  async _unsubscribeUser(credential) {
    if (this.private_pusher[credential.wsId]) {
      try {
        this.logger.log(
          `---------- [${this.constructor.name}]  _unsubscribeUser [START] ----------`
        );
        this.logger.error(`_unsubscribeUser credential`, credential);
        // this._stopPusher();
        this._unregisterPrivateChannel(credential.wsId);
        delete this.private_pusher[credential.wsId];
        // this._unsubscribeMarket(credential.market, credential.wsId);
        this.logger.log(
          `---------- [${this.constructor.name}]  _unsubscribeUser [END] ----------`
        );
      } catch (error) {
        this.logger.error(`_unsubscribeUser error`, error);
        throw error;
      }
    }
  }

  _subscribeMarket(market, wsId) {
    if (
      this._findSource(this._findInstId(market)) === SupportedExchange.TIDEBIT
    ) {
      // this.books = null;
      // this.trades = null;
      this._booksTimestamp = 0;
      this._tradesTimestamp = 0;

      this.logger.log(
        `++++++++ [${this.constructor.name}]  _subscribeMarket [START] ++++++`
      );
      this.logger.log(`_subscribeMarket market, wsId`, market, wsId);
      if (!this.isStart) this._startPusher();
      this._registerMarketChannel(market, wsId);
      this.logger.log(
        `++++++++ [${this.constructor.name}]  _subscribeMarket [END] ++++++`
      );
    }
  }

  _unsubscribeMarket(market, wsId) {
    if (
      this._findSource(this._findInstId(market)) === SupportedExchange.TIDEBIT
    ) {
      this.logger.log(
        `---------- [${this.constructor.name}]  _unsubscribeMarket [START] ----------`
      );
      this.logger.error(`_unsubscribeMarket market, wsId`, market, wsId);
      this._unregisterMarketChannel(market, wsId);
    }
    this.logger.log(
      `---------- [${this.constructor.name}]  _unsubscribeMarket [END] ----------`
    );
  }

  _findInstId(id) {
    return this.markets[id.toUpperCase()];
  }

  _findSource(instId) {
    return this.markets[`tb${instId}`];
  }
}

module.exports = TibeBitConnector;
