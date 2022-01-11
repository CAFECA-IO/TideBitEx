import React from "react";

const StoreContext = React.createContext({
  tickers: [],
  getTickers: async () => {},
});

export default StoreContext;
