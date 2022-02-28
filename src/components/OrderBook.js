import React, { useContext, useEffect, useState } from "react";
import StoreContext from "../store/store-context";
import SafeMath from "../utils/SafeMath";
import { formateDecimal } from "../utils/Utils";

const BookTile = (props) => {
  return (
    <li
      className={`order-book__tile flex-row ${
        props.book.update ? "update" : ""
      }`}
      data-width={props.dataWidth}
    >
      {props.type === "asks" ? (
        <>
          <div>{formateDecimal(props.book.price, 8)}</div>
          <div>{formateDecimal(props.book.amount, 8)}</div>
          <div>
            {formateDecimal(
              SafeMath.mult(props.book.price, props.book.amount),
              8
            )}
          </div>
          <div
            className="order-book__tile--cover"
            style={{ width: props.dataWidth }}
          ></div>
        </>
      ) : (
        <>
          <div>
            {formateDecimal(
              SafeMath.mult(props.book.price, props.book.amount),
              8
            )}
          </div>
          <div>{formateDecimal(props.book.amount, 8)}</div>
          <div>{formateDecimal(props.book.price, 8)}</div>
          <div
            className="order-book__tile--cover"
            style={{ width: props.dataWidth }}
          ></div>
        </>
      )}
    </li>
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
    <section className="order-book">
      <div className="order-book__table order-book__bids">
        <ul className="order-book__header flex-row">
          <li>Amount</li>
          <li>Volume</li>
          <li>Bid</li>
        </ul>
        <ul className="order-book__panel">
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
        </ul>
      </div>
      <div className="order-book__table order-book__asks">
        <ul className="order-book__header flex-row">
          <li>Ask</li>
          <li>Volume</li>
          <li>Amount</li>
        </ul>
        <ul className="order-book__panel">
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
        </ul>
      </div>
    </section>
  );
};

export default OrderBook;
