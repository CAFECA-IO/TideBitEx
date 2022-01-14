import React, { useEffect, useContext, useState, useCallback } from "react";
import { Tabs, Tab } from "react-bootstrap";
import StoreContext from "../store/store-context";
import { dateFormatter, formateDecimal } from "../utils/Utils";

const TradeTile = (props) => {
  return (
    <tr>
      <td>{dateFormatter(parseInt(props.trade.ts)).time}</td>
      <td className={props.trade.side === "buy" ? "red" : "green"}>
        {formateDecimal(props.trade.px, 8)}
      </td>
      <td>{formateDecimal(props.trade.sz, 8)}</td>
    </tr>
  );
};

const MarketHistory = (props) => {
  const storeCtx = useContext(StoreContext);
  const [trades, setTrades] = useState(null);

  const fetchTrades = useCallback(
    async (selectedTicker) => {
      const trades = await storeCtx.getTrades(selectedTicker.instId);
      // console.log(`trades`, trades);
      setTrades(trades);
    },
    [storeCtx]
  );

  useEffect(() => {
    if (storeCtx?.selectedTicker) {
      fetchTrades(storeCtx.selectedTicker);
    }
    return () => {};
  }, [storeCtx?.selectedTicker, fetchTrades]);

  return (
    <>
      <div className="market-history">
        <Tabs defaultActiveKey="recent-trades">
          <Tab eventKey="recent-trades" title="Recent Trades">
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>{`Price(${
                    storeCtx?.selectedTicker?.quoteCcy || "--"
                  })`}</th>
                  <th>{`Amount(${
                    storeCtx?.selectedTicker?.baseCcy || "--"
                  })`}</th>
                </tr>
              </thead>
              <tbody>
                {trades &&
                  trades.map((trade) => (
                    <TradeTile
                      trade={trade}
                      key={`${trade.instId}-${trade.tradeId}`}
                    />
                  ))}
              </tbody>
            </table>
          </Tab>
        </Tabs>
      </div>
    </>
  );
};
export default MarketHistory;
