import { useCallback, useContext, useEffect, useState } from "react";
import { Tabs, Tab } from "react-bootstrap";
import StoreContext from "../store/store-context";
import SafeMath from "../utils/SafeMath";

const exchanges = ["OKEx", "Binance"];

const CurrencyDetail = (props) => {
  return (
    <div className="detail">
      <div className="detail__header">
        <div className="detail__header--leading">
          <div className="detail__back" onClick={props.onCloseHandler}>
            Back
          </div>
          <div className="detail__title">
            {`${props.exchange}: ${props.currency}`}
          </div>
        </div>
        <div className="detail__header--sub">
          <div>{`${props.exchange}: ${props.ex_total.toFixed(2)}: ${
            props.currency
          }`}</div>
          <div>TideBit: {`${props.tb_total.toFixed(2)}${props.currency}`}</div>
        </div>
      </div>
      {props.details && (
        <ul className="currency__overview">
          <div className="currency__overview--header">Overview</div>
          {props.details.map((user) => {
            const total = user.balance + user.locked;
            return (
              <li className={`currency__overview--tile`}>
                <div className="currency__bar--leading">{user.memberId}</div>
                <div
                  className={`currency__bar${
                    total >= props.ex_total ? " currency__bar--alert" : ""
                  }`}
                >
                  <div className="currency__bar-box">
                    <div
                      style={{
                        width: `${
                          (user.balance / props.details[0].total) * 100
                        }%`,
                      }}
                    >
                      {user.balance.toFixed(2)}
                    </div>
                    <div
                      style={{
                        width: `${
                          (user.locked / props.details[0].total) * 100
                        }%`,
                      }}
                    >
                      {user.locked.toFixed(2)}
                    </div>
                  </div>
                  <div
                    className="currency__alert"
                    style={{
                      left: `${
                        (props.ex_total / props.details[0].total) * 100
                      }%`,
                    }}
                  >
                    <div className="currency__alert--line"></div>
                    <div className="currency__alert--text">
                      {props.exchange}
                    </div>
                  </div>
                </div>
                <div className="currency__bar--text">TideBit</div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

const CurrenciesView = (props) => {
  const storeCtx = useContext(StoreContext);
  const [exchange, setExchange] = useState("OKEx");
  const [overview, setOverview] = useState(null);
  const [currency, setCurrency] = useState(null);

  const onChoseExchageHandler = useCallback(
    async (exchange) => {
      console.log(`onChoseExchageHandler exchange`, exchange);
      setExchange(exchange);

      // get tidebit currencies
      const tbAccounts = await storeCtx.getUsersAccounts();
      console.log(`tbAccounts`,tbAccounts)
      // get exchange currencies
      const exAccounts = await storeCtx.getExAccounts(exchange);
      console.log(`exAccounts`,exAccounts)

      // overview
      const overview = {};
      Object.values(tbAccounts)?.forEach((acc) => {
        const exAcc = exAccounts[acc.currency];
        overview[acc.currency] = {
          ex_balance: exAcc?.balance || "0.0",
          ex_locked: exAcc?.locked || "0.0",
          ex_total: exAcc?.total || "0.0",
          tb_balance: tbAccounts.balance,
          tb_locked: tbAccounts.locked,
          tb_total: tbAccounts.total,
          details: tbAccounts.details,
          alert1: SafeMath.mult(tbAccounts.total, 0.2), // 20% 準備率
          alert2: SafeMath.mult(tbAccounts.details[0].total, 2), // 單一幣種最多資產用戶持有的一倍
        };
      });

      setOverview(overview);
    },
    [storeCtx]
  );

  useEffect(() => {
    if (exchange) onChoseExchageHandler(exchange);
  }, [exchange, onChoseExchageHandler]);

  return (
    <div className="currencies-view">
      {!currency && (
        <Tabs defaultActiveKey={exchange}>
          {exchanges.map((_exchange) => (
            <Tab
              eventKey={_exchange}
              title={_exchange}
              key={_exchange}
              onClick={() => setExchange(exchange)}
            >
              {exchange === _exchange && (
                <>
                  <ul className="currency__list">
                    {overview &&
                      Object.keys(overview).map((currency) => (
                        <li
                          className={`currency__button`}
                          key={`${_exchange}:${currency}`}
                          onClick={() => setCurrency(currency)}
                        >
                          <div>{currency}</div>
                          {(overview[currency].ex_total <
                            overview[currency].alert1 ||
                            overview[currency].ex_total <
                              overview[currency].alert2) && (
                            <div
                              className={`currency__icon${
                                overview[currency].ex_total <
                                  overview[currency].alert1 &&
                                overview[currency].ex_total <
                                  overview[currency].alert2
                                  ? " currency__icon--alert"
                                  : " currency__icon--warning"
                              }`}
                            >
                              <div>!</div>
                            </div>
                          )}
                        </li>
                      ))}
                  </ul>
                  {overview && (
                    <ul className="currency__overview">
                      <div className="currency__overview--header">Overview</div>
                      {Object.keys(overview).map((currency) => {
                        const total =
                          overview[currency].ex_total +
                          overview[currency].tb_total;

                        return (
                          <li
                            className={`currency__overview--tile`}
                            onClick={() => setCurrency(currency)}
                          >
                            <div className="currency__bar--leading">
                              <div>{currency}</div>
                              {(overview[currency].ex_total <
                                overview[currency].alert1 ||
                                overview[currency].ex_total <
                                  overview[currency].alert2) && (
                                <div
                                  className={`currency__icon${
                                    overview[currency].ex_total <
                                      overview[currency].alert1 &&
                                    overview[currency].ex_total <
                                      overview[currency].alert2
                                      ? " currency__icon--alert"
                                      : " currency__icon--warning"
                                  }`}
                                >
                                  <div>!</div>
                                </div>
                              )}
                            </div>
                            <div className="currency__bar--container">
                              <div className="currency__exchange">
                                <div className="currency__bar">
                                  <div className="currency__bar-box">
                                    <div
                                      style={{
                                        width: `${
                                          (overview[currency].ex_balance /
                                            total) *
                                          100
                                        }%`,
                                      }}
                                    >
                                      {overview[currency].ex_balance.toFixed(2)}
                                    </div>
                                    <div
                                      style={{
                                        width: `${
                                          (overview[currency].ex_locked /
                                            total) *
                                          100
                                        }%`,
                                      }}
                                    >
                                      {overview[currency].ex_locked.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                                <div className="currency__bar--text">
                                  {exchange}
                                </div>
                              </div>
                              <div className="currency__exchange">
                                <div
                                  className={`currency__bar${
                                    overview[currency].ex_total <
                                      overview[currency].alert1 &&
                                    overview[currency].ex_total <
                                      overview[currency].alert2
                                      ? " currency__bar--alert"
                                      : " currency__bar--warning"
                                  }`}
                                >
                                  <div className="currency__bar-box">
                                    <div
                                      style={{
                                        width: `${
                                          (overview[currency].tb_balance /
                                            total) *
                                          100
                                        }%`,
                                      }}
                                    >
                                      {overview[currency].tb_balance.toFixed(2)}
                                    </div>
                                    <div
                                      style={{
                                        width: `${
                                          (overview[currency].tb_locked /
                                            total) *
                                          100
                                        }%`,
                                      }}
                                    >
                                      {overview[currency].tb_locked.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                                <div className="currency__bar--text">
                                  Tidebit
                                </div>
                                <div
                                  className="currency__alert"
                                  style={{
                                    left: `${
                                      (overview[currency].alert1 / total) * 100
                                    }%`,
                                  }}
                                >
                                  <div className="currency__alert--line"></div>
                                  <div className="currency__alert--text currency__alert--text-1">
                                    RRR
                                  </div>
                                </div>
                                <div
                                  className="currency__alert"
                                  style={{
                                    left: `${
                                      (overview[currency].alert2 / total) * 100
                                    }%`,
                                  }}
                                >
                                  <div className="currency__alert--line"></div>
                                  <div className="currency__alert--text">
                                    MPA
                                  </div>
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              )}
            </Tab>
          ))}
        </Tabs>
      )}
      {!!currency && (
        <CurrencyDetail
          exchange={exchange}
          currency={currency}
          details={overview[currency].details}
          ex_total={overview[currency].ex_total}
          tb_total={overview[currency].tb_total}
          onCloseHandler={() => setCurrency(null)}
        />
      )}
    </div>
  );
};

export default CurrenciesView;
