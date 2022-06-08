import React, { useContext } from "react";
import StoreContext from "../store/store-context";
import SafeMath from "../utils/SafeMath";
import { formateDecimal } from "../utils/Utils";
import { useTranslation } from "react-i18next";

const BookTile = (props) => {
  const tickSz =
    props?.tickSz?.split(".").length > 1
      ? // props?.tickSz?.split(".")[1].length > 2
        //   ? 2
        //   :
        props?.tickSz?.split(".")[1].length
      : "0";
  const lotSz =
    props?.lotSz?.split(".").length > 1
      ? //  props?.lotSz?.split(".")[1].length > 4
        //   ? 4
        //   :
        props?.lotSz?.split(".")[1].length
      : "0";
  const amountSz =
    SafeMath.mult(props?.tickSz, props?.lotSz).split(".").length > 1
      ? // SafeMath.mult(props?.tickSz, props?.lotSz).split(".")[1].length > 4
        //   ? 4
        //   :
        SafeMath.mult(props?.tickSz, props?.lotSz).split(".")[1].length
      : "0";
  return (
    <li
      className={`order-book__tile flex-row ${
        props.book.update ? "" : "" /** TODO animation temporary removed */
        // props.book.update ? "update" : ""
      }`}
      data-width={props.dataWidth}
      onClick={props.onClick}
    >
      {props.type === "asks" ? (
        <>
          <div>
            {formateDecimal(props.book.price, {
              // decimalLength: 2,
              decimalLength: tickSz,
              pad: true,
            })}
          </div>
          <div>
            {formateDecimal(props.book.amount, {
              // decimalLength: 4,
              decimalLength: lotSz,
              pad: true,
            })}
          </div>
          <div>
            {formateDecimal(
              SafeMath.mult(props.book.price, props.book.amount),
              {
                // decimalLength: 4,
                decimalLength: amountSz,
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
                // decimalLength: 4,
                decimalLength: amountSz,
                pad: true,
              }
            )}
          </div>
          <div>
            {formateDecimal(props.book.amount, {
              // decimalLength: 4,
              decimalLength: lotSz,
              pad: true,
            })}
          </div>
          <div>
            {formateDecimal(props.book.price, {
              // decimalLength: 2,
              decimalLength: tickSz,
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
      <ul className="order-book__header table__header flex-row">
        <ul className="order-book__header--bids flex-row">
          <li>{t("amount")}</li>
          <li>{t("volume")}</li>
          <li>{t("bid")}</li>
        </ul>
        <ul className="order-book__header--asks flex-row">
          <li>{t("ask")}</li>
          <li>{t("volume")}</li>
          <li>{t("amount")}</li>
        </ul>
      </ul>
      <div className="order-book__table scrollbar-custom">
        <ul className="order-book__panel order-book__panel--bids">
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
        <ul className="order-book__panel order-book__panel--asks">
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
