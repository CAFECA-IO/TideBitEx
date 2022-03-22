import React, { useContext } from "react";
import { Tabs, Tab } from "react-bootstrap";
import StoreContext from "../store/store-context";
import SafeMath from "../utils/SafeMath";
import { dateFormatter } from "../utils/Utils";
import { FaTrashAlt } from "react-icons/fa";
import { useTranslation } from "react-i18next";

const OrderTile = (props) => {
  return (
    <ul className="d-flex justify-content-between market-order-item">
      {/* <li>{dateFormatter(parseInt(props.order.cTime)).text}</li>
      <li>{props.order.instId.replace("-", "/")}</li>
      <li>{props.order.instType}</li>*/}
      <li className={`${props.order.side === "buy" ? "green" : "red"}`}>
        {props.order.side === "buy" ? "Bid" : "Ask"}
      </li>
      <li>{props.order.px}</li>
      <li>{props.order.sz}</li>
      <li>{SafeMath.mult(props.order.px, props.order.sz)}</li>
      {/* <li>{props.order.fillSz}</li> */}
      {/* <li>{SafeMath.minus(props.order.sz, props.order.fillSz)}</li> */}
      {props.type === "pending" ? (
        <li onClick={(_) => props.cancelOrder(props.order)}>
          <FaTrashAlt />
        </li>
      ): <li>{props.order.state}</li>}
    </ul>
  );
};

export const BalanceTile = (props) => {
  return (
    <ul className="d-flex justify-content-between market-order-item market-balance">
      {/* <li>{dateFormatter(parseInt(props.balance.uTime)).text}</li> */}
      <li>{props.balance.ccy || "--"}</li>
      {/* <li>{props.balance.eq || "--"}</li>
      <li>{props.balance.cashBal || "--"}</li>
      <li>{props.balance.availEq || "--"}</li> */}
      <li>{props.balance?.cashBal || props.balance?.availBal || "--"}</li>{" "}
      {/* -- TODO: check api return object */}
      <li>{props.balance.frozenBal || "--"}</li>
      {/* <li>{props.balance.interest || "--"}</li> */}
    </ul>
  );
};

const HistoryOrder = (props) => {
  const storeCtx = useContext(StoreContext);
  const cancelOrder = (order) => {
    const confirm = window.confirm(`You are going to cancel order: ${
      order.ordId
    }
    ${order.side} ${order.sz} ${order.instId.split("-")[0]}
    ${order.side === "buy" ? "with" : "for"} ${SafeMath.mult(
      order.px,
      order.sz
    )} ${order.sz} ${order.instId.split("-")[1]}
    with price ${order.px} ${order.instId.split("-")[1]} per ${
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
              {/* <li>All pairs</li>
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
                storeCtx.pendingOrders.map((order) => (
                  <OrderTile
                    order={order}
                    type="pending"
                    cancelOrder={cancelOrder}
                  />
                ))}
            </ul>
          </Tab>
          <Tab eventKey="closed-orders" title={t("close_orders")}>
            <ul className="d-flex justify-content-between market-order-item market-order__title">
              {/* <li>Time</li> */}
              {/* <li>All pairs</li>
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
                storeCtx.closeOrders.map((order) => (
                  <OrderTile order={order} />
                ))}
            </ul>
          </Tab>
          {/* <Tab eventKey="order-history" title="Order history">
            <ul className="d-flex justify-content-between market-order-item">
              <li>Time</li>
              <li>All pairs</li>
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
            <ul className="d-flex justify-content-between market-order-item market-order__title">
              {/* <li>Update time</li> */}
              <li>{t("currency")}</li>
              {/* <li>Currency Equity</li>
              <li>Cash balance</li>
              <li>Available Equity</li> */}
              <li>{t("cashBal")}</li>
              <li>{t("frozenBal")}</li>
              {/* <li>Interest</li> */}
            </ul>
            {/* {!storeCtx.balances?.length && (
              <span className="no-data">
                <i className="icon ion-md-document"></i>
                No data
              </span>
            )} */}
            <ul className="order-list">
              {!!storeCtx.balances?.length &&
                storeCtx.balances
                  .filter(
                    (balance) =>
                      storeCtx.selectedTicker?.baseCcy === balance.ccy ||
                      storeCtx.selectedTicker?.quoteCcy === balance.ccy
                  )
                  .map((balance) => <BalanceTile balance={balance} />)}
            </ul>
          </Tab>
        </Tabs>
      </div>
    </>
  );
};

export default HistoryOrder;
