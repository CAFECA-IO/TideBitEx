import React from "react";

const StoreContext = React.createContext({
  tickers: [],
  getTickers: async (instType, from, limit) => {},
  getBooks: async (instId, sz) => {},
  getTrades: async (instId, limit) => {},
  getCandles: async (instId, bar, after, before, limit) => {},
});

export default StoreContext;
