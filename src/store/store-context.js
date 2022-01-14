import React from "react";

const StoreContext = React.createContext({
  selectedTicker: null,
  tickers: [],
  selectTickerHandler: (ticker)=>{},
  getTickers: async (instType, from, limit) => {},
  getBooks: async (instId, sz) => {},
  getTrades: async (instId, limit) => {},
  getCandles: async (instId, bar, after, before, limit) => {},
});

export default StoreContext;
