import React, { useContext } from "react";
import StoreContext from "../store/store-context";
import SafeMath from "../utils/SafeMath";
import { formateDecimal } from "../utils/Utils";
import { useTranslation } from "react-i18next";

const BookTile = (props) => {
  if (props.index === 0) {
    console.log(props);
  }
  return (
    <li
      className={`order-book__tile flex-row ${
        props.book.update ? "update" : ""
      }`}
      data-width={props.dataWidth}
      onClick={props.onClick}
    >
      {props.type === "asks" ? (
        <>
          <div>
            {formateDecimal(props.book.price, {
              decimalLength: 2,
              // props?.tickSz?.split(".").length > 1
              //   ? props?.tickSz?.split(".")[1].length
              //   : "0",
              pad: true,
            })}
          </div>
          <div>
            {formateDecimal(props.book.amount, {
              decimalLength: 4,
              // props?.lotSz?.split(".").length > 1
              //   ? props?.lotSz?.split(".")[1].length
              //   : "0",
              pad: true,
            })}
          </div>
          <div>
            {formateDecimal(
              SafeMath.mult(props.book.price, props.book.amount),
              {
                decimalLength: 4,
                // SafeMath.mult(props?.tickSz, props?.lotSz).split(".").length >
                // 1
                //   ? SafeMath.mult(props?.tickSz, props?.lotSz).split(".")[1]
                //       .length
                //   : "0",
                pad: true,
              }
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
              {
                decimalLength: 4,
                // SafeMath.mult(props?.tickSz, props?.lotSz).split(".").length >
                // 1
                //   ? SafeMath.mult(props?.tickSz, props?.lotSz).split(".")[1]
                //       .length
                //   : "0",
                pad: true,
              }
            )}
          </div>
          <div>
            {formateDecimal(props.book.amount, {
              decimalLength: 4,
              // props?.lotSz?.split(".").length > 1
              //   ? props?.lotSz?.split(".")[1].length
              //   : "0",
              pad: true,
            })}
          </div>
          <div>
            {formateDecimal(props.book.price, {
              decimalLength: 2,
              // props?.tickSz?.split(".").length > 1
              //   ? props?.tickSz?.split(".")[1].length
              //   : "0",
              pad: true,
            })}
          </div>
          <div
            className="order-book__tile--cover"
            style={{ width: props.dataWidth }}
          ></div>
        </>
      )}
    </li>
  );
};

const DepthBook = (props) => {
  const storeCtx = useContext(StoreContext);
  const { t } = useTranslation();

  return (
    <section className="order-book">
      <div className="order-book__table order-book__bids">
        <ul className="order-book__header flex-row table__header">
          <li>{t("amount")}</li>
          <li>{t("volume")}</li>
          <li>{t("bid")}</li>
        </ul>
        <ul className="order-book__panel">
          {storeCtx?.selectedTicker &&
            storeCtx.books?.bids &&
            storeCtx.books.bids.map((book) => (
              <BookTile
                tickSz={storeCtx.selectedTicker?.tickSz}
                lotSz={storeCtx.selectedTicker?.lotSz}
                onClick={() => {
                  storeCtx.depthBookHandler(book.price, book.amount);
                }}
                type="bids"
                book={book}
                key={`bids-${storeCtx.selectedTicker.instId}-${book.price}`}
                dataWidth={`${parseFloat(
                  SafeMath.mult(
                    SafeMath.div(book.total, storeCtx.books.total),
                    "100"
                  )
                ).toFixed(2)}%`}
              />
            ))}
        </ul>
      </div>
      <div className="order-book__table order-book__asks">
        <ul className="order-book__header flex-row table__header">
          <li>{t("ask")}</li>
          <li>{t("volume")}</li>
          <li>{t("amount")}</li>
        </ul>
        <ul className="order-book__panel">
          {storeCtx?.selectedTicker &&
            storeCtx.books?.asks &&
            storeCtx.books.asks.map((book) => (
              <BookTile
                tickSz={storeCtx.selectedTicker?.tickSz}
                lotSz={storeCtx.selectedTicker?.lotSz}
                type="asks"
                onClick={() => {
                  storeCtx.depthBookHandler(book.price, book.amount);
                }}
                book={book}
                key={`asks-${storeCtx.selectedTicker.instId}-${book.price}`}
                dataWidth={`${parseFloat(
                  SafeMath.mult(
                    SafeMath.div(book.total, storeCtx.books.total),
                    "100"
                  )
                ).toFixed(2)}%`}
              />
            ))}
        </ul>
      </div>
    </section>
  );
};

export default DepthBook;
