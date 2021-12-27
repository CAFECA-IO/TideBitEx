module.exports = function({
  chainId,
  contract,
  priceToEth,
  timestamp,
}) {
  if (!chainId) throw new Error("chainId can't be null or empty");
  if (!contract) throw new Error("token address can't be null or empty");

  return {
    // id,
    chainId,
    contract,
    priceToEth,
    timestamp
  };
}