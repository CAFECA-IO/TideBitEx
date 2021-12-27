module.exports = function({
  chainId,
  contract,
  factoryContract = '',
  factoryIndex = 0,
  decimals = 0,
  totalSupply = '',
  token0Contract = '',
  token1Contract = '',
  timestamp = 0,
}) {
  if (!chainId) throw new Error("chainId can't be null or empty");
  if (!contract) throw new Error("token address can't be null or empty");

  return {
    id: `${chainId}-${contract}`,
    chainId,
    contract,
    factoryContract,
    factoryIndex,
    decimals,
    totalSupply,
    token0Contract,
    token1Contract,
    timestamp
  };
}