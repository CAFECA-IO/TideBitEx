import { useContext, useEffect, useState } from "react";
import StoreContext from "../store/store-context";

const TradingIframe = (props) => {
  const storeCtx = useContext(StoreContext);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (storeCtx.selectedTicker) {
      const { name, pricescale, source } = storeCtx.selectedTicker;
      const arr = [];
      if (name) arr.push(`symbol=${name}`);
      if (pricescale) arr.push(`pricescale=${pricescale}`);
      if (source) arr.push(`source=${source}`);
      if (props.isMobile) arr.push(`mobile=${1}`);
      const qs = !!arr.length ? `?${arr.join("&")}` : "";
      setQuery(qs);
    }
  }, [storeCtx.selectedTicker, props.isMobile]);

  return (
    <iframe
      id="tradingview"
      className="main-chart__chart"
      src={`/tradingview/index.html${query}`}
      title="tradingview"
    ></iframe>
  );
};

export default TradingIframe;
