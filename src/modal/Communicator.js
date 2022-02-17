import { decode } from "jsonwebtoken";
import { EXPIRED_ACCESS_TOKEN } from "../constant/Codes";
import { Config } from "../constant/Config";
import HTTPAgent from "../utils/HTTPAgent";

class Communicator {
  constructor() {
    this.httpAgent = new HTTPAgent({
      apiURL: Config[Config.status].apiURL,
      apiVersion: Config[Config.status].apiVersion,
      apiKey: Config[Config.status].apiKey,
      apiSecret: Config[Config.status].apiSecret,
    });
    this.token = null;
    this.tokenSecret = null;
    this.tokenRenewTimeout = null;
    return this;
  }

  // 0. User Token Renew
  /**
   * accessTokenRenew
   * @returns {
   *  token: string,
   *  tokenSecret: string
   * }
   */
  async accessTokenRenew({ token, tokenSecret }) {
    try {
      const body = {
        token,
        tokenSecret,
      };
      const res = await this.httpAgent.post("/token/renew", body);
      if (res.success) {
        this._setInfo(res.data.token, res.data.tokenSecret);
        return res.data;
      }
      return Promise.reject({ message: res.message, code: res.code });
    } catch (error) {
      return Promise.reject({ message: error });
    }
  }

  // Public
  /**
   * instruments
   * @param {String} instType SPOT,MARGIN,SWAP,FUTURES,OPTION
   * @returns [{
   * ...
   * }]
   */
  async instruments(instType = "SPOT") {
    try {
      if (!instType) return { message: "instType cannot be null" };
      const res = await this._get(`/public/instruments?instType=${instType}`);
      if (res.success) {
        return res.data;
      }
      return Promise.reject({ message: res.message, code: res.code });
    } catch (error) {
      return Promise.reject({ message: error });
    }
  }

  // Market
  async tickers(instType, from, limit) {
    try {
      if (!instType) return { message: "instType cannot be null" };
      const res = await this._get(
        `/market/tickers?instType=${instType}${from ? `&from=${from}` : ""}${
          limit ? `&limit=${limit}` : ""
        }`
      );
      if (res.success) {
        return res.data;
      }
      return Promise.reject({ message: res.message, code: res.code });
    } catch (error) {
      return Promise.reject({ message: error });
    }
  }

  // Market
  async books(instId, sz) {
    try {
      if (!instId) return { message: "instId cannot be null" };
      const res = await this._get(
        `/market/books?instId=${instId}${sz ? `&sz=${sz}` : ""}`
      );
      if (res.success) {
        return res.data;
      }
      return Promise.reject({ message: res.message, code: res.code });
    } catch (error) {
      return Promise.reject({ message: error });
    }
  }

  // Market
  async trades(instId, limit) {
    try {
      if (!instId) return { message: "instId cannot be null" };
      const res = await this._get(
        `/market/trades?instId=${instId}${limit ? `&limit=${limit}` : ""}`
      );
      if (res.success) {
        return res.data;
      }
      return Promise.reject({ message: res.message, code: res.code });
    } catch (error) {
      return Promise.reject({ message: error });
    }
  }

  // Market
  async candles(instId, bar, after, before, limit) {
    try {
      if (!instId) return { message: "instId cannot be null" };
      const res = await this._get(
        `/market/candles?instId=${instId}&bar=${bar}${
          after ? `&after=${after}` : ""
        }${before ? `&before=${before}` : ""}${limit ? `&limit=${limit}` : ""}`
      );
      if (res.success) {
        return res.data;
      }
      return Promise.reject({ message: res.message, code: res.code });
    } catch (error) {
      return Promise.reject({ message: error });
    }
  }
  // Trade
  async ordersPending(options) {
    try {
      const url = `/trade/orders-pending?${
        options?.instId ? `&instId=${options.instId}` : ""
      }${options?.instType ? `&instType=${options.instType}` : ""}${
        options?.ordType ? `&ordType=${options.ordType}` : ""
      }${options?.state ? `&state=${options.state}` : ""}${
        options?.after ? `&after=${options.after}` : ""
      }${options?.before ? `&before=${options.before}` : ""}${
        options?.limit ? `&limit=${options.limit}` : ""
      }`;
      console.log(`getPendingOrders url`, url);
      const res = await this._get(url);
      if (res.success) {
        return res.data;
      }
      return Promise.reject({ message: res.message, code: res.code });
    } catch (error) {
      return Promise.reject({ message: error });
    }
  }

  // Trade
  async closeOrders(options) {
    try {
      const url = `/trade/orders-history?${
        options?.instId ? `&instId=${options.instId}` : ""
      }${options?.instType ? `&instType=${options.instType}` : "&instType=SPOT"}${
        options?.ordType ? `&ordType=${options.ordType}` : ""
      }${options?.state ? `&state=${options.state}` : ""}${
        options?.after ? `&after=${options.after}` : ""
      }${options?.before ? `&before=${options.before}` : ""}${
        options?.limit ? `&limit=${options.limit}` : ""
      }`;
      console.log(`closeOrders url`, url);
      const res = await this._get(url);
      if (res.success) {
        return res.data;
      }
      return Promise.reject({ message: res.message, code: res.code });
    } catch (error) {
      return Promise.reject({ message: error });
    }
  }

  // Account
  async balance(ccy) {
    try {
      const url = `/account/balance?${ccy ? `&ccy=${ccy}` : ""}`;
      console.log(`balance url`, url);
      const res = await this._get(url);
      if (res.success) {
        return res.data;
      }
      return Promise.reject({ message: res.message, code: res.code });
    } catch (error) {
      return Promise.reject({ message: error });
    }
  }

  // Trade
  async order(order) {
    try {
      const res = await this._post(`/trade/order`, order);
      if (res.success) {
        return res.data;
      }
      return Promise.reject({ message: res.message, code: res.code });
    } catch (error) {
      return Promise.reject({ message: error });
    }
  }

    // Trade
    async cancel(order) {
      try {
        const res = await this._post(`/trade/cancel-order`, order);
        if (res.success) {
          return res.data;
        }
        return Promise.reject({ message: res.message, code: res.code });
      } catch (error) {
        return Promise.reject({ message: error });
      }
    }

  // use for need jwt request
  async _get(url) {
    try {
      let res = await this.httpAgent.get(url);
      if (res.code === EXPIRED_ACCESS_TOKEN) {
        await this.accessTokenRenew({
          token: this.token,
          tokenSecret: this.tokenSecret,
        });
        res = await this.httpAgent.get(url);
      }
      return res;
    } catch (e) {
      if (e.code === EXPIRED_ACCESS_TOKEN) {
        try {
          await this.accessTokenRenew({
            token: this.token,
            tokenSecret: this.tokenSecret,
          });
          return this.httpAgent.get(url);
        } catch (error) {
          return Promise.reject(e);
        }
      }
      return Promise.reject(e);
    }
  }

  // use for need jwt request
  async _post(url, body) {
    try {
      let res = await this.httpAgent.post(url, body);
      if (res.code === EXPIRED_ACCESS_TOKEN) {
        await this.accessTokenRenew({
          token: this.token,
          tokenSecret: this.tokenSecret,
        });
        res = await this.httpAgent.post(url, body);
      }
      return res;
    } catch (e) {
      if (e.code === EXPIRED_ACCESS_TOKEN) {
        try {
          await this.accessTokenRenew({
            token: this.token,
            tokenSecret: this.tokenSecret,
          });
          return this.httpAgent.post(url, body);
        } catch (error) {
          return Promise.reject(e);
        }
      }
      return Promise.reject(e);
    }
  }

  // use for need jwt request
  async _delete(url, body) {
    try {
      let res = await this.httpAgent.delete(url, body);
      if (res.code === EXPIRED_ACCESS_TOKEN) {
        await this.accessTokenRenew({
          token: this.token,
          tokenSecret: this.tokenSecret,
        });
        res = await this.httpAgent.delete(url, body);
      }
      return res;
    } catch (e) {
      if (e.code === EXPIRED_ACCESS_TOKEN) {
        try {
          await this.accessTokenRenew({
            token: this.token,
            tokenSecret: this.tokenSecret,
          });
          return this.httpAgent.delete(url, body);
        } catch (error) {
          return Promise.reject(e);
        }
      }
      return Promise.reject(e);
    }
  }

  // use for need jwt request
  async _put(url, body) {
    try {
      let res = await this.httpAgent.put(url, body);
      if (res.code === EXPIRED_ACCESS_TOKEN) {
        await this.accessTokenRenew({
          token: this.token,
          tokenSecret: this.tokenSecret,
        });
        res = await this.httpAgent.put(url, body);
      }
      return res;
    } catch (e) {
      if (e.code === EXPIRED_ACCESS_TOKEN) {
        try {
          await this.accessTokenRenew({
            token: this.token,
            tokenSecret: this.tokenSecret,
          });
          return this.httpAgent.put(url, body);
        } catch (error) {
          return Promise.reject(e);
        }
      }
      return Promise.reject(e);
    }
  }

  _setInfo(token, tokenSecret) {
    this.token = token;
    this.tokenSecret = tokenSecret;
    this.httpAgent.setToken(token);
    try {
      const data = decode(token);
      const time = data.exp * 1000 - Date.now() - 5000;
      console.log("renew token timeout", time);
      if (this.tokenRenewTimeout) {
        clearTimeout(this.tokenRenewTimeout);
        this.tokenRenewTimeout = null;
      }
      this.tokenRenewTimeout = setTimeout(async () => {
        await this.accessTokenRenew({ token, tokenSecret });
      }, time);
    } catch (error) {
      this.tokenRenewTimeout = null;
    }
  }
}

export default Communicator;
