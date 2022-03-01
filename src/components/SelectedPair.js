import React, { useContext } from "react";
import StoreContext from "../store/store-context";
import SafeMath from "../utils/SafeMath";
import { formateDecimal } from "../utils/Utils";
import MarketPairs from "./MarketPairs";
import { useTranslation } from "react-i18next";

const SelectedPair = (props) => {
  const storeCtx = useContext(StoreContext);
  const { t } = useTranslation();
  return (
    <div className="pair">
      <div className="pair__button">
        <div className="selectedPair">
          {storeCtx.selectedTicker?.pair || "--"}
        </div>
        <MarketPairs />
      </div>
      <div className="pair__details">
        <div
          className={`showPrice ${
            !storeCtx.selectedTicker
              ? ""
              : storeCtx.selectedTicker?.change.includes("-")
              ? "decrease"
              : "increase"
          }`}
        >
          {formateDecimal(storeCtx.selectedTicker?.last, 8) || "--"}
        </div>
        <div className="subPrice">
          ${formateDecimal(storeCtx.selectedTicker?.last, 8) || "--"}
        </div>
      </div>
      <div className="pair__details">
        <div className="tickerItemLabel">{t("24_change")}</div>
        <div
          className={`tickerPriceText ${
            !storeCtx.selectedTicker
              ? ""
              : storeCtx.selectedTicker?.change.includes("-")
              ? "decrease"
              : "increase"
          }`}
        >
          <span>
            {!storeCtx.selectedTicker
              ? "--"
              : formateDecimal(
                  SafeMath.minus(storeCtx.selectedTicker?.change, "100"),
                  3
                )}{" "}
            {!storeCtx.selectedTicker
              ? "--%"
              : SafeMath.gt(storeCtx.selectedTicker?.change, "0")
              ? `+${formateDecimal(storeCtx.selectedTicker?.changePct, 3)}%`
              : `${formateDecimal(storeCtx.selectedTicker?.changePct, 3)}%`}
          </span>
        </div>
      </div>
      <div className="pair__details">
        <div className="tickerItemLabel">{t("24_high")}</div>
        <div className="tickerPriceText">
          {formateDecimal(storeCtx.selectedTicker?.high24h, 8) || "--"}
        </div>
      </div>
      <div className="pair__details">
        <div className="tickerItemLabel">{t("24_low")}</div>
        <div className="tickerPriceText">
          {formateDecimal(storeCtx.selectedTicker?.low24h, 8) || "--"}
        </div>
      </div>
      <div className="pair__details">
        <div className="tickerItemLabel">
          {`${t("24_volume")}(${storeCtx.selectedTicker?.baseCcy || "--"})`}
        </div>
        <div className="tickerPriceText">
          {!storeCtx.selectedTicker
            ? "--"
            : formateDecimal(storeCtx.selectedTicker?.volCcy24h, 8) || "--"}
        </div>
      </div>
      <div className="pair__details">
        <div className="tickerItemLabel">{`${t("24_volume_quote")}(${storeCtx.selectedTicker?.quoteCcy || "--"})`}</div>
        <div className="tickerPriceText">
          {!storeCtx.selectedTicker
            ? "--"
            : formateDecimal(storeCtx.selectedTicker?.vol24h, 8) || "--"}
        </div>
      </div>
    </div>
  );
};

export default SelectedPair;
