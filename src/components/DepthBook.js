import React, { useContext } from "react";
import StoreContext from "../store/store-context";
import SafeMath from "../utils/SafeMath";
// import { formateDecimal } from "../utils/Utils";
import { useTranslation } from "react-i18next";

const padDecimal = (n, length) => {
  let padR = n.toString();
  for (let i = padR.length; i < length; i++) {
    padR += "0";
  }
  console.log(`padR`, padR);
  return padR;
};

const formateDecimal = (
  amount,
  { maxLength = 18, decimalLength = 2, pad = false }
) => {
  console.log(
    `amount[${amount.toString().length}]`,
    amount,
    `[>${amount.toString().length > maxLength}]maxLength`,
    maxLength,
    `decimalLength`,
    decimalLength,
    `pad`,
    pad
  );
  if (isNaN(amount) || (!SafeMath.eq(amount, "0") && !amount)) return "--";
  if (SafeMath.eq(amount, "0"))
    return pad ? `0.${padDecimal("", decimalLength)}` : "0.00";
  const splitChunck = amount.toString().split(".");
  if (!maxLength) maxLength = 18;
  if (splitChunck.length > 1) {
    console.log(`padR`, splitChunck);
    console.log(
      `splitChunck[1]${splitChunck[1].toString().length}`,
      splitChunck[1]
    );
    if (amount.toString().length > maxLength)
      splitChunck[1] = splitChunck[1].substring(
        0,
        maxLength - splitChunck[0].length
      );
    else if (splitChunck[1].toString().length > decimalLength)
      splitChunck[1] = splitChunck[1].substring(0, decimalLength);
    else if (pad) splitChunck[1] = padDecimal(splitChunck[1], decimalLength);
    console.log(`splitChunck2`, splitChunck);
    return splitChunck[1].length > 0
      ? `${splitChunck[0]}.${splitChunck[1]}`
      : splitChunck[0];
  }
  return parseFloat(amount.toString()).toFixed(decimalLength);
};

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
              decimalLength: props?.tickSz || "0",
              pad: true,
            })}
          </div>
          <div>
            {formateDecimal(props.book.amount, {
              decimalLength: props?.lotSz || "0",
              pad: true,
            })}
          </div>
          <div>
            {formateDecimal(
              SafeMath.mult(props.book.price, props.book.amount),
              {
                decimalLength: SafeMath.mult(props?.tickSz, props?.lotSz),
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
                decimalLength: SafeMath.mult(props?.tickSz, props?.lotSz),
                pad: true,
              }
            )}
          </div>
          <div>
            {formateDecimal(props.book.amount, {
              decimalLength: props?.lotSz || "0",
              pad: true,
            })}
          </div>
          <div>
            {formateDecimal(props.book.price, {
              decimalLength: props?.tickSz || "0",
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
            storeCtx.books.bids.map((book, index) => (
              <BookTile
                index={index}
                tickSz={storeCtx.selectedTicker?.tickSz}
                lotSz={storeCtx.selectedTicker?.lotSz}
                onClick={() => {
                  storeCtx.depthBookHandler(book.price, book.amount);
                }}
                type="bids"
                book={book}
                key={`bids-${storeCtx.selectedTicker.instId}-${book.id}`}
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
            storeCtx.books.asks.map((book, index) => (
              <BookTile
                index={index}
                type="asks"
                onClick={() => {
                  storeCtx.depthBookHandler(book.price, book.amount);
                }}
                book={book}
                key={`asks-${storeCtx.selectedTicker.instId}-${book.id}`}
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
