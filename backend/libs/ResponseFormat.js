const pjson = require('../../package.json');
const Codes = require('../constants/Codes');

class ResponseFormat {
  constructor({
    code = Codes.SUCCESS, message, payload = {},
  }) {
    return {
      powerby: `TideBitEx api ${pjson.version}`,
      success: code === Codes.SUCCESS,
      code,
      message,
      payload,
    };
  }
}

module.exports = ResponseFormat;
