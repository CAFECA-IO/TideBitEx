import React, {
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import StoreContext from "../store/store-context";
import { Tabs, Tab, Nav } from "react-bootstrap";
import { formateDecimal } from "../utils/Utils";
import SafeMath from "../utils/SafeMath";
import { useTranslation } from "react-i18next";
import { useViewport } from "../store/ViewportProvider";
import CustomKeyboard from "./CustomKeyboard";

const TradeForm = (props) => {
  const { t } = useTranslation();
  const storeCtx = useContext(StoreContext);
  const inputPrice = useRef();
  const inputAmount = useRef();
  const [tdMode, setTdMode] = useState("cash");
  const [price, setPrice] = useState(null);
  const [volume, setVolume] = useState(null);
  const [selectedPct, setSelectedPct] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const formatPrice = useCallback(
    (value) => {
      let precision,
        arr = storeCtx.selectedTicker?.tickSz.split(".");
      if (arr.length > 1) precision = arr[1].length;
      else precision = 0;
      let _value = +value < 0 ? "0" : value;
      let price,
        vArr = _value.toString().split(".");
      if (
        _value.toString().length > 2 &&
        _value.toString().startsWith("0") &&
        !_value.includes(".")
      ) {
        _value = _value.substring(1);
      }
      if (vArr.length > 1 && vArr[1].length > precision) {
        price = parseFloat(_value).toFixed(precision);
        setErrorMessage(
          `Price precision is ${storeCtx.selectedTicker?.tickSz}`
        );
      } else price = _value;
      setPrice(price);
      if (SafeMath.lt(price, storeCtx.selectedTicker?.tickSz))
        setErrorMessage(
          `Minimum order price is ${storeCtx.selectedTicker?.tickSz}`
        );
      else setErrorMessage(null);
    },
    [storeCtx.selectedTicker?.tickSz]
  );

  const formatSize = useCallback(
    (value) => {
      let precision,
        arr = storeCtx.selectedTicker?.lotSz.split("."),
        _price =
          props.orderType === "market" ? storeCtx.selectedTicker?.last : price;
      if (arr.length > 1) precision = arr[1].length;
      else precision = 0;
      let _value = +value < 0 ? "0" : value;
      let size,
        vArr = _value.split(".");
      if (
        _value.toString().length > 2 &&
        _value.toString().startsWith("0") &&
        !_value.includes(".")
      ) {
        _value = _value.substring(1);
      }
      if (vArr.length > 1 && vArr[1].length > precision) {
        size = parseFloat(_value).toFixed(precision);
        setErrorMessage(
          `Amount precision is ${storeCtx.selectedTicker?.lotSz}`
        );
      } else size = _value;
      setVolume(size);
      if (SafeMath.lt(size, storeCtx.selectedTicker?.minSz))
        setErrorMessage(`Minimum amount is ${storeCtx.selectedTicker?.minSz}`);
      else if (SafeMath.gt(size, storeCtx.selectedTicker?.maxSz))
        setErrorMessage(`Maximum amount is ${storeCtx.selectedTicker?.maxSz}`);
      else if (
        SafeMath.gt(
          props.kind === "bid" ? SafeMath.mult(_price, size) : size,
          props.quoteCcyAvailable
        )
      )
        setErrorMessage(
          `Available ${storeCtx.selectedTicker?.quote_unit?.toUpperCase()} is not enough`
        );
      else setErrorMessage(null);
    },
    [
      price,
      props.kind,
      props.orderType,
      props.quoteCcyAvailable,
      storeCtx.selectedTicker?.last,
      storeCtx.selectedTicker?.lotSz,
      storeCtx.selectedTicker?.maxSz,
      storeCtx.selectedTicker?.minSz,
      storeCtx.selectedTicker?.quote_unit,
    ]
  );

  const onSubmit = async (event, kind) => {
    event.preventDefault();
    if (!storeCtx.selectedTicker) return;
    const order = {
      instId: storeCtx.selectedTicker.instId,
      tdMode,
      kind,
      ordType: props.orderType,
      price:
        props.orderType === "limit" ? price : storeCtx.selectedTicker?.last,
      volume,
      market: storeCtx.selectedTicker.market,
    };

    const confirm = window.confirm(`You are going to
          ${order.kind} ${order.volume} ${order.instId.split("-")[0]}
          ${order.kind === "bid" ? "with" : "for"} ${SafeMath.mult(
      props.orderType === "market" ? storeCtx.selectedTicker.last : order.price,
      order.volume
    )} ${order.instId.split("-")[1]}
          with price ${
            props.orderType === "market"
              ? storeCtx.selectedTicker.last
              : order.price
          } ${order.instId.split("-")[1]} per ${order.instId.split("-")[0]}`);
    if (confirm) {
      await storeCtx.postOrder(order);
      props.setRefresh(true);
    }
    setVolume("");
    setSelectedPct(null);
  };

  return (
    <form
      onSubmit={(e) => {
        onSubmit(e, props.kind);
      }}
      className={`market-trade__form ${
        props.kind === "bid" ? "market-trade--buy" : "market-trade--sell"
      }`}
    >
      <p className="market-trade__text">
        {t("available")}:
        <span>
          {props.quoteCcyAvailable || props.baseCcyAvailable
            ? formateDecimal(
                props.kind === "bid"
                  ? props.quoteCcyAvailable
                  : props.baseCcyAvailable,
                { decimalLength: 8 }
              )
            : "--"}
          {props.kind === "bid"
            ? storeCtx.selectedTicker?.quote_unit?.toUpperCase() || "--"
            : storeCtx.selectedTicker?.base_unit?.toUpperCase() || "--"}
          {/* = 0 USD */}
        </span>
      </p>
      <div className="market-trade__input-group input-group">
        <label htmlFor="price">{t("price")}:</label>
        <div className="market-trade__input-group--box">
          <input
            inputMode={props.isMobile ? "none" : "numeric"}
            name="price"
            type={props.isMobile ? null : props.readyOnly ? "text" : "number"}
            className="market-trade__input form-control"
            // placeholder={t("price")}
            value={props.readyOnly ? t("market") : price}
            onClick={() => {
              if (props.isMobile) {
                storeCtx.setFocusEl(inputPrice);
              }
            }}
            onChange={(e) => {
              // props.onPxInput(e.target.value);
              formatPrice(e.target.value);
            }}
            required={!props.readyOnly}
            disabled={!!props.readyOnly}
            step={storeCtx.selectedTicker?.tickSz}
          />
          {!props.readyOnly && (
            <div className="market-trade__input-group--append input-group-append">
              <span className="input-group-text">
                {storeCtx.selectedTicker?.quote_unit?.toUpperCase() || "--"}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="market-trade__input-group input-group">
        <label htmlFor="trade_amount">{t("trade_amount")}:</label>
        <div className="market-trade__input-group--box">
          <input
            inputMode={props.isMobile ? "none" : "numeric"}
            name="trade_amount"
            type={props.isMobile ? null : "number"}
            className="market-trade__input form-control"
            // placeholder={t("trade_amount")}
            value={volume}
            onClick={() => {
              if (props.isMobile) {
                storeCtx.setFocusEl(inputAmount);
              }
            }}
            onChange={(e) => {
              // props.onSzInput(e.target.value);
              formatSize(e.target.value);
            }}
            step={storeCtx.selectedTicker?.lotSz}
            required
          />
          <div className="market-trade__input-group--append input-group-append">
            <span className="input-group-text">
              {storeCtx.selectedTicker?.base_unit?.toUpperCase() || "--"}
            </span>
          </div>
        </div>
      </div>

      <div className="market-trade__input-group input-group">
        <label htmlFor="trade_amount">{t("trade_total")}:</label>
        <div className="market-trade__input-group--box">
          <input
            name="trade_total"
            type="number"
            className="market-trade__input  form-control"
            // placeholder={t("trade_total")}
            value={
              props.orderType === "market"
                ? storeCtx.selectedTicker?.last
                : price && volume
                ? SafeMath.mult(
                    props.orderType === "market"
                      ? storeCtx.selectedTicker?.last
                      : price,
                    volume
                  )
                : null
            }
            readOnly
          />
          <div className="market-trade__input-group--append input-group-append">
            <span className="input-group-text">
              {storeCtx.selectedTicker?.quote_unit?.toUpperCase() || "--"}
            </span>
          </div>
        </div>
      </div>
      <div className="market-trade__error-message--container">
        <p
          className={`market-trade__error-message ${
            errorMessage ? "show" : ""
          }`}
        >
          {errorMessage}
        </p>
        )
      </div>
      <ul className="market-trade__amount-controller">
        <li className={`${selectedPct === "0.25" ? "active" : ""}`}>
          <span
            onClick={() => {
              formatSize(
                formateDecimal(SafeMath.mult("0.25", props.baseCcyAvailable), {
                  decimalLength: storeCtx?.lotSz ? storeCtx?.lotSz : "0",
                })
              );
            }}
          >
            25%
          </span>
        </li>
        <li className={`${selectedPct === "0.5" ? "active" : ""}`}>
          <span
            onClick={() => {
              formatSize(
                formateDecimal(SafeMath.mult("0.5", props.baseCcyAvailable), {
                  decimalLength: storeCtx?.lotSz ? storeCtx?.lotSz : "0",
                })
              );
            }}
          >
            50%
          </span>
        </li>
        <li className={`${selectedPct === "0.75" ? "active" : ""}`}>
          <span
            onClick={() => {
              formatSize(
                formateDecimal(SafeMath.mult("0.75", props.baseCcyAvailable), {
                  decimalLength: storeCtx?.lotSz ? storeCtx?.lotSz : "0",
                })
              );
            }}
          >
            75%
          </span>
        </li>
        <li className={`${selectedPct === "1.0" ? "active" : ""}`}>
          <span
            onClick={() => {
              formatSize(
                formateDecimal(SafeMath.mult("1", props.baseCcyAvailable), {
                  decimalLength: storeCtx?.lotSz ? storeCtx?.lotSz : "0",
                })
              );
            }}
          >
            100%
          </span>
        </li>
      </ul>
      <div style={{ flex: "auto" }}></div>
      {storeCtx.focusEl && (
        <CustomKeyboard
          inputEl={storeCtx.focusEl}
          onInput={(v) => {
            if (storeCtx.focusEl === inputPrice) {
              // props.onPxInput(v);
              formatPrice(v);
            }
            if (storeCtx.focusEl === inputAmount) {
              // props.onSzInput(v);
              formatSize(v);
            }
          }}
        />
      )}
      <button
        type="submit"
        className="btn market-trade__button"
        disabled={
          !props.quoteCcyAvailable ||
          !props.baseCcyAvailable ||
          !storeCtx.selectedTicker ||
          SafeMath.gt(
            volume,
            props.kind === "bid"
              ? SafeMath.div(
                  props.quoteCcyAvailable,
                  props.orderType === "market"
                    ? storeCtx.selectedTicker?.last
                    : price
                )
              : props.baseCcyAvailable
          ) ||
          SafeMath.lte(volume, "0") ||
          SafeMath.lt(volume, storeCtx.selectedTicker?.minSz) ||
          SafeMath.lt(
            props.orderType === "market" ? storeCtx.selectedTicker.last : price,
            storeCtx.selectedTicker?.tickSz
          ) ||
          SafeMath.gt(
            volume,
            props.orderType === "market"
              ? storeCtx.selectedTicker?.maxMktSz
              : props.orderType === "limit"
              ? storeCtx.selectedTicker?.maxLmtSz
              : "99999"
          )
        }
      >
        {props.kind === "bid" ? t("buy") : t("sell")}
        {` ${storeCtx.selectedTicker?.base_unit?.toUpperCase() ?? ""}`}
      </button>
    </form>
  );
};

const TradePannel = (props) => {
  const { width } = useViewport();
  const breakpoint = 414;
  const storeCtx = useContext(StoreContext);
  const [limitBuyPx, setLimitBuyPx] = useState(null);
  const [limitSellPx, setLimitSellPx] = useState(null);
  const [marketBuySz, setMarketBuySz] = useState(null);
  const [marketSellSz, setMarketSellSz] = useState(null);
  const [limitBuySz, setLimitBuySz] = useState(null);
  const [limitSellSz, setLimitSellSz] = useState(null);
  const [tdMode, setTdMode] = useState("cash");
  const [selectedLimitSellPct, setSelectedLimitSellPct] = useState(null);
  const [selectedMarketBuyPct, setSelectedMarketBuyPct] = useState(null);
  const [selectedLimitBuyPct, setSelectedLimitBuyPct] = useState(null);
  const [selectedMarketSellPct, setSelectedMarketSellPct] = useState(null);
  const [buyErrorMessage, setBuyErrorMessage] = useState(null);
  const [sellErrorMessage, setSellErrorMessage] = useState(null);
  const { t } = useTranslation();

  const formatPrice = useCallback((value, tickSz, setPrice, setErrMsg) => {
    let precision,
      arr = tickSz.split(".");
    if (arr.length > 1) precision = arr[1].length;
    else precision = 0;
    let _value = +value < 0 ? "0" : value;
    let price,
      vArr = _value.toString().split(".");
    if (
      _value.toString().length > 2 &&
      _value.toString().startsWith("0") &&
      !_value.includes(".")
    ) {
      _value = _value.substring(1);
    }
    if (vArr.length > 1 && vArr[1].length > precision) {
      price = parseFloat(_value).toFixed(precision);
      setErrMsg(`Price precision is ${tickSz}`);
    } else price = _value;
    setPrice(price);
    if (SafeMath.lt(price, tickSz))
      setErrMsg(`Minimum order price is ${tickSz}`);
    else setErrMsg(null);
  }, []);

  const limitBuyPxHandler = useCallback(
    (value) => {
      formatPrice(
        value,
        storeCtx.selectedTicker?.tickSz,
        setLimitBuyPx,
        setBuyErrorMessage
      );
    },
    [formatPrice, storeCtx.selectedTicker?.tickSz]
  );

  const limitSellPxHandler = useCallback(
    (value) => {
      formatPrice(
        value,
        storeCtx.selectedTicker?.tickSz,
        setLimitSellPx,
        setSellErrorMessage
      );
    },
    [formatPrice, storeCtx.selectedTicker?.tickSz]
  );

  const formatBuySize = useCallback(
    (
      value,
      price,
      available,
      currency,
      minSz,
      maxSz,
      lotSz,
      setSize,
      setErrMsg
    ) => {
      let precision,
        arr = lotSz.split(".");
      if (arr.length > 1) precision = arr[1].length;
      else precision = 0;
      let _value = +value < 0 ? "0" : value;
      let size,
        vArr = _value.split(".");
      if (
        _value.toString().length > 2 &&
        _value.toString().startsWith("0") &&
        !_value.includes(".")
      ) {
        _value = _value.substring(1);
      }
      if (vArr.length > 1 && vArr[1].length > precision) {
        size = parseFloat(_value).toFixed(precision);
        setErrMsg(`Amount precision is ${lotSz}`);
      } else size = _value;
      setSize(size);
      if (SafeMath.lt(size, minSz)) setErrMsg(`Minimum amount is ${minSz}`);
      else if (SafeMath.gt(size, maxSz))
        setErrMsg(`Maximum amount is ${maxSz}`);
      else if (SafeMath.gt(SafeMath.mult(price, size), available))
        setErrMsg(`Available ${currency} is not enough`);
      else setErrMsg(null);
    },
    []
  );

  const buySzHandler = useCallback(
    (orderType, value) => {
      switch (orderType) {
        case "market":
          formatBuySize(
            value,
            storeCtx.selectedTicker?.last,
            props.quoteCcyAvailable,
            storeCtx.selectedTicker?.quote_unit?.toUpperCase(),
            storeCtx.selectedTicker?.minSz,
            storeCtx.selectedTicker?.maxMktSz,
            storeCtx.selectedTicker?.lotSz,
            setMarketBuySz,
            setBuyErrorMessage
          );
          break;
        case "limit":
          formatBuySize(
            value,
            limitBuyPx,
            props.quoteCcyAvailable,
            storeCtx.selectedTicker?.quote_unit?.toUpperCase(),
            storeCtx.selectedTicker?.minSz,
            storeCtx.selectedTicker?.maxLmtSz,
            storeCtx.selectedTicker?.lotSz,
            setLimitBuySz,
            setBuyErrorMessage
          );
          break;
        default:
          break;
      }
    },
    [
      formatBuySize,
      storeCtx.selectedTicker?.last,
      storeCtx.selectedTicker?.quote_unit,
      storeCtx.selectedTicker?.minSz,
      storeCtx.selectedTicker?.maxMktSz,
      storeCtx.selectedTicker?.lotSz,
      storeCtx.selectedTicker?.maxLmtSz,
      props.quoteCcyAvailable,
      limitBuyPx,
    ]
  );

  const formatSellSize = useCallback(
    (value, available, currency, minSz, maxSz, lotSz, setSize, setErrMsg) => {
      let precision,
        arr = lotSz.split(".");
      if (arr.length > 1) precision = arr[1].length;
      else precision = 0;
      let _value = +value < 0 ? "0" : value;
      let size,
        vArr = _value.split(".");
      if (
        _value.toString().length > 2 &&
        _value.toString().startsWith("0") &&
        !_value.includes(".")
      ) {
        _value = _value.substring(1);
      }
      if (vArr.length > 1 && vArr[1].length > precision) {
        size = parseFloat(_value).toFixed(precision);
        setErrMsg(`Amount precision is ${lotSz}`);
      } else size = _value;
      setSize(size);
      if (SafeMath.lt(size, minSz)) setErrMsg(`Minimum amount is ${minSz}`);
      else if (SafeMath.gt(size, maxSz))
        setErrMsg(`Maximum amount is ${maxSz}`);
      else if (SafeMath.gt(size, available))
        setErrMsg(`Available ${currency} is not enough`);
      else setErrMsg(null);
    },
    []
  );
  const sellSzHandler = useCallback(
    (orderType, value) => {
      switch (orderType) {
        case "market":
          formatSellSize(
            value,
            props.baseCcyAvailable,
            storeCtx.selectedTicker?.base_unit?.toUpperCase(),
            storeCtx.selectedTicker?.minSz,
            storeCtx.selectedTicker?.maxMktSz,
            storeCtx.selectedTicker?.lotSz,
            setMarketSellSz,
            setSellErrorMessage
          );
          break;
        case "limit":
          formatSellSize(
            value,
            props.baseCcyAvailable,
            storeCtx.selectedTicker?.base_unit?.toUpperCase(),
            storeCtx.selectedTicker?.minSz,
            storeCtx.selectedTicker?.maxLmtSz,
            storeCtx.selectedTicker?.lotSz,
            setLimitSellSz,
            setSellErrorMessage
          );
          break;
        default:
          break;
      }
    },
    [
      formatSellSize,
      props.baseCcyAvailable,
      storeCtx.selectedTicker?.base_unit,
      storeCtx.selectedTicker?.lotSz,
      storeCtx.selectedTicker?.maxLmtSz,
      storeCtx.selectedTicker?.maxMktSz,
      storeCtx.selectedTicker?.minSz,
    ]
  );

  const buyPctHandler = useCallback(
    (orderType, pct, buyPx, availBal) => {
      let size = "0";
      if (SafeMath.gt(props.quoteCcyAvailable, 0))
        size = formateDecimal(
          SafeMath.div(SafeMath.mult(pct, props.quoteCcyAvailable), buyPx),
          {
            decimalLength: storeCtx?.lotSz ? storeCtx?.lotSz : "0",
          }
        );
      else if (SafeMath.gt(availBal, 0))
        size = formateDecimal(
          SafeMath.div(SafeMath.mult(pct, availBal), buyPx),
          {
            decimalLength: storeCtx?.lotSz ? storeCtx?.lotSz : "0",
          }
        );
      if (orderType === "market") {
        setMarketBuySz(size);
        setSelectedMarketBuyPct(pct);
      } else {
        setLimitBuySz(size);
        setSelectedLimitBuyPct(pct);
      }
      if (SafeMath.lt(size, storeCtx.selectedTicker?.minSz))
        setSellErrorMessage(
          `Minimum amount is ${storeCtx.selectedTicker?.minSz}`
        );
      else if (
        SafeMath.gt(
          size,
          orderType === "market"
            ? storeCtx.selectedTicker?.maxMktSz
            : orderType === "limit"
            ? storeCtx.selectedTicker?.maxLmtSz
            : "99999"
        )
      )
        setSellErrorMessage(
          `Maximum amount is ${
            orderType === "market"
              ? storeCtx.selectedTicker?.maxMktSz
              : orderType === "limit"
              ? storeCtx.selectedTicker?.maxLmtSz
              : "99999"
          }`
        );
      else setBuyErrorMessage(null);
    },
    [
      props.quoteCcyAvailable,
      storeCtx?.lotSz,
      storeCtx.selectedTicker?.maxLmtSz,
      storeCtx.selectedTicker?.maxMktSz,
      storeCtx.selectedTicker?.minSz,
    ]
  );

  const sellPctHandler = useCallback(
    (orderType, pct, availBal) => {
      let size = "0";
      if (SafeMath.gt(props.baseCcyAvailable, 0))
        size = formateDecimal(SafeMath.mult(pct, props.baseCcyAvailable), {
          decimalLength: storeCtx?.lotSz ? storeCtx?.lotSz : "0",
        });
      else if (SafeMath.gt(availBal, 0))
        size = formateDecimal(SafeMath.mult(pct, availBal), {
          decimalLength: storeCtx?.lotSz ? storeCtx?.lotSz : "0",
        });
      if (orderType === "market") {
        setMarketSellSz(size);
        setSelectedMarketSellPct(pct);
      } else {
        setLimitSellSz(size);
        setSelectedLimitSellPct(pct);
      }
      if (SafeMath.lt(size, storeCtx.selectedTicker?.minSz))
        setSellErrorMessage(
          `Minimum amount is ${storeCtx.selectedTicker?.minSz}`
        );
      else if (
        SafeMath.gt(
          size,
          orderType === "market"
            ? storeCtx.selectedTicker?.maxMktSz
            : orderType === "limit"
            ? storeCtx.selectedTicker?.maxLmtSz
            : "99999"
        )
      )
        setSellErrorMessage(
          `Maximum amount is ${
            orderType === "market"
              ? storeCtx.selectedTicker?.maxMktSz
              : orderType === "limit"
              ? storeCtx.selectedTicker?.maxLmtSz
              : "99999"
          }`
        );
      else setBuyErrorMessage(null);
    },
    [
      props.baseCcyAvailable,
      storeCtx?.lotSz,
      storeCtx.selectedTicker?.maxLmtSz,
      storeCtx.selectedTicker?.maxMktSz,
      storeCtx.selectedTicker?.minSz,
    ]
  );

  const onSubmit = async (event, kind) => {
    event.preventDefault();
    if (!storeCtx.selectedTicker) return;
    const order =
      props.orderType === "limit"
        ? kind === "bid"
          ? {
              instId: storeCtx.selectedTicker.instId,
              tdMode,
              kind,
              ordType: props.orderType,
              price: limitBuyPx,
              volume: limitBuySz,
              market: storeCtx.selectedTicker.market,
            }
          : {
              instId: storeCtx.selectedTicker.instId,
              tdMode,
              kind,
              ordType: props.orderType,
              price: limitSellPx,
              volume: limitSellSz,
              market: storeCtx.selectedTicker.market,
            }
        : {
            instId: storeCtx.selectedTicker.instId,
            tdMode,
            kind,
            ordType: props.orderType,
            price: storeCtx.selectedTicker?.last,
            volume: kind === "bid" ? marketBuySz : marketSellSz,
            market: storeCtx.selectedTicker.market,
          };
    const confirm = window.confirm(`You are going to
          ${order.kind} ${order.volume} ${order.instId.split("-")[0]}
          ${order.kind === "bid" ? "with" : "for"} ${SafeMath.mult(
      props.orderType === "market" ? storeCtx.selectedTicker.last : order.price,
      order.volume
    )} ${order.instId.split("-")[1]}
          with price ${
            props.orderType === "market"
              ? storeCtx.selectedTicker.last
              : order.price
          } ${order.instId.split("-")[1]} per ${order.instId.split("-")[0]}`);
    if (confirm) {
      await storeCtx.postOrder(order);
      props.setRefresh(true);
    }
    if (kind === "bid") {
      if (props.orderType === "market") {
        setMarketBuySz("0");
        setSelectedMarketBuyPct(null);
      } else {
        setSelectedLimitBuyPct(null);
        setLimitBuySz("0");
      }
      // buyPctHandler(props.orderType, "0.25", selectedTicker.last);
    } else {
      if (props.orderType === "market") {
        setMarketSellSz("0");
        setSelectedMarketSellPct(null);
      } else {
        setLimitSellSz("0");
        setSelectedLimitSellPct(null);
      }

      // sellPctHandler(props.orderType, "0.25", selectedTicker.last);
    }
  };

  useEffect(() => {
    if (
      storeCtx.depthBook !== null &&
      storeCtx.depthBook?.price &&
      storeCtx.depthBook?.amount
    ) {
      console.log(`TradePannel useEffect depthBook`, storeCtx.depthBook);
      limitBuyPxHandler(storeCtx.depthBook.price);
      limitSellPxHandler(storeCtx.depthBook.price);
      buySzHandler("market", storeCtx.depthBook.amount);
      sellSzHandler("market", storeCtx.depthBook.amount);
      buySzHandler("limit", storeCtx.depthBook.amount);
      sellSzHandler("limit", storeCtx.depthBook.amount);
      storeCtx.depthBookHandler(null);
    }
  }, [
    buySzHandler,
    limitBuyPxHandler,
    limitSellPxHandler,
    sellSzHandler,
    storeCtx,
  ]);

  return (
    <div className="market-trade__panel">
      {width <= breakpoint ? (
        <Tabs defaultActiveKey="buy">
          <Tab eventKey="buy" title={t("buy")}>
            <TradeForm
              ordType={props.orderType}
              kind="bid"
              readyOnly={!!props.readyOnly}
              isMobile={true}
              quoteCcyAvailable={props.quoteCcyAvailable}
              baseCcyAvailable={props.baseCcyAvailable}
              price={
                props.orderType === "market"
                  ? storeCtx.selectedTicker?.last
                  : limitBuyPx
              }
              volume={props.orderType === "market" ? marketBuySz : limitBuySz}
              selectedPct={
                props.orderType === "market"
                  ? selectedMarketBuyPct
                  : selectedLimitBuyPct
              }
              onPxInput={limitBuyPxHandler}
              onSzInput={(value) => buySzHandler(props.orderType, value)}
              percentageHandler={(pct, buyPx) =>
                buyPctHandler(props.orderType, pct, buyPx)
              }
              onSubmit={onSubmit}
              errorMessage={buyErrorMessage}
            />
          </Tab>
          <Tab eventKey="sell" title={t("sell")}>
            <TradeForm
              ordType={props.orderType}
              kind="ask"
              readyOnly={!!props.readyOnly}
              isMobile={true}
              quoteCcyAvailable={props.quoteCcyAvailable}
              baseCcyAvailable={props.baseCcyAvailable}
              price={
                props.orderType === "market"
                  ? storeCtx.selectedTicker?.last
                  : limitSellPx
              }
              volume={props.orderType === "market" ? marketSellSz : limitSellSz}
              selectedPct={
                props.orderType === "market"
                  ? selectedMarketSellPct
                  : selectedLimitSellPct
              }
              onPxInput={limitSellPxHandler}
              onSzInput={(value) => sellSzHandler(props.orderType, value)}
              percentageHandler={(pct, buyPx) =>
                sellPctHandler(props.orderType, pct, buyPx)
              }
              onSubmit={onSubmit}
              errorMessage={sellErrorMessage}
            />
          </Tab>
        </Tabs>
      ) : (
        <>
          <TradeForm
            ordType={props.orderType}
            kind="bid"
            readyOnly={!!props.readyOnly}
            quoteCcyAvailable={props.quoteCcyAvailable}
            baseCcyAvailable={props.baseCcyAvailable}
            price={
              props.orderType === "market"
                ? storeCtx.selectedTicker?.last
                : limitBuyPx
            }
            volume={props.orderType === "market" ? marketBuySz : limitBuySz}
            selectedPct={
              props.orderType === "market"
                ? selectedMarketBuyPct
                : selectedLimitBuyPct
            }
            onPxInput={limitBuyPxHandler}
            onSzInput={(value) => buySzHandler(props.orderType, value)}
            percentageHandler={(pct, buyPx) =>
              buyPctHandler(props.orderType, pct, buyPx)
            }
            onSubmit={onSubmit}
            errorMessage={buyErrorMessage}
          />
          <TradeForm
            ordType={props.orderType}
            kind="ask"
            readyOnly={!!props.readyOnly}
            baseCcyAvailable={props.baseCcyAvailable}
            quoteCcyAvailable={props.quoteCcyAvailable}
            price={
              props.orderType === "market"
                ? storeCtx.selectedTicker?.last
                : limitSellPx
            }
            volume={props.orderType === "market" ? marketSellSz : limitSellSz}
            F
            selectedPct={
              props.orderType === "market"
                ? selectedMarketSellPct
                : selectedLimitSellPct
            }
            onPxInput={limitSellPxHandler}
            onSzInput={(value) => sellSzHandler(props.orderType, value)}
            percentageHandler={(pct) => sellPctHandler(props.orderType, pct)}
            onSubmit={onSubmit}
            errorMessage={sellErrorMessage}
          />
        </>
      )}
    </div>
  );
};

const MarketTrade = (props) => {
  const storeCtx = useContext(StoreContext);
  const { t } = useTranslation();
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [quoteCcyAvailable, setQuoteCcyAvailable] = useState("0");
  const [baseCcyAvailable, setBaseCcyAvailable] = useState("0");
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    if (
      (storeCtx.accounts?.length > 0 &&
        ((storeCtx.selectedTicker && !selectedTicker) ||
          (storeCtx.selectedTicker &&
            storeCtx.selectedTicker.instId !== selectedTicker?.instId))) ||
      refresh
    ) {
      let quoteCcyAccount = storeCtx.accounts?.find((account) => {
        return (
          account.currency ===
          storeCtx.selectedTicker?.quote_unit?.toUpperCase()
        );
      });

      if (quoteCcyAccount) {
        setQuoteCcyAvailable(quoteCcyAccount?.balance);
      }
      let baseCcyAccount = storeCtx.accounts?.find(
        (account) =>
          account.currency === storeCtx.selectedTicker?.base_unit?.toUpperCase()
      );
      if (baseCcyAccount) {
        setBaseCcyAvailable(baseCcyAccount?.balance);
      }
      setSelectedTicker(storeCtx.selectedTicker);
    }
  }, [storeCtx.selectedTicker, storeCtx.accounts, selectedTicker, refresh]);
  return (
    <div className="market-trade">
      <div className="market-trade__container">
        <div className="market-trade__header">{t("place_order")}</div>
        <Tabs defaultActiveKey="limit">
          <Tab eventKey="limit" title={t("limit")}>
            <TradePannel
              orderType="limit"
              quoteCcyAvailable={quoteCcyAvailable}
              baseCcyAvailable={baseCcyAvailable}
              setRefresh={setRefresh}
            />
          </Tab>
          <Tab eventKey="market" title={t("market")}>
            <TradePannel
              orderType="market"
              readyOnly={true}
              quoteCcyAvailable={quoteCcyAvailable}
              baseCcyAvailable={baseCcyAvailable}
              setRefresh={setRefresh}
            />
          </Tab>
          {/* <Tab eventKey="stop-limit" title="Stop Limit">
            <TradePannel orderType="stop-limit" />
          </Tab> */}
          {/* <Tab eventKey="stop-market" title="Stop Market">
            <TradePannel orderType="stop-market" />
          </Tab> */}
        </Tabs>
      </div>
      {!storeCtx.isLogin && (
        <div className="market-trade__cover flex-row">
          <Nav.Link href="/signin">{t("login")}</Nav.Link>
          <Nav.Link href="/signup">{t("register")}</Nav.Link>
        </div>
      )}
    </div>
  );
};

// const MarketTrade = (props) => {
//   const [key, setKey] = useState("limit");
//   return (
//     <>
//       <div className="market-trade">
//         <Tabs defaultActiveKey="limit" activeKey={key} onSelect={setKey}>
//           <Tab eventKey="limit" title="Limit">
//             {key === "limit" && <TradePannel orderType={key} />}
//           </Tab>
//           <Tab eventKey="market" title="Market">
//             {key === "market" && <TradePannel orderType={key} />}
//           </Tab>
//           <Tab eventKey="stop-limit" title="Stop Limit">
//             {key === "stop-limit" && <TradePannel orderType={key} />}
//           </Tab>
//           <Tab eventKey="stop-market" title="Stop Market">
//             {key === "stop-market" && <TradePannel orderType={key} />}
//           </Tab>
//         </Tabs>
//       </div>
//     </>
//   );
// };
export default MarketTrade;
