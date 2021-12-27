module.exports = function({
  chainId,
  blockNumber,
  timestamp = 0,
  isParsed = 0,
}) {
  if (!chainId) throw new Error("chainId can't be null or empty");
  if (!blockNumber) throw new Error("token address can't be null or empty");

  return {
    id: `${chainId}-${blockNumber}`,
    chainId,
    blockNumber,
    timestamp,
    isParsed,
  };
}