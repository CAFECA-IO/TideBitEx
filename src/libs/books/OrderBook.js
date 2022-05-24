// import SafeMath from "../../utils/SafeMath";
import BookBase from "../BookBase";

class OrderBook extends BookBase {
  constructor() {
    super();
    this.name = `OrderBook`;
    this._config = { remove: true, add: true, update: false };
    return this;
  }

  _trim(data) {
    const pendingOrders = [];
    const closedOrders = [];
    data
      .sort((a, b) => +b.at - +a.at)
      .forEach((d) => {
        if (pendingOrders.length >= 100 && closedOrders.length >= 100) return;
        if (d.state === "wait" && pendingOrders.length < 100)
          pendingOrders.push(d);
        if (
          (d.state === "canceled" || d.state === "done") &&
          closedOrders.length < 100
        )
          closedOrders.push(d);
      });
    return pendingOrders.concat(closedOrders);
  }

  getSnapshot(market) {
    const pendingOrders = [];
    const closedOrders = [];
    this._snapshot[market]?.forEach((order) => {
      if (order.state === "wait") pendingOrders.push(order);
      if (order.state === "canceled" || order.state === "done")
        closedOrders.push(order);
    });
    return {
      // market,
      pendingOrders,
      closedOrders,
    };
  }
}

export default OrderBook;
