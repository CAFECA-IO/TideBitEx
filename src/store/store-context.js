import React from "react";

const StoreContext = React.createContext({
  tickers: [],
  getTickers: async () => {},
  getBooks: async (instId) => {},
});

export default StoreContext;
