const Blockchains = require('../constants/Blockchain');
const Eceth = require('./eceth');
const SmartContract = require('./smartContract');
const TideBitSwapRouters = require('../constants/SwapRouter.js');


const SYNC_EVENT = '0x' + SmartContract.encodeFunction('Sync(uint112,uint112)');
const SWAP_EVENT = '0x' + SmartContract.encodeFunction('Swap(address,uint256,uint256,uint256,uint256,address)');
const MINT_EVENT = '0x' + SmartContract.encodeFunction('Mint(address,uint256,uint256)');
const BURN_EVENT = '0x' + SmartContract.encodeFunction('Burn(address,uint256,uint256,address)');

class CrawlerBase {
  constructor(chainId, database, logger) {
    this.chainId = chainId;
    this.database = database;
    this.logger = logger;
    this.syncInterval = 7500;
    this.events = [SWAP_EVENT, MINT_EVENT, BURN_EVENT];
    return this;
  }

  async init() {
    this.isSyncing = false;
    this.blockchain = Blockchains.findByChainId(this.chainId);
    this.router = TideBitSwapRouters.find((o) => o.chainId === this.chainId).router;
    this.factory = await this.getFactoryFromRouter(this.router);

    this._poolIndex = await this.allPairsLength();
    this._poolAddresses = []
    this._poolAddresses = this._poolAddresses.concat(await this.poolAddresses(0, this._poolIndex));
    await this._poolAddresses.map((v,i) => {
      this.syncPool(v,i);
    })
  }

  async start() {
    this._peerBlock = 0;
    try {
      this.oneCycle();
    } catch (error) {
      this.logger.log(`[${this.constructor.name}] ${error}`);
    }
    setInterval(async () => {
      try {
        this.oneCycle();
      } catch (error) {
        this.logger.log(`[${this.constructor.name}] ${error}`);
      }
    }, this.syncInterval);
  }

  async oneCycle() {
    try {
      if(this.isSyncing) {
        this.logger.log(`[${this.constructor.name}] is syncing.`);
        return;
      }
      this.isSyncing = true;
      // step
      // 1. get block number from db
      // 2. get block number from node
      // 3. check block number, if qeual, wait to next cycle
      // 4. get new pool set from factory
      // 4-1. if has new pool, insert pool
      // 5. get block by number from node
      // 6. filter input != '0x'
      // 7. get receipt
      // 8. filter log address include in pool set and topic with sync and at least one [swap, mint burn]
      // 9. insert poolPrice, transactionHistory
      // 10 update blockTimestamp isParsed
      // 11. loop 5~10 until newest block

      if (!await this.checkBlockNumberLess()) {
        this.logger.debug(`[${this.constructor.name}] block height ${this._dbBlock} is top now.`);
        this.isSyncing = false;
        return Promise.resolve();
      }

      const newPoolIndex = await this.allPairsLength();
      const newPoolAddresses = await this.poolAddresses(this._poolIndex, newPoolIndex);
      await newPoolAddresses.map((v,i) => {
        this.syncPool(v, this._poolIndex + i);
      });

      this._poolAddresses.concat(newPoolAddresses);
      this._poolIndex = newPoolIndex;

      for (let blockNumber = parseInt(this._dbBlock); blockNumber <= parseInt(this._peerBlock); blockNumber++) {
        console.log('!!!blockNumber', blockNumber);
        const t1 = Date.now();
        const blockData = await this.getBlockByNumber(blockNumber);

        const txs = blockData.transactions.filter((tx) => tx.input != '0x');
        for(const tx of txs) {
          const receipt = await this.getReceiptFromPeer(tx.hash);
          
          await this.parseReceipt(receipt, parseInt(blockData.timestamp));
        }
        await this.updateBlockParsed(blockNumber);
        console.log('!!! total txs', txs.length);
        console.log('!!! one block used', Date.now() - t1, 'ms');
      }
      this.isSyncing = false;
    } catch (error) {
      console.log(error);
      this.isSyncing = false;
    }
  }

  async checkBlockNumberLess() {
    this.logger.debug(`[${this.constructor.name}] checkBlockNumberLess`);
    this._dbBlock = await this.blockNumberFromDB();
    this._peerBlock = await this.blockNumberFromPeer();
    let intDbBlock = this._dbBlock;
    let intPeerBlock = this._peerBlock;
    if (typeof this._dbBlock === 'string') {
      intDbBlock = parseInt(this._dbBlock);
    }
    if (typeof this._peerBlock === 'string') {
      intPeerBlock = parseInt(this._peerBlock, 16);
    }
    if (typeof intDbBlock !== 'number' || typeof intPeerBlock !== 'number') {
      return false;
    }
    if (intDbBlock === 0) { this._dbBlock = this._peerBlock; } //if db not found any block, get newest
    return intDbBlock < intPeerBlock;
  }

  async blockNumberFromDB() {
    let res;
    try {
      const findUnparsed = await this.database.blockTimestampDao.findUnparsed(this.chainId.toString());
      if (findUnparsed) {
        res = findUnparsed.blockNumber;
      } else {
        const findLastBlock = await this.database.blockTimestampDao.findLastBlock(this.chainId.toString());
        res = findLastBlock ? findLastBlock.blockNumber : '0';
      }
    } catch (error) {
      console.log(error)
    }

    this.logger.debug('blockNumberFromDB res', res)
    return res;
  }

  async blockNumberFromPeer() {
    const res = await Eceth.getBlockNumber({ server: this.blockchain.rpcUrls[0] });
    this.logger.debug('blockNumberFromPeer res', res)
    return res;
  }

  async getFactoryFromRouter(router) {
    const [factory] = await Eceth.getData({ contract: router, func: 'factory()', params: [], dataType: ['address'], server: this.blockchain.rpcUrls[0] });
    this.logger.debug(`[${this.constructor.name}] getFactoryFromRouter`, router, '->', factory);
    if (!factory) throw new Error('getFactoryFromRouter fail');
    return factory;
  }

  async allPairsLength() {
    const allPairsLength = (await Eceth.getData({ contract: this.factory, func: 'allPairsLength()', params: [], dataType: ['uint8'], server: this.blockchain.rpcUrls[0] }))[0];
    return allPairsLength;
  }

  async syncPool(poolContract, factoryIndex) {
    try {
      console.log('!!!syncPool', poolContract, factoryIndex)
      const [[decimals], [totalSupply], [token0Contract], [token1Contract]] = await Promise.all([
        Eceth.getData({ contract: poolContract, func: 'decimals()', params: [], dataType: ['uint8'], server: this.blockchain.rpcUrls[0] }),
        Eceth.getData({ contract: poolContract, func: 'totalSupply()', params: [], dataType: ['uint256'], server: this.blockchain.rpcUrls[0] }),
        Eceth.getData({ contract: poolContract, func: 'token0()', params: [], dataType: ['address'], server: this.blockchain.rpcUrls[0] }),
        Eceth.getData({ contract: poolContract, func: 'token1()', params: [], dataType: ['address'], server: this.blockchain.rpcUrls[0] }),
      ]);
      const entity = this.database.poolDao.entity({
        chainId: this.chainId.toString(),
        contract: poolContract,
        factoryContract: this.factory,
        factoryIndex,
        decimals,
        totalSupply,
        token0Contract,
        token1Contract,
        timestamp: Math.floor(Date.now() / 1000),
      })
      await this.database.poolDao.insertPool(entity);
    } catch (error) {
      this.logger.trace(error);
    }
    return;
  }

  async getBlockByNumber(number) {
    const blockData = await Eceth.getBlockByNumber({ blockNumber: number, server: this.blockchain.rpcUrls[0] });
    if (!blockData) throw new Error('block not found.')
    const entity = this.database.blockTimestampDao.entity({
      chainId: this.chainId.toString(),
      blockNumber: number,
      timestamp: parseInt(blockData.timestamp),
      isParsed: 0,
    });
    await this.database.blockTimestampDao.insertBlockTimestamp(entity);
    return blockData;
  }

  async poolAddresses(startIndex, endIndex){
    console.log('poolAddresses', startIndex, typeof startIndex, endIndex, typeof endIndex);
    const getAddress = async (i) => {
      const pairAddress = (await Eceth.getData({ contract: this.factory, func: 'allPairs(uint256)', params: [i], dataType: ['address'], server: this.blockchain.rpcUrls[0] }))[0];
      return pairAddress;
    }
    let result = [];
    for (let i = startIndex, step = 10; i < endIndex; i+= step) {
      const request = [];
      if (step > endIndex - i) step = endIndex - i;
      for (let j = i; j < i + step; j++) {
        request.push(getAddress(j));
      }
      try {
        const res = await Promise.all(request);
        result = result.concat(res);
      } catch (error) {
        this.logger.error(error);
      }
    }
    return result;
  }

  async getReceiptFromPeer(txHash) {
    const receipt = await Eceth.getReceipt({ txHash, server: this.blockchain.rpcUrls[0] });
    return receipt;
  }

  async parseReceipt(receipt, timestamp) {
    if (!this.isNotice(receipt)) return;

    for(const log of receipt.logs) {
      let parsedData;
      let poolDetail;
      try {
        const topic = log.topics[0];
        switch(topic) {
          case SYNC_EVENT:
            parsedData = Eceth.parseData({ data: log.data.replace('0x', ''), dataType: ['uint112', 'uint112'] })
            await this.insertPoolPrice({
              address: log.address,
              transactionHash: receipt.transactionHash,
              timestamp,
              token0Amount: parsedData[0],
              token1Amount: parsedData[1],
            })
            break;
          case SWAP_EVENT:
            parsedData = Eceth.parseData({ data: log.data.replace('0x', ''), dataType: ['uint256', 'uint256', 'uint256', 'uint256'] });
            console.log('!!!log.data', log.data);
            console.log('!!!parsedData', parsedData);
            poolDetail = await this.database.poolDao.findPool(this.chainId.toString(), log.address);
            await this.insertTransaction({
              transactionHash: receipt.transactionHash,
              type: 0,
              callerAddress: receipt.from,
              poolContract: log.address,
              token0Contract: poolDetail.token0Contract,
              token1Contract: poolDetail.token1Contract,
              token0AmountIn: parsedData[0],
              token0AmountOut: parsedData[1],
              token1AmountIn: parsedData[2],
              token1AmountOut: parsedData[3],
              timestamp,
            })
            break;
          case MINT_EVENT:
            break;
          case BURN_EVENT:
            break;
          default:
        }
        
      } catch (error) {
        this.logger.trace(error)
      }
    }
  }

  isNotice(receipt) {
    try {
      return receipt.logs.some((log) => log.topics[0] === SYNC_EVENT)
      && receipt.logs.some((log) => this.events.includes(log.topics[0]))
      && receipt.logs.some((log) => this._poolAddresses.includes(log.address));
    } catch (error) {
      this.logger.trace(error);
      return false
    }
  }

  async insertPoolPrice({ address, transactionHash, timestamp, token0Amount, token1Amount }) {
    const entity = this.database.poolPriceDao.entity({
      chainId: this.chainId.toString(),
      contract: address,
      transactionHash,
      timestamp,
      token0Amount,
      token1Amount,
    });

    return this.database.poolPriceDao.insertPoolPrice(entity);
  }

  async insertTransaction({
    transactionHash, type, callerAddress, poolContract, token0Contract, token1Contract,
    token0AmountIn, token0AmountOut, token1AmountIn, token1AmountOut, timestamp,
   }) {
    const entity = this.database.transactionHistoryDao.entity({
      chainId: this.chainId.toString(),
      transactionHash,
      type,
      callerAddress,
      poolContract,
      token0Contract,
      token1Contract,
      token0AmountIn,
      token0AmountOut,
      token1AmountIn,
      token1AmountOut,
      timestamp,
    })
    return this.database.transactionHistoryDao.insertTx(entity);
  }

  async updateBlockParsed(blockNumber) {
    const entity = await this.database.blockTimestampDao.findTimestamp(this.chainId.toString(), blockNumber);
    entity.isParsed = 1;
    await this.database.blockTimestampDao.updateBlockTimestamp(entity);
    return {};
  }
}

module.exports = CrawlerBase;
