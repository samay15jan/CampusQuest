import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut as fbSignOut } from "firebase/auth";
import { auth } from "../utils/firebase.js";

const AuthContext = createContext({ user: null, loading: true, signOut: () => {} });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fires once on load (restoring any saved session) and on every sign-in/out.
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      console.log(auth)
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signOut: () => fbSignOut(auth) }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);