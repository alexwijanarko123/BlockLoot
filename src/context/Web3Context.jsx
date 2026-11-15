import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getChallenge, verifySignature } from "../services/api";

const Web3Context = createContext(null);

const LS_TOKEN = "bl_token";
const LS_ADDRESS = "bl_address";
const LS_ROLE = "bl_role";

export function Web3Provider({ children }) {
  const [address, setAddress] = useState(() => localStorage.getItem(LS_ADDRESS) || null);
  const [token, setToken] = useState(() => localStorage.getItem(LS_TOKEN) || null);
  const [role, setRole] = useState(() => localStorage.getItem(LS_ROLE) || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Persist auth state
  useEffect(() => {
    if (token) {
      localStorage.setItem(LS_TOKEN, token);
      localStorage.setItem(LS_ADDRESS, address);
      localStorage.setItem(LS_ROLE, role);
    } else {
      localStorage.removeItem(LS_TOKEN);
      localStorage.removeItem(LS_ADDRESS);
      localStorage.removeItem(LS_ROLE);
    }
  }, [token, address, role]);

  // Listen for MetaMask account changes
  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0 || accounts[0].toLowerCase() !== address?.toLowerCase()) {
        // Account changed or disconnected — log out
        setToken(null);
        setAddress(null);
        setRole(null);
      }
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    return () => ethereum.removeListener("accountsChanged", handleAccountsChanged);
  }, [address]);

  /**
   * Full login flow:
   * 1. Request MetaMask accounts
   * 2. Get challenge from backend
   * 3. Sign challenge with MetaMask (personal_sign)
   * 4. Send signature to backend → receive JWT + role
   */
  const login = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      if (!window.ethereum) throw new Error("Please install MetaMask");

      // Request accounts (triggers MetaMask popup if needed)
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const walletAddress = accounts[0];

      // Get challenge message from backend
      const challenge = await getChallenge(walletAddress);

      // Sign the message via MetaMask personal_sign
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [challenge.message, walletAddress],
      });

      // Verify on backend
      const result = await verifySignature(walletAddress, signature);

      // Simpan sinkron agar request API berikutnya langsung memakai token ini
      localStorage.setItem(LS_TOKEN, result.token);
      localStorage.setItem(LS_ADDRESS, result.address);
      localStorage.setItem(LS_ROLE, result.role);

      setAddress(result.address);
      setToken(result.token);
      setRole(result.role);
      return result;
    } catch (err) {
      setError(err.message || "Login failed");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setAddress(null);
    setRole(null);
  }, []);

  const value = useMemo(
    () => ({ address, token, role, loading, error, login, logout }),
    [address, token, role, loading, error, login, logout]
  );

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

export function useWeb3() {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error("useWeb3 must be used inside <Web3Provider>");
  return ctx;
}
