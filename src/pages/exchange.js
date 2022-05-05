import React from "react";
import { useViewport } from "../store/ViewportProvider";
import DesktopExchange from "./desktop-exchange";
import MobileExchange from "./mobile-exchange";

const Exchange = () => {
  const { width } = useViewport();
  const breakpoint = 414;
  return width <= breakpoint ? <MobileExchange /> : <DesktopExchange />;
};

export default Exchange;
