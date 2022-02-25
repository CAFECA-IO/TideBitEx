import React from "react";
import HistoryOrder from "../components/HistoryOrder";
import MarketHistory from "../components/MarketHistory";
import MarketNews from "../components/MarketNews";
import MarketPairs from "../components/MarketPairs";
import MarketTrade from "../components/MarketTrade";
import OrderBook from "../components/OrderBook";
import SelectedPair from "../components/SelectedPair";
import TradingChart from "../components/TradingChart";
import { ThemeConsumer } from "../context/ThemeContext";

const Exchange = (props) => {
  return (
    <main className="main">
      <SelectedPair />
      <div className="flex-row upper-part">
        <div className="left">
          <OrderBook />
        </div>
        <div className="right">
          <ThemeConsumer>
            {({ data }) => <TradingChart theme={data.theme} />}
          </ThemeConsumer>
        </div>
      </div>
      <div className="flex-row lower-part ">
        <div className="left">
          <MarketTrade />
        </div>
        <div className="right flex-row">
          <HistoryOrder />
          <MarketHistory />
        </div>
      </div>
    </main>
    // <div className="container-fluid no-fluid exchange-layout  mtb15">
    //   <div className="row sm-gutters">
    //     <div className="col-sm-12 col-md-3">
    //       <MarketPairs />
    //     </div>
    //     <div className="col-md-9">
    //       <SelectedPair />
    //       <div className="row sm-gutters">
    //         <div className="col-sm-12 col-md-8">
    //           <ThemeConsumer>
    //             {({ data }) => <TradingChart theme={data.theme} />}
    //           </ThemeConsumer>
    //           <MarketTrade />
    //         </div>
    //         <div className="col-md-4">
    //           <OrderBook />
    //           <MarketHistory />
    //         </div>
    //       </div>
    //     </div>
    //   </div>
    //   <div className="row sm-gutters">
    //     <div className="col-md-3">
    //       <MarketNews />
    //     </div>
    //     <div className="col-md-9">
    //       <HistoryOrder />
    //     </div>
    //   </div>
    // </div>
  );
};

export default Exchange;
