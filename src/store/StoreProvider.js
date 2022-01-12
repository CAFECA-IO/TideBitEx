import React, { useEffect, useCallback, useMemo, useState } from "react";
import Middleman from "../modal/Middleman";
import StoreContext from "./store-context";

const StoreProvider = (props) => {
  const middleman = useMemo(() => new Middleman(), []);
  const [tickers, setTickers] = useState([]);

  const getTickers = useCallback(async () => {
    try {
      const result = await middleman.getTickers();
      //   console.log(`getTickers result`, result);
      setTickers(result);
    } catch (error) {
      console.log(`getTickers`, error);
    }
  }, [middleman]);

  const getBooks = useCallback(
    async (instId) => {
      try {
        const result = await middleman.getBooks(instId);
        return result;
      } catch (error) {
        console.log(`getBooks`, error);
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
        getTickers,
        getBooks,
      }}
    >
      {props.children}
    </StoreContext.Provider>
  );
};

export default StoreProvider;
