const path = require('path');
// const dvalue = require('dvalue');
const { URL } = require('url');
// const Utils = require('../libs/Utils');

const Bot = require(path.resolve(__dirname, 'Bot.js'));
const ResponseFormat = require(path.resolve(__dirname, '../libs/ResponseFormat.js'));

const ONE_DAY_SECONDS = 86400;
const ONE_MONTH_SECONDS = 2628000;

class MockApis extends Bot {
  constructor() {
    super();
    this.name = 'MockApis';
  }

  init({ config, database, logger, i18n }) {
    return super.init({ config, database, logger, i18n })
      .then(() => this);
  }

  async start() {
    await super.start();
    return this;
  }

  async ready() {
    await super.ready();
    this.pairOnUpdate();
    // this.orderOnUpdate();
    // this.tradeDataOnUpdate();
    // this.candleOnUpdate()
    return this;
  }

  async wsBrocast({ channel = 'BCD-BTC', msg }) {
    const WSChannel = await this.getBot('WSChannel');
    WSChannel.broadcast(channel, msg);
  }

  pairOnUpdate() {
    setInterval(() => {
      const icon = `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@9ab8d6934b83a4aa8ae5e8711609a70ca0ab1b2b/32/icon/bcd.png`;
      const newPrice = ((Math.floor(Math.random() * 1000 + 1)) / 1000000).toString();
      const change = this.lastPrice ? ((1 - parseFloat(newPrice) / parseFloat(this.lastPrice)) * 100).toFixed(8) + '%' : '0.00000000%';
      this.lastPrice = newPrice;
      const pcdl = [
        ((Math.floor(Math.random() * 1000 + 1)) / 1000000).toString(),
        ((Math.floor(Math.random() * 1000 + 1)) / 1000000).toString(),
        ((Math.floor(Math.random() * 1000 + 1)) / 1000000).toString(),
        ((Math.floor(Math.random() * 1000 + 1)) / 1000000).toString(),
        newPrice
      ];
      const high = ([...pcdl].sort((a,b) => b-a))[0];
      const low = ([...pcdl].sort((a,b) => a-b))[0];
      const volCcy = (Math.random() * 1000 + 10000).toFixed(4);
      const vol = (parseFloat(volCcy) * parseFloat(newPrice)).toFixed(4);
      const data = [{
        instId: "BCD-BTC",
        baseCcy: "BCD",
        baseCcyNm: "Bitcoin Diamond",
        baseCcyIc: icon,
        quoteCcy: "BTC",
        last: this.lastPrice,
        change: change,
        open24h: pcdl[0],
        high24h: high,
        low24h: low,
        volCcy24h: volCcy,
        vol24h: vol,
        timestamp: Date.now(),
        openUtc0: pcdl[0],
        openUtc8: pcdl[1],
      }];
      this.wsBrocast({ 
        channel: 'BCD-BTC',
        msg: {
          type: 'pairOnUpdate',
          data,
        }
      });
    }, 5000);
  }

  orderOnUpdate() {
    const askPr = '0.000025';
    const bidPr = '0.000022';
    setInterval(() => {
      const poolOrderNum = [
        '0',
        (Math.floor(Math.random() * 9 + 1)).toString(),
        (Math.floor(Math.random() * 9 + 1)).toString(),
      ];
      const randomPickAsk = Math.round(Math.random() * 2);
      const randomPickBid = Math.round(Math.random() * 2);
      const data = [{
        instId: "BCD-BTC",
        asks: [
          [
            askPr,
            (Math.random() * 10).toFixed(4),
            "0",
            poolOrderNum[randomPickAsk],
          ]
        ],
        bids: [
          [
            bidPr,
            (Math.random() * 10).toFixed(4),
            "0",
            poolOrderNum[randomPickBid],
          ]
        ],
        timestamp: Date.now(),
      }];
      this.wsBrocast({ 
        channel: 'BCD-BTC',
        msg: {
          type: 'orderOnUpdate',
          data,
        }
      });
    }, 5000);
  }

  tradeDataOnUpdate() {
    this.tradeId = this.tradeId || "1210447366";
    setInterval(() => {
      const poolDir = ['buy', 'sell'];
      const randomPick = Math.round(Math.random());
      const sz = (Math.random() * 10).toFixed(4);
      this.tradeId = parseInt(this.tradeId) + (Math.floor(Math.random() * 10));
      const data = [{
        instId: "BCD-BTC",
        price: this.lastPrice,
        side: poolDir[randomPick],
        size: sz,
        timestamp: Date.now(),
        tradeId: this.tradeId
      }];
      this.wsBrocast({ 
        channel: 'BCD-BTC',
        msg: {
          type: 'tradeDataOnUpdate',
          data,
        }
      });
    }, 5000);
  }

  candleOnUpdate() {
    this.pcdl = [];
    this.lastMin = Date.now();
    this.vol = '0';
    setInterval(() => {
      const now = Date.now();
      if (now - this.lastMin > 60000) {
        this.lastMin = now;
        this.pcdl = [];
        this.vol = '0';
      }
      this.pcdl.push(this.lastPrice);
      const high = ([...this.pcdl].sort((a,b) => b-a))[0];
      const low = ([...this.pcdl].sort((a,b) => a-b))[0];
      this.vol = (parseFloat(this.vol) + Math.random()).toFixed(4)
      const data = [{
        instId: 'BCD-BTC',
        candle: [
          now,
          this.pcdl[0],
          high,
          low,
          this.lastPrice,
          this.vol,
        ],
      }];
      this.wsBrocast({ 
        channel: 'BCD-BTC',
        msg: {
          type: 'candleOnUpdate',
          data,
        }
      });
    }, 5000);
  }
}

module.exports = MockApis;
