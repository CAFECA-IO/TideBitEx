class Blockchains {
  static Avax = {
    chainId: "0xa86a",
    key: "Avax",
    chainName: "Avalanche Network",
    nativeCurrency: {
      symbol: "AVAX",
      decimals: 18,
    },
    rpcUrls: [ "https://api.avax.network/ext/bc/C/rpc" ],
    blockExplorerUrls: [ "https://cchain.explorer.avax.network/" ],
    isTestnet: false,
  };
  static BSC = {
    chainId: "0x38",
    key: "BSC",
    chainName: "Binance Smart Chain Mainnet",
    nativeCurrency: {
      symbol: "BNB",
      decimals: 18,
    },
    rpcUrls: [ "https://bsc-dataseed.binance.org/" ],
    blockExplorerUrls: [ "https://bscscan.com/" ],
    isTestnet: false,
  };
  static BSCTestnet = {
    chainId: "0x61",
    key: "BSCTestnet",
    chainName: "Binance Smart Chain Testnet",
    nativeCurrency: {
      symbol: "BNB",
      decimals: 18,
    },
    rpcUrls: [ "https://data-seed-prebsc-1-s1.binance.org:8545/" ],
    blockExplorerUrls: [ "https://testnet.bscscan.com" ],
    isTestnet: true,
  };
  static Ethereum = {
    chainId: "0x1",
    key: "Ethereum",
    chainName: "Ethereum",
    nativeCurrency: {
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: [ "https://ethereum.tidewallet.io/" ],
    blockExplorerUrls: [ "https://etherscan.io" ],
    isTestnet: false,
  };
  static AvaxTestnet = {
    chainId: "0xa869",
    key: "AvaxTestnet",
    chainName: "Avalanche Testnet FUJI",
    nativeCurrency: {
      symbol: "AVAX",
      decimals: 18,
    },
    rpcUrls: [ "https://api.avax-test.network/ext/bc/C/rpc" ],
    blockExplorerUrls: [ "https://cchain.explorer.avax-test.network" ],
    isTestnet: true,
  };
  static Huobi = {
    chainId: "0x80",
    key: "Huobi",
    chainName: "HuobiChain",
    nativeCurrency: {
      symbol: "HT",
      decimals: 18,
    },
    rpcUrls: [ "https://http-mainnet-node.huobichain.com/" ],
    blockExplorerUrls: [ "https://hecoinfo.com/" ],
    isTestnet: false,
  };
  static HuobiTestnet = {
    chainId: "0x100",
    key: "HuobiTestnet",
    chainName: "HuobiChain Testnet",
    nativeCurrency: {
      symbol: "HT",
      decimals: 18,
    },
    rpcUrls: [ "https://http-testnet.hecochain.com/" ],
    blockExplorerUrls: [ "https://scan-testnet.hecochain.com" ],
    isTestnet: true,
  }
  static Polygon = {
    chainId: "0x89",
    key: "Polygon",
    chainName: "Polygon",
    nativeCurrency: {
      symbol: "MATIC",
      decimals: 18,
    },
    rpcUrls: [ "https://rpc-mainnet.maticvigil.com/" ],
    blockExplorerUrls: [ "https://explorer.matic.network/" ],
    isTestnet: false,
  };
  static PolygonTestnet = {
    chainId: "0x13881",
    key: "PolygonTestnet",
    chainName: "Polygon Testnet Mumbai",
    nativeCurrency: {
      symbol: "MATIC",
      decimals: 18,
    },
    rpcUrls: [ "https://rpc-mumbai.maticvigil.com/" ],
    blockExplorerUrls: [ "https://mumbai-explorer.matic.today/" ],
    isTestnet: true,
  }
  static EthereumTestnet = {
    chainId: "0x3",
    key: "EthereumTestnet",
    chainName: "ETH testnet Ropsten",
    nativeCurrency: {
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: [ "https://ropsten.tidewallet.io/" ],
    blockExplorerUrls: [ "https://ropsten.etherscan.io" ],
    isTestnet: true,
  };
  static Tidetime = {
    chainId: "0x1f51",
    key: "Tidetime",
    chainName: "Tidetime",
    nativeCurrency: {
      name: "Tidetime Token",
      symbol: "TTT",
      decimals: 18,
    },
    rpcUrls: [ "https://rpc.tidebit.network" ],
    blockExplorerUrls: [ "https://explorer.tidebit.network" ],
    iconUrls: [ "https://iconape.com/wp-content/png_logo_vector/tidebit.png" ],
    isTestnet: false,
  };
  static xDAI = {
    chainId: "0x64",
    key: "xDAI",
    chainName: "xDai",
    nativeCurrency: {
      symbol: "xDAI",
      decimals: 18,
    },
    rpcUrls: [ "https://rpc.xdaichain.com/" ],
    blockExplorerUrls: [ "https://blockscout.com/xdai/mainnet" ],
    isTestnet: false,
  };

  static get keys() {
    return Object.keys(this);
  }
  static list({ testnet }) {
    const result = this.keys
      .map((v) => Blockchains[v])
      .filter((v) => testnet === undefined || !(v.isTestnet ^ testnet))

    return result;
  }
  static findByChainId(chainId = '') {
    let searchKey = chainId.toString(16);
    if(searchKey.indexOf('0x') !== 0) searchKey = '0x'.concat(searchKey);

    return this.keys
      .map((v) => {
        return this[v];
      })
      .find((v) => {
        return parseInt(v.chainId) === parseInt(searchKey);
      })
  }
}

module.exports = Blockchains;