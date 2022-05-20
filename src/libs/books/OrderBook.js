import SafeMath from "../../utils/SafeMath";
import BookBase from "../BookBase";

class OrderBook extends BookBase {
  constructor() {
    super();
    this.name = `OrderBook`;
    this._config = { remove: false, add: true, update: true };
    return this;
  }
}

export default OrderBook;
