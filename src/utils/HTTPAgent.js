const axios = require("axios");
class HTTPAgent {
  constructor({ apiURL = "", apiVersion, apiKey, apiSecret } = {}) {
    this.url = apiURL;
    this.apiVersion = apiVersion;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.axios = axios.create({
      baseURL: this.url + this.apiVersion,
    });
    this.axios.defaults.headers.common["OK-ACCESS-KEY"] = apiKey;
    return this;
  }

  setInterceptor() {
    // TODO: retry, logger?
  }

  setToken(token) {
    this.axios.defaults.headers.common["token"] = token;
  }

  getToken() {
    try {
      const { token } = this.axios.defaults.headers.common;
      return token || null;
    } catch (e) {
      return null;
    }
  }

  _request(request) {
    return request().then((res) => {
      if (!res.data) {
        return {
          success: false,
        };
      }
      console.log(res);
      return {
        success: res.status === 200,
        data: res.data.data,
        message: res.data.msg,
        code: res.data.code,
      };
    });
  }

  get(path) {
    return this._request(() => this.axios.get(path));
  }

  post(path, body) {
    return this._request(() => this.axios.post(path, body));
  }

  delete(path, body) {
    return this._request(() => this.axios.delete(path, body));
  }

  put(path, body) {
    return this._request(() => this.axios.put(path, body));
  }

  _refreshToken() {
    //TODO:
  }
}

export default HTTPAgent;
