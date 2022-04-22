import React, { useContext } from "react";
import { Tabs, Tab } from "react-bootstrap";
import StoreContext from "../store/store-context";
import SafeMath from "../utils/SafeMath";
import { formateDecimal } from "../utils/Utils";
import { FaTrashAlt } from "react-icons/fa";
import { useTranslation } from "react-i18next";

const OrderTile = (props) => {
  return (
    <ul
      className="d-flex justify-content-between market-order-item"
      onClick={(_) =>
        props.order.state === "wait" ? props.cancelOrder(props.order) : {}
      }
    >
      {/* <li>{dateFormatter(parseInt(props.order.cTime)).text}</li>
      <li>{props.order.instId.replace("-", "/")}</li>
      <li>{props.order.instType}</li>*/}
      <li className={`order-tile__label-box`}>
        <div
          className={`order-tile__label ${
            props.order.kind === "bid"
              ? "order-tile__label--green"
              : "order-tile__label--red"
          }`}
        >
          {props.order.kind === "bid" ? "Bid" : "Ask"}
        </div>
        {props.order.state === "wait" && (
          <div
            className={`order-tile__label ${
              props.order.filled
                ? "order-tile__label--blue"
                : "order-tile__label--grey"
            }`}
          >
            {props.order.filled ? "Partial" : "Total"}
          </div>
        )}
      </li>
      <li>{formateDecimal(props.order.price, 8)}</li>
      <li>
        {formateDecimal(
          props.order.state === "wait"
            ? props.order.volume
            : props.order.origin_volume,
          8
        )}
      </li>
      <li>
        {formateDecimal(
          SafeMath.mult(props.order.price, props.order.volume),
          8
        )}
      </li>
      {/* <li>{props.order.fillSz}</li> */}
      {/* <li>{SafeMath.minus(props.order.volume, props.order.fillSz)}</li> */}
      {props.order.state === "wait" ? (
        <li>
          <FaTrashAlt />
        </li>
      ) : (
        <li>{props.order.state_text}</li>
      )}
    </ul>
  );
};

export const AccountTile = (props) => {
  return (
    <ul className="d-flex justify-content-between market-order-item market-balance">
      {/* <li>{dateFormatter(parseInt(props.account.uTime)).text}</li> */}
      <li>{props.account.currency || "--"}</li>
      {/* <li>{props.account.eq || "--"}</li>
      <li>{props.account.cashBal || "--"}</li>*/}
      <li>{formateDecimal(props.account.total)}</li>
      <li>{formateDecimal(props.account.balance)}</li>
      <li>{formateDecimal(props.account.locked)}</li>
      {/* -- TODO: check api return object */}
      {/* <li>{props.account.interest || "--"}</li> */}
    </ul>
  );
};

const HistoryOrder = (props) => {
  const storeCtx = useContext(StoreContext);
  const cancelOrder = (order) => {
    const confirm = window.confirm(`You are going to cancel order: ${order.id}
    ${order.kind} ${order.volume} ${order.instId.split("-")[0]}
    ${order.kind === "bid" ? "with" : "for"} ${SafeMath.mult(
      order.price,
      order.volume
    )} ${order.volume} ${order.instId.split("-")[1]}
    with price ${order.price} ${order.instId.split("-")[1]} per ${
      order.instId.split("-")[0]
    }`);
    if (confirm) {
      storeCtx.cancelOrder(order);
    }
  };
  const { t } = useTranslation();
  return (
    <>
      <div className="market-order">
        <div className="market-order__header">{t("my_orders")}</div>
        <Tabs defaultActiveKey="open-orders">
          <Tab eventKey="open-orders" title={t("open_orders")}>
            <ul className="d-flex justify-content-between market-order-item market-order__title">
              {/* <li>Time</li> */}
              {/* <li>All Tickers</li>
              <li>All Types</li> */}
              <li>Buy/Sell</li>
              <li>{t("price")}</li>
              <li>{t("volume")}</li>
              <li>{t("amount")}</li>
              {/* <li>Executed</li>
              <li>Unexecuted</li> */}
              <li>{t("cancel")}</li>
            </ul>
            {/* {!storeCtx.pendingOrders.length && (
              <span className="no-data">
                <i className="icon ion-md-document"></i>
                No data
              </span>
            )} */}
            <ul className="order-list">
              {!!storeCtx.pendingOrders?.length &&
                storeCtx.pendingOrders
                  .filter((order) => !(order.price === "NaN" || !order.price)) // ++ WORKAROUND
                  .map((order) => (
                    <OrderTile order={order} cancelOrder={cancelOrder} />
                  ))}
            </ul>
          </Tab>
          <Tab eventKey="closed-orders" title={t("close_orders")}>
            <ul className="d-flex justify-content-between market-order-item market-order__title">
              {/* <li>Time</li> */}
              {/* <li>All Tickers</li>
              <li>All Types</li>*/}
              <li>Buy/Sell</li>
              <li>{t("price")}</li>
              <li>{t("volume")}</li>
              <li>{t("amount")}</li>
              {/* <li>Executed</li>
              <li>Unexecuted</li> */}
              <li>{t("status")}</li>
            </ul>
            {/* {!storeCtx.closeOrders.length && (
              <span className="no-data">
                <i className="icon ion-md-document"></i>
                No data
              </span>
            )} */}
            <ul className="order-list">
              {!!storeCtx.closeOrders?.length &&
                storeCtx.closeOrders
                  .filter((order) => !(order.price === "NaN" || !order.price)) // ++ WORKAROUND
                  .map((order) => <OrderTile order={order} />)}
            </ul>
          </Tab>
          {/* <Tab eventKey="order-history" title="Order history">
            <ul className="d-flex justify-content-between market-order-item">
              <li>Time</li>
              <li>All Tickers</li>
              <li>All Types</li>
              <li>Buy/Sell</li>
              <li>Price</li>
              <li>Volume</li>
              <li>Amount</li>
              <li>Executed</li>
              <li>Unexecuted</li>
            </ul>
            {!storeCtx.orderHistories.length && (
              <span className="no-data">
                <i className="icon ion-md-document"></i>
                No data
              </span>
            )}
            {!!storeCtx.orderHistories.length &&
              storeCtx.orderHistories.map((order) => (
                <OrderTile order={order} />
              ))}
          </Tab> */}
          <Tab eventKey="balance" title={t("balance")}>
            <ul className="d-flex justify-content-between market-order-item market-order__title market-balance">
              {/* <li>Update time</li> */}
              <li>{t("currency")}</li>
              {/* <li>Currency Equity</li>
              <li>Cash balance</li>
              <li>Available Equity</li> */}
              <li>{t("totalBal")}</li>
              <li>{t("availBal")}</li>
              <li>{t("frozenBal")}</li>
              {/* <li>Interest</li> */}
            </ul>
            {/* {!storeCtx.accounts?.length && (
              <span className="no-data">
                <i className="icon ion-md-document"></i>
                No data
              </span>
            )} */}
            <ul className="order-list">
              {!!storeCtx.accounts?.length &&
                storeCtx.accounts
                  .filter(
                    (account) =>
                      storeCtx.selectedTicker?.base_unit.toUpperCase() ===
                        account.currency ||
                      storeCtx.selectedTicker?.quote_unit.toUpperCase() ===
                        account.currency
                  )
                  .map((account) => <AccountTile account={account} />)}
            </ul>
          </Tab>
        </Tabs>
      </div>
    </>
  );
};

export default HistoryOrder;
