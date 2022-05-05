import React from "react";
import { useViewport } from "../store/ViewportProvider";
import DesktopExchange from "./desktop-exchange";
import MobileExchange from "./mobile-exchange";
import Layout from "../components/Layout";

const Exchange = () => {
  const { width } = useViewport();
  const breakpoint = 414;

  return (
    <Layout>
      {width <= breakpoint ? <MobileExchange /> : <DesktopExchange />}
    </Layout>
  );
};

export default Exchange;
