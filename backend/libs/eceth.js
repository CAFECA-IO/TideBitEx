const Url = require('url');
const Dvalue = require('dvalue');
const Ecrequest = require('ecrequest');
const BigNumber = require('bignumber.js');

const SmartContract = require('./smartContract');

class Eceth {
  static async request({ method, params, debug } = {}, server = 'https://ethereum.tidewallet.io/') {
    const { protocol, host, path } = Url.parse(server);
    const requestData = {
      protocol,
      host,
      path,
      headers: { 'content-type': 'application/json' },
      data: {
        id: Dvalue.randomID(),
        jsonrpc: "2.0",
        method,
        params
      }
    }
    const raw = await Ecrequest.post(requestData);
    if(debug) {
      console.log(params);
      console.log(raw.data.toString());
    }
    const result = JSON.parse(raw.data);
    return result;
  }

  static async getData({ contract, func, params, pending, dataType, debug, server }) {
    if(!SmartContract.isEthereumAddress(contract)) {
      throw new Error(`Invalid contract address: ${contract}`);
    }
    let result;
    try {
      const data = SmartContract.toContractData({ func, params });
      const method = 'eth_call';
      const requestParams = {
        to: contract,
        data
      }
      const version = !!pending ? "pending" : "latest";
      const res = await this.request({ method, params: [requestParams, version], debug }, server)
      const raw = SmartContract.removeStartWith(
        res.result,
        '0x'
      );
      result = this.parseData({ data: raw, dataType });
      if(debug) console.log(contract, func, data, '=', result);
    }
    catch(e) {
      console.trace(e);
    }
    return result;
  }

  static parseData({ data, dataType }) {
    let result;
    try {
      const chunks = SmartContract.chunkSubstr(data, 64);
      let pointer = 0;
      result = dataType.map((v, i, arr) => {
        if(!chunks[pointer]) return;
        const isArray = v.endsWith('[]');
        if(isArray) {
          const arrayLength = parseInt(chunks[pointer++], 16) / 32;
          const splitChunks = new Array(arrayLength).fill(0).map((vv, ii) => {
            return chunks[pointer++];
          });
          return splitChunks;
        }

        const type = v.toLowerCase();
        let r;
        switch(type) {
          case 'address':
            r = `0x${chunks[pointer++].substr(-40)}`;
            break;
          case 'string':
            const bytesLength = parseInt(chunks[pointer++], 16) / 32;
            const strLength = parseInt(chunks[pointer++], 16);
            const strChunks = new Array(bytesLength).fill(0).map((vv, ii) => {
              return chunks[pointer++];
            });
            r = SmartContract.parseString(strChunks.join(''), strLength);
            break;
          case 'uint256':
          case 'uint112':
            r = new BigNumber(`0x${chunks[pointer++]}`).toFixed();
            break;
          case 'uint32':
          case 'uint8':
            r = parseInt(`0x${chunks[pointer++]}`);
            break;
          default:
            r = `0x${chunks[pointer++]}`;
        }
        return r;
      }, [])
    }
    catch(e) {
      // console.trace(e);
      result = data;
    }
    return result;
  }

  static async getBlockNumber({ debug, server }) {
    let result;
    try {
      const method = 'eth_blockNumber';
      const res = await this.request({ method, params: [], debug }, server)
      result = res.result;
      if(debug) console.log('block number =', result);
    }
    catch(e) {
      console.trace(e);
    }
    return result;
  }

  static async getBlockByNumber({ debug, blockNumber, server }) {
    let result;
    try {
      let hexNum = blockNumber;
      if (blockNumber !== 'pending' || 'latest') {
        hexNum = `0x${SmartContract.toHex(blockNumber)}`;
      }
      const method = 'eth_getBlockByNumber';
      const res = await this.request({ method, params: [hexNum, true], debug }, server);
      result = res.result;

      if(debug) console.log('block data =', result);
    }
    catch(e) {
      console.trace(e);
    }
    return result;
  }

  static async getReceipt({ debug, txHash, server }) {
    let result;
    try {
      const method = 'eth_getTransactionReceipt';
      const res = await this.request({ method, params: [txHash], debug }, server);
      result = res.result;

      if(debug) console.log(txHash, 'receipt =', result);
    }
    catch(e) {
      console.trace(e);
    }
    return result;
  }
}

module.exports = Eceth;