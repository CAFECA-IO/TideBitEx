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
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [trades, setTrades] = useState(null);

  const fetchTrades = useCallback(
    async (selectedTicker) => {
      setSelectedTicker(selectedTicker);
      const trades = await storeCtx.getTrades(selectedTicker.instId);
      // console.log(`trades`, trades);
      setTrades(trades);
    },
    [storeCtx]
  );

  useEffect(() => {
    if (
      (!selectedTicker && props.selectedTicker) ||
      props.selectedTicker?.instId !== selectedTicker?.instId
    ) {
      fetchTrades(props.selectedTicker);
    }
    return () => {};
  }, [selectedTicker, props.selectedTicker, fetchTrades]);

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
                    selectedTicker ? selectedTicker.quoteCcy : "--"
                  })`}</th>
                  <th>{`Amount(${
                    selectedTicker ? selectedTicker.baseCcy : "--"
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
