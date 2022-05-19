import React, { useContext, useEffect } from "react";
import { useViewport } from "../store/ViewportProvider";
import DesktopExchange from "./desktop-exchange";
import MobileExchange from "./mobile-exchange";
import Layout from "../components/Layout";
import StoreContext from "../store/store-context";

const Exchange = () => {
  const storeCtx = useContext(StoreContext);
  const { width } = useViewport();
  const breakpoint = 414;

  useEffect(() => {
    storeCtx.start();

    return () => {
      storeCtx.stop();
    };
  }, [storeCtx]);

  return (
    <Layout>
      {width <= breakpoint ? <MobileExchange /> : <DesktopExchange />}
    </Layout>
  );
};

export default Exchange;
