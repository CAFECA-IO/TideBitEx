const BigNumber = require("bignumber.js");

class SafeMath {
  static isNumber(str) {
    const numReg = /^(([1-9]\d*)|([0]{1}))(\.\d+)?$/;
    return numReg.test(str);
  }
  /**
   * check is hex number string
   * @param {string} str
   * @returns {boolean}
   */
  static isHex(str) {
    const reg = /^(0x)?[a-fA-F0-9]*$/;
    return reg.test(str);
  }

  /**
   * change string or number to bignumber
   * @param {string | number} input
   * @returns {BigNumber}
   */
  static toBn(input) {
    let bnInput;
    if (
      typeof input === "string" &&
      !SafeMath.isNumber(input) &&
      SafeMath.isHex(input)
    ) {
      bnInput = new BigNumber(input, 16);
    } else {
      bnInput = new BigNumber(input);
    }
    return bnInput;
  }

  static toSmallestUnitHex(amount, decimals) {
    const result = new BigNumber(amount)
      .multipliedBy(new BigNumber(10).pow(decimals))
      .toString(16);
    return result;
  }

  /**
   * a + b
   * @param {string | number} a
   * @param {string | number} b
   * @returns {string}
   */
  static plus(a, b) {
    const bnA = SafeMath.toBn(a);
    const bnB = SafeMath.toBn(b);
    return bnA.plus(bnB).toFixed();
  }

  /**
   * a - b
   * @param {string | number} a
   * @param {string | number} b
   * @returns {string}
   */
  static minus(a, b) {
    const bnA = SafeMath.toBn(a);
    const bnB = SafeMath.toBn(b);
    return bnA.minus(bnB).toFixed();
  }

  /**
   * a * b
   * @param {string | number} a
   * @param {string | number} b
   * @returns {string}
   */
  static mult(a, b) {
    const bnA = SafeMath.toBn(a);
    const bnB = SafeMath.toBn(b);
    return bnA.multipliedBy(bnB).toFixed();
  }

  /**
   * a / b
   * @param {string | number} a
   * @param {string | number} b
   * @returns {string}
   */
  static div(a, b) {
    const bnA = SafeMath.toBn(a);
    const bnB = SafeMath.toBn(b);
    return bnA.dividedBy(bnB).toFixed();
  }

  /**
   * a % b
   * @param {string | number} a
   * @param {string | number} b
   * @returns {string}
   */
  static mod(a, b) {
    const bnA = SafeMath.toBn(a);
    const bnB = SafeMath.toBn(b);
    return bnA.mod(bnB).toFixed();
  }

  /**
   * a == b
   * @param {string | number} a
   * @param {string | number} b
   * @returns {boolean}
   */
  static eq(a, b) {
    const bnA = SafeMath.toBn(a);
    const bnB = SafeMath.toBn(b);
    return bnA.eq(bnB);
  }

  /**
   * a > b
   * @param {string | number} a
   * @param {string | number} b
   * @returns {boolean}
   */
  static gt(a, b) {
    const bnA = SafeMath.toBn(a);
    const bnB = SafeMath.toBn(b);
    return bnA.gt(bnB);
  }

  /**
   * a >= b
   * @param {string | number} a
   * @param {string | number} b
   * @returns {boolean}
   */
  static gte(a, b) {
    const bnA = SafeMath.toBn(a);
    const bnB = SafeMath.toBn(b);
    return bnA.gte(bnB);
  }

  /**
   * a < b
   * @param {string | number} a
   * @param {string | number} b
   * @returns {boolean}
   */
  static lt(a, b) {
    const bnA = SafeMath.toBn(a);
    const bnB = SafeMath.toBn(b);
    return bnA.lt(bnB);
  }

  /**
   * a <= b
   * @param {string | number} a
   * @param {string | number} b
   * @returns {boolean}
   */
  static lte(a, b) {
    const bnA = SafeMath.toBn(a);
    const bnB = SafeMath.toBn(b);
    return bnA.lte(bnB);
  }

  /**
   * @override
   * according to currency decimal to transform amount to currency unit
   * @method toCurrencyUint
   * @param {string} amount
   * @param {Number} decimals
   * @returns {string}
   */
  static toCurrencyUint(amount, decimals) {
    const bnAmount = SafeMath.toBn(amount);
    const bnBase = SafeMath.toBn(10);
    const bnDecimal = bnBase.exponentiatedBy(decimals);
    const currencyUint = bnAmount.dividedBy(bnDecimal).toFixed();
    return currencyUint;
  }

  /**
   * @override
   * according to currency decimal to transform amount to currency unit
   * @method gweiToEth
   * @param {string} amount
   * @returns {string}
   */
  static gweiToEth(amount) {
    const bnAmount = SafeMath.toBn(amount);
    const bnBase = SafeMath.toBn(10);
    const bnDecimal = bnBase.exponentiatedBy(9);
    const currencyUint = bnAmount.dividedBy(bnDecimal).toFixed();
    return currencyUint;
  }

  /**
   * @override
   * according to currency decimal to transform amount to currency unit
   * @method weiToGwei
   * @param {string} amount
   * @returns {string}
   */
  static weiToGwei(amount) {
    const bnAmount = SafeMath.toBn(amount);
    const bnBase = SafeMath.toBn(10);
    const bnDecimal = bnBase.exponentiatedBy(9);
    const currencyUint = bnAmount.dividedBy(bnDecimal).toFixed();
    return currencyUint;
  }

  /**
   * @override
   * @method toSmallestUint
   * @param {string} amount
   * @param {Number} decimals
   * @returns {string}
   */
  static toSmallestUint(amount, decimals) {
    const bnAmount = SafeMath.toBn(amount);
    const bnBase = SafeMath.toBn(10);
    const bnDecimal = bnBase.exponentiatedBy(decimals);
    const smallestUint = bnAmount.multipliedBy(bnDecimal).toFixed();
    return smallestUint;
  }

  /**
   * @override
   * @method ethToGwei
   * @param {string} amount
   * @returns {string}
   */
  static ethToGwei(amount) {
    const bnAmount = SafeMath.toBn(amount);
    const bnBase = SafeMath.toBn(10);
    const bnDecimal = bnBase.exponentiatedBy(9);
    const smallestUint = bnAmount.multipliedBy(bnDecimal).toFixed();
    return smallestUint;
  }

  /**
   * @override
   * @method gweiToWei
   * @param {string} amount
   * @returns {string}
   */
  static gweiToWei(amount) {
    const bnAmount = SafeMath.toBn(amount);
    const bnBase = SafeMath.toBn(10);
    const bnDecimal = bnBase.exponentiatedBy(9);
    const smallestUint = bnAmount.multipliedBy(bnDecimal).toFixed();
    return smallestUint;
  }

  /**
   * compressedPubKey check number
   * @param {string} x
   * @param {string} y
   * @returns {boolean}
   */
  static compressedPubKeyCheck(x, y) {
    const bnP = SafeMath.toBn(
      "fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f"
    );

    const bnX = SafeMath.toBn(x);
    const bnY = SafeMath.toBn(y);

    const check = bnX
      .pow(new BigNumber(3))
      .plus(new BigNumber(7))
      .minus(bnY.pow(new BigNumber(2)))
      .mod(bnP);
    return check.isZero();
  }

  /**
   *
   * @param {string} x
   * @returns {string} hex number string
   */
  static toHex(x) {
    const bnX = SafeMath.toBn(x);
    return bnX.toString(16);
  }
}

module.exports = SafeMath;
