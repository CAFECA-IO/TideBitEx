import React, { useEffect, useCallback, useMemo, useState } from "react";
import Middleman from "../modal/Middleman";
import StoreContext from "./store-context";

const StoreProvider = (props) => {
  const middleman = useMemo(() => new Middleman(), []);
  const [tickers, setTickers] = useState([]);
  const [selectedTicker, setSelectedTicker] = useState(null);

  const selectTickerHandler = useCallback((ticker) => {
    // if (ticker?.instId !== selectedTicker?.instId) {
    setSelectedTicker(ticker);
    // }
  }, []);

  const getTickers = useCallback(
    async (instType = "SPOT", from = 0, limit = 100) => {
      try {
        const result = await middleman.getTickers(instType, from, limit);
          console.log(`getTickers result`, result);
        setTickers(result);
        if (selectedTicker === null) selectTickerHandler(result[0]);
      } catch (error) {
        console.log(`getTickers`, error);
      }
    },
    [middleman, selectTickerHandler, selectedTicker]
  );

  const getBooks = useCallback(
    async (instId, sz = 100) => {
      try {
        const result = await middleman.getBooks(instId, sz);
        return result;
      } catch (error) {
        console.log(`getBooks`, error);
      }
    },
    [middleman]
  );

  const getTrades = useCallback(
    async (instId, limit) => {
      try {
        const result = await middleman.getTrades(instId, limit);
        return result;
      } catch (error) {
        console.log(`getTrades`, error);
      }
    },
    [middleman]
  );

  const getCandles = useCallback(
    async (instId, bar, after, before, limit) => {
      try {
        const result = await middleman.getCandles(
          instId,
          bar,
          after,
          before,
          limit
        );
        return result;
      } catch (error) {
        console.log(`getCandles`, error);
      }
    },
    [middleman]
  );

  useEffect(() => {
    if (!tickers.length) {
      getTickers();
    }
  }, [tickers, getTickers]);

  return (
    <StoreContext.Provider
      value={{
        tickers,
        selectedTicker,
        selectTickerHandler,
        getTickers,
        getBooks,
        getTrades,
        getCandles,
      }}
    >
      {props.children}
    </StoreContext.Provider>
  );
};

export default StoreProvider;
