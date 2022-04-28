import React, { useContext, useEffect, useState } from "react";
import StoreContext from "../store/store-context";
import ApexCharts from "react-apexcharts";
import { useTranslation } from "react-i18next";

const DepthChart = (props) => {
  const storeCtx = useContext(StoreContext);
  const [bids, setBids] = useState([]);
  const [asks, setAsks] = useState([]);
  const { t } = useTranslation();
  const [ts, setTs] = useState(0);

  useEffect(() => {
    if (storeCtx.books?.bids && storeCtx.books?.asks) {
      const _ts = Date.now();
      if (_ts - ts <= 1500) return;
      else setTs(_ts);
      const _bids = storeCtx.books.bids
        .map((bid) => ({ ...bid }))
        .sort((a, b) => +a.price - +b.price);
      const _asks = storeCtx.books.asks.map((ask) => ({ ...ask }));
      const _bs = _bids
        .map((b) => ({
          x: b.price,
          y: b.total,
        }))
        .concat(
          _asks.map((a) => ({
            x: a.price,
            y: null,
          }))
        );
      const _as = _bids
        .map((b) => ({
          x: b.price,
          y: null,
        }))
        .concat(
          _asks.map((a) => ({
            x: a.price,
            y: a.total,
          }))
        );
      setBids(_bs);
      setAsks(_as);
    }
  }, [storeCtx.books?.asks, storeCtx.books?.bids, ts]);
  return (
    <div className="depth-chart">
      <ApexCharts
        height="130"
        width="100%"
        type="area"
        options={{
          chart: {
            toolbar: {
              show: false,
            },
          },
          xaxis: {
            type: "numeric",
            tickAmount: 6,
          },
          colors: ["#03a66d", "#cf304a"],
          dataLabels: {
            enabled: false,
          },
          legend: {
            show: false,
          },
        }}
        series={[
          {
            name: t("buy"),
            data: bids,
          },
          {
            name: t("sell"),
            data: asks,
          },
        ]}
      />
    </div>
  );
};

export default DepthChart;
