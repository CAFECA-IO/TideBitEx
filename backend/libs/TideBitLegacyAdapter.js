const SafeMath = require('./SafeMath');
const FormData = require('form-data');

class TideBitLegacyAdapter {
  constructor({ config, database, logger }) {
    this.config = config;
    this.database = database;
    this.logger = logger;
    return this;
  }

  static peatioOrderBody({ header, body }) {
    const bodyFormData = new FormData();
    bodyFormData.append('utf8', true);
    // console.log('header!!!', header);
    bodyFormData.append('authenticity_token', header['X-CSRF-Token'] || header['X-CSRF-Token'.toLocaleLowerCase()]);

    if (body.side === 'buy') {
      bodyFormData.append('order_bid[ord_type]', body.ordType);
      bodyFormData.append('order_bid[origin_volume]', body.sz);
      if (body.ordType === 'limit') {
        bodyFormData.append('order_bid[price]', body.px);
        bodyFormData.append('order_bid[total', SafeMath.mult(body.px, body.sz));
      }
    } else if (body.side === 'sell') {
      bodyFormData.append('order_ask[ord_type]', body.ordType);
      bodyFormData.append('order_ask[origin_volume]', body.sz);
      if (body.ordType === 'limit') {
        bodyFormData.append('order_ask[price]', body.px);
        bodyFormData.append('order_ask[total', SafeMath.mult(body.px, body.sz));
      }
    }

    return bodyFormData;
  }
}
module.exports = TideBitLegacyAdapter;
