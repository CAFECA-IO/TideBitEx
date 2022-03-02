import React, { useContext, useEffect } from "react";
import StoreContext from "../store/store-context";
import SafeMath from "../utils/SafeMath";
import { formateDecimal } from "../utils/Utils";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const [width, setWidth] = React.useState(window.innerWidth);
  const breakpoint = 414;

  const handleWindowResize = () => setWidth(window.innerWidth);

  useEffect(() => {
    window.addEventListener("resize", handleWindowResize);

    if (storeCtx.init) {
      const bidsElement = document.querySelector(
        ".order-book__bids > .order-book__panel"
      );
      bidsElement.scrollTop = bidsElement.scrollHeight;
      if (SafeMath.lte(width, breakpoint)) {
        const asksElement = document.querySelector(
          ".order-book__asks > .order-book__panel"
        );
        asksElement.scrollTop = asksElement.scrollHeight;
      }
      storeCtx.setInit(false);
    }
    return () => window.removeEventListener("resize", handleWindowResize);
  }, [storeCtx.init, storeCtx, width]);

  return (
    <section className="order-book">
      <div className="order-book__table order-book__bids">
        {SafeMath.lte(width, breakpoint) && (
          <ul className="order-book__header flex-row">
            <li>{t("bid")}</li>
            <li>{t("volume")}</li>
            <li>{t("amount")}</li>
          </ul>
        )}
        {SafeMath.gt(width, breakpoint) && (
          <ul className="order-book__header flex-row">
            <li>{t("amount")}</li>
            <li>{t("volume")}</li>
            <li>{t("bid")}</li>
          </ul>
        )}
        <ul className="order-book__panel">
          {storeCtx?.selectedTicker && storeCtx.books?.bids
            ? SafeMath.lte(width, breakpoint)
              ? storeCtx.books.bids
                  // .sort((a, b) => +a.price - +b.price)
                  .map((book, index) => (
                    <BookTile
                      type={`${
                        SafeMath.lte(width, breakpoint) ? "asks" : "bids"
                      }`}
                      book={book}
                      key={`bids-${storeCtx.selectedTicker.instId}-${index}`}
                      dataWidth={`${parseFloat(
                        SafeMath.mult(
                          SafeMath.div(book.total, storeCtx.books.total),
                          "100"
                        )
                      ).toFixed(18)}%`}
                    />
                  ))
              : storeCtx.books.bids.map((book, index) => (
                  <BookTile
                    type={`${
                      SafeMath.lte(width, breakpoint) ? "asks" : "bids"
                    }`}
                    book={book}
                    key={`bids-${storeCtx.selectedTicker.instId}-${index}`}
                    dataWidth={`${parseFloat(
                      SafeMath.mult(
                        SafeMath.div(book.total, storeCtx.books.total),
                        "100"
                      )
                    ).toFixed(18)}%`}
                  />
                ))
            : null}
        </ul>
      </div>
      <div className="order-book__table order-book__asks">
        <ul className="order-book__header flex-row">
          <li>{t("ask")}</li>
          <li>{t("volume")}</li>
          <li>{t("amount")}</li>
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
                    SafeMath.div(book.total, storeCtx.books.total),
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
