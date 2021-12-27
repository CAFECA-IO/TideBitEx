module.exports = function({
  chainId,
  transactionHash,
  type = 0, // [swap, add, remove]
  callerAddress = '',
  poolContract = '',
  token0Contract = '',
  token1Contract = '',
  token0AmountIn = '',
  token0AmountOut = '',
  token1AmountIn = '',
  token1AmountOut = '',
  share = '',
  timestamp = 0,
}) {
  if (!chainId) throw new Error("chainId can't be null or empty");
  if (!transactionHash) throw new Error("token address can't be null or empty");

  return {
    id: `${chainId}-${transactionHash}`,
    chainId,
    transactionHash,
    type,
    callerAddress,
    poolContract,
    token0Contract,
    token1Contract,
    token0AmountIn,
    token0AmountOut,
    token1AmountIn,
    token1AmountOut,
    share,
    timestamp,
  };
}