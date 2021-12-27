const keccak256 = require('keccak256');
const BigNumber = require('bignumber.js');

class smartContract {
  static removeStartWith(str1, str2) {
    let result;
    try {
      if(str1.startsWith(str2)) {
        result = str1.substr(str2.length);
      }
    }
    catch(e) {
      result = str1;
    }
    return result;
  }
  static startWith(str1, str2) {
    let result;
    try {
      if(!str1.startsWith(str2)) {
        result = str2.concat(str1);
      }
    }
    catch(e) {
      result = str1;
    }
    return result;
  }

  static chunkSubstr(str, size) {
    const numChunks = Math.ceil(str.length / size);
    const chunks = new Array(numChunks);
    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
      chunks[i] = str.substr(o, size);
    }
  
    return chunks;
  }

  static stringToHex(data) {
    let seed;
    let arr = [];
    let sqr = 1;
    let result;
    if(typeof data == 'string') {
      seed = data;
      for(let i = 0; i < seed.length; i++) {
        let code = seed.charCodeAt(i) + 1;
        let tmpSqr = Math.ceil(Math.log(code) / Math.log(256));
        sqr = tmpSqr > sqr ? tmpSqr : sqr;
        arr[i] = seed.charCodeAt(i).toString(16).padStart(tmpSqr * 2, '0');
      }
      arr = arr.map((v) => v.padStart(sqr * 2, '0'));
      result = arr.join('');
    } else {
      try {
        result = data.toString(16);
      } catch(e) {
        result = '';
      }
    }

    return result;
  }

  static isHex(data) {
    return /^0x[a-fA-F0-9]*$/.test(data);
  }

  static toHex(data) {
    let result;
    if(data == undefined) {
      result = '';
    }
    else if(this.isHex(data)) {
      result = data.substr(2);
    }
    else if(Number.isInteger(data)) {
      result = data.toString(16);
    }
    else if(typeof data == 'string') {
      result = this.stringToHex(data);
    } else {
      try {
        result = data.toString(16);
      }
      catch(e) {
        result = '';
      }
    }
    return result;
  }

  static leftPad32(str) {
    let result = '';
    let arr;
    let length = 32 * 2;
    if(typeof str == 'string') {
      result = str.padStart(length, '0');
    } else {
      try {
        result = str.toString(16).padStart(length, '0');
      }
      catch(e) {
        result = new Array(length).fill(0).join('');
      }
    }
    return result;
  }

  static parseString(data, length) {
    let seed = data;
    if(seed.indexOf('0x') == '0') {
      seed = seed.substr(2);
    }
    if(length > 0) {
      seed = seed.substr(0, length * 2);
    }

    let result = '';
    try {
      const arr = seed.match(/.{1,2}/g);
      result = decodeURIComponent('%' + arr.join('%'));
    }
    catch(e) {}
    return result;
  }

  static parseHexRLP(data) {
    let seed = data;
    let chunks;
    let result;
    if(seed.indexOf('0x') == '0') {
      seed = seed.substr(2);
    }
  
    if(seed.length > 64) {
      chunks = this.chunkSubstr(seed, 64);
    } else {
      chunks = [seed];
    }

    result = chunks;
    return result;
  }

  static toSmallestUnitHex({ amount, decimals }) {
    const result = new BigNumber(amount)
      .multipliedBy(new BigNumber(10).pow(decimals))
      .toString(16);
    return result;
  }

  static toContractData({ func, params }) {
    if(!func) {
      return '0x'
    }
    const funcSeed = typeof func == 'string' ?
      func :
      func.toString();
    const dataSeed = Array.isArray(params) ?
      params.map((v) => {
        return this.leftPad32(this.toHex(v))
      }) :
      [this.leftPad32(this.toHex(params))];
    const result = '0x'
      .concat(this.encodeFunction(funcSeed).substr(0, 8))
      .concat(dataSeed.join(''));
    return result;
  }

  static encodeFunction(funcSeed) {
    return keccak256(funcSeed).toString('hex');
  }

  static isEthereumAddress(addr) {
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  }
}

module.exports = smartContract;