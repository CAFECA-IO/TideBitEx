// import SafeMath from "../../utils/SafeMath";
import BookBase from "../BookBase";

class DepthBook extends BookBase {
  constructor() {
    super();
    this.name = `DepthBook`;
    this._config = { remove: false, add: false, update: true };
    return this;
  }

  getSnapshot(instId) {
    const depthBooks = {
      market: instId.replace("-", "").toLowerCase(),
      asks: [],
      bids: [],
    };
    this._snapshot[instId].forEach((data) => {
      if (
        this._difference[instId].add.some((d) => this._compareFunction(d, data))
      )
        data = { ...data, update: true };
      if (data.side === "asks") {
        depthBooks.asks.push(data);
      }
      if (data.side === "bids") {
        depthBooks.bids.push(data);
      }
    });
    // console.log(
    //   `[${this.constructor.name}] getSnapshot[${instId}]`,
    //   depthBooks
    // );
    return depthBooks;
  }
}

export default DepthBook;
