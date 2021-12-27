const { default: BigNumber } = require('bignumber.js');
const path = require('path');
const dvalue = require('dvalue');
const smartContract = require('../libs/smartContract');
const Utils = require('../libs/Utils');

const Bot = require(path.resolve(__dirname, 'Bot.js'));
const eceth = require(path.resolve(__dirname, '../libs/eceth.js'));

// scan pairs
// scan event
// read pair data

class Scanner extends Bot {
  _focus = [];
  _jobs = [];
  _uniswap = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'; // Uniswap V2
  _sushiswap = '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F'; // Sushiswap
  _tidebitSwap = '0x3753A62D7654b072Aa379866391e4a10000Dcc53';  // TideBit Swap

  _router = this._sushiswap;
  _pairRouter = this._uniswap;

  _pairs = [];
  _tokens = [];
  _exchange = [];
  _WETH = '';

  constructor() {
    super();
    this.name = 'Scanner';
  }

  async start() {
    const s = new Date().getTime();
    const router = this._router;
    const factory = await this.getFactoryFromRouter({ router });
    const pairFactory = await this.getFactoryFromRouter({ router: this._pairRouter });
    console.log('getFactoryFromRouter', router, '->', factory);
    console.log('getpairFactoryFromRouter', router, '->', pairFactory);

    this._WETH = await this.getWETHFromRouter({ router });
    console.log('getWETHFromRouter WETH:', this._WETH);

    this.foreverScan({ factory, pairFactory })
  }
  async foreverScan({ factory, pairFactory }) {
    console.log('scanPairsFromFactory', factory);
    const pairs = await this.getPairsFromFactory({ factory, pairFactory });
    console.log(`scan with ${(new Date().getTime() - s)/1000}s`);
    console.log(JSON.stringify(this._focus));
    return this.foreverScan()
  }

  async getFactoryFromRouter({ router, server }) {
    const rs = await eceth.getData({ contract: router, func: 'factory()', params: [], dataType: ['address'], server });
    return rs[0];
  }

  async getWETHFromRouter({ router }) {
    const rs = await eceth.getData({ contract: router, func: 'WETH()', params: [], dataType: ['address'] });
    return rs[0];
  }

  async getPairsFromFactory({ factory, pairFactory }) {
    let result = [];
    try {
      const allPairsLength = (await eceth.getData({ contract: factory, func: 'allPairsLength()', params: [], dataType: ['uint8'] }))[0];
      const jobs = new Array(allPairsLength).fill(0).map((v, i) => {
        // jobs for promiseAll
        return async () => {
          let pair, comparePair;
          pair = await this.getPairFromFactory({ factory, index: i });
          if(!pair) { return; } // skip if pair not found
          result.push(pair);
          if(smartContract.isEthereumAddress(pairFactory) && !!pair.token0) {
            comparePair = await this.findPairFromFactory({ pair, factory: pairFactory });
          }

          let msg, job;
          if(pair.token1.contract == this._WETH) {
            msg = (`1 ${pair.token0.symbol} = ${pair.token0.price.amount} ${pair.token0.price.unit}`);
            if(!!comparePair) {
              const diff = (comparePair.token0.price.amount - pair.token0.price.amount) / pair.token0.price.amount * 100;
              const pairETH = pair.token1.liquidity / 1;
              const compairETH = comparePair.token1.liquidity / 1;
              msg += ` ${(diff).toFixed(2)}%`;
              if(diff ** 2 > 1 && pairETH > 1 && compairETH > 1) {
                this._focus.push(i);
                const suggest = Math.min(pairETH, compairETH) / 100;
                console.log(i, msg, pairETH, compairETH);
                console.log(`factory0: ${diff > 0 ? factory : pairFactory}, factory1: ${diff < 0 ? factory : pairFactory}, token: ${pair.token0.contract}, amount: ${suggest * (10**18)}(`, (suggest), `ETH )`);
                job = {
                  id: dvalue.randomID(),
                  factory0: diff > 0 ? factory : pairFactory,
                  factory1: diff < 0 ? factory : pairFactory,
                  token: pair.token0.contract,
                  amount: new BigNumber(suggest).multipliedBy(new BigNumber(1000000000000000000)).toFixed()
                };
                this.createJob(job);
              }
            }
          }
          
          if(pair.token0.contract == this._WETH) {
            msg = (`1 ${pair.token1.symbol} = ${pair.token1.price.amount} ${pair.token1.price.unit}`);
            if(!!comparePair) {
              const diff = (comparePair.token1.price.amount - pair.token1.price.amount) / pair.token1.price.amount * 100;
              const pairETH = pair.token0.liquidity / 1;
              const compairETH = comparePair.token0.liquidity / 1;
              msg += ` ${(diff).toFixed(2)}% `;
              if(diff ** 2 > 1 && pairETH > 1 && compairETH > 1) {
                this._focus.push(i);
                const suggest = Math.min(pairETH, compairETH) / 100;
                console.log(i, msg, pairETH, compairETH);
                console.log(`factory0: ${diff > 0 ? factory : pairFactory}, factory1: ${diff < 0 ? factory : pairFactory}, token: ${pair.token1.contract}, amount: ${suggest * (10**18)}(`, (suggest), `ETH)`);
                job = {
                  id: dvalue.randomID(),
                  factory0: diff > 0 ? factory : pairFactory,
                  factory1: diff < 0 ? factory : pairFactory,
                  token: pair.token1.contract,
                  amount: new BigNumber(suggest).multipliedBy(new BigNumber(1000000000000000000)).toFixed()
                };
                this.createJob(job);
              }
            }
          }
        }
      });
      await Utils.waterfallPromise(jobs);
    }
    catch(e) {
      console.trace(e);
    }
    return result;
  }
  async getPairFromFactory({ factory, index }) {
    const pairAddress = (await eceth.getData({ contract: factory, func: 'allPairs(uint256)', params: [index], dataType: ['address'] }))[0];
    // console.log('getPairDetail', index, pairAddress);
    const result = await this.getPairDetail({ pair: pairAddress });

    return result;
  }
  async findPairFromFactory({ pair, factory }) {
    let result;
    const params = [pair.token0.contract, pair.token1.contract];
    const pairAddress = (await eceth.getData({ contract: factory, func: 'getPair(address,address)', params, dataType: ['address'] }))[0];
    if(smartContract.isEthereumAddress(pairAddress)) {
      result = this.getPairDetail({ pair: pairAddress });
    }
    return result;
  }

  async getPairDetail({ pair, server }) {
    let result;
    try {
      // const decimals = (await eceth.getData({ contract: pair, func: 'decimals()', params: [], dataType: ['uint8'], server }))[0];
      // const totalSupply = (await eceth.getData({ contract: pair, func: 'totalSupply()', params: [], dataType: ['uint256'], server }))[0];
      const token0Address = (await eceth.getData({ contract: pair, func: 'token0()', params: [], dataType: ['address'], server }))[0];
      const token1Address = (await eceth.getData({ contract: pair, func: 'token1()', params: [], dataType: ['address'], server }))[0];

      if(token0Address != this._WETH && token1Address != this._WETH) return;  //-- skip not WETH pair
      const reserves = await eceth.getData({ contract: pair, func: 'getReserves()', params: [], dataType: ['uint112', 'uint112', 'uint32'], server });
      const token0 = await this.getErc20Detail({ erc20: token0Address, server });
      const token1 = await this.getErc20Detail({ erc20: token1Address, server });
      const token0liquidity = new BigNumber(reserves[0]).dividedBy(new BigNumber(10).pow(token0.decimals));
      const token1liquidity = new BigNumber(reserves[1]).dividedBy(new BigNumber(10).pow(token1.decimals));
      token0.liquidity = token0liquidity.toFixed();
      token1.liquidity = token1liquidity.toFixed();
      token0.price = {
        amount: token1liquidity.dividedBy(token0liquidity).toFixed(),
        unit: token1.symbol
      };
      token1.price = {
        amount: token0liquidity.dividedBy(token1liquidity).toFixed(),
        unit: token0.symbol
      };
      result = { contract: pair, token0, token1};
    }
    catch(e) {
      console.trace(e);
    }
    return result;
  }

  async getErc20Detail({ erc20, server }) {
    let result;
    try {
      // const name = (await eceth.getData({ contract: erc20, func: 'name()', params: [], dataType: ['string'], server }))[0];
      // const symbol = (await eceth.getData({ contract: erc20, func: 'symbol()', params: [], dataType: ['string'], server }))[0];
      // const decimals = (await eceth.getData({ contract: erc20, func: 'decimals()', params: [], dataType: ['uint8'], server }))[0];
      // const totalSupply = (await eceth.getData({ contract: erc20, func: 'totalSupply()', params: [], dataType: ['uint256'], server }))[0];
      const [[name], [symbol], [decimals], [totalSupply]] = await Promise.all([
        eceth.getData({ contract: erc20, func: 'name()', params:[], dataType: ['string'], server }),
        eceth.getData({ contract: erc20, func: 'symbol()', params:[], dataType: ['string'], server }),
        eceth.getData({ contract: erc20, func: 'decimals()', params:[], dataType: ['uint8'], server }),
        eceth.getData({ contract: erc20, func: 'totalSupply()', params: [], dataType: ['uint256'], server }),
      ]);
      result = { contract: erc20, name, symbol, decimals, totalSupply };
    }
    catch(e) {
      result = { contract: erc20, symbol: '?', decimals: 18 };
      // console.trace(e);
    }
    return result;
  }

  async createJob(data) {
    this._jobs.push(data);
    this.broadcast({ type: 'new job', data});
  }
}

module.exports = Scanner;