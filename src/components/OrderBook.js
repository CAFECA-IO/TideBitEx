import React, { useContext, useEffect } from "react";
import StoreContext from "../store/store-context";
import SafeMath from "../utils/SafeMath";
import { formateDecimal } from "../utils/Utils";

const BookTile = (props) => {
  return (
    <tr
      className={props.type === "asks" ? "red-bg" : "green-bg"}
      data-width={props.dataWidth}
    >
      <td className={props.type === "asks" ? "red" : "green"}>
        {formateDecimal(props.book.price, 8)}
      </td>
      <td>{formateDecimal(props.book.amount, 8)}</td>
      <td>{formateDecimal(props.book.total, 4)}</td>
      <td
        className={props.type === "asks" ? "red-bg-cover" : "green-bg-cover"}
        style={{ width: props.dataWidth }}
      ></td>
    </tr>
  );
};

const OrderBook = (props) => {
  const storeCtx = useContext(StoreContext);
  useEffect(() => {
    console.log(`storeCtx.books`, storeCtx.books);
  }, [storeCtx.books]);

  return (
    <>
      <div className="order-book mb15">
        <h2 className="heading">Order Book</h2>
        <table className="table">
          <thead>
            <tr>
              <th>{`Price(${storeCtx?.selectedTicker?.quoteCcy || "--"})`}</th>
              <th>{`Amount(${storeCtx?.selectedTicker?.baseCcy || "--"})`}</th>
              <th>{`Total(${storeCtx?.selectedTicker?.baseCcy || "--"})`}</th>
            </tr>
          </thead>
          <tbody className="order-book-asks">
            {storeCtx.books?.asks &&
              storeCtx.books.asks.map((book, index) => (
                <BookTile
                  type="asks"
                  book={book}
                  key={`asks-${storeCtx.selectedTicker.instId}-${index}`}
                  dataWidth={`${parseFloat(
                    SafeMath.mult(
                      SafeMath.div(book.total, storeCtx.books.asks[0].total),
                      "100"
                    )
                  ).toFixed(18)}%`}
                />
              ))}
          </tbody>
          {storeCtx?.selectedTicker && (
            <tbody className="ob-heading">
              <tr>
                <td>
                  <span>Last Price</span>
                  {formateDecimal(storeCtx.selectedTicker.last, 8)}
                </td>
                <td>
                  <span>USD</span>
                  --
                </td>
                <td
                  className={
                    SafeMath.gt(storeCtx.selectedTicker.change, "0")
                      ? "green"
                      : "red"
                  }
                >
                  <span>Change</span>
                  {SafeMath.gt(storeCtx.selectedTicker.change, "0")
                    ? `+${formateDecimal(
                        storeCtx.selectedTicker.changePct,
                        3
                      )}%`
                    : `${formateDecimal(
                        storeCtx.selectedTicker.changePct,
                        3
                      )}%`}
                </td>
              </tr>
            </tbody>
          )}
          <tbody>
            {storeCtx.books?.bids &&
              storeCtx.books.bids.map((book, index) => (
                <BookTile
                  type="bids"
                  book={book}
                  key={`bids-${storeCtx.selectedTicker.instId}-${index}`}
                  dataWidth={`${parseFloat(
                    SafeMath.mult(
                      SafeMath.div(
                        book.total,
                        storeCtx.books.bids[storeCtx.books.bids.length - 1]
                          .total
                      ),
                      "100"
                    )
                  ).toFixed(18)}%`}
                />
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default OrderBook;
