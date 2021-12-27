module.exports = function({
  chainId,
  contract,
  name = '',
  symbol = '',
  decimals = 0,
  totalSupply = '',
  priceToEth = '',
  timestamp = 0,
}) {
  if (!chainId) throw new Error("chainId can't be null or empty");
  if (!contract) throw new Error("token address can't be null or empty");

  return {
    id: `${chainId}-${contract}`,
    chainId,
    contract,
    name,
    symbol,
    decimals,
    totalSupply,
    priceToEth,
    timestamp
  };
}