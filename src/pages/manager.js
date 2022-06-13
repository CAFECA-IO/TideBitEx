import React, { useState } from "react";
import Sidebar from "../components/AdminSidebar";
import AssetsOverview from "./assets-overview";
import CurrencySetting from "./currency-setting";
import Deposit from "./deposit";
import InfoSetting from "./info-setting";
import SubAccounts from "./sub-accounts";
import TickerSetting from "./ticker-setting";

const Manager = () => {
    const [activePage, setActivePage] = useState("ticker-setting");
    const onSelected = (page) => {
        setActivePage(page);
      };
  return <div className="screen manager">
    <Sidebar activePage={activePage} onSelected={onSelected} />
      {activePage === "ticker-setting" && <TickerSetting />}
      {activePage === "currency-setting" && <CurrencySetting />}
      {activePage === "deposit" && <Deposit />}
      {activePage === "sub-account" && <SubAccounts />}
      {activePage === "assets-overview" && <AssetsOverview />}
      {activePage === "info-setting" && <InfoSetting />}
  </div>;
};

export default Manager;
