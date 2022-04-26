import { useContext } from "react";
import StoreContext from "../store/store-context";

const TradingIframe = (props) => {
  const storeCtx = useContext(StoreContext);
  
  return (
    <iframe
      src={`/tradingview/index.html?symbol=${storeCtx.selectedTicker?.name}`}
      title="tradingview"
      style={{
        width: "100%",
        height: "100%",
      }}
    ></iframe>
  );
};

export default TradingIframe;
