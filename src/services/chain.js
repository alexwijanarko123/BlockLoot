import { BrowserProvider, formatEther, parseEther } from "ethers";

/**
 * Get an ethers BrowserProvider backed by MetaMask (window.ethereum).
 */
export function getProvider() {
  if (!window.ethereum) throw new Error("MetaMask not installed");
  return new BrowserProvider(window.ethereum);
}

/**
 * Get an ethers Signer from the connected MetaMask account.
 */
export async function getSigner() {
  return getProvider().getSigner();
}

/**
 * Send a marketplace transaction that the backend prepared.
 *
 * @param {object} txData – the `tx` object returned by backend chain endpoints
 *   (contains to, data, value, etc.)
 * @returns {string} txHash after the transaction is mined (1 confirmation)
 */
export async function sendMarketplaceTx(txData) {
  const signer = await getSigner();

  // Build the tx request – only include fields the backend supplied
  const txRequest = { to: txData.to, data: txData.data };
  if (txData.value) txRequest.value = txData.value;
  if (txData.gasLimit) txRequest.gasLimit = txData.gasLimit;

  const txResponse = await signer.sendTransaction(txRequest);
  const receipt = await txResponse.wait(1); // wait for 1 confirmation
  return receipt.hash;
}

/**
 * Format wei (bigint or string) to a human-readable ETH string.
 */
export function formatEth(wei) {
  return formatEther(wei);
}

/**
 * Parse an ETH string (e.g. "0.5") to wei BigInt.
 */
export function parseEth(eth) {
  return parseEther(eth);
}
