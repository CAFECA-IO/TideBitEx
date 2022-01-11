import Communicator from "./Communicator";

class Middleman {
  constructor() {
    this.communicator = new Communicator();
  }
  async getTickers() {
    return await this.communicator.tickers();
  }
}

export default Middleman;
