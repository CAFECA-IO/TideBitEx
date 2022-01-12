import React, { useEffect, useContext, useCallback, useState } from "react";
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
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [books, setBooks] = useState(null);

  const fetchBooks = useCallback(
    async (selectedTicker) => {
      setSelectedTicker(selectedTicker);
      const books = await storeCtx.getBooks(selectedTicker.instId);
      setBooks(books);
    },
    [storeCtx]
  );

  useEffect(() => {
    if (
      (!selectedTicker && props.selectedTicker) ||
      props.selectedTicker?.instId !== selectedTicker?.instId
    ) {
      fetchBooks(props.selectedTicker);
    }
    return () => {};
  }, [selectedTicker, props.selectedTicker, fetchBooks]);

  return (
    <>
      <div className="order-book mb15">
        <h2 className="heading">Order Book</h2>
        <table className="table">
          <thead>
            <tr>
              <th>{`Price(${
                selectedTicker ? selectedTicker.baseCcy : "--"
              })`}</th>
              <th>{`Amount(${
                selectedTicker ? selectedTicker.quoteCcy : "--"
              })`}</th>
              <th>{`Total(${
                selectedTicker ? selectedTicker.quoteCcy : "--"
              })`}</th>
            </tr>
          </thead>
          <tbody>
            {books &&
              books.asks.map((book, index) => (
                <BookTile
                  type="asks"
                  book={book}
                  key={`asks-${selectedTicker.instId}-${index}`}
                  dataWidth={`${parseFloat(
                    SafeMath.mult(
                      SafeMath.div(book.total, books.asks[0].total),
                      "100"
                    )
                  ).toFixed(18)}%`}
                />
              ))}
          </tbody>
          {selectedTicker && (
            <tbody className="ob-heading">
              <tr>
                <td>
                  <span>Last Price</span>
                  {formateDecimal(selectedTicker.last, 8)}
                </td>
                <td>
                  <span>USD</span>
                  --
                </td>
                <td
                  className={
                    SafeMath.gt(selectedTicker.change, "0") ? "green" : "red"
                  }
                >
                  <span>Change</span>
                  {SafeMath.gt(selectedTicker.change, "0")
                    ? `+${formateDecimal(selectedTicker.change, 3)}%`
                    : `${formateDecimal(selectedTicker.change, 3)}%`}
                </td>
              </tr>
            </tbody>
          )}
          <tbody>
            {books &&
              books.bids.map((book, index) => (
                <BookTile
                  type="bids"
                  book={book}
                  key={`bids-${selectedTicker.instId}-${index}`}
                  dataWidth={`${parseFloat(
                    SafeMath.mult(
                      SafeMath.div(
                        book.total,
                        books.bids[books.bids.length - 1].total
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
