const Codes = {
  SUCCESS: '00000000',

  // Config error
  CONFIG_MISSING_APIKEY: '03000000',

  // API error
  INVALID_INPUT_CHAIN_ID: '04000000',

  // Processing Error (Caught Exception) 05000000 - 05009999
  DB_ERROR: '05000000',
  RPC_ERROR: '05000001',

  // Uncaught Exception or Unknown Error 09000000
  UNKNOWN_ERROR: '09000000',
};

module.exports = Codes;
