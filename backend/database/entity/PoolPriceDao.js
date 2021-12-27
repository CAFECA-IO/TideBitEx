module.exports = function({
  chainId,
  contract,
  transactionHash,
  timestamp = 0,
  token0Amount = '',
  token1Amount = '',
}) {
  if (!chainId) throw new Error("chainId can't be null or empty");
  if (!contract) throw new Error("token address can't be null or empty");

  return {
    // id,
    chainId,
    contract,
    transactionHash,
    timestamp,
    token0Amount,
    token1Amount,
  };
}