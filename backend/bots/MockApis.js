const path = require('path');
const dvalue = require('dvalue');
const smartContract = require('../libs/smartContract');
const Utils = require('../libs/Utils');

const Bot = require(path.resolve(__dirname, 'Bot.js'));
const eceth = require(path.resolve(__dirname, '../libs/eceth.js'));
const Blockchains = require(path.resolve(__dirname, '../constants/Blockchain.js'));
const ResponseFormat = require(path.resolve(__dirname, '../libs/ResponseFormat.js'));
const TideBitSwapRouters = require('../constants/SwapRouter.js');

const CrawlerBase = require('../libs/CrawlerBase') //++ todo: move to new class

class MockApis extends Bot {
  constructor() {
    super();
    this.name = 'MockApis';
  }

  init({ config, database, logger, i18n }) {
    return super.init({ config, database, logger, i18n })
    .then(() => {
      this.testCrawler = new CrawlerBase(3, database, logger);
      return this.testCrawler.init();
    })
      .then(() => this);
  }

  async start() {
    await super.start();
    await this.testCrawler.start();
    return this;
  }

  async getPriceData({ params = {} }) {
    return new ResponseFormat({
      message: 'Price Data',
      payload: Utils.randomCandleStickData(),
    });
  }

  async getTvlHistory({ params = {} }) {
    const { startTime = new Date(2021, 9, 15), endTime = new Date() } = params;
    return new ResponseFormat({
      message: 'TVL History',
      payload: Utils.randomFixedDirectionData(startTime, endTime),
    })
  }

  async getVolume24hr({ params = {} }) {
    const { startTime = new Date(2021, 9, 15), endTime = new Date() } = params;
    return new ResponseFormat({
      message: 'get Volume 24hr',
      payload: Utils.randomData(startTime, endTime),
    });
  }

  async searchPool({ params = {} }) {
    return new ResponseFormat({
      message: 'Search Pool',
      payload:{
        poolContract: '0x63D11c6d79D7FB7cf611b0B142e057a00D7D19E7',
        token0Contract: '0x786c7cf5d05d8f7792180c1f40e7f79aa10300f6',
        token1Contract: '0xb97fc2e31b5c9f6901a0daded776a05409feb3df',
        reserve0: '420090909090909091000',
        reserve1: '437476317655020223996',
        decimals: 18,
        totalSupply: '530725760680039093730',
      }
    })
  }

  async getPoolDetail({ params = {} }) {
    return new ResponseFormat({
      message: 'Pool Detail',
      payload:{
        volume: {
          value: `${(Math.random() * 10).toFixed(2)}m`,
          change: `${Math.random() * 1 > 0.5 ? "+" : "-"}${(
            Math.random() * 1
          ).toFixed(2)}`,
        },
        tvl: {
          value: `${(Math.random() * 10).toFixed(2)}m`,
          change: `${Math.random() * 1 > 0.5 ? "+" : "-"}${(
            Math.random() * 1
          ).toFixed(2)}`,
        },
        irr: "3",
        interest24: `${(Math.random() * 10).toFixed(2)}m`,
      }
    })
  }

  async getTokenDetail({ params = {} }) {
    return new ResponseFormat({
      message: 'Token Detail',
      payload:{
        priceToEth: {
          value: `${(Math.random() * 10).toFixed(2)}m`,
          change: `${Math.random() * 1 > 0.5 ? "+" : "-"}${(
            Math.random() * 1
          ).toFixed(2)}`,
        },
        volume: {
          value: `${(Math.random() * 10).toFixed(2)}m`,
          change: `${Math.random() * 1 > 0.5 ? "+" : "-"}${(
            Math.random() * 1
          ).toFixed(2)}`,
        },
      }
    })
  }

  async getCryptoRate({ params = {} }) {
    return new ResponseFormat({
      message: 'Crypto Currency Rate',
      payload: {
        "name": "ETH",
        "rate": "4678.229083048072"
      },
    });
  }

  async getFiatRate() {
    return new ResponseFormat({
      message: 'Fiat Rate',
      payload: [
        {
          "name": "USD",
          "rate": "1"
        },
        {
          "name": "CNY",
          "rate": "0.15649972880130175375"
        },
        {
          "name": "TWD",
          "rate": "0.0361598264328331224"
        },
        {
          "name": "HKD",
          "rate": "0.1273549086964382571"
        },
        {
          "name": "JPY",
          "rate": "0.00876152594467546556"
        },
        {
          "name": "EUR",
          "rate": "1.12746338817573675646"
        }
      ]
    });
  }
}

module.exports = MockApis;
