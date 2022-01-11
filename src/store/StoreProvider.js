import React, { useEffect, useCallback, useMemo, useState } from "react";
import Middleman from "../modal/Middleman";
import StoreContext from "./store-context";

const StoreProvider = (props) => {
  const middleman = useMemo(() => new Middleman(), []);
  const [tickers, setTickers] = useState([]);

  const getTickers = useCallback(async () => {
    try {
      const result = await middleman.getTickers();
      setTickers(result);
    } catch (error) {
      console.log(`getTickers`, error);
    }
  }, [middleman]);

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
      }}
    >
      {props.children}
    </StoreContext.Provider>
  );
};

export default StoreProvider;
