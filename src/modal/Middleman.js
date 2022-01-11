import Communicator from "./Communicator";

class Middleman {
  constructor() {
    this.communicator = new Communicator();
  }
  async getTickers() {
    const result = await this.communicator.tickers();
    console.log(result);
  }
}

export default Middleman;
