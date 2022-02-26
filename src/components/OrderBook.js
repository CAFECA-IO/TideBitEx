import React, { useContext, useEffect, useState } from "react";
import StoreContext from "../store/store-context";
import SafeMath from "../utils/SafeMath";
import { formateDecimal } from "../utils/Utils";

const BookTile = (props) => {
  return (
    <tr
      className={`${props.type === "asks" ? "red-bg" : "green-bg"} ${
        props.book.update ? "update" : ""
      } flex-row`}
      data-width={props.dataWidth}
    >
      {props.type === "asks" ? (
        <>
          <td className={props.type === "asks" ? "red" : "green"}>
            {formateDecimal(props.book.price, 8)}
          </td>
          <td>{formateDecimal(props.book.amount, 8)}</td>
          <td>
            {formateDecimal(
              SafeMath.mult(props.book.price, props.book.amount),
              4
            )}
          </td>
          <td
            className={
              props.type === "asks" ? "red-bg-cover" : "green-bg-cover"
            }
            style={{ width: props.dataWidth }}
          ></td>
        </>
      ) : (
        <>
          <td>
            {formateDecimal(
              SafeMath.mult(props.book.price, props.book.amount),
              4
            )}
          </td>
          <td>{formateDecimal(props.book.amount, 8)}</td>
          <td className={props.type === "asks" ? "red" : "green"}>
            {formateDecimal(props.book.price, 8)}
          </td>
          <td
            className={
              props.type === "asks" ? "red-bg-cover" : "green-bg-cover"
            }
            style={{ width: props.dataWidth }}
          ></td>
        </>
      )}
    </tr>
  );
};

const OrderBook = (props) => {
  const storeCtx = useContext(StoreContext);

  useEffect(() => {
    if (storeCtx.init) {
      // const element = document.querySelector(".order-book__asks");
      // element.scrollTop = element.scrollHeight;
      storeCtx.setInit(false);
    }
  }, [storeCtx.init, storeCtx]);

  return (
    <section className="order-book flex-row">
      <table className="order-book__table">
        <thead>
          <tr className="flex-row text-right">
            <th>Amount</th>
            <th>Volume</th>
            <th>Bid</th>
          </tr>
        </thead>
        <tbody className="order-book__bids">
          {storeCtx?.selectedTicker &&
            storeCtx.books?.bids &&
            storeCtx.books.bids.map((book, index) => (
              <BookTile
                type="bids"
                book={book}
                key={`bids-${storeCtx.selectedTicker.instId}-${index}`}
                dataWidth={`${parseFloat(
                  SafeMath.mult(
                    SafeMath.div(
                      book.total,
                      storeCtx.books.bids[storeCtx.books.bids.length - 1].total
                    ),
                    "100"
                  )
                ).toFixed(18)}%`}
              />
            ))}
        </tbody>
      </table>
      <table className="order-book__table">
        <thead>
          <tr className="flex-row text-left">
            <th>Ask</th>
            <th>Volume</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody className="order-book__asks">
          {storeCtx?.selectedTicker &&
            storeCtx.books?.asks &&
            storeCtx.books.asks.map((book, index) => (
              <BookTile
                type="asks"
                book={book}
                key={`asks-${storeCtx.selectedTicker.instId}-${index}`}
                dataWidth={`${parseFloat(
                  SafeMath.mult(
                    SafeMath.div(
                      book.total,
                      storeCtx.books.asks[storeCtx.books.asks.length - 1].total
                    ),
                    "100"
                  )
                ).toFixed(18)}%`}
              />
            ))}
        </tbody>
      </table>
    </section>
  );
};

export default OrderBook;
