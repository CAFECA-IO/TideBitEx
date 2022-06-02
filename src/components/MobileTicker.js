import React, { useContext } from "react";
import StoreContext from "../store/store-context";
import SafeMath from "../utils/SafeMath";
import { formateDecimal } from "../utils/Utils";
import { useTranslation } from "react-i18next";

const MobileTicker = (props) => {
  const storeCtx = useContext(StoreContext);
  const { t } = useTranslation();
  return (
    <div className="mobile-ticker">
      <div className="mobile-ticker__container">
        <div className="mobile-ticker__price">
          {formateDecimal(storeCtx.selectedTicker?.last, { decimalLength: 2 })}
        </div>
        <div
          className={`mobile-ticker__change ${
            !storeCtx.selectedTicker
              ? ""
              : storeCtx.selectedTicker?.change?.includes("-")
              ? "decrease"
              : "increase"
          }`}
        >
          {!storeCtx.selectedTicker
            ? "-- %"
            : `${
                SafeMath.gte(props.ticker?.change, "0") ? "+" : "-"
              }${parseFloat(
                SafeMath.mult(props.ticker?.changePct, "100")
              ).toFixed(2)}%`}
        </div>
      </div>
      <div className="mobile-ticker__container">
        <div className="mobile-ticker__details">
          <div className="tickerItemLabel">{t("high")}:</div>
          <div className="tickerPriceText">
            {formateDecimal(storeCtx.selectedTicker?.high, {
              decimalLength: 2,
            })}
          </div>
        </div>
        <div className="mobile-ticker__details">
          <div className="tickerItemLabel">{t("low")}:</div>
          <div className="tickerPriceText">
            {formateDecimal(storeCtx.selectedTicker?.low, { decimalLength: 2 })}
          </div>
        </div>
        <div className="mobile-ticker__details">
          <div className="tickerItemLabel">{t("volume")}:</div>
          <div className="tickerPriceText">
            {`${
              !storeCtx.selectedTicker
                ? "--"
                : formateDecimal(storeCtx.selectedTicker?.volume, {
                    decimalLength: 2,
                  })
            }${storeCtx.selectedTicker?.base_unit?.toUpperCase() || "--"}`}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileTicker;
