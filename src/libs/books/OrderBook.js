// import SafeMath from "../../utils/SafeMath";
import BookBase from "../BookBase";

class OrderBook extends BookBase {
  constructor() {
    super();
    this.name = `OrderBook`;
    this._config = { remove: true, add: true, update: false };
    return this;
  }
}

export default OrderBook;
