import React, { useContext, useEffect, useState } from "react";
import { useViewport } from "../store/ViewportProvider";
import DesktopExchange from "./desktop-exchange";
import MobileExchange from "./mobile-exchange";
import Layout from "../components/Layout";
import StoreContext from "../store/store-context";

const Exchange = () => {
  const storeCtx = useContext(StoreContext);
  const [isStart, setIsStart] = useState(false);
  const { width } = useViewport();
  const breakpoint = 414;

  useEffect(() => {
    if (!isStart) {
      window.storeCtx = storeCtx;
      storeCtx.start();
      setIsStart(true);
    }

    // ++TODO never called
    return () => {
      // storeCtx.stop();
    };
  }, [isStart, storeCtx]);

  return (
    <Layout>
      {width <= breakpoint ? <MobileExchange /> : <DesktopExchange />}
    </Layout>
  );
};

export default Exchange;
