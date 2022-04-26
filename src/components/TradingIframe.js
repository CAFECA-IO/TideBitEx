const TradingIframe = () => {
  return (
    <iframe
      src={`${window.location.host}/tradingview/index.html`}
      title="tradingview"
    ></iframe>
  );
};

export default TradingIframe;
