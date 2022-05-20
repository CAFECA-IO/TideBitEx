import { Config } from "../constant/Config";
import Events from "../constant/Events";

class TideBitWS {
  connection_resolvers = [];
  constructor({ accountBook, depthBook, orderBook, tickerBook, tradeBook }) {
    this.tickerBook = tickerBook;
    this.tradeBook = tradeBook;
    this.depthBook = depthBook;
    this.accountBook = accountBook;
    this.orderBook = orderBook;
  }

  setCurrentUser(token) {
    this.connection_resolvers.push(
      JSON.stringify({
        op: "userStatusUpdate",
        args: {
          token,
          market: this.tickerBook.market,
        },
      })
    );
  }

  setCurrentMarket(market) {
    this.connection_resolvers.push(
      JSON.stringify({
        op: "switchMarket",
        args: {
          market,
        },
      })
    );
  }

  messageHandler(msg) {
    let metaData = JSON.parse(msg.data);
    switch (metaData.type) {
      case Events.account:
        this.accountBook.updateByDifference(metaData.data);
        break;
      case Events.update:
        this.depthBook.updateAll(metaData.data.market, metaData.data);
        break;
      case Events.order:
        this.orderBook.updateByDifference(
          metaData.data.market,
          metaData.data.difference
        );
        break;
      case Events.tickers:
        this.tickerBook.updateAll(metaData.data);
        break;
      case Events.trades:
        this.tradeBook.updateAll(metaData.data.market, metaData.data.trades);
        break;
      case Events.trade:
        this.tradeBook.updateByDifference(
          metaData.data.market,
          metaData.data.difference
        );
        break;
      default:
    }
  }

  connect() {
    // return new Promise((resolve, reject) => {
    const ws = new WebSocket(Config[Config.status].websocket);
    let interval;
    ws.addEventListener("open", () => {
      console.log(
        "Socket is open connection_resolvers",
        this.connection_resolvers
      );
      clearInterval(interval);
      const data = this.connection_resolvers.shift();
      if (data) ws.send(data);
      interval = setInterval(() => {
        const data = this.connection_resolvers.shift();
        if (data) ws.send(data);
      }, 100);
      // resolve(true);
    });
    ws.addEventListener("close", async (msg) => {
      clearInterval(interval);
      console.log(
        "Socket is closed. Reconnect will be attempted in 1 second.",
        msg.reason
      );
      setTimeout(() => {
        this.connect();
      }, 1000);
    });
    ws.addEventListener("message", (msg) => {
      console.log(
        "Socket received message",
        msg
      );
      this.messageHandler(msg);
    });
    // });
  }
}

export default TideBitWS;
