const pjson = require('../../package.json');
const Codes = require('../constants/Codes');

class ResponseFormat extends Error {
  constructor({
    code = Codes.SUCCESS, message, payload = {},
  }) {
    super();

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
