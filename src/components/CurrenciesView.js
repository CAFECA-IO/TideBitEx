import { useEffect, useState } from "react";
import { Tabs, Tab } from "react-bootstrap";

const exchanges = ["OKEx", "Binance"];
const exchangeCurrencies = {
  OKEx: [
    "BTC",
    "BCH",
    "DASH",
    "ETH",
    "ETC",
    "EOS",
    "LTC",
    "NEO",
    "USDT",
    "USDC",
  ],
  Binance: ["BTC", "BCH", "ETH"],
};
const CurrencyDetail = (props) => {
  const [users, setUsers] = useState(null);
  useEffect(() => {
    const users = {};
    for (let i = 60983; i < 60987; i++) {
      users[i] = {
        balance: Math.random() * 100,
        locked: Math.random() * 100,
        tidebit: Math.random() * 200,
      };
    }
    setUsers(users);
    return () => {
      setUsers(null);
    };
  }, []);
  return (
    <div className="detail">
      <div className="detail__header">
        <div className="detail__back" onClick={props.onCloseHandler}>
          Back
        </div>
        <div className="detail__title">
          {`${props.exchange}: ${props.currency}`}
        </div>
      </div>
      {users && (
        <ul className="currency__overview">
          <div className="currency__overview--header">Overview</div>
          {Object.keys(users).map((memberId) => {
            const total =
              users[memberId].balance +
              users[memberId].locked +
              users[memberId].tidebit;

            return (
              <li className={`currency__overview--tile`}>
                <div className="currency__bar--leading">{memberId}</div>
                <div className="currency__bar--container">
                  <div className="currency__bar currency__exchange">
                    <div
                      style={{
                        width: `${(users[memberId].balance / total) * 100}%`,
                      }}
                    >{`${((users[memberId].balance / total) * 100).toFixed(
                      2
                    )}%`}</div>
                    <div
                      style={{
                        width: `${(users[memberId].locked / total) * 100}%`,
                      }}
                    >{`${((users[memberId].locked / total) * 100).toFixed(
                      2
                    )}%`}</div>
                  </div>
                  <div
                    className="currency__bar currency__tidebit"
                    style={{
                      width: `${(users[memberId].tidebit / total) * 100}%`,
                    }}
                  >
                    {`${((users[memberId].tidebit / total) * 100).toFixed(2)}%`}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

const CurrenciesView = (props) => {
  const [exchange, setExchange] = useState("OKEx");
  const [overview, setOverview] = useState(null);
  const [currency, setCurrency] = useState(null);

  const onChoseExchageHandler = (exchange) => {
    console.log(`onChoseExchageHandler exchange`, exchange);
    setExchange(exchange);
    // get exchange currencies
    const currencies = exchangeCurrencies[exchange];

    // get exchange overview
    setTimeout(() => {
      const overview = {};
      currencies.forEach((currency) => {
        overview[currency] = {
          balance: Math.random() * 100,
          locked: Math.random() * 100,
          tidebit: Math.random() * 200,
        };
      });
      setOverview(overview);
    }, 1000);
  };

  useEffect(() => {
    if (exchange) onChoseExchageHandler(exchange);
  }, [exchange]);

  return (
    <div className="currencies-view">
      {!currency && (
        <Tabs defaultActiveKey={exchange}>
          {exchanges.map((_exchange) => (
            <Tab eventKey={_exchange} title={_exchange} key={_exchange}>
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
                          {+(
                            overview[currency].balance +
                            overview[currency].locked
                          ) /
                            +overview[currency].tidebit >
                            0.5 && (
                            <div
                              className={`currency__icon${
                                +(
                                  overview[currency].balance +
                                  overview[currency].locked
                                ) /
                                  +overview[currency].tidebit >
                                0.5
                                  ? " warning"
                                  : +(
                                      overview[currency].balance +
                                      overview[currency].locked
                                    ) /
                                      +overview[currency].tidebit >
                                    0.8
                                  ? " alert"
                                  : ""
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
                          overview[currency].balance +
                          overview[currency].locked +
                          overview[currency].tidebit;

                        return (
                          <li className={`currency__overview--tile`}>
                            <div className="currency__bar--leading">
                              {currency}
                            </div>
                            <div className="currency__bar--container">
                              <div className="currency__bar currency__exchange">
                                <div
                                  style={{
                                    width: `${
                                      (overview[currency].balance / total) * 100
                                    }%`,
                                  }}
                                >{`${(
                                  (overview[currency].balance / total) *
                                  100
                                ).toFixed(2)}%`}</div>
                                <div
                                  style={{
                                    width: `${
                                      (overview[currency].locked / total) * 100
                                    }%`,
                                  }}
                                >{`${(
                                  (overview[currency].locked / total) *
                                  100
                                ).toFixed(2)}%`}</div>
                              </div>
                              <div
                                className="currency__bar currency__tidebit"
                                style={{
                                  width: `${
                                    (overview[currency].tidebit / total) * 100
                                  }%`,
                                }}
                              >{`${(
                                (overview[currency].tidebit / total) *
                                100
                              ).toFixed(2)}%`}</div>
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
          onCloseHandler={() => setCurrency(null)}
        />
      )}
    </div>
  );
};

export default CurrenciesView;
