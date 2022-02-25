import React, { useContext } from "react";
import StoreContext from "../store/store-context";
import { Row, Col } from "react-bootstrap";
import SafeMath from "../utils/SafeMath";
import { formateDecimal } from "../utils/Utils";
const SelectedPair = (props) => {
  const storeCtx = useContext(StoreContext);
  return (
    <div className="pair">
      <Row>
        <Col md="auto">
          <div className="selectedPair">
            {storeCtx.selectedTicker?.pair || "--"}
          </div>
          {/* <div className="link">
            <a href="#">Bitcoin Price</a>
          </div> */}
        </Col>
        <Col md="auto">
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
        </Col>
        <Col md="auto">
          <Row>
            <Col md="auto">
              <div className="tickerItemLabel">24h Change</div>
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
                    ? `+${formateDecimal(
                        storeCtx.selectedTicker?.changePct,
                        3
                      )}%`
                    : `${formateDecimal(
                        storeCtx.selectedTicker?.changePct,
                        3
                      )}%`}
                </span>
              </div>
            </Col>
            <Col md="auto">
              <div className="tickerItemLabel">24h High</div>
              <div className="tickerPriceText">
                {formateDecimal(storeCtx.selectedTicker?.high24h, 8) || "--"}
              </div>
            </Col>
            <Col md="auto">
              <div className="tickerItemLabel">24h Low</div>
              <div className="tickerPriceText">
                {formateDecimal(storeCtx.selectedTicker?.low24h, 8) || "--"}
              </div>
            </Col>
            <Col md="auto">
              <div className="tickerItemLabel">
                24h Volume({storeCtx.selectedTicker?.baseCcy || "--"})
              </div>
              <div className="tickerPriceText">
                {!storeCtx.selectedTicker
                  ? "--"
                  : formateDecimal(storeCtx.selectedTicker?.volCcy24h, 8) ||
                    "--"}
              </div>
            </Col>
            <Col md="auto">
              <div className="tickerItemLabel">24h Volume</div>
              <div className="tickerPriceText">
                {!storeCtx.selectedTicker
                  ? "--"
                  : formateDecimal(storeCtx.selectedTicker?.vol24h, 8) || "--"}
              </div>
            </Col>
          </Row>
        </Col>
      </Row>
    </div>
  );
};

export default SelectedPair;
