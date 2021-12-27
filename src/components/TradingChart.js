import React from 'react';
import TradingViewWidget, { Themes } from 'react-tradingview-widget';

export default function TradingChart() {
  return (
    <>
      <div className="main-chart mb15">
        <TradingViewWidget
          symbol="BTCUSDT"
          theme={Themes.LIGHT}
          locale="fr"
          autosize
          interval="1D"
          timezone="America/New_York"
          library_path="charting_library/"
        />
      </div>
    </>
  );
}
