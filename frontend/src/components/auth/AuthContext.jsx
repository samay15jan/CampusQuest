import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut as fbSignOut } from "firebase/auth";
import { auth } from "../utils/firebase.js";
import { getMe } from "../../api/account.js";

const ACCOUNT_STORAGE_KEY = "campusquest.account";

const AuthContext = createContext({
  user: null,
  account: null,
  loading: true,
  accountLoading: false,
  accountError: null,
  refreshAccount: async () => null,
  updateAccount: () => {},
  signOut: () => {},
});

function readCachedAccount() {
  try {
    const raw = localStorage.getItem(ACCOUNT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem(ACCOUNT_STORAGE_KEY);
    return null;
  }
}

function writeCachedAccount(account) {
  if (account) localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
  else localStorage.removeItem(ACCOUNT_STORAGE_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState(null);

  const applyAccount = (data) => {
    setAccount(data);
    writeCachedAccount(data);
    return data;
  };

  const updateAccount = (patch) => {
    setAccount((current) => {
      const next = typeof patch === "function" ? patch(current) : { ...current, ...patch };
      writeCachedAccount(next);
      return next;
    });
  };

  const refreshAccount = async () => {
    setAccountLoading(true);
    setAccountError(null);

    try {
      const data = await getMe();
      return applyAccount(data);
    } catch (error) {
      setAccountError(error);
      throw error;
    } finally {
      setAccountLoading(false);
    }
  };

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAccountError(null);

      if (!nextUser) {
        setAccount(null);
        writeCachedAccount(null);
        setAccountLoading(false);
        setLoading(false);
        return;
      }

      // Hydrate immediately from localStorage, then make the single /me call
      // for this authenticated session to refresh the cached account.
      setAccount(readCachedAccount());
      setAccountLoading(true);

      try {
        const data = await getMe();
        applyAccount(data);
      } catch (error) {
        setAccountError(error);
      } finally {
        setAccountLoading(false);
        setLoading(false);
      }
    });
  }, []);

  const signOut = async () => {
    await fbSignOut(auth);
    setAccount(null);
    writeCachedAccount(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        account,
        loading,
        accountLoading,
        accountError,
        refreshAccount,
        updateAccount,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
